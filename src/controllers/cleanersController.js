const db = require('../database');
const path = require('path');

exports.showCleanersPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/cleaners.html'));
};

exports.getAllCleaners = (req, res) => {
    db.all('SELECT * FROM cleaning_staff ORDER BY fullName', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
};

exports.createCleaner = (req, res) => {
    let { fullName, dni, birthDate, position, email, phone } = req.body;

    // Validation
    if (!fullName || !dni) {
        return res.status(400).json({ error: 'El nombre y el DNI son campos obligatorios.' });
    }

    // Force Uppercase for Name
    fullName = fullName.toUpperCase();
    if (!position || position.trim() === '') position = 'Personal de Limpieza';

    db.run(`INSERT INTO cleaning_staff (fullName, dni, birthDate, position, email, phone) VALUES (?, ?, ?, ?, ?, ?)`,
        [fullName, dni, birthDate, position, email, phone],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'El DNI ya se encuentra registrado en el sistema.' });
                }
                return res.status(400).json({ error: 'Error al registrar al conserje.' });
            }
            res.json({ id: this.lastID, success: true });
        }
    );
};

exports.updateCleaner = (req, res) => {
    const { id } = req.params;
    let { fullName, dni, birthDate, position, email, phone } = req.body;

    if (!fullName || !dni) {
        return res.status(400).json({ error: 'El nombre y el DNI son campos obligatorios.' });
    }

    // Force Uppercase for Name
    fullName = fullName.toUpperCase();
    if (!position || position.trim() === '') position = 'Personal de Limpieza';

    const sql = `UPDATE cleaning_staff SET fullName = ?, dni = ?, birthDate = ?, position = ?, email = ?, phone = ? WHERE id = ?`;

    db.run(sql, [fullName, dni, birthDate, position, email, phone, id], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'El DNI ya se encuentra registrado en el sistema.' });
            }
            return res.status(400).json({ error: 'Error al actualizar al conserje.' });
        }
        if (this.changes === 0) return res.status(404).json({ error: 'Conserje no encontrado' });
        res.json({ success: true, changes: this.changes });
    });
};

exports.deleteCleaner = (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM cleaning_staff WHERE id = ?', id, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, changes: this.changes });
    });
};
