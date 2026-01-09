const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('--- Historial de Documentos ---');
db.all("SELECT * FROM document_history ORDER BY docId, id", (err, rows) => {
    if (err) console.error(err);
    else console.table(rows);
    db.close();
});
