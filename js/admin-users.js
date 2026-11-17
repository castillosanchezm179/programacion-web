// --- CRUD DE USUARIOS (ADMIN) ---
async function renderUsers() {
    const userTableBody = document.getElementById('userTableBody');
    if (!userTableBody || currentUser?.role !== 'admin') return;

    try {
        const users = await apiRequest('/users');
        userTableBody.replaceChildren();
        users.forEach((user) => {
            const row = document.createElement('tr');
            [user.id, user.nombre, user.email, user.role === 'admin' ? 'Administrador' : 'Usuario global'].forEach(
                (value) => {
                    const cell = document.createElement('td');
                    cell.textContent = value;
                    row.appendChild(cell);
                }
            );
            const actions = document.createElement('td');
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'btn btn-sm btn-outline-primary me-2';
            editButton.textContent = 'Editar';
            editButton.addEventListener('click', () => editUser(user));
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'btn btn-sm btn-outline-danger';
            deleteButton.textContent = 'Eliminar';
            deleteButton.disabled = user.id === currentUser.id;
            deleteButton.addEventListener('click', () => deleteUser(user));
            actions.append(editButton, deleteButton);
            row.appendChild(actions);
            userTableBody.appendChild(row);
        });
    } catch (error) {
        setFeedback('userManagerFeedback', 'danger', error.message);
    }
}

function editUser(user) {
    document.getElementById('adminUserId').value = String(user.id);
    document.getElementById('adminUserName').value = user.nombre;
    document.getElementById('adminUserEmail').value = user.email;
    document.getElementById('adminUserPassword').value = '';
    document.getElementById('adminUserPassword').required = false;
    document.getElementById('adminUserPassword').placeholder = 'No se modifica al editar';
    document.getElementById('adminUserRole').value = user.role;
    document.getElementById('adminUserSubmit').textContent = 'Guardar';
    document.getElementById('cancelAdminUserEdit').classList.remove('d-none');
}

function clearAdminUserForm() {
    const form = document.getElementById('adminUserForm');
    if (!form) return;
    form.reset();
    document.getElementById('adminUserId').value = '';
    document.getElementById('adminUserPassword').required = true;
    document.getElementById('adminUserPassword').placeholder = '';
    document.getElementById('adminUserSubmit').textContent = 'Crear';
    document.getElementById('cancelAdminUserEdit').classList.add('d-none');
}

async function deleteUser(user) {
    if (!window.confirm(`¿Eliminar la cuenta de ${user.nombre}?`)) return;
    try {
        await apiRequest(`/users/${user.id}`, { method: 'DELETE' });
        await renderUsers();
        setFeedback('userManagerFeedback', 'success', 'Usuario eliminado.');
    } catch (error) {
        setFeedback('userManagerFeedback', 'danger', error.message);
    }
}

async function handleAdminUserSubmit(event) {
    event.preventDefault();
    const userId = document.getElementById('adminUserId').value;
    const user = {
        nombre: document.getElementById('adminUserName').value.trim(),
        email: document.getElementById('adminUserEmail').value.trim(),
        role: document.getElementById('adminUserRole').value
    };
    if (!userId) user.password = document.getElementById('adminUserPassword').value;

    try {
        const savedUser = await apiRequest(userId ? `/users/${userId}` : '/users', {
            method: userId ? 'PUT' : 'POST',
            body: JSON.stringify(user)
        });
        if (savedUser.id === currentUser?.id) {
            currentUser = savedUser;
            authToggle();
            renderUserSummary();
        }
        clearAdminUserForm();
        await renderUsers();
        setFeedback('userManagerFeedback', 'success', userId ? 'Usuario actualizado.' : 'Usuario creado.');
    } catch (error) {
        setFeedback('userManagerFeedback', 'danger', error.message);
    }
}

