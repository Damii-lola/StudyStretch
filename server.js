const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const textract = require('textract');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: [
    'https://damii-lola.github.io/ExamBlox/', // Your GitHub Pages URL
    'http://localhost:3000', // For local testing
    'http://127.0.0.1:3000'  // For local testing
  ],
  credentials: true
};

app.use(cors(corsOptions));

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
    }
  }
  res.status(400).json({ error: error.message });
});

// Helper function to extract text from PDF
async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    throw new Error('Failed to extract text from PDF: ' + error.message);
  }
}

// Helper function to extract text from DOCX
async function extractTextFromDOCX(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer: buffer });
    return result.value;
  } catch (error) {
    throw new Error('Failed to extract text from DOCX: ' + error.message);
  }
}

// Helper function to extract text from DOC
async function extractTextFromDOC(buffer) {
  return new Promise((resolve, reject) => {
    textract.fromBufferWithMime('application/msword', buffer, (error, text) => {
      if (error) {
        reject(new Error('Failed to extract text from DOC: ' + error.message));
      } else {
        resolve(text);
      }
    });
  });
}

// Helper function to extract text from TXT
async function extractTextFromTXT(buffer) {
  try {
    return buffer.toString('utf8');
  } catch (error) {
    throw new Error('Failed to extract text from TXT: ' + error.message);
  }
}

// Helper function to extract text from images using OCR
async function extractTextFromImage(buffer, mimeType) {
  try {
    let processedImage = buffer;
    
    if (mimeType.includes('jpeg') || mimeType.includes('jpg') || mimeType.includes('png')) {
      processedImage = await sharp(buffer)
        .resize(2000)
        .grayscale()
        .normalize()
        .sharpen()
        .toBuffer();
    }
    
    const result = await Tesseract.recognize(
      processedImage,
      'eng',
      { logger: m => console.log(m) }
    );
    
    return result.data.text;
  } catch (error) {
    throw new Error('Failed to extract text from image: ' + error.message);
  }
}

// Main endpoint for file conversion
app.post('/convert', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, mimetype, originalname } = req.file;
    let extractedText = '';

    console.log(`Processing file: ${originalname}, type: ${mimetype}`);

    // Process based on file type
    switch (mimetype) {
      case 'application/pdf':
        extractedText = await extractTextFromPDF(buffer);
        break;
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        extractedText = await extractTextFromDOCX(buffer);
        break;
      case 'application/msword':
        extractedText = await extractTextFromDOC(buffer);
        break;
      case 'text/plain':
        extractedText = await extractTextFromTXT(buffer);
        break;
      case 'image/png':
      case 'image/jpeg':
      case 'image/jpg':
        extractedText = await extractTextFromImage(buffer, mimetype);
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Clean up text
    const cleanedText = extractedText
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanedText) {
      return res.status(400).json({ error: 'No text could be extracted from the file' });
    }

    res.json({
      success: true,
      text: cleanedText,
      fileName: originalname,
      fileType: mimetype,
      characterCount: cleanedText.length,
      wordCount: cleanedText.split(/\s+/).filter(word => word.length > 0).length
    });

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: error.message });
  }
});

// AI Question Generation Endpoint
app.post('/generate-questions', async (req, res) => {
  try {
    const { text, questionType, numberOfQuestions, difficultyLevel } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'No text provided for question generation' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Create prompt based on parameters
    const prompt = createQuestionPrompt(text, questionType, numberOfQuestions, difficultyLevel);

    console.log('Generating questions with OpenAI...');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert educational assistant that creates high-quality practice questions based on provided text content. Create questions that are relevant, accurate, and appropriate for the specified difficulty level."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    const generatedContent = completion.choices[0].message.content;
    
    // Parse the generated questions
    const questions = parseGeneratedQuestions(generatedContent);

    res.json({
      success: true,
      questions: questions,
      totalQuestions: questions.length,
      prompt: prompt,
      generatedContent: generatedContent
    });

  } catch (error) {
    console.error('OpenAI Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate questions: ' + (error.message || 'Unknown error')
    });
  }
});

function createQuestionPrompt(text, questionType = 'mixed', numberOfQuestions = 10, difficultyLevel = 'medium') {
  const truncatedText = text.length > 4000 ? text.substring(0, 4000) + '...' : text;
  
  const questionTypeMap = {
    'multiple choice': 'multiple choice questions with 4 options each',
    'true/false': 'true/false questions',
    'short answer': 'short answer questions',
    'flashcards': 'flashcard-style questions with term and definition',
    'mixed': 'a variety of question types (multiple choice, true/false, short answer)'
  };

  const difficultyMap = {
    'easy': 'basic recall and comprehension questions',
    'medium': 'application and analysis questions',
    'hard': 'complex analysis and evaluation questions',
    'exam level': 'challenging questions similar to professional exams'
  };

  return `
Based on the following text content, generate ${numberOfQuestions} ${questionTypeMap[questionType] || questionTypeMap['mixed']} at a ${difficultyLevel} difficulty level (${difficultyMap[difficultyLevel] || difficultyMap['medium']}).

TEXT CONTENT:
${truncatedText}

IMPORTANT FORMATTING INSTRUCTIONS:
- Return ONLY the questions in the following JSON format:
{
  "questions": [
    {
      "type": "question type",
      "question": "the question text",
      "options": ["option1", "option2", "option3", "option4"] (only for multiple choice),
      "answer": "correct answer",
      "explanation": "brief explanation of why this is correct"
    }
  ]
}

- For multiple choice: include 4 options and mark the correct one
- For true/false: options should be ["True", "False"]
- For short answer: provide a clear expected answer
- For flashcards: use type "flashcard" with "term" and "definition"
- Make questions relevant to the text content
- Ensure answers are accurate based on the text
- Vary question types if mixed is selected
`;
}

function parseGeneratedQuestions(content) {
  try {
    // Try to find JSON in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.questions && Array.isArray(parsed.questions)) {
        return parsed.questions;
      }
    }
    
    // Fallback: manual parsing if JSON format isn't perfect
    console.log('Falling back to manual parsing of questions');
    return parseQuestionsManually(content);
  } catch (error) {
    console.error('Error parsing generated questions:', error);
    return parseQuestionsManually(content);
  }
}

function parseQuestionsManually(content) {
  const questions = [];
  const lines = content.split('\n');
  let currentQuestion = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.match(/^[0-9]+[\.\)]/) || trimmedLine.toLowerCase().includes('question')) {
      if (currentQuestion) questions.push(currentQuestion);
      currentQuestion = {
        type: 'multiple choice',
        question: trimmedLine.replace(/^[0-9]+[\.\)]\s*/, ''),
        options: [],
        answer: '',
        explanation: ''
      };
    } 
    else if (trimmedLine.match(/^[a-d][\.\)]/i) && currentQuestion) {
      currentQuestion.options.push(trimmedLine.replace(/^[a-d][\.\)]\s*/i, ''));
    }
    else if (trimmedLine.toLowerCase().includes('answer:') && currentQuestion) {
      currentQuestion.answer = trimmedLine.replace(/answer:\s*/i, '');
    }
    else if (trimmedLine.toLowerCase().includes('explanation:') && currentQuestion) {
      currentQuestion.explanation = trimmedLine.replace(/explanation:\s*/i, '');
    }
    else if (currentQuestion && currentQuestion.question && trimmedLine) {
      currentQuestion.question += ' ' + trimmedLine;
    }
  }

  if (currentQuestion) questions.push(currentQuestion);
  return questions;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    openai: process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
});
