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
  fileInput.id = 'file-input';
  fileInput.accept = '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  const browseBtn = document.querySelector('.btn-browse');
  const generateBtn = document.querySelector('.btn-generate');
  
  let selectedFile = null;
  
  // Drag and drop functionality
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    uploadArea.addEventListener(eventName, preventDefaults, false);
  });
  
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
  
  uploadArea.addEventListener('dragenter', function() {
    uploadArea.classList.add('dragover');
    uploadArea.querySelector('.upload-title').textContent = 'Drop file here...';
  });
  
  uploadArea.addEventListener('dragleave', function() {
    uploadArea.classList.remove('dragover');
    updateUploadText();
  });
  
  uploadArea.addEventListener('drop', function(e) {
    uploadArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
    updateUploadText();
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
  
  function updateUploadText() {
    if (!selectedFile) {
      uploadArea.querySelector('.upload-title').textContent = 'Drag & drop your file here';
    }
  }
  
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
    const uploadSubtitle = uploadArea.querySelector('.upload-subtitle');
    const fileSize = formatFileSize(file.size);
    
    uploadIcon.className = 'fas fa-file-check';
    uploadIcon.style.color = '#4CAF50';
    uploadTitle.textContent = file.name;
    uploadTitle.style.fontWeight = '600';
    uploadTitle.style.color = '#4CAF50';
    
    if (uploadSubtitle) {
      uploadSubtitle.textContent = `Size: ${fileSize} • Type: ${getFileType(file.type)}`;
      uploadSubtitle.style.display = 'block';
    }
    
    // Create a remove file button
    let removeBtn = uploadArea.querySelector('.remove-file');
    if (!removeBtn) {
      removeBtn = document.createElement('button');
      removeBtn.className = 'remove-file';
      removeBtn.innerHTML = '<i class="fas fa-times"></i> Remove';
      removeBtn.style.marginTop = '10px';
      removeBtn.style.padding = '5px 10px';
      removeBtn.style.background = 'rgba(244, 67, 54, 0.2)';
      removeBtn.style.color = '#f44336';
      removeBtn.style.border = '1px solid #f44336';
      removeBtn.style.borderRadius = '4px';
      removeBtn.style.cursor = 'pointer';
      removeBtn.style.fontSize = '12px';
      
      removeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        resetFileSelection();
      });
      
      uploadArea.appendChild(removeBtn);
    }
    
    // Enable generate button
    generateBtn.classList.add('active');
    generateBtn.disabled = false;
    
    showNotification(`"${file.name}" selected successfully! Click "Generate Questions" to continue.`, 'success');
  }
  
  function resetFileSelection() {
    selectedFile = null;
    fileInput.value = '';
    
    const uploadArea = document.querySelector('.upload-area');
    const uploadIcon = uploadArea.querySelector('.upload-icon i');
    const uploadTitle = uploadArea.querySelector('.upload-title');
    const uploadSubtitle = uploadArea.querySelector('.upload-subtitle');
    const removeBtn = uploadArea.querySelector('.remove-file');
    
    uploadIcon.className = 'fas fa-file-upload';
    uploadIcon.style.color = '';
    uploadTitle.textContent = 'Drag & drop your file here';
    uploadTitle.style.fontWeight = '';
    uploadTitle.style.color = '';
    
    if (uploadSubtitle) {
      uploadSubtitle.textContent = 'or';
      uploadSubtitle.style.display = '';
    }
    
    if (removeBtn) {
      removeBtn.remove();
    }
    
    // Disable generate button
    const generateBtn = document.querySelector('.btn-generate');
    generateBtn.classList.remove('active');
    generateBtn.disabled = true;
    
    showNotification('File removed', 'info');
  }
  
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function getFileType(mimeType) {
    const types = {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/msword': 'DOC',
      'text/plain': 'TXT',
      'image/png': 'PNG',
      'image/jpeg': 'JPG',
      'image/jpg': 'JPG'
    };
    return types[mimeType] || mimeType;
  }
  
  async function uploadAndConvertFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Show loading state
    const generateBtn = document.querySelector('.btn-generate');
    const originalText = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    generateBtn.disabled = true;
    
    // Show progress in upload area
    const uploadArea = document.querySelector('.upload-area');
    const uploadTitle = uploadArea.querySelector('.upload-title');
    const originalTitle = uploadTitle.textContent;
    uploadTitle.innerHTML = 'Processing file... <div class="progress-bar"><div class="progress"></div></div>';
    
    try {
      // Replace with your Railway backend URL
      const backendUrl = 'https://your-backend-url.railway.app';
      
      const response = await fetch(`${backendUrl}/convert`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('File converted successfully! Text extracted: ' + data.characterCount + ' characters', 'success');
        console.log('Extracted text:', data.text);
        
        // Store the extracted text for question generation
        window.extractedText = data.text;
        
        // Update UI to show success
        uploadTitle.innerHTML = `<i class="fas fa-check-circle" style="color: #4CAF50;"></i> Conversion Complete!`;
        
        // Enable question generation options
        enableQuestionOptions();
        
      } else {
        showNotification(data.error || 'Failed to convert file', 'error');
        uploadTitle.textContent = originalTitle;
      }
    } catch (error) {
      console.error('Upload error:', error);
      showNotification('Network error. Please try again.', 'error');
      uploadTitle.textContent = originalTitle;
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
  
  // Close menu when clicking on links
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('active');
    });
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

// Add some CSS for the progress bar
const progressStyle = document.createElement('style');
progressStyle.textContent = `
  .progress-bar {
    width: 100%;
    height: 5px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    margin-top: 10px;
    overflow: hidden;
  }
  
  .progress {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, var(--primary-light), var(--primary));
    border-radius: 3px;
    animation: progressAnimation 2s infinite;
  }
  
  @keyframes progressAnimation {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
  }
`;
document.head.appendChild(progressStyle);
