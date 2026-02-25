const db = require('../database');

exports.showHorariosPage = (req, res) => {
    res.sendFile(require('path').join(__dirname, '../../views/horarios.html'));
};

exports.getAssignments = (req, res) => {
    const sql = `
        SELECT 
            sa.slotId, 
            sa.cleanerId as workerId, 
            w.fullName, 
            w.position,
            GROUP_CONCAT(p.name, '||') as pavilion_names,
            GROUP_CONCAT(a.name, '||') as area_names
        FROM schedule_assignments sa
        LEFT JOIN cleaning_staff w ON sa.cleanerId = w.id
        LEFT JOIN cleaner_areas wa ON sa.cleanerId = wa.cleaner_id
        LEFT JOIN areas a ON wa.area_id = a.id
        LEFT JOIN pavilions p ON a.pavilion_id = p.id
        GROUP BY sa.slotId, sa.cleanerId
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const formattedRows = rows.map(row => {
            let areas = [];
            if (row.area_names && row.pavilion_names) {
                const pNames = row.pavilion_names.split('||');
                const aNames = row.area_names.split('||');
                for (let i = 0; i < aNames.length; i++) {
                    areas.push({ name: pNames[i], description: aNames[i] });
                }
            }
            return {
                slotId: row.slotId,
                workerId: row.workerId,
                fullName: row.fullName,
                position: row.position,
                areas: areas
            };
        });

        res.json(formattedRows);
    });
};

exports.assignWorker = (req, res) => {
    const { slotId, workerId, action } = req.body; // action: 'add', 'replace', 'remove', 'clear'

    if (!slotId) {
        return res.status(400).json({ error: 'slotId is required' });
    }

    if (action === 'clear' || (!action && workerId === null)) {
        db.run(`DELETE FROM schedule_assignments WHERE slotId = ?`, [slotId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ success: true, slotId });
        });
        return;
    }

    if (!workerId || isNaN(parseInt(workerId))) {
        return res.status(400).json({ error: 'Se requiere un workerId válido' });
    }

    if (action === 'replace') {
        db.run(`DELETE FROM schedule_assignments WHERE slotId = ?`, [slotId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            db.run(`INSERT OR IGNORE INTO schedule_assignments (slotId, cleanerId) VALUES (?, ?)`, [slotId, workerId], function (err) {
                if (err) return res.status(500).json({ error: err.message });
                return res.json({ success: true, slotId, workerId });
            });
        });
        return;
    }

    if (action === 'remove') {
        db.run(`DELETE FROM schedule_assignments WHERE slotId = ? AND cleanerId = ?`, [slotId, workerId], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            return res.json({ success: true, slotId, workerId });
        });
        return;
    }

    // Default 'add'
    db.run(`INSERT OR IGNORE INTO schedule_assignments (slotId, cleanerId) VALUES (?, ?)`, [slotId, workerId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, slotId, workerId });
    });
};



