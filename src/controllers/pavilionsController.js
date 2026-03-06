const db = require('../database');

// Obtener todos los pabellones con sus áreas anidadas
exports.getAllPavilions = (req, res) => {
    const sqlPavilions = `SELECT * FROM pavilions ORDER BY sort_order ASC, id ASC`;
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
        JOIN cleaner_areas wa ON a.id = wa.area_id
        WHERE wa.cleaner_id = ?
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
        db.run(`DELETE FROM cleaner_areas WHERE cleaner_id = ?`, [workerId], (err) => {
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
            const stmt = db.prepare(`INSERT INTO cleaner_areas (cleaner_id, area_id) VALUES (?, ?)`);
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

// Obtener áreas asignadas a un turno (Slot) específico
exports.getSlotAreas = (req, res) => {
    const { slotId } = req.params;
    const sql = `
        SELECT a.* 
        FROM areas a
        JOIN slot_areas sa ON a.id = sa.area_id
        WHERE sa.slot_id = ?
    `;
    db.all(sql, [slotId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

// Asignar áreas a un turno (Slot) específico
exports.assignAreasToSlot = (req, res) => {
    const { slotId, areaIds } = req.body;

    if (!slotId || !Array.isArray(areaIds)) {
        return res.status(400).json({ error: 'Faltan datos requeridos o formato inválido.' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Eliminar asignaciones anteriores de este slot
        db.run('DELETE FROM slot_areas WHERE slot_id = ?', [slotId], (err) => {
            if (err) {
                console.error('Delete slot areas error:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: err.message });
            }

            // Si no hay áreas seleccionadas, terminar (se limpió el slot)
            if (areaIds.length === 0) {
                db.run('COMMIT');
                return res.json({ success: true, message: 'Áreas del turno limpiadas.' });
            }

            // Insertar nuevas asignaciones para el slot
            const stmt = db.prepare('INSERT INTO slot_areas (slot_id, area_id) VALUES (?, ?)');
            let hasError = false;

            areaIds.forEach(aId => {
                stmt.run([slotId, aId], (err) => {
                    if (err) {
                        hasError = true;
                        console.error('Insert slot area error:', err);
                    }
                });
            });

            stmt.finalize((err) => {
                if (hasError || err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Error al insertar asignaciones en el turno.' });
                } else {
                    db.run('COMMIT');
                    res.json({ success: true, message: 'Áreas asignadas al turno correctamente.' });
                }
            });
        });
    });
};
