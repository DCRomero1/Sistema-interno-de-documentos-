const db = require('../database');
const path = require('path');
const fs = require('fs');

// Vistas
exports.showDashboard = (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/index.html'));
};

exports.showRegisterPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/register.html'));
};

// Obtener todos los documentos
exports.getAllDocuments = (req, res) => {
    db.all('SELECT * FROM documents ORDER BY created_at DESC', [], (err, docs) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all('SELECT * FROM document_history', [], (err, historyRows) => {
            if (err) return res.status(500).json({ error: err.message });

            const docsWithHistory = docs.map(doc => {
                const docHistory = historyRows.filter(h => h.docId === doc.id).map(h => ({
                    date: h.date,
                    action: h.action,
                    from: h.from_area,
                    to: h.to_area,
                    cargo: h.cargo,
                    observation: h.observation  // Observaciones
                }));
                return { ...doc, history: docHistory };
            });

            res.json(docsWithHistory);
        });
    });
};

// Configuración de Multer
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../public/uploads'));
    },
    filename: function (req, file, cb) {
        // Use timestamp to avoid collision and remove dependency on docId which isn't available yet for new docs
        const uniqueSuffix = Date.now() + Math.round(Math.random() * 1E9);
        cb(null, `doc_${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

exports.upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'), false);
        }
    }
});

// Crear nuevo documento
exports.createDocument = (req, res) => {
    const newDoc = req.body;
    const pdfPath = req.file ? '/uploads/' + req.file.filename : null;

    db.get('SELECT MAX(id) as maxId FROM documents', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let newNum = 1;
        if (row && row.maxId) {
            newNum = parseInt(row.maxId, 10) + 1;
        }
        const newId = String(newNum).padStart(3, '0');

        const fecha = newDoc.fecha || '';
        const tipo = newDoc.tipo || '';
        const nombre = newDoc.nombre || '';
        const origen = newDoc.origen || '';
        const destino = newDoc.destino || '';
        const ubicacion = newDoc.destino || '';
        const folios = newDoc.folios || '';
        const concepto = newDoc.concepto || '';
        const fechaDespacho = newDoc.fechaDespacho || '';
        const cargo = newDoc.cargo || '';
        const status = 'Recibido';
        const initialObs = '';

        db.run(`INSERT INTO documents (id, fecha, tipo, nombre, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, observaciones, pdf_path) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newId, fecha, tipo, nombre, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, initialObs, pdfPath],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });

                // Insertar Historial Inicial
                const historyDate = newDoc.fecha;
                const action = 'Recepción';
                const from = origen;
                const to = '';
                const obs = 'Documento registrado';

                db.run(`INSERT INTO document_history (docId, date, action, from_area, to_area, cargo, observation)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [newId, historyDate, action, from, to, '', obs],
                    (err) => {
                        if (err) console.error('Error saving history', err);
                    }
                );

                const responseDoc = { ...newDoc };
                responseDoc.id = newId;
                responseDoc.status = status;
                responseDoc.pdf_path = pdfPath;
                responseDoc.history = [{
                    date: historyDate,
                    action: action,
                    from: from,
                    to: to,
                    observation: obs
                }];
                res.status(201).json(responseDoc);
            });
    });
};

// Actualizar ubicación / Derivar
exports.updateLocation = (req, res) => {
    const { id, ubicacion, fechaDespacho, cargo, observaciones, finalize } = req.body;

    db.get('SELECT * FROM documents WHERE id = ?', [id], (err, doc) => {
        if (err || !doc) return res.status(404).json({ success: false, message: 'Documento no encontrado' });

        let actionParams = {
            action: 'Derivación / Actualización',
            status: 'Derivado'
        };

        if (finalize === true) {
            actionParams.action = 'Finalización';
            actionParams.status = 'Finalizado';
        }

        const newUbicacion = ubicacion !== undefined ? ubicacion : doc.ubicacion;
        const newFechaDespacho = fechaDespacho !== undefined ? fechaDespacho : doc.fechaDespacho;
        const newCargo = cargo !== undefined ? cargo : doc.cargo;
        const newObs = observaciones ? (doc.observaciones ? doc.observaciones + `; ${observaciones}` : observaciones) : doc.observaciones;

        db.run(`UPDATE documents SET ubicacion = ?, fechaDespacho = ?, cargo = ?, status = ?, observaciones = ? WHERE id = ?`,
            [newUbicacion, newFechaDespacho, newCargo, actionParams.status, newObs, id],
            (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });

                const historyDate = new Date().toISOString();
                const from = doc.ubicacion || 'JEFATURA DE UNIDAD DE ADMINISTRACION';

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
};

exports.uploadPdf = (req, res) => {
    const docId = req.params.id;
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se subió ningún archivo' });
    }

    const pdfPath = '/uploads/' + req.file.filename;

    db.run(`UPDATE documents SET pdf_path = ? WHERE id = ?`, [pdfPath, docId], function (err) {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, pdfPath: pdfPath });
    });
};

exports.deletePdf = (req, res) => {
    const docId = req.params.id;

    db.get('SELECT pdf_path FROM documents WHERE id = ?', [docId], (err, row) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        if (!row || !row.pdf_path) {
            return res.status(404).json({ success: false, message: 'PDF no encontrado o ya eliminado' });
        }

        try {
            // Construct full path to file
            const filePath = path.join(__dirname, '../../public', row.pdf_path);

            // Delete file from filesystem
            fs.unlink(filePath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.error('Error deleting file from disk:', err);
                    // Continue to update DB to maintain consistency
                }

                db.run('UPDATE documents SET pdf_path = NULL WHERE id = ?', [docId], (err) => {
                    if (err) return res.status(500).json({ success: false, error: err.message });
                    res.json({ success: true });
                });
            });
        } catch (error) {
            console.error('Critical error in deletePdf:', error);
            res.status(500).json({ success: false, error: 'Internal Server Error during file deletion' });
        }
    });
};
