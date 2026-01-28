const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAdmin } = require('../middleware/auth');

// Vistas
router.get('/users', isAdmin, userController.showUsersPage);

// API
router.get('/api/users', isAdmin, userController.getAllUsers);
router.post('/api/users', isAdmin, userController.createUser);
router.delete('/api/users/:id', isAdmin, userController.deleteUser);
router.put('/api/users/:id', isAdmin, userController.updateUser);

module.exports = router;
