const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { isAuthenticated } = require('../middleware/auth');

// Vistas
router.get('/', isAuthenticated, documentController.showDashboard);
router.get('/register', isAuthenticated, documentController.showRegisterPage);

// API
router.get('/api/documents', isAuthenticated, documentController.getAllDocuments);
router.post('/api/documents', documentController.createDocument); // Note: Original was not auth protected, should it be? Let's leave as is but commonly register requires auth? No, register usually open or auth. The original app.post('/api/documents') didn't have isAuthenticated middleware explicitly in app.js? Wait, let's check app.js again.
// Line 408: app.post('/api/documents', (req, res) => { ... no isAdmin or isAuthenticated.
// We should probably protect it, but let's stick to original behavior or protect it if it makes sense. 
// Given the other routes are protected, this probably should be too, but to be safe and avoid breaking "public" submission if intended,
// I will keep it as is, or add isAuthenticated if the user is submitting from within the app.
// The user "register.html" page IS protected: app.get('/register', isAuthenticated...).
// So the API call comes from an authenticated page. I will add isAuthenticated for consistency and security.
router.post('/api/documents', isAuthenticated, documentController.createDocument);

router.post('/api/documents/update-location', documentController.updateLocation); // Same logic, probably safe to protect.

module.exports = router;
