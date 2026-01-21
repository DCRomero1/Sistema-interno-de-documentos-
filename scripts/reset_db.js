const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Connecting to database at:', dbPath);

db.serialize(() => {
    // Clear tables
    db.run("DELETE FROM document_history", (err) => {
        if (err) console.error('Error clearing history:', err.message);
        else console.log('Table document_history cleared.');
    });

    db.run("DELETE FROM documents", (err) => {
        if (err) console.error('Error clearing documents:', err.message);
        else console.log('Table documents cleared.');
    });

    db.run("DELETE FROM workers", (err) => {
        if (err) console.error('Error clearing workers:', err.message);
        else console.log('Table workers cleared.');
    });

    // Clear users but restore admin
    db.run("DELETE FROM users", (err) => {
        if (err) console.error('Error clearing users:', err.message);
        else console.log('Table users cleared.');
    });

    // Reset ID counters
    db.run("DELETE FROM sqlite_sequence", (err) => {
        if (err) console.error('Error resetting sequences:', err.message);
        else console.log('Auto-increment sequences reset.');
    });

    // Restore Admin User
    const saltRounds = 10;
    const adminPass = 'admin';

    // We use a simple query to wait effectively or just run it as the next serialized event
    // But bcrypt is async.
});

// We do the admin insertion separately to ensure the delete finished (serialize guarantees order of run calls, 
// but the callback of a run call is async logic). 
// However, in sqlite3, run queues the command. 
// We will simply queue the admin insertion after the deletes.

const saltRounds = 10;
const adminPass = 'admin';

bcrypt.hash(adminPass, saltRounds, function (err, hash) {
    if (err) {
        console.error('Error hashing password:', err);
        db.close();
        return;
    }

    const insertSql = "INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)";
    db.run(insertSql, ['admin', hash, 'Administrador', 'admin'], (err) => {
        if (err) console.error('Error restoring admin:', err.message);
        else console.log('Default admin user restored.');

        db.close((err) => {
            if (err) console.error('Error closing db:', err.message);
            else console.log('Database connection closed.');
        });
    });
});
