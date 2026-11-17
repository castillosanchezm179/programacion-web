// --- CONSUMO DE LA API DE GITHUB ---
async function renderGithubRepos() {
    const list = document.getElementById('githubRepoList');
    if (!list) return;

    list.innerHTML = '<div class="col-12 text-center py-4 text-muted"><div class="spinner-border text-primary spinner-border-sm me-2"></div>Consultando repositorios en vivo desde GitHub API...</div>';

    try {
        const response = await fetch('https://api.github.com/search/repositories?q=topic:web-development+sort:stars&per_page=6');
        if (!response.ok) throw new Error(`La API de GitHub respondió con código ${response.status}.`);
        const data = await response.json();
        const repos = data.items || [];

        list.replaceChildren();
        if (!repos.length) {
            list.innerHTML = '<div class="col-12 text-muted">No se encontraron repositorios en este momento.</div>';
            return;
        }

        repos.forEach((repo) => {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            col.innerHTML = `
                <div class="card h-100 shadow-sm github-card border-0">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle">${repo.language || 'Software'}</span>
                            <span class="text-warning small"><i class="bi bi-star-fill"></i> ${new Intl.NumberFormat().format(repo.stargazers_count)}</span>
                        </div>
                        <h5 class="card-title fw-bold text-truncate" title="${repo.name}">${repo.name}</h5>
                        <p class="card-text text-muted small flex-grow-1">${repo.description || 'Sin descripción disponible.'}</p>
                        <div class="mt-3 pt-2 border-top d-flex justify-content-between align-items-center">
                            <span class="small text-secondary"><i class="bi bi-person"></i> ${repo.owner.login}</span>
                            <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-dark btn-sm">
                                <i class="bi bi-github"></i> Ver Código
                            </a>
                        </div>
                    </div>
                </div>
            `;
            list.appendChild(col);
        });
    } catch (error) {
        list.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning mb-0">
                    <i class="bi bi-exclamation-triangle-fill me-2"></i>
                    No fue posible consultar la API externa en este momento: ${error.message}
                </div>
            </div>
        `;
    }
}

