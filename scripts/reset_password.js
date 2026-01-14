const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to database.');
});

const username = 'diego';
const newPassword = '1234'; // Default recovery password
const saltRounds = 10;

console.log(`Resetting password for user '${username}' to '${newPassword}'...`);

bcrypt.hash(newPassword, saltRounds, function (err, hash) {
    if (err) {
        console.error('Error hashing password:', err);
        return;
    }

    // Update password
    db.run(`UPDATE users SET password = ? WHERE username = ?`,
        [hash, username],
        function (err) {
            if (err) {
                console.error('Error updating password:', err.message);
            } else if (this.changes === 0) {
                console.log(`User '${username}' not found. Creating user instead...`);
                // If user doesn't exist, create it
                db.run(`INSERT INTO users (username, password, name) VALUES (?, ?, ?)`,
                    [username, hash, 'Diego (Admin)'],
                    (err) => {
                        if (err) console.error('Error creating user:', err.message);
                        else console.log('User created successfully.');
                    });
            } else {
                console.log('Password updated successfully.');
            }
            db.close();
        }
    );
});
