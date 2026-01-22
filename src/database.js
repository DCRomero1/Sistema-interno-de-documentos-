const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Crear/Abrir archivo de base de datos
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
    // Tabla de Usuarios (para Acceso al Sistema)
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
            // Migración: Agregar columna de rol si no existe
            db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    // console.error('Migration note:', err.message);
                }
            });
            createDefaultAdmin();
        }
    });

    // Tabla de Trabajadores (Docentes/Personal)
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
        else {
            // Migration: Add email and phone if missing
            db.run(`ALTER TABLE workers ADD COLUMN email TEXT`, (err) => {
                // Ignore if exists
            });
            db.run(`ALTER TABLE workers ADD COLUMN phone TEXT`, (err) => {
                // Ignore if exists
            });
        }
    });

    // Tabla de Documentos
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
            // Migración: Intentar agregar la columna nombre si falta
            db.run(`ALTER TABLE documents ADD COLUMN nombre TEXT`, (err) => {
                // Ignore error if column already exists
                if (err && !err.message.includes('duplicate column')) {
                    // console.error('Migration note:', err.message); 
                }
            });

            // Migración: Agregar columna pdf_path
            db.run(`ALTER TABLE documents ADD COLUMN pdf_path TEXT`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    // console.error('Migration note:', err.message);
                }
            });
        }
    });

    // Tabla de Historial de Documentos
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
            // Crear admin por defecto: admin / admin (hasheado)
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
