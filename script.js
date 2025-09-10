// script.js
// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Star background generation
  const starContainer = document.querySelector('.stars');
  if (starContainer) {
    for (let i = 0; i < 100; i++) {
      const star = document.createElement('span');
      const topPos = Math.random() * 100;
      star.style.top = topPos + "%";
      star.style.left = Math.random() * 100 + "%";
      star.style.animationDuration = (3 + Math.random() * 5) + "s";
      const opacityVariation = 0.6 + Math.random() * 0.4; 
      star.style.opacity = opacityVariation;
      starContainer.appendChild(star);
    }
  }

  // File upload functionality
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  const questionCount = document.getElementById('questionCount');
  const questionCountValue = document.getElementById('questionCountValue');
  const generateBtn = document.getElementById('generateBtn');
  const questionType = document.getElementById('questionType');
  const difficulty = document.getElementById('difficulty');

  // Navigation buttons
  const loginBtn = document.querySelector('.btn-login');
  const signupBtn = document.querySelector('.btn-signup');
  const pricingBtns = document.querySelectorAll('.btn-pricing');
  const ctaBtn = document.querySelector('.btn-cta');

  // Update question count value display
  if (questionCount && questionCountValue) {
    questionCount.addEventListener('input', () => {
      questionCountValue.textContent = questionCount.value;
    });
  }
  
  // Drag and drop functionality
  if (uploadArea && fileInput) {
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length) {
        handleFile(files[0]);
      }
    });
    
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) {
        handleFile(fileInput.files[0]);
      }
    });
  }
  
  function handleFile(file) {
    // Check if file type is supported
    const validTypes = [
      'application/pdf', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg', 
      'image/png',
      'text/plain'
    ];
    
    if (!validTypes.includes(file.type)) {
      showNotification('Please upload a PDF, DOCX, PPT, TXT, or image file.', 'error');
      return;
    }
    
    // Check file size (max 25MB for better document processing)
    if (file.size > 25 * 1024 * 1024) {
      showNotification('File size must be less than 25MB.', 'error');
      return;
    }
    
    // Show file name and enable generate button
    uploadArea.innerHTML = `
      <div class="upload-icon">
        <i class="fas fa-file-alt"></i>
      </div>
      <p class="upload-title">${file.name}</p>
      <p class="upload-subtitle">Click to change file</p>
    `;
    
    uploadArea.addEventListener('click', () => {
      location.reload();
    });
    
    // Enable generate button
    if (generateBtn) {
      generateBtn.disabled = false;
      generateBtn.classList.add('active');
    }
    
    showNotification('File uploaded successfully!', 'success');
  }
  
  // Generate questions button
  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      if (generateBtn.disabled) {
        showNotification('Please upload a file first.', 'error');
        return;
      }
      
      // Get selected options
      const options = {
        questionType: questionType.value,
        questionCount: questionCount.value,
        difficulty: difficulty.value
      };
      
      // Show loading state
      generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing Document...';
      generateBtn.disabled = true;
      
      try {
        // Extract text from file
        const textContent = await extractTextFromFile(fileInput.files[0]);
        
        if (!textContent || textContent.trim().length < 20) {
          throw new Error('Document appears to be empty or contains too little text');
        }
        
        // Analyze document complexity
        const analysis = analyzeDocumentComplexity(textContent);
        
        // Generate questions based on the actual document content
        const questions = generateQuestions(textContent, options);
        
        // Show success message with document analysis info
        showNotification(`Generated ${questions.length} questions from your document!`, 'success');
        
        // Display content analysis information
        showNotification(
          `Document analyzed: ${analysis.keyTopics.join(', ')} (${analysis.readingLevel} level)`,
          'info'
        );
        
        // Display the questions using the exam system with analysis data
        displayQuestions(questions, analysis);
        
      } catch (error) {
        console.error('Error:', error);
        showNotification('Error generating questions: ' + error.message, 'error');
      } finally {
        // Reset button
        generateBtn.innerHTML = '<i class="fas fa-robot"></i> Generate Questions';
        generateBtn.disabled = false;
      }
    });
  }
  
  // Exam state management
  let examState = {
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    flaggedQuestions: new Set(),
    timeLimit: 0,
    timeRemaining: 0,
    timerInterval: null,
    documentAnalysis: null
  };

  // Initialize exam
  function initExam(questions, analysis = null, timeLimit = 30) {
    examState = {
      questions: questions,
      currentQuestionIndex: 0,
      userAnswers: new Array(questions.length).fill(null),
      flaggedQuestions: new Set(),
      timeLimit: timeLimit * 60,
      timeRemaining: timeLimit * 60,
      timerInterval: null,
      documentAnalysis: analysis
    };

    startTimer();
    renderExam();
    showExamModal();
  }

  // Start exam timer
  function startTimer() {
    clearInterval(examState.timerInterval);
    
    examState.timerInterval = setInterval(() => {
      examState.timeRemaining--;
      
      if (examState.timeRemaining <= 0) {
        clearInterval(examState.timerInterval);
        submitExam();
        return;
      }
      
      updateTimerDisplay();
    }, 1000);
    
    updateTimerDisplay();
  }

  // Update timer display
  function updateTimerDisplay() {
    const timerElement = document.getElementById('examTimer');
    if (!timerElement) return;
    
    const minutes = Math.floor(examState.timeRemaining / 60);
    const seconds = examState.timeRemaining % 60;
    
    timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    // Add warning styles when time is running out
    timerElement.classList.remove('timer-warning', 'timer-danger');
    if (examState.timeRemaining <= 300) {
      timerElement.classList.add('timer-warning');
    }
    if (examState.timeRemaining <= 60) {
      timerElement.classList.add('timer-danger');
    }
  }

  // Render exam interface
  function renderExam() {
    renderQuestionNumbers();
    renderCurrentQuestion();
    updateNavButtons();
    updateQuestionMeta();
  }

  // Render question numbers
  function renderQuestionNumbers() {
    const container = document.getElementById('questionNumbers');
    if (!container) return;
    
    container.innerHTML = '';
    
    examState.questions.forEach((_, index) => {
      const numberElement = document.createElement('div');
      numberElement.className = 'question-number';
      numberElement.textContent = index + 1;
      
      if (index === examState.currentQuestionIndex) {
        numberElement.classList.add('current');
      }
      
      if (examState.userAnswers[index] !== null) {
        numberElement.classList.add('answered');
      }
      
      if (examState.flaggedQuestions.has(index)) {
        numberElement.classList.add('flagged');
      }
      
      numberElement.addEventListener('click', () => {
        examState.currentQuestionIndex = index;
        renderExam();
      });
      
      container.appendChild(numberElement);
    });
  }

  // Render current question
  function renderCurrentQuestion() {
    const container = document.getElementById('currentQuestion');
    if (!container || !examState.questions[examState.currentQuestionIndex]) return;
    
    const question = examState.questions[examState.currentQuestionIndex];
    
    let optionsHTML = '';
    if (question.type === 'multiple') {
      optionsHTML = question.options.map((option, index) => `
        <div class="option ${examState.userAnswers[examState.currentQuestionIndex] === index ? 'selected' : ''}" 
             data-value="${index}">
          <input type="radio" name="answer" value="${index}" 
                 ${examState.userAnswers[examState.currentQuestionIndex] === index ? 'checked' : ''}>
          <span class="option-label">${String.fromCharCode(65 + index)}. ${option}</span>
        </div>
      `).join('');
    } else if (question.type === 'truefalse') {
      optionsHTML = `
        <div class="option ${examState.userAnswers[examState.currentQuestionIndex] === true ? 'selected' : ''}" 
             data-value="true">
          <input type="radio" name="answer" value="true" 
                 ${examState.userAnswers[examState.currentQuestionIndex] === true ? 'checked' : ''}>
          <span class="option-label">True</span>
        </div>
        <div class="option ${examState.userAnswers[examState.currentQuestionIndex] === false ? 'selected' : ''}" 
             data-value="false">
          <input type="radio" name="answer" value="false" 
                 ${examState.userAnswers[examState.currentQuestionIndex] === false ? 'checked' : ''}>
          <span class="option-label">False</span>
        </div>
      `;
    } else {
      optionsHTML = `
        <textarea class="short-answer-input" placeholder="Type your answer here..." 
                  rows="4">${examState.userAnswers[examState.currentQuestionIndex] || ''}</textarea>
      `;
    }
    
    // Add document source info if available
    const sourceInfo = examState.documentAnalysis ? `
      <div class="question-source">
        <i class="fas fa-file-alt"></i>
        Based on your uploaded document: ${examState.documentAnalysis.keyTopics.slice(0, 2).join(', ')}
      </div>
    ` : '';
    
    container.innerHTML = `
      ${sourceInfo}
      <div class="question-text">${question.question}</div>
      <div class="question-options">${optionsHTML}</div>
    `;
    
    // Add event listeners to options
    if (question.type !== 'short') {
      const options = container.querySelectorAll('.option');
      options.forEach(option => {
        option.addEventListener('click', () => {
          const value = option.getAttribute('data-value');
          selectAnswer(value);
        });
      });
    } else {
      const textarea = container.querySelector('.short-answer-input');
      textarea.addEventListener('input', (e) => {
        examState.userAnswers[examState.currentQuestionIndex] = e.target.value;
        renderQuestionNumbers();
      });
    }
    
    // Update flag button
    const flagButton = document.getElementById('flagQuestion');
    if (flagButton) {
      if (examState.flaggedQuestions.has(examState.currentQuestionIndex)) {
        flagButton.classList.add('flagged');
      } else {
        flagButton.classList.remove('flagged');
      }
    }
  }

  // Select answer
  function selectAnswer(value) {
    // Convert string value to appropriate type
    let answerValue = value;
    if (value === 'true') answerValue = true;
    if (value === 'false') answerValue = false;
    if (!isNaN(value)) answerValue = parseInt(value);
    
    examState.userAnswers[examState.currentQuestionIndex] = answerValue;
    renderQuestionNumbers();
    
    // Auto-advance to next question after a short delay for better UX
    setTimeout(() => {
      if (examState.currentQuestionIndex < examState.questions.length - 1) {
        nextQuestion();
      }
    }, 300);
  }

  // Navigation functions
  function nextQuestion() {
    if (examState.currentQuestionIndex < examState.questions.length - 1) {
      examState.currentQuestionIndex++;
      renderExam();
    }
  }

  function prevQuestion() {
    if (examState.currentQuestionIndex > 0) {
      examState.currentQuestionIndex--;
      renderExam();
    }
  }

  function updateNavButtons() {
    const prevButton = document.getElementById('prevQuestion');
    const nextButton = document.getElementById('nextQuestion');
    
    if (prevButton) {
      prevButton.disabled = examState.currentQuestionIndex === 0;
    }
    
    if (nextButton) {
      nextButton.disabled = examState.currentQuestionIndex === examState.questions.length - 1;
    }
  }

  function updateQuestionMeta() {
    const questionCount = document.getElementById('examQuestionCount');
    const difficulty = document.getElementById('examDifficulty');
    
    if (questionCount) {
      questionCount.textContent = `${examState.questions.length} Questions`;
    }
    
    if (difficulty && examState.documentAnalysis) {
      // Show reading level and key topics
      difficulty.textContent = `${examState.documentAnalysis.readingLevel} Level • ${examState.documentAnalysis.keyTopics.slice(0, 2).join(', ')}`;
    }
  }

  // Flag question
  function flagQuestion() {
    if (examState.flaggedQuestions.has(examState.currentQuestionIndex)) {
      examState.flaggedQuestions.delete(examState.currentQuestionIndex);
    } else {
      examState.flaggedQuestions.add(examState.currentQuestionIndex);
    }
    renderQuestionNumbers();
    
    const flagButton = document.getElementById('flagQuestion');
    if (flagButton) {
      flagButton.classList.toggle('flagged');
    }
  }

  // Submit exam
  function submitExam() {
    clearInterval(examState.timerInterval);
    
    // Calculate score
    let correctCount = 0;
    examState.questions.forEach((question, index) => {
      const userAnswer = examState.userAnswers[index];
      if (userAnswer !== null && userAnswer === question.answer) {
        correctCount++;
      }
    });
    
    const score = (correctCount / examState.questions.length) * 100;
    
    // Show results
    showResults(score, correctCount, examState.questions.length - correctCount, examState.questions.length);
  }

  // Show results
  function showResults(score, correct, incorrect, total) {
    hideExamModal();
    
    const scorePercent = document.getElementById('scorePercent');
    const correctAnswers = document.getElementById('correctAnswers');
    const incorrectAnswers = document.getElementById('incorrectAnswers');
    const totalQuestions = document.getElementById('totalQuestions');
    const questionsReview = document.getElementById('questionsReview');
    
    if (scorePercent) scorePercent.textContent = `${Math.round(score)}%`;
    if (correctAnswers) correctAnswers.textContent = correct;
    if (incorrectAnswers) incorrectAnswers.textContent = incorrect;
    if (totalQuestions) totalQuestions.textContent = total;
    
    // Add document analysis to results if available
    if (examState.documentAnalysis && questionsReview) {
      const analysisHeader = document.createElement('div');
      analysisHeader.className = 'results-analysis';
      analysisHeader.innerHTML = `
        <h4>Document Analysis</h4>
        <div class="analysis-details">
          <p><strong>Reading Level:</strong> ${examState.documentAnalysis.readingLevel}</p>
          <p><strong>Key Topics:</strong> ${examState.documentAnalysis.keyTopics.join(', ')}</p>
          <p><strong>Complexity Score:</strong> ${examState.documentAnalysis.complexityScore}/10</p>
        </div>
      `;
      questionsReview.parentNode.insertBefore(analysisHeader, questionsReview);
    }
    
    // Generate questions review
    if (questionsReview) {
      questionsReview.innerHTML = '';
      
      examState.questions.forEach((question, index) => {
        const userAnswer = examState.userAnswers[index];
        const isCorrect = userAnswer === question.answer;
        
        let answerDisplay = '';
        if (question.type === 'multiple') {
          answerDisplay = `Your answer: ${userAnswer !== null ? String.fromCharCode(65 + userAnswer) + '. ' + question.options[userAnswer] : 'Not answered'}`;
        } else if (question.type === 'truefalse') {
          answerDisplay = `Your answer: ${userAnswer === true ? 'True' : userAnswer === false ? 'False' : 'Not answered'}`;
        } else {
          answerDisplay = `Your answer: ${userAnswer || 'Not answered'}`;
        }
        
        const correctAnswer = question.type === 'multiple' 
          ? `${String.fromCharCode(65 + question.answer)}. ${question.options[question.answer]}`
          : question.type === 'truefalse'
          ? (question.answer ? 'True' : 'False')
          : question.answer;
        
        const reviewItem = document.createElement('div');
        reviewItem.className = 'question-review-item';
        reviewItem.innerHTML = `
          <div class="review-question">${index + 1}. ${question.question}</div>
          <div class="review-answer ${isCorrect ? 'review-correct' : 'review-incorrect'}">
            ${answerDisplay}
            <span class="review-status ${isCorrect ? 'status-correct' : 'status-incorrect'}">
              ${isCorrect ? 'Correct' : 'Incorrect'}
            </span>
          </div>
          ${!isCorrect ? `<div class="review-answer review-correct">Correct answer: ${correctAnswer}</div>` : ''}
        `;
        
        questionsReview.appendChild(reviewItem);
      });
    }
    
    showResultsModal();
  }

  // Modal control functions
  function showExamModal() {
    const modal = document.getElementById('examModal');
    if (modal) {
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }
  }

  function hideExamModal() {
    const modal = document.getElementById('examModal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
    }
  }

  function showResultsModal() {
    const modal = document.getElementById('resultsModal');
    if (modal) {
      modal.style.display = 'flex';
    }
  }

  function hideResultsModal() {
    const modal = document.getElementById('resultsModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function displayQuestions(questions, analysis) {
    // Start exam with 30-minute time limit and pass analysis data
    initExam(questions, analysis, 30);
  }

  // Download results as PDF
  function downloadResults() {
    showNotification('Results download functionality would be implemented here', 'info');
  }

  // Add exam event listeners
  document.getElementById('prevQuestion')?.addEventListener('click', prevQuestion);
  document.getElementById('nextQuestion')?.addEventListener('click', nextQuestion);
  document.getElementById('flagQuestion')?.addEventListener('click', flagQuestion);
  document.getElementById('submitExam')?.addEventListener('click', submitExam);
  document.getElementById('examClose')?.addEventListener('click', hideExamModal);
  document.getElementById('resultsClose')?.addEventListener('click', hideResultsModal);
  document.getElementById('reviewAnswers')?.addEventListener('click', () => {
    hideResultsModal();
    showExamModal();
  });
  document.getElementById('newExam')?.addEventListener('click', () => {
    hideResultsModal();
    // Reset and return to main page
    window.location.reload();
  });
  document.getElementById('downloadResults')?.addEventListener('click', downloadResults);

  // Login button functionality
  if (loginBtn) {
    loginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showLoginModal();
    });
  }
  
  // Signup button functionality
  if (signupBtn) {
    signupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      showSignupModal();
    });
  }
  
  // Pricing buttons functionality
  if (pricingBtns.length > 0) {
    pricingBtns.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        if (index === 0) { // Free plan
          showNotification('Free plan selected! You can now upload PDF files.', 'success');
          if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.classList.add('active');
          }
        } else if (index === 1) { // Premium plan
          showSignupModal('premium');
        } else { // Institutional plan
          showNotification('Please contact us at contact@studystretch.com for institutional pricing.', 'info');
        }
      });
    });
  }
  
  // CTA button functionality
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      // Scroll to upload section
      const uploadBox = document.querySelector('.upload-box');
      if (uploadBox) {
        uploadBox.scrollIntoView({ 
          behavior: 'smooth',
          block: 'center'
        });
      }
    });
  }
  
  // Mobile menu toggle
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      hamburger.classList.toggle('active');
    });
  }
  
  // FAQ accordion functionality
  const faqItems = document.querySelectorAll('.faq-item');
  
  if (faqItems.length > 0) {
    faqItems.forEach(item => {
      const question = item.querySelector('.faq-question');
      
      if (question) {
        question.addEventListener('click', () => {
          item.classList.toggle('active');
        });
      }
    });
  }
  
  // Smooth scrolling for navigation links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      if (this.getAttribute('href') === '#') return;
      
      e.preventDefault();
      
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        
        // Close mobile menu if open
        if (navLinks && navLinks.classList.contains('active')) {
          navLinks.classList.remove('active');
          if (hamburger) {
            hamburger.classList.remove('active');
          }
        }
      }
    });
  });
  
  // Notification system
  function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
  
  // Modal functions
  function showLoginModal() {
    const modalHTML = `
      <div class="modal" id="loginModal">
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h2>Login to StudyStretch</h2>
          <form id="loginForm">
            <div class="form-group">
              <label for="loginEmail">Email Address</label>
              <input type="email" id="loginEmail" required>
            </div>
            <div class="form-group">
              <label for="loginPassword">Password</label>
              <input type="password" id="loginPassword" required>
            </div>
            <button type="submit" class="modal-btn">Login</button>
          </form>
          <p>Don't have an account? <a href="#" id="switchToSignup">Sign up</a></p>
        </div>
      </div>
    `;
    
    showModal(modalHTML);
    
    // Add form submission handler
    const loginForm = document.querySelector('#loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showNotification('Login functionality would connect to your backend.', 'info');
        closeModal();
      });
    }
    
    // Add switch to signup handler
    const switchToSignup = document.getElementById('switchToSignup');
    if (switchToSignup) {
      switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
        showSignupModal();
      });
    }
  }
  
  function showSignupModal(plan = null) {
    const modalHTML = `
      <div class="modal" id="signupModal">
        <div class="modal-content">
          <span class="close-modal">&times;</span>
          <h2>Create Your Account</h2>
          ${plan === 'premium' ? '<p class="modal-subtitle">Sign up for our Premium plan to unlock all features</p>' : ''}
          <form id="signupForm">
            <div class="form-group">
              <label for="signupName">Full Name</label>
              <input type="text" id="signupName" required>
            </div>
            <div class="form-group">
              <label for="signupEmail">Email Address</label>
              <input type="email" id="signupEmail" required>
            </div>
            <div class="form-group">
              <label for="signupPassword">Password</label>
              <input type="password" id="signupPassword" required>
            </div>
            <div class="form-group">
              <label for="signupConfirmPassword">Confirm Password</label>
              <input type="password" id="signupConfirmPassword" required>
            </div>
            <button type="submit" class="modal-btn">Create Account</button>
          </form>
          <p>Already have an account? <a href="#" id="switchToLogin">Login</a></p>
        </div>
      </div>
    `;
    
    showModal(modalHTML);
    
    // Add form submission handler
    const signupForm = document.querySelector('#signupForm');
    if (signupForm) {
      signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showNotification('Signup functionality would connect to your backend.', 'info');
        closeModal();
      });
    }
    
    // Add switch to login handler
    const switchToLogin = document.getElementById('switchToLogin');
    if (switchToLogin) {
      switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal();
        showLoginModal();
      });
    }
  }
  
  function showModal(html) {
    // Remove any existing modals
    const existingModal = document.querySelector('.modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create and show modal
    const modal = document.createElement('div');
    modal.innerHTML = html;
    document.body.appendChild(modal);
    
    // Add close handler
    const closeModalBtn = modal.querySelector('.close-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  
  function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
      modal.remove();
    }
  }

  // Add keyboard shortcuts for exam navigation
  document.addEventListener('keydown', function(e) {
    // Only apply shortcuts when exam modal is open
    const examModal = document.getElementById('examModal');
    if (!examModal || examModal.style.display !== 'block') return;
    
    switch(e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        prevQuestion();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextQuestion();
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        flagQuestion();
        break;
      case '1':
      case '2':
      case '3':
      case '4':
        e.preventDefault();
        if (examState.questions[examState.currentQuestionIndex]?.type === 'multiple') {
          selectAnswer(parseInt(e.key) - 1);
        }
        break;
      case 't':
      case 'T':
        e.preventDefault();
        if (examState.questions[examState.currentQuestionIndex]?.type === 'truefalse') {
          selectAnswer('true');
        }
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        if (examState.questions[examState.currentQuestionIndex]?.type === 'truefalse') {
          selectAnswer('false');
        }
        break;
    }
  });

  // Add touch/gesture support for mobile devices
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  });

  document.addEventListener('touchend', function(e) {
    const examModal = document.getElementById('examModal');
    if (!examModal || examModal.style.display !== 'block') return;
    
    const touchEndX = e.changedTouches[0].screenX;
    const touchEndY = e.changedTouches[0].screenY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Check if it's primarily a horizontal swipe (not vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        // Swipe right - previous question
        prevQuestion();
      } else {
        // Swipe left - next question
        nextQuestion();
      }
    }
  });

  // Add beforeunload handler to warn users about exiting during exam
  window.addEventListener('beforeunload', function(e) {
    const examModal = document.getElementById('examModal');
    if (examModal && examModal.style.display === 'block') {
      e.preventDefault();
      e.returnValue = 'You have an ongoing exam. Are you sure you want to leave?';
      return e.returnValue;
    }
  });

  // Initialize tooltips
  function initTooltips() {
    const elements = document.querySelectorAll('[data-tooltip]');
    elements.forEach(el => {
      el.addEventListener('mouseenter', showTooltip);
      el.addEventListener('mouseleave', hideTooltip);
    });
  }

  function showTooltip(e) {
    const tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = this.getAttribute('data-tooltip');
    document.body.appendChild(tooltip);
    
    const rect = this.getBoundingClientRect();
    tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
    tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + 'px';
    
    this.tooltip = tooltip;
  }

  function hideTooltip() {
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
  }

  // Initialize tooltips after DOM is fully loaded
  setTimeout(initTooltips, 1000);
});

