// Global state
let personImage = null;
let topClothImage = null;
let bottomClothImage = null;
let dressImage = null;
let clothingMode = 'separate'; // 'separate' or 'dress'

// DOM elements - will be initialized after DOM loads
let personDropZone, topClothDropZone, bottomClothDropZone, dressDropZone;
let personFileInput, topClothFileInput, bottomClothFileInput, dressFileInput;
let generateBtn, loadingIndicator, resultsSection;
let downloadBtn, resetAllBtn;
let clothTypeButtons;

// Initialize everything after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing...');
    
    // Get DOM elements
    personDropZone = document.getElementById('personDropZone');
    topClothDropZone = document.getElementById('topClothDropZone');
    bottomClothDropZone = document.getElementById('bottomClothDropZone');
    dressDropZone = document.getElementById('dressDropZone');
    
    personFileInput = document.getElementById('personFileInput');
    topClothFileInput = document.getElementById('topClothFileInput');
    bottomClothFileInput = document.getElementById('bottomClothFileInput');
    dressFileInput = document.getElementById('dressFileInput');
    
    generateBtn = document.getElementById('generateBtn');
    loadingIndicator = document.getElementById('loadingIndicator');
    resultsSection = document.getElementById('resultsSection');
    downloadBtn = document.getElementById('downloadBtn');
    resetAllBtn = document.getElementById('resetAllBtn');
    
    clothTypeButtons = document.querySelectorAll('.cloth-type-btn');
    
    initializeApp();
});

function initializeApp() {
    console.log('Initializing app...');

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
    console.log('Setting up drop zones...');
    console.log('personDropZone:', personDropZone);
    console.log('topClothDropZone:', topClothDropZone);
    console.log('bottomClothDropZone:', bottomClothDropZone);
    console.log('dressDropZone:', dressDropZone);

    setupDropZone(personDropZone, personFileInput, 'person');
    setupDropZone(topClothDropZone, topClothFileInput, 'topCloth');
    setupDropZone(bottomClothDropZone, bottomClothFileInput, 'bottomCloth');
    setupDropZone(dressDropZone, dressFileInput, 'dress');

    console.log('Drop zones setup complete!');

    // Setup file inputs
    personFileInput.addEventListener('change', (e) => handleFileSelect(e, 'person'));
    topClothFileInput.addEventListener('change', (e) => handleFileSelect(e, 'topCloth'));
    bottomClothFileInput.addEventListener('change', (e) => handleFileSelect(e, 'bottomCloth'));
    dressFileInput.addEventListener('change', (e) => handleFileSelect(e, 'dress'));

    // Generate button
    generateBtn.addEventListener('click', () => generateFitting());

    // Download and reset
    downloadBtn.addEventListener('click', () => downloadResult());
    resetAllBtn.addEventListener('click', () => resetAll());
}

function setupDropZone(dropZone, fileInput, type) {
    console.log(`Setting up dropZone for ${type}:`, dropZone, fileInput);
    dropZone.addEventListener('click', () => {
        console.log(`Drop zone clicked for ${type}`);
        // Reset file input to allow selecting the same file again
        fileInput.value = '';
        fileInput.click();
    });
    
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
            
            let finalResultUrl = null;
            
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
                
                finalResultUrl = topData.resultUrl;
                
                // If bottom cloth also exists, use top result as input for bottom
                if (bottomClothImage) {
                    const topResultBlob = await fetch(topData.resultUrl).then(r => r.blob());
                    currentPersonImage = topResultBlob;
                }
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
                
                finalResultUrl = bottomData.resultUrl;
            }
            
            // Show final results (result only, no comparison)
            const resultImage = document.getElementById('resultImage');
            resultImage.src = finalResultUrl;
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth' });
            return;
            
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
            
            const resultImage = document.getElementById('resultImage');
            resultImage.src = dressData.resultUrl;
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
    const resultImage = document.getElementById('resultImage');
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = `ai-virtual-fitting-${Date.now()}.png`;
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
