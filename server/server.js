//.env
require('dotenv').config();

//
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 80;

app.use(cors());
app.use(bodyParser.json());
// Логирование всех запросов
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ============================================
// СЕССИИ И АВТОРИЗАЦИЯ (ДО роутов!)
// ============================================

app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

// Данные администратора
const ADMIN = {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin'
};

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    res.status(401).json({ error: 'Unauthorized' });
}

// ============================================
// API АВТОРИЗАЦИИ
// ============================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN.username && password === ADMIN.password) {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/check-auth', (req, res) => {
    res.json({ isAuthenticated: req.session && req.session.isAdmin });
});

// ============================================
// НАСТРОЙКА ЗАГРУЗКИ ФАЙЛОВ
// ============================================
const uploadsDir = path.join(__dirname, '..', 'source');

// Создаём папки если их нет
if (!fs.existsSync(path.join(uploadsDir, 'audio'))) {
    fs.mkdirSync(path.join(uploadsDir, 'audio'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadsDir, 'images', 'beats'))) {
    fs.mkdirSync(path.join(uploadsDir, 'images', 'beats'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadsDir, 'images', 'drumkits'))) {
    fs.mkdirSync(path.join(uploadsDir, 'images', 'drumkits'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadsDir, 'videos', 'drumkits'))) {
    fs.mkdirSync(path.join(uploadsDir, 'videos', 'drumkits'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadsDir, 'archives'))) {
    fs.mkdirSync(path.join(uploadsDir, 'archives'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadsDir, 'images', 'samplekits'))) {
    fs.mkdirSync(path.join(uploadsDir, 'images', 'samplekits'), { recursive: true });
}
if (!fs.existsSync(path.join(uploadsDir, 'videos', 'samplekits'))) {
    fs.mkdirSync(path.join(uploadsDir, 'videos', 'samplekits'), { recursive: true });
}

// Функция для создания slug из названия
function createSlug(text) {
    if (!text) return 'file';
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50) || 'file';
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            if (file.fieldname === 'audio') {
                cb(null, path.join(uploadsDir, 'audio'));
            } else if (file.fieldname === 'cover') {
                cb(null, path.join(uploadsDir, 'images', 'beats'));
            } else if (file.fieldname === 'drumkit_cover') {
                if (file.mimetype.startsWith('video/')) {
                    cb(null, path.join(uploadsDir, 'videos', 'drumkits'));
                } else {
                    cb(null, path.join(uploadsDir, 'images', 'drumkits'));
                }
            }
            else if (file.fieldname === 'samplekit_cover') {
                if (file.mimetype.startsWith('video/')) {
                    cb(null, path.join(uploadsDir, 'videos', 'samplekits'));
                } else {
                    cb(null, path.join(uploadsDir, 'images', 'samplekits'));
                }
            }
            // ===== КОНЕЦ БЛОКА =====
            else if (file.fieldname === 'archive') {
                cb(null, path.join(uploadsDir, 'archives'));
            } else {
                cb(null, uploadsDir);
            }
        },
        filename: (req, file, cb) => {
            // Получаем название из запроса
            const title = req.body.title || 'file';
            const slug = createSlug(title);
            const timestamp = Date.now();
            const random = Math.round(Math.random() * 1E9);
            const ext = path.extname(file.originalname);

            // Формируем уникальное имя: slug-timestamp-random.ext
            const uniqueName = `${slug}-${timestamp}-${random}${ext}`;
            cb(null, uniqueName);
        }
    }),
    limits: {
        fileSize: 200 * 1024 * 1024 // 200MB max
    }
});

// ============================================
// API ДЛЯ БИТОВ
// ============================================

// Получить все биты
app.get('/api/beats', (req, res) => {
    db.all('SELECT * FROM beats ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Получить один бит
app.get('/api/beats/:id', (req, res) => {
    db.get('SELECT * FROM beats WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Beat not found' });
            return;
        }
        res.json(row);
    });
});

