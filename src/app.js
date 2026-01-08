const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const port = 3000;

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: 'secret-key-change-this-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour
}));

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (req.session.user) {
        return next();
    }
    res.redirect('/login');
}

// Static files (Allow CSS/JS even if not logged in, or protect them? Usually public is public)
app.use(express.static(path.join(__dirname, '../public')));

// In-memory data store (Simulating a database)
let documents = [

];

// Login Routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '../views/login.html'));
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Hardcoded credentials: admin / admin
    if (username === 'admin' && password === 'admin') {
        req.session.user = { username: 'admin' };
        res.redirect('/');
    } else {
        res.redirect('/login?error=1');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Proteccion de los datos 
app.get('/', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/index.html'));
});

app.get('/register', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/register.html'));
});

app.get('/reports', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/reports.html'));
});

// API Routes (Also protected)
app.get('/api/documents', isAuthenticated, (req, res) => {
    res.json(documents);
});

app.post('/api/documents', (req, res) => {
    const newDoc = req.body;
    // Auto-generate Correlativo (ID)
    newDoc.id = String(documents.length + 1).padStart(3, '0');

    // Initialize fields that are not in the form as empty/pending
    newDoc.fechaDespacho = newDoc.fechaDespacho || '';
    newDoc.ubicacion = newDoc.destino || '';
    newDoc.folios = newDoc.folios || '';
    newDoc.cargo = newDoc.cargo || '';

    // Initialize History
    newDoc.history = [{
        date: newDoc.fecha, // Creation date
        action: 'Recepción',
        from: 'Exterior', // Or specific logic
        to: newDoc.origen, // Initially received at origin logic? Or simply "Registered"
        observation: 'Documento registrado'
    }];

    documents.unshift(newDoc);
    res.status(201).json(newDoc);
});

app.post('/api/documents/update-location', (req, res) => {
    const { id, ubicacion, fechaDespacho, cargo, observaciones } = req.body;
    const docIndex = documents.findIndex(d => d.id === id);

    if (docIndex > -1) {
        const doc = documents[docIndex];

        // Create History Record before updating
        const movement = {
            date: new Date().toISOString().split('T')[0], // Today's date YYYY-MM-DD
            action: 'Derivación / Actualización',
            from: doc.ubicacion || doc.origen, // Previous location
            to: ubicacion,
            cargo: cargo,
            observation: observaciones || 'Sin observaciones'
        };

        if (!doc.history) doc.history = []; // Safety check for old docs
        doc.history.push(movement);

        // Update fields
        if (ubicacion !== undefined) doc.ubicacion = ubicacion;
        if (fechaDespacho !== undefined) doc.fechaDespacho = fechaDespacho;
        if (cargo !== undefined) doc.cargo = cargo;

        if (observaciones) {
            doc.observaciones = doc.observaciones ?
                doc.observaciones + `; ${observaciones}` : observaciones;
        }

        res.json({ success: true, doc: doc });
    } else {
        res.status(404).json({ success: false, message: 'Documento no encontrado' });
    }
});

// Encender el servidor 
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
