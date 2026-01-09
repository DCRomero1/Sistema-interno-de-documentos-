const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const port = 3000;
const db = require('./database');
const bcrypt = require('bcrypt');

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

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            console.error(err);
            return res.redirect('/login?error=1');
        }
        if (!user) {
            return res.redirect('/login?error=1');
        }

        // Compare hashed password
        bcrypt.compare(password, user.password, (err, result) => {
            if (result === true) {
                req.session.user = { username: user.username, name: user.name };
                res.redirect('/');
            } else {
                res.redirect('/login?error=1');
            }
        });
    });
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

app.get('/workers', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '../views/workers.html'));
});

// --- WORKERS API ---
// Get all workers (for the list)
app.get('/api/workers', isAuthenticated, (req, res) => {
    db.all('SELECT * FROM workers ORDER BY fullName', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Register new worker
app.post('/api/workers', isAuthenticated, (req, res) => {
    const { fullName, dni, birthDate, position } = req.body;
    db.run(`INSERT INTO workers (fullName, dni, birthDate, position) VALUES (?, ?, ?, ?)`,
        [fullName, dni, birthDate, position],
        function (err) {
            if (err) return res.status(400).json({ error: err.message });
            res.json({ id: this.lastID, success: true });
        }
    );
});

// Get Upcoming Birthdays
app.get('/api/workers/birthdays', isAuthenticated, (req, res) => {
    db.all('SELECT fullName, birthDate, position FROM workers', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11
        const currentDay = today.getDate();

        // Calculate next birthday for each worker
        const upcoming = rows.map(w => {
            const dob = new Date(w.birthDate);
            // Set birthday to this year
            let nextBirthday = new Date(currentYear, dob.getMonth(), dob.getDate() + 1); // +1 fix timezone offset roughly

            // If birthday passed this year OR it's today but effectively passed? 
            // Better logic: Compare MM-DD
            // Create comparable date objects
            // Actually simpler: 
            // If (Month < CurMonth) or (Month == CurMonth && Day < CurDay) -> Next Year

            if (nextBirthday < new Date(currentYear, currentMonth, currentDay)) {
                nextBirthday.setFullYear(currentYear + 1);
            }

            w.nextBirthday = nextBirthday;
            w.daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));

            // Format nice date
            w.birthDateStr = nextBirthday.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            return w;
        })
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 5); // Get top 5 upcoming

        res.json(upcoming);
    });
});

// API Routes (Also protected)
app.get('/api/documents', isAuthenticated, (req, res) => {
    res.json(documents);
});

app.post('/api/documents', (req, res) => {
    const newDoc = req.body;
    // Auto-generate Correlativo (ID)
    newDoc.id = String(documents.length + 1).padStart(3, '0');

    // Initialize fields
    newDoc.fechaDespacho = newDoc.fechaDespacho || '';
    newDoc.ubicacion = newDoc.destino || '';
    newDoc.folios = newDoc.folios || '';
    newDoc.cargo = newDoc.cargo || '';
    newDoc.status = 'Recibido'; // Initial Status

    // Initialize History
    newDoc.history = [{
        date: newDoc.fecha,
        action: 'Recepción',
        from: 'Exterior',
        to: newDoc.origen,
        observation: 'Documento registrado'
    }];

    documents.unshift(newDoc);
    res.status(201).json(newDoc);
});

app.post('/api/documents/update-location', (req, res) => {
    const { id, ubicacion, fechaDespacho, cargo, observaciones, finalize } = req.body;
    const docIndex = documents.findIndex(d => d.id === id);

    if (docIndex > -1) {
        const doc = documents[docIndex];

        // Determine Action and Status
        let actionParams = {
            action: 'Derivación / Actualización',
            status: 'Derivado'
        };

        if (finalize === true) {
            actionParams.action = 'Finalización';
            actionParams.status = 'Finalizado';
        }

        // Create History Record
        const movement = {
            date: new Date().toISOString(),
            action: actionParams.action,
            from: doc.ubicacion || doc.origen,
            to: ubicacion,
            cargo: cargo,
            observation: observaciones || 'Sin observaciones'
        };

        if (!doc.history) doc.history = [];
        doc.history.push(movement);

        // Update fields
        if (ubicacion !== undefined) doc.ubicacion = ubicacion;
        if (fechaDespacho !== undefined) doc.fechaDespacho = fechaDespacho;
        if (cargo !== undefined) doc.cargo = cargo;

        // Update Status
        doc.status = actionParams.status;

        if (observaciones) {
            doc.observaciones = doc.observaciones ?
                doc.observaciones + `; ${observaciones}` : observaciones;
        }

        res.json({ success: true, doc: doc });
    } else {
        res.status(404).json({ success: false, message: 'Documento no encontrado' });
    }
});
//
// Encender el servidor 
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
