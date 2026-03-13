const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const dbPath = path.join(__dirname, 'src', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all('SELECT id, fecha, tipo, nombre, status, folios FROM documents ORDER BY ROWID DESC LIMIT 10', [], (err, rows) => {
    if (err) return console.error(err);
    const out = { docs: rows, history: [] };

    const ids = rows.map(r => r.id);
    if(ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        db.all(`SELECT docId, action, from_area, to_area FROM document_history WHERE docId IN (${placeholders}) ORDER BY ROWID DESC LIMIT 30`, ids, (err, hRows) => {
            if (err) return console.error(err);
            out.history = hRows;
            fs.writeFileSync('output.json', JSON.stringify(out, null, 2), 'utf8');
        });
    } else {
        fs.writeFileSync('output.json', JSON.stringify(out, null, 2), 'utf8');
    }
});
