const db = require('./src/database');

const badIds = ['2028', '2026-003', '2026-002', '2027-001', '2026-001'];

const placeholders = badIds.map(() => '?').join(',');

db.serialize(() => {
    // Delete from history first (FK)
    db.run(`DELETE FROM document_history WHERE docId IN (${placeholders})`, badIds, function (err) {
        if (err) console.error('Error deleting history:', err);
        else console.log(`Deleted ${this.changes} rows from history.`);
    });

    // Delete documents
    db.run(`DELETE FROM documents WHERE id IN (${placeholders})`, badIds, function (err) {
        if (err) console.error('Error deleting documents:', err);
        else console.log(`Deleted ${this.changes} documents.`);

        // Verify max
        db.get('SELECT MAX(id) as maxId FROM documents', (err, row) => {
            console.log('New Max ID is:', row ? row.maxId : 'null');
        });
    });
});
