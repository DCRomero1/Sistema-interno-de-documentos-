const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al abrir la base de datos:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la base de datos.');
});

const username = 'admin';
const newPassword = 'admin'; // Contraseña por defecto
const saltRounds = 10;

console.log(`Restableciendo contraseña para el usuario '${username}' a '${newPassword}'...`);

bcrypt.hash(newPassword, saltRounds, function (err, hash) {
    if (err) {
        console.error('Error al encriptar contraseña:', err);
        return;
    }

    // Actualizar contraseña
    db.run(`UPDATE users SET password = ? WHERE username = ?`,
        [hash, username],
        function (err) {
            if (err) {
                console.error('Error actualizando contraseña:', err.message);
            } else if (this.changes === 0) {
                console.log(`Usuario '${username}' no encontrado. Creándolo...`);
                // Si no existe, crearlo
                db.run(`INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`,
                    [username, hash, 'Administrador', 'admin'],
                    (err) => {
                        if (err) console.error('Error creando usuario:', err.message);
                        else console.log('Usuario admin creado correctamente.');
                    });
            } else {
                console.log('¡Contraseña actualizada correctamente!');
            }
            db.close();
        }
    );
});
