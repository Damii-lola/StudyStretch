// script.js
document.addEventListener('DOMContentLoaded', function() {
  console.log('ExamBlox script loaded successfully!');
  
  // Create stars for background
  createStars();
  
  // Initialize file upload functionality
  initFileUpload();
  
  // Initialize FAQ toggles
  initFAQ();
  
  // Initialize mobile menu
  initMobileMenu();
  
  // Initialize modal system
  initModals();
});

// Create starry background
function createStars() {
  const starsContainer = document.querySelector('.stars');
  if (!starsContainer) {
    console.error('Stars container not found!');
    return;
  }
  
  // Clear existing stars
  starsContainer.innerHTML = '';
  
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
  if (!uploadArea) {
    console.error('Upload area not found!');
    return;
  }

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.id = 'file-input';
  fileInput.accept = '.pdf,.docx,.doc,.txt,.png,.jpg,.jpeg';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);
  
  const browseBtn = document.querySelector('.btn-browse');
  const generateBtn = document.querySelector('.btn-generate');
  
  let selectedFile = null;
  let fileContent = '';
  
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
    const uploadTitle = uploadArea.querySelector('.upload-title');
    if (uploadTitle) uploadTitle.textContent = 'Drop file here...';
  });
  
  uploadArea.addEventListener('dragover', function() {
    uploadArea.classList.add('dragover');
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
  
  if (browseBtn) {
    browseBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      fileInput.click();
    });
  }
  
  fileInput.addEventListener('change', function() {
    if (fileInput.files.length) {
      handleFileSelect(fileInput.files[0]);
    }
  });
  
  // Generate questions button
  if (generateBtn) {
    generateBtn.addEventListener('click', function() {
      if (!selectedFile) {
        showNotification('Please select a file first', 'error');
        return;
      }
      
      uploadAndConvertFile(selectedFile);
    });
  }
  
  function updateUploadText() {
    if (!selectedFile) {
      const uploadTitle = uploadArea.querySelector('.upload-title');
      if (uploadTitle) uploadTitle.textContent = 'Drag & drop your file here';
    }
  }
  
  async function handleFileSelect(file) {
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
    
    // Read file content immediately for preview
    try {
      fileContent = await readFileContent(file);
      console.log('File content preview:', fileContent.substring(0, 200) + '...');
    } catch (error) {
      console.error('Error reading file:', error);
      showNotification('Error reading file content', 'error');
      return;
    }
    
    // Update UI to show file is selected
    const uploadIcon = uploadArea.querySelector('.upload-icon i');
    const uploadTitle = uploadArea.querySelector('.upload-title');
    const uploadSubtitle = uploadArea.querySelector('.upload-subtitle');
    const fileSize = formatFileSize(file.size);
    
    if (uploadIcon) {
      uploadIcon.className = 'fas fa-file-check';
      uploadIcon.style.color = '#4CAF50';
    }
    
    if (uploadTitle) {
      uploadTitle.textContent = file.name;
      uploadTitle.style.fontWeight = '600';
      uploadTitle.style.color = '#4CAF50';
    }
    
    if (uploadSubtitle) {
      uploadSubtitle.textContent = `Size: ${fileSize} • Type: ${getFileType(file.type)} • Click to preview`;
      uploadSubtitle.style.display = 'block';
      uploadSubtitle.style.cursor = 'pointer';
      uploadSubtitle.style.color = '#6a4bff';
      uploadSubtitle.onclick = () => showFilePreview(file.name, fileContent);
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
    
    // Add preview button
    let previewBtn = uploadArea.querySelector('.preview-file');
    if (!previewBtn) {
      previewBtn = document.createElement('button');
      previewBtn.className = 'preview-file';
      previewBtn.innerHTML = '<i class="fas fa-eye"></i> Preview Content';
      previewBtn.style.marginTop = '10px';
      previewBtn.style.marginRight = '10px';
      previewBtn.style.padding = '5px 10px';
      previewBtn.style.background = 'rgba(106, 75, 255, 0.2)';
      previewBtn.style.color = '#6a4bff';
      previewBtn.style.border = '1px solid #6a4bff';
      previewBtn.style.borderRadius = '4px';
      previewBtn.style.cursor = 'pointer';
      previewBtn.style.fontSize = '12px';
      
      previewBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        showFilePreview(file.name, fileContent);
      });
      
      uploadArea.appendChild(previewBtn);
    }
    
    // Enable generate button
    if (generateBtn) {
      generateBtn.classList.add('active');
      generateBtn.disabled = false;
    }
    
    showNotification(`"${file.name}" selected successfully! Click "Preview Content" to verify extraction.`, 'success');
  }
  
  async function readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        // For text-based files
        if (file.type.includes('text') || 
            file.type.includes('pdf') || 
            file.type.includes('word') ||
            file.type.includes('document')) {
          resolve(e.target.result);
        } 
        // For images, we can't read text directly in frontend
        else if (file.type.includes('image')) {
          resolve(`[Image File: ${file.name}]\nText extraction will happen on the server using OCR.`);
        }
        else {
          resolve(`[Binary File: ${file.name}]\nContent will be extracted on the server.`);
        }
      };
      
      reader.onerror = function() {
        reject(new Error('Failed to read file'));
      };
      
      // Read based on file type
      if (file.type.includes('text') || file.type === 'application/pdf') {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file); // For binary files
      }
    });
  }
  
  function resetFileSelection() {
    selectedFile = null;
    fileContent = '';
    fileInput.value = '';
    
    const uploadIcon = uploadArea.querySelector('.upload-icon i');
    const uploadTitle = uploadArea.querySelector('.upload-title');
    const uploadSubtitle = uploadArea.querySelector('.upload-subtitle');
    const removeBtn = uploadArea.querySelector('.remove-file');
    const previewBtn = uploadArea.querySelector('.preview-file');
    
    if (uploadIcon) {
      uploadIcon.className = 'fas fa-file-upload';
      uploadIcon.style.color = '';
    }
    
    if (uploadTitle) {
      uploadTitle.textContent = 'Drag & drop your file here';
      uploadTitle.style.fontWeight = '';
      uploadTitle.style.color = '';
    }
    
    if (uploadSubtitle) {
      uploadSubtitle.textContent = 'or';
      uploadSubtitle.style.display = '';
      uploadSubtitle.style.cursor = '';
      uploadSubtitle.style.color = '';
      uploadSubtitle.onclick = null;
    }
    
    if (removeBtn) removeBtn.remove();
    if (previewBtn) previewBtn.remove();
    
    // Disable generate button
    if (generateBtn) {
      generateBtn.classList.remove('active');
      generateBtn.disabled = true;
    }
    
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
    const originalText = generateBtn ? generateBtn.innerHTML : '';
    
    if (generateBtn) {
      generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      generateBtn.disabled = true;
    }
    
    // Show progress in upload area
    const uploadTitle = uploadArea.querySelector('.upload-title');
    const originalTitle = uploadTitle ? uploadTitle.textContent : '';
    
    if (uploadTitle) {
      uploadTitle.innerHTML = 'Processing file... <div class="progress-bar"><div class="progress"></div></div>';
    }
    
    try {
      // For testing - simulate backend processing
      console.log('Simulating file processing for:', file.name);
      console.log('File content (first 500 chars):', fileContent.substring(0, 500));
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate extracted text (in real app, this comes from backend)
      const simulatedText = simulateTextExtraction(file.name, fileContent);
      
      showNotification(`File processed successfully! Extracted ${simulatedText.length} characters.`, 'success');
      console.log('Simulated extracted text (first 500 chars):', simulatedText.substring(0, 500));
      
      // Store the extracted text for question generation
      window.extractedText = simulatedText;
      
      // Update UI to show success
      if (uploadTitle) {
        uploadTitle.innerHTML = `<i class="fas fa-check-circle" style="color: #4CAF50;"></i> Conversion Complete!`;
      }
      
      // Show preview of extracted text
      showFilePreview('Extracted Text Preview', simulatedText, true);
      
      // Enable question generation options
      enableQuestionOptions();
      
    } catch (error) {
      console.error('Upload error:', error);
      showNotification('Error processing file. Please try again.', 'error');
      if (uploadTitle) uploadTitle.textContent = originalTitle;
    } finally {
      // Restore button state
      if (generateBtn) {
        generateBtn.innerHTML = originalText;
        generateBtn.disabled = false;
      }
    }
  }
  
  function simulateTextExtraction(filename, content) {
    // Simulate different extraction based on file type
    if (filename.endsWith('.pdf')) {
      return `PDF EXTRACTION SIMULATION:\n\n${content.substring(0, 1000)}...\n\n[This is simulated PDF text extraction. Real backend would use pdf-parse library]`;
    }
    else if (filename.endsWith('.docx')) {
      return `DOCX EXTRACTION SIMULATION:\n\n${content.substring(0, 1000)}...\n\n[This is simulated DOCX text extraction. Real backend would use mammoth library]`;
    }
    else if (filename.endsWith('.txt')) {
      return `TEXT FILE CONTENT:\n\n${content}\n\n[This is the actual file content from the text file]`;
    }
    else if (filename.match(/\.(jpg|jpeg|png)$/i)) {
      return `IMAGE OCR SIMULATION:\n\nThis is a simulation of text that would be extracted from your image using OCR technology.\n\nThe actual backend would use Tesseract.js to perform optical character recognition on images and extract any readable text.\n\nImage: ${filename}\n\n[This is simulated OCR output. Real backend would process the image and extract actual text]`;
    }
    else {
      return `EXTRACTED TEXT FROM ${filename.toUpperCase()}:\n\n${content.substring(0, 1500)}...\n\n[This is simulated text extraction]`;
    }
  }
  
  function enableQuestionOptions() {
    // Enable all disabled form elements
    document.querySelectorAll('select, input').forEach(el => {
      el.disabled = false;
    });
    
    // Change button text
    const generateBtn = document.querySelector('.btn-generate');
    if (generateBtn) {
      generateBtn.innerHTML = '<i class="fas fa-robot"></i> Generate Questions';
    }
    
    showNotification('File processed! Customize your questions and click Generate.', 'info');
  }
}