// Добавить бит
app.post('/api/beats',
    requireAuth,
    upload.fields([
        { name: 'audio', maxCount: 1 },
        { name: 'cover', maxCount: 1 }
    ]),
    (req, res) => {
        if (!req.files || !req.files.audio) {
            return res.status(400).json({ error: 'Audio file is required' });
        }

        const { title, artist, bpm, key_signature, price_tagged, price_untagged, price_exclusive, popular } = req.body;

        const audioFile = req.files.audio[0];
        const coverFile = req.files.cover ? req.files.cover[0] : null;

        const audioPath = `source/audio/${audioFile.filename}`;
        const coverPath = coverFile
            ? `source/images/beats/${coverFile.filename}`
            : 'source/images/default-cover.jpg';

        console.log('📁 Audio saved to:', audioPath);
        console.log('🖼️ Cover saved to:', coverPath);

        const sql = `INSERT INTO beats (title, artist, bpm, key_signature, cover, audio, price_tagged, price_untagged, price_exclusive, popular) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            title,
            artist,
            parseInt(bpm),
            key_signature,
            coverPath,
            audioPath,
            parseFloat(price_tagged),
            parseFloat(price_untagged),
            parseFloat(price_exclusive),
            popular === 'true' || popular === 'on' || popular === '1' ? 1 : 0
        ];

        db.run(sql, params, function (err) {
            if (err) {
                console.error('❌ DB Error:', err.message);
                res.status(500).json({ error: err.message });
                return;
            }

            res.json({
                message: 'Beat added successfully',
                beatId: this.lastID,
                audio: audioPath,
                cover: coverPath
            });
        });
    }
);

// Удалить бит
app.delete('/api/beats/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM beats WHERE id = ?', [req.params.id], (err, beat) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!beat) {
            return res.status(404).json({ error: 'Beat not found' });
        }

        if (beat.audio && beat.audio !== 'source/audio/') {
            const audioPath = path.join(__dirname, '..', beat.audio);
            if (fs.existsSync(audioPath)) {
                fs.unlinkSync(audioPath);
            }
        }

        if (beat.cover && beat.cover !== 'source/images/default-cover.jpg') {
            const coverPath = path.join(__dirname, '..', beat.cover);
            if (fs.existsSync(coverPath)) {
                fs.unlinkSync(coverPath);
            }
        }

        db.run('DELETE FROM beats WHERE id = ?', [req.params.id], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Beat deleted', deletedId: req.params.id });
        });
    });
});

// Обновить бит
app.put('/api/beats/:id',
    requireAuth,
    upload.fields([
        { name: 'cover', maxCount: 1 }
    ]),
    (req, res) => {
        const { title, artist, bpm, key_signature, price_tagged, price_untagged, price_exclusive, popular } = req.body;

        let coverPath = null;
        if (req.files && req.files.cover) {
            const coverFile = req.files.cover[0];
            coverPath = `source/images/beats/${coverFile.filename}`;

            db.get('SELECT cover FROM beats WHERE id = ?', [req.params.id], (err, row) => {
                if (row && row.cover && row.cover !== 'source/images/default-cover.jpg') {
                    const oldCover = path.join(__dirname, '..', row.cover);
                    if (fs.existsSync(oldCover)) {
                        fs.unlinkSync(oldCover);
                    }
                }
            });
        }

        let sql, params;

        if (coverPath) {
            sql = `UPDATE beats SET title=?, artist=?, bpm=?, key_signature=?, cover=?, 
                   price_tagged=?, price_untagged=?, price_exclusive=?, popular=? WHERE id=?`;
            params = [
                title, artist, parseInt(bpm), key_signature, coverPath,
                parseFloat(price_tagged), parseFloat(price_untagged), parseFloat(price_exclusive),
                popular === 'true' || popular === 'on' || popular === '1' ? 1 : 0,
                req.params.id
            ];
        } else {
            sql = `UPDATE beats SET title=?, artist=?, bpm=?, key_signature=?, 
                   price_tagged=?, price_untagged=?, price_exclusive=?, popular=? WHERE id=?`;
            params = [
                title, artist, parseInt(bpm), key_signature,
                parseFloat(price_tagged), parseFloat(price_untagged), parseFloat(price_exclusive),
                popular === 'true' || popular === 'on' || popular === '1' ? 1 : 0,
                req.params.id
            ];
        }

        db.run(sql, params, function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: 'Beat updated successfully',
                beatId: req.params.id,
                cover: coverPath
            });
        });
    }
);

// ============================================
// API ДЛЯ DRUMKITS
// ============================================

// Получить все drumkits
app.get('/api/drumkits', (req, res) => {
    db.all('SELECT * FROM drumkits ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Получить один drumkit
app.get('/api/drumkits/:id', (req, res) => {
    db.get('SELECT * FROM drumkits WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Drumkit not found' });
        }
        res.json(row);
    });
});

// Добавить drumkit
app.post('/api/drumkits', requireAuth,
    upload.fields([
        { name: 'archive', maxCount: 1 },
        { name: 'drumkit_cover', maxCount: 1 }
    ]),
    (req, res) => {
        if (!req.files || !req.files.archive) {
            return res.status(400).json({ error: 'Archive file is required' });
        }

        const { title, author, price, free_version } = req.body;

        const archiveFile = req.files.archive[0];
        const coverFile = req.files.drumkit_cover ? req.files.drumkit_cover[0] : null;

        const archivePath = `source/archives/${archiveFile.filename}`;

        let coverPath, coverType;
        if (coverFile) {
            if (coverFile.mimetype.startsWith('video/')) {
                coverPath = `source/videos/drumkits/${coverFile.filename}`;
                coverType = 'video';
            } else {
                coverPath = `source/images/drumkits/${coverFile.filename}`;
                coverType = 'image';
            }
        } else {
            coverPath = 'source/images/default-cover.png';
            coverType = 'image';
        }

        console.log('📦 Archive saved to:', archivePath);
        console.log('🖼️ Cover saved to:', coverPath);
        console.log('📹 Cover type:', coverType);
        console.log('📝 Original filename:', coverFile ? coverFile.originalname : 'none');
        console.log('📝 New filename:', coverFile ? coverFile.filename : 'none');

        const sql = `INSERT INTO drumkits (title, author, cover, cover_type, archive, price, free_version, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            title,
            author || '@ariawave',
            coverPath,
            coverType,
            archivePath,
            parseFloat(price) || 29.99,
            free_version === 'true' || free_version === 'on' ? 1 : 0,
            new Date().toISOString()
        ];

        db.run(sql, params, function (err) {
            if (err) {
                console.error('❌ DB Error:', err.message);
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: 'DrumKit added successfully',
                drumkitId: this.lastID,
                coverPath: coverPath,
                coverType: coverType
            });
        });
    }
);

