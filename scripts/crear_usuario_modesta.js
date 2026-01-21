const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la base de datos.');
});

// Datos del usuario nuevo
const username = 'MODESTA';
const passwordPlain = '1234';
const name = 'Modesta'; // El campo en la base de datos es 'name', no 'fullName'
const role = 'admin';

console.log(`Creando usuario: ${username} con contraseña encriptada...`);

// 1. Encriptar la contraseña (Muy importante)
bcrypt.hash(passwordPlain, 10, (err, hash) => {
    if (err) return console.error(err);

    // 2. Insertar en la base de datos
    // NOTA: La columna correcta es 'name', no 'fullName'
    const sql = `INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)`;

    db.run(sql, [username, hash, name, role], function (err) {
        if (err) {
            console.error('Error al crear usuario:', err.message);
        } else {
            console.log('¡Usuario creado con éxito!');
            console.log(`ID: ${this.lastID}`);
        }
        db.close();
    });
});
