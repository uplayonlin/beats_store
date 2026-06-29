
const API_URL = '/api';

// Проверка авторизации при загрузке
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_URL}/check-auth`);
        const data = await response.json();
        if (!data.isAuthenticated) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        window.location.href = '/login.html';
    }
});

// ============================================
// BEATS FUNCTIONS
// ============================================

// Preview audio
document.getElementById('audioInput')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const audio = document.getElementById('audioPreview');
        audio.src = URL.createObjectURL(file);
        audio.style.display = 'block';
    }
});

// Preview cover for add beat
document.getElementById('coverInput')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (file) {
        const img = document.getElementById('coverPreview');
        img.src = URL.createObjectURL(file);
        img.style.display = 'block';
    }
});

// Add beat form
document.getElementById('addBeatForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const message = document.getElementById('addBeatMessage');

    try {
        const response = await fetch(`${API_URL}/beats`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            message.innerHTML = `<div class="alert alert-success">✅ Beat added! ID: ${data.beatId}</div>`;
            this.reset();
            document.getElementById('audioPreview').style.display = 'none';
            document.getElementById('coverPreview').style.display = 'none';
            loadBeats();
        } else {
            message.innerHTML = `<div class="alert alert-danger">❌ Error: ${data.error}</div>`;
        }
    } catch (error) {
        message.innerHTML = `<div class="alert alert-danger">❌ Server error. Is it running?</div>`;
    }
});

// Load beats
async function loadBeats() {
    try {
        const response = await fetch(`${API_URL}/beats`);
        const beats = await response.json();
        const list = document.getElementById('beatsList');

        if (beats.length === 0) {
            list.innerHTML = '<p class="text-center text-white-50">No beats yet</p>';
            return;
        }

        list.innerHTML = beats.map(beat => `
                    <div class="beat-item">
                        <img src="${beat.cover}" alt="${beat.title}" onerror="this.src='source/images/logo.png'">
                        <div class="beat-item-info">
                            <h6 class="mb-1">${beat.title}</h6>
                            <small class="text-white-50">${beat.artist} • ${beat.bpm} BPM • ${beat.key_signature}</small>
                            <div class="mt-1">
                                <span class="badge bg-secondary">MP3: $${beat.price_tagged}</span>
                                <span class="badge bg-secondary">WAV: $${beat.price_untagged}</span>
                                <span class="badge bg-danger">Exclusive: $${beat.price_exclusive}</span>
                                ${beat.popular ? '<span class="badge bg-warning text-dark"><i class="fas fa-fire me-1"></i>Popular</span>' : ''}
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-primary btn-sm" onclick="openEditModal(${beat.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="deleteBeat(${beat.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
    } catch (error) {
        const list = document.getElementById('beatsList');
        if (list) list.innerHTML = '<p class="text-center text-danger">Error loading beats</p>';
    }
}

