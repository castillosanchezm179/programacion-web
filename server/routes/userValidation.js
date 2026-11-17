function publicUser(user) {
    return { id: user.id, nombre: user.nombre, email: user.email, role: user.role };
}

function validateUserProfile({ nombre, email }) {
    const cleanName = typeof nombre === 'string' ? nombre.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (cleanName.length < 3 || cleanName.length > 80) return { error: 'El nombre debe tener entre 3 y 80 caracteres.' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return { error: 'Ingresa un correo válido.' };
    return { nombre: cleanName, email: cleanEmail };
}

function validateUser({ nombre, email, password }) {
    const profile = validateUserProfile({ nombre, email });
    if (profile.error) return profile;
    const cleanPassword = typeof password === 'string' ? password : '';
    if (cleanPassword.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' };
    return { ...profile, password: cleanPassword };
}

module.exports = { publicUser, validateUserProfile, validateUser };
