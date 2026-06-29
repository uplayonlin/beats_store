// ============================================
// STATE
// ============================================
let beats = [];
let currentBeat = null;
let currentAudio = new Audio();
let isPlaying = false;
let currentBeatId = null;
let currentPage = 1;
const beatsPerPage = 8;
let filteredBeats = [];
let currentVolume = 0.7;
let isMuted = false;

// Fallback промокоды (если сервер не запущен)
// const fallbackPromos = {
//     'WELCOME10': { discount: 10, type: 'percent', description: '10% off' },
//     'FIRST20': { discount: 20, type: 'percent', description: '20% off first order' },
//     'SAVE5': { discount: 5, type: 'fixed', description: '$5 off' },
//     'VIP50': { discount: 50, type: 'percent', description: '50% off VIP' },
//     'ARIABEATS': { discount: 15, type: 'percent', description: '15% off' }
// };

// ============================================
// DOM ELEMENTS
// ============================================
let beatsGrid, paginationElement, cartCount, cartItems, cartTotal;
let searchInput, filterBPM, filterKey, sortBy, beatsCount;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    // Получаем DOM элементы
    beatsGrid = document.getElementById('beatsGrid');
    paginationElement = document.getElementById('pagination');
    cartCount = document.getElementById('cartCount');
    cartItems = document.getElementById('cartItems');
    cartTotal = document.getElementById('cartTotal');
    searchInput = document.getElementById('searchBeat');
    filterBPM = document.getElementById('filterBPM');
    filterKey = document.getElementById('filterKey');
    sortBy = document.getElementById('sortBy');
    beatsCount = document.getElementById('beatsCount');
    
    // Устанавливаем громкость
    currentAudio.volume = currentVolume;
    
    // Загружаем биты с сервера
    await loadBeatsFromServer();
    
    // Инициализируем
    filterAndRenderBeats();
    setupEventListeners();
});

// ============================================
// LOAD BEATS FROM SERVER
// ============================================
async function loadBeatsFromServer() {
    try {
        const response = await fetch('/api/beats');
        const data = await response.json();
        
        if (data && data.length > 0) {
            beats = data.map(beat => ({
                id: beat.id,
                title: beat.title,
                artist: beat.artist,
                bpm: beat.bpm,
                key: beat.key_signature,
                cover: beat.cover,
                audio: beat.audio,
                priceTagged: beat.price_tagged,
                priceUntagged: beat.price_untagged,
                priceExclusive: beat.price_exclusive,
                popular: beat.popular === 1
            }));
            console.log(`✅ Loaded ${beats.length} beats from server`);
        } else {
            console.log('⚠️ No beats in database');
            beats = [];
        }
    } catch (error) {
        console.log('⚠️ Server offline, no beats loaded');
        beats = [];
    }
    
    filteredBeats = [...beats];
}

// ============================================
// FILTER AND RENDER
// ============================================
function filterAndRenderBeats() {
    let filtered = [...beats];

    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(beat =>
            beat.title.toLowerCase().includes(searchTerm) ||
            beat.artist.toLowerCase().includes(searchTerm)
        );
    }

    const bpmValue = filterBPM.value;
    if (bpmValue) {
        filtered = filtered.filter(beat => {
            if (bpmValue === '120+') return beat.bpm >= 120;
            const [min, max] = bpmValue.split('-').map(Number);
            return beat.bpm >= min && beat.bpm <= max;
        });
    }

    const keyValue = filterKey.value;
    if (keyValue) {
        filtered = filtered.filter(beat => beat.key.includes(keyValue));
    }

    const sortValue = sortBy.value;
    if (sortValue === 'price-low') {
        filtered.sort((a, b) => a.priceTagged - b.priceTagged);
    } else if (sortValue === 'price-high') {
        filtered.sort((a, b) => b.priceTagged - a.priceTagged);
    } else if (sortValue === 'popular') {
        filtered.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0));
    }

    filteredBeats = filtered;
    currentPage = 1;
    renderBeats();
    renderPagination();
    updateBeatsCount();
}

