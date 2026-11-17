const express = require('express');
const crypto = require('node:crypto');
const { hashPassword, verifyPassword } = require('../database');
const { publicUser, validateUser } = require('./userValidation');

function createAuthRouter(database, { requireAuth, sessions, sessionTtlMs }) {
    const router = express.Router();
    router.post('/register', async (req, res, next) => {
        const validated = validateUser(req.body || {});
        if (validated.error) return res.status(400).json({ error: validated.error });

        try {
            const result = await database.execute(
                'INSERT INTO users (nombre, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [validated.nombre, validated.email, hashPassword(validated.password), 'global']
            );
            const user = await database.queryOne(
                'SELECT id, nombre, email, role FROM users WHERE id = ?',
                [result.lastID]
            );
            return res.status(201).json({ user: publicUser(user) });
        } catch (error) {
            if (/UNIQUE constraint failed/i.test(error.message)) {
                return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
            }
            next(error);
        }
    });

    router.post('/login', async (req, res, next) => {
        const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
        const password = typeof req.body?.password === 'string' ? req.body.password : '';

        try {
            const user = await database.queryOne(
                'SELECT id, nombre, email, role, password_hash FROM users WHERE email = ?',
                [email]
            );
            if (!user || !verifyPassword(password, user.password_hash)) {
                return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
            }

            const token = crypto.randomBytes(32).toString('base64url');
            sessions.set(token, { userId: user.id, expiresAt: Date.now() + sessionTtlMs });
            return res.json({ accessToken: token, user: publicUser(user) });
        } catch (error) {
            next(error);
        }
    });

    router.get('/me', requireAuth, (req, res) => {
        res.json({ user: publicUser(req.user) });
    });

    router.post('/logout', requireAuth, (req, res) => {
        sessions.delete(req.token);
        res.sendStatus(204);
    });

    router.put('/password', requireAuth, async (req, res, next) => {
        const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
        const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

        try {
            const storedUser = await database.queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
            if (!verifyPassword(currentPassword, storedUser?.password_hash)) {
                return res.status(400).json({ error: 'La contraseña actual no coincide.' });
            }
            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
            }

            await database.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(newPassword), req.user.id]);
            for (const [token, session] of sessions) {
                if (session.userId === req.user.id) sessions.delete(token);
            }
            const token = crypto.randomBytes(32).toString('base64url');
            sessions.set(token, { userId: req.user.id, expiresAt: Date.now() + sessionTtlMs });
            res.json({ accessToken: token, message: 'Contraseña actualizada correctamente.' });
        } catch (error) {
            next(error);
        }
    });


    return router;
}

module.exports = { createAuthRouter };
