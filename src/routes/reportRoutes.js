const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { isAuthenticated } = require('../middleware/auth');

router.get('/reports', isAuthenticated, reportController.showReportsPage);
router.get('/api/reports/summary', isAuthenticated, reportController.getSummary);

module.exports = router;