// ============================================
// RENDER BEATS
// ============================================
function renderBeats() {
    beatsGrid.innerHTML = '';

    const startIndex = (currentPage - 1) * beatsPerPage;
    const endIndex = startIndex + beatsPerPage;
    const beatsToRender = filteredBeats.slice(startIndex, endIndex);

    if (beatsToRender.length === 0) {
        beatsGrid.innerHTML = `
            <div class="col-12">
                <div class="no-results">
                    <i class="fas fa-music"></i>
                    <h5>No beats found</h5>
                    <p class="mb-0 small">Try adjusting your filters</p>
                </div>
            </div>
        `;
        return;
    }

    beatsToRender.forEach(beat => {
        const beatCard = createBeatCard(beat);
        beatsGrid.appendChild(beatCard);
    });

    const remainingSlots = beatsPerPage - beatsToRender.length;
    if (remainingSlots > 0) {
        for (let i = 0; i < remainingSlots; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'col-xl-3 col-lg-4 col-md-6 col-sm-6';
            placeholder.innerHTML = `
                <div class="beat-card placeholder-card">
                    <div class="beat-cover placeholder-cover"></div>
                    <div class="beat-info placeholder-info"></div>
                </div>
            `;
            beatsGrid.appendChild(placeholder);
        }
    }

    animateCards();
}

// ============================================
// ANIMATION
// ============================================
function animateCards() {
    const cards = document.querySelectorAll('.beat-card:not(.placeholder-card)');

    cards.forEach((card, index) => {
        card.classList.remove('animate-in');
        card.style.opacity = '0';

        const row = Math.floor(index / 4);
        const col = index % 4;
        const delay = (row * 400) + (col * 100);

        setTimeout(() => {
            card.classList.add('animate-in');
        }, delay);
    });
}

