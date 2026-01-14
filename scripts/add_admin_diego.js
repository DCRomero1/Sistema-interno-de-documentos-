const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database.');
});

const username = 'diego';
const password = '1234';
const name = 'Diego (Admin)';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function (err, hash) {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    db.run(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
        [username, hash, name, 'admin'],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    console.log(`User '${username}' already exists. Updating password and role...`);
                    db.run(`UPDATE users SET password = ?, name = ?, role = 'admin' WHERE username = ?`,
                        [hash, name, username],
                        (err) => {
                            if (err) console.error('Error updating user:', err.message);
                            else console.log(`User '${username}' updated successfully.`);
                        }
                    );
                } else {
                    console.error('Error inserting user:', err.message);
                }
            } else {
                console.log(`User '${username}' created successfully with ID: ${this.lastID}`);
            }
            // Close after query
            db.close();
        }
    );
});