// Удалить drumkit
app.delete('/api/drumkits/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM drumkits WHERE id = ?', [req.params.id], (err, kit) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!kit) return res.status(404).json({ error: 'Drumkit not found' });

        if (kit.archive) {
            const archivePath = path.join(__dirname, '..', kit.archive);
            if (fs.existsSync(archivePath)) {
                fs.unlinkSync(archivePath);
            }
        }

        if (kit.cover && kit.cover !== 'source/images/default-cover.png') {
            const coverPath = path.join(__dirname, '..', kit.cover);
            if (fs.existsSync(coverPath)) {
                fs.unlinkSync(coverPath);
            }
        }

        db.run('DELETE FROM drumkits WHERE id = ?', [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Drumkit deleted', deletedId: req.params.id });
        });
    });
});

// Скачать drumkit
app.get('/api/drumkits/:id/download', (req, res) => {
    db.get('SELECT * FROM drumkits WHERE id = ?', [req.params.id], (err, kit) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!kit) return res.status(404).json({ error: 'Drumkit not found' });

        const archivePath = path.join(__dirname, '..', kit.archive);

        if (!fs.existsSync(archivePath)) {
            return res.status(404).json({ error: 'Archive file not found' });
        }

        res.download(archivePath, `${kit.title}.zip`);
    });
});

