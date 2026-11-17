// --- AUTENTICACIÓN ---
async function handleRegister(event) {
    event.preventDefault();
    const nombre = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (nombre.length < 3 || !validarEmail(email) || password.length < 8) {
        showAuthFeedback('register', 'danger', 'Verifica el nombre, el correo y que la clave tenga al menos 8 caracteres.');
        return;
    }

    try {
        await apiRequest('/auth/register', {
            method: 'POST',
            auth: false,
            body: JSON.stringify({ nombre, email, password })
        });
        event.currentTarget.reset();
        showAuthFeedback('register', 'success', 'Cuenta creada. Ya puedes iniciar sesión.');
    } catch (error) {
        showAuthFeedback('register', 'danger', error.message);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const result = await apiRequest('/auth/login', {
            method: 'POST',
            auth: false,
            body: JSON.stringify({ email, password })
        });
        setToken(result.accessToken);
        currentUser = result.user;
        document.getElementById('loginForm').reset();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('loginModal')).hide();
        authToggle();
        renderUserSummary();
        setActivePanel('inicio');
        updateCurrentDate();
        if (currentUser.role === 'admin') await renderUsers();
        await loadCourses();
        await loadMyCourses();
        showAuthFeedback('login', '', '');
        showAlert('success', `Bienvenido/a, ${currentUser.nombre}.`);
        const isInsidePages = window.location.pathname.includes('/pages/');
        const targetAdminUrl = isInsidePages ? 'admin.html' : 'pages/admin.html';
        setTimeout(() => {
            window.location.href = targetAdminUrl;
        }, 400);
    } catch (error) {
        showAuthFeedback('login', 'danger', error.message);
    }
}

async function handleLogout() {
    try {
        if (getToken()) await apiRequest('/auth/logout', { method: 'POST' });
    } catch (error) {
        console.warn(error);
    }
    setToken(null);
    currentUser = null;
    myCoursesCache = [];
    authToggle();
    renderCourseCatalog(coursesCache);
    showAlert('success', 'Sesión cerrada correctamente.');
    if (window.location.pathname.endsWith('admin.html')) {
        window.location.href = '../index.html';
    }
}

async function handlePasswordUpdate(event) {
    event.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword.length < 8) {
        showAlert('danger', 'La nueva contraseña debe tener al menos 8 caracteres.');
        return;
    }
    if (newPassword !== confirmPassword) {
        showAlert('danger', 'La confirmación no coincide.');
        return;
    }

    try {
        const result = await apiRequest('/auth/password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
        setToken(result.accessToken);
        event.currentTarget.reset();
        showAlert('success', result.message);
    } catch (error) {
        showAlert('danger', error.message);
    }
}

async function restoreSession() {
    if (!getToken()) return;
    try {
        const result = await apiRequest('/auth/me');
        currentUser = result.user;
        authToggle();
        renderUserSummary();
        if (currentUser.role === 'admin') await renderUsers();
        await loadMyCourses();
    } catch (error) {
        setToken(null);
        currentUser = null;
        authToggle();
    }
}

