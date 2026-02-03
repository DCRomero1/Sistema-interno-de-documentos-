const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../src/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        return;
    }
    console.log('Connected to the SQLite database.');
});

const documents = [
    {
        id: '001',
        fecha: '2026-01-22',
        tipo: "INFORME: N° 001-2026-DPP'EJ FPGV - SABS N° 008675",
        origen: 'Mesa de partes',
        destino: '',
        ubicacion: 'Area de Administración',
        folios: '4',
        concepto: 'Entrega de lleno de los ambientes del programa de proteccion de montes',
        fechaDespacho: '2026-01-23',
        cargo: 'Especialista administrativo',
        status: 'Derivado',
        observaciones: 'dfdsfs',
        nombre: 'ONOFRIO ORDOÑO MAMANI'
    },
    {
        id: '002',
        fecha: '2026-01-27',
        tipo: 'CARTA: N° 1245646',
        origen: 'Mesa de partes',
        destino: '',
        ubicacion: 'Area de Administración',
        folios: '4',
        concepto: 'Carta de presentación para realizar practicas pre profesionales en su institucion',
        fechaDespacho: '2026-01-28',
        cargo: 'Recursos Humanos',
        status: 'Finalizado',
        observaciones: 'Derivado al área de recursos humanos',
        nombre: 'Lozano marreros barrios'
    },
    {
        id: '003',
        fecha: '2026-01-27',
        tipo: 'INFORME: N° 01',
        origen: 'Mesa de partes',
        destino: '',
        ubicacion: 'Area de Administración',
        folios: '1',
        concepto: 'requerimiento',
        fechaDespacho: '2026-01-29',
        cargo: 'Recursos Humanos',
        status: 'Finalizado',
        observaciones: 'firma',
        nombre: 'fanny'
    },
    {
        id: '004',
        fecha: '2026-01-29',
        tipo: 'CARTA: N° 17485545122',
        origen: 'Mesa de partes',
        destino: '',
        ubicacion: 'Area de Administración',
        folios: '4',
        concepto: 'Carta de presentacion para practicas pre profesionales',
        fechaDespacho: '2026-01-29',
        cargo: 'Recursos Humanos',
        status: 'Derivado',
        observaciones: 'se requiere una firma',
        nombre: 'roberto damian'
    },
    {
        id: '005',
        fecha: '2026-01-29',
        tipo: 'FUT: N° 45544811',
        origen: 'Fablab',
        destino: '',
        ubicacion: 'Area de Administración',
        folios: '2',
        concepto: 'solicitud de carta de presentacion',
        fechaDespacho: '2026-01-29',
        cargo: 'Administrador',
        status: 'Finalizado',
        observaciones: 'aceptacion',
        nombre: 'diego coaquira romero'
    },
    {
        id: '006',
        fecha: '2026-01-29',
        tipo: 'RECIBO: N° 0032-142',
        origen: 'Universidad nacional jorge basadre grohomann',
        destino: '',
        ubicacion: 'Area de Administración',
        folios: '2',
        concepto: 'solicitud de aprobacion de ares en el campo de pichones',
        fechaDespacho: '2026-01-29',
        cargo: 'Almacén',
        status: 'Derivado',
        observaciones: 'aprobacion del rector',
        nombre: 'Juan carlos rengifo flores'
    },
    {
        id: '007',
        fecha: '2026-01-30',
        tipo: 'INFORME: N° 01-2026-PATRIMONIO/UND ADM -RESP -FPGV',
        origen: 'OFICINA DE ADMINISTRACIÓN',
        destino: '',
        ubicacion: 'Area de Administración',
        folios: '2',
        concepto: 'Audiencia formativa en actuaciones de talleres de trabajo II',
        fechaDespacho: '2026-01-30',
        cargo: 'Administrador',
        status: 'Finalizado',
        observaciones: '',
        nombre: 'Maricarmen fatima comdori gomez'
    },
    {
        id: '008',
        fecha: '2026-01-02',
        tipo: 'SABS N° 004970',
        origen: 'Mesa de partes',
        destino: '',
        ubicacion: 'Area de Administración',
        folios: '1',
        concepto: '63 cursos publicitarios radicales de los dias 02,03,05,06,',
        fechaDespacho: '2026-01-02',
        cargo: 'Abastecimiento',
        status: 'Finalizado',
        observaciones: '',
        nombre: 'Ceferino Ordoño Mamani'
    }
];

const insertSql = `INSERT OR REPLACE INTO documents (
    id, fecha, tipo, nombre, origen, destino, ubicacion, folios, concepto, fechaDespacho, cargo, status, observaciones
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const historySql = `INSERT INTO document_history (
    docId, date, action, from_area, to_area, cargo, observation
) VALUES (?, ?, ?, ?, ?, ?, ?)`;

db.serialize(() => {
    db.run("BEGIN TRANSACTION");

    const stmt = db.prepare(insertSql);
    const histStmt = db.prepare(historySql);

    documents.forEach(doc => {
        // Insert into documents
        stmt.run(
            doc.id, doc.fecha, doc.tipo, doc.nombre, doc.origen, doc.destino,
            doc.ubicacion, doc.folios, doc.concepto, doc.fechaDespacho,
            doc.cargo, doc.status, doc.observaciones,
            (err) => {
                if (err) console.error(`Error inserting doc ${doc.id}:`, err.message);
                else console.log(`Inserted doc ${doc.id}`);
            }
        );

        // Insert initial history record
        // Assuming the 'fecha' is the reception date
        histStmt.run(
            doc.id,
            doc.fecha,
            'Recepción',
            doc.origen,
            doc.ubicacion,
            doc.cargo,
            doc.observaciones || 'Documento registrado manualmente'
        );
    });

    stmt.finalize();
    histStmt.finalize();

    db.run("COMMIT", (err) => {
        if (err) console.error('Error committing transaction:', err.message);
        else console.log('All documents inserted successfully.');
        db.close();
    });
});
