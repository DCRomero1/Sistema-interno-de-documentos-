const db = require('../database');
const bcrypt = require('bcrypt');
const path = require('path');

// Mostrar página de login
exports.showLoginPage = (req, res) => {
    if (req.session.user) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, '../../views/login.html'));
};

// Procesar login
exports.login = (req, res) => {
    let { username, password } = req.body;
    username = username ? username.trim() : '';

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error(err);
            return res.redirect('/login?error=1');
        }
        if (!user) {
            return res.redirect('/login?error=1');
        }

        // Comparar contraseñas
        bcrypt.compare(password, user.password, (err, result) => {
            if (result === true) {
                req.session.user = {
                    username: user.username,
                    name: user.name,
                    role: user.role || 'user'
                };
                res.redirect('/');
            } else {
                res.redirect('/login?error=1');
            }
        });
    });
};

// Procesar logout
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
};

// Verificar autenticación (API)
exports.checkAuth = (req, res) => {
    if (req.session.user) {
        res.json({
            authenticated: true,
            user: {
                username: req.session.user.username,
                name: req.session.user.name,
                role: req.session.user.role || 'user'
            }
        });
    } else {
        res.json({ authenticated: false });
    }
};

// Recuperación de contraseña (Master Key)
exports.recoverPassword = (req, res) => {
    const { masterKey, newPassword } = req.body;
    const MASTER_KEY = process.env.MASTER_KEY || 'vigil2026';

    if (masterKey !== MASTER_KEY) {
        return res.status(401).json({ success: false, error: 'Clave maestra incorrecta' });
    }

    if (!newPassword) {
        return res.status(400).json({ success: false, error: 'Ingrese nueva contraseña' });
    }

    const saltRounds = 10;
    bcrypt.hash(newPassword, saltRounds, function (err, hash) {
        if (err) return res.status(500).json({ success: false, error: 'Error al procesar' });

        const targetUser = 'diego';

        db.run('UPDATE users SET password = ? WHERE username = ?', [hash, targetUser], function (err) {
            if (err) return res.status(500).json({ success: false, error: err.message });

            if (this.changes === 0) {
                db.run('INSERT INTO users (username, password, name) VALUES (?, ?, ?)',
                    [targetUser, hash, 'Diego (Admin)'],
                    (err) => {
                        if (err) return res.status(500).json({ success: false, error: 'Error recargando usuario' });
                        res.json({ success: true, message: 'Usuario recreado y contraseña actualizada' });
                    });
            } else {
                res.json({ success: true });
            }
        });
    });
};
