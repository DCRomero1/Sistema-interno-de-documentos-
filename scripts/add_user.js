const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath);

const username = 'diego';
const password = '1234';
const name = 'Diego';


bcrypt.hash(password2, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    const sql = 'INSERT INTO users (username, password, name) VALUES (?, ?, ?)';
    db.run(sql, [username, hash, name], (err) => {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                console.log(`User '${username}' already exists. Updating password...`);
                db.run('UPDATE users SET password = ? WHERE username = ?', [hash, username], (err) => {
                    if (err) console.error('Error updating user:', err);
                    else console.log(`User '${username}' updated successfully.`);
                });
            } else {
                console.error('Error inserting user:', err);
            }
        } else {
            console.log(`User '${username}' added successfully.`);
        }
    });
});
