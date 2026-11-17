const express = require('express');

function createEnrollmentsRouter(database, { requireAuth }) {
    const router = express.Router();
    // --- MATRÍCULAS Y PROGRESO DEL ESTUDIANTE (SQLITE) ---
    router.get('/mis-cursos', requireAuth, async (req, res, next) => {
        try {
            const matriculas = await database.queryAll(`
                SELECT m.id AS matricula_id, m.progreso, m.fecha_inscripcion,
                       c.id AS curso_id, c.curso, c.descripcion, c.tiempo, c.precio, c.imagen
                FROM matriculas m
                JOIN cursos c ON m.curso_id = c.id
                WHERE m.user_id = ?
                ORDER BY m.id DESC
            `, [req.user.id]);
            res.json(matriculas);
        } catch (error) {
            next(error);
        }
    });

    router.post('/', requireAuth, async (req, res, next) => {
        const cursoId = Number(req.body?.curso_id);
        if (!Number.isSafeInteger(cursoId) || cursoId < 1) {
            return res.status(400).json({ error: 'Identificador de curso inválido.' });
        }

        try {
            const course = await database.queryOne('SELECT id, curso FROM cursos WHERE id = ?', [cursoId]);
            if (!course) return res.status(404).json({ error: 'El curso especificado no existe.' });

            const existing = await database.queryOne(
                'SELECT id FROM matriculas WHERE user_id = ? AND curso_id = ?',
                [req.user.id, cursoId]
            );
            if (existing) {
                return res.status(409).json({ error: 'Ya estás matriculado/a en este curso.' });
            }

            const now = new Date().toISOString();
            const result = await database.execute(
                'INSERT INTO matriculas (user_id, curso_id, progreso, fecha_inscripcion) VALUES (?, ?, 0, ?)',
                [req.user.id, cursoId, now]
            );

            res.status(201).json({
                message: `¡Te has matriculado exitosamente en ${course.curso}!`,
                matriculaId: result.lastID,
                cursoId,
                progreso: 0
            });
        } catch (error) {
            next(error);
        }
    });

    router.put('/:cursoId/progreso', requireAuth, async (req, res, next) => {
        const cursoId = Number(req.params.cursoId);
        const progreso = Number(req.body?.progreso);

        if (!Number.isSafeInteger(cursoId) || cursoId < 1) {
            return res.status(400).json({ error: 'Identificador de curso inválido.' });
        }
        if (!Number.isFinite(progreso) || progreso < 0 || progreso > 100) {
            return res.status(400).json({ error: 'El progreso debe ser un número entero entre 0 y 100.' });
        }

        try {
            const matricula = await database.queryOne(
                'SELECT id FROM matriculas WHERE user_id = ? AND curso_id = ?',
                [req.user.id, cursoId]
            );
            if (!matricula) {
                return res.status(404).json({ error: 'No estás matriculado en este curso.' });
            }

            await database.execute(
                'UPDATE matriculas SET progreso = ? WHERE id = ?',
                [Math.round(progreso), matricula.id]
            );

            res.json({
                message: 'Progreso actualizado correctamente.',
                cursoId,
                progreso: Math.round(progreso)
            });
        } catch (error) {
            next(error);
        }
    });

    router.delete('/:cursoId', requireAuth, async (req, res, next) => {
        const cursoId = Number(req.params.cursoId);
        if (!Number.isSafeInteger(cursoId) || cursoId < 1) {
            return res.status(400).json({ error: 'Identificador de curso inválido.' });
        }

        try {
            const result = await database.execute(
                'DELETE FROM matriculas WHERE user_id = ? AND curso_id = ?',
                [req.user.id, cursoId]
            );
            if (!result.changes) {
                return res.status(404).json({ error: 'No estás matriculado en este curso.' });
            }
            res.sendStatus(204);
        } catch (error) {
            next(error);
        }
    });


    return router;
}

module.exports = { createEnrollmentsRouter };
