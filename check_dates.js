const db = require('./src/database');

setTimeout(() => {
    db.all('SELECT fullName, birthDate FROM workers', [], (err, rows) => {
        if (err) console.error(err);
        else {
            console.log('--- Worker Dates ---');
            rows.forEach(r => console.log(`${r.fullName}: "${r.birthDate}"`));
        }
    });
}, 1000);
