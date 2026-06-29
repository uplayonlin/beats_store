// ============================================
// STATE
// ============================================
let drumkits = [];
let currentPage = 1;
const kitsPerPage = 6; // 3 карточки × 2 строки
let filteredKits = [];

// ============================================
// DOM ELEMENTS
// ============================================
let drumkitsGrid, paginationElement, kitsCount, searchInput, sortBy;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    drumkitsGrid = document.getElementById('drumkitsGrid');
    paginationElement = document.getElementById('pagination');
    kitsCount = document.getElementById('kitsCount');
    searchInput = document.getElementById('searchKit');
    sortBy = document.getElementById('sortBy');

    await loadDrumkitsFromServer();
    filterAndRenderKits();
    setupEventListeners();
});

// ============================================
// LOAD DRUMKITS FROM SERVER
// ============================================
async function loadDrumkitsFromServer() {
    try {
        const response = await fetch('/api/drumkits');
        const data = await response.json();

        if (data && data.length > 0) {
            drumkits = data.map(kit => ({
                id: kit.id,
                title: kit.title,
                author: kit.author || '@ariawave',
                cover: kit.cover,
                cover_type: kit.cover_type || 'image', // ← ДОБАВИТЬ ЭТУ СТРОКУ
                archive: kit.archive,
                price: kit.price || 29.99,
                freeVersion: kit.free_version === 1
            }));
            console.log(`✅ Loaded ${drumkits.length} drumkits from server`);
        } else {
            console.log('⚠️ No drumkits in database');
            drumkits = [];
        }
    } catch (error) {
        console.log('⚠️ Server offline, no drumkits loaded');
        drumkits = [];
    }

    filteredKits = [...drumkits];
}

// ============================================
// FILTER AND RENDER
// ============================================
function filterAndRenderKits() {
    let filtered = [...drumkits];

    const searchTerm = searchInput.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(kit =>
            kit.title.toLowerCase().includes(searchTerm) ||
            kit.author.toLowerCase().includes(searchTerm)
        );
    }

    const sortValue = sortBy.value;
    if (sortValue === 'price-low') {
        filtered.sort((a, b) => a.price - b.price);
    } else if (sortValue === 'price-high') {
        filtered.sort((a, b) => b.price - a.price);
    }

    filteredKits = filtered;
    currentPage = 1;
    renderKits();
    renderPagination();
    updateKitsCount();
}

// ============================================
// RENDER KITS
// ============================================
function renderKits() {
    drumkitsGrid.innerHTML = '';

    const startIndex = (currentPage - 1) * kitsPerPage;
    const endIndex = startIndex + kitsPerPage;
    const kitsToRender = filteredKits.slice(startIndex, endIndex);

    if (kitsToRender.length === 0) {
        drumkitsGrid.innerHTML = `
            <div class="col-12">
                <div class="no-results">
                    <i class="fas fa-drum"></i>
                    <h5>No drumkits found</h5>
                    <p class="mb-0 small">Try adjusting your search</p>
                </div>
            </div>
        `;
        return;
    }

    kitsToRender.forEach(kit => {
        const kitCard = createDrumkitCard(kit);
        drumkitsGrid.appendChild(kitCard);
    });

    const remainingSlots = kitsPerPage - kitsToRender.length;
    if (remainingSlots > 0) {
        for (let i = 0; i < remainingSlots; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'col-lg-4 col-md-6 col-sm-6';
            placeholder.innerHTML = `
                <div class="drumkit-card placeholder-card">
                    <div class="drumkit-cover placeholder-cover"></div>
                    <div class="drumkit-info placeholder-info"></div>
                </div>
            `;
            drumkitsGrid.appendChild(placeholder);
        }
    }

    animateCards();
}

// ============================================
// ANIMATION
// ============================================
function animateCards() {
    const cards = document.querySelectorAll('.drumkit-card:not(.placeholder-card)');

    cards.forEach((card, index) => {
        card.classList.remove('animate-in');
        card.style.opacity = '0';

        const row = Math.floor(index / 3);
        const col = index % 3;
        const delay = (row * 300) + (col * 100);

        setTimeout(() => {
            card.classList.add('animate-in');
        }, delay);
    });
}

// ============================================
// PAGINATION
// ============================================
function renderPagination() {
    const totalPages = Math.ceil(filteredKits.length / kitsPerPage);

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
    const totalPages = Math.ceil(filteredKits.length / kitsPerPage);

    if (page < 1 || page > totalPages) return;

    currentPage = page;
    renderKits();
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

function updateKitsCount() {
    kitsCount.textContent = `${filteredKits.length} kit${filteredKits.length !== 1 ? 's' : ''} found`;
}

// ============================================
// CREATE DRUMKIT CARD
// ============================================
function createDrumkitCard(kit) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6 col-sm-6';

    // Определяем что показывать - видео или картинку
    let coverHTML = '';
    if (kit.cover_type === 'video') {
        coverHTML = `
            <video autoplay muted loop playsinline class="drumkit-cover-media">
                <source src="${kit.cover}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    } else {
        coverHTML = `
            <img src="${kit.cover}" alt="${kit.title}" onerror="this.src='source/images/logo.png'">
        `;
    }

    col.innerHTML = `
        <div class="drumkit-card" data-kit-id="${kit.id}">
            <div class="drumkit-cover">
                ${coverHTML}
            </div>
            <div class="drumkit-info">
                <h3 class="drumkit-title">${kit.title}</h3>
                <p class="drumkit-author">${kit.author}</p>
                <div class="drumkit-actions">
                    <button class="btn-full-kit" onclick="buyFullKit(${kit.id})">
                        <i class="fas fa-shopping-cart me-1"></i>Full - $${kit.price}
                    </button>
                    ${kit.freeVersion ? `
                        <button class="btn-free-kit" onclick="downloadFreeKit(${kit.id})">
                            <i class="fas fa-download me-1"></i>FREE
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;

    return col;
}

// ============================================
// ACTIONS
// ============================================
function buyFullKit(id) {
    const kit = drumkits.find(k => k.id === id);
    if (!kit) return;

    const item = {
        type: 'drumkit',
        id: kit.id,
        title: kit.title,
        cover: kit.cover,
        coverType: kit.cover_type,
        price: kit.price,
        licenseName: 'Full Version'
    };

    addToCart(item);
}

function downloadFreeKit(id) {
    const kit = drumkits.find(k => k.id === id);
    if (kit.archive) {
        window.location.href = `/api/drumkits/${id}/download`;
    } else {
        alert('Free version not available');
    }
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
    searchInput.addEventListener('input', filterAndRenderKits);
    sortBy.addEventListener('change', filterAndRenderKits);
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