// Обновить drumkit
app.put('/api/drumkits/:id', requireAuth,
    upload.fields([
        { name: 'archive', maxCount: 1 },
        { name: 'drumkit_cover', maxCount: 1 }
    ]),
    (req, res) => {
        const { title, author, price, free_version } = req.body;

        let archivePath = null;
        let coverPath = null;
        let coverType = null;

        if (req.files && req.files.archive) {
            const archiveFile = req.files.archive[0];
            archivePath = `source/archives/${archiveFile.filename}`;

            db.get('SELECT archive FROM drumkits WHERE id = ?', [req.params.id], (err, row) => {
                if (row && row.archive) {
                    const oldArchive = path.join(__dirname, '..', row.archive);
                    if (fs.existsSync(oldArchive)) {
                        fs.unlinkSync(oldArchive);
                    }
                }
            });
        }

        if (req.files && req.files.drumkit_cover) {
            const coverFile = req.files.drumkit_cover[0];

            if (coverFile.mimetype.startsWith('video/')) {
                coverPath = `source/videos/drumkits/${coverFile.filename}`;
                coverType = 'video';
            } else {
                coverPath = `source/images/drumkits/${coverFile.filename}`;
                coverType = 'image';
            }

            db.get('SELECT cover, cover_type FROM drumkits WHERE id = ?', [req.params.id], (err, row) => {
                if (row && row.cover && row.cover !== 'source/images/default-cover.png') {
                    const oldCover = path.join(__dirname, '..', row.cover);
                    if (fs.existsSync(oldCover)) {
                        fs.unlinkSync(oldCover);
                    }
                }
            });
        }

        let sql, params;

        if (archivePath && coverPath && coverType) {
            sql = `UPDATE drumkits SET title=?, author=?, cover=?, cover_type=?, archive=?, price=?, free_version=? WHERE id=?`;
            params = [
                title, author || '@ariawave', coverPath, coverType, archivePath,
                parseFloat(price) || 29.99,
                free_version === 'true' || free_version === 'on' ? 1 : 0,
                req.params.id
            ];
        } else if (archivePath) {
            sql = `UPDATE drumkits SET title=?, author=?, archive=?, price=?, free_version=? WHERE id=?`;
            params = [
                title, author || '@ariawave', archivePath,
                parseFloat(price) || 29.99,
                free_version === 'true' || free_version === 'on' ? 1 : 0,
                req.params.id
            ];
        } else if (coverPath && coverType) {
            sql = `UPDATE drumkits SET title=?, author=?, cover=?, cover_type=?, price=?, free_version=? WHERE id=?`;
            params = [
                title, author || '@ariawave', coverPath, coverType,
                parseFloat(price) || 29.99,
                free_version === 'true' || free_version === 'on' ? 1 : 0,
                req.params.id
            ];
        } else {
            sql = `UPDATE drumkits SET title=?, author=?, price=?, free_version=? WHERE id=?`;
            params = [
                title, author || '@ariawave',
                parseFloat(price) || 29.99,
                free_version === 'true' || free_version === 'on' ? 1 : 0,
                req.params.id
            ];
        }

        db.run(sql, params, function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: 'DrumKit updated successfully',
                drumkitId: req.params.id
            });
        });
    }
);
// ============================================
// API ДЛЯ SAMPLEKITS
// ============================================

