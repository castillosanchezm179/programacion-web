// Detección automática del backend: si la página se abre desde VS Code Live Server (puerto 5500 u otros)
// o como archivo local, redirige las peticiones a http://localhost:3000/api donde corre el servidor Express con SQLite.
const API_BASE = (window.location.protocol === 'file:' || (window.location.port && window.location.port !== '3000'))
    ? 'http://localhost:3000/api'
    : '/api';

const TOKEN_KEY = 'codevarsity.accessToken';
const COURSES_PER_PAGE = 6;

let currentUser = null;
let coursesCache = [];
let myCoursesCache = [];
let currentPage = 1;
let searchQuery = '';

// --- GESTIÓN DE SESIÓN Y TOKEN ---
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
}

function getSession() {
    return currentUser;
}

async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    if (options.auth !== false && getToken()) {
        headers.set('Authorization', `Bearer ${getToken()}`);
    }

    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers
        });
    } catch (networkError) {
        throw new Error(
            `No se pudo conectar con el servidor backend en ${API_BASE}. Asegúrate de haber iniciado el servidor con 'npm start'.`
        );
    }

    if (response.status === 204) {
        if (!response.ok) throw new Error('No se pudo completar la solicitud.');
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error(
            `El servidor respondió con un formato no válido (${response.status}). Asegúrate de acceder a través de http://localhost:3000 o de que el servidor Express esté activo en el puerto 3000.`
        );
    }

    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'No se pudo completar la solicitud.');
    }
    return result;
}

function setFeedback(elementId, type, message) {
    const feedback = document.getElementById(elementId);
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.className = message
        ? `alert ${type === 'success' ? 'alert-success' : type === 'warning' ? 'alert-warning' : 'alert-danger'}`
        : 'alert d-none';
}

function showAlert(type, message) {
    setFeedback('sessionAlert', type, message);
}

function showAuthFeedback(formType, type, message) {
    setFeedback(`${formType}Feedback`, type, message);
}

function openAuthModal(modalId) {
    const modalElement = document.getElementById(modalId);
    if (modalElement) bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function authToggle() {
    const dashboardSection = document.getElementById('dashboardSection');
    const navUserName = document.getElementById('navUserName');
    const loginButton = document.getElementById('btnLogin');
    const registerButton = document.getElementById('btnRegistro');
    const isAdmin = currentUser?.role === 'admin';

    if (dashboardSection) dashboardSection.classList.toggle('d-none', !currentUser);
    if (navUserName) {
        navUserName.textContent = currentUser ? `◉ ${currentUser.nombre}` : '◉ Invitado';
    }
    if (loginButton) loginButton.textContent = currentUser ? 'Panel' : 'Iniciar Sesión';
    if (registerButton) registerButton.textContent = currentUser ? 'Salir' : 'Regístrate';

    document.querySelectorAll('[data-admin-only]').forEach((element) => {
        element.classList.toggle('d-none', !isAdmin);
    });

    document.querySelectorAll('[data-student-only]').forEach((element) => {
        element.classList.toggle('d-none', isAdmin);
    });
}

function updateCurrentDate() {
    const target = document.getElementById('currentDateTime');
    const panelDate = document.getElementById('panelDateTime');
    if (!target && !panelDate) return;

    const formatted = new Date().toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    if (target) target.textContent = formatted;
    if (panelDate) panelDate.textContent = formatted;
}

function renderUserSummary() {
    if (!currentUser) return;
    const roleName = currentUser.role === 'admin' ? 'Administrador' : 'Usuario global (Estudiante)';
    const dashboardUserName = document.getElementById('dashboardUserName');
    const dashboardUserRole = document.getElementById('dashboardUserRole');
    const panelUserName = document.getElementById('panelUserName');
    const panelUserRole = document.getElementById('panelUserRole');
    const welcomeMessage = document.getElementById('welcomeMessage');

    if (dashboardUserName) dashboardUserName.textContent = currentUser.nombre;
    if (dashboardUserRole) dashboardUserRole.textContent = roleName;
    if (panelUserName) panelUserName.textContent = currentUser.nombre;
    if (panelUserRole) panelUserRole.textContent = roleName;
    if (welcomeMessage) {
        welcomeMessage.textContent = `Has ingresado como ${roleName}. Gestiona tus cursos y avance en la plataforma.`;
    }
}

function setActivePanel(targetId) {
    const panel = document.getElementById(`panel-${targetId}`);
    if (!panel) return;
    if (panel.hasAttribute('data-admin-only') && currentUser?.role !== 'admin') return;
    if (panel.hasAttribute('data-student-only') && currentUser?.role === 'admin') return;

    document.querySelectorAll('.content-panel').forEach((item) => {
        item.classList.toggle('d-none', item !== panel);
        item.classList.toggle('active-panel', item === panel);
    });
    document.querySelectorAll('.dashboard-nav-btn[data-target]').forEach((button) => {
        button.classList.toggle('active', button.dataset.target === targetId);
    });

    if (targetId === 'mis-cursos') loadMyCourses();
    if (targetId === 'github') renderGithubRepos();
    if (targetId === 'juego') window.DevGame?.init();
}

function updateSelectedPlanUI() {
    const savedPlan = localStorage.getItem('codevarsity_selected_plan');
    if (!savedPlan) return;

    document.querySelectorAll('.btn-select-plan').forEach((btn) => {
        const isCurrent = btn.dataset.plan === savedPlan;
        if (isCurrent) {
            btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Plan Actual Activo';
            btn.className = 'btn btn-success w-100 py-2 fw-bold btn-select-plan';
        } else {
            btn.innerHTML = 'Cambiar a este Plan';
            btn.className = 'btn btn-outline-primary w-100 py-2 btn-select-plan';
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    updateSelectedPlanUI();
    authToggle();
    updateCurrentDate();
    if (document.getElementById('currentDateTime') || document.getElementById('panelDateTime')) {
        setInterval(updateCurrentDate, 1000);
    }
    if (document.getElementById('panel-inicio')) setActivePanel('inicio');
    await restoreSession();
    await loadCourses();

    // Si se accede directamente a admin.html sin sesión activa, redirigir al login en el index
    if (window.location.pathname.endsWith('admin.html') && !currentUser) {
        window.location.href = '../index.html?auth=login';
        return;
    }

    const requestedAuth = new URLSearchParams(window.location.search).get('auth');
    if (!currentUser && ['login', 'register'].includes(requestedAuth)) {
        openAuthModal(`${requestedAuth}Modal`);
    }
});
