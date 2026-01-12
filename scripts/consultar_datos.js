const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Conexión a la base de datos
const dbPath = path.join(__dirname, 'src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('Error:', err);
});

console.log('\n=============================================');
console.log('      CONSULTA DE BASE DE DATOS LOCAL');
console.log('=============================================\n');

db.serialize(() => {
    // 1. Ver Documentos
    console.log('--- 📄 DOCUMENTOS REGISTRADOS ---');
    db.all("SELECT id, fecha, origen, status FROM documents", (err, rows) => {
        if (err) console.log(err);
        else {
            if (rows.length === 0) console.log("   (No hay documentos)");
            console.table(rows);
        }

        // 2. Ver Usuarios
        console.log('\n--- 👤 USUARIOS REGISTRADOS ---');
        db.all("SELECT id, username, name FROM users", (err, users) => {
            if (err) console.log(err);
            else {
                console.table(users);
            }
            console.log('\n=============================================');
        });
    });
});

db.close();
