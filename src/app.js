require('dotenv').config(); // Load environment variables first

const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const port = process.env.PORT || 3000;

// Import Routes
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const userRoutes = require('./routes/userRoutes');
const workerRoutes = require('./routes/workerRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Middleware for parsing JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'fallback-secret-key', // Use .env or fallback
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 3600000, // 1 hour
        httpOnly: true, // Prevent XSS theft
        secure: process.env.NODE_ENV === 'production' // Secure only in production (HTTPS)
    }
}));

// Servir archivos estáticos (CSS, JS, imágenes)
// Nota: Express busca aquí primero. Si no encuentra, sigue a las rutas.
app.use(express.static(path.join(__dirname, '../public')));

// Middleware to prevent caching (Fixes "Back" button issue)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    next();
});

// --- RUTAS ---
app.use(authRoutes);
app.use(documentRoutes);
app.use(userRoutes);
app.use(workerRoutes);
app.use(reportRoutes);

// Manejo de error 404 (Opcional, pero buena práctica)
app.use((req, res) => {
    res.status(404).send('<h1>404 no encontrado</h1><p>La ruta solicitada no existe.</p><a href="/">Volver al inicio</a>');
});

// Encender el servidor
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
