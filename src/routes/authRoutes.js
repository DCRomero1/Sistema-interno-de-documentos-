const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

// Configuración de Limite de Intentos (Brute-force protection)
const loginLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 5, // Limitar cada IP a 5 solicitudes por ventana
    handler: (req, res, next, options) => {
        // Cuando se excede el límite
        res.redirect('/login?error=limit');
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Rutas de Login
router.get('/login', authController.showLoginPage);
router.post('/login', loginLimiter, authController.login); // Aplicar limite aquí
router.get('/logout', authController.logout);

// API de Autenticación
router.get('/api/auth/me', authController.checkAuth);
router.post('/api/recover-password', authController.recoverPassword);

module.exports = router;

//modificacion de rutas
