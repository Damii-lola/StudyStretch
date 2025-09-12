// script.js
document.addEventListener('DOMContentLoaded', function() {
  // Create stars for background
  createStars();
  
  // Initialize file upload functionality
  initFileUpload();
  
  // Initialize FAQ toggles
  initFAQ();
  
  // Initialize mobile menu
  initMobileMenu();
});

// Create starry background
function createStars() {
  const starsContainer = document.querySelector('.stars');
  const starCount = 150;
  
  for (let i = 0; i < starCount; i++) {
    const star = document.createElement('span');
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 5}s`;
    star.style.animationDuration = `${2 + Math.random() * 3}s`;
    starsContainer.appendChild(star);
  }
}

// Initialize file upload functionality
function initFileUpload() {
  const uploadArea = document.querySelector('.upload-area');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  const browseBtn = document.querySelector('.btn-browse');
  const generateBtn = document.querySelector('.btn-generate');
  
  let selectedFile = null;
  
  // Drag and drop functionality
  uploadArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
  });
  
  uploadArea.addEventListener('dragleave', function() {
    uploadArea.classList.remove('dragover');
  });
  
  uploadArea.addEventListener('drop', function(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });
  
  // Click to select file
  uploadArea.addEventListener('click', function() {
    fileInput.click();
  });
  
  browseBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    fileInput.click();
  });
  
  fileInput.addEventListener('change', function() {
    if (fileInput.files.length) {
      handleFileSelect(fileInput.files[0]);
    }
  });
  
  // Generate questions button
  generateBtn.addEventListener('click', function() {
    if (!selectedFile) {
      showNotification('Please select a file first', 'error');
      return;
    }
    
    uploadAndConvertFile(selectedFile);
  });
  
  function handleFileSelect(file) {
    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];
    
    if (!validTypes.includes(file.type)) {
      showNotification('Invalid file type. Please upload PDF, DOCX, DOC, TXT, PNG, or JPG files.', 'error');
      return;
    }
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showNotification('File too large. Maximum size is 10MB.', 'error');
      return;
    }
    
    selectedFile = file;
    
    // Update UI to show file is selected
    const uploadIcon = uploadArea.querySelector('.upload-icon i');
    const uploadTitle = uploadArea.querySelector('.upload-title');
    
    uploadIcon.className = 'fas fa-file-check';
    uploadTitle.textContent = `Selected: ${file.name}`;
    
    // Enable generate button
    generateBtn.classList.add('active');
    generateBtn.disabled = false;
    
    showNotification('File selected successfully! Click "Generate Questions" to continue.', 'success');
  }
  
  async function uploadAndConvertFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Show loading state
    const generateBtn = document.querySelector('.btn-generate');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    generateBtn.disabled = true;
    
    try {
      // Replace with your Railway backend URL
      const backendUrl = 'examblox-production.up.railway.app';
      
      const response = await fetch(`${backendUrl}/convert`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('File converted successfully!', 'success');
        console.log('Extracted text:', data.text);
        // Store the extracted text for question generation
        window.extractedText = data.text;
        
        // Enable question generation options
        enableQuestionOptions();
        
      } else {
        showNotification(data.error || 'Failed to convert file', 'error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showNotification('Network error. Please try again.', 'error');
    } finally {
      // Restore button state
      generateBtn.innerHTML = originalText;
      generateBtn.disabled = false;
    }
  }
  
  function enableQuestionOptions() {
    // Enable all disabled form elements
    document.querySelectorAll('select, input').forEach(el => {
      el.disabled = false;
    });
    
    // Change button text
    const generateBtn = document.querySelector('.btn-generate');
    generateBtn.innerHTML = '<i class="fas fa-robot"></i> Generate Questions';
    
    showNotification('File processed! Customize your questions and click Generate.', 'info');
  }
}

// Initialize FAQ toggles
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    question.addEventListener('click', () => {
      item.classList.toggle('active');
    });
  });
}

// Initialize mobile menu
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('active');
  });
}

// Notification system
function showNotification(message, type = 'info') {
  // Remove any existing notifications
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => {
    notification.remove();
  });
  
  // Create new notification
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

// Modal system (for future login/signup)
function showModal(type) {
  // Implementation for modal windows
  console.log(`Show ${type} modal`);
}

// Tooltip system
function showTooltip(message, element) {
  // Implementation for tooltips
  console.log(`Show tooltip: ${message}`);
}