// Text extraction functions
async function extractTextFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      const content = e.target.result;
      
      // Handle different file types
      if (file.type === 'application/pdf') {
        extractTextFromPDF(content).then(resolve).catch(reject);
      } else if (file.type === 'text/plain') {
        resolve(content);
      } else if (file.type.includes('image')) {
        // For images, we'll use a simple placeholder since we don't have OCR
        resolve(`Image file: ${file.name}. This contains visual content that would be analyzed to generate questions.`);
      } else {
        // For other file types (DOCX, PPT), we'll use a simple text extraction
        resolve(extractTextFromOtherFormats(content, file.name));
      }
    };
    
    reader.onerror = function() {
      reject(new Error('Failed to read file'));
    };
    
    if (file.type === 'application/pdf') {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  });
}

async function extractTextFromPDF(data) {
  // Simple PDF text extraction using PDF.js
  try {
    // This is a simplified version - in a real implementation, you would use PDF.js
    return "PDF content extracted successfully. This would contain the actual text from your PDF document.";
  } catch (error) {
    throw new Error('Failed to extract text from PDF');
  }
}

function extractTextFromOtherFormats(content, filename) {
  // Simple text extraction for other formats
  const ext = filename.split('.').pop().toLowerCase();
  
  if (ext === 'docx' || ext === 'doc') {
    return "Word document content extracted successfully. This would contain the actual text from your Word document.";
  } else if (ext === 'ppt' || ext === 'pptx') {
    return "PowerPoint presentation content extracted successfully. This would contain the actual text from your presentation.";
  } else {
    return `Content from ${filename} extracted successfully.`;
  }
}

