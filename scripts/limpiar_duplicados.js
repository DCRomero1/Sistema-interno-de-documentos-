const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('--- Limpiando Duplicados ---');

db.serialize(() => {
    // Estrategia: Mantener solo el ID más bajo (el primero) para cada combinación de docId + action + date
    // Específicamente para 'Recepción' que es lo que más se duplicó.

    const sql = `
        DELETE FROM document_history 
        WHERE id NOT IN (
            SELECT MIN(id) 
            FROM document_history 
            GROUP BY docId, action, date, from_area, to_area
        )
    `;

    db.run(sql, function (err) {
        if (err) console.error('Error al limpiar:', err);
        else {
            console.log(`✅ Registros duplicados eliminados: ${this.changes}`);
        }
    });
});

db.close();
