const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Create/Open database file
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeTables();
    }
});

function initializeTables() {
    // Users Table (for System Access)
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating users table:', err);
        else createDefaultAdmin();
    });

    // Workers Table (Docentes/Personal)
    db.run(`CREATE TABLE IF NOT EXISTS workers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        dni TEXT UNIQUE NOT NULL,
        birthDate TEXT,
        position TEXT,
        email TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating workers table:', err);
    });
}

function createDefaultAdmin() {
    const checkSql = 'SELECT * FROM users WHERE username = ?';
    db.get(checkSql, ['admin'], (err, row) => {
        if (err) return console.error(err.message);
        if (!row) {
            // Create default admin: admin / admin (hashed)
            // hash of 'admin' is approx: $2b$10$YourSalt...
            // For simplicity in this async init, we'll hash it now.
            const saltRounds = 10;
            const myPlaintextPassword = 'admin';

            bcrypt.hash(myPlaintextPassword, saltRounds, function (err, hash) {
                if (err) return console.error('Error hashing default password');

                const insertSql = 'INSERT INTO users (username, password, name) VALUES (?, ?, ?)';
                db.run(insertSql, ['admin', hash, 'Administrador'], (err) => {
                    if (err) console.error('Error creating admin user:', err.message);
                    else console.log('Default admin user created.');
                });
            });
        }
    });
}

module.exports = db;
