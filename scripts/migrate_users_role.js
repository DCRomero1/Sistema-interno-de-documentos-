const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

console.log('Migrating database...');

db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
    if (err) {
        if (err.message.includes('duplicate column')) {
            console.log('Column "role" already exists.');
        } else {
            console.error('Error adding column:', err.message);
        }
    } else {
        console.log('Column "role" added successfully.');
    }
    db.close();
});
