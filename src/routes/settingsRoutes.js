const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { isAuthenticated } = require('../middleware/auth');

// Obtener un setting por clave
router.get('/api/settings/:key', isAuthenticated, settingsController.getSetting);

// Guardar / actualizar un setting
router.post('/api/settings', isAuthenticated, settingsController.setSetting);

module.exports = router;
