const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.scryptSync(password, salt, 64);
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
    const [saltHex, hashHex] = String(storedHash || '').split(':');
    if (!saltHex || !hashHex) return false;
    const expectedHash = Buffer.from(hashHex, 'hex');
    const actualHash = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), expectedHash.length);
    return expectedHash.length === actualHash.length && crypto.timingSafeEqual(expectedHash, actualHash);
}

function createDatabase(customPath) {
    const dbPath = customPath || process.env.DATABASE_PATH || path.resolve(__dirname, 'data', 'codevarsity.sqlite');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });

    // Conexión oficial de SQLite según la guía del docente
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error al conectar con SQLite:', err.message);
        } else {
            console.log(`✅ Conectado a la base de datos SQLite (${path.basename(dbPath)}).`);
        }
    });

    db.hashPassword = hashPassword;
    db.verifyPassword = verifyPassword;

    // Envoltorios de Promesas para mantener async/await limpio en los controladores
    db.queryAll = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });
    };

    db.queryOne = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row || null);
            });
        });
    };

    db.execute = (sql, params = []) => {
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    };

    // Creación de tablas e inicialización de datos
    db.initTables = async () => {
        await new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(`
                    CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        nombre TEXT NOT NULL,
                        email TEXT NOT NULL UNIQUE,
                        password_hash TEXT NOT NULL,
                        role TEXT NOT NULL CHECK (role IN ('admin', 'global'))
                    )
                `);

                db.run(`
                    CREATE TABLE IF NOT EXISTS cursos (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        curso TEXT NOT NULL,
                        descripcion TEXT NOT NULL,
                        tiempo TEXT NOT NULL,
                        precio REAL NOT NULL,
                        imagen TEXT NOT NULL
                    )
                `);

                db.run(`
                    CREATE TABLE IF NOT EXISTS matriculas (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER NOT NULL,
                        curso_id INTEGER NOT NULL,
                        progreso INTEGER DEFAULT 0,
                        fecha_inscripcion TEXT NOT NULL,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE,
                        UNIQUE (user_id, curso_id)
                    )
                `, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        });

        // Semilla de cursos: Poblar automáticamente si la tabla de cursos está vacía
        const countCursos = await db.queryOne('SELECT COUNT(*) AS total FROM cursos');
        if (countCursos && countCursos.total === 0) {
            const seedPath = path.resolve(__dirname, 'data', 'seed-cursos.json');
            if (fs.existsSync(seedPath)) {
                try {
                    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
                    if (Array.isArray(seedData)) {
                        for (const item of seedData) {
                            await db.execute(
                                'INSERT INTO cursos (curso, descripcion, tiempo, precio, imagen) VALUES (?, ?, ?, ?, ?)',
                                [item.curso, item.descripcion, item.tiempo, Number(item.precio), item.imagen || '']
                            );
                        }
                        console.log(`✅ Catálogo inicial poblado con ${seedData.length} cursos desde seed-cursos.json.`);
                    }
                } catch (e) {
                    console.error('Error al cargar seed-cursos.json:', e.message);
                }
            }
        }

        // Semilla de usuario administrador si no existe
        const email = (process.env.ADMIN_EMAIL || 'admin@codevarsity.com').trim().toLowerCase();
        const adminUser = await db.queryOne("SELECT id FROM users WHERE role = 'admin' OR email = ?", [email]);
        if (!adminUser) {
            const password = process.env.ADMIN_PASSWORD || 'admin123456';
            try {
                await db.execute(
                    'INSERT INTO users (nombre, email, password_hash, role) VALUES (?, ?, ?, ?)',
                    ['Administrador', email, hashPassword(password), 'admin']
                );
                console.log(`✅ Administrador por defecto creado: ${email}`);
                if (!process.env.ADMIN_PASSWORD) {
                    console.log(`🔑 Clave de acceso temporal: ${password}`);
                }
            } catch (err) {
                if (!/UNIQUE constraint failed/i.test(err.message)) throw err;
            }
        }

        return db;
    };

    return db;
}

const defaultDb = createDatabase();

defaultDb.hashPassword = hashPassword;
defaultDb.verifyPassword = verifyPassword;
defaultDb.createDatabase = createDatabase;

module.exports = defaultDb;