// Document analysis function
function analyzeDocumentComplexity(textContent) {
  // Simple complexity analysis based on text length and structure
  const wordCount = textContent.split(/\s+/).length;
  const sentenceCount = textContent.split(/[.!?]+/).length;
  
  let readingLevel = 'High School';
  if (wordCount > 1000) readingLevel = 'Undergraduate';
  if (wordCount > 2000) readingLevel = 'Graduate';
  
  // Extract simple "topics" by finding frequent words
  const words = textContent.toLowerCase().split(/\s+/);
  const wordFreq = {};
  words.forEach(word => {
    if (word.length > 5) { // Only longer words
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  const topics = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  
  return {
    readingLevel,
    keyTopics: topics.length > 0 ? topics : ['General'],
    estimatedQuestionCount: Math.min(Math.floor(wordCount / 50), 50),
    complexityScore: Math.min(Math.floor(wordCount / 100), 10)
  };
}

// Question generation function
function generateQuestions(textContent, options) {
  const { questionType, questionCount, difficulty } = options;
  const questions = [];
  
  // Extract sentences from the text
  const sentences = textContent.split(/[.!?]+/)
    .filter(sentence => sentence.trim().length > 10)
    .map(sentence => sentence.trim());
  
  for (let i = 0; i < Math.min(questionCount, sentences.length); i++) {
    const sentence = sentences[i];
    
    if (questionType === 'multiple') {
      questions.push(createMultipleChoice(sentence, i, difficulty));
    } else if (questionType === 'truefalse') {
      questions.push(createTrueFalse(sentence, i, difficulty));
    } else if (questionType === 'short') {
      questions.push(createShortAnswer(sentence, i, difficulty));
    } else if (questionType === 'flashcard') {
      questions.push(createFlashcard(sentence, i, difficulty));
    } else {
      // Mixed question types
      const types = ['multiple', 'truefalse', 'short'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      
      if (randomType === 'multiple') {
        questions.push(createMultipleChoice(sentence, i, difficulty));
      } else if (randomType === 'truefalse') {
        questions.push(createTrueFalse(sentence, i, difficulty));
      } else {
        questions.push(createShortAnswer(sentence, i, difficulty));
      }
    }
  }
  
  return questions;
}

function createMultipleChoice(sentence, index, difficulty) {
  const baseQuestion = `What is the main idea of this statement: "${sentence}"?`;
  
  const questions = {
    easy: {
      question: baseQuestion,
      options: [
        'A complete analysis of the topic',
        'A specific detail or fact', 
        'An opinion or perspective',
        'A historical reference'
      ],
      answer: 1
    },
    medium: {
      question: `Based on this statement "${sentence}", what would be the most logical conclusion?`,
      options: [
        'The topic is well-researched',
        'This is a factual statement',
        'This represents a specific viewpoint',
        'This is a historical fact'
      ],
      answer: 2
    },
    hard: {
      question: `Analyze this statement: "${sentence}". What does it imply about the broader context?`,
      options: [
        'It suggests comprehensive understanding',
        'It indicates specialized knowledge',
        'It reflects a particular perspective',
        'It demonstrates factual accuracy'
      ],
      answer: 2
    },
    exam: {
      question: `Critically evaluate this statement: "${sentence}". What are its potential limitations?`,
      options: [
        'Lack of supporting evidence',
        'Overgeneralization of concepts',
        'Potential bias in presentation',
        'All of the above'
      ],
      answer: 3
    }
  };

  return {
    type: 'multiple',
    ...questions[difficulty] || questions.medium
  };
}

function createTrueFalse(sentence, index, difficulty) {
  const questions = {
    easy: {
      question: `This statement appears to be factual: "${sentence}"`,
      answer: Math.random() > 0.3 // Mostly true for easy
    },
    medium: {
      question: `This statement represents an objective fact: "${sentence}"`,
      answer: Math.random() > 0.5 // 50/50
    },
    hard: {
      question: `This statement is completely unbiased: "${sentence}"`,
      answer: Math.random() > 0.7 // Mostly false for hard
    },
    exam: {
      question: `This statement could be verified through empirical evidence: "${sentence}"`,
      answer: Math.random() > 0.6
    }
  };

  return {
    type: 'truefalse',
    ...questions[difficulty] || questions.medium
  };
}

function createShortAnswer(sentence, index, difficulty) {
  const prompts = {
    easy: `Explain this simple statement: "${sentence}"`,
    medium: `What does this statement mean: "${sentence}"?`,
    hard: `Analyze the implications of this statement: "${sentence}"`,
    exam: `Critically evaluate this statement and discuss its significance: "${sentence}"`
  };

  return {
    type: 'short',
    question: prompts[difficulty] || prompts.medium,
    answer: 'This statement discusses important concepts from the document that would be explored in the answer.'
  };
}

function createFlashcard(sentence, index, difficulty) {
  const terms = {
    easy: {
      question: `Basic concept from: "${sentence.substring(0, 50)}..."`,
      answer: 'A fundamental idea or principle from the document'
    },
    medium: {
      question: `Key term related to: "${sentence.substring(0, 40)}..."`,
      answer: 'An important concept or definition from the content'
    },
    hard: {
      question: `Advanced concept: "${sentence.substring(0, 30)}..."`,
      answer: 'A complex idea or theory discussed in the material'
    },
    exam: {
      question: `Critical concept: "${sentence.substring(0, 25)}..."`,
      answer: 'A sophisticated concept requiring deep understanding'
    }
  };

  return {
    type: 'flashcard',
    ...terms[difficulty] || terms.medium
  };
}