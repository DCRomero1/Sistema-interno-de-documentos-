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
// API Routes (Also protected)
app.get('/api/documents', isAuthenticated, (req, res) => {
    // 1. Get all documents
    db.all('SELECT * FROM documents ORDER BY created_at DESC', [], (err, docs) => {
        if (err) return res.status(500).json({ error: err.message });

        // 2. Get history for all documents (or do N+1 query which is simpler for small scale / restricted concurrency)
        // For simplicity and local usage, let's fetch all history and map it.
        db.all('SELECT * FROM document_history', [], (err, historyRows) => {
            if (err) return res.status(500).json({ error: err.message });

            // Map history to docs
            const docsWithHistory = docs.map(doc => {
                const docHistory = historyRows.filter(h => h.docId === doc.id).map(h => ({
                    date: h.date,
                    action: h.action,
                    from: h.from_area,
                    to: h.to_area,
                    cargo: h.cargo,
                    observation: h.observation
                }));
                // Sort history by id desc (newest first)? Or insertion order. 
                // Let's assume ID order is enough or we rely on insertion.
                return { ...doc, history: docHistory };
            });

            res.json(docsWithHistory);
        });
    });
});

app.post('/api/documents', (req, res) => {
    const newDoc = req.body;

    // Get MAX ID to ensure uniqueness
    db.get('SELECT MAX(id) as maxId FROM documents', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let newNum = 1;
        if (row && row.maxId) {
            newNum = parseInt(row.maxId, 10) + 1;
        }
        const newId = String(newNum).padStart(3, '0');

        // Prepare vars
        const fecha = newDoc.fecha || '';
        const tipo = newDoc.tipo || '';
        const origen = newDoc.origen || '';
        const destino = newDoc.destino || ''; // Initial destination is also current ubicacion usually
        const ubicacion = newDoc.destino || '';
        const folios = newDoc.folios || '';
        const concepto = newDoc.concepto || '';
        const fechaDespacho = newDoc.fechaDespacho || '';
        const cargo = newDoc.cargo || '';
        const status = 'Recibido';
        const observaciones = '';

        // Insert Document
        db.run(`INSERT INTO documents (id, fecha, tipo, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, observaciones) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newId, fecha, tipo, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, observaciones],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Insert Initial History
                const historyDate = newDoc.fecha; // Use registration date
                const action = 'Recepción';
                const from = 'Exterior';
                const to = origen;
                const obs = 'Documento registrado';

                db.run(`INSERT INTO document_history (docId, date, action, from_area, to_area, cargo, observation)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [newId, historyDate, action, from, to, '', obs],
                    (err) => {
                        if (err) console.error('Error saving history', err);
                    }
                );

                // Return constructed object so frontend updates immediately
                newDoc.id = newId;
                newDoc.status = status;
                newDoc.history = [{
                    date: historyDate,
                    action: action,
                    from: from,
                    to: to,
                    observation: obs
                }];
                res.status(201).json(newDoc);
            });
    });
});

app.post('/api/documents/update-location', (req, res) => {
    const { id, ubicacion, fechaDespacho, cargo, observaciones, finalize } = req.body;

    // First get current doc to know "from" location
    db.get('SELECT * FROM documents WHERE id = ?', [id], (err, doc) => {
        if (err || !doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

        // Determine Action and Status
        let actionParams = {
            action: 'Derivación / Actualización',
            status: 'Derivado'
        };

        if (finalize === true) {
            actionParams.action = 'Finalización';
            actionParams.status = 'Finalizado';
        }

        // Params for update
        const newUbicacion = ubicacion !== undefined ? ubicacion : doc.ubicacion;
        const newFechaDespacho = fechaDespacho !== undefined ? fechaDespacho : doc.fechaDespacho;
        const newCargo = cargo !== undefined ? cargo : doc.cargo;
        const newObs = observaciones ? (doc.observaciones ? doc.observaciones + `; ${observaciones}` : observaciones) : doc.observaciones;

        // Update Document
        db.run(`UPDATE documents SET ubicacion = ?, fechaDespacho = ?, cargo = ?, status = ?, observaciones = ? WHERE id = ?`,
            [newUbicacion, newFechaDespacho, newCargo, actionParams.status, newObs, id],
            (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });

                // Insert History Record
                const historyDate = new Date().toISOString(); // Full timestamp
                const from = doc.ubicacion || doc.origen;

                db.run(`INSERT INTO document_history (docId, date, action, from_area, to_area, cargo, observation)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [id, historyDate, actionParams.action, from, ubicacion, cargo, observaciones || 'Sin observaciones'],
                    (err) => {
                        if (err) console.error('History save error', err);
                    }
                );

                res.json({ success: true });
            }
        );
    });
});
//
// Encender el servidor 
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
