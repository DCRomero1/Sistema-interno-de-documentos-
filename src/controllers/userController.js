const db = require('../database');
const bcrypt = require('bcrypt');
const path = require('path');

exports.showUsersPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/users.html'));
};

exports.getAllUsers = (req, res) => {
    db.all('SELECT id, username, name, role, created_at FROM users', [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(rows);
    });
};

exports.createUser = (req, res) => {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
        return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, function (err, hash) {
        if (err) return res.status(500).json({ success: false, error: 'Error procesando contraseña' });

        db.run('INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
            [username, hash, name, role],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ success: false, error: 'El usuario ya existe' });
                    return res.status(500).json({ success: false, error: err.message });
                }
                res.json({ success: true, id: this.lastID });
            });
    });
};

exports.deleteUser = (req, res) => {
    const id = req.params.id;
    // Prevent self-deletion if logged in as admin (simple check by username in session)
    if (req.session.user && req.session.user.username === 'diego' && id == 1) {
        // Validation logic can be improved here
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
};
