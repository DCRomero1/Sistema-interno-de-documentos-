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

    // Tabla de Personal de Limpieza (Independiente)
    db.run(`CREATE TABLE IF NOT EXISTS cleaning_staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT NOT NULL,
        dni TEXT UNIQUE NOT NULL,
        birthDate TEXT,
        position TEXT DEFAULT 'Personal de Limpieza',
        email TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) console.error('Error creating cleaning_staff table:', err);
    });

    // Tabla de Asignaciones de Horario (Actualizada para apuntar a Personal de Limpieza)
    db.run(`CREATE TABLE IF NOT EXISTS schedule_assignments (
        slotId TEXT PRIMARY KEY,
        cleanerId INTEGER,
        FOREIGN KEY(cleanerId) REFERENCES cleaning_staff(id)
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

    // Tabla de Asignaciones de Áreas a Personal de Limpieza (Legacy - Global)
    db.run(`CREATE TABLE IF NOT EXISTS cleaner_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cleaner_id INTEGER,
        area_id INTEGER,
        FOREIGN KEY(cleaner_id) REFERENCES cleaning_staff(id),
        FOREIGN KEY(area_id) REFERENCES areas(id),
        UNIQUE(cleaner_id, area_id)
    )`, (err) => {
        if (err) console.error('Error creating cleaner_areas table:', err);
        else seedCleaners(); // Seed initial cleaners after creating tables
    });

    // Nueva Tabla de Asignaciones de Áreas por Turno (Slot-Specific)
    db.run(`CREATE TABLE IF NOT EXISTS slot_areas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_id TEXT NOT NULL,
        area_id INTEGER NOT NULL,
        FOREIGN KEY(slot_id) REFERENCES schedule_assignments(slotId) ON DELETE CASCADE,
        FOREIGN KEY(area_id) REFERENCES areas(id),
        UNIQUE(slot_id, area_id)
    )`, (err) => {
        if (err) console.error('Error creating slot_areas table:', err);
    });
}

function seedCleaners() {
    db.get('SELECT COUNT(*) as count FROM cleaning_staff', [], (err, row) => {
        if (err) return console.error('Error checking cleaners:', err);

        if (row.count === 0) {
            const initialCleaners = [
                'ALODIA CHACNAQUE', 'CANER MEZA', 'JULIAN APARICIO', 'LUISA CAMA',
                'NILDA LAURA', 'ROSARIO CHURA', 'DEMETRIO JUSTO', 'ALFREDO CORONADO', 'DAVID TURPO'
            ];

            initialCleaners.forEach((name, i) => {
                const dni = '8000000' + i;
                db.run(
                    `INSERT OR IGNORE INTO cleaning_staff(fullName, dni, position) VALUES(?, ?, ?)`,
                    [name, dni, 'Personal de Limpieza'],
                    (err) => {
                        if (err) console.error('Error seeding cleaner:', err);
                    }
                );
            });
            console.log('Catálogo inicial de 9 Conserjes sembrado exitosamente en cleaning_staff.');
        }
    });
}

function populatePavilions() {
    db.get('SELECT COUNT(*) as count FROM pavilions', async (err, row) => {
        if (err) return console.error('Error checking pavilions:', err);
        if (row.count === 0) {
            const initialPavilions = [
                {
                    name: 'Pabellón A: Administración (1° y 2° Piso)',
                    areas: [
                        'Ingreso principal del Instituto',
                        'Calidad (A-001)',
                        'Secretaría Académica (A-101, A-102, A-105, A-106)',
                        'Dirección General (A-201)',
                        'Secretaría de Dirección (A-202)',
                        'Tesorería - Caja (A-116)',
                        'Administración (A-110)',
                        'Recursos Humanos (A-112)',
                        'Servicios Higiénicos (Mujeres / Varones)',
                        'Jefatura de Formación Continua e Investigación',
                        'Patrimonio y Almacén (A-113)',
                        'Jefatura de Unidad Académica y su Secretaría'
                    ]
                },
                {
                    name: 'Pabellón B: Auditoría',
                    areas: ['Auditorio General']
                },
                {
                    name: 'Pabellón C: Contabilidad',
                    areas: [
                        'Depósitos (C-101, C-102)',
                        'Aulas pedagógicas (C-103 en adelante)',
                        'Jefatura de Contabilidad',
                        'Pasadizos de los tres niveles y escaleras',
                        'Servicios Higiénicos'
                    ]
                },
                {
                    name: 'Pabellón D: Producción Agropecuaria / Tópico',
                    areas: [
                        'Tópico (D-101)',
                        'Biblioteca',
                        'Psicología',
                        'Jefatura de Producción Agropecuaria',
                        'Aulas del pabellón y pasadizos'
                    ]
                },
                {
                    name: 'Pabellón E: Arquitectura de Plataformas y TI (APETI)',
                    areas: [
                        'Aulas del primer piso',
                        'Aulas del tercer piso',
                        'Laboratorios de Cómputo (incluyendo Laboratorio PM)',
                        'Jefatura de Carrera',
                        'Pasadizos de los tres niveles'
                    ]
                },
                {
                    name: 'Pabellón F: Construcción Civil',
                    areas: [
                        'Aulas pedagógicas (F-101, F-102, F-103)',
                        'Jefatura de Construcción Civil',
                        'Laboratorio de Suelos',
                        'Pasadizos y escaleras',
                        'Mitad de la cancha de básquet frontera a CC'
                    ]
                },
                {
                    name: 'Pabellón G: Asistencia Administrativa',
                    areas: [
                        'Oficinas de Asistencia Administrativa',
                        'Aulas asignadas a Secretariado Ejecutivo'
                    ]
                },
                {
                    name: 'Pabellones H, J, N: Electrónica y Electricidad Industrial',
                    areas: [
                        'Talleres de Electricidad (J-101, J-102, etc.)',
                        'Jefatura de Electricidad',
                        'Laboratorio de Mediciones',
                        'Talleres de Electrónica (J-103)',
                        'Jefatura de Electrónica',
                        'Instalaciones de Canal 45'
                    ]
                },
                {
                    name: 'Pabellón K: Mecánica de Producción Industrial (PI/MP)',
                    areas: [
                        'Talleres de Máquinas-Herramientas (K-101 A, B, C, D)',
                        'Taller de Soldadura, Moldería y Fundición',
                        'Laboratorio de Control de Calidad',
                        'Jefatura y Sala de docentes (K-201)',
                        'Aulas pedagógicas (K-202, K-203)',
                        'Aula de Cómputo CAD/CAM / FAVLAB (K-204)',
                        'Baños de taller (SSHH Damas/Varones)'
                    ]
                },
                {
                    name: 'Pabellón L: Mecatrónica Automotriz',
                    areas: [
                        'Sala de docentes y Jefatura (L-101, L-102)',
                        'Laboratorio de sistema diesel / gasolina',
                        'Talleres de motores de combustión interna',
                        'Taller eléctrico / electrónico',
                        'Taller de mecánica básica',
                        'Patio de maniobras y Almacén interior'
                    ]
                },
                {
                    name: 'Áreas Comunes, Exteriores y Periféricas',
                    areas: [
                        'Mantenimiento de jardines y contorno del Parque PE',
                        'Terrazas y parte del patio central',
                        'Fachada principal del Instituto',
                        'Pasadizos generales (bus-ped)',
                        'Servicios Higiénicos Generales (detrás de la cafetería)',
                        'Patio de la Bandera',
                        'Áreas periféricas al local del Patronato'
                    ]
                }
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
    // Cambiamos el usuario por defecto de 'admin' a algo menos común
    const defaultUser = 'admin_vigil';

    db.get(checkSql, [defaultUser], (err, row) => {
        if (err) return console.error(err.message);
        if (!row) {
            // Se recomienda encarecidamente cambiar esta contraseña tras el primer inicio
            const saltRounds = 10;
            const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || 'Vigil2026#Secure';

            bcrypt.hash(defaultPassword, saltRounds, function (err, hash) {
                if (err) return console.error('Error hashing default password');

                const insertSql = 'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)';
                db.run(insertSql, [defaultUser, hash, 'Administrador Principal', 'admin'], (err) => {
                    if (err) console.error('Error creating admin user:', err.message);
                    else console.log(`Usuario administrador inicial creado: ${defaultUser}`);
                });
            });
        }
    });
}

module.exports = db;
