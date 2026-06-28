const db = require('./database');

db.run('ALTER TABLE orders ADD COLUMN status TEXT DEFAULT "pending"', (err) => {
    if (err) {
        console.error('Error adding status column:', err.message);
    } else {
        console.log('✅ Status column added successfully!');
    }
    
    db.run('ALTER TABLE orders ADD COLUMN paid_at DATETIME', (err) => {
        if (err) {
            console.error('Error adding paid_at column:', err.message);
        } else {
            console.log('✅ paid_at column added successfully!');
        }
        
        db.close();
    });
});