// --- CATÁLOGO DE CURSOS, BÚSQUEDA Y PAGINACIÓN ---
function createCourseCard(course) {
    const column = document.createElement('div');
    column.className = 'col-md-6 col-xl-4';
    const card = document.createElement('article');
    card.className = 'card h-100 shadow-sm border-0';
    const image = document.createElement('img');
    image.className = 'card-img-top';
    image.src = course.imagen;
    image.alt = course.curso;
    image.loading = 'lazy';
    image.addEventListener('error', () => image.classList.add('d-none'), { once: true });

    const isEnrolled = myCoursesCache.some((m) => m.curso_id === course.id);

    const body = document.createElement('div');
    body.className = 'card-body d-flex flex-column';
    const duration = document.createElement('span');
    duration.className = 'badge bg-info text-dark align-self-start mb-2';
    duration.textContent = course.tiempo;
    const title = document.createElement('h3');
    title.className = 'h5 card-title fw-bold';
    title.textContent = course.curso;
    const description = document.createElement('p');
    description.className = 'card-text flex-grow-1';
    description.textContent = course.descripcion;
    const price = document.createElement('p');
    price.className = 'fw-bold text-primary mb-3';
    price.textContent = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(course.precio);

    const actionContainer = document.createElement('div');
    actionContainer.className = 'mt-auto pt-2 border-top';

    if (isEnrolled) {
        actionContainer.innerHTML = `
            <span class="badge bg-success-subtle text-success border border-success p-2 w-100 text-center">
                <i class="bi bi-check-circle-fill me-1"></i> Ya estás matriculado
            </span>
        `;
    } else {
        const enrollBtn = document.createElement('button');
        enrollBtn.type = 'button';
        enrollBtn.className = 'btn btn-outline-primary btn-sm w-100';
        enrollBtn.innerHTML = '<i class="bi bi-plus-circle me-1"></i> Inscribirme';
        enrollBtn.addEventListener('click', () => enrollInCourse(course));
        actionContainer.appendChild(enrollBtn);
    }

    body.append(duration, title, description, price, actionContainer);
    card.append(image, body);
    column.appendChild(card);
    return column;
}

function renderCourseCatalog(courses) {
    const catalog = document.getElementById('courseCatalog');
    const paginationEl = document.getElementById('coursePagination');

    // Filtrar por término de búsqueda si existe
    let filtered = courses;
    if (searchQuery) {
        filtered = courses.filter(
            (c) =>
                c.curso.toLowerCase().includes(searchQuery) ||
                c.descripcion.toLowerCase().includes(searchQuery)
        );
    }

    // Paginación en la vista completa de cursos
    if (catalog) {
        catalog.replaceChildren();

        const totalPages = Math.ceil(filtered.length / COURSES_PER_PAGE) || 1;
        if (currentPage > totalPages) currentPage = 1;

        const startIdx = (currentPage - 1) * COURSES_PER_PAGE;
        const pageItems = filtered.slice(startIdx, startIdx + COURSES_PER_PAGE);

        pageItems.forEach((course) => catalog.appendChild(createCourseCard(course)));

        // Renderizar controles de paginación
        if (paginationEl) {
            paginationEl.replaceChildren();
            if (totalPages > 1) {
                // Botón Anterior
                const prevLi = document.createElement('li');
                prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
                prevLi.innerHTML = `<button class="page-link" aria-label="Anterior">&laquo;</button>`;
                prevLi.querySelector('button').addEventListener('click', () => {
                    if (currentPage > 1) {
                        currentPage--;
                        renderCourseCatalog(coursesCache);
                        window.scrollTo({ top: 150, behavior: 'smooth' });
                    }
                });
                paginationEl.appendChild(prevLi);

                // Números de página
                for (let p = 1; p <= totalPages; p++) {
                    const li = document.createElement('li');
                    li.className = `page-item ${p === currentPage ? 'active' : ''}`;
                    li.innerHTML = `<button class="page-link">${p}</button>`;
                    const btn = li.querySelector('button');
                    btn.addEventListener('click', () => {
                        currentPage = p;
                        renderCourseCatalog(coursesCache);
                        window.scrollTo({ top: 150, behavior: 'smooth' });
                    });
                    paginationEl.appendChild(li);
                }

                // Botón Siguiente
                const nextLi = document.createElement('li');
                nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
                nextLi.innerHTML = `<button class="page-link" aria-label="Siguiente">&raquo;</button>`;
                nextLi.querySelector('button').addEventListener('click', () => {
                    if (currentPage < totalPages) {
                        currentPage++;
                        renderCourseCatalog(coursesCache);
                        window.scrollTo({ top: 150, behavior: 'smooth' });
                    }
                });
                paginationEl.appendChild(nextLi);
            }
        }
    }

    // En index.html, featuredCourses muestra los 3 primeros
    const featured = document.getElementById('featuredCourses');
    if (featured) {
        featured.replaceChildren();
        courses.slice(0, 3).forEach((course) => featured.appendChild(createCourseCard(course)));
    }

    // Mensajes de lista vacía
    if (!filtered.length) {
        const message = searchQuery
            ? `No se encontraron cursos que coincidan con "${searchQuery}".`
            : 'Aún no hay cursos registrados.';
        const catalogFeedback = document.getElementById('catalogFeedback');
        if (catalogFeedback) setFeedback('catalogFeedback', 'warning', message);
    } else {
        setFeedback('catalogFeedback', '', '');
    }
}

function renderCourseTable() {
    const tableBody = document.getElementById('courseTableBody');
    if (!tableBody) return;
    tableBody.replaceChildren();

    if (!coursesCache.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 4;
        cell.className = 'text-center text-muted';
        cell.textContent = 'No hay cursos registrados.';
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    coursesCache.forEach((course) => {
        const row = document.createElement('tr');
        [
            course.curso,
            course.tiempo,
            new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                maximumFractionDigits: 0
            }).format(course.precio)
        ].forEach((value) => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actions = document.createElement('td');
        const editButton = document.createElement('button');
        editButton.type = 'button';
        editButton.className = 'btn btn-sm btn-outline-primary me-2';
        editButton.textContent = 'Editar';
        editButton.addEventListener('click', () => editCourse(course));
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'btn btn-sm btn-outline-danger';
        deleteButton.textContent = 'Eliminar';
        deleteButton.addEventListener('click', () => deleteCourse(course));
        actions.append(editButton, deleteButton);
        row.appendChild(actions);
        tableBody.appendChild(row);
    });
}

async function loadCourses() {
    const catalog = document.getElementById('courseCatalog');
    if (catalog && !coursesCache.length) catalog.textContent = 'Cargando catálogo...';

    try {
        coursesCache = await apiRequest('/cursos', { auth: false });
        if (currentUser) {
            try {
                myCoursesCache = await apiRequest('/matriculas/mis-cursos');
            } catch (_) {
                myCoursesCache = [];
            }
        }
        renderCourseCatalog(coursesCache);
        renderCourseTable();
    } catch (error) {
        const message = error.message || 'No se pudo cargar el catálogo de cursos.';
        setFeedback('catalogFeedback', 'danger', message);
        setFeedback('featuredCourseFeedback', 'danger', message);
    }
}

function editCourse(course) {
    document.getElementById('courseId').value = String(course.id);
    document.getElementById('courseName').value = course.curso;
    document.getElementById('courseDescription').value = course.descripcion;
    document.getElementById('courseDuration').value = course.tiempo;
    document.getElementById('coursePrice').value = course.precio;
    document.getElementById('courseImage').value = course.imagen;
    document.getElementById('courseSubmitButton').textContent = 'Guardar cambios';
    document.getElementById('cancelCourseEdit').classList.remove('d-none');
    document.getElementById('courseForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function clearCourseForm() {
    const form = document.getElementById('courseForm');
    if (!form) return;
    form.reset();
    document.getElementById('courseId').value = '';
    document.getElementById('courseSubmitButton').textContent = 'Agregar curso';
    document.getElementById('cancelCourseEdit').classList.add('d-none');
}

async function handleCourseSubmit(event) {
    event.preventDefault();
    const courseId = document.getElementById('courseId').value;
    const course = {
        curso: document.getElementById('courseName').value.trim(),
        descripcion: document.getElementById('courseDescription').value.trim(),
        tiempo: document.getElementById('courseDuration').value.trim(),
        precio: Number(document.getElementById('coursePrice').value),
        imagen: document.getElementById('courseImage').value.trim()
    };

    try {
        await apiRequest(courseId ? `/cursos/${courseId}` : '/cursos', {
            method: courseId ? 'PUT' : 'POST',
            body: JSON.stringify(course)
        });
        clearCourseForm();
        await loadCourses();
        setFeedback('courseManagerFeedback', 'success', courseId ? 'Curso actualizado.' : 'Curso agregado.');
    } catch (error) {
        setFeedback('courseManagerFeedback', 'danger', error.message);
    }
}

async function deleteCourse(course) {
    if (!window.confirm(`¿Eliminar el curso "${course.curso}"?`)) return;
    try {
        await apiRequest(`/cursos/${course.id}`, { method: 'DELETE' });
        await loadCourses();
        setFeedback('courseManagerFeedback', 'success', 'Curso eliminado.');
    } catch (error) {
        setFeedback('courseManagerFeedback', 'danger', error.message);
    }
}

