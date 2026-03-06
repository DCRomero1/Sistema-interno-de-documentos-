const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Iniciando sincronización anclada y final...');

const syncConfig = [
    {
        id: 1,
        name: 'Pabellón A: Secretaría Académica (1° y 2° Piso)',
        sort_order: 1,
        areas: [
            'Ingreso principal del Instituto',
            'Jefatura de Formación Continua (A-001)',
            'Secretaría Académica (A-106)',
            'Secretaría Académica (A-105)',
            'SSHH (Piso 1)',
            'Secretaría Académica (A-102)',
            'Secretaría Académica (A-101)',
            'SSHH (Piso 2)',
            'Dirección General (A-201)',
            'Secretaría de Dirección (A-202)'
        ]
    },
    {
        id: 16,
        name: 'PABELLON A - ADMINISTRACION PRIMER PISO',
        sort_order: 2,
        areas: [
            'Tesorería - Caja (A-116)',
            'Administración (A-110)',
            'Recursos Humanos (A-112)',
            'SSHH Mujeres (A-110)',
            'SSHH Varones (A-111)',
            'Jefatura de Formación Continua, Jefatura de Investigación y JUBE',
            'Patrimonio, Almacén Abastecimiento (A-113)',
            'Jefatura de Unidad Académica (A-108)',
            'Secretaría de Jefatura de Unidad Académica'
        ]
    },
    {
        id: 14,
        name: 'PABELLON - C CONTABILIDAD',
        sort_order: 3,
        areas: [
            'Deposito (C-102)',
            'Aula pedagógica (C-102)',
            'Aula pedagógica (C-103)',
            'Aula pedagógica (C-104)',
            'Coordinacion Academica (C-105)',
            'Jefatura interior',
            'Deposito Coordinacion',
            'SS.HH (C-106)',
            'Deposito debajo de escalera (C-107)',
            'Aula de computo (C-201)',
            'Lab. de Computo (C-202)',
            'Sala de Docentes (C-203)',
            'Sala de Doc. Interior 1',
            'Sala de Doc. Interior 2',
            'Salon de Usos Multiples (C-301)',
            'Sala de lectura Docen - Estudiantes (C-302)',
            'S. lectura Interior',
            'Area de Investigación e Innovación Tec. (C-303)',
            'A. Investg. Interior',
            'Servicio Higienico'
        ]
    },
    {
        id: 15,
        name: 'PABELLON "D" - PRODUCCION AGROPECUARIA/TOPICO',
        sort_order: 4,
        areas: [
            'Laboratorio multifuncional 1 Procesos (D-104)',
            'SSHH Interior Procesos (D-104)',
            'Área de Bienestar (Asistencia Social -Psicología) (D-103)',
            'Tópico - Lab APSTI - SSHH (D-101)',
            'SSHH - Tópico (D-101)',
            'Aula de pedagógica (D-201)',
            'Aula de pedagógica (D-202)',
            'Laboratorio Multifuncional 2 (D-203)',
            'Aula Pedagógica (D-204)',
            'Coordinacion académica (D-205)'
        ]
    },
    {
        id: 17,
        name: 'PABELLON "E" - ARQUITECTURA DE PLATAFORMAS Y TI (APETI)',
        sort_order: 5,
        areas: [
            'Coordinación académica APSTI (E102)',
            'Taller de redes y conectividad (E103)',
            'aula pedagógica (E104)',
            'aula pedagógica (E105)',
            'aula de computación exbiblioteca (D102)',
            'SSHH interior exbiblioteca',
            'Sala de docentes (E201)',
            'Lab. De Computo 1 (E202)',
            'Lab. De Computo 1 (E203)',
            'Centro de seguridad Interior 1 (E301)',
            'Centro de seguridad Interior 2 (E301)',
            'Taller de mantenimiento (E302)',
            'Aula pedagógica (E303)',
            'Almacen de mto y reparac comp (E304)'
        ]
    },
    {
        id: 18,
        name: 'PABELLON "F" - CONSTRUCCION CIVIL',
        sort_order: 6,
        areas: [
            'Sala de usos Multiples (F-101)',
            'Sala de Docentes (F-102)',
            'Coordinacion Academica (F-103)',
            'Topografia (F-103 B)',
            'Aula Pedagogica (F-104)',
            'Taller multifuncional- Mecanica de suelos (F-105)',
            'SSHH - DEPOSITO (F-106)',
            'SSHH - DOCENTES - Detras de la cafeteria',
            'Aula Pedagogica (F-201)',
            'Aula Pedagogica (F-202)',
            'Laboratorio de Computo (F-203)'
        ]
    },
    {
        id: 19,
        name: 'PABELLON G - ASISTENCIA ADMINISTRATIVA',
        sort_order: 7,
        areas: [
            'Codinacion Asistencia Administrativa (G-101)',
            'Aula pedagógica (G-102)',
            'Aula pedagógica (G-103)',
            'Aula pedagógica (G-104)',
            'Aula de Computo (G-201)',
            'Servicio Higienico Varonere general',
            'Servicio Higienico Damas General',
            'Servicio Higienico Discapacidad',
            'Laboratorio de Computo (G-201)'
        ]
    },
    {
        id: 20,
        name: 'PABELLON - DETRÁS DE CAFETERIA',
        sort_order: 8,
        areas: [
            'Servicio Higienico Damas',
            'Servicio Higienico Varones'
        ]
    },
    {
        id: 21,
        name: 'PABELLON "J" - ELECTRICIDAD INDUSTRIAL',
        sort_order: 9,
        areas: [
            'Taller (maq. Elec) (J\'-101)',
            'Lab. de Generc. Y sist. P. izquierda (J\'-102)',
            'Aula pedagógica Electricidad Industrial (J\'-105 B)',
            'Taller de mant. De maq. Electricas (J\'-105 A)',
            'Centro de certificación y competencias laborales (J\'-201)',
            'Almacen (interior) (J\'-202)',
            'Coordinación Academican Electricidad Industrial (J-101)',
            'Taller de automatización industrial (J-102)',
            'Lab. de Medicic. Electricas y circuitos electrónicos (J-103)',
            'Almacen (lab. d med. Elec e instrum) (J-104)',
            'Aula Pedagogica (J-201)',
            'Aula Pedagogica (J-202)',
            'ARCHIVO DE ADMINSTRACION (J-203)'
        ]
    },
    {
        id: 8,
        name: 'PABELLON "H - N" - ELECTRONICA / CANAL 45',
        sort_order: 10,
        areas: [
            'Coordinación académica - Electricidad industrial (H-101)',
            'Taller de hidraulica, neumatica (H-102)',
            'Taller de control automotriz (H-103)',
            'Taller de medicion electronica (H-104)',
            'Almacén Costado de las escalerar (H-105)',
            'Aula pedagogica (H-201)',
            'Aula pedagogica (H-202)',
            'Laboratorio de computo (H-203)',
            'Aula pedagógica (J\'-103)',
            'Taller de redes de datos y comunicacionesm canal 45 (N101A)',
            'Switch de tv (N101B)',
            'Almacen (N101C)'
        ]
    },
    {
        id: 9,
        name: 'PABELLON "K" - MECANICA DE PRODUCCION INDUSTRIAL (PI/MP)',
        sort_order: 11,
        areas: [
            'Porton principal Ingreso 1 (K-101)',
            'Almacen(Solo tiene llave el Coordinador de area) (K-101A)',
            'Laboratorio de Maq. C.N.C. (candado) (K-101B)',
            'Taller de Maquinas Herramientas (K-101C)',
            'Taller de Soldadura Especiales (K-101D)',
            'Porton principal Ingreso 2 (K-102)',
            'Taller de soldadura Oxigas (K-102A)',
            'Taller de Mecanica de Banco y Ajustes (K-102B)',
            'Taller de Molderia y fundición (K-102C)',
            'Laboratorio de Control de calidad (K-102D)',
            'Coordinación Academica mecanica de producion indsutrial (K-201)',
            'Sala de docentes 1 (K-201A)',
            'Sala de docentes 2 (K-201B)',
            'Aula pedagogica (K-202)',
            'Aula pedagogica (K-203)',
            'Aula de Computo CAD CDM (K-204)',
            'Servicio Higienico Damas',
            'Servicio Higienico Varones'
        ]
    },
    {
        id: 10,
        name: 'PABELLON "L" - MECATRONICA AUTOMOTRIZ',
        sort_order: 12,
        areas: [
            'Sala de docentes (L101)',
            'Coordinación académica Mecatronica (L102)',
            'Interior - Almacen (L102B)',
            'Porton Principal (L102)',
            'Lab sistema diesel gasolina (L102A)',
            'Taller de motores de combustion inter (L102B)',
            'Taller electrico electronico (L102C)',
            'Taller de mecanica basica y soldadura (L102D)',
            'Patio de maniobras (L102E)',
            'Taller de rectificaciones automot (L102F)',
            'Taller de suspencion de direccion (L102G)',
            'Servicio Higienico Damas',
            'Servicio Higienico Varones',
            'Aula pedagógica (L201)',
            'Aula pedagógica (L202)',
            'Aula pedagógica (L203)'
        ]
    }
];

