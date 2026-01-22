const db = require('./src/database');

setTimeout(() => {
    console.log('--- Starting DB Verification ---');
    // 1. Insert
    db.run(`INSERT INTO workers (fullName, dni, birthDate, position, email, phone) VALUES (?, ?, ?, ?, ?, ?)`,
        ['Test Verification User', '11223344', '1990-01-01', 'Docente', 'test@verify.com', '123456'],
        function (err) {
            if (err) {
                console.error('Insert Failed:', err.message);
                process.exit(1);
            }
            console.log(`Inserted Test User with ID: ${this.lastID}`);
            const newId = this.lastID;

            // 2. Read
            db.all('SELECT * FROM workers', [], (err, rows) => {
                if (err) {
                    console.error('Read Failed:', err.message);
                } else {
                    console.log(`Total Workers found: ${rows.length}`);
                    rows.forEach(r => console.log(` - ${r.fullName} (ID: ${r.id})`));
                }

                // 3. Delete
                db.run('DELETE FROM workers WHERE id = ?', newId, (err) => {
                    if (err) console.error('Delete Failed:', err.message);
                    else console.log('Test User Deleted.');
                    process.exit(0);
                });
            });
        }
    );
}, 1000);
