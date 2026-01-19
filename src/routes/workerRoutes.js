const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/workers', isAuthenticated, workerController.showWorkersPage);
router.get('/api/workers', isAuthenticated, workerController.getAllWorkers);
router.post('/api/workers', isAuthenticated, workerController.createWorker);
router.get('/api/workers/birthdays', isAuthenticated, workerController.getUpcomingBirthdays);

module.exports = router;
