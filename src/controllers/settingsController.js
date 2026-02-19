const db = require('../database');

// GET /api/settings/:key — Obtener un valor de configuración
exports.getSetting = (req, res) => {
    const { key } = req.params;

    db.get('SELECT value, updated_at FROM settings WHERE key = ?', [key], (err, row) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        if (!row) {
            return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
        }
        res.json({ success: true, key, value: row.value, updated_at: row.updated_at });
    });
};

// POST /api/settings — Guardar o actualizar un valor de configuración
exports.setSetting = (req, res) => {
    const { key, value } = req.body;

    if (!key || !value) {
        return res.status(400).json({ success: false, error: 'Faltan key o value' });
    }

    const sql = `
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
    `;

    db.run(sql, [key, value], function (err) {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, key, value });
    });
};
