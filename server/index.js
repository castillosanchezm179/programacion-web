const path = require('node:path');
const express = require('express');
const cors = require('cors');
const defaultDb = require('./database');
const { createAuthMiddleware } = require('./middlewares/auth');
const { createAuthRouter } = require('./routes/auth');
const { createUsersRouter } = require('./routes/users');
const { createCoursesRouter } = require('./routes/cursos');
const { createEnrollmentsRouter } = require('./routes/matriculas');

const PORT = Number(process.env.PORT) || 3000;
const projectRoot = path.join(__dirname, '..');

async function createApp(customDb) {
    const database = customDb || defaultDb;
    await database.initTables();
    const app = express();

    app.disable('x-powered-by');
    app.use(cors());
    app.use(express.json({ limit: '1mb' }));

    const authMiddleware = createAuthMiddleware(database);
    app.use('/api/auth', createAuthRouter(database, { ...authMiddleware, sessionTtlMs: authMiddleware.SESSION_TTL_MS }));
    app.use('/api/users', createUsersRouter(database, authMiddleware));
    app.use('/api/cursos', createCoursesRouter(database, authMiddleware));
    app.use('/api/matriculas', createEnrollmentsRouter(database, authMiddleware));

    // Rutas estáticas y manejadores de error
    app.get('/favicon.ico', (req, res) => res.sendStatus(204));
    app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta de API no encontrada.' }));
    app.use((req, res, next) => {
        const pathname = new URL(req.originalUrl, 'http://localhost').pathname;
        if (pathname.includes('/node_modules/') || pathname.startsWith('/server/')) return res.sendStatus(404);
        next();
    });
    app.use(express.static(projectRoot));

    app.use((error, req, res, next) => {
        console.error(error);
        if (res.headersSent) return next(error);
        res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
    });

    return app;
}

if (require.main === module) {
    createApp()
        .then((app) => {
            app.listen(PORT, () => {
                console.info(`🚀 CodeVarsity disponible en http://localhost:${PORT}`);
            });
        })
        .catch((error) => {
            console.error('No se pudo iniciar CodeVarsity:', error);
            process.exitCode = 1;
        });
}

module.exports = { createApp };
