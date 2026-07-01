// ============================================
// GLOBAL CART SYSTEM
// ============================================
let cart = [];
let appliedPromo = null;

// Fallback промокоды
const fallbackPromos = {
    'WELCOME10': { discount: 10, type: 'percent', description: '10% off' },
    'FIRST20': { discount: 20, type: 'percent', description: '20% off first order' },
    'SAVE5': { discount: 5, type: 'fixed', description: '$5 off' },
    'VIP50': { discount: 50, type: 'percent', description: '50% off VIP' },
    'ARIABEATS': { discount: 15, type: 'percent', description: '15% off' }
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    setupCartEventListeners();
});

// ============================================
// CART FUNCTIONS
// ============================================
function addToCart(item) {
    cart.push(item);
    saveCart();
    updateCartUI();
    showToast(`${item.title} added to cart!`);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('ariawave_cart', JSON.stringify(cart));
}

function loadCart() {
    const saved = localStorage.getItem('ariawave_cart');
    if (saved) {
        cart = JSON.parse(saved);
        updateCartUI();
    }
}

function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartTotal = document.getElementById('cartTotal');
    const discountRow = document.getElementById('discountRow');
    const cartDiscount = document.getElementById('cartDiscount');

    if (cartCount) {
        cartCount.textContent = cart.length;
    }

    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="text-center text-white-50">Your cart is empty</p>';
        if (cartSubtotal) cartSubtotal.textContent = '$0.00';
        if (cartTotal) cartTotal.textContent = '$0.00';
        if (discountRow) discountRow.style.display = 'none';
        return;
    }

    let subtotal = 0;
    cartItems.innerHTML = '';
    cart.forEach((item, index) => {
        subtotal += item.price;
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';

        const typeIcon = item.type === 'beat' ? 'fa-music' :
            item.type === 'drumkit' ? 'fa-drum' : 'fa-box';

        // Определяем тип контента по расширению файла или явному свойству
        const isVideo = item.coverType === 'video' ||
            (item.cover && (item.cover.includes('.mp4') || item.cover.includes('.webm') || item.cover.includes('video')));

        let coverHTML = '';
        if (isVideo) {
            // Для видео пробуем загрузить, если ошибка - показываем логотип с пометкой "Video"
            coverHTML = `
                <video src="${item.cover}" autoplay muted loop playsinline
                    onerror="this.outerHTML='<div style=\\'width:60px;height:60px;background:rgba(144,26,26,0.3);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;\\'><i class=\\'fas fa-video text-danger\\'></i></div>'"
                    style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
                </video>
            `;
        } else {
            coverHTML = `
                <img src="${item.cover}" alt="${item.title}" 
                    onerror="this.src='source/images/logo.png'"
                    style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
            `;
        }

        itemEl.innerHTML = `
            ${coverHTML}
            <div class="cart-item-info">
                <div class="cart-item-title">
                    <i class="fas ${typeIcon} me-1 text-danger"></i>${item.title}
                </div>
                <div class="cart-item-license">${item.licenseName || 'Full Version'}</div>
            </div>
            <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            <button class="btn-remove-item" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        cartItems.appendChild(itemEl);
    });

    const discount = calculateDiscount(subtotal);
    const total = subtotal - discount;

    if (cartSubtotal) cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;

    if (discount > 0 && cartDiscount && discountRow) {
        cartDiscount.textContent = `-$${discount.toFixed(2)}`;
        discountRow.style.display = 'flex';
    } else if (discountRow) {
        discountRow.style.display = 'none';
    }

    if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)}`;
}

function calculateDiscount(subtotal) {
    if (!appliedPromo) return 0;

    if (appliedPromo.type === 'percent') {
        return subtotal * (appliedPromo.discount / 100);
    } else if (appliedPromo.type === 'fixed') {
        return Math.min(appliedPromo.discount, subtotal);
    }

    return 0;
}

// ============================================
// PROMO CODE
// ============================================
async function applyPromoCode() {
    const input = document.getElementById('promoInput');
    const message = document.getElementById('promoMessage');
    const code = input.value.trim().toUpperCase();

    if (!code) {
        if (message) {
            message.textContent = 'Please enter a promo code';
            message.className = 'promo-message error';
        }
        return;
    }

    try {
        const response = await fetch('/api/promocodes/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });

        const data = await response.json();

        if (response.ok) {
            appliedPromo = data;
            if (message) {
                message.textContent = `✓ ${data.description} applied!`;
                message.className = 'promo-message success';
            }
            if (input) input.value = '';
            updateCartUI();
        } else {
            if (message) {
                message.textContent = data.error || 'Invalid promo code';
                message.className = 'promo-message error';
            }
            appliedPromo = null;
            updateCartUI();
        }
    } catch (error) {
        if (fallbackPromos[code]) {
            appliedPromo = { code, ...fallbackPromos[code] };
            if (message) {
                message.textContent = `✓ ${fallbackPromos[code].description} applied! (offline)`;
                message.className = 'promo-message success';
            }
            if (input) input.value = '';
            updateCartUI();
        } else {
            if (message) {
                message.textContent = 'Invalid promo code';
                message.className = 'promo-message error';
            }
            appliedPromo = null;
            updateCartUI();
        }
    }
}

// ============================================
// CHECKOUT
// ============================================
function setupCartEventListeners() {
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (cart.length === 0) {
                alert('Your cart is empty');
                return;
            }

            const email = prompt('Enter your email for receipt:');
            if (!email || !email.includes('@')) {
                alert('Please enter a valid email');
                return;
            }

            const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
            const discount = calculateDiscount(subtotal);
            const total = subtotal - discount;

            try {
                const response = await fetch('/api/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cart,
                        total: total,
                        promoCode: appliedPromo ? appliedPromo.code : null,
                        email: email
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    // Сохраняем данные заказа
                    const orderData = {
                        orderId: data.orderId,
                        items: cart,
                        subtotal: subtotal,
                        discount: discount,
                        total: total,
                        email: email
                    };

                    console.log('💾 Saving order to sessionStorage:', orderData);
                    sessionStorage.setItem('currentOrder', JSON.stringify(orderData));

                    const cartModal = bootstrap.Modal.getInstance(document.getElementById('cartModal'));
                    if (cartModal) cartModal.hide();

                    console.log('✅ Redirecting to crypto-payment.html');
                    window.location.href = 'crypto-payment.html';
                } else {
                    console.error('❌ Error creating order:', data.error);
                    alert('❌ Error creating order: ' + data.error);
                }
            } catch (error) {
                alert('❌ Server error. Please try again.');
                console.error(error);
            }
        });
    }

    const applyPromoBtn = document.getElementById('applyPromoBtn');
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', applyPromoCode);
    }

    const promoInput = document.getElementById('promoInput');
    if (promoInput) {
        promoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyPromoCode();
        });
    }
}

// ============================================
// TOAST NOTIFICATION
// ============================================
function showToast(message) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    const toastEl = document.createElement('div');
    toastEl.className = 'toast show';
    toastEl.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-check-circle me-2" style="color: #4caf50;"></i>
            <strong class="me-auto">Success</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">${message}</div>
    `;

    toastContainer.appendChild(toastEl);

    setTimeout(() => {
        toastEl.remove();
    }, 3000);
}
// Экспортируем функцию для использования в других файлах
window.addToCartGlobal = addToCart;

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
