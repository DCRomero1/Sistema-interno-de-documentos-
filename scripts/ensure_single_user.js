const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
});

// Delete everyone except 'diego'
const targetUser = 'diego';

db.run(`DELETE FROM users WHERE username != ?`, [targetUser], function (err) {
    if (err) {
        console.error('Error deleting users:', err.message);
    } else {
        console.log(`Deleted ${this.changes} other users. Only '${targetUser}' remains.`);
    }
    db.close();
});
