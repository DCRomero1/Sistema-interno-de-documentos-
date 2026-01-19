const db = require('../database');
const path = require('path');

exports.showWorkersPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/workers.html'));
};

exports.getAllWorkers = (req, res) => {
    db.all('SELECT * FROM workers ORDER BY fullName', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.createWorker = (req, res) => {
    const { fullName, dni, birthDate, position } = req.body;
    db.run(`INSERT INTO workers (fullName, dni, birthDate, position) VALUES (?, ?, ?, ?)`,
        [fullName, dni, birthDate, position],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
};

exports.getUpcomingBirthdays = (req, res) => {
    db.all('SELECT fullName, birthDate, position FROM workers', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const currentDay = today.getDate();

        const upcoming = rows.map(w => {
            const dob = new Date(w.birthDate);
            let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate() + 1);

            if (nextBirthday < new Date(currentYear, currentMonth, currentDay)) {
                nextBirthday.setFullYear(currentYear + 1);
            }

            w.nextBirthday = nextBirthday;
            w.daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));

            // Formatear fecha legible
            w.birthDateStr = nextBirthday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            return w;
        })
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 5); // Obtener los 5 próximos

        res.json(upcoming);
    });
};
