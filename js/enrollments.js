// --- MATRÍCULAS Y PROGRESO DEL ESTUDIANTE (SQLITE) ---
async function loadMyCourses() {
    const list = document.getElementById('myCoursesList');
    if (!list || !currentUser) return;

    list.innerHTML = '<div class="col-12 text-center py-4 text-muted"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Cargando tus cursos matriculados...</div>';

    try {
        myCoursesCache = await apiRequest('/matriculas/mis-cursos');
        list.replaceChildren();

        if (!myCoursesCache.length) {
            list.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info d-flex align-items-center gap-3">
                        <i class="bi bi-info-circle fs-3"></i>
                        <div>
                            <strong>Aún no tienes cursos matriculados.</strong><br />
                            Explora el catálogo y pulsa el botón <em>"Inscribirme"</em> en cualquier curso para comenzar.
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        myCoursesCache.forEach((item) => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            const isCompleted = item.progreso >= 100;

            col.innerHTML = `
                <div class="card h-100 shadow-sm border-0">
                    <img src="${item.imagen}" class="card-img-top" alt="${item.curso}" style="height: 160px; object-fit: cover;" />
                    <div class="card-body d-flex flex-column">
                        <span class="badge bg-info text-dark align-self-start mb-2">${item.tiempo}</span>
                        <h5 class="card-title fw-bold">${item.curso}</h5>
                        <p class="card-text text-muted small flex-grow-1">${item.descripcion}</p>
                        
                        <div class="my-3">
                            <div class="d-flex justify-content-between small text-muted mb-1">
                                <span>Progreso</span>
                                <strong class="${isCompleted ? 'text-success' : 'text-primary'}">${item.progreso}%</strong>
                            </div>
                            <div class="progress" style="height: 10px;">
                                <div class="progress-bar ${isCompleted ? 'bg-success' : 'bg-primary'}" role="progressbar" style="width: ${item.progreso}%;"></div>
                            </div>
                        </div>

                        <div class="d-flex flex-column gap-2 mt-auto">
                            ${
                                isCompleted
                                    ? `<button class="btn btn-warning btn-sm text-dark fw-bold btn-show-cert" data-curso-id="${item.curso_id}">
                                        <i class="bi bi-award-fill text-dark"></i> Ver Certificado Digital
                                       </button>`
                                    : `<button class="btn btn-primary btn-sm btn-advance-course" data-curso-id="${item.curso_id}" data-current="${item.progreso}">
                                        <i class="bi bi-arrow-up-circle"></i> Avanzar Lección (+25%)
                                       </button>`
                            }
                            <button class="btn btn-outline-danger btn-sm btn-unenroll" data-curso-id="${item.curso_id}">
                                <i class="bi bi-x-circle"></i> Darse de baja
                            </button>
                        </div>
                    </div>
                </div>
            `;

            // Vincular eventos
            col.querySelector('.btn-advance-course')?.addEventListener('click', async (e) => {
                const cursoId = Number(e.currentTarget.dataset.cursoId);
                const currentProg = Number(e.currentTarget.dataset.current);
                const nuevoProg = Math.min(100, currentProg + 25);
                try {
                    await apiRequest(`/matriculas/${cursoId}/progreso`, {
                        method: 'PUT',
                        body: JSON.stringify({ progreso: nuevoProg })
                    });
                    setFeedback('studentCoursesFeedback', 'success', `Progreso actualizado al ${nuevoProg}%.`);
                    await loadMyCourses();
                    if (nuevoProg === 100) {
                        const cursoObj = myCoursesCache.find((c) => c.curso_id === cursoId);
                        if (cursoObj) showCertificateModal(cursoObj);
                    }
                } catch (err) {
                    setFeedback('studentCoursesFeedback', 'danger', err.message);
                }
            });

            col.querySelector('.btn-show-cert')?.addEventListener('click', () => {
                showCertificateModal(item);
            });

            col.querySelector('.btn-unenroll')?.addEventListener('click', async (e) => {
                const cursoId = Number(e.currentTarget.dataset.cursoId);
                if (!window.confirm(`¿Seguro que deseas cancelar tu matrícula en ${item.curso}?`)) return;
                try {
                    await apiRequest(`/matriculas/${cursoId}`, { method: 'DELETE' });
                    setFeedback('studentCoursesFeedback', 'success', 'Matrícula cancelada correctamente.');
                    await loadMyCourses();
                    renderCourseCatalog(coursesCache);
                } catch (err) {
                    setFeedback('studentCoursesFeedback', 'danger', err.message);
                }
            });

            list.appendChild(col);
        });
    } catch (error) {
        list.innerHTML = `<div class="col-12"><div class="alert alert-danger">${error.message}</div></div>`;
    }
}

function showCertificateModal(item) {
    const modalEl = document.getElementById('certificateModal');
    if (!modalEl || !currentUser) return;

    document.getElementById('certStudentName').textContent = currentUser.nombre;
    document.getElementById('certCourseName').textContent = item.curso;
    document.getElementById('certCourseDuration').textContent = item.tiempo;
    document.getElementById('certDate').textContent = new Date().toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

async function enrollInCourse(course) {
    if (!currentUser) {
        if (!document.getElementById('loginModal')) {
            window.location.href = new URL('../index.html?auth=login', window.location.href).href;
            return;
        }
        showAlert('warning', 'Debes iniciar sesión para matricularte en los cursos.');
        openAuthModal('loginModal');
        return;
    }

    try {
        const result = await apiRequest('/matriculas', {
            method: 'POST',
            body: JSON.stringify({ curso_id: course.id })
        });
        showAlert('success', result.message || `¡Inscripción exitosa en ${course.curso}!`);
        await loadMyCourses();
        renderCourseCatalog(coursesCache);
    } catch (error) {
        showAlert('warning', error.message);
    }
}

