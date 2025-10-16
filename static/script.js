// Global state
let personImage = null;
let hatImage = null;
let glassesImage = null;
let clothesImage = null;
let shoesImage = null;

// DOM elements
const personDropZone = document.getElementById('personDropZone');
const hatDropZone = document.getElementById('hatDropZone');
const glassesDropZone = document.getElementById('glassesDropZone');
const clothesDropZone = document.getElementById('clothesDropZone');
const shoesDropZone = document.getElementById('shoesDropZone');

const personFileInput = document.getElementById('personFileInput');
const hatFileInput = document.getElementById('hatFileInput');
const glassesFileInput = document.getElementById('glassesFileInput');
const clothesFileInput = document.getElementById('clothesFileInput');
const shoesFileInput = document.getElementById('shoesFileInput');

const generateBtn = document.getElementById('generateBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultsSection = document.getElementById('resultsSection');
const beforeImage = document.getElementById('beforeImage');
const afterImage = document.getElementById('afterImage');
const sliderInput = document.getElementById('sliderInput');
const downloadBtn = document.getElementById('downloadBtn');
const resetAllBtn = document.getElementById('resetAllBtn');

// Setup all drop zones
setupDropZone(personDropZone, personFileInput, 'person');
setupDropZone(hatDropZone, hatFileInput, 'hat');
setupDropZone(glassesDropZone, glassesFileInput, 'glasses');
setupDropZone(clothesDropZone, clothesFileInput, 'clothes');
setupDropZone(shoesDropZone, shoesFileInput, 'shoes');

// Setup file inputs
personFileInput.addEventListener('change', (e) => handleFileSelect(e, 'person'));
hatFileInput.addEventListener('change', (e) => handleFileSelect(e, 'hat'));
glassesFileInput.addEventListener('change', (e) => handleFileSelect(e, 'glasses'));
clothesFileInput.addEventListener('change', (e) => handleFileSelect(e, 'clothes'));
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
            case 'clothes':
                clothesImage = file;
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
    // Need person image and at least one item (preferably clothes)
    generateBtn.disabled = !(personImage && clothesImage);
}

async function generateFitting() {
    if (!personImage || !clothesImage) {
        alert('사람 사진과 옷 사진을 모두 업로드해주세요!');
        return;
    }
    
    generateBtn.disabled = true;
    loadingIndicator.classList.remove('hidden');
    
    try {
        const formData = new FormData();
        formData.append('userPhoto', personImage, 'person.png');
        formData.append('clothingPhoto', clothesImage, 'clothes.png');
        
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
    clothesImage = null;
    shoesImage = null;
    
    // Reset all previews
    ['person', 'hat', 'glasses', 'clothes', 'shoes'].forEach(type => {
        const preview = document.getElementById(`${type}Preview`);
        const placeholder = document.getElementById(`${type}Placeholder`);
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
    });
    
    resultsSection.classList.add('hidden');
    generateBtn.disabled = true;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