// ============================================
// PAGINATION
// ============================================
function renderPagination() {
    const totalPages = Math.ceil(filteredBeats.length / beatsPerPage);

    if (totalPages <= 1) {
        paginationElement.innerHTML = '';
        return;
    }

    let paginationHTML = '';

    paginationHTML += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage - 1}); return false;">
                <i class="fas fa-chevron-left"></i>
            </a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="changePage(${i}); return false;">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            paginationHTML += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }

    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" onclick="changePage(${currentPage + 1}); return false;">
                <i class="fas fa-chevron-right"></i>
            </a>
        </li>
    `;

    paginationElement.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredBeats.length / beatsPerPage);

    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderBeats();
    renderPagination();

    const filtersSection = document.querySelector('.filters-section');
    if (filtersSection) {
        const offset = filtersSection.getBoundingClientRect().top + window.pageYOffset - 20;
        window.scrollTo({
            top: offset,
            behavior: 'smooth'
        });
    }
}

function updateBeatsCount() {
    beatsCount.textContent = `${filteredBeats.length} beat${filteredBeats.length !== 1 ? 's' : ''} found`;
}

// ============================================
// CREATE BEAT CARD
// ============================================
function createBeatCard(beat) {
    const col = document.createElement('div');
    col.className = 'col-xl-3 col-lg-4 col-md-6 col-sm-6';

    col.innerHTML = `
        <div class="beat-card" data-beat-id="${beat.id}">
            <div class="beat-cover">
                <img src="${beat.cover}" alt="${beat.title}" onerror="this.src='source/images/default-cover.jpg'">
                <div class="beat-play-overlay">
                    <button class="beat-play-btn" onclick="togglePlay(${beat.id})">
                        <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
            <div class="beat-info">
                <h3 class="beat-title">${beat.title}</h3>
                <p class="beat-artist">${beat.artist}</p>
                <div class="beat-meta">
                    <span><i class="fas fa-tachometer-alt"></i> ${beat.bpm}</span>
                    <span><i class="fas fa-music"></i> ${beat.key}</span>
                    ${beat.popular ? '<span><i class="fas fa-fire"></i></span>' : ''}
                </div>
                <div class="beat-waveform" id="waveform-${beat.id}"></div>
                <div class="progress-bar-container" id="progress-container-${beat.id}" onclick="seekToPosition(${beat.id}, event)">
                    <div class="progress-bar-fill" id="progress-fill-${beat.id}" style="width: 0%"></div>
                </div>
                <div class="time-display">
                    <span id="current-time-${beat.id}">0:00</span>
                    <span id="duration-${beat.id}">0:00</span>
                </div>
                <div class="volume-control">
                    <i class="fas fa-volume-up volume-icon" id="volume-icon-${beat.id}" onclick="toggleMute(${beat.id})"></i>
                    <input type="range" class="volume-slider" id="volume-slider-${beat.id}" 
                           min="0" max="1" step="0.01" value="0.7"
                           oninput="setVolume(${beat.id}, this.value)">
                </div>
                <div class="beat-pricing">
                    <div class="price-tag" data-type="tagged" data-price="${beat.priceTagged}">
                        <span class="label">MP3</span>
                        <span class="amount">$${beat.priceTagged}</span>
                    </div>
                    <div class="price-tag selected" data-type="untagged" data-price="${beat.priceUntagged}">
                        <span class="label">WAV</span>
                        <span class="amount">$${beat.priceUntagged}</span>
                    </div>
                </div>
                <div class="beat-actions">
                    <button class="btn-add-cart" onclick="addToCart(${beat.id})">
                        <i class="fas fa-cart-plus me-1"></i>Add
                    </button>
                    <button class="btn-buy-now" onclick="openPurchaseModal(${beat.id})">
                        <i class="fas fa-bolt me-1"></i>Buy
                    </button>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => {
        generateWaveform(beat.id);
    }, 0);

    const priceTags = col.querySelectorAll('.price-tag');
    priceTags.forEach(tag => {
        tag.addEventListener('click', function () {
            this.parentElement.querySelectorAll('.price-tag').forEach(t => t.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    return col;
}

// ============================================
// AUDIO PLAYER
// ============================================
function seekToPosition(beatId, event) {
    if (currentBeatId !== beatId || !currentAudio) return;

    const container = document.getElementById(`progress-container-${beatId}`);
    const clickX = event.offsetX;
    const width = container.offsetWidth;
    const percent = clickX / width;

    currentAudio.currentTime = percent * currentAudio.duration;
}

function updateProgress() {
    if (!currentBeatId || !currentAudio.duration) return;

    const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
    const progressFill = document.getElementById(`progress-fill-${currentBeatId}`);
    const currentTimeEl = document.getElementById(`current-time-${currentBeatId}`);
    const durationEl = document.getElementById(`duration-${currentBeatId}`);

    if (progressFill) {
        progressFill.style.width = `${percent}%`;
    }

    if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(currentAudio.currentTime);
    }

    if (durationEl && currentAudio.duration) {
        durationEl.textContent = formatTime(currentAudio.duration);
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function generateWaveform(beatId) {
    const waveform = document.getElementById(`waveform-${beatId}`);
    if (!waveform) return;

    const bars = 20;
    for (let i = 0; i < bars; i++) {
        const bar = document.createElement('div');
        bar.className = 'beat-waveform-bar';
        bar.style.left = `${(i / bars) * 100}%`;
        bar.style.height = `${Math.random() * 80 + 20}%`;
        waveform.appendChild(bar);
    }
}

function togglePlay(beatId) {
    const beat = beats.find(b => b.id === beatId);
    if (!beat) return;

    if (currentBeatId === beatId) {
        if (isPlaying) {
            pauseBeat();
        } else {
            playBeat();
        }
    } else {
        stopCurrentBeat();
        loadBeat(beat);
        playBeat();
    }
}

function loadBeat(beat) {
    currentBeat = beat;
    currentBeatId = beat.id;
    currentAudio.src = beat.audio;
    currentAudio.volume = currentVolume;

    const progressFill = document.getElementById(`progress-fill-${beat.id}`);
    const currentTimeEl = document.getElementById(`current-time-${beat.id}`);
    const durationEl = document.getElementById(`duration-${beat.id}`);

    if (progressFill) progressFill.style.width = '0%';
    if (currentTimeEl) currentTimeEl.textContent = '0:00';

    currentAudio.addEventListener('loadedmetadata', () => {
        if (durationEl) {
            durationEl.textContent = formatTime(currentAudio.duration);
        }
    });

    currentAudio.addEventListener('timeupdate', updateProgress);

    currentAudio.load();

    document.querySelectorAll('.beat-play-btn').forEach(btn => {
        btn.innerHTML = '<i class="fas fa-play"></i>';
        btn.classList.remove('playing');
    });

    const activeBtn = document.querySelector(`[data-beat-id="${beat.id}"] .beat-play-btn`);
    if (activeBtn) {
        activeBtn.innerHTML = '<i class="fas fa-pause"></i>';
        activeBtn.classList.add('playing');
    }

    document.querySelectorAll('.volume-slider').forEach(slider => {
        slider.value = currentVolume;
    });

    updateVolumeIcon(beat.id);
}

function setVolume(beatId, value) {
    currentVolume = parseFloat(value);
    isMuted = currentVolume === 0;

    if (currentAudio) {
        currentAudio.volume = currentVolume;
    }

    updateVolumeIcon(beatId);

    document.querySelectorAll('.volume-slider').forEach(slider => {
        if (slider.id !== `volume-slider-${beatId}`) {
            slider.value = currentVolume;
        }
    });
}

function toggleMute(beatId) {
    isMuted = !isMuted;

    if (isMuted) {
        currentAudio.volume = 0;
    } else {
        currentAudio.volume = currentVolume || 0.7;
    }

    document.querySelectorAll('.volume-icon').forEach(icon => {
        if (isMuted) {
            icon.className = 'fas fa-volume-mute volume-icon muted';
        } else {
            icon.className = 'fas fa-volume-up volume-icon';
        }
    });

    document.querySelectorAll('.volume-slider').forEach(slider => {
        slider.value = isMuted ? 0 : (currentVolume || 0.7);
    });
}

function updateVolumeIcon(beatId) {
    const icon = document.getElementById(`volume-icon-${beatId}`);
    if (!icon) return;

    if (currentVolume === 0) {
        icon.className = 'fas fa-volume-mute volume-icon muted';
    } else if (currentVolume < 0.5) {
        icon.className = 'fas fa-volume-down volume-icon';
    } else {
        icon.className = 'fas fa-volume-up volume-icon';
    }
}

function playBeat() {
    currentAudio.play();
    isPlaying = true;

    const btn = document.querySelector(`[data-beat-id="${currentBeatId}"] .beat-play-btn`);
    if (btn) {
        btn.innerHTML = '<i class="fas fa-pause"></i>';
        btn.classList.add('playing');
    }

    animateWaveform(currentBeatId);
}

function pauseBeat() {
    currentAudio.pause();
    isPlaying = false;

    const btn = document.querySelector(`[data-beat-id="${currentBeatId}"] .beat-play-btn`);
    if (btn) {
        btn.innerHTML = '<i class="fas fa-play"></i>';
        btn.classList.remove('playing');
    }
}

function stopCurrentBeat() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    isPlaying = false;

    document.querySelectorAll('.beat-play-btn').forEach(btn => {
        btn.innerHTML = '<i class="fas fa-play"></i>';
        btn.classList.remove('playing');
    });
}

function animateWaveform(beatId) {
    if (!isPlaying || currentBeatId !== beatId) return;

    const bars = document.querySelectorAll(`#waveform-${beatId} .beat-waveform-bar`);
    bars.forEach((bar, index) => {
        setTimeout(() => {
            if (isPlaying && currentBeatId === beatId) {
                bar.classList.add('active');
                setTimeout(() => bar.classList.remove('active'), 200);
            }
        }, index * 30);
    });

    requestAnimationFrame(() => animateWaveform(beatId));
}

// ============================================
// CART
// ============================================
// ============================================
// CART
// ============================================
function addToCart(beatId) {
    const beat = beats.find(b => b.id === beatId);
    if (!beat) return;

    const card = document.querySelector(`[data-beat-id="${beatId}"]`);
    const selectedPriceTag = card.querySelector('.price-tag.selected');
    const licenseType = selectedPriceTag.dataset.type;
    const price = parseFloat(selectedPriceTag.dataset.price);

    const item = {
        type: 'beat',
        beatId: beat.id,
        id: beat.id,
        title: beat.title,
        cover: beat.cover,
        licenseType: licenseType,
        price: price,
        licenseName: licenseType === 'tagged' ? 'MP3 Lease' :
            licenseType === 'untagged' ? 'WAV Lease' : 'Exclusive'
    };

    // Вызываем глобальную функцию из cart.js
    if (typeof window.addToCartGlobal === 'function') {
        window.addToCartGlobal(item);
    } else {
        // Fallback если cart.js еще не загрузился
        cart.push(item);
        saveCart();
        updateCartUI();
        showToast(`${beat.title} added to cart!`);
    }
}

function openPurchaseModal(beatId) {
    const beat = beats.find(b => b.id === beatId);
    if (!beat) return;

    currentBeat = beat;
    document.getElementById('purchaseModalTitle').textContent = `Purchase: ${beat.title}`;

    document.querySelectorAll('.license-option').forEach(opt => opt.classList.remove('selected'));

    const modal = new bootstrap.Modal(document.getElementById('purchaseModal'));
    modal.show();
}


function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

async function completePurchase() {
    const email = document.getElementById('buyerEmail').value;
    const selectedLicense = document.querySelector('.license-option.selected');

    if (!email) {
        alert('Please enter your email');
        return;
    }

    if (!selectedLicense) {
        alert('Please select a license type');
        return;
    }

    const licenseType = selectedLicense.dataset.type;
    const price = parseFloat(selectedLicense.dataset.price);

    const order = {
        items: [{
            beatId: currentBeat.id,
            title: currentBeat.title,
            licenseType: licenseType,
            price: price
        }],
        total: price,
        promoCode: appliedPromo ? appliedPromo.code : null,
        email: email
    };

    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
        });

        const data = await response.json();

        if (response.ok) {
            alert(`✅ Order #${data.orderId} created!\n\nBeat: ${currentBeat.title}\nLicense: ${licenseType}\nTotal: $${price}\nEmail: ${email}`);

            const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
            modal.hide();
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert(`Order saved locally!\n\nBeat: ${currentBeat.title}\nLicense: ${licenseType}\nTotal: $${price}\n\n(Server is offline)`);

        const modal = bootstrap.Modal.getInstance(document.getElementById('purchaseModal'));
        modal.hide();
    }
}

// ============================================
// PROMO CODES
// ============================================
// async function applyPromoCode() {
//     const input = document.getElementById('promoInput');
//     const message = document.getElementById('promoMessage');
//     const code = input.value.trim().toUpperCase();

//     if (!code) {
//         message.textContent = 'Please enter a promo code';
//         message.className = 'promo-message error';
//         return;
//     }

//     try {
//         const response = await fetch('/api/promocodes/apply', {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({ code })
//         });

//         const data = await response.json();

//         if (response.ok) {
//             appliedPromo = data;
//             message.textContent = `✓ ${data.description} applied!`;
//             message.className = 'promo-message success';
//             input.value = '';
//             updateCartUI();
//         } else {
//             message.textContent = data.error || 'Invalid promo code';
//             message.className = 'promo-message error';
//             appliedPromo = null;
//             updateCartUI();
//         }
//     } catch (error) {
//         if (fallbackPromos[code]) {
//             appliedPromo = { code, ...fallbackPromos[code] };
//             message.textContent = `✓ ${fallbackPromos[code].description} applied! (offline)`;
//             message.className = 'promo-message success';
//             input.value = '';
//             updateCartUI();
//         } else {
//             message.textContent = 'Invalid promo code';
//             message.className = 'promo-message error';
//             appliedPromo = null;
//             updateCartUI();
//         }
//     }
// }

// function calculateDiscount(subtotal) {
//     if (!appliedPromo) return 0;

//     if (appliedPromo.type === 'percent') {
//         return subtotal * (appliedPromo.discount / 100);
//     } else if (appliedPromo.type === 'fixed') {
//         return Math.min(appliedPromo.discount, subtotal);
//     }

//     return 0;
// }

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    searchInput.addEventListener('input', filterAndRenderBeats);
    filterBPM.addEventListener('change', filterAndRenderBeats);
    filterKey.addEventListener('change', filterAndRenderBeats);
    sortBy.addEventListener('change', filterAndRenderBeats);

    document.querySelectorAll('.license-option').forEach(option => {
        option.addEventListener('click', function () {
            document.querySelectorAll('.license-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    document.getElementById('confirmPurchase').addEventListener('click', completePurchase);

    currentAudio.addEventListener('ended', () => {
        pauseBeat();
    });

    document.getElementById('checkoutBtn')?.addEventListener('click', () => {
        if (cart.length === 0) {
            alert('Your cart is empty');
            return;
        }
        alert('Checkout functionality would integrate with Stripe/PayPal here');
    });

    // Promo code listeners
    document.getElementById('applyPromoBtn')?.addEventListener('click', applyPromoCode);
    document.getElementById('promoInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') applyPromoCode();
    });
}

// ============================================
// TOAST
// ============================================
function showToast(message) {
    const toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'toast work-toast show';
    toastEl.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-check-circle me-2" style="color: #4caf50;"></i>
            <strong class="me-auto">Success</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">${message}</div>
    `;

    document.querySelector('.toast-container').appendChild(toastEl);

    setTimeout(() => {
        toastEl.remove();
    }, 3000);
}
// ============================================
// ADMIN MODAL
// ============================================
function showAdminModal() {
    const modal = new bootstrap.Modal(document.getElementById('adminModal'));
    modal.show();
}

function goToAdmin() {
    window.location.href = '/admin.html';
}
