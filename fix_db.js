const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'src', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Starting DB fix...');

db.serialize(() => {
    // Fix status casing
    db.run(`UPDATE documents SET status = 'Finalizado' WHERE status COLLATE NOCASE = 'finalizado' AND status != 'Finalizado'`, function(err) {
        if (err) console.error(err);
        else console.log('Fixed Finalizado:', this.changes);
    });
    
    db.run(`UPDATE documents SET status = 'Derivado' WHERE status COLLATE NOCASE = 'derivado' AND status != 'Derivado'`, function(err) {
        if (err) console.error(err);
        else console.log('Fixed Derivado:', this.changes);
    });

    db.run(`UPDATE documents SET status = 'Recibido' WHERE status COLLATE NOCASE = 'recibido' AND status != 'Recibido'`, function(err) {
        if (err) console.error(err);
        else console.log('Fixed Recibido:', this.changes);
    });

    // We also need to add Finalización history entries for documents that are Finalizado but have no such history.
    db.all(`SELECT id, ubicacion, fecha FROM documents WHERE status = 'Finalizado'`, (err, docs) => {
        if (err) return console.error(err);
        
        let checked = 0;
        let fixedHistory = 0;

        docs.forEach(doc => {
            db.get(`SELECT COUNT(*) as count FROM document_history WHERE docId = ? AND action = 'Finalización'`, [doc.id], (err, row) => {
                if (err) console.error(err);
                if (row && row.count === 0) {
                    // Missed history event
                    const ubicacion = doc.ubicacion || 'Descargado';
                    const fecha = doc.fecha;
                    db.run(`INSERT INTO document_history (docId, date, action, from_area, to_area, cargo, observation) VALUES (?, ?, 'Finalización', ?, ?, '', 'Finalización manual/ingresada por lote')`,
                        [doc.id, new Date().toISOString(), ubicacion, ubicacion],
                        (err) => {
                            if (err) console.error(err);
                            else {
                                fixedHistory++;
                            }
                        }
                    );
                }
                
                checked++;
                if (checked === docs.length) {
                    setTimeout(() => {
                        console.log('Fixed missing history events:', fixedHistory);
                    }, 500); // Wait for inserts to finish roughly
                }
            });
        });
        if (docs.length === 0) console.log('No Finalizado docs found.');
    });
});