db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    try {
        for (const p of syncConfig) {
            db.get('SELECT id FROM pavilions WHERE id = ?', [p.id], (err, row) => {
                if (row) {
                    console.log(`> Sincronizando ID ${p.id}: ${p.name}`);
                    db.run('UPDATE pavilions SET name = ?, sort_order = ? WHERE id = ?', [p.name, p.sort_order, p.id]);
                } else {
                    console.log(`+ Insertando ID ${p.id}: ${p.name}`);
                    db.run('INSERT INTO pavilions (id, name, sort_order) VALUES (?, ?, ?)', [p.id, p.name, p.sort_order]);
                }
                updatePavilionAreas(p.id, p);
            });
        }

        function updatePavilionAreas(pavilionId, p) {
            db.run('DELETE FROM areas WHERE pavilion_id = ?', [pavilionId], (err) => {
                const stmt = db.prepare('INSERT INTO areas (pavilion_id, name) VALUES (?, ?)');
                p.areas.forEach(area => stmt.run([pavilionId, area]));
                stmt.finalize();
            });
        }

        setTimeout(() => {
            db.run('COMMIT', () => {
                console.log('>>> SINCRONIZACIÓN FINAL COMPLETADA <<<');
                db.close();
            });
        }, 2000);
    } catch (err) {
        db.run('ROLLBACK');
        db.close();
    }
});
