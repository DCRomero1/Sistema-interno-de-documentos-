const db = require('../database');

// Obtener todos los pabellones con sus áreas anidadas
exports.getAllPavilions = (req, res) => {
    const sqlPavilions = `SELECT * FROM pavilions`;
    const sqlAreas = `SELECT * FROM areas`;

    db.all(sqlPavilions, [], (err, pavilions) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all(sqlAreas, [], (err2, areas) => {
            if (err2) return res.status(500).json({ error: err2.message });

            // Anidar áreas dentro de sus pabellones
            const anidados = pavilions.map(p => {
                p.areas = areas.filter(a => a.pavilion_id === p.id);
                return p;
            });

            res.json(anidados);
        });
    });
};

// Obtener áreas específicas asignadas a un trabajador
exports.getWorkerPavilions = (req, res) => {
    const { workerId } = req.params;
    const sql = `
        SELECT a.* 
        FROM areas a
        JOIN worker_areas wa ON a.id = wa.area_id
        WHERE wa.worker_id = ?
    `;
    db.all(sql, [workerId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// Asignar o actualizar áreas específicas para un trabajador
// (Mantenemos el nombre actual de la exportación para no quebrar rutas aún)
exports.assignPavilionsToWorker = (req, res) => {
    // Aunque el frontend mande "pavilionIds" por legacy, internamente serán area_ids
    const { workerId, pavilionIds } = req.body;
    let areaIds = pavilionIds;

    if (!workerId || !Array.isArray(areaIds)) {
        return res.status(400).json({ error: 'Faltan datos requeridos o formato inválido.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Eliminar asignaciones anteriores
        db.run(`DELETE FROM worker_areas WHERE worker_id = ?`, [workerId], (err) => {
            if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }

            // Si no hay áreas seleccionadas, terminar
            if (areaIds.length === 0) {
                db.run('COMMIT');
                return res.json({ success: true, message: 'Áreas asignadas correctamente (ninguna).' });
            }

            // Insertar nuevas asignaciones usando transaction param
            const stmt = db.prepare(`INSERT INTO worker_areas (worker_id, area_id) VALUES (?, ?)`);
            let hasError = false;

            areaIds.forEach(aId => {
                stmt.run([workerId, aId], (err) => {
                    if (err) {
                        hasError = true;
                        console.error('Insert error:', err);
                    }
                });
            });

            stmt.finalize((err) => {
                if (hasError || err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al insertar asignaciones.' });
                } else {
                    db.run('COMMIT');
                    res.json({ success: true, message: 'Áreas específicas asignadas correctamente.' });
                }
            });
        });
    });
};
