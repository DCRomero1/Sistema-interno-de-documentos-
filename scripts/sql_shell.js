const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const readline = require('readline');

const dbPath = path.join(__dirname, 'src/database.sqlite');
const db = new sqlite3.Database(dbPath);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'SQL> '
});

console.log('========================================================');
console.log('      CONSOLA SQL INTERACTIVA - SISTEMA DE REPORTES');
console.log('========================================================');
console.log('Puedes escribir cualquier consulta SQL estándar.');
console.log('Ejemplos:');
console.log('  SELECT * FROM documents');
console.log('  SELECT * FROM workers');
console.log('  DELETE FROM documents WHERE id = "001"');
console.log('\nEscribe "exit" para salir.\n');

rl.prompt();

rl.on('line', (line) => {
    const query = line.trim();
    if (query.toLowerCase() === 'exit') {
        rl.close();
        return;
    }
    if (!query) {
        rl.prompt();
        return;
    }

    // Detectar si es SELECT para mostrar tabla, o comando de ejecución
    const firstWord = query.split(' ')[0].toUpperCase();
    const isSelect = ['SELECT', 'PRAGMA', 'EXPLAIN'].includes(firstWord);

    if (isSelect) {
        db.all(query, (err, rows) => {
            if (err) {
                console.error('\x1b[31m%s\x1b[0m', 'Error SQL:', err.message);
            } else {
                if (rows.length === 0) console.log('(Sin resultados)');
                else console.table(rows);
            }
            console.log('');
            rl.prompt();
        });
    } else {
        db.run(query, function (err) {
            if (err) {
                console.error('\x1b[31m%s\x1b[0m', 'Error SQL:', err.message);
            } else {
                console.log(`\x1b[32m%s\x1b[0m`, `✔ Ejecutado correctamente. Filas afectadas: ${this.changes}`);
            }
            console.log('');
            rl.prompt();
        });
    }
}).on('close', () => {
    console.log('\nCerrando consola...');
    db.close();
    process.exit(0);
});
