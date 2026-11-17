function validateCourse(input) {
    const curso = typeof input?.curso === 'string' ? input.curso.trim() : '';
    const descripcion = typeof input?.descripcion === 'string' ? input.descripcion.trim() : '';
    const tiempo = typeof input?.tiempo === 'string' ? input.tiempo.trim() : '';
    const imagen = typeof input?.imagen === 'string' ? input.imagen.trim() : '';
    const precio = Number(input?.precio);

    if (!curso || !descripcion || !tiempo || !Number.isFinite(precio) || precio < 0 || !imagen) {
        return { error: 'Completa el nombre, la descripción, la duración, el precio y la URL de imagen.' };
    }
    if (curso.length > 120 || descripcion.length > 1000 || tiempo.length > 40 || imagen.length > 2048) {
        return { error: 'Uno o más campos superan la longitud permitida.' };
    }
    try {
        const imageUrl = new URL(imagen);
        if (!['http:', 'https:'].includes(imageUrl.protocol)) throw new Error();
    } catch {
        return { error: 'La imagen debe ser una URL HTTP o HTTPS válida.' };
    }
    return { curso, descripcion, tiempo, precio, imagen };
}

module.exports = { validateCourse };