// Delete beat
async function deleteBeat(id) {
    if (!confirm('Delete this beat? This will also delete the files.')) return;

    try {
        const response = await fetch(`${API_URL}/beats/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadBeats();
        } else {
            alert('Error deleting beat');
        }
    } catch (error) {
        alert('Server error');
    }
}

// Open edit beat modal
async function openEditModal(id) {
    try {
        const response = await fetch(`${API_URL}/beats/${id}`);
        const beat = await response.json();

        document.getElementById('editBeatId').value = beat.id;
        document.getElementById('editTitle').value = beat.title;
        document.getElementById('editArtist').value = beat.artist;
        document.getElementById('editBpm').value = beat.bpm;
        document.getElementById('editKey').value = beat.key_signature;
        document.getElementById('editPopular').checked = beat.popular === 1;
        document.getElementById('editPriceTagged').value = beat.price_tagged;
        document.getElementById('editPriceUntagged').value = beat.price_untagged;
        document.getElementById('editPriceExclusive').value = beat.price_exclusive;

        const currentCover = document.getElementById('editCurrentCover');
        currentCover.src = beat.cover;
        currentCover.style.display = 'block';

        const beatCoverPreview = document.getElementById('editBeatCoverPreview');
        const beatCoverInput = document.getElementById('editBeatCover');
        if (beatCoverPreview) beatCoverPreview.innerHTML = '';
        if (beatCoverInput) beatCoverInput.value = '';
        document.getElementById('editBeatMessage').innerHTML = '';

        const modal = new bootstrap.Modal(document.getElementById('editBeatModal'));
        modal.show();
    } catch (error) {
        alert('Error loading beat data');
    }
}

// Preview cover in edit beat modal
document.getElementById('editBeatCover')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const preview = document.getElementById('editBeatCoverPreview');
    if (file && preview) {
        preview.innerHTML = `<img src="${URL.createObjectURL(file)}" class="file-preview" style="max-width: 300px;">`;
    }
});

// Save edit beat
document.getElementById('saveEditBtn')?.addEventListener('click', async function () {
    const form = document.getElementById('editBeatForm');
    const formData = new FormData(form);
    const beatId = document.getElementById('editBeatId').value;
    const message = document.getElementById('editBeatMessage');

    try {
        const response = await fetch(`${API_URL}/beats/${beatId}`, {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            message.innerHTML = '<div class="alert alert-success">✅ Beat updated!</div>';
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('editBeatModal')).hide();
                loadBeats();
            }, 1000);
        } else {
            message.innerHTML = `<div class="alert alert-danger">❌ Error: ${data.error}</div>`;
        }
    } catch (error) {
        message.innerHTML = '<div class="alert alert-danger">❌ Server error</div>';
    }
});

// ============================================
// DRUMKIT FUNCTIONS
// ============================================

// Show archive filename
document.getElementById('drumkitArchiveInput')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const el = document.getElementById('archiveFileName');
    if (el) {
        if (file) {
            el.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        } else {
            el.textContent = '';
        }
    }
});

// Preview drumkit cover (image or video)
document.getElementById('drumkitCoverInput')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const preview = document.getElementById('drumkitCoverPreview');

    if (file && preview) {
        if (file.type.startsWith('video/')) {
            preview.innerHTML = `
                        <video controls class="file-preview" style="max-width: 300px;">
                            <source src="${URL.createObjectURL(file)}" type="${file.type}">
                        </video>
                    `;
        } else {
            preview.innerHTML = `
                        <img src="${URL.createObjectURL(file)}" class="file-preview" style="max-width: 300px;">
                    `;
        }
    } else if (preview) {
        preview.innerHTML = '';
    }
});

// Add drumkit form
document.getElementById('addDrumkitForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const message = document.getElementById('addDrumkitMessage');

    try {
        const response = await fetch(`${API_URL}/drumkits`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            message.innerHTML = `<div class="alert alert-success">✅ DrumKit added! ID: ${data.drumkitId}</div>`;
            this.reset();
            const preview = document.getElementById('drumkitCoverPreview');
            if (preview) preview.innerHTML = '';
            const archiveName = document.getElementById('archiveFileName');
            if (archiveName) archiveName.textContent = '';
            loadDrumkits();
        } else {
            message.innerHTML = `<div class="alert alert-danger">❌ Error: ${data.error}</div>`;
        }
    } catch (error) {
        message.innerHTML = `<div class="alert alert-danger">❌ Server error</div>`;
    }
});

// Load drumkits
async function loadDrumkits() {
    try {
        const response = await fetch(`${API_URL}/drumkits`);
        const drumkits = await response.json();
        const list = document.getElementById('drumkitsList');

        if (drumkits.length === 0) {
            list.innerHTML = '<p class="text-center text-white-50">No drumkits yet</p>';
            return;
        }

        list.innerHTML = drumkits.map(kit => {
            let coverHTML = '';
            if (kit.cover_type === 'video') {
                coverHTML = `
                            <video src="${kit.cover}" class="beat-item" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" autoplay muted loop playsinline></video>
                        `;
            } else {
                coverHTML = `
                            <img src="${kit.cover}" alt="${kit.title}" onerror="this.src='source/images/logo.png'">
                        `;
            }

            return `
                        <div class="beat-item">
                            ${coverHTML}
                            <div class="beat-item-info">
                                <h6 class="mb-1">${kit.title}</h6>
                                <small class="text-white-50">${kit.author || '@ariawave'} • $${kit.price}</small>
                                <div class="mt-1">
                                    ${kit.free_version ? '<span class="badge bg-success">Free version</span>' : '<span class="badge bg-secondary">Paid only</span>'}
                                    ${kit.cover_type === 'video' ? '<span class="badge bg-info">Video cover</span>' : ''}
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-primary btn-sm" onclick="openEditDrumkitModal(${kit.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteDrumkit(${kit.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
        }).join('');
    } catch (error) {
        const list = document.getElementById('drumkitsList');
        if (list) list.innerHTML = '<p class="text-center text-danger">Error loading drumkits</p>';
    }
}

// Delete drumkit
async function deleteDrumkit(id) {
    if (!confirm('Delete this drumkit?')) return;

    try {
        const response = await fetch(`${API_URL}/drumkits/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadDrumkits();
        } else {
            alert('Error deleting drumkit');
        }
    } catch (error) {
        alert('Server error');
    }
}

// Open edit drumkit modal
async function openEditDrumkitModal(id) {
    try {
        const response = await fetch(`${API_URL}/drumkits/${id}`);
        const kit = await response.json();

        document.getElementById('editDrumkitId').value = kit.id;
        document.getElementById('editDrumkitTitle').value = kit.title;
        document.getElementById('editDrumkitAuthor').value = kit.author || '@ariawave';
        document.getElementById('editDrumkitPrice').value = kit.price;
        document.getElementById('editDrumkitFreeVersion').checked = kit.free_version === 1;

        const currentCoverContainer = document.getElementById('editDrumkitCurrentCover');
        if (kit.cover_type === 'video') {
            currentCoverContainer.innerHTML = `<video src="${kit.cover}" class="file-preview" style="max-width: 200px;" controls muted></video>`;
        } else {
            currentCoverContainer.innerHTML = `<img src="${kit.cover}" class="file-preview" style="max-width: 200px;">`;
        }

        const coverPreview = document.getElementById('editDrumkitCoverPreview');
        if (coverPreview) coverPreview.innerHTML = '';
        const coverInput = document.getElementById('editDrumkitCover');
        if (coverInput) coverInput.value = '';
        const archiveInput = document.getElementById('editDrumkitArchive');
        if (archiveInput) archiveInput.value = '';
        const archiveFileName = document.getElementById('editArchiveFileName');
        if (archiveFileName) archiveFileName.textContent = '';
        document.getElementById('editDrumkitMessage').innerHTML = '';

        const modal = new bootstrap.Modal(document.getElementById('editDrumkitModal'));
        modal.show();
    } catch (error) {
        alert('Error loading drumkit data');
        console.error('Edit drumkit error:', error);
    }
}

// Preview cover in edit drumkit modal
document.getElementById('editDrumkitCover')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const preview = document.getElementById('editDrumkitCoverPreview');

    if (file && preview) {
        if (file.type.startsWith('video/')) {
            preview.innerHTML = `
                        <video controls class="file-preview" style="max-width: 300px;">
                            <source src="${URL.createObjectURL(file)}" type="${file.type}">
                        </video>
                    `;
        } else {
            preview.innerHTML = `
                        <img src="${URL.createObjectURL(file)}" class="file-preview" style="max-width: 300px;">
                    `;
        }
    } else if (preview) {
        preview.innerHTML = '';
    }
});

// Show archive filename in edit modal
document.getElementById('editDrumkitArchive')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const el = document.getElementById('editArchiveFileName');
    if (el) {
        if (file) {
            el.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        } else {
            el.textContent = '';
        }
    }
});

// Save edit drumkit
document.getElementById('saveEditDrumkitBtn')?.addEventListener('click', async function () {
    const form = document.getElementById('editDrumkitForm');
    const formData = new FormData(form);
    const drumkitId = document.getElementById('editDrumkitId').value;
    const message = document.getElementById('editDrumkitMessage');

    try {
        const response = await fetch(`${API_URL}/drumkits/${drumkitId}`, {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            message.innerHTML = '<div class="alert alert-success">✅ DrumKit updated!</div>';
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('editDrumkitModal')).hide();
                loadDrumkits();
            }, 1000);
        } else {
            message.innerHTML = `<div class="alert alert-danger">❌ Error: ${data.error}</div>`;
        }
    } catch (error) {
        message.innerHTML = '<div class="alert alert-danger">❌ Server error</div>';
        console.error('Save drumkit error:', error);
    }
});

// ============================================
// SAMPLEKIT FUNCTIONS
// ============================================

// Show archive filename
document.getElementById('samplekitArchiveInput')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const el = document.getElementById('samplekitArchiveFileName');
    if (el) {
        if (file) {
            el.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        } else {
            el.textContent = '';
        }
    }
});

// Preview samplekit cover (image or video)
document.getElementById('samplekitCoverInput')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const preview = document.getElementById('samplekitCoverPreview');

    if (file && preview) {
        if (file.type.startsWith('video/')) {
            preview.innerHTML = `
                        <video controls class="file-preview" style="max-width: 300px;">
                            <source src="${URL.createObjectURL(file)}" type="${file.type}">
                        </video>
                    `;
        } else {
            preview.innerHTML = `
                        <img src="${URL.createObjectURL(file)}" class="file-preview" style="max-width: 300px;">
                    `;
        }
    } else if (preview) {
        preview.innerHTML = '';
    }
});

// Add samplekit form
document.getElementById('addSamplekitForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const formData = new FormData(this);
    const message = document.getElementById('addSamplekitMessage');

    try {
        const response = await fetch(`${API_URL}/samplekits`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            message.innerHTML = `<div class="alert alert-success">✅ SampleKit added! ID: ${data.samplekitId}</div>`;
            this.reset();
            const preview = document.getElementById('samplekitCoverPreview');
            if (preview) preview.innerHTML = '';
            const archiveName = document.getElementById('samplekitArchiveFileName');
            if (archiveName) archiveName.textContent = '';
            loadSamplekits();
        } else {
            message.innerHTML = `<div class="alert alert-danger">❌ Error: ${data.error}</div>`;
        }
    } catch (error) {
        message.innerHTML = `<div class="alert alert-danger">❌ Server error</div>`;
    }
});

// Load samplekits
async function loadSamplekits() {
    try {
        const response = await fetch(`${API_URL}/samplekits`);
        const samplekits = await response.json();
        const list = document.getElementById('samplekitsList');

        if (samplekits.length === 0) {
            list.innerHTML = '<p class="text-center text-white-50">No samplekits yet</p>';
            return;
        }

        list.innerHTML = samplekits.map(kit => {
            let coverHTML = '';
            if (kit.cover_type === 'video') {
                coverHTML = `
                            <video src="${kit.cover}" class="beat-item" style="width:60px;height:60px;object-fit:cover;border-radius:8px;" autoplay muted loop playsinline></video>
                        `;
            } else {
                coverHTML = `
                            <img src="${kit.cover}" alt="${kit.title}" onerror="this.src='source/images/logo.png'">
                        `;
            }

            return `
                        <div class="beat-item">
                            ${coverHTML}
                            <div class="beat-item-info">
                                <h6 class="mb-1">${kit.title}</h6>
                                <small class="text-white-50">${kit.author || '@ariawave'} • $${kit.price}</small>
                                <div class="mt-1">
                                    ${kit.free_version ? '<span class="badge bg-success">Free version</span>' : '<span class="badge bg-secondary">Paid only</span>'}
                                    ${kit.cover_type === 'video' ? '<span class="badge bg-info">Video cover</span>' : ''}
                                </div>
                            </div>
                            <div class="d-flex gap-2">
                                <button class="btn btn-outline-primary btn-sm" onclick="openEditSamplekitModal(${kit.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-sm" onclick="deleteSamplekit(${kit.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
        }).join('');
    } catch (error) {
        const list = document.getElementById('samplekitsList');
        if (list) list.innerHTML = '<p class="text-center text-danger">Error loading samplekits</p>';
    }
}

// Delete samplekit
async function deleteSamplekit(id) {
    if (!confirm('Delete this samplekit?')) return;

    try {
        const response = await fetch(`${API_URL}/samplekits/${id}`, { method: 'DELETE' });
        if (response.ok) {
            loadSamplekits();
        } else {
            alert('Error deleting samplekit');
        }
    } catch (error) {
        alert('Server error');
    }
}

// Open edit samplekit modal
async function openEditSamplekitModal(id) {
    try {
        const response = await fetch(`${API_URL}/samplekits/${id}`);
        const kit = await response.json();

        document.getElementById('editSamplekitId').value = kit.id;
        document.getElementById('editSamplekitTitle').value = kit.title;
        document.getElementById('editSamplekitAuthor').value = kit.author || '@ariawave';
        document.getElementById('editSamplekitPrice').value = kit.price;
        document.getElementById('editSamplekitFreeVersion').checked = kit.free_version === 1;

        const currentCoverContainer = document.getElementById('editSamplekitCurrentCover');
        if (kit.cover_type === 'video') {
            currentCoverContainer.innerHTML = `<video src="${kit.cover}" class="file-preview" style="max-width: 200px;" controls muted></video>`;
        } else {
            currentCoverContainer.innerHTML = `<img src="${kit.cover}" class="file-preview" style="max-width: 200px;">`;
        }

        const coverPreview = document.getElementById('editSamplekitCoverPreview');
        if (coverPreview) coverPreview.innerHTML = '';
        const coverInput = document.getElementById('editSamplekitCover');
        if (coverInput) coverInput.value = '';
        const archiveInput = document.getElementById('editSamplekitArchive');
        if (archiveInput) archiveInput.value = '';
        const archiveFileName = document.getElementById('editSamplekitArchiveFileName');
        if (archiveFileName) archiveFileName.textContent = '';
        document.getElementById('editSamplekitMessage').innerHTML = '';

        const modal = new bootstrap.Modal(document.getElementById('editSamplekitModal'));
        modal.show();
    } catch (error) {
        alert('Error loading samplekit data');
        console.error('Edit samplekit error:', error);
    }
}

// Preview cover in edit samplekit modal
document.getElementById('editSamplekitCover')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const preview = document.getElementById('editSamplekitCoverPreview');

    if (file && preview) {
        if (file.type.startsWith('video/')) {
            preview.innerHTML = `
                        <video controls class="file-preview" style="max-width: 300px;">
                            <source src="${URL.createObjectURL(file)}" type="${file.type}">
                        </video>
                    `;
        } else {
            preview.innerHTML = `
                        <img src="${URL.createObjectURL(file)}" class="file-preview" style="max-width: 300px;">
                    `;
        }
    } else if (preview) {
        preview.innerHTML = '';
    }
});

