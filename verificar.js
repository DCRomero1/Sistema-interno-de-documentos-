const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join('c:', 'Users', 'det_n', 'OneDrive', 'Documentos', 'Proyectos', 'Reportes', 'src', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Verificando base de datos...');

db.all('SELECT name FROM areas WHERE pavilion_id = (SELECT id FROM pavilions WHERE name LIKE "%Áreas Comunes%")', (err, rows) => {
    if (err) {
        console.error('Error:', err.message);
    } else {
        console.log('Áreas encontradas en Áreas Comunes:');
        rows.forEach(row => console.log('- ' + row.name));
    }
    db.close();
});
