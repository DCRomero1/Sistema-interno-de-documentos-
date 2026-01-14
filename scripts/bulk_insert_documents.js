const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../src/database.sqlite');

const db = new sqlite3.Database(dbPath);

const NUM_RECORDS = 1000; // Cantidad de registros a insertar

const tipos = ['Oficio', 'Carta', 'Solicitud', 'Memorando', 'Informe'];
const areas = ['Gerencia', 'Administración', 'Logística', 'Patrimonio', 'Contabilidad', 'Mesa de partes'];
const estados = ['Recibido', 'Derivado', 'Finalizado'];

function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split('T')[0]; // YYYY-MM-DD
}

console.log(`Iniciando inserción masiva de ${NUM_RECORDS} documentos...`);

db.serialize(() => {
    // 1. Iniciar Transacción (CRUCIAL para velocidad masiva)
    db.run("BEGIN TRANSACTION");

    const stmt = db.prepare(`INSERT INTO documents (id, fecha, tipo, nombre, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, observaciones) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

    // Obtener el último ID para continuar la secuencia
    db.get("SELECT MAX(CAST(id AS INTEGER)) as maxId FROM documents", (err, row) => {
        let startId = 1;
        if (row && row.maxId) {
            startId = row.maxId + 1;
        }

        for (let i = 0; i < NUM_RECORDS; i++) {
            const id = String(startId + i).padStart(3, '0'); // '001', '002'...
            const fecha = generateRandomDate(new Date(2025, 0, 1), new Date());
            const tipo = getRandom(tipos);
            const nombre = `Remitente Falso ${i}`;
            const origen = getRandom(areas);
            const destino = getRandom(areas);
            const ubicacion = destino;
            const folios = Math.floor(Math.random() * 50) + 1;
            const concepto = `Documento de prueba masiva número ${i}`;
            const fechaDespacho = generateRandomDate(new Date(2025, 0, 1), new Date());
            const cargo = `Cargo ${i}`;
            const status = getRandom(estados);
            const observaciones = 'Generado automáticamente';

            stmt.run(id, fecha, tipo, nombre, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, observaciones);
        }

        stmt.finalize();

        // 2. Comprometer Transacción
        db.run("COMMIT", (err) => {
            if (err) {
                console.error("Error en la inserción masiva:", err);
            } else {
                console.log("¡Éxito! Inserción masiva completada.");
            }
            db.close();
        });
    });
});
