const express = require('express');
const { hashPassword } = require('../database');
const { publicUser, validateUser, validateUserProfile } = require('./userValidation');

function createUsersRouter(database, { requireAuth, requireAdmin }) {
    const router = express.Router();
    router.get('/', requireAuth, requireAdmin, async (req, res, next) => {
        try {
            const users = await database.queryAll('SELECT id, nombre, email, role FROM users ORDER BY id');
            res.json(users);
        } catch (error) {
            next(error);
        }
    });

    router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
        const validated = validateUser(req.body || {});
        if (validated.error) return res.status(400).json({ error: validated.error });
        if (!['admin', 'global'].includes(req.body.role)) {
            return res.status(400).json({ error: 'El perfil debe ser admin o global.' });
        }
        const role = req.body.role === 'admin' ? 'admin' : 'global';

        try {
            const result = await database.execute(
                'INSERT INTO users (nombre, email, password_hash, role) VALUES (?, ?, ?, ?)',
                [validated.nombre, validated.email, hashPassword(validated.password), role]
            );
            const user = await database.queryOne(
                'SELECT id, nombre, email, role FROM users WHERE id = ?',
                [result.lastID]
            );
            res.status(201).json(publicUser(user));
        } catch (error) {
            if (/UNIQUE constraint failed/i.test(error.message)) {
                return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
            }
            next(error);
        }
    });

    router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
        const userId = Number(req.params.id);
        if (!Number.isSafeInteger(userId) || userId < 1) {
            return res.status(400).json({ error: 'El identificador del usuario no es válido.' });
        }
        const profile = validateUserProfile(req.body || {});
        if (profile.error) return res.status(400).json({ error: profile.error });
        if (!['admin', 'global'].includes(req.body.role)) {
            return res.status(400).json({ error: 'El perfil debe ser admin o global.' });
        }

        try {
            const existingUser = await database.queryOne('SELECT id, role FROM users WHERE id = ?', [userId]);
            if (!existingUser) return res.status(404).json({ error: 'Usuario no encontrado.' });
            if (userId === req.user.id && req.body.role !== 'admin') {
                return res.status(409).json({ error: 'No puedes quitarte el perfil de administrador.' });
            }
            const adminCount = await database.queryOne("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
            if (existingUser.role === 'admin' && req.body.role !== 'admin' && adminCount.total <= 1) {
                return res.status(409).json({ error: 'No se puede cambiar el perfil del último administrador.' });
            }

            await database.execute(
                'UPDATE users SET nombre = ?, email = ?, role = ? WHERE id = ?',
                [profile.nombre, profile.email, req.body.role, userId]
            );
            const updated = await database.queryOne('SELECT id, nombre, email, role FROM users WHERE id = ?', [userId]);
            res.json(publicUser(updated));
        } catch (error) {
            if (/UNIQUE constraint failed/i.test(error.message)) {
                return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
            }
            next(error);
        }
    });

    router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
        const userId = Number(req.params.id);
        if (!Number.isSafeInteger(userId) || userId < 1) {
            return res.status(400).json({ error: 'El identificador del usuario no es válido.' });
        }
        if (userId === req.user.id) {
            return res.status(409).json({ error: 'No puedes eliminar tu propia cuenta activa.' });
        }

        try {
            const user = await database.queryOne('SELECT id, role FROM users WHERE id = ?', [userId]);
            if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
            const adminCount = await database.queryOne("SELECT COUNT(*) AS total FROM users WHERE role = 'admin'");
            if (user.role === 'admin' && adminCount.total <= 1) {
                return res.status(409).json({ error: 'No se puede eliminar el último administrador.' });
            }

            await database.execute('DELETE FROM users WHERE id = ?', [userId]);
            res.sendStatus(204);
        } catch (error) {
            next(error);
        }
    });


    return router;
}

module.exports = { createUsersRouter };
