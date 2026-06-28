const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // Таблица битов
    db.run(`CREATE TABLE IF NOT EXISTS beats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        bpm INTEGER NOT NULL,
        key_signature TEXT NOT NULL,
        cover TEXT NOT NULL,
        audio TEXT NOT NULL,
        price_tagged REAL NOT NULL,
        price_untagged REAL NOT NULL,
        price_exclusive REAL NOT NULL,
        popular INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица drumkits (сразу с cover_type)
    db.run(`CREATE TABLE IF NOT EXISTS drumkits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        cover TEXT NOT NULL,
        cover_type TEXT DEFAULT 'image',
        archive TEXT NOT NULL,
        price REAL NOT NULL,
        free_version INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица samplekits (аналогично drumkits)
    db.run(`CREATE TABLE IF NOT EXISTS samplekits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        cover TEXT NOT NULL,
        cover_type TEXT DEFAULT 'image',
        archive TEXT NOT NULL,
        price REAL NOT NULL,
        free_version INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // Таблица промокодов
    db.run(`CREATE TABLE IF NOT EXISTS promocodes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        discount REAL NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        active INTEGER DEFAULT 1,
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Таблица заказов
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        promo_code TEXT,
        email TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    // Таблица крипто-платежей
    db.run(`CREATE TABLE IF NOT EXISTS crypto_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        invoice_uuid TEXT UNIQUE NOT NULL,
        invoice_status TEXT DEFAULT 'created',
        amount_usd REAL NOT NULL,
        amount_crypto REAL,
        pay_currency TEXT,
        pay_address TEXT,
        payment_link TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        paid_at DATETIME,
        FOREIGN KEY (order_id) REFERENCES orders(id)
    )`);
    // Тестовые промокоды
    const testPromos = [
        ['WELCOME10', 10, 'percent', '10% off', '2026-12-31'],
        ['FIRST20', 20, 'percent', '20% off first order', '2026-12-31'],
        ['SAVE5', 5, 'fixed', '$5 off', '2026-12-31'],
        ['VIP50', 50, 'percent', '50% off VIP', '2026-12-31'],
        ['ARIABEATS', 15, 'percent', '15% off', '2026-12-31']
    ];

    const stmt = db.prepare('INSERT OR IGNORE INTO promocodes (code, discount, type, description, expires_at) VALUES (?, ?, ?, ?, ?)');
    testPromos.forEach(promo => stmt.run(promo));
    stmt.finalize();

    console.log('✅ Database initialized');
});

module.exports = db;