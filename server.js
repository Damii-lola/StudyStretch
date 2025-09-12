const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const textract = require('textract');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

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
    // Allow specific file types
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
      cb(new Error('Invalid file type. Please upload PDF, DOCX, DOC, TXT, PNG, or JPG files.'), false);
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
    // Preprocess image for better OCR results
    let processedImage = buffer;
    
    if (mimeType.includes('jpeg') || mimeType.includes('jpg') || mimeType.includes('png')) {
      processedImage = await sharp(buffer)
        .resize(2000) // Resize for better processing
        .grayscale() // Convert to grayscale
        .normalize() // Normalize contrast
        .sharpen() // Sharpen image
        .toBuffer();
    }
    
    const result = await Tesseract.recognize(
      processedImage,
      'eng', // English language
      { logger: m => console.log(m) } // Optional logger
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
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