// Получить все samplekits
app.get('/api/samplekits', (req, res) => {
    db.all('SELECT * FROM samplekits ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Получить один samplekit
app.get('/api/samplekits/:id', (req, res) => {
    db.get('SELECT * FROM samplekits WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: 'Samplekit not found' });
        }
        res.json(row);
    });
});

// Добавить samplekit
app.post('/api/samplekits', requireAuth,
    upload.fields([
        { name: 'archive', maxCount: 1 },
        { name: 'samplekit_cover', maxCount: 1 }
    ]),
    (req, res) => {
        if (!req.files || !req.files.archive) {
            return res.status(400).json({ error: 'Archive file is required' });
        }

        const { title, author, price, free_version } = req.body;

        const archiveFile = req.files.archive[0];
        const coverFile = req.files.samplekit_cover ? req.files.samplekit_cover[0] : null;

        const archivePath = `source/archives/${archiveFile.filename}`;

        let coverPath, coverType;
        if (coverFile) {
            if (coverFile.mimetype.startsWith('video/')) {
                coverPath = `source/videos/samplekits/${coverFile.filename}`;
                coverType = 'video';
            } else {
                coverPath = `source/images/samplekits/${coverFile.filename}`;
                coverType = 'image';
            }
        } else {
            coverPath = 'source/images/default-cover.png';
            coverType = 'image';
        }

        console.log('📦 SampleKit Archive saved to:', archivePath);
        console.log('🖼️ SampleKit Cover saved to:', coverPath);
        console.log('📹 Cover type:', coverType);

        const sql = `INSERT INTO samplekits (title, author, cover, cover_type, archive, price, free_version, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            title,
            author || '@ariawave',
            coverPath,
            coverType,
            archivePath,
            parseFloat(price) || 19.99,
            free_version === 'true' || free_version === 'on' ? 1 : 0,
            new Date().toISOString()
        ];

        db.run(sql, params, function (err) {
            if (err) {
                console.error('❌ DB Error:', err.message);
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: 'SampleKit added successfully',
                samplekitId: this.lastID,
                coverPath: coverPath,
                coverType: coverType
            });
        });
    }
);

// Удалить samplekit
app.delete('/api/samplekits/:id', requireAuth, (req, res) => {
    db.get('SELECT * FROM samplekits WHERE id = ?', [req.params.id], (err, kit) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!kit) return res.status(404).json({ error: 'Samplekit not found' });

        if (kit.archive) {
            const archivePath = path.join(__dirname, '..', kit.archive);
            if (fs.existsSync(archivePath)) {
                fs.unlinkSync(archivePath);
            }
        }

        if (kit.cover && kit.cover !== 'source/images/default-cover.png') {
            const coverPath = path.join(__dirname, '..', kit.cover);
            if (fs.existsSync(coverPath)) {
                fs.unlinkSync(coverPath);
            }
        }

        db.run('DELETE FROM samplekits WHERE id = ?', [req.params.id], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Samplekit deleted', deletedId: req.params.id });
        });
    });
});

// Скачать samplekit
app.get('/api/samplekits/:id/download', (req, res) => {
    db.get('SELECT * FROM samplekits WHERE id = ?', [req.params.id], (err, kit) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!kit) return res.status(404).json({ error: 'Samplekit not found' });

        const archivePath = path.join(__dirname, '..', kit.archive);

        if (!fs.existsSync(archivePath)) {
            return res.status(404).json({ error: 'Archive file not found' });
        }

        res.download(archivePath, `${kit.title}.zip`);
    });
});

// Обновить samplekit
app.put('/api/samplekits/:id', requireAuth,
    upload.fields([
        { name: 'archive', maxCount: 1 },
        { name: 'samplekit_cover', maxCount: 1 }
    ]),
    (req, res) => {
        const { title, author, price, free_version } = req.body;

        let archivePath = null;
        let coverPath = null;
        let coverType = null;

        if (req.files && req.files.archive) {
            const archiveFile = req.files.archive[0];
            archivePath = `source/archives/${archiveFile.filename}`;

            db.get('SELECT archive FROM samplekits WHERE id = ?', [req.params.id], (err, row) => {
                if (row && row.archive) {
                    const oldArchive = path.join(__dirname, '..', row.archive);
                    if (fs.existsSync(oldArchive)) {
                        fs.unlinkSync(oldArchive);
                    }
                }
            });
        }

        if (req.files && req.files.samplekit_cover) {
            const coverFile = req.files.samplekit_cover[0];

            if (coverFile.mimetype.startsWith('video/')) {
                coverPath = `source/videos/samplekits/${coverFile.filename}`;
                coverType = 'video';
            } else {
                coverPath = `source/images/samplekits/${coverFile.filename}`;
                coverType = 'image';
            }

            db.get('SELECT cover, cover_type FROM samplekits WHERE id = ?', [req.params.id], (err, row) => {
                if (row && row.cover && row.cover !== 'source/images/default-cover.png') {
                    const oldCover = path.join(__dirname, '..', row.cover);
                    if (fs.existsSync(oldCover)) {
                        fs.unlinkSync(oldCover);
                    }
                }
            });
        }

        let sql, params;

        if (archivePath && coverPath && coverType) {
            sql = `UPDATE samplekits SET title=?, author=?, cover=?, cover_type=?, archive=?, price=?, free_version=? WHERE id=?`;
            params = [
                title, author || '@ariawave', coverPath, coverType, archivePath,
                parseFloat(price) || 19.99,
                free_version === 'true' || free_version === 'on' ? 1 : 0,
                req.params.id
            ];
        } else if (archivePath) {
            sql = `UPDATE samplekits SET title=?, author=?, archive=?, price=?, free_version=? WHERE id=?`;
            params = [
                title, author || '@ariawave', archivePath,
                parseFloat(price) || 19.99,
                free_version === 'true' || free_version === 'on' ? 1 : 0,
                req.params.id
            ];
        } else if (coverPath && coverType) {
            sql = `UPDATE samplekits SET title=?, author=?, cover=?, cover_type=?, price=?, free_version=? WHERE id=?`;
            params = [
                title, author || '@ariawave', coverPath, coverType,
                parseFloat(price) || 19.99,
                free_version === 'true' || free_version === 'on' ? 1 : 0,
                req.params.id
            ];
        } else {
            sql = `UPDATE samplekits SET title=?, author=?, price=?, free_version=? WHERE id=?`;
            params = [
                title, author || '@ariawave',
                parseFloat(price) || 19.99,
                free_version === 'true' || free_version === 'on' ? 1 : 0,
                req.params.id
            ];
        }

        db.run(sql, params, function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: 'SampleKit updated successfully',
                samplekitId: req.params.id
            });
        });
    }
);
// ============================================
// API ДЛЯ ПРОМОКОДОВ
// ============================================
app.get('/api/promocodes', (req, res) => {
    db.all('SELECT code, discount, type, description FROM promocodes WHERE active = 1', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/promocodes/apply', (req, res) => {
    const { code } = req.body;

    if (!code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    db.get('SELECT * FROM promocodes WHERE code = ? AND active = 1', [code.toUpperCase()], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            return res.status(404).json({ error: 'Invalid promo code' });
        }

        if (row.expires_at && new Date(row.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Promo code expired' });
        }

        res.json({
            code: row.code,
            discount: row.discount,
            type: row.type,
            description: row.description
        });
    });
});

// ============================================
// API ДЛЯ ЗАКАЗОВ
// ============================================
app.post('/api/orders', (req, res) => {
    const { items, total, promoCode, email } = req.body;

    const sql = 'INSERT INTO orders (items, total, promo_code, email, created_at) VALUES (?, ?, ?, ?, ?)';
    const params = [JSON.stringify(items), total, promoCode || null, email || null, new Date().toISOString()];

    db.run(sql, params, function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({
            message: 'Order created successfully',
            orderId: this.lastID
        });
    });
});

app.get('/api/orders', requireAuth, (req, res) => {
    const { status, sort } = req.query;

    let sql = 'SELECT * FROM orders';
    let params = [];

    if (status && status !== 'all') {
        sql += ' WHERE status = ?';
        params.push(status);
    }

    // Сортировка по дате
    if (sort === 'oldest') {
        sql += ' ORDER BY created_at ASC';
    } else {
        sql += ' ORDER BY created_at DESC';
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
// Обновить статус заказа на "completed"
app.put('/api/orders/:id/complete', requireAuth, (req, res) => {
    const orderId = req.params.id;

    db.run(`UPDATE orders SET status = 'completed', paid_at = ? WHERE id = ?`,
        [new Date().toISOString(), orderId],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            res.json({ message: 'Order completed', orderId });
        }
    );
});

// ============================================
// UPDATE ORDER STATUS
// ============================================

// Завершить заказ
app.put('/api/orders/:id/complete', requireAuth, (req, res) => {
    const orderId = req.params.id;

    db.run(`UPDATE orders SET status = 'completed', paid_at = ? WHERE id = ?`,
        [new Date().toISOString(), orderId],
        function (err) {
            if (err) {
                console.error('Error completing order:', err);
                return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            console.log(`✅ Order #${orderId} marked as completed`);
            res.json({ message: 'Order completed', orderId });
        }
    );
});

