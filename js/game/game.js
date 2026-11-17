// Lógica de Reto Dev. Las preguntas viven en questions.json para que los datos
// puedan editarse sin tocar el código que controla la partida.
(() => {
    const HIGH_SCORE_KEY = 'codevarsity_trivia_highscore';
    const PLAYED_KEY = 'codevarsity_trivia_played';
    const scriptUrl = document.currentScript.src;
    let questions = [];
    let questionIndex = 0;
    let score = 0;
    let loadingQuestions;

    function updateStats() {
        const current = document.getElementById('gameCurrentScore');
        const high = document.getElementById('gameHighScore');
        const played = document.getElementById('gameTotalPlayed');
        if (current) current.textContent = score;
        if (high) high.textContent = localStorage.getItem(HIGH_SCORE_KEY) || '0';
        if (played) played.textContent = localStorage.getItem(PLAYED_KEY) || '0';
    }

    async function loadQuestions() {
        if (!loadingQuestions) {
            const questionsUrl = location.protocol === 'file:'
                ? 'http://localhost:3000/js/game/questions.json'
                : new URL('./questions.json', scriptUrl);
            loadingQuestions = fetch(questionsUrl)
                .then((response) => {
                    if (!response.ok) throw new Error('No se pudieron cargar las preguntas.');
                    return response.json();
                })
                .then((data) => {
                    if (!Array.isArray(data) || data.some((q) => !q.question || !Array.isArray(q.options) || !Number.isInteger(q.correct))) {
                        throw new Error('El archivo de preguntas no tiene un formato válido.');
                    }
                    return data;
                });
        }
        return loadingQuestions;
    }

    function renderQuestion() {
        const container = document.getElementById('gameQuestionContainer');
        if (!container) return;
        const category = document.getElementById('gameQuestionCategory');
        const question = document.getElementById('gameQuestionText');
        const options = document.getElementById('gameOptionsContainer');
        const feedback = document.getElementById('gameFeedback');
        const next = document.getElementById('btnNextQuestion');
        feedback.className = 'alert d-none';
        next.classList.add('d-none');
        updateStats();

        if (questionIndex >= questions.length) {
            const played = Number(localStorage.getItem(PLAYED_KEY) || 0) + 1;
            const best = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);
            localStorage.setItem(PLAYED_KEY, String(played));
            const newRecord = score > best;
            if (newRecord) localStorage.setItem(HIGH_SCORE_KEY, String(score));
            updateStats();
            category.textContent = '¡Fin del Reto!';
            question.textContent = `Has completado el cuestionario con ${score} puntos de ${questions.length * 10} posibles.`;
            options.replaceChildren();
            const result = document.createElement('div');
            result.className = 'text-center py-4';
            const title = document.createElement('h4');
            title.textContent = newRecord ? '🎉 ¡Nuevo récord guardado!' : '¡Buen trabajo!';
            const detail = document.createElement('p');
            detail.className = 'text-muted';
            detail.textContent = 'Tus estadísticas se guardan en este navegador.';
            const replay = document.createElement('button');
            replay.type = 'button';
            replay.className = 'btn btn-primary mt-2';
            replay.textContent = 'Jugar de nuevo';
            replay.addEventListener('click', init);
            result.append(title, detail, replay);
            options.appendChild(result);
            return;
        }

        const current = questions[questionIndex];
        category.textContent = `Pregunta ${questionIndex + 1} de ${questions.length} — ${current.category}`;
        question.textContent = current.question;
        options.replaceChildren();
        current.options.forEach((text, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-secondary game-option-btn';
            button.textContent = `${String.fromCharCode(65 + index)}. ${text}`;
            button.addEventListener('click', () => answer(index, current.correct, button));
            options.appendChild(button);
        });
    }

    function answer(selected, correct, button) {
        const options = document.getElementById('gameOptionsContainer');
        const feedback = document.getElementById('gameFeedback');
        options.querySelectorAll('button').forEach((item) => { item.disabled = true; });
        if (selected === correct) {
            score += 10;
            button.className = 'btn btn-success game-option-btn';
            feedback.textContent = '¡Correcto! +10 puntos.';
            feedback.className = 'alert alert-success';
        } else {
            button.className = 'btn btn-danger game-option-btn';
            if (options.children[correct]) options.children[correct].className = 'btn btn-success game-option-btn';
            feedback.textContent = 'Incorrecto. Revisa la opción resaltada en verde.';
            feedback.className = 'alert alert-danger';
        }
        updateStats();
        document.getElementById('btnNextQuestion').classList.remove('d-none');
    }

    async function init() {
        questionIndex = 0;
        score = 0;
        updateStats();
        const questionText = document.getElementById('gameQuestionText');
        if (!questionText) return;
        questionText.textContent = 'Cargando preguntas...';
        try {
            questions = await loadQuestions();
            renderQuestion();
        } catch (error) {
            questionText.textContent = error.message;
        }
    }

    function next() {
        questionIndex += 1;
        renderQuestion();
    }

    function resetStats() {
        localStorage.removeItem(HIGH_SCORE_KEY);
        localStorage.removeItem(PLAYED_KEY);
        init();
    }

    window.DevGame = { init, next, resetStats };
})();
