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
    let { fullName, dni, birthDate, position, email, phone } = req.body;

    // Validation
    if (!fullName || !dni) {
        return res.status(400).json({ error: 'El nombre y el DNI son campos obligatorios.' });
    }

    // Force Uppercase for Name
    fullName = fullName.toUpperCase();

    db.run(`INSERT INTO workers (fullName, dni, birthDate, position, email, phone) VALUES (?, ?, ?, ?, ?, ?)`,
        [fullName, dni, birthDate, position, email, phone],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'El DNI ya se encuentra registrado en el sistema.' });
                }
                return res.status(400).json({ error: 'Error al registrar el trabajador.' });
            }
            res.json({ id: this.lastID, success: true });
        }
    );
};

exports.getUpcomingBirthdays = (req, res) => {
    db.all('SELECT fullName, birthDate, position FROM workers', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Normalize "Today" to start of day (00:00:00) to avoid time issues
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const upcoming = rows.map(w => {
            if (!w.birthDate) return null;

            // Parse birthdate appropriately (Assuming YYYY-MM-DD string from SQLite)
            // Note: "2000-01-22" parsed as UTC might be previous day in local time depending on timezone.
            // Better to parse manually to ensure local date.
            const parts = w.birthDate.split('-');
            // parts[0] = YYYY, parts[1] = MM, parts[2] = DD
            const birthMonth = parseInt(parts[1], 10) - 1;
            const birthDay = parseInt(parts[2], 10);

            let nextBirthday = new Date(today.getFullYear(), birthMonth, birthDay);

            // If birthday has passed this year (strictly less), move to next year.
            // If it is EQUAL (today), it stays this year.
            if (nextBirthday < today) {
                nextBirthday.setFullYear(today.getFullYear() + 1);
            }

            w.nextBirthday = nextBirthday;
            w.daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));

            // Format for display
            const day = nextBirthday.getDate();
            const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
            w.birthDateStr = `${day} ${monthNames[nextBirthday.getMonth()]}`;

            return w;
        })
            .filter(w => w !== null)
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 5);

        res.json(upcoming);
    });
};

exports.updateWorker = (req, res) => {
    const { id } = req.params;
    let { fullName, dni, birthDate, position, email, phone } = req.body;

    if (!fullName || !dni) {
        return res.status(400).json({ error: 'El nombre y el DNI son campos obligatorios.' });
    }

    // Force Uppercase for Name
    fullName = fullName.toUpperCase();

    const sql = `UPDATE workers SET fullName = ?, dni = ?, birthDate = ?, position = ?, email = ?, phone = ? WHERE id = ?`;

    db.run(sql, [fullName, dni, birthDate, position, email, phone, id], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'El DNI ya se encuentra registrado en el sistema.' });
            }
            return res.status(400).json({ error: 'Error al actualizar el trabajador.' });
        }
        if (this.changes === 0) return res.status(404).json({ error: 'Trabajador no encontrado' });
        res.json({ success: true, changes: this.changes });
    });
};

exports.deleteWorker = (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM workers WHERE id = ?', id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
};