// Show archive filename in edit modal
document.getElementById('editSamplekitArchive')?.addEventListener('change', function (e) {
    const file = e.target.files[0];
    const el = document.getElementById('editSamplekitArchiveFileName');
    if (el) {
        if (file) {
            el.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        } else {
            el.textContent = '';
        }
    }
});

// Save edit samplekit
document.getElementById('saveEditSamplekitBtn')?.addEventListener('click', async function () {
    const form = document.getElementById('editSamplekitForm');
    const formData = new FormData(form);
    const samplekitId = document.getElementById('editSamplekitId').value;
    const message = document.getElementById('editSamplekitMessage');

    try {
        const response = await fetch(`${API_URL}/samplekits/${samplekitId}`, {
            method: 'PUT',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            message.innerHTML = '<div class="alert alert-success">✅ SampleKit updated!</div>';
            setTimeout(() => {
                bootstrap.Modal.getInstance(document.getElementById('editSamplekitModal')).hide();
                loadSamplekits();
            }, 1000);
        } else {
            message.innerHTML = `<div class="alert alert-danger">❌ Error: ${data.error}</div>`;
        }
    } catch (error) {
        message.innerHTML = '<div class="alert alert-danger">❌ Server error</div>';
        console.error('Save samplekit error:', error);
    }
});

// ============================================
// ORDERS FUNCTIONS
// ============================================

let currentOrderFilter = 'all';
let currentDateSort = 'newest';

async function loadOrders(statusFilter = 'all', dateSort = 'newest') {
    try {
        currentOrderFilter = statusFilter;
        currentDateSort = dateSort;

        // Сохраняем значения в select
        const statusSelect = document.getElementById('orderStatusFilter');
        const dateSelect = document.getElementById('orderDateSort');
        if (statusSelect) statusSelect.value = statusFilter;
        if (dateSelect) dateSelect.value = dateSort;

        let url = `${API_URL}/orders`;
        const params = new URLSearchParams();

        if (statusFilter && statusFilter !== 'all') {
            params.append('status', statusFilter);
        }
        if (dateSort) {
            params.append('sort', dateSort);
        }

        if (params.toString()) {
            url += '?' + params.toString();
        }

        const response = await fetch(url);
        const orders = await response.json();
        const list = document.getElementById('ordersList');
        const countEl = document.getElementById('ordersCount');

        if (countEl) {
            countEl.textContent = `${orders.length} order${orders.length !== 1 ? 's' : ''}`;
        }

        if (orders.length === 0) {
            list.innerHTML = '<p class="text-center text-white-50">No orders found</p>';
            return;
        }

        list.innerHTML = await Promise.all(orders.map(async order => {
            let items = [];
            try {
                items = JSON.parse(order.items);
            } catch (e) {
                items = [];
            }

            const itemsWithDetails = await Promise.all(items.map(async item => {
                let cover = 'source/images/logo.png';
                let title = item.title || 'Unknown';
                let coverType = item.coverType || 'image';

                const itemId = item.id || item.beatId;
                const itemType = item.type;

                if (itemType === 'beat' && itemId) {
                    try {
                        const beatRes = await fetch(`${API_URL}/beats/${itemId}`);
                        const beat = await beatRes.json();
                        cover = beat.cover || cover;
                        title = beat.title || title;
                        coverType = 'image';
                    } catch (e) { }
                } else if (itemType === 'drumkit' && itemId) {
                    try {
                        const kitRes = await fetch(`${API_URL}/drumkits/${itemId}`);
                        const kit = await kitRes.json();
                        cover = kit.cover || cover;
                        title = kit.title || title;
                        coverType = kit.cover_type || 'image';
                    } catch (e) { }
                } else if (itemType === 'samplekit' && itemId) {
                    try {
                        const kitRes = await fetch(`${API_URL}/samplekits/${itemId}`);
                        const kit = await kitRes.json();
                        cover = kit.cover || cover;
                        title = kit.title || title;
                        coverType = kit.cover_type || 'image';
                    } catch (e) { }
                }

                return { ...item, cover, title, coverType };
            }));

            let statusBadge = '';
            if (order.status === 'paid') {
                statusBadge = '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Paid</span>';
            } else if (order.status === 'completed') {
                statusBadge = '<span class="badge bg-primary"><i class="fas fa-check-double me-1"></i>Completed</span>';
            } else if (order.status === 'cancelled') {
                statusBadge = '<span class="badge bg-danger"><i class="fas fa-times me-1"></i>Cancelled</span>';
            } else {
                statusBadge = '<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Pending</span>';
            }

            let actionButtons = '';
            if (order.status !== 'completed' && order.status !== 'cancelled') {
                actionButtons = `
                    <div class="mt-2 d-flex gap-2">
                        ${order.status === 'paid' ? `
                            <button class="btn btn-sm btn-success" onclick="completeOrder(${order.id})">
                                <i class="fas fa-check me-1"></i>Complete
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick="cancelOrder(${order.id})">
                            <i class="fas fa-times me-1"></i>Cancel
                        </button>
                    </div>
                `;
            }

            return `
                <div class="order-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 20px; margin-bottom: 15px;">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h6 class="mb-1">Order #${order.id} ${statusBadge}</h6>
                            <small class="text-white-50">${order.email || 'No email'}</small>
                        </div>
                        <small class="text-white-50">${new Date(order.created_at).toLocaleString()}</small>
                    </div>
                    
                    <div class="order-items mb-3">
                        ${itemsWithDetails.map(item => {
                const mediaHTML = item.coverType === 'video'
                    ? `<video src="${item.cover}" autoplay muted loop playsinline 
                                           onerror="this.style.display='none'"
                                           style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; margin-right: 12px;">
                                   </video>`
                    : `<img src="${item.cover}" alt="${item.title}" 
                                          onerror="this.src='source/images/logo.png'"
                                          style="width: 50px; height: 50px; object-fit: cover; border-radius: 6px; margin-right: 12px;">`;

                return `
                                <div class="d-flex align-items-center mb-2" style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                                    ${mediaHTML}
                                    <div class="flex-grow-1">
                                        <div class="fw-bold">${item.title}</div>
                                        <small class="text-white-50">${item.licenseType || item.licenseName || 'Full'}</small>
                                    </div>
                                    <div class="text-end">
                                        <div class="fw-bold text-danger">$${item.price.toFixed(2)}</div>
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center border-top border-secondary pt-2">
                        <div>
                            ${order.promo_code ? `<span class="badge bg-success me-2">Promo: ${order.promo_code}</span>` : ''}
                            ${order.payment_method === 'crypto' ? `<span class="badge bg-info">${order.crypto_currency || 'Crypto'}</span>` : ''}
                        </div>
                        <div class="text-end">
                            <div class="small text-white-50">Total:</div>
                            <div class="fs-5 fw-bold text-danger">$${order.total.toFixed(2)}</div>
                        </div>
                    </div>
                    
                    ${actionButtons}
                </div>
            `;
        }));
    } catch (error) {
        console.error('Error loading orders:', error);
        const list = document.getElementById('ordersList');
        if (list) list.innerHTML = '<p class="text-center text-danger">Error loading orders</p>';
    }
}

// Complete и Cancel функции
async function completeOrder(orderId) {
    if (!confirm('Mark order #' + orderId + ' as completed?')) return;
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            loadOrders(currentOrderFilter, currentDateSort);
        } else {
            alert('Error completing order');
        }
    } catch (error) {
        alert('Server error');
    }
}

async function cancelOrder(orderId) {
    if (!confirm('Cancel order #' + orderId + '? This cannot be undone.')) return;
    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
            loadOrders(currentOrderFilter, currentDateSort);
        } else {
            alert('Error cancelling order');
        }
    } catch (error) {
        alert('Server error');
    }
}

// Завершить заказ
async function completeOrder(orderId) {
    if (!confirm('Mark order #' + orderId + ' as completed?')) return;

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            loadOrders(currentOrderFilter);
        } else {
            alert('Error completing order');
        }
    } catch (error) {
        alert('Server error');
    }
}

