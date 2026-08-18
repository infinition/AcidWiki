/**
 * Quizz et flashcards.
 *
 * Deux sources, toujours actives, jamais a declarer :
 *   1. un bloc de code dans la page          ```quizz / ```flashcard
 *   2. un fichier json a cote de la page     Chapitre.quiz.json / Chapitre.cards.json
 *
 * Une page sans donnee n'affiche aucun bouton : le module est inerte par defaut,
 * il n'y a donc rien a activer dans la configuration.
 */
(() => {
    const STORAGE_PREFIX = 'acidwiki_score_';

    // Noms de blocs acceptes. La graphie "quizz" vient du wiki d'origine, les autres
    // sont les orthographes que l'on ecrit naturellement.
    const QUIZ_FENCES = ['quizz', 'quiz'];
    const CARD_FENCES = ['flashcard', 'flashcards', 'cards'];

    // Suffixes cherches a cote du document, sans extension .md.
    const QUIZ_SIDECARS = ['.quiz.json', '.quizz.json'];
    const CARD_SIDECARS = ['.cards.json', '.flashcards.json'];

    let session = null;
    let modal = null;

    // --- LECTURE DES DONNEES ---------------------------------------------------

    function fenceRegex(names) {
        return new RegExp('^[ \\t]*```(?:' + names.join('|') + ')[ \\t]*\\r?\\n([\\s\\S]*?)\\r?\\n[ \\t]*```[ \\t]*$', 'gmi');
    }

    function parseBlocks(markdown, names) {
        const items = [];
        const regex = fenceRegex(names);
        let match;
        while ((match = regex.exec(markdown)) !== null) {
            try {
                items.push(...normalizeList(JSON.parse(match[1])));
            } catch (error) {
                console.warn('[AcidWiki] Bloc interactif illisible:', error.message);
            }
        }
        return items;
    }

    function normalizeList(data) {
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.items)) return data.items;
        if (data && typeof data === 'object') return [data];
        return [];
    }

    /** Retire les blocs interactifs du Markdown et renvoie leur contenu. */
    function extract(markdown) {
        if (!markdown || typeof markdown !== 'string') {
            return { markdown: markdown || '', flashcards: [], quiz: [] };
        }

        const quiz = parseBlocks(markdown, QUIZ_FENCES);
        const flashcards = parseBlocks(markdown, CARD_FENCES);
        if (!quiz.length && !flashcards.length) return { markdown, flashcards, quiz };

        const stripped = markdown
            .replace(fenceRegex(QUIZ_FENCES), '')
            .replace(fenceRegex(CARD_FENCES), '');

        return { markdown: stripped, flashcards, quiz };
    }

    /**
     * Cherche les fichiers json poses a cote de la page.
     * `known` vient de l'index statique : quand il est fourni, on ne demande que
     * les fichiers qui existent vraiment, la ou une sonde a l'aveugle produirait
     * quatre 404 par page consultee.
     */
    async function loadSidecars(baseUrl, known) {
        if (!baseUrl) return { quiz: [], flashcards: [] };
        if (known && !known.length) return { quiz: [], flashcards: [] };
        const stem = baseUrl.replace(/\.md$/i, '');
        const allowed = known ? new Set(known) : null;

        const fetchOne = async (suffix) => {
            if (allowed && !allowed.has(suffix)) return [];
            try {
                const res = await fetch(stem + suffix, { cache: 'no-cache' });
                if (!res.ok) return [];
                const text = await res.text();
                if (!text || /^\s*</.test(text)) return [];
                return normalizeList(JSON.parse(text));
            } catch (error) {
                return [];
            }
        };

        const [quizParts, cardParts] = await Promise.all([
            Promise.all(QUIZ_SIDECARS.map(fetchOne)),
            Promise.all(CARD_SIDECARS.map(fetchOne))
        ]);

        return {
            quiz: quizParts.flat(),
            flashcards: cardParts.flat()
        };
    }

    // --- NORMALISATION DES FORMATS ---------------------------------------------

    function readCard(raw) {
        const question = raw.question ?? raw.front ?? raw.q ?? raw.recto;
        const answer = raw.answer ?? raw.back ?? raw.a ?? raw.verso;
        if (question == null || answer == null) return null;
        return { question: String(question), answer: String(answer) };
    }

    /**
     * Trois ecritures de reponse cohabitent dans les contenus existants :
     * options: [{text, correct}], options: [...] + answer: index, et
     * options: [...] + answer: "texte". Les trois sont acceptees.
     */
    function readQuestion(raw) {
        const question = raw.question ?? raw.q;
        const source = raw.options ?? raw.answers ?? raw.choices;
        if (question == null || !Array.isArray(source) || !source.length) return null;

        const answerKey = raw.answer ?? raw.correct ?? raw.correctIndex;
        const options = source.map((option, index) => {
            if (option && typeof option === 'object') {
                return { text: String(option.text ?? option.label ?? ''), correct: Boolean(option.correct) };
            }
            const text = String(option);
            let correct = false;
            if (typeof answerKey === 'number') correct = answerKey === index;
            else if (typeof answerKey === 'string') correct = answerKey.trim().toLowerCase() === text.trim().toLowerCase();
            return { text, correct };
        });

        if (!options.some(option => option.correct)) return null;
        return { question: String(question), options, explanation: raw.explanation ?? raw.why ?? '' };
    }

    // --- INTERFACE --------------------------------------------------------------

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (c) => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    }

    // Le contenu des cartes est ecrit par l'auteur du wiki, au meme titre que la page.
    // Il peut donc porter du Markdown, nettoye avec le meme filtre que le corps.
    function richText(value) {
        const raw = String(value ?? '');
        if (typeof window.marked === 'undefined') return escapeHtml(raw);
        const html = window.marked.parseInline ? window.marked.parseInline(raw) : window.marked.parse(raw);
        return typeof window.DOMPurify !== 'undefined' ? window.DOMPurify.sanitize(html) : html;
    }

    function shuffle(list) {
        const copy = [...list];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    function ensureModal() {
        if (modal) return modal;
        modal = document.createElement('div');
        modal.className = 'acid-modal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.hidden = true;
        modal.innerHTML = '<div class="acid-modal-panel"><div class="acid-modal-body"></div></div>';

        modal.addEventListener('click', (event) => {
            if (event.target === modal) closeSession();
        });
        document.addEventListener('keydown', (event) => {
            if (modal.hidden) return;
            if (event.key === 'Escape') closeSession();
        });

        document.body.appendChild(modal);
        return modal;
    }

    function paint(html) {
        const body = ensureModal().querySelector('.acid-modal-body');
        body.innerHTML = html;
        window.lucide?.createIcons();

        // Les cartes d'une academie portent presque toujours des formules. Elles
        // passent par le meme rendu que le corps de page.
        if (typeof window.renderMathInElement === 'function') {
            try {
                window.renderMathInElement(body, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\(', right: '\)', display: false },
                        { left: '\[', right: '\]', display: true }
                    ],
                    throwOnError: false
                });
            } catch (error) {
                // Une formule invalide ne doit pas empecher la carte de s'afficher.
            }
        }
    }

    function openModal() {
        const node = ensureModal();
        node.hidden = false;
        // Un reflow force suffit a declencher la transition d'ouverture. Passer par
        // requestAnimationFrame laissait la modale invisible quand l'onglet n'etait
        // pas en train de composer d'images : le callback n'etait jamais appele.
        void node.offsetWidth;
        node.classList.add('is-open');
    }

    function closeSession() {
        if (!modal) return;
        modal.classList.remove('is-open');
        setTimeout(() => { modal.hidden = true; }, 220);
        session = null;
    }

    function previousScore(key) {
        try {
            return localStorage.getItem(STORAGE_PREFIX + key) || '';
        } catch (error) {
            return '';
        }
    }

    function header(title, key) {
        const previous = previousScore(key);
        return `<div class="acid-modal-head">
            <span class="acid-modal-title">${escapeHtml(title)}</span>
            <span class="acid-modal-prev">${previous ? 'Precedent : ' + escapeHtml(previous) : 'Premier essai'}</span>
            <button type="button" class="acid-modal-close" data-acid-action="close" aria-label="Fermer">
                <i data-lucide="x"></i>
            </button>
        </div>`;
    }

    function progressBar(done, total) {
        const percent = total ? Math.round((done / total) * 100) : 0;
        return `<div class="acid-progress"><div class="acid-progress-fill" style="width:${percent}%"></div></div>`;
    }

    // --- FLASHCARDS -------------------------------------------------------------

    function renderCard() {
        const card = session.items[session.index];
        paint(`${header('Flashcards', session.key)}
            ${progressBar(session.index, session.items.length)}
            <div class="acid-counter">Carte ${session.index + 1} / ${session.items.length}</div>
            <div class="acid-scene" data-acid-action="flip">
                <div class="acid-card">
                    <div class="acid-face acid-face-front">
                        <div class="acid-face-label">Question</div>
                        <div class="acid-face-text">${richText(card.question)}</div>
                        <div class="acid-hint">Cliquer pour retourner</div>
                    </div>
                    <div class="acid-face acid-face-back">
                        <div class="acid-face-label">Reponse</div>
                        <div class="acid-face-text">${richText(card.answer)}</div>
                    </div>
                </div>
            </div>
            <div class="acid-actions">
                <button type="button" class="acid-btn acid-btn-no" data-acid-action="card-wrong">
                    <i data-lucide="x"></i> A revoir
                </button>
                <button type="button" class="acid-btn acid-btn-yes" data-acid-action="card-right">
                    <i data-lucide="check"></i> Acquis
                </button>
            </div>`);
    }

    // --- QUIZZ ------------------------------------------------------------------

    function renderQuestion() {
        const item = session.items[session.index];
        const options = item.options.map((option, index) => `
            <button type="button" class="acid-option" data-acid-action="answer" data-index="${index}">
                <span class="acid-option-key">${String.fromCharCode(65 + index)}</span>
                <span class="acid-option-text">${richText(option.text)}</span>
            </button>`).join('');

        paint(`${header('Quizz', session.key)}
            ${progressBar(session.index, session.items.length)}
            <div class="acid-counter">Question ${session.index + 1} / ${session.items.length}</div>
            <div class="acid-question">${richText(item.question)}</div>
            <div class="acid-options">${options}</div>
            <div class="acid-explanation" hidden></div>`);
    }

    function revealAnswer(chosenIndex) {
        const item = session.items[session.index];
        const container = modal.querySelector('.acid-options');
        if (!container || container.classList.contains('is-answered')) return;
        container.classList.add('is-answered');

        const buttons = [...container.querySelectorAll('.acid-option')];
        buttons.forEach((button, index) => {
            if (item.options[index].correct) button.classList.add('is-correct');
            else if (index === chosenIndex) button.classList.add('is-wrong');
        });

        if (item.options[chosenIndex].correct) session.score++;

        const explanation = modal.querySelector('.acid-explanation');
        if (item.explanation) {
            explanation.innerHTML = richText(item.explanation);
            explanation.hidden = false;
        }

        setTimeout(advance, item.explanation ? 2600 : 1100);
    }

    // --- DEROULEMENT ------------------------------------------------------------

    function advance() {
        if (!session) return;
        if (session.index < session.items.length - 1) {
            session.index++;
            session.kind === 'quiz' ? renderQuestion() : renderCard();
        } else {
            finish(session.items.length);
        }
    }

    function finish(answered) {
        if (!session) return;
        const total = answered || session.index + 1;
        const score = `${session.score}/${total}`;
        const previous = previousScore(session.key);

        let verdict = 'Session terminee.';
        if (previous) {
            const before = parseInt(previous.split('/')[0], 10);
            if (session.score > before) verdict = 'Mieux que la derniere fois.';
            else if (session.score < before) verdict = 'En dessous de la derniere fois.';
            else verdict = 'Meme resultat que la derniere fois.';
        }

        try {
            localStorage.setItem(STORAGE_PREFIX + session.key, score);
        } catch (error) {
            // Stockage plein ou desactive : le score de la session reste affiche.
        }

        const kind = session.kind;
        paint(`${header(kind === 'quiz' ? 'Quizz' : 'Flashcards', '')}
            <div class="acid-result">
                <div class="acid-result-score">${score}</div>
                <div class="acid-result-note">${escapeHtml(verdict)}</div>
                <div class="acid-actions">
                    <button type="button" class="acid-btn" data-acid-action="restart">
                        <i data-lucide="rotate-ccw"></i> Recommencer
                    </button>
                    <button type="button" class="acid-btn acid-btn-yes" data-acid-action="close">
                        <i data-lucide="check"></i> Fermer
                    </button>
                </div>
            </div>`);
        session = { ...session, kind, finished: true };
    }

    function start(kind, items, key) {
        const cleaned = (kind === 'quiz' ? items.map(readQuestion) : items.map(readCard)).filter(Boolean);
        if (!cleaned.length) return;

        session = { kind, items: shuffle(cleaned), index: 0, score: 0, key: `${key}:${kind}`, source: items, sourceKey: key };
        openModal();
        kind === 'quiz' ? renderQuestion() : renderCard();
    }

    // Un seul ecouteur pour toute la modale : le contenu est reconstruit a chaque
    // etape, des gestionnaires poses sur les boutons seraient perdus a chaque rendu.
    function installModalEvents() {
        ensureModal().addEventListener('click', (event) => {
            const trigger = event.target.closest('[data-acid-action]');
            if (!trigger || !session) return;
            const action = trigger.dataset.acidAction;

            if (action === 'close') return closeSession();
            if (action === 'flip') return trigger.querySelector('.acid-card')?.classList.toggle('is-flipped');
            if (action === 'card-right') { session.score++; return advance(); }
            if (action === 'card-wrong') return advance();
            if (action === 'answer') return revealAnswer(Number(trigger.dataset.index));
            if (action === 'restart') {
                const { kind, source, sourceKey } = session;
                return start(kind, source, sourceKey);
            }
        });
    }

    // --- POINT D'ENTREE ---------------------------------------------------------

    function button(kind, label, icon) {
        return `<button type="button" class="acid-launch acid-launch-${kind}" data-acid-launch="${kind}">
            <i data-lucide="${icon}"></i> ${label}
        </button>`;
    }

    /**
     * Pose la barre de lancement en tete de page si des donnees existent.
     * Les fichiers json voisins sont cherches en arriere-plan : la page s'affiche
     * sans attendre, la barre apparait ensuite si quelque chose a ete trouve.
     */
    async function mount({ container, pageKey, quiz = [], flashcards = [], sidecarUrl = '', knownSidecars = null }) {
        if (!container) return;
        installModalEvents();

        let allQuiz = [...quiz];
        let allCards = [...flashcards];

        const render = () => {
            const existing = container.querySelector('.acid-launchbar');
            if (existing) existing.remove();
            if (!allQuiz.length && !allCards.length) return;

            const bar = document.createElement('div');
            bar.className = 'acid-launchbar';
            bar.innerHTML = [
                allCards.length ? button('flashcards', `Flashcards (${allCards.length})`, 'layers') : '',
                allQuiz.length ? button('quiz', `Quizz (${allQuiz.length})`, 'graduation-cap') : ''
            ].join('');

            bar.addEventListener('click', (event) => {
                const trigger = event.target.closest('[data-acid-launch]');
                if (!trigger) return;
                const kind = trigger.dataset.acidLaunch;
                start(kind === 'quiz' ? 'quiz' : 'cards', kind === 'quiz' ? allQuiz : allCards, pageKey);
            });

            container.prepend(bar);
            window.lucide?.createIcons();
        };

        render();

        const sidecars = await loadSidecars(sidecarUrl, knownSidecars);
        if (sidecars.quiz.length || sidecars.flashcards.length) {
            // La page a pu changer pendant la recherche des fichiers voisins.
            if (!container.isConnected) return;
            allQuiz = [...allQuiz, ...sidecars.quiz];
            allCards = [...allCards, ...sidecars.flashcards];
            render();
        }
    }

    window.AcidWikiInteractive = { extract, mount, close: closeSession };
})();
