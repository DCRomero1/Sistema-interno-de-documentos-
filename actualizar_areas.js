const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Usamos la ruta absoluta para evitar confusiones de directorio
const dbPath = path.join('c:', 'Users', 'det_n', 'OneDrive', 'Documentos', 'Proyectos', 'Reportes', 'src', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Abriendo base de datos en:', dbPath);

db.serialize(() => {
    // 1. Buscamos el ID del pabellón "Áreas Comunes..."
    db.get('SELECT id FROM pavilions WHERE name LIKE "%Áreas Comunes%"', (err, row) => {
        if (err) {
            console.error('Error al buscar pabellón:', err.message);
            db.close();
            return;
        }

        if (!row) {
            console.error('No se encontró el pabellón de Áreas Comunes.');
            db.close();
            return;
        }

        const pavilionId = row.id;
        console.log('ID encontrado para Áreas Comunes:', pavilionId);

        const nuevasAreas = ['Galerias', 'Ventanas', 'Patios comunes'];

        const stmt = db.prepare('INSERT OR IGNORE INTO areas (pavilion_id, name) VALUES (?, ?)');

        nuevasAreas.forEach(area => {
            stmt.run([pavilionId, area], (err) => {
                if (err) console.error(`Error al insertar ${area}:`, err.message);
                else console.log(`✓ Área agregada: ${area}`);
            });
        });

        stmt.finalize(() => {
            console.log('Proceso de actualización completado.');
            db.close();
        });
    });
});
