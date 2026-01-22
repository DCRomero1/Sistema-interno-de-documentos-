const db = require('./src/database');

// Wait for connection
setTimeout(() => {
    db.all('SELECT * FROM workers', [], (err, rows) => {
        if (err) {
            console.error('Error fetching workers:', err.message);
        } else {
            console.log(`Found ${rows.length} workers.`);
            if (rows.length > 0) {
                console.log('First worker sample:', rows[0]);
                console.log('Last worker sample:', rows[rows.length - 1]);
            }
        }
        process.exit();
    });
}, 1000);
