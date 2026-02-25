const express = require('express');
const router = express.Router();
const cleanersController = require('../controllers/cleanersController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/cleaners', isAuthenticated, cleanersController.showCleanersPage);
router.get('/api/cleaners', isAuthenticated, cleanersController.getAllCleaners);
router.post('/api/cleaners', isAuthenticated, cleanersController.createCleaner);
router.put('/api/cleaners/:id', isAuthenticated, cleanersController.updateCleaner);
router.delete('/api/cleaners/:id', isAuthenticated, cleanersController.deleteCleaner);

module.exports = router;
