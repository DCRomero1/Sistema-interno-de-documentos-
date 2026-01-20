const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rutas de Login
router.get('/login', authController.showLoginPage);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// API de Autenticación
router.get('/api/auth/me', authController.checkAuth);
router.post('/api/recover-password', authController.recoverPassword);

module.exports = router;

//modificacion de rutas
