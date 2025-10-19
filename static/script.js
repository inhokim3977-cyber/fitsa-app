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

    // Download, refit, and reset
    downloadBtn.addEventListener('click', () => downloadResult());
    const refitBtn = document.getElementById('refitBtn');
    if (refitBtn) {
        console.log('✓ Refit button found and event listener attached');
        refitBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔄 Refit button clicked!');
            refitCurrentPhotos();
        });
        // Test: Add visual feedback on hover
        refitBtn.addEventListener('mouseenter', () => {
            console.log('Mouse entered refit button');
        });
    } else {
        console.error('❌ Refit button NOT found!');
    }
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
                
                // Add timeout to prevent infinite loading
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout
                
                const topResponse = await fetch('/api/virtual-fitting', {
                    method: 'POST',
                    body: topFormData,
                    signal: controller.signal
                }).finally(() => clearTimeout(timeoutId));
                
                if (topResponse.status === 402) {
                    const topData = await topResponse.json();
                    alert(topData.message || '크레딧이 부족합니다. 크레딧을 구매해주세요.');
                    updateCreditsDisplay(topData.remaining_free, topData.credits);
                    return;
                }
                
                if (topResponse.status === 429) {
                    const topData = await topResponse.json();
                    alert(topData.message || '재피팅 한도 초과: 1시간 내 최대 5회까지 가능합니다.');
                    return;
                }
                
                const topData = await topResponse.json();
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
                
                if (bottomResponse.status === 402) {
                    const bottomData = await bottomResponse.json();
                    alert(bottomData.message || '크레딧이 부족합니다. 크레딧을 구매해주세요.');
                    updateCreditsDisplay(bottomData.remaining_free, bottomData.credits);
                    return;
                }
                
                if (bottomResponse.status === 429) {
                    const bottomData = await bottomResponse.json();
                    alert(bottomData.message || '재피팅 한도 초과: 1시간 내 최대 5회까지 가능합니다.');
                    return;
                }
                
                const bottomData = await bottomResponse.json();
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
            
            // Add timeout to prevent infinite loading
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout
            
            const dressResponse = await fetch('/api/virtual-fitting', {
                method: 'POST',
                body: dressFormData,
                signal: controller.signal
            }).finally(() => clearTimeout(timeoutId));
            
            if (dressResponse.status === 402) {
                const dressData = await dressResponse.json();
                alert(dressData.message || '크레딧이 부족합니다. 크레딧을 구매해주세요.');
                updateCreditsDisplay(dressData.remaining_free, dressData.credits);
                return;
            }
            
            if (dressResponse.status === 429) {
                const dressData = await dressResponse.json();
                alert(dressData.message || '재피팅 한도 초과: 1시간 내 최대 5회까지 가능합니다.');
                return;
            }
            
            const dressData = await dressResponse.json();
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
            resultsSection.classList.remove('hidden');
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }
        
    } catch (error) {
        console.error('Error:', error);
        if (error.name === 'AbortError') {
            alert('⏱️ 요청 시간이 초과되었습니다 (120초). Gemini API가 응답하지 않습니다. 다시 시도해주세요.');
        } else {
            alert('피팅 생성 중 오류가 발생했습니다: ' + error.message);
        }
    } finally {
        generateBtn.disabled = false;
        loadingIndicator.classList.add('hidden');
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
    
    // Reset refit counter
    document.getElementById('refitCount').textContent = '0';
    const refitBtn = document.getElementById('refitBtn');
    refitBtn.disabled = false;
    refitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    
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
    const refitBtn = document.getElementById('refitBtn');
    
    console.log('🔍 DOM elements found:', {
        refitCountSpan: refitCountSpan ? 'YES' : 'NO',
        refitBtn: refitBtn ? 'YES' : 'NO'
    });
    
    if (!refitCountSpan) {
        console.error('❌ refitCount span not found!');
        alert('ERROR: refitCount 요소를 찾을 수 없습니다!');
        return;
    }
    if (!refitBtn) {
        console.error('❌ refitBtn button not found!');
        alert('ERROR: refitBtn 버튼을 찾을 수 없습니다!');
        return;
    }
    
    // Always update the counter with the actual count from the backend
    const oldValue = refitCountSpan.textContent;
    refitCountSpan.textContent = refitCount.toString();
    console.log('✅ Counter updated from', oldValue, 'to:', refitCount);
    console.log('✅ New textContent:', refitCountSpan.textContent);
    
    // Add visual flash effect to make the update noticeable
    refitCountSpan.style.transition = 'none';
    refitCountSpan.style.transform = 'scale(1.5)';
    refitCountSpan.style.color = '#fbbf24'; // yellow-400
    setTimeout(() => {
        refitCountSpan.style.transition = 'all 0.3s ease';
        refitCountSpan.style.transform = 'scale(1)';
        refitCountSpan.style.color = '#fcd34d'; // yellow-300
    }, 200);
    
    // Disable button if limit reached (5 refits)
    if (refitCount >= 5) {
        refitBtn.disabled = true;
        refitBtn.classList.add('opacity-50', 'cursor-not-allowed');
        console.log('🚫 Refit button DISABLED (limit reached)');
    } else {
        refitBtn.disabled = false;
        refitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        console.log('✅ Refit button ENABLED (count:', refitCount, ')');
    }
    
    console.log('🔄 updateRefitCounter COMPLETED');
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
