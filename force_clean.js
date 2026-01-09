const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('--- BORRADO TOTAL DE DOCUMENTOS ---');

db.serialize(() => {
    // 1. Borrar Historial
    db.run("DELETE FROM document_history", (err) => {
        if (err) console.error('Error borrando historial:', err);
        else console.log('✅ Tabla historial vaciada.');
    });

    // 2. Borrar Documentos
    db.run("DELETE FROM documents", (err) => {
        if (err) console.error('Error borrando documentos:', err);
        else console.log('✅ Tabla documentos vaciada.');
    });

    // 3. Reiniciar contadores (vaciar)
    db.run("DELETE FROM sqlite_sequence WHERE name='documents'", () => { });
    db.run("DELETE FROM sqlite_sequence WHERE name='document_history'", () => { });
});

db.close(() => {
    console.log('--- BASE DE DATOS LIMPIA (Documentos eliminados) ---');
});
