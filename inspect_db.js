const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to DB:', err);
        return;
    }
    console.log('Connected to DB');
});

db.serialize(() => {
    // Check tables
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) console.error('Error fetching tables:', err);
        else console.log('Tables:', tables);
    });

    // Check documents
    db.all("SELECT * FROM documents", (err, rows) => {
        if (err) console.error('Error fetching documents:', err);
        else {
            console.log(`Found ${rows.length} documents.`);
            console.log(rows);
        }
    });
});