// Отменить заказ
app.put('/api/orders/:id/cancel', requireAuth, (req, res) => {
    const orderId = req.params.id;

    db.run(`UPDATE orders SET status = 'cancelled' WHERE id = ?`,
        [orderId],
        function (err) {
            if (err) {
                console.error('Error cancelling order:', err);
                return res.status(500).json({ error: err.message });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            console.log(`❌ Order #${orderId} cancelled`);
            res.json({ message: 'Order cancelled', orderId });
        }
    );
});
// ============================================
// CRYPTO PAYMENTS (TryBit)
// ============================================
const TryBitPayment = require('./trybit');
// 🔍 Логирование для отладки (ключи маскируются)
console.log('🔑 TryBit Configuration:');
console.log('  - API Key:', process.env.TRYBIT_API_KEY ? 
    process.env.TRYBIT_API_KEY.substring(0, 10) + '...' : '❌ NOT SET');
console.log('  - Shop ID:', process.env.TRYBIT_SHOP_ID || '❌ NOT SET');
console.log('  - Secret Key:', process.env.TRYBIT_SECRET_KEY ? 
    process.env.TRYBIT_SECRET_KEY.substring(0, 10) + '...' : '❌ NOT SET');

const trybit = new TryBitPayment(
    process.env.TRYBIT_API_KEY,
    process.env.TRYBIT_SHOP_ID,
    process.env.TRYBIT_SECRET_KEY
);

// Создать крипто-платёж
app.post('/api/crypto/create', async (req, res) => {
    console.log('🔔 Crypto create request received');
    console.log('📦 Request body:', req.body);
    console.log('📦 Headers:', req.headers);

    const { orderId, amount, email, cryptocurrency } = req.body;

    console.log('🔍 Parsed values:');
    console.log('  - orderId:', orderId, typeof orderId);
    console.log('  - amount:', amount, typeof amount);
    console.log('  - email:', email, typeof email);
    console.log('  - cryptocurrency:', cryptocurrency);

    if (!orderId || !amount || !email) {
        console.error('❌ Missing required fields!');
        console.error('  orderId:', orderId);
        console.error('  amount:', amount);
        console.error('  email:', email);

        return res.status(400).json({
            error: 'Order ID, amount and email are required',
            received: { orderId, amount, email }
        });
    }

    try {
        // Создаём инвойс в TryBit
        const invoice = await trybit.createInvoice(
            parseFloat(amount),
            orderId,
            email,
            cryptocurrency
        );

        // Сохраняем в БД
        const sql = `INSERT INTO crypto_payments 
                     (order_id, invoice_uuid, invoice_status, amount_usd, 
                      pay_currency, pay_address, payment_link, status, created_at) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`;

        db.run(sql, [
            orderId,
            invoice.uuid,
            invoice.status,
            amount,
            invoice.currency?.code || null,
            invoice.address || null,
            invoice.link,
            new Date().toISOString()
        ], function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Обновляем заказ
            db.run('UPDATE orders SET payment_id = ?, payment_method = ? WHERE id = ?',
                [invoice.uuid, 'crypto', orderId]);

            res.json({
                success: true,
                invoiceUuid: invoice.uuid,
                invoiceStatus: invoice.status,
                amount: invoice.amount,
                amountUsd: invoice.amount_usd,
                currency: invoice.currency?.code,
                network: invoice.currency?.network?.code,
                address: invoice.address,
                paymentLink: invoice.link,
                expiryDate: invoice.expiry_date,
                qrCode: invoice.address ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${invoice.address}` : null
            });
        });
    } catch (error) {
        console.error('Crypto payment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Webhook от TryBit (Postback)
app.post('/api/trybit-webhook', express.json({ type: 'application/json' }), (req, res) => {
    const { body } = req;

    console.log('🔔 TryBit webhook received:', body);
    console.log('📦 Webhook body:', JSON.stringify(req.body, null, 2));

    // Проверяем JWT токен
    if (body.token) {
        if (!trybit.verifyWebhookToken(body.token)) {
            console.error('❌ Invalid webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }

    const {
        status,
        invoice_id,
        amount_crypto,
        currency,
        order_id,
        invoice_info
    } = body;

    const invoiceUuid = invoice_info?.uuid || `INV-${invoice_id}`;
    const invoiceStatus = invoice_info?.status || invoice_info?.invoice_status;

    // Обновляем крипто-платёж
    const sql = `UPDATE crypto_payments 
                 SET invoice_status = ?, 
                     amount_crypto = ?,
                     pay_currency = ?,
                     status = CASE 
                         WHEN ? IN ('paid', 'success') THEN 'paid'
                         WHEN ? = 'canceled' THEN 'canceled'
                         ELSE status
                     END,
                     paid_at = CASE 
                         WHEN ? IN ('paid', 'success') THEN ?
                         ELSE paid_at
                     END
                 WHERE invoice_uuid = ?`;

    const paidAt = ['paid', 'success'].includes(invoiceStatus)
        ? new Date().toISOString()
        : null;

    db.run(sql, [
        invoiceStatus,
        amount_crypto || 0,
        currency,
        invoiceStatus,
        invoiceStatus,
        invoiceStatus,
        paidAt,
        invoiceUuid
    ], function (err) {
        if (err) {
            console.error('Error updating crypto payment:', err);
            return res.status(500).json({ error: err.message });
        }

        // Если платёж успешен — обновляем заказ
        if (invoiceStatus === 'paid' || invoiceStatus === 'success') {
            db.get('SELECT * FROM orders WHERE payment_id = ?', [invoiceUuid], (err, order) => {
                if (order && order.status !== 'paid') {
                    db.run(`UPDATE orders 
                            SET status = 'paid', 
                                crypto_amount = ?, 
                                crypto_currency = ?, 
                                paid_at = ? 
                            WHERE id = ?`,
                        [amount_crypto, currency, new Date().toISOString(), order.id],
                        (err) => {
                            if (err) {
                                console.error('Error updating order:', err);
                            } else {
                                console.log(`✅ Order #${order.id} paid with crypto!`);
                            }
                        }
                    );
                }
            });
        }
    });

    // TryBit ожидает ответ 200
    res.json({ success: true });
});

