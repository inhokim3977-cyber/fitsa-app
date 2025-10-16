// Global state
let userImage = null;
let clothingImage = null;
let currentEditingCanvas = null;
let rotation = 0;

// DOM elements
const userDropZone = document.getElementById('userDropZone');
const clothingDropZone = document.getElementById('clothingDropZone');
const userFileInput = document.getElementById('userFileInput');
const clothingFileInput = document.getElementById('clothingFileInput');
const userCanvas = document.getElementById('userCanvas');
const clothingCanvas = document.getElementById('clothingCanvas');
const generateBtn = document.getElementById('generateBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsSection = document.getElementById('resultsSection');
const canvasTools = document.getElementById('canvasTools');
const beforeImage = document.getElementById('beforeImage');
const afterImage = document.getElementById('afterImage');
const sliderInput = document.getElementById('sliderInput');
const downloadBtn = document.getElementById('downloadBtn');
const resetAllBtn = document.getElementById('resetAllBtn');

// Setup drop zones
setupDropZone(userDropZone, userFileInput, 'user');
setupDropZone(clothingDropZone, clothingFileInput, 'clothing');

// Setup file inputs
userFileInput.addEventListener('change', (e) => handleFileSelect(e, 'user'));
clothingFileInput.addEventListener('change', (e) => handleFileSelect(e, 'clothing'));

// Canvas tools
document.getElementById('rotateBtn').addEventListener('click', () => rotateImage());
document.getElementById('cropBtn').addEventListener('click', () => alert('크롭 기능은 곧 추가됩니다!'));
document.getElementById('resetBtn').addEventListener('click', () => resetCanvas());

// Generate button
generateBtn.addEventListener('click', () => generateFitting());

// Comparison slider
sliderInput.addEventListener('input', (e) => {
    const value = e.target.value;
    const afterDiv = document.querySelector('.comparison-after');
    afterDiv.style.clipPath = `inset(0 0 0 ${value}%)`;
});

// Download and reset
downloadBtn.addEventListener('click', () => downloadResult());
resetAllBtn.addEventListener('click', () => resetAll());

function setupDropZone(dropZone, fileInput, type) {
    dropZone.addEventListener('click', () => fileInput.click());
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFile(file, type);
        }
    });
}

function handleFileSelect(e, type) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file, type);
    }
}

function handleFile(file, type) {
    const canvas = type === 'user' ? userCanvas : clothingCanvas;
    const dropZone = type === 'user' ? userDropZone : clothingDropZone;
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
        img.src = e.target.result;
    };
    
    img.onload = () => {
        canvas.width = Math.min(img.width, 500);
        canvas.height = (img.height * canvas.width) / img.width;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.classList.remove('hidden');
        dropZone.classList.add('hidden');
        canvasTools.classList.remove('hidden');
        
        if (type === 'user') {
            userImage = file;
            currentEditingCanvas = userCanvas;
        } else {
            clothingImage = file;
            currentEditingCanvas = clothingCanvas;
        }
        
        checkCanGenerate();
    };
    
    reader.readAsDataURL(file);
}

function rotateImage() {
    if (!currentEditingCanvas) return;
    
    const ctx = currentEditingCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, currentEditingCanvas.width, currentEditingCanvas.height);
    
    rotation = (rotation + 90) % 360;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = currentEditingCanvas.height;
    tempCanvas.height = currentEditingCanvas.width;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
    tempCtx.rotate(Math.PI / 2);
    tempCtx.drawImage(currentEditingCanvas, -currentEditingCanvas.width / 2, -currentEditingCanvas.height / 2);
    
    currentEditingCanvas.width = tempCanvas.width;
    currentEditingCanvas.height = tempCanvas.height;
    ctx.drawImage(tempCanvas, 0, 0);
}

function resetCanvas() {
    rotation = 0;
    // Re-load original image
    if (currentEditingCanvas === userCanvas && userImage) {
        handleFile(userImage, 'user');
    } else if (currentEditingCanvas === clothingCanvas && clothingImage) {
        handleFile(clothingImage, 'clothing');
    }
}

function checkCanGenerate() {
    generateBtn.disabled = !(userImage && clothingImage);
}

async function generateFitting() {
    generateBtn.disabled = true;
    loadingIndicator.classList.remove('hidden');
    
    try {
        const formData = new FormData();
        
        // Convert canvas to blob
        const userBlob = await new Promise(resolve => userCanvas.toBlob(resolve, 'image/png'));
        const clothingBlob = await new Promise(resolve => clothingCanvas.toBlob(resolve, 'image/png'));
        
        formData.append('userPhoto', userBlob, 'user.png');
        formData.append('clothingPhoto', clothingBlob, 'clothing.png');
        
        // Add background removal option
        const removeBg = document.getElementById('removeBgCheckbox').checked;
        formData.append('removeBackground', removeBg.toString());
        
        const response = await fetch('/api/virtual-fitting', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.error) {
            alert('오류: ' + data.error);
            return;
        }
        
        // Show results
        beforeImage.src = userCanvas.toDataURL();
        afterImage.src = data.resultUrl;
        resultsSection.classList.remove('hidden');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        alert('피팅 생성 중 오류가 발생했습니다: ' + error.message);
    } finally {
        generateBtn.disabled = false;
        loadingIndicator.classList.add('hidden');
    }
}

function downloadResult() {
    const link = document.createElement('a');
    link.href = afterImage.src;
    link.download = `fashion-fitting-${Date.now()}.png`;
    link.click();
}

function resetAll() {
    userImage = null;
    clothingImage = null;
    currentEditingCanvas = null;
    rotation = 0;
    
    userCanvas.classList.add('hidden');
    clothingCanvas.classList.add('hidden');
    userDropZone.classList.remove('hidden');
    clothingDropZone.classList.remove('hidden');
    canvasTools.classList.add('hidden');
    resultsSection.classList.add('hidden');
    generateBtn.disabled = true;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
