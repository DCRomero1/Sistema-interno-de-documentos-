const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
    clearDatabase();
});

function clearDatabase() {
    db.serialize(() => {
        // Clear Documents
        db.run('DELETE FROM documents', (err) => {
            if (err) console.error('Error clearing documents:', err);
            else console.log('Documents table cleared.');
        });

        // Clear Document History
        db.run('DELETE FROM document_history', (err) => {
            if (err) console.error('Error clearing document_history:', err);
            else console.log('Document History table cleared.');
        });

        // Clear Workers
        db.run('DELETE FROM workers', (err) => {
            if (err) console.error('Error clearing workers:', err);
            else console.log('Workers table cleared.');
        });

        // We specifically DO NOT clear 'users' to prevent locking the user out of the system.
        // If they want to reset users, they would need to restart the server to trigger createDefaultAdmin() or do it manually.
        console.log('Users table preserved to facilitate immediate login.');
    });

    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
    });
}
