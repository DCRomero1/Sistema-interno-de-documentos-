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

            // Migración: Agregar columna year para reinicio anual de IDs
            db.run(`ALTER TABLE documents ADD COLUMN year INTEGER`, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    // console.error('Migration note:', err.message);
                }
            });

            // Crear índice en year para mejor rendimiento
            db.run(`CREATE INDEX IF NOT EXISTS idx_documents_year ON documents(year)`, (err) => {
                if (err) console.error('Error creating year index:', err);
            });
        }
    });

    // Tabla de Configuración General del Sistema
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating settings table:', err);
        } else {
            // Insertar valor por defecto del nombre del año si no existe
            db.run(
                `INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)`,
                ['anio_nombre', 'AÑO DE LA ESPERANZA Y EL FORTALECIMIENTO DE LA DEMOCRACIA'],
                (err) => {
                    if (err) console.error('Error inserting default setting:', err);
                }
            );
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

    // Tabla de Asignaciones de Horario
    db.run(`CREATE TABLE IF NOT EXISTS schedule_assignments (
        slotId TEXT PRIMARY KEY,
        workerId INTEGER,
        FOREIGN KEY(workerId) REFERENCES workers(id)
    )`, (err) => {
        if (err) console.error('Error creating schedule_assignments table:', err);
    });

    // Tabla de Pabellones
    db.run(`CREATE TABLE IF NOT EXISTS pavilions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT
    )`, (err) => {
        if (err) console.error('Error creating pavilions table:', err);
        else populatePavilions();
    });

    // Nueva Tabla de Áreas Específicas (hija de pavilions)
    db.run(`CREATE TABLE IF NOT EXISTS areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pavilion_id INTEGER,
        name TEXT NOT NULL,
        FOREIGN KEY(pavilion_id) REFERENCES pavilions(id)
    )`, (err) => {
        if (err) console.error('Error creating areas table:', err);
    });

    // Tabla de Asignaciones de Áreas a Trabajadores (reemplaza worker_pavilions)
    db.run(`CREATE TABLE IF NOT EXISTS worker_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        worker_id INTEGER,
        area_id INTEGER,
        FOREIGN KEY(worker_id) REFERENCES workers(id),
        FOREIGN KEY(area_id) REFERENCES areas(id),
        UNIQUE(worker_id, area_id)
    )`, (err) => {
        if (err) console.error('Error creating worker_areas table:', err);
    });
}

function populatePavilions() {
    db.get('SELECT COUNT(*) as count FROM pavilions', async (err, row) => {
        if (err) return console.error('Error checking pavilions:', err);
        if (row.count === 0) {
            const initialPavilions = [
                { name: 'Pabellón A', areas: ['Ingreso principal', 'Calidad', 'Secretaría Académica', 'Dirección General', 'Tesorería', 'RH', 'Patrimonio', 'Pasadizo de 1° Piso', 'Pasadizo de 2° Piso'] },
                { name: 'Pabellón B', areas: ['Auditorio General'] },
                { name: 'Pabellón C', areas: ['Depósitos', 'Aulas pedagógicas', 'Jefatura de Contabilidad', 'Pasadizos', 'SSHH'] },
                { name: 'Pabellón D', areas: ['Tópico', 'Biblioteca', 'Psicología', 'Jefatura Producción', 'Aulas Producción'] },
                { name: 'Pabellón E', areas: ['Aulas 1° piso APETI', 'Aulas 3° piso APETI', 'Laboratorios APETI', 'Jefatura APETI'] },
                { name: 'Pabellón F', areas: ['Aulas Const. Civil', 'Jefatura Const. Civil', 'Laboratorio de Suelos', 'Cancha de básquet (mitad)'] },
                { name: 'Pabellón G', areas: ['Oficinas Secretariado', 'Aulas Secretariado'] },
                { name: 'Pabellones H, J, N', areas: ['Talleres Electrónica', 'Jefaturas Electrónica', 'Laboratorios Electrónica', 'Canal 45'] },
                { name: 'Pabellón K', areas: ['Taller Máquinas-Herramientas', 'Soldadura', 'Control Calidad', 'Jefatura MP', 'Aulas MP', 'Salón CAD/CAM'] },
                { name: 'Pabellón L', areas: ['Jefatura Automotriz', 'Laboratorios Automotriz', 'Taller de motores', 'Patio maniobras'] },
                { name: 'Áreas Comunes', areas: ['Mantenimiento de jardines', 'Terrazas', 'Fachada principal', 'Pasadizos generales', 'SSHH Generales', 'Patio Bandera', 'Patronato'] }
            ];

            const runAsync = (sql, params = []) => new Promise((resolve, reject) => {
                db.run(sql, params, function (error) {
                    if (error) reject(error);
                    else resolve(this.lastID);
                });
            });

            try {
                await runAsync("BEGIN TRANSACTION");
                for (const p of initialPavilions) {
                    const pavilionId = await runAsync('INSERT INTO pavilions (name) VALUES (?)', [p.name]);
                    for (const areaName of p.areas) {
                        await runAsync('INSERT INTO areas (pavilion_id, name) VALUES (?, ?)', [pavilionId, areaName]);
                    }
                }
                await runAsync("COMMIT");
                console.log('Catálogo inicial de pabellones y áreas independizadas creado con éxito.');
            } catch (error) {
                console.error("Error committing bulk insert of pavilions & areas", error);
                db.run("ROLLBACK");
            }
        }
    });
}

function createDefaultAdmin() {
    const checkSql = 'SELECT * FROM users WHERE username = ?';
    db.get(checkSql, ['admin'], (err, row) => {
        if (err) return console.error(err.message);
        if (!row) {
            // Crear admin por defecto: admin / admin (hasheado)
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
