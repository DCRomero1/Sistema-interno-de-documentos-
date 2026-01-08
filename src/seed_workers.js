const db = require('./database');

// ==========================================
// 1. ZONA DE EDICIÓN MANUAL (Agrega aquí tus docentes específicos)
// ==========================================
const trabajadoresManuales = [
    // Copia y pega estas líneas para agregar más
    { fullName: 'Ejemplo Docente 1', dni: '10000001', birthDate: '1980-05-15', position: 'Docente', email: 'doc1@test.com', phone: '999000001' },
    { fullName: 'Ejemplo Docente 2', dni: '10000002', birthDate: '1985-08-20', position: 'Administrativo', email: 'doc2@test.com', phone: '999000002' },
];

// ==========================================
// 2. CONFIGURACIÓN DE RELLENO AUTOMÁTICO
// ==========================================
const GENERAR_AUTOMATICOS = true; // Pon false si solo quieres los manuales
const CANTIDAD_A_GENERAR = 50;    // Cantidad de usuarios aleatorios

// Listas para generación aleatoria
const firstNames = ['Juan', 'Maria', 'Carlos', 'Ana', 'Luis', 'Jose', 'Rosa', 'Miguel', 'Carmen', 'Pedro'];
const lastNames = ['Perez', 'Gomez', 'Ruiz', 'Torres', 'Rodriguez', 'Lopez', 'Fernandez', 'Garcia'];
const positions = ['Docente', 'Administrativo', 'Servicios', 'Dirección'];

function getRandomElement(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function generateRandomDNI() { return Math.floor(10000000 + Math.random() * 90000000).toString(); }
function generateRandomDate() {
    return new Date(1970 + Math.random() * 30, 0, 1).toISOString().split('T')[0];
}

console.log('Iniciando carga de trabajadores...');

db.serialize(() => {
    const stmt = db.prepare("INSERT OR IGNORE INTO workers (fullName, dni, birthDate, position, email, phone) VALUES (?, ?, ?, ?, ?, ?)");

    // 1. Insertar Manuales
    console.log(`Insertando ${trabajadoresManuales.length} trabajadores manuales...`);
    trabajadoresManuales.forEach(w => {
        stmt.run(w.fullName, w.dni, w.birthDate, w.position, w.email, w.phone);
    });

    // 2. Insertar Aleatorios (si está activado)
    if (GENERAR_AUTOMATICOS) {
        console.log(`Generando ${CANTIDAD_A_GENERAR} trabajadores aleatorios...`);
        for (let i = 0; i < CANTIDAD_A_GENERAR; i++) {
            const name = getRandomElement(firstNames);
            const lname = getRandomElement(lastNames);
            const lname2 = getRandomElement(lastNames);

            stmt.run(
                `${name} ${lname} ${lname2}`,
                generateRandomDNI(),
                generateRandomDate(),
                getRandomElement(positions),
                `user${i}@test.com`,
                '900000000'
            );
        }
    }

    stmt.finalize(() => {
        setTimeout(() => {
            console.log('¡Listo! Datos cargados exitosamente.');
            process.exit(0);
        }, 1000);
    });
});
