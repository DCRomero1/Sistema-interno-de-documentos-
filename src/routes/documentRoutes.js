const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { isAuthenticated } = require('../middleware/auth');

// Vistas
router.get('/', isAuthenticated, documentController.showDashboard);
router.get('/register', isAuthenticated, documentController.showRegisterPage);

// API
router.get('/api/documents', isAuthenticated, documentController.getAllDocuments);
// Nota: El original no estaba protegido, ¿debería estarlo? Comúnmente el registro requiere auth.
// La línea 408 original no tenía middleware.
// Protegeremos esto para mantener la consistencia dado que la página register.html está protegida.
router.post('/api/documents', isAuthenticated, documentController.createDocument);

router.post('/api/documents/update-location', documentController.updateLocation);

// Ruta para subir PDF
router.post('/api/documents/:id/upload', isAuthenticated, documentController.upload.single('pdfFile'), documentController.uploadPdf); // 'pdfFile' must match input name

module.exports = router;








