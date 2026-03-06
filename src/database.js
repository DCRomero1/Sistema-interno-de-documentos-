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
        description TEXT,
        sort_order INTEGER DEFAULT 0
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
                    name: 'Pabellón A: Secretaría Académica (1° y 2° Piso)',
                    sort_order: 1,
                    areas: [
                        'Ingreso principal del Instituto',
                        'Jefatura de Formación Continua (A-001)',
                        'Secretaría Académica (A-106)',
                        'Secretaría Académica (A-105)',
                        'SSHH (Piso 1)',
                        'Secretaría Académica (A-102)',
                        'Secretaría Académica (A-101)',
                        'SSHH (Piso 2)',
                        'Dirección General (A-201)',
                        'Secretaría de Dirección (A-202)'
                    ]
                },
                {
                    name: 'PABELLON A - ADMINISTRACION PRIMER PISO',
                    sort_order: 2,
                    areas: [
                        'Tesorería - Caja (A-116)',
                        'Administración (A-110)',
                        'Recursos Humanos (A-112)',
                        'SSHH Mujeres (A-110)',
                        'SSHH Varones (A-111)',
                        'Jefatura de Formación Continua, Jefatura de Investigación y JUBE',
                        'Patrimonio, Almacén Abastecimiento (A-113)',
                        'Jefatura de Unidad Académica (A-108)',
                        'Secretaría de Jefatura de Unidad Académica'
                    ]
                },
                {
                    name: 'Pabellón B: Auditoría',
                    areas: ['Auditorio General']
                },
                {
                    name: 'PABELLON - C CONTABILIDAD',
                    areas: [
                        'Deposito (C-102)',
                        'Aula pedagógica (C-102)',
                        'Aula pedagógica (C-103)',
                        'Aula pedagógica (C-104)',
                        'Coordinacion Academica (C-105)',
                        'Jefatura interior',
                        'Deposito Coordinacion',
                        'SS.HH (C-106)',
                        'Deposito debajo de escalera (C-107)',
                        'Aula de computo (C-201)',
                        'Lab. de Computo (C-202)',
                        'Sala de Docentes (C-203)',
                        'Sala de Doc. Interior 1',
                        'Sala de Doc. Interior 2',
                        'Salon de Usos Multiples (C-301)',
                        'Sala de lectura Docen - Estudiantes (C-302)',
                        'S. lectura Interior',
                        'Area de Investigación e Innovación Tec. (C-303)',
                        'A. Investg. Interior',
                        'Servicio Higienico'
                    ]
                },
                {
                    name: 'PABELLON "D" - PRODUCCION AGROPECUARIA/TOPICO',
                    areas: [
                        'Laboratorio multifuncional 1 Procesos (D-104)',
                        'SSHH Interior Procesos (D-104)',
                        'Área de Bienestar (Asistencia Social -Psicología) (D-103)',
                        'Tópico - Lab APSTI - SSHH (D-101)',
                        'SSHH - Tópico (D-101)',
                        'Aula de pedagógica (D-201)',
                        'Aula de pedagógica (D-202)',
                        'Laboratorio Multifuncional 2 (D-203)',
                        'Aula Pedagógica (D-204)',
                        'Coordinacion académica (D-205)'
                    ]
                },
                {
                    name: 'PABELLON "E" - ARQUITECTURA DE PLATAFORMAS Y TI (APETI)',
                    areas: [
                        'Coordinación académica APSTI (E102)',
                        'Taller de redes y conectividad (E103)',
                        'aula pedagógica (E104)',
                        'aula pedagógica (E105)',
                        'aula de computación exbiblioteca (D102)',
                        'SSHH interior exbiblioteca',
                        'Sala de docentes (E201)',
                        'Lab. De Computo 1 (E202)',
                        'Lab. De Computo 1 (E203)',
                        'Centro de seguridad Interior 1 (E301)',
                        'Centro de seguridad Interior 2 (E301)',
                        'Taller de mantenimiento (E302)',
                        'Aula pedagógica (E303)',
                        'Almacen de mto y reparac comp (E304)'
                    ]
                },
                {
                    name: 'PABELLON "F" - CONSTRUCCION CIVIL',
                    areas: [
                        'Sala de usos Multiples (F-101)',
                        'Sala de Docentes (F-102)',
                        'Coordinacion Academica (F-103)',
                        'Topografia (F-103 B)',
                        'Aula Pedagogica (F-104)',
                        'Taller multifuncional- Mecanica de suelos (F-105)',
                        'SSHH - DEPOSITO (F-106)',
                        'SSHH - DOCENTES - Detras de la cafeteria',
                        'Aula Pedagogica (F-201)',
                        'Aula Pedagogica (F-202)',
                        'Laboratorio de Computo (F-203)'
                    ]
                },
                {
                    name: 'PABELLON G - ASISTENCIA ADMINISTRATIVA',
                    areas: [
                        'Codinacion Asistencia Administrativa (G-101)',
                        'Aula pedagógica (G-102)',
                        'Aula pedagógica (G-103)',
                        'Aula pedagógica (G-104)',
                        'Aula de Computo (G-201)',
                        'Servicio Higienico Varonere general',
                        'Servicio Higienico Damas General',
                        'Servicio Higienico Discapacidad',
                        'Laboratorio de Computo (G-201)'
                    ]
                },
                {
                    name: 'PABELLON - DETRÁS DE CAFETERIA',
                    areas: [
                        'Servicio Higienico Damas',
                        'Servicio Higienico Varones'
                    ]
                },
                {
                    name: 'PABELLON "J" - ELECTRICIDAD INDUSTRIAL',
                    areas: [
                        'Taller (maq. Elec) (J\'-101)',
                        'Lab. de Generc. Y sist. P. izquierda (J\'-102)',
                        'Aula pedagógica Electricidad Industrial (J\'-105 B)',
                        'Taller de mant. De maq. Electricas (J\'-105 A)',
                        'Centro de certificación y competencias laborales (J\'-201)',
                        'Almacen (interior) (J\'-202)',
                        'Coordinación Academican Electricidad Industrial (J-101)',
                        'Taller de automatización industrial (J-102)',
                        'Lab. de Medicic. Electricas y circuitos electrónicos (J-103)',
                        'Almacen (lab. d med. Elec e instrum) (J-104)',
                        'Aula Pedagogica (J-201)',
                        'Aula Pedagogica (J-202)',
                        'ARCHIVO DE ADMINSTRACION (J-203)'
                    ]
                },
                {
                    name: 'PABELLON "H - N" - ELECTRONICA / CANAL 45',
                    areas: [
                        'Coordinación académica - Electricidad industrial (H-101)',
                        'Taller de hidraulica, neumatica (H-102)',
                        'Taller de control automotriz (H-103)',
                        'Taller de medicion electronica (H-104)',
                        'Almacén Costado de las escalerar (H-105)',
                        'Aula pedagogica (H-201)',
                        'Aula pedagogica (H-202)',
                        'Laboratorio de computo (H-203)',
                        'Aula pedagógica (J\'-103)',
                        'Taller de redes de datos y comunicacionesm canal 45 (N101A)',
                        'Switch de tv (N101B)',
                        'Almacen (N101C)'
                    ]
                },
                {
                    name: 'PABELLON "K" - MECANICA DE PRODUCCION INDUSTRIAL (PI/MP)',
                    areas: [
                        'Porton principal Ingreso 1 (K-101)',
                        'Almacen(Solo tiene llave el Coordinador de area) (K-101A)',
                        'Laboratorio de Maq. C.N.C. (candado) (K-101B)',
                        'Taller de Maquinas Herramientas (K-101C)',
                        'Taller de Soldadura Especiales (K-101D)',
                        'Porton principal Ingreso 2 (K-102)',
                        'Taller de soldadura Oxigas (K-102A)',
                        'Taller de Mecanica de Banco y Ajustes (K-102B)',
                        'Taller de Molderia y fundición (K-102C)',
                        'Laboratorio de Control de calidad (K-102D)',
                        'Coordinación Academica mecanica de producion indsutrial (K-201)',
                        'Sala de docentes 1 (K-201A)',
                        'Sala de docentes 2 (K-201B)',
                        'Aula pedagogica (K-202)',
                        'Aula pedagogica (K-203)',
                        'Aula de Computo CAD CDM (K-204)',
                        'Servicio Higienico Damas',
                        'Servicio Higienico Varones'
                    ]
                },
                {
                    name: 'PABELLON "L" - MECATRONICA AUTOMOTRIZ',
                    areas: [
                        'Sala de docentes (L101)',
                        'Coordinación académica Mecatronica (L102)',
                        'Interior - Almacen (L102B)',
                        'Porton Principal (L102)',
                        'Lab sistema diesel gasolina (L102A)',
                        'Taller de motores de combustion inter (L102B)',
                        'Taller electrico electronico (L102C)',
                        'Taller de mecanica basica y soldadura (L102D)',
                        'Patio de maniobras (L102E)',
                        'Taller de rectificaciones automot (L102F)',
                        'Taller de suspencion de direccion (L102G)',
                        'Servicio Higienico Damas',
                        'Servicio Higienico Varones',
                        'Aula pedagógica (L201)',
                        'Aula pedagógica (L202)',
                        'Aula pedagógica (L203)'
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
                        'Áreas periféricas al local del Patronato',
                        'Galerias',
                        'Ventanas',
                        'Patios comunes',
                        'Muros'
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
            // La contraseña base DEBE estar definida en el archivo .env
            const defaultPassword = process.env.ADMIN_PASSWORD;

            if (!defaultPassword) {
                console.error('CRITICAL: ADMIN_PASSWORD no está definida en .env. No se creará el usuario administrador base por seguridad.');
                return;
            }

            const saltRounds = 10;
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