// File preview modal
function showFilePreview(filename, content, isExtracted = false) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-modal">&times;</span>
      <h2>${isExtracted ? 'Extracted Text Preview' : 'File Content Preview'}</h2>
      <p class="modal-subtitle">File: ${filename}</p>
      <div class="file-preview">
        <div class="preview-header">
          <span>Content (${content.length} characters)</span>
          <button class="copy-btn" onclick="copyToClipboard('${content.replace(/'/g, "\\'")}')">
            <i class="fas fa-copy"></i> Copy
          </button>
        </div>
        <div class="preview-content">${formatPreviewContent(content)}</div>
      </div>
      <div class="preview-stats">
        <div class="stat">
          <i class="fas fa-font"></i>
          <span>Characters: ${content.length}</span>
        </div>
        <div class="stat">
          <i class="fas fa-file-word"></i>
          <span>Words: ${content.split(/\s+/).filter(word => word.length > 0).length}</span>
        </div>
        <div class="stat">
          <i class="fas fa-paragraph"></i>
          <span>Lines: ${content.split('\n').length}</span>
        </div>
      </div>
    </div>
  `;
  
  modal.querySelector('.close-modal').onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };
  
  document.body.appendChild(modal);
}

function formatPreviewContent(content) {
  // Escape HTML and limit preview length
  const escapedContent = content
    .substring(0, 5000) // Limit preview length
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  return escapedContent + (content.length > 5000 ? '\n\n... (content truncated)' : '');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showNotification('Content copied to clipboard!', 'success');
  }).catch(err => {
    showNotification('Failed to copy content', 'error');
  });
}

// Initialize modals
function initModals() {
  // Add modal styles if they don't exist
  if (!document.querySelector('#modal-styles')) {
    const style = document.createElement('style');
    style.id = 'modal-styles';
    style.textContent = `
      .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
      }
      
      .modal-content {
        background: #1e1c2c;
        padding: 30px;
        border-radius: 15px;
        width: 90%;
        max-width: 800px;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        border: 1px solid rgba(106, 75, 255, 0.3);
      }
      
      .close-modal {
        position: absolute;
        top: 15px;
        right: 15px;
        font-size: 24px;
        cursor: pointer;
        color: #eee;
      }
      
      .modal h2 {
        margin-top: 0;
        text-align: center;
        color: #eee;
      }
      
      .modal-subtitle {
        text-align: center;
        color: #9b6aff;
        margin-top: -10px;
        margin-bottom: 20px;
      }
      
      .file-preview {
        background: rgba(0, 0, 0, 0.3);
        border-radius: 8px;
        padding: 0;
        margin-bottom: 20px;
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      .preview-header {
        padding: 15px;
        background: rgba(106, 75, 255, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .copy-btn {
        background: rgba(106, 75, 255, 0.2);
        color: #9b6aff;
        border: 1px solid #6a4bff;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }
      
      .copy-btn:hover {
        background: rgba(106, 75, 255, 0.3);
      }
      
      .preview-content {
        padding: 15px;
        overflow-y: auto;
        flex: 1;
        white-space: pre-wrap;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        line-height: 1.5;
        color: #eee;
      }
      
      .preview-stats {
        display: flex;
        justify-content: space-around;
        padding: 15px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 8px;
      }
      
      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        color: #9b6aff;
      }
      
      .stat i {
        font-size: 20px;
        margin-bottom: 5px;
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize FAQ toggles
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    
    if (question) {
      question.addEventListener('click', () => {
        item.classList.toggle('active');
      });
    }
  });
}

// Initialize mobile menu
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  
  if (hamburger && navLinks) {
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
  
  // Add styles if they don't exist
  if (!document.querySelector('#notification-styles')) {
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-width: 300px;
        z-index: 10000;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        transform: translateX(100%);
        animation: slideIn 0.3s forwards;
        backdrop-filter: blur(10px);
      }
      .notification-success { background: rgba(76, 175, 80, 0.9); }
      .notification-error { background: rgba(244, 67, 54, 0.9); }
      .notification-info { background: rgba(106, 75, 255, 0.9); }
      .notification button {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        margin-left: 15px;
      }
      @keyframes slideIn {
        to { transform: translateX(0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// Add progress bar styles
if (!document.querySelector('#progress-styles')) {
  const progressStyle = document.createElement('style');
  progressStyle.id = 'progress-styles';
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
    
    /* Enhanced upload area styles */
    .upload-area.dragover {
      background: rgba(106, 75, 255, 0.1) !important;
      border: 2px dashed var(--primary-light) !important;
      transform: scale(1.02) !important;
    }
    
    .upload-area.dragover .upload-icon i {
      color: var(--primary-light) !important;
      transform: scale(1.1);
    }
    
    .upload-area.dragover .upload-title {
      color: var(--primary-light) !important;
    }
    
    .remove-file {
      transition: all 0.3s ease;
    }
    
    .remove-file:hover {
      background: rgba(244, 67, 54, 0.3) !important;
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(progressStyle);
}
