const db = require('../src/database');
const bcrypt = require('bcrypt');

const saltRounds = 10;

// ==========================================
// EDITAR AQUI LOS USUARIOS QUE QUIERES AGREGAR
// ==========================================
const usuariosNuevos = [
    { username: 'usuario1', password: 'password123', name: 'Usuario Uno' },
    { username: 'secretaria', password: 'sec123', name: 'Secretaria General' },
    { username: 'diego', password: 'diego', name: 'diego' },

    // Copia y pega para agregar más...
];

console.log('Iniciando creación de usuarios...');

let completed = 0;

usuariosNuevos.forEach(user => {
    bcrypt.hash(user.password, saltRounds, (err, hash) => {
        if (err) {
            console.error(`Error encriptando contraseña para ${user.username}:`, err);
            return;
        }

        const insertSql = 'INSERT INTO users (username, password, name) VALUES (?, ?, ?)';
        db.run(insertSql, [user.username, hash, user.name], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    console.log(`[SALTADO] El usuario "${user.username}" ya existe.`);
                } else {
                    console.error(`ERROR creando usuario "${user.username}":`, err.message);
                }
            } else {
                console.log(`[OK] Usuario "${user.username}" creado exitosamente (ID: ${this.lastID}).`);
            }

            completed++;
            if (completed === usuariosNuevos.length) {
                console.log('--- Proceso Finalizado ---');
                // Esperar un momento para que se vacíe el buffer de logs antes de salir
                // (SQLite a veces necesita un pequeño delay si se cierra muy rápido)
                setTimeout(() => process.exit(0), 500);
            }
        });
    });
});
