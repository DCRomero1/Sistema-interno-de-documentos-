const db = require('./src/database');

db.all('SELECT id, fecha, status FROM documents ORDER BY created_at DESC LIMIT 10', [], (err, rows) => {
    if (err) console.error(err);
    else {
        console.log('Recent documents:');
        console.table(rows);
    }
});
