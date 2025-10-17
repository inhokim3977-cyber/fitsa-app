// Global state
let personImage = null;
let hatImage = null;
let glassesImage = null;
let topClothImage = null;
let bottomClothImage = null;
let dressImage = null;
let shoesImage = null;
let clothingMode = 'separate'; // 'separate' or 'dress'

// DOM elements
const personDropZone = document.getElementById('personDropZone');
const hatDropZone = document.getElementById('hatDropZone');
const glassesDropZone = document.getElementById('glassesDropZone');
const topClothDropZone = document.getElementById('topClothDropZone');
const bottomClothDropZone = document.getElementById('bottomClothDropZone');
const dressDropZone = document.getElementById('dressDropZone');
const shoesDropZone = document.getElementById('shoesDropZone');

const personFileInput = document.getElementById('personFileInput');
const hatFileInput = document.getElementById('hatFileInput');
const glassesFileInput = document.getElementById('glassesFileInput');
const topClothFileInput = document.getElementById('topClothFileInput');
const bottomClothFileInput = document.getElementById('bottomClothFileInput');
const dressFileInput = document.getElementById('dressFileInput');
const shoesFileInput = document.getElementById('shoesFileInput');

const generateBtn = document.getElementById('generateBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsSection = document.getElementById('resultsSection');
const beforeImage = document.getElementById('beforeImage');
const afterImage = document.getElementById('afterImage');
const sliderInput = document.getElementById('sliderInput');
const downloadBtn = document.getElementById('downloadBtn');
const resetAllBtn = document.getElementById('resetAllBtn');

// Clothing type buttons
const clothTypeButtons = document.querySelectorAll('.cloth-type-btn');

// Setup clothing type switching
clothTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-type');
        switchClothingMode(type);
        
        // Update active state
        clothTypeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

function switchClothingMode(mode) {
    clothingMode = mode;
    
    if (mode === 'separate') {
        // Show top and bottom cloth zones
        topClothDropZone.classList.remove('hidden');
        topClothDropZone.style.display = 'flex';
        bottomClothDropZone.classList.remove('hidden');
        bottomClothDropZone.style.display = 'flex';
        
        // Hide dress zone
        dressDropZone.classList.add('hidden');
        dressDropZone.style.display = 'none';
    } else {
        // Hide top and bottom cloth zones
        topClothDropZone.classList.add('hidden');
        topClothDropZone.style.display = 'none';
        bottomClothDropZone.classList.add('hidden');
        bottomClothDropZone.style.display = 'none';
        
        // Show dress zone
        dressDropZone.classList.remove('hidden');
        dressDropZone.style.display = 'flex';
    }
    
    checkCanGenerate();
}

// Setup all drop zones
setupDropZone(personDropZone, personFileInput, 'person');
setupDropZone(hatDropZone, hatFileInput, 'hat');
setupDropZone(glassesDropZone, glassesFileInput, 'glasses');
setupDropZone(topClothDropZone, topClothFileInput, 'topCloth');
setupDropZone(bottomClothDropZone, bottomClothFileInput, 'bottomCloth');
setupDropZone(dressDropZone, dressFileInput, 'dress');
setupDropZone(shoesDropZone, shoesFileInput, 'shoes');

// Setup file inputs
personFileInput.addEventListener('change', (e) => handleFileSelect(e, 'person'));
hatFileInput.addEventListener('change', (e) => handleFileSelect(e, 'hat'));
glassesFileInput.addEventListener('change', (e) => handleFileSelect(e, 'glasses'));
topClothFileInput.addEventListener('change', (e) => handleFileSelect(e, 'topCloth'));
bottomClothFileInput.addEventListener('change', (e) => handleFileSelect(e, 'bottomCloth'));
dressFileInput.addEventListener('change', (e) => handleFileSelect(e, 'dress'));
shoesFileInput.addEventListener('change', (e) => handleFileSelect(e, 'shoes'));

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
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const imageUrl = e.target.result;
        const preview = document.getElementById(`${type}Preview`);
        const placeholder = document.getElementById(`${type}Placeholder`);
        
        preview.src = imageUrl;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        
        // Store the file
        switch(type) {
            case 'person':
                personImage = file;
                break;
            case 'hat':
                hatImage = file;
                break;
            case 'glasses':
                glassesImage = file;
                break;
            case 'topCloth':
                topClothImage = file;
                break;
            case 'bottomCloth':
                bottomClothImage = file;
                break;
            case 'dress':
                dressImage = file;
                break;
            case 'shoes':
                shoesImage = file;
                break;
        }
        
        checkCanGenerate();
    };
    
    reader.readAsDataURL(file);
}

function checkCanGenerate() {
    // Need person image and clothing based on mode
    if (clothingMode === 'separate') {
        // Need at least top or bottom cloth
        generateBtn.disabled = !(personImage && (topClothImage || bottomClothImage));
    } else {
        // Need dress
        generateBtn.disabled = !(personImage && dressImage);
    }
}

async function generateFitting() {
    if (!personImage) {
        alert('사람 사진을 업로드해주세요!');
        return;
    }
    
    let clothingPhoto = null;
    
    if (clothingMode === 'separate') {
        if (!topClothImage && !bottomClothImage) {
            alert('상의 또는 하의를 업로드해주세요!');
            return;
        }
        // Use top cloth if available, otherwise bottom cloth
        clothingPhoto = topClothImage || bottomClothImage;
    } else {
        if (!dressImage) {
            alert('원피스 사진을 업로드해주세요!');
            return;
        }
        clothingPhoto = dressImage;
    }
    
    generateBtn.disabled = true;
    loadingIndicator.classList.remove('hidden');
    
    try {
        const formData = new FormData();
        formData.append('userPhoto', personImage, 'person.png');
        formData.append('clothingPhoto', clothingPhoto, 'clothes.png');
        
        // Add background removal option
        const removeBg = document.getElementById('removeBgCheckbox').checked;
        formData.append('removeBackground', removeBg.toString());
        
        const response = await fetch('/api/virtual-fitting', {
            method: 'POST',
            body: formData
        });
        
        // Check if response is JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.error('Non-JSON response:', text.substring(0, 500));
            alert('서버 오류가 발생했습니다. 콘솔을 확인하세요.');
            return;
        }
        
        const data = await response.json();
        
        if (data.error) {
            alert('오류: ' + data.error);
            return;
        }
        
        // Show results
        const personPreview = document.getElementById('personPreview');
        beforeImage.src = personPreview.src;
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
    link.download = `ai-fashion-fitting-${Date.now()}.png`;
    link.click();
}

function resetAll() {
    // Clear all images
    personImage = null;
    hatImage = null;
    glassesImage = null;
    topClothImage = null;
    bottomClothImage = null;
    dressImage = null;
    shoesImage = null;
    
    // Reset all previews
    ['person', 'hat', 'glasses', 'topCloth', 'bottomCloth', 'dress', 'shoes'].forEach(type => {
        const preview = document.getElementById(`${type}Preview`);
        const placeholder = document.getElementById(`${type}Placeholder`);
        if (preview && placeholder) {
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    });
    
    resultsSection.classList.add('hidden');
    generateBtn.disabled = true;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