// Проверка статуса платежа (polling с фронта)
app.get('/api/crypto/status/:invoiceUuid', async (req, res) => {
    try {
        const invoice = await trybit.getInvoiceInfo(req.params.invoiceUuid);

        res.json({
            invoiceUuid: invoice.uuid,
            status: invoice.status,
            invoiceStatus: invoice.invoice_status,
            amount: invoice.amount,
            amountUsd: invoice.amount_usd,
            currency: invoice.currency?.code,
            address: invoice.address,
            paidAt: invoice.date_finished
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// СТАТИЧЕСКИЕ ФАЙЛЫ И РОУТЫ
// ============================================

// Маршрут для корня сайта
app.get('/', (req, res) => {
    const filePath = path.join(__dirname, '..', 'beats.html');
    console.log('Serving beats.html from:', filePath);
    console.log('File exists:', fs.existsSync(filePath));

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send(`
            <h1>404 - File Not Found</h1>
            <p>Path: ${filePath}</p>
            <p>__dirname: ${__dirname}</p>
            <p><a href="/health">Health Check</a></p>
        `);
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Server is running',
        dirname: __dirname,
        timestamp: new Date().toISOString()
    });
});

// Статические файлы
app.use('/source', express.static(path.join(__dirname, '..', 'source'), {
    fallthrough: true
}));

app.use('/css', express.static(path.join(__dirname, '..', 'source', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'source', 'js')));
app.use('/images', express.static(path.join(__dirname, '..', 'source', 'images')));
app.use('/audio', express.static(path.join(__dirname, '..', 'source', 'audio')));
app.use('/videos', express.static(path.join(__dirname, '..', 'source', 'videos')));
app.use('/archives', express.static(path.join(__dirname, '..', 'source', 'archives')));
// Маршрут для корня сайта
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'beats.html'));
});
// Универсальный роут для всех .html файлов
app.get('/:page.html', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, '..', `${page}.html`);

    console.log(`Serving ${page}.html from:`, filePath);
    console.log('File exists:', fs.existsSync(filePath));

    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send(`
            <h1>404 - Page Not Found</h1>
            <p>File: ${page}.html</p>
            <p>Path: ${filePath}</p>
            <p><a href="/">Go to Home</a></p>
        `);
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <h1>404 - Page Not Found</h1>
        <p>Path: ${req.path}</p>
        <p><a href="/">Go to Home</a></p>
    `);
});

// ============================================
// ЗАПУСК СЕРВЕРА (локально)
// ============================================
// app.listen(PORT, () => {
//     console.log(`🚀 Server running on http://localhost:${PORT}`);
//     console.log(`📁 Uploads: ${uploadsDir}`);
//     console.log(`🎵 Admin panel: http://localhost:${PORT}/admin.html`);
//     console.log(`🏠 Store: http://localhost:${PORT}/beats.html`);
//     console.log(`🥁 DrumKitStore: http://localhost:${PORT}/drumkits.html`);
//     console.log(`🎹 samplekitsStore: http://localhost:${PORT}/samplekits.html`);
// });

//Запуск на 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    console.log(`📁 Uploads: ${uploadsDir}`);
    console.log(`🎵 Admin panel: http://0.0.0.0:${PORT}/admin.html`);
    console.log(`🏠 Store: http://0.0.0.0:${PORT}/beats.html`);
    console.log(`🥁 DrumKitStore: http://0.0.0.0:${PORT}/drumkits.html`);
    console.log(`🎹 samplekitsStore: http://0.0.0.0:${PORT}/samplekits.html`);
});