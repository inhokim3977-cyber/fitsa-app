// ============================================
// BUTTON HELPER: setLoading
// ============================================

/**
 * Toggle loading state on a button
 * @param {HTMLElement} btnEl - Button element
 * @param {boolean} isLoading - Loading state
 */
window.setLoading = function(btnEl, isLoading) {
    if (!btnEl) {
        console.error('setLoading: Button element is required');
        return;
    }
    
    if (isLoading) {
        // Store original content
        if (!btnEl.dataset.originalContent) {
            btnEl.dataset.originalContent = btnEl.innerHTML;
        }
        
        // Add loading class and spinner
        btnEl.classList.add('loading');
        btnEl.disabled = true;
        
        // Create spinner if not exists
        if (!btnEl.querySelector('.spinner')) {
            const spinner = document.createElement('span');
            spinner.className = 'spinner';
            btnEl.insertBefore(spinner, btnEl.firstChild);
        }
    } else {
        // Remove loading class
        btnEl.classList.remove('loading');
        btnEl.disabled = false;
        
        // Restore original content if available
        if (btnEl.dataset.originalContent) {
            btnEl.innerHTML = btnEl.dataset.originalContent;
            delete btnEl.dataset.originalContent;
        } else {
            // Just remove spinner if no original content stored
            const spinner = btnEl.querySelector('.spinner');
            if (spinner) {
                spinner.remove();
            }
        }
    }
};

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Change app state and update UI accordingly
 * @param {string} nextState - One of: 'empty', 'uploaded', 'processing', 'completed'
 */
function setState(nextState) {
    console.log(`🔄 State transition: ${appState} → ${nextState}`);
    appState = nextState;
    renderButtons();
}

/**
 * Render buttons based on current appState
 */
function renderButtons() {
    if (!buttonContainer) {
        console.warn('buttonContainer not initialized yet');
        return;
    }
    
    console.log(`🎨 Rendering buttons for state: ${appState}`);
    
    // Hide all buttons first
    if (generateBtn) generateBtn.classList.add('hidden');
    if (generateSection) generateSection.classList.add('hidden');
    if (loadingIndicator) loadingIndicator.classList.add('hidden');
    if (buttonContainer) buttonContainer.classList.add('hidden');
    if (resultsSection) resultsSection.classList.add('hidden');
    
    switch (appState) {
        case 'empty':
            // Only show upload interface (already visible in HTML)
            if (emptyStateGuide) emptyStateGuide.classList.remove('hidden');
            if (clothingTypeSelection) clothingTypeSelection.classList.add('hidden');
            break;
            
        case 'uploaded':
            // Show category selection and "입어보기" button
            if (emptyStateGuide) emptyStateGuide.classList.add('hidden');
            if (clothingTypeSelection) clothingTypeSelection.classList.remove('hidden');
            if (generateSection) generateSection.classList.remove('hidden');
            if (generateBtn) {
                generateBtn.classList.remove('hidden');
                generateBtn.disabled = false;
            }
            break;
            
        case 'processing':
            // Show only loading spinner
            if (generateSection) generateSection.classList.remove('hidden');
            if (generateBtn) generateBtn.classList.add('hidden');
            if (loadingIndicator) loadingIndicator.classList.remove('hidden');
            break;
            
        case 'completed':
            // Show result image + 3 action buttons only
            if (resultsSection) resultsSection.classList.remove('hidden');
            if (buttonContainer) {
                buttonContainer.classList.remove('hidden');
                buttonContainer.innerHTML = `
                    <div class="btn-group-center">
                        <button id="refitBtn" class="btn btn-secondary btn-lg" data-testid="button-refit">
                            <svg style="width: 20px; height: 20px; margin-right: 8px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            다시 입어보기
                        </button>
                        <button id="saveBtn" class="btn btn-primary btn-lg" data-testid="button-save">
                            <svg style="width: 20px; height: 20px; margin-right: 8px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                            </svg>
                            저장하기
                        </button>
                        <button id="downloadBtn" class="btn btn-secondary btn-lg" data-testid="button-download">
                            <svg style="width: 20px; height: 20px; margin-right: 8px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            다운로드
                        </button>
                        <button id="shareBtn" class="btn btn-outline btn-lg" data-testid="button-share">
                            <svg style="width: 20px; height: 20px; margin-right: 8px;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            공유하기
                        </button>
                    </div>
                `;
                
                // Re-attach event listeners
                document.getElementById('refitBtn').addEventListener('click', refitCurrentPhotos);
                document.getElementById('saveBtn').addEventListener('click', openSaveFitModal);
                document.getElementById('downloadBtn').addEventListener('click', downloadResult);
                document.getElementById('shareBtn').addEventListener('click', shareResult);
            }
            
            // Show success toast after 300ms
            setTimeout(() => {
                showToast('✨ 피팅 결과가 완성되었습니다!', 'success');
            }, 300);
            break;
    }
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - 'success' | 'error' | 'info'
 */
function showToast(message, type = 'info') {
    // Create toast element if not exists
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.style.cssText = `
        background: ${type === 'success' ? 'var(--gold)' : type === 'error' ? '#B00020' : 'var(--wood-brown)'};
        color: ${type === 'success' ? 'var(--primary-green)' : '#fff'};
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        font-weight: 600;
        font-size: 15px;
        animation: slideInRight 0.3s ease-out;
        max-width: 320px;
    `;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// GLOBAL STATE
// ============================================

// App state machine: empty → uploaded → processing → completed
let appState = 'empty'; // Current UI state

// Global state
let personImage = null;
let topClothImage = null;
let bottomClothImage = null;
let dressImage = null;
let clothingMode = 'separate'; // 'separate' or 'dress'
let imageLoaded = false; // Track if person image is uploaded

// DOM elements - will be initialized after DOM loads
let personDropZone, topClothDropZone, bottomClothDropZone, dressDropZone;
let personFileInput, topClothFileInput, bottomClothFileInput, dressFileInput;
let generateBtn, loadingIndicator, resultsSection;
let downloadBtn, resetAllBtn, shareBtn, refitBtn;
let clothTypeButtons;
let emptyStateGuide, clothingTypeSelection, generateSection;
let buttonContainer; // Single container for all action buttons

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
    shareBtn = document.getElementById('shareBtn');
    refitBtn = document.getElementById('refitBtn');
    buttonContainer = document.getElementById('actionButtons');
    
    clothTypeButtons = document.querySelectorAll('.cloth-type-btn');
    
    // Empty state and progressive disclosure elements
    emptyStateGuide = document.getElementById('emptyStateGuide');
    clothingTypeSelection = document.getElementById('clothingTypeSelection');
    generateSection = document.getElementById('generateSection');
    
    initializeApp();
});

function initializeApp() {
    console.log('Initializing app...');

    // Fetch initial credit status
    fetchCreditStatus();

    // Setup buy credits button
    const buyCreditsBtn = document.getElementById('buyCreditsBtn');
    buyCreditsBtn.addEventListener('click', () => purchaseCredits());

    // Setup clothing type switching
    clothTypeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            switchClothingMode(type);
            
            // Update active state with new button system
            clothTypeButtons.forEach(b => {
                b.classList.remove('active');
                b.classList.remove('btn-primary');
                b.classList.add('btn-secondary');
            });
            btn.classList.add('active');
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
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

    // Note: Button event listeners are now handled in renderButtons()
    // No need to attach listeners here since buttons are dynamically created
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
                imageLoaded = true; // Update imageLoaded state
                setState('uploaded'); // Transition to uploaded state
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
            imageLoaded = false; // Update imageLoaded state
            setState('empty'); // Transition back to empty state
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

// Update UI based on imageLoaded state
function updateUIState() {
    if (imageLoaded) {
        // Hide empty state guide
        if (emptyStateGuide) {
            emptyStateGuide.classList.add('hidden');
        }
        
        // Show clothing type selection
        if (clothingTypeSelection) {
            clothingTypeSelection.classList.remove('hidden');
        }
        
        // Show generate section
        if (generateSection) {
            generateSection.classList.remove('hidden');
        }
    } else {
        // Show empty state guide
        if (emptyStateGuide) {
            emptyStateGuide.classList.remove('hidden');
        }
        
        // Hide clothing type selection
        if (clothingTypeSelection) {
            clothingTypeSelection.classList.add('hidden');
        }
        
        // Hide generate section
        if (generateSection) {
            generateSection.classList.add('hidden');
        }
    }
}

async function generateFitting() {
    if (!personImage) {
        alert('사람 사진을 업로드해주세요!');
        return;
    }
    
    // Transition to processing state
    setState('processing');
    
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
                
                // Add timeout to prevent infinite loading
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout
                
                const topResponse = await fetch('/api/virtual-fitting', {
                    method: 'POST',
                    body: topFormData,
                    signal: controller.signal
                }).finally(() => clearTimeout(timeoutId));
                
                // Handle error responses - read text first to avoid consuming body
                const topResponseText = await topResponse.text();
                
                if (!topResponse.ok) {
                    let errorMsg = '서버 오류가 발생했습니다.';
                    try {
                        const errorData = JSON.parse(topResponseText);
                        errorMsg = errorData.message || errorData.error || errorMsg;
                        
                        if (topResponse.status === 402) {
                            alert(errorData.message || '크레딧이 부족합니다. 크레딧을 구매해주세요.');
                            updateCreditsDisplay(errorData.remaining_free, errorData.credits);
                            return;
                        }
                        
                        if (topResponse.status === 429) {
                            alert(errorData.message || '재피팅 한도 초과: 1시간 내 최대 5회까지 가능합니다.');
                            return;
                        }
                    } catch (parseError) {
                        // If response is not JSON (e.g., rate limit error from Gemini)
                        console.error('Non-JSON error response:', topResponseText);
                        errorMsg = '피팅 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                    }
                    alert(errorMsg);
                    return;
                }
                
                let topData;
                try {
                    topData = JSON.parse(topResponseText);
                } catch (parseError) {
                    console.error('피팅 생성 중 오류가 발생했습니다:', topResponseText);
                    alert(`피팅 생성 중 오류가 발생했습니다: ${topResponseText.substring(0, 100)}`);
                    return;
                }
                
                if (topData.error) {
                    alert('상의 피팅 오류: ' + topData.error);
                    return;
                }
                
                // Update credits display after successful generation
                console.log('📊 Top data response:', topData);
                if (topData.credits_info) {
                    console.log('📊 Top credits info:', topData.credits_info);
                    updateCreditsDisplay(topData.credits_info.remaining_free, topData.credits_info.credits);
                    
                    // Update refit counter
                    console.log('🔢 Updating refit counter (TOP) - is_refitting:', topData.credits_info.is_refitting, 'count:', topData.credits_info.refit_count);
                    updateRefitCounter(topData.credits_info.is_refitting, topData.credits_info.refit_count || 0);
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
                
                // Add timeout to prevent infinite loading
                const controller2 = new AbortController();
                const timeoutId2 = setTimeout(() => controller2.abort(), 120000); // 120 seconds timeout
                
                const bottomResponse = await fetch('/api/virtual-fitting', {
                    method: 'POST',
                    body: bottomFormData,
                    signal: controller2.signal
                }).finally(() => clearTimeout(timeoutId2));
                
                // Handle error responses - read text first to avoid consuming body
                const bottomResponseText = await bottomResponse.text();
                
                if (!bottomResponse.ok) {
                    let errorMsg = '서버 오류가 발생했습니다.';
                    try {
                        const errorData = JSON.parse(bottomResponseText);
                        errorMsg = errorData.message || errorData.error || errorMsg;
                        
                        if (bottomResponse.status === 402) {
                            alert(errorData.message || '크레딧이 부족합니다. 크레딧을 구매해주세요.');
                            updateCreditsDisplay(errorData.remaining_free, errorData.credits);
                            return;
                        }
                        
                        if (bottomResponse.status === 429) {
                            alert(errorData.message || '재피팅 한도 초과: 1시간 내 최대 5회까지 가능합니다.');
                            return;
                        }
                    } catch (parseError) {
                        // If response is not JSON (e.g., rate limit error from Gemini)
                        console.error('Non-JSON error response:', bottomResponseText);
                        errorMsg = '피팅 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                    }
                    alert(errorMsg);
                    return;
                }
                
                let bottomData;
                try {
                    bottomData = JSON.parse(bottomResponseText);
                } catch (parseError) {
                    console.error('피팅 생성 중 오류가 발생했습니다:', bottomResponseText);
                    alert(`피팅 생성 중 오류가 발생했습니다: ${bottomResponseText.substring(0, 100)}`);
                    return;
                }
                
                if (bottomData.error) {
                    alert('하의 피팅 오류: ' + bottomData.error);
                    return;
                }
                
                // Update credits display after successful generation
                console.log('📊 Bottom data response:', bottomData);
                if (bottomData.credits_info) {
                    console.log('📊 Bottom credits info:', bottomData.credits_info);
                    updateCreditsDisplay(bottomData.credits_info.remaining_free, bottomData.credits_info.credits);
                    
                    // Update refit counter
                    console.log('🔢 Updating refit counter (BOTTOM) - is_refitting:', bottomData.credits_info.is_refitting, 'count:', bottomData.credits_info.refit_count);
                    updateRefitCounter(bottomData.credits_info.is_refitting, bottomData.credits_info.refit_count || 0);
                }
                
                finalResultUrl = bottomData.resultUrl;
            }
            
            // Show final results (result only, no comparison)
            const resultImage = document.getElementById('resultImage');
            resultImage.src = finalResultUrl;
            setState('completed'); // Transition to completed state
            setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth' }), 100);
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
            
            // Add timeout to prevent infinite loading
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout
            
            const dressResponse = await fetch('/api/virtual-fitting', {
                method: 'POST',
                body: dressFormData,
                signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));
            
            // Handle error responses - read text first to avoid consuming body
            const dressResponseText = await dressResponse.text();
            
            if (!dressResponse.ok) {
                let errorMsg = '서버 오류가 발생했습니다.';
                try {
                    const errorData = JSON.parse(dressResponseText);
                    errorMsg = errorData.message || errorData.error || errorMsg;
                    
                    if (dressResponse.status === 402) {
                        alert(errorData.message || '크레딧이 부족합니다. 크레딧을 구매해주세요.');
                        updateCreditsDisplay(errorData.remaining_free, errorData.credits);
                        return;
                    }
                    
                    if (dressResponse.status === 429) {
                        alert(errorData.message || '재피팅 한도 초과: 1시간 내 최대 5회까지 가능합니다.');
                        return;
                    }
                } catch (parseError) {
                    // If response is not JSON (e.g., rate limit error from Gemini)
                    console.error('Non-JSON error response:', dressResponseText);
                    errorMsg = '피팅 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                }
                alert(errorMsg);
                return;
            }
            
            let dressData;
            try {
                dressData = JSON.parse(dressResponseText);
            } catch (parseError) {
                console.error('피팅 생성 중 오류가 발생했습니다:', dressResponseText);
                alert(`피팅 생성 중 오류가 발생했습니다: ${dressResponseText.substring(0, 100)}`);
                return;
            }
            
            if (dressData.error) {
                alert('원피스 피팅 오류: ' + dressData.error);
                return;
            }
            
            // Update credits display after successful generation
            console.log('📊 Dress response received:', dressData);
            if (dressData.credits_info) {
                console.log('📊 Credits info:', dressData.credits_info);
                console.log('📊 Refit count value:', dressData.credits_info.refit_count);
                console.log('📊 Is refitting:', dressData.credits_info.is_refitting);
                
                updateCreditsDisplay(dressData.credits_info.remaining_free, dressData.credits_info.credits);
                
                // Update refit counter with explicit values
                const refitCount = dressData.credits_info.refit_count || 0;
                const isRefitting = dressData.credits_info.is_refitting || false;
                console.log('🔢 Calling updateRefitCounter with:', isRefitting, refitCount);
                updateRefitCounter(isRefitting, refitCount);
                console.log('✅ updateRefitCounter called successfully');
            } else {
                console.warn('⚠️ No credits_info in response!');
            }
            
            const resultImage = document.getElementById('resultImage');
            resultImage.src = dressData.resultUrl;
            setState('completed'); // Transition to completed state
            setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth' }), 100);
        }
        
    } catch (error) {
        console.error('Error:', error);
        setState('uploaded'); // Return to uploaded state on error
        if (error.name === 'AbortError') {
            alert('⏱️ 요청 시간이 초과되었습니다 (120초). Gemini API가 응답하지 않습니다. 다시 시도해주세요.');
        } else {
            alert('피팅 생성 중 오류가 발생했습니다: ' + error.message);
        }
    }
}

function refitCurrentPhotos() {
    // Simply call generateFitting again with the same photos
    // The backend will detect it's a refitting (same photo hash) and won't charge
    console.log('🔄 Refitting with same photos (no charge)...');
    generateFitting();
}

// Expose to window for onclick fallback
window.refitCurrentPhotos = refitCurrentPhotos;

function downloadResult() {
    const resultImage = document.getElementById('resultImage');
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = `가상피팅-${Date.now()}.png`;
    link.click();
}

async function shareResult() {
    const resultImage = document.getElementById('resultImage');
    
    try {
        // Try Web Share API first (works on mobile)
        if (navigator.share && navigator.canShare) {
            // Convert base64 to blob
            const response = await fetch(resultImage.src);
            const blob = await response.blob();
            const file = new File([blob], '가상피팅.png', { type: 'image/png' });
            
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: '가상 피팅 결과',
                    text: '나의 가상 피팅 결과를 확인해보세요!'
                });
                return;
            }
        }
        
        // Fallback: Copy image to clipboard (desktop)
        const response = await fetch(resultImage.src);
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ]);
        
        // Show success message
        alert('이미지가 클립보드에 복사되었습니다!\n원하는 곳에 붙여넣기(Ctrl+V)하세요.');
    } catch (error) {
        console.error('Share failed:', error);
        // Final fallback: Download
        downloadResult();
    }
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
    
    // Reset refit counter
    document.getElementById('refitCount').textContent = '5';
    const refitBadge = document.getElementById('refitBadge');
    if (refitBadge) {
        refitBadge.className = 'px-4 py-2 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200';
    }
    const refitBtn = document.getElementById('refitBtn');
    if (refitBtn) {
        refitBtn.disabled = false;
        refitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    // Remove limit message if exists
    const limitMsg = document.getElementById('refitLimitMessage');
    if (limitMsg) limitMsg.remove();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Monetization functions
async function fetchCreditStatus() {
    try {
        console.log('Fetching credit status...');
        const response = await fetch('/stripe/user-status');
        const data = await response.json();
        console.log('Credit status response:', data);
        
        updateCreditsDisplay(data.remaining_free, data.credits);
    } catch (error) {
        console.error('Failed to fetch credit status:', error);
    }
}

function updateCreditsDisplay(remainingFree, credits) {
    document.getElementById('freeRemaining').textContent = remainingFree;
    document.getElementById('creditsCount').textContent = credits;
    
    // Show buy button if no credits left
    const buyBtn = document.getElementById('buyCreditsBtn');
    if (remainingFree === 0 && credits === 0) {
        buyBtn.classList.remove('hidden');
    } else {
        buyBtn.classList.add('hidden');
    }
}

function updateRefitCounter(isRefitting, refitCount) {
    console.log('🔄 updateRefitCounter STARTED - isRefitting:', isRefitting, 'refitCount:', refitCount);
    
    const refitCountSpan = document.getElementById('refitCount');
    const refitBadge = document.getElementById('refitBadge');
    const refitBtn = document.getElementById('refitBtn');
    
    console.log('🔍 DOM elements found:', {
        refitCountSpan: refitCountSpan ? 'YES' : 'NO',
        refitBadge: refitBadge ? 'YES' : 'NO',
        refitBtn: refitBtn ? 'YES' : 'NO'
    });
    
    if (!refitCountSpan || !refitBadge) {
        console.error('❌ Refit counter elements not found!');
        return;
    }
    
    // Calculate remaining tries (5 - used)
    const remaining = Math.max(0, 5 - refitCount);
    
    // Update counter text
    refitCountSpan.textContent = remaining.toString();
    console.log('✅ Counter updated - remaining:', remaining, '(used:', refitCount, ')');
    
    // Update badge color based on remaining tries
    // Remove all color classes first
    refitBadge.className = 'px-4 py-2 rounded-full text-sm font-medium transition-all';
    
    if (remaining >= 4) {
        // Green: 5-4 remaining
        refitBadge.classList.add('bg-green-50', 'text-green-700', 'border', 'border-green-200');
    } else if (remaining >= 2) {
        // Yellow: 3-2 remaining
        refitBadge.classList.add('bg-yellow-50', 'text-yellow-700', 'border', 'border-yellow-200');
    } else {
        // Red: 1-0 remaining
        refitBadge.classList.add('bg-red-50', 'text-red-700', 'border', 'border-red-200');
    }
    
    // Handle 0 remaining (limit reached)
    if (remaining === 0) {
        if (refitBtn) {
            refitBtn.disabled = true;
            refitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        // Show limit reached message
        showRefitLimitMessage();
        console.log('🚫 Refit limit reached (5/5 used)');
    } else {
        if (refitBtn) {
            refitBtn.disabled = false;
            refitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        console.log('✅ Refit button ENABLED (remaining:', remaining, ')');
    }
    
    console.log('🔄 updateRefitCounter COMPLETED');
}

function showRefitLimitMessage() {
    // Check if message already exists
    if (document.getElementById('refitLimitMessage')) return;
    
    const refitCounter = document.getElementById('refitCounter');
    const message = document.createElement('div');
    message.id = 'refitLimitMessage';
    message.className = 'mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800';
    message.innerHTML = `
        <p class="font-semibold mb-2">재피팅 한도에 도달했어요!</p>
        <p class="text-xs opacity-90">
            • 1시간 후 다시 무료로 재시도하거나<br>
            • 지금 다른 옷으로 새 피팅을 해보세요 (크레딧 1회 사용)
        </p>
    `;
    
    refitCounter.parentElement.appendChild(message);
}

async function purchaseCredits() {
    try {
        const response = await fetch('/stripe/create-checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.url) {
            // Open Stripe Checkout in a new tab (iframe blocks it)
            const stripeWindow = window.open(data.url, '_blank');
            if (!stripeWindow) {
                alert('❌ 팝업이 차단되었습니다. 브라우저 설정에서 팝업 허용을 활성화해주세요.\n\n또는 아래 링크를 복사해서 새 탭에서 열어주세요:\n' + data.url);
            } else {
                alert('💳 Stripe 결제 페이지가 새 탭에서 열렸습니다. 결제 완료 후 이 페이지로 돌아와주세요!');
            }
        } else {
            alert('결제 세션 생성에 실패했습니다.');
        }
    } catch (error) {
        alert('결제 처리 중 오류가 발생했습니다: ' + error.message);
    }
}

// Test tools
async function testResetCredits() {
    try {
        const response = await fetch('/stripe/reset-credits', { method: 'POST' });
        const data = await response.json();
        alert('✅ ' + data.message);
        // Refresh page to update credits display
        location.reload();
    } catch (error) {
        alert('❌ 오류: ' + error.message);
    }
}

async function testAddCredits() {
    try {
        const response = await fetch('/stripe/simulate-purchase', { method: 'POST' });
        const data = await response.json();
        alert(`✅ 10 크레딧이 추가되었습니다!\n\n새 잔액: ${data.new_balance.credits} 크레딧`);
        // Refresh page to update credits display
        location.reload();
    } catch (error) {
        alert('❌ 오류: ' + error.message);
    }
}

// Clear cookie and reload (for testing)
function testClearCookie() {
    document.cookie = 'user_key=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    alert('✅ 쿠키가 삭제되었습니다. 페이지를 새로고침합니다.');
    location.reload();
}

// ============================================
// SAVED FITS (WARDROBE) FUNCTIONALITY
// ============================================

let currentPage = 1;
let currentSearchQuery = '';

// Navigation functions
function navigateToWardrobe() {
    // Hide main sections
    document.querySelector('.upload-area-container')?.closest('.flex').classList.add('hidden');
    document.getElementById('generateSection')?.classList.add('hidden');
    document.getElementById('resultsSection')?.classList.add('hidden');
    document.getElementById('clothingTypeSelection')?.classList.add('hidden');
    document.getElementById('emptyStateGuide')?.classList.add('hidden');
    document.getElementById('btn-preview')?.classList.add('hidden');
    
    // Show wardrobe section
    document.getElementById('savedFitsSection')?.classList.remove('hidden');
    document.getElementById('wardrobeNavBtn')?.classList.add('hidden');
    
    // Load saved fits
    loadSavedFits(1);
}

function navigateToMain() {
    // Show main sections
    document.querySelector('.upload-area-container')?.closest('.flex').classList.remove('hidden');
    document.getElementById('btn-preview')?.classList.remove('hidden');
    
    // Show appropriate sections based on state
    if (appState === 'empty') {
        document.getElementById('emptyStateGuide')?.classList.remove('hidden');
    } else if (appState === 'uploaded') {
        document.getElementById('clothingTypeSelection')?.classList.remove('hidden');
        document.getElementById('generateSection')?.classList.remove('hidden');
    } else if (appState === 'completed') {
        document.getElementById('resultsSection')?.classList.remove('hidden');
    }
    
    // Hide wardrobe section
    document.getElementById('savedFitsSection')?.classList.add('hidden');
    document.getElementById('wardrobeNavBtn')?.classList.remove('hidden');
}

// Save fit modal functions
function openSaveFitModal() {
    const modal = document.getElementById('saveFitModal');
    const resultImage = document.getElementById('resultImage');
    
    if (!resultImage || !resultImage.src) {
        showToast('저장할 결과 이미지가 없습니다', 'error');
        return;
    }
    
    // Store current result image URL in modal
    modal.dataset.resultImageUrl = resultImage.src;
    
    // Reset form
    document.getElementById('saveFitForm').reset();
    
    // Show modal
    modal.style.display = 'flex';
    modal.classList.remove('hidden');
}

function closeSaveFitModal() {
    const modal = document.getElementById('saveFitModal');
    modal.style.display = 'none';
    modal.classList.add('hidden');
}

async function handleSaveFitSubmit(e) {
    e.preventDefault();
    
    const modal = document.getElementById('saveFitModal');
    const resultImageUrl = modal.dataset.resultImageUrl;
    
    if (!resultImageUrl) {
        showToast('결과 이미지를 찾을 수 없습니다', 'error');
        return;
    }
    
    // Get form data
    const shopName = document.getElementById('saveFitShopName').value.trim();
    const productName = document.getElementById('saveFitProductName').value.trim();
    const productUrl = document.getElementById('saveFitProductUrl').value.trim();
    const category = document.getElementById('saveFitCategory').value;
    const priceSnapshot = parseInt(document.getElementById('saveFitPrice').value) || null;
    const note = document.getElementById('saveFitNote').value.trim();
    
    // Validate
    if (!shopName || !productName || !productUrl) {
        showToast('필수 항목을 모두 입력해주세요', 'error');
        return;
    }
    
    // Validate HTTPS
    if (!productUrl.startsWith('https://')) {
        showToast('구매 링크는 HTTPS로 시작해야 합니다', 'error');
        return;
    }
    
    // Prepare data
    const data = {
        result_image_url: resultImageUrl,
        shop_name: shopName,
        product_name: productName,
        product_url: productUrl,
        category: category || null,
        price_snapshot: priceSnapshot,
        note: note || null
    };
    
    try {
        const response = await fetch('/api/save-fit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.ok) {
            showToast('옷장에 저장되었습니다!', 'success');
            closeSaveFitModal();
        } else {
            showToast(result.error || '저장 실패', 'error');
        }
        
    } catch (error) {
        console.error('Save fit error:', error);
        showToast('저장 중 오류가 발생했습니다', 'error');
    }
}

// Load and render saved fits
async function loadSavedFits(page = 1, query = '') {
    currentPage = page;
    currentSearchQuery = query;
    
    try {
        const params = new URLSearchParams({
            page: page,
            per_page: 20,
            ...(query && { q: query })
        });
        
        const response = await fetch(`/api/saved-fits?${params}`);
        const data = await response.json();
        
        renderSavedFits(data);
        
    } catch (error) {
        console.error('Load saved fits error:', error);
        showToast('불러오기 실패', 'error');
    }
}

function renderSavedFits(data) {
    const grid = document.getElementById('savedFitsGrid');
    const emptyState = document.getElementById('savedFitsEmpty');
    const pagination = document.getElementById('savedFitsPagination');
    
    // Clear grid
    grid.innerHTML = '';
    
    // Show empty state if no items
    if (!data.items || data.items.length === 0) {
        emptyState.classList.remove('hidden');
        pagination.classList.add('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Render cards
    data.items.forEach(item => {
        const card = createFitCard(item);
        grid.appendChild(card);
    });
    
    // Render pagination
    if (data.total_pages > 1) {
        renderPagination(data.page, data.total_pages);
        pagination.classList.remove('hidden');
    } else {
        pagination.classList.add('hidden');
    }
}

function createFitCard(item) {
    const card = document.createElement('div');
    card.className = 'rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition';
    card.style.background = 'var(--ivory)';
    card.dataset.testid = `card-fit-${item.id}`;
    
    // Format date
    const date = new Date(item.created_at * 1000);
    const relativeTime = getRelativeTime(date);
    
    card.innerHTML = `
        <!-- Image -->
        <div class="relative" style="aspect-ratio: 1/1;">
            <img 
                src="${item.result_image_url}" 
                alt="${item.product_name}"
                class="w-full h-full object-cover"
                data-testid="img-fit-result">
            <!-- Shop Name Badge -->
            <div class="absolute top-2 right-2 px-3 py-1 rounded-full text-sm font-semibold" 
                 style="background: var(--gold); color: var(--primary-green);"
                 data-testid="badge-shop">
                ${escapeHtml(item.shop_name)}
            </div>
        </div>
        
        <!-- Content -->
        <div class="p-4">
            <!-- Product Name -->
            <h4 class="font-semibold text-lg mb-2 line-clamp-2" 
                style="color: var(--text-dark);"
                data-testid="text-product-name">
                ${escapeHtml(item.product_name)}
            </h4>
            
            <!-- Metadata -->
            <p class="text-sm mb-3" style="color: var(--wood-brown);" data-testid="text-metadata">
                ${relativeTime}${item.category ? ' · ' + item.category : ''}
            </p>
            
            ${item.price_snapshot ? `
            <p class="text-sm mb-3 font-semibold" style="color: var(--primary-green);">
                ${item.price_snapshot.toLocaleString()}원
            </p>
            ` : ''}
            
            ${item.note ? `
            <p class="text-xs mb-3 italic" style="color: var(--wood-brown);">
                "${escapeHtml(item.note)}"
            </p>
            ` : ''}
            
            <!-- Action Buttons -->
            <div class="flex gap-2">
                <a 
                    href="${item.product_url}" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    class="btn btn-primary btn-md flex-1 text-center"
                    aria-label="구매 페이지로 이동"
                    data-testid="button-buy-${item.id}">
                    구매하기 ↗
                </a>
                <button 
                    onclick="deleteSavedFit('${item.id}')"
                    class="btn btn-danger btn-md"
                    data-testid="button-delete-${item.id}">
                    삭제
                </button>
            </div>
        </div>
    `;
    
    return card;
}

function renderPagination(currentPage, totalPages) {
    const pagination = document.getElementById('savedFitsPagination');
    pagination.innerHTML = '';
    
    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'btn btn-ghost btn-md';
        prevBtn.textContent = '← 이전';
        prevBtn.onclick = () => loadSavedFits(currentPage - 1, currentSearchQuery);
        prevBtn.dataset.testid = 'button-page-prev';
        pagination.appendChild(prevBtn);
    }
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = i === currentPage ? 'btn btn-primary btn-md' : 'btn btn-ghost btn-md';
        pageBtn.textContent = i;
        pageBtn.onclick = () => loadSavedFits(i, currentSearchQuery);
        pageBtn.dataset.testid = `button-page-${i}`;
        pagination.appendChild(pageBtn);
    }
    
    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn btn-ghost btn-md';
        nextBtn.textContent = '다음 →';
        nextBtn.onclick = () => loadSavedFits(currentPage + 1, currentSearchQuery);
        nextBtn.dataset.testid = 'button-page-next';
        pagination.appendChild(nextBtn);
    }
}

async function deleteSavedFit(fitId) {
    if (!confirm('정말 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/saved-fits/${fitId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.ok) {
            showToast('삭제되었습니다', 'success');
            loadSavedFits(currentPage, currentSearchQuery);
        } else {
            showToast(result.error || '삭제 실패', 'error');
        }
        
    } catch (error) {
        console.error('Delete fit error:', error);
        showToast('삭제 중 오류가 발생했습니다', 'error');
    }
}

// Helper functions
function getRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 30) {
        return date.toLocaleDateString('ko-KR');
    } else if (days > 0) {
        return `${days}일 전`;
    } else if (hours > 0) {
        return `${hours}시간 전`;
    } else if (minutes > 0) {
        return `${minutes}분 전`;
    } else {
        return '방금 전';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners for wardrobe
document.addEventListener('DOMContentLoaded', () => {
    // Wardrobe navigation
    const wardrobeNavBtn = document.getElementById('wardrobeNavBtn');
    const backToMainBtn = document.getElementById('backToMainBtn');
    
    if (wardrobeNavBtn) {
        wardrobeNavBtn.addEventListener('click', navigateToWardrobe);
    }
    
    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', navigateToMain);
    }
    
    // Save fit modal
    const cancelSaveBtn = document.getElementById('cancelSaveBtn');
    const saveFitForm = document.getElementById('saveFitForm');
    
    if (cancelSaveBtn) {
        cancelSaveBtn.addEventListener('click', closeSaveFitModal);
    }
    
    if (saveFitForm) {
        saveFitForm.addEventListener('submit', handleSaveFitSubmit);
    }
    
    // Close modal on background click
    const saveFitModal = document.getElementById('saveFitModal');
    if (saveFitModal) {
        saveFitModal.addEventListener('click', (e) => {
            if (e.target === saveFitModal) {
                closeSaveFitModal();
            }
        });
    }
    
    // Search
    const searchFitsBtn = document.getElementById('searchFitsBtn');
    const savedFitsSearch = document.getElementById('savedFitsSearch');
    
    if (searchFitsBtn) {
        searchFitsBtn.addEventListener('click', () => {
            const query = savedFitsSearch.value.trim();
            loadSavedFits(1, query);
        });
    }
    
    if (savedFitsSearch) {
        savedFitsSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = savedFitsSearch.value.trim();
                loadSavedFits(1, query);
            }
        });
    }
    
    // Show wardrobe nav button immediately for testing
    if (wardrobeNavBtn) {
        wardrobeNavBtn.classList.remove('hidden');
    }
});

// Make functions globally accessible
window.navigateToWardrobe = navigateToWardrobe;
window.navigateToMain = navigateToMain;
window.openSaveFitModal = openSaveFitModal;
window.closeSaveFitModal = closeSaveFitModal;
window.deleteSavedFit = deleteSavedFit;
