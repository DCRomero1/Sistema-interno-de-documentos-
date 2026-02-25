const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./src/database.sqlite');
db.all('SELECT id, fullName, position, dni FROM workers', [], (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));
});
