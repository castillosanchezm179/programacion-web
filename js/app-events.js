function bindEvents() {
    document.getElementById('registerForm')?.addEventListener('submit', handleRegister);
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('courseForm')?.addEventListener('submit', handleCourseSubmit);
    document.getElementById('adminUserForm')?.addEventListener('submit', handleAdminUserSubmit);
    document.getElementById('cancelAdminUserEdit')?.addEventListener('click', clearAdminUserForm);
    document.getElementById('passwordForm')?.addEventListener('submit', handlePasswordUpdate);
    document.getElementById('cancelCourseEdit')?.addEventListener('click', clearCourseForm);
    document.getElementById('logoutButton')?.addEventListener('click', handleLogout);
    document.getElementById('loadGithubButton')?.addEventListener('click', renderGithubRepos);
    document.getElementById('btnNextQuestion')?.addEventListener('click', () => {
        window.DevGame?.next();
    });
    document.getElementById('btnResetGameStorage')?.addEventListener('click', () => {
        if (!window.confirm('¿Reiniciar tus récords guardados en este navegador?')) return;
        window.DevGame?.resetStats();
    });

    document.getElementById('btnPrintCertificate')?.addEventListener('click', () => {
        window.print();
    });

    // Buscador en tiempo real de cursos
    const searchInput = document.getElementById('courseSearchInput');
    searchInput?.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        currentPage = 1;
        renderCourseCatalog(coursesCache);
    });

    document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        currentPage = 1;
        renderCourseCatalog(coursesCache);
    });

    document.getElementById('btnLogin')?.addEventListener('click', () => {
        if (currentUser) {
            const isInsidePages = window.location.pathname.includes('/pages/');
            const isAlreadyOnAdmin = window.location.pathname.endsWith('admin.html');
            if (isAlreadyOnAdmin) {
                setActivePanel('inicio');
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            window.location.href = isInsidePages ? 'admin.html' : 'pages/admin.html';
            return;
        }
        if (!document.getElementById('loginModal')) {
            window.location.href = new URL('../index.html?auth=login', window.location.href).href;
            return;
        }
        showAuthFeedback('login', '', '');
        openAuthModal('loginModal');
    });

    document.getElementById('btnRegistro')?.addEventListener('click', () => {
        if (currentUser) {
            handleLogout();
            return;
        }
        if (!document.getElementById('registerModal')) {
            window.location.href = new URL('../index.html?auth=register', window.location.href).href;
            return;
        }
        showAuthFeedback('register', '', '');
        openAuthModal('registerModal');
    });

    // Gestión interactiva de selección de planes en la vista Precios
    document.querySelectorAll('.btn-select-plan').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            const planName = e.currentTarget.dataset.plan;
            localStorage.setItem('codevarsity_selected_plan', planName);
            const feedbackBox = document.getElementById('planFeedback');
            const feedbackText = document.getElementById('planFeedbackText');
            if (feedbackBox && feedbackText) {
                feedbackText.textContent = `¡Plan "${planName}" seleccionado y actualizado con éxito! Tus beneficios académicos ya están activos.`;
                feedbackBox.classList.remove('d-none');
                feedbackBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            updateSelectedPlanUI();
        });
    });

    document.querySelectorAll('.dashboard-nav-btn[data-target]').forEach((button) => {
        button.addEventListener('click', () => setActivePanel(button.dataset.target));
    });

    const footerForm = document.getElementById('registroForm');
    footerForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const feedback = document.getElementById('formFeedback');
        if (feedback) {
            feedback.className = 'form-text text-success';
            feedback.textContent = '¡Inscripción exitosa! Pronto recibirás noticias.';
        }
        footerForm.reset();
    });
}

