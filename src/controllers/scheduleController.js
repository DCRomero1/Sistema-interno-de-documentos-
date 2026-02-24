const db = require('../database');

exports.showHorariosPage = (req, res) => {
    res.sendFile(require('path').join(__dirname, '../../views/horarios.html'));
};

exports.getAssignments = (req, res) => {
    const sql = `
        SELECT 
            sa.slotId, 
            sa.workerId, 
            w.fullName, 
            w.position,
            GROUP_CONCAT(p.name, '||') as pavilion_names,
            GROUP_CONCAT(a.name, '||') as area_names
        FROM schedule_assignments sa
        LEFT JOIN workers w ON sa.workerId = w.id
        LEFT JOIN worker_areas wa ON sa.workerId = wa.worker_id
        LEFT JOIN areas a ON wa.area_id = a.id
        LEFT JOIN pavilions p ON a.pavilion_id = p.id
        GROUP BY sa.slotId
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
    const { slotId, workerId } = req.body;

    if (!slotId) {
        return res.status(400).json({ error: 'slotId is required' });
    }

    const sql = `INSERT OR REPLACE INTO schedule_assignments (slotId, workerId) VALUES (?, ?)`;

    db.run(sql, [slotId, workerId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, slotId, workerId });
    });
};



