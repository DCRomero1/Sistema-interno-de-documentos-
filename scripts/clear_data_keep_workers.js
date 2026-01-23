const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

db.serialize(() => {
    // 1. Clear Document History
    db.run("DELETE FROM document_history", (err) => {
        if (err) {
            console.error("Error clearing document_history:", err.message);
        } else {
            console.log("Cleared table: document_history");
        }
    });

    // 2. Clear Documents
    db.run("DELETE FROM documents", (err) => {
        if (err) {
            console.error("Error clearing documents:", err.message);
        } else {
            console.log("Cleared table: documents");
        }
    });

    // 3. Verify Workers Count (just to show we didn't touch it)
    db.get("SELECT Count(*) as count FROM workers", (err, row) => {
        if (err) {
            console.error("Error checking workers:", err.message);
        } else {
            console.log(`Workers table intact. Current count: ${row.count}`);
        }
    });
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Database connection closed.');
});
