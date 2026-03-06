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
                            let cleanType = row.tipo ? row.tipo.trim().toUpperCase() : 'SIN TIPO';

                            if (cleanType.includes('N°')) {
                                cleanType = cleanType.split('N°')[0].trim();
                            }

                            // Normalization mapping
                            if (cleanType.startsWith('INF') || cleanType === 'INFORME') {
                                cleanType = 'INFORME';
                            } else if (cleanType.startsWith('FUT S/N')) {
                                cleanType = 'FUT S/N';
                            } else if (cleanType.startsWith('FUT')) {
                                cleanType = 'FUT';
                            } else if (cleanType.startsWith('SABS') || cleanType === 'SAB') {
                                cleanType = 'SABS';
                            } else if (cleanType.startsWith('CARTA')) {
                                cleanType = 'CARTA';
                            } else if (cleanType.startsWith('REG') || cleanType === 'REGISTRO') {
                                cleanType = 'REGISTRO';
                            } else if (cleanType.startsWith('OFICIO INT')) {
                                cleanType = 'OFICIO INTERNO';
                            } else if (cleanType.startsWith('OFICIO EXT')) {
                                cleanType = 'OFICIO EXTERNO';
                            } else if (cleanType === 'OFICIO' || cleanType.startsWith('OFIC')) {
                                cleanType = 'OFICIO';
                            } else if (cleanType.startsWith('NOTA DE C') && cleanType.includes('INT')) {
                                cleanType = 'NOTA DE CORDINACION INTERNA';
                            } else if (cleanType.startsWith('NOTA DE C') && cleanType.includes('EXT')) {
                                cleanType = 'NOTA DE COODINACION EXTERNA';
                            } else if (cleanType.startsWith('RECIBO EL')) {
                                cleanType = 'RECIBO ELECTRONICO';
                            } else if (cleanType === 'RECIBO' || cleanType.startsWith('REC')) {
                                cleanType = 'RECIBO';
                            } else if (cleanType.startsWith('RES') && cleanType.includes('DIR')) {
                                cleanType = 'RESOLUCION DIRECTORIAL';
                            } else if (cleanType === 'SIN TIPO' || cleanType === '' || cleanType === '"') {
                                cleanType = 'SIN TIPO';
                            } else {
                                cleanType = 'OTROS';
                            }

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
