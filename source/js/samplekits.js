// ============================================
// STATE
// ============================================
let samplekits = [];
let currentPage = 1;
const kitsPerPage = 6;
let filteredKits = [];

// ============================================
// DOM ELEMENTS
// ============================================
let samplekitsGrid, paginationElement, kitsCount, searchInput, sortBy;

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    samplekitsGrid = document.getElementById('samplekitsGrid');
    paginationElement = document.getElementById('pagination');
    kitsCount = document.getElementById('kitsCount');
    searchInput = document.getElementById('searchKit');
    sortBy = document.getElementById('sortBy');

    await loadSamplekitsFromServer();
    filterAndRenderKits();
    setupEventListeners();
});

// ============================================
// LOAD SAMPLEKITS FROM SERVER
// ============================================
async function loadSamplekitsFromServer() {
    try {
        const response = await fetch('/api/samplekits');
        const data = await response.json();

        if (data && data.length > 0) {
            samplekits = data.map(kit => ({
                id: kit.id,
                title: kit.title,
                author: kit.author || '@ariawave',
                cover: kit.cover,
                cover_type: kit.cover_type || 'image',
                archive: kit.archive,
                price: kit.price || 19.99,
                freeVersion: kit.free_version === 1
            }));
            console.log(`✅ Loaded ${samplekits.length} samplekits from server`);
        } else {
            console.log('⚠️ No samplekits in database');
            samplekits = [];
        }
    } catch (error) {
        console.log('⚠️ Server offline, no samplekits loaded');
        samplekits = [];
    }

    filteredKits = [...samplekits];
}

// ============================================
// FILTER AND RENDER
// ============================================
function filterAndRenderKits() {
    let filtered = [...samplekits];

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
    samplekitsGrid.innerHTML = '';

    const startIndex = (currentPage - 1) * kitsPerPage;
    const endIndex = startIndex + kitsPerPage;
    const kitsToRender = filteredKits.slice(startIndex, endIndex);

    if (kitsToRender.length === 0) {
        samplekitsGrid.innerHTML = `
            <div class="col-12">
                <div class="no-results">
                    <i class="fas fa-box"></i>
                    <h5>No samplekits found</h5>
                    <p class="mb-0 small">Try adjusting your search</p>
                </div>
            </div>
        `;
        return;
    }

    kitsToRender.forEach(kit => {
        const kitCard = createSamplekitCard(kit);
        samplekitsGrid.appendChild(kitCard);
    });

    const remainingSlots = kitsPerPage - kitsToRender.length;
    if (remainingSlots > 0) {
        for (let i = 0; i < remainingSlots; i++) {
            const placeholder = document.createElement('div');
            placeholder.className = 'col-lg-4 col-md-6 col-sm-6';
            placeholder.innerHTML = `
                <div class="samplekit-card placeholder-card">
                    <div class="samplekit-cover placeholder-cover"></div>
                    <div class="samplekit-info placeholder-info"></div>
                </div>
            `;
            samplekitsGrid.appendChild(placeholder);
        }
    }

    animateCards();
}

// ============================================
// ANIMATION
// ============================================
function animateCards() {
    const cards = document.querySelectorAll('.samplekit-card:not(.placeholder-card)');

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
// CREATE SAMPLEKIT CARD
// ============================================
function createSamplekitCard(kit) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6 col-sm-6';

    let coverHTML = '';
    if (kit.cover_type === 'video') {
        coverHTML = `
            <video autoplay muted loop playsinline class="samplekit-cover-media">
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
        <div class="samplekit-card" data-kit-id="${kit.id}">
            <div class="samplekit-cover">
                ${coverHTML}
            </div>
            <div class="samplekit-info">
                <h3 class="samplekit-title">${kit.title}</h3>
                <p class="samplekit-author">${kit.author}</p>
                <div class="samplekit-actions">
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
    const kit = samplekits.find(k => k.id === id);
    if (!kit) return;

    const item = {
        type: 'samplekit',
        id: kit.id,
        title: kit.title,
        cover: kit.cover,
        coverType: kit.cover_type, // ← Обязательно передаём!
        price: kit.price,
        licenseName: 'Full Version'
    };

    addToCart(item);
}

function downloadFreeKit(id) {
    const kit = samplekits.find(k => k.id === id);
    if (kit.archive) {
        window.location.href = `/api/samplekits/${id}/download`;
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
