const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./src/database.sqlite');
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
    GROUP BY sa.slotId, sa.workerId
`;
db.all(sql, [], (err, rows) => {
    if (err) return console.error(err);
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
    console.log("Total objects returned:", formattedRows.length);
    console.log(JSON.stringify(formattedRows.map(r => r.slotId)));
});
