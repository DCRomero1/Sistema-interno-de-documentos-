const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'src', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to the SQLite database for migration.');
    migrate();
});

function migrate() {
    db.serialize(() => {
        // 1. Create new cleaning_staff table
        db.run(`CREATE TABLE IF NOT EXISTS cleaning_staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            dni TEXT UNIQUE NOT NULL,
            birthDate TEXT,
            position TEXT DEFAULT 'Personal de Limpieza',
            email TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2. Move existing cleaning staff from workers to cleaning_staff
        db.run(`INSERT OR IGNORE INTO cleaning_staff (fullName, dni, birthDate, position, email, phone, created_at)
                SELECT fullName, dni, birthDate, position, email, phone, created_at
                FROM workers WHERE position = 'Personal de Limpieza'`, function (err) {
            if (err) console.error("Error migrating to cleaning_staff:", err);
            else console.log(`Migrated ${this.changes} workers to cleaning_staff.`);
        });

        // 3. Delete them from workers
        db.run(`DELETE FROM workers WHERE position = 'Personal de Limpieza'`, function (err) {
            if (err) console.error("Error deleting from workers:", err);
            else console.log(`Deleted ${this.changes} from workers.`);
        });

        // 4. Create new cleaner_areas table
        db.run(`CREATE TABLE IF NOT EXISTS cleaner_areas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cleaner_id INTEGER,
            area_id INTEGER,
            FOREIGN KEY(cleaner_id) REFERENCES cleaning_staff(id),
            FOREIGN KEY(area_id) REFERENCES areas(id),
            UNIQUE(cleaner_id, area_id)
        )`);

        // 5. Drop old schedule_assignments and recreate with cleanerId
        db.run(`DROP TABLE IF EXISTS schedule_assignments`);
        db.run(`CREATE TABLE schedule_assignments (
            slotId TEXT PRIMARY KEY,
            cleanerId INTEGER,
            FOREIGN KEY(cleanerId) REFERENCES cleaning_staff(id)
        )`);

        // 6. Drop old worker_areas and worker_pavilions if exists
        db.run(`DROP TABLE IF EXISTS worker_areas`);
        db.run(`DROP TABLE IF EXISTS worker_pavilions`);

        console.log("Migration completed successfully.");
    });
}
