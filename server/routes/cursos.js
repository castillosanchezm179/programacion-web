const express = require('express');
const { validateCourse } = require('./courseValidation');

function createCoursesRouter(database, { requireAuth, requireAdmin }) {
    const router = express.Router();
    // --- CRUD DE CURSOS ---
    router.get('/', async (req, res, next) => {
        try {
            const courses = await database.queryAll('SELECT id, curso, descripcion, tiempo, precio, imagen FROM cursos ORDER BY id');
            res.json(courses);
        } catch (error) {
            next(error);
        }
    });

    router.get('/:id', async (req, res, next) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'El identificador no es válido.' });
        try {
            const course = await database.queryOne('SELECT id, curso, descripcion, tiempo, precio, imagen FROM cursos WHERE id = ?', [id]);
            if (!course) return res.status(404).json({ error: 'Curso no encontrado.' });
            res.json(course);
        } catch (error) {
            next(error);
        }
    });

    router.post('/', requireAuth, requireAdmin, async (req, res, next) => {
        const course = validateCourse(req.body);
        if (course.error) return res.status(400).json({ error: course.error });

        try {
            const result = await database.execute(
                'INSERT INTO cursos (curso, descripcion, tiempo, precio, imagen) VALUES (?, ?, ?, ?, ?)',
                [course.curso, course.descripcion, course.tiempo, course.precio, course.imagen]
            );
            const created = await database.queryOne(
                'SELECT id, curso, descripcion, tiempo, precio, imagen FROM cursos WHERE id = ?',
                [result.lastID]
            );
            res.status(201).json(created);
        } catch (error) {
            next(error);
        }
    });

    router.put('/:id', requireAuth, requireAdmin, async (req, res, next) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'El identificador no es válido.' });
        const course = validateCourse(req.body);
        if (course.error) return res.status(400).json({ error: course.error });

        try {
            const result = await database.execute(
                'UPDATE cursos SET curso = ?, descripcion = ?, tiempo = ?, precio = ?, imagen = ? WHERE id = ?',
                [course.curso, course.descripcion, course.tiempo, course.precio, course.imagen, id]
            );
            if (!result.changes) return res.status(404).json({ error: 'Curso no encontrado.' });
            const updated = await database.queryOne(
                'SELECT id, curso, descripcion, tiempo, precio, imagen FROM cursos WHERE id = ?',
                [id]
            );
            res.json(updated);
        } catch (error) {
            next(error);
        }
    });

    router.delete('/:id', requireAuth, requireAdmin, async (req, res, next) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: 'El identificador no es válido.' });
        try {
            const result = await database.execute('DELETE FROM cursos WHERE id = ?', [id]);
            if (!result.changes) return res.status(404).json({ error: 'Curso no encontrado.' });
            res.sendStatus(204);
        } catch (error) {
            next(error);
        }
    });


    return router;
}

module.exports = { createCoursesRouter };
