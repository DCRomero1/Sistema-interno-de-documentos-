const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// In-memory data store (Simulating a database)
let documents = [
    {
        id: '001',
        fecha: '2026-01-07',
        tipo: 'Oficio',
        origen: 'Gerencia Municipal', // Area de donde llega
        concepto: 'Solicitud de inspección técnica',
        fechaDespacho: '2026-01-07',
        ubicacion: 'JEFATURA DE UNIDAD DE ADMINISTRACION', // Area que corresponde
        folios: '5',
        cargo: 'Juan Perez'
    },
    {
        id: '002',
        fecha: '2026-01-07',
        tipo: 'Carta',
        origen: 'Contabilidad',
        concepto: 'Informes contables',
        fechaDespacho: '2026-01-08',
        ubicacion: 'Contabilidad',
        folios: '12',
        cargo: 'Maria Delgado'
    }
];

// Routes for Views
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/register.html'));
});

app.get('/reports', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/reports.html'));
});

// API Routes
app.get('/api/documents', (req, res) => {
    res.json(documents);
});

app.post('/api/documents', (req, res) => {
    const newDoc = req.body;
    // Auto-generate Correlativo (ID)
    newDoc.id = String(documents.length + 1).padStart(3, '0');
    // Ensure ubicacion matches the destination area
    newDoc.ubicacion = newDoc.destino || 'Mesa de partes';

    documents.unshift(newDoc);
    res.status(201).json(newDoc);
});

app.post('/api/documents/update-location', (req, res) => {
    const { id, ubicacion, observaciones } = req.body;
    const docIndex = documents.findIndex(d => d.id === id);
    if (docIndex > -1) {
        documents[docIndex].ubicacion = ubicacion;
        // Append observation if provided
        if (observaciones) {
            documents[docIndex].observaciones += `; ${observaciones}`;
        }
        res.json({ success: true, doc: documents[docIndex] });
    } else {
        res.status(404).json({ success: false, message: 'Documento no encontrado' });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
