const db = require('./src/database');

setTimeout(() => {
    db.all("SELECT * FROM workers WHERE fullName LIKE '%DIEGO%'", [], (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Search Results for DIEGO:');
            console.log(JSON.stringify(rows, null, 2));

            // Also check total count
            db.get("SELECT Count(*) as count FROM workers", (err, row) => {
                console.log('Total Workers in DB:', row.count);
            });
        }
    });
}, 1000);
