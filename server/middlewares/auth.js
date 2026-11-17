const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function createAuthMiddleware(database) {
    const sessions = new Map();

    const requireAuth = async (req, res, next) => {
        const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
        const session = token && sessions.get(token);
        if (!session || session.expiresAt <= Date.now()) {
            if (token) sessions.delete(token);
            return res.status(401).json({ error: 'Inicia sesión para continuar.' });
        }

        try {
            const user = await database.queryOne(
                'SELECT id, nombre, email, role FROM users WHERE id = ?',
                [session.userId]
            );
            if (!user) {
                sessions.delete(token);
                return res.status(401).json({ error: 'La sesión ya no es válida.' });
            }

            req.user = user;
            req.token = token;
            next();
        } catch (error) {
            next(error);
        }
    };

    const requireAdmin = (req, res, next) => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'Esta operación requiere permisos de administrador.' });
        }
        next();
    };

    return {
        requireAuth,
        requireAdmin,
        sessions,
        SESSION_TTL_MS
    };
}

module.exports = { createAuthMiddleware };
