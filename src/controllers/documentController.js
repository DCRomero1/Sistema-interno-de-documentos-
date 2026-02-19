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

exports.showFormatosPage = (req, res) => {
    res.sendFile(path.join(__dirname, '../../views/formatos.html'));
};
// Obtener todos los documentos
exports.getAllDocuments = (req, res) => {
    db.all('SELECT * FROM documents ORDER BY fecha DESC, id DESC', [], (err, docs) => {
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
                    observation: h.observation
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

// Insertar el documento en la BD (extraído para reutilizar)
function insertDocument(newId, fecha, currentYear, newDoc, pdfPath, res) {
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

    db.run(`INSERT INTO documents (id, fecha, tipo, nombre, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, observaciones, pdf_path, year)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [newId, fecha, tipo, nombre, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, '', pdfPath, currentYear],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            // Historial inicial
            db.run(`INSERT INTO document_history (docId, date, action, from_area, to_area, cargo, observation)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [newId, fecha, 'Recepción', origen, '', '', 'Documento registrado'],
                (err) => { if (err) console.error('Error saving history', err); }
            );

            res.status(201).json({
                ...newDoc,
                id: newId,
                status: status,
                pdf_path: pdfPath,
                year: currentYear,
                history: [{ date: fecha, action: 'Recepción', from: origen, to: '', observation: 'Documento registrado' }]
            });
        }
    );
}

// Crear nuevo documento con ID normal (secuencial)
function createWithNormalId(currentYear, fecha, newDoc, pdfPath, res) {
    db.get('SELECT MAX(id) as maxId FROM documents WHERE id LIKE ?', [`%-${currentYear}`], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let newNum = 1;
        if (row && row.maxId) {
            const numPart = parseInt(row.maxId.split('-')[0], 10);
            if (!isNaN(numPart)) newNum = numPart + 1;
        }
        const newId = String(newNum).padStart(3, '0') + '-' + currentYear;
        insertDocument(newId, fecha, currentYear, newDoc, pdfPath, res);
    });
}

// Crear documento con ID retroactivo (sufijo letra: A, B, C...)
function createWithRetroactiveId(currentYear, fecha, newDoc, pdfPath, res) {
    // Obtener todos los docs del año con fecha <= fecha ingresada, para hallar el número base
    db.all(
        `SELECT id FROM documents WHERE year = ? AND fecha <= ? ORDER BY fecha DESC, created_at DESC`,
        [currentYear, fecha],
        (err, docs) => {
            if (err) return res.status(500).json({ error: err.message });

            // Extraer el número mayor de los documentos en ese rango
            let baseNum = 0;
            for (const doc of docs) {
                const numPart = parseInt(doc.id.split('-')[0], 10);
                if (!isNaN(numPart) && numPart > baseNum) baseNum = numPart;
            }

            if (baseNum === 0) {
                // Sin documentos previos en esa fecha → número normal
                return createWithNormalId(currentYear, fecha, newDoc, pdfPath, res);
            }

            const baseStr = String(baseNum).padStart(3, '0');

            // Buscar qué letras ya están usadas para ese número base
            db.all(
                `SELECT id FROM documents WHERE year = ? AND id LIKE ?`,
                [currentYear, `${baseStr}-%-${currentYear}`],
                (err, suffixedDocs) => {
                    if (err) return res.status(500).json({ error: err.message });

                    const usedLetters = suffixedDocs.map(d => {
                        const parts = d.id.split('-');
                        return parts.length === 3 ? parts[1] : null;
                    }).filter(Boolean);

                    // Siguiente letra disponible
                    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    let nextLetter = null;
                    for (const letter of alphabet) {
                        if (!usedLetters.includes(letter)) { nextLetter = letter; break; }
                    }

                    if (!nextLetter) return res.status(500).json({ error: 'Demasiados documentos retroactivos para esa fecha' });

                    const newId = `${baseStr}-${nextLetter}-${currentYear}`;
                    insertDocument(newId, fecha, currentYear, newDoc, pdfPath, res);
                }
            );
        }
    );
}

// Crear nuevo documento
exports.createDocument = (req, res) => {
    const newDoc = req.body;
    const pdfPath = req.file ? '/uploads/' + req.file.filename : null;

    const fecha = newDoc.fecha || new Date().toISOString().split('T')[0];
    const currentYear = new Date(fecha).getFullYear();

    // Detectar si la inserción es retroactiva comparando con la fecha máxima registrada
    db.get(
        `SELECT MAX(fecha) as maxDate FROM documents WHERE year = ?`,
        [currentYear],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });

            const lastDate = row ? row.maxDate : null;
            // Si hay documentos y la fecha ingresada es menor que la última fecha registrada -> Retroactivo
            const isRetroactive = lastDate && fecha < lastDate;

            if (isRetroactive) {
                createWithRetroactiveId(currentYear, fecha, newDoc, pdfPath, res);
            } else {
                createWithNormalId(currentYear, fecha, newDoc, pdfPath, res);
            }
        }
    );
};

// Actualizar ubicación / Derivar
exports.updateLocation = (req, res) => {
    const { id, ubicacion, fechaDespacho, cargo, observaciones, finalize, cargo2, ubicacion2 } = req.body;

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

        // If multiple derivations, update document with first location
        // The second derivation will only be in history
        db.run(`UPDATE documents SET ubicacion = ?, fechaDespacho = ?, cargo = ?, status = ?, observaciones = ? WHERE id = ?`,
            [newUbicacion, newFechaDespacho, newCargo, actionParams.status, newObs, id],
            (err) => {
                if (err) return res.status(500).json({ success: false, error: err.message });

                const historyDate = new Date().toISOString();
                const from = doc.ubicacion || 'JEFATURA DE UNIDAD DE ADMINISTRACION';

                // Insert first derivation into history
                db.run(`INSERT INTO document_history (docId, date, action, from_area, to_area, cargo, observation)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [id, historyDate, actionParams.action, from, ubicacion, cargo, observaciones || 'Sin observaciones'],
                    (err) => {
                        if (err) console.error('History save error', err);
                    }
                );

                // If second derivation exists, insert it into history as well
                if (cargo2 && ubicacion2) {
                    db.run(`INSERT INTO document_history (docId, date, action, from_area, to_area, cargo, observation)
                            VALUES (?, ?, ?, ?, ?, ?, ?)`,
                        [id, historyDate, actionParams.action, from, ubicacion2, cargo2, (observaciones || 'Sin observaciones') + ' (Copia 2)'],
                        (err) => {
                            if (err) console.error('Second derivation history save error', err);
                        }
                    );
                }

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
