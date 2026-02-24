const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/scheduleController');
const pavilionsController = require('../controllers/pavilionsController');

// Page
router.get('/horarios', scheduleController.showHorariosPage);

// API Horarios
router.get('/api/schedule', scheduleController.getAssignments);
router.post('/api/schedule/assign', scheduleController.assignWorker);

// API Pabellones y Áreas
router.get('/api/pavilions', pavilionsController.getAllPavilions);
router.get('/api/workers/:workerId/pavilions', pavilionsController.getWorkerPavilions);
router.post('/api/workers/pavilions/assign', pavilionsController.assignPavilionsToWorker);

module.exports = router;