// Отменить заказ
async function cancelOrder(orderId) {
    if (!confirm('Cancel order #' + orderId + '? This cannot be undone.')) return;

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            loadOrders(currentOrderFilter);
        } else {
            alert('Error cancelling order');
        }
    } catch (error) {
        alert('Server error');
    }
}

// Завершить заказ
async function completeOrder(orderId) {
    if (!confirm('Mark order #' + orderId + ' as completed?')) return;

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            loadOrders();
        } else {
            alert('Error completing order');
        }
    } catch (error) {
        alert('Server error');
    }
}

// Отменить заказ
async function cancelOrder(orderId) {
    if (!confirm('Cancel order #' + orderId + '? This cannot be undone.')) return;

    try {
        const response = await fetch(`${API_URL}/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            loadOrders();
        } else {
            alert('Error cancelling order');
        }
    } catch (error) {
        alert('Server error');
    }
}


// ============================================
// TAB HANDLERS
// ============================================

document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
    tab.addEventListener('shown.bs.tab', function (e) {
        const href = e.target.getAttribute('href');
        if (href === '#manageBeats') loadBeats();
        if (href === '#manageDrumkits') loadDrumkits();
        if (href === '#manageSamplekits') loadSamplekits();
        if (href === '#orders') loadOrders(currentOrderFilter || 'all');
    });
});

// Фильтры заказов
document.getElementById('orderStatusFilter')?.addEventListener('change', function(e) {
    loadOrders(e.target.value, currentDateSort);
});

document.getElementById('orderDateSort')?.addEventListener('change', function(e) {
    loadOrders(currentOrderFilter, e.target.value);
});

// Обновите tab handlers
document.querySelectorAll('[data-bs-toggle="tab"]').forEach(tab => {
    tab.addEventListener('shown.bs.tab', function (e) {
        const href = e.target.getAttribute('href');
        if (href === '#manageBeats') loadBeats();
        if (href === '#manageDrumkits') loadDrumkits();
        if (href === '#manageSamplekits') loadSamplekits();
        if (href === '#orders') loadOrders(currentOrderFilter, currentDateSort);
    });
});
// ============================================
// LOGOUT
// ============================================

async function logout() {
    try {
        await fetch(`${API_URL}/logout`, { method: 'POST' });
    } catch (error) { }
    window.location.href = '/login.html';
}

// Initial load
loadBeats();
