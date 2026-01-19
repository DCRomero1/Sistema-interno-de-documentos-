const db = require('../database');
const path = require('path');

exports.showReportsPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/reports.html'));
};

exports.getSummary = (req, res) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dbDateToday = `${yyyy}-${mm}-${dd}`;
    const dbMonthPrefix = `${yyyy}-${mm}`;

    const queries = {
        todayCount: `SELECT COUNT(*) as count FROM documents WHERE fecha = ?`,
        monthCount: `SELECT COUNT(*) as count FROM documents WHERE fecha LIKE ?`,
        pendingCount: `SELECT COUNT(*) as count FROM documents WHERE status != 'Finalizado'`,
        byType: `SELECT tipo, COUNT(*) as count FROM documents GROUP BY tipo`,
    };

    db.serialize(() => {
        const results = {};

        db.get(queries.todayCount, [dbDateToday], (err, row) => {
            if (err) console.error(err);
            results.today = row ? row.count : 0;

            db.get(queries.monthCount, [`${dbMonthPrefix}%`], (err, row) => {
                if (err) console.error(err);
                results.month = row ? row.count : 0;

                db.get(queries.pendingCount, [], (err, row) => {
                    if (err) console.error(err);
                    results.pending = row ? row.count : 0;

                    db.all(queries.byType, [], (err, rows) => {
                        if (err) console.error(err);

                        const rawRows = rows || [];
                        const grouped = {};

                        rawRows.forEach(row => {
                            let cleanType = row.tipo || 'Sin Tipo';

                            if (cleanType.includes(':')) {
                                cleanType = cleanType.split(':')[0];
                            }
                            if (cleanType.includes('N°')) {
                                cleanType = cleanType.split('N°')[0];
                            }

                            cleanType = cleanType.trim().toUpperCase();
                            if (!cleanType) cleanType = 'SIN TIPO';

                            if (!grouped[cleanType]) {
                                grouped[cleanType] = 0;
                            }
                            grouped[cleanType] += row.count;
                        });

                        results.byType = Object.keys(grouped).map(key => ({
                            tipo: key,
                            count: grouped[key]
                        }));

                        results.byType.sort((a, b) => b.count - a.count);

                        const totalDocs = results.byType.reduce((acc, curr) => acc + curr.count, 0);
                        results.byType = results.byType.map(item => ({
                            ...item,
                            percentage: totalDocs > 0 ? Math.round((item.count / totalDocs) * 100) : 0
                        }));

                        res.json(results);
                    });
                });
            });
        });
    });
};
