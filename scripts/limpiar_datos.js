const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src/database.sqlite');
const db = new sqlite3.Database(dbPath);

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n===============================================================');
console.log('⚠️  ATENCIÓN: ESTO BORRARÁ TODOS LOS DOCUMENTOS DEL SISTEMA ⚠️');
console.log('===============================================================\n');
console.log('NOTA: Los usuarios (como admin) y los trabajadores NO se borrarán.');
console.log('Solo se eliminarán los documentos y sus historiales.\n');

readline.question('¿Estás seguro de que quieres continuar? Escribe "SI" para borrar: ', (answer) => {
    if (answer === 'SI') {
        db.serialize(() => {
            // Borrar Historial primero (por la llave foránea)
            db.run("DELETE FROM document_history", (err) => {
                if (err) console.error('Error borrando historial:', err);
                else console.log('✅ Historial eliminado.');
            });

            // Borrar Documentos
            db.run("DELETE FROM documents", (err) => {
                if (err) console.error('Error borrando documentos:', err);
                else console.log('✅ Documentos eliminados.');
            });

            // Opcional: Reiniciar contadores si SQLite los guardó
            db.run("DELETE FROM sqlite_sequence WHERE name='document_history'", (err) => {
                // Silencioso
            });
        });

        setTimeout(() => {
            console.log('\n------------------------------------------------');
            console.log('¡Limpieza completada! Ahora puedes ingresar datos reales.');
            console.log('------------------------------------------------');
            process.exit(0);
        }, 1500);

    } else {
        console.log('\nOperación cancelada. No se borró nada.');
        process.exit(0);
    }
});
