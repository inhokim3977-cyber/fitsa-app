// Global state
let personImage = null;
let topClothImage = null;
let bottomClothImage = null;
let dressImage = null;
let clothingMode = 'separate'; // 'separate' or 'dress'

// DOM elements
const personDropZone = document.getElementById('personDropZone');
const topClothDropZone = document.getElementById('topClothDropZone');
const bottomClothDropZone = document.getElementById('bottomClothDropZone');
const dressDropZone = document.getElementById('dressDropZone');

const personFileInput = document.getElementById('personFileInput');
const topClothFileInput = document.getElementById('topClothFileInput');
const bottomClothFileInput = document.getElementById('bottomClothFileInput');
const dressFileInput = document.getElementById('dressFileInput');

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
setupDropZone(topClothDropZone, topClothFileInput, 'topCloth');
setupDropZone(bottomClothDropZone, bottomClothFileInput, 'bottomCloth');
setupDropZone(dressDropZone, dressFileInput, 'dress');

// Setup file inputs
personFileInput.addEventListener('change', (e) => handleFileSelect(e, 'person'));
topClothFileInput.addEventListener('change', (e) => handleFileSelect(e, 'topCloth'));
bottomClothFileInput.addEventListener('change', (e) => handleFileSelect(e, 'bottomCloth'));
dressFileInput.addEventListener('change', (e) => handleFileSelect(e, 'dress'));

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
        const deleteBtn = document.getElementById(`${type}DeleteBtn`);
        
        preview.src = imageUrl;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        if (deleteBtn) deleteBtn.classList.add('show');
        
        // Store the file
        switch(type) {
            case 'person':
                personImage = file;
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
        }
        
        checkCanGenerate();
    };
    
    reader.readAsDataURL(file);
}

function clearImage(type, event) {
    event.stopPropagation();
    
    const preview = document.getElementById(`${type}Preview`);
    const placeholder = document.getElementById(`${type}Placeholder`);
    const deleteBtn = document.getElementById(`${type}DeleteBtn`);
    const fileInput = document.getElementById(`${type}FileInput`);
    
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    if (deleteBtn) deleteBtn.classList.remove('show');
    if (fileInput) fileInput.value = '';
    
    // Clear the stored image
    switch(type) {
        case 'person':
            personImage = null;
            break;
        case 'topCloth':
            topClothImage = null;
            break;
        case 'bottomCloth':
            bottomClothImage = null;
            break;
        case 'dress':
            dressImage = null;
            break;
    }
    
    checkCanGenerate();
}

// Make clearImage available globally
window.clearImage = clearImage;

function checkCanGenerate() {
    // Need person image and at least one clothing item
    const hasAnyClothing = topClothImage || bottomClothImage || dressImage;
    generateBtn.disabled = !(personImage && hasAnyClothing);
}

async function generateFitting() {
    if (!personImage) {
        alert('사람 사진을 업로드해주세요!');
        return;
    }
    
    generateBtn.disabled = true;
    loadingIndicator.classList.remove('hidden');
    
    try {
        let currentPersonImage = personImage;
        const removeBg = document.getElementById('removeBgCheckbox').checked;
        
        if (clothingMode === 'separate') {
            if (!topClothImage && !bottomClothImage) {
                alert('상의 또는 하의를 업로드해주세요!');
                return;
            }
            
            // Process top cloth first (if available)
            if (topClothImage) {
                const topFormData = new FormData();
                topFormData.append('userPhoto', currentPersonImage, 'person.png');
                topFormData.append('clothingPhoto', topClothImage, 'top.png');
                topFormData.append('category', 'upper_body');
                topFormData.append('removeBackground', removeBg.toString());
                
                const topResponse = await fetch('/api/virtual-fitting', {
                    method: 'POST',
                    body: topFormData
                });
                
                const topData = await topResponse.json();
                if (topData.error) {
                    alert('상의 피팅 오류: ' + topData.error);
                    return;
                }
                
                // Convert result to blob for next step
                const topResultBlob = await fetch(topData.resultUrl).then(r => r.blob());
                currentPersonImage = topResultBlob;
            }
            
            // Process bottom cloth (if available)
            if (bottomClothImage) {
                const bottomFormData = new FormData();
                bottomFormData.append('userPhoto', currentPersonImage, 'person.png');
                bottomFormData.append('clothingPhoto', bottomClothImage, 'bottom.png');
                bottomFormData.append('category', 'lower_body');
                bottomFormData.append('removeBackground', removeBg.toString());
                
                const bottomResponse = await fetch('/api/virtual-fitting', {
                    method: 'POST',
                    body: bottomFormData
                });
                
                const bottomData = await bottomResponse.json();
                if (bottomData.error) {
                    alert('하의 피팅 오류: ' + bottomData.error);
                    return;
                }
                
                // Show final results
                const personPreview = document.getElementById('personPreview');
                beforeImage.src = personPreview.src;
                afterImage.src = bottomData.resultUrl;
                resultsSection.classList.remove('hidden');
                resultsSection.scrollIntoView({ behavior: 'smooth' });
                return;
            }
            
            // Only top was processed
            if (topClothImage) {
                const personPreview = document.getElementById('personPreview');
                beforeImage.src = personPreview.src;
                const topResultUrl = URL.createObjectURL(currentPersonImage);
                afterImage.src = topResultUrl;
                resultsSection.classList.remove('hidden');
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            }
            
        } else {
            // Dress mode
            if (!dressImage) {
                alert('원피스 사진을 업로드해주세요!');
                return;
            }
            
            const dressFormData = new FormData();
            dressFormData.append('userPhoto', currentPersonImage, 'person.png');
            dressFormData.append('clothingPhoto', dressImage, 'dress.png');
            dressFormData.append('category', 'dress');
            dressFormData.append('removeBackground', removeBg.toString());
            
            const dressResponse = await fetch('/api/virtual-fitting', {
                method: 'POST',
                body: dressFormData
            });
            
            const dressData = await dressResponse.json();
            if (dressData.error) {
                alert('원피스 피팅 오류: ' + dressData.error);
                return;
            }
            
            const personPreview = document.getElementById('personPreview');
            beforeImage.src = personPreview.src;
            afterImage.src = dressData.resultUrl;
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
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
