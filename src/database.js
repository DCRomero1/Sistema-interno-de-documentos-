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
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating users table:', err);
        else {
            // Migration: Add role column if not exists
            db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    // console.error('Migration note:', err.message);
                }
            });
            createDefaultAdmin();
        }
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

    // Documents Table
    db.run(`CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        fecha TEXT,
        tipo TEXT,
        nombre TEXT,
        origen TEXT,
        destino TEXT,
        ubicacion TEXT,
        folios TEXT,
        concepto TEXT,
        fechaDespacho TEXT,
        cargo TEXT,
        status TEXT,
        observaciones TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating documents table:', err);
        else {
            // Migration: Attempt to add the column if it's missing (for existing databases)
            // SQLite doesn't support "IF NOT EXISTS" in ADD COLUMN directly in all versions comfortably without check,
            // but running it and ignoring the "duplicate column" error is a common simple pattern.
            db.run(`ALTER TABLE documents ADD COLUMN nombre TEXT`, (err) => {
                // Ignore error if column already exists
                if (err && !err.message.includes('duplicate column')) {
                    // console.error('Migration note:', err.message); 
                }
            });
        }
    });

    // Document History Table
    db.run(`CREATE TABLE IF NOT EXISTS document_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        docId TEXT,
        date TEXT,
        action TEXT,
        from_area TEXT,
        to_area TEXT,
        cargo TEXT,
        observation TEXT,
        FOREIGN KEY(docId) REFERENCES documents(id)
    )`, (err) => {
        if (err) console.error('Error creating document_history table:', err);
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
