#!/usr/bin/env node
// Banc de test des modules autonomes du moteur (obsidian.js, interactive.js).
// Ils sont ecrits pour le navigateur, on leur fournit donc un window minimal.
import { readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    requestAnimationFrame: (fn) => setTimeout(fn, 0),
    localStorage: {
        store: new Map(),
        getItem(k) { return this.store.has(k) ? this.store.get(k) : null; },
        setItem(k, v) { this.store.set(k, String(v)); }
    },
    document: {
        createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {}, addEventListener() {}, appendChild() {}, querySelector: () => null }),
        addEventListener() {},
        body: { appendChild() {} }
    },
    fetch: async () => ({ ok: false })
};
sandbox.window = sandbox;
vm.createContext(sandbox);

for (const file of ['wiki/obsidian.js', 'wiki/interactive.js']) {
    vm.runInContext(readFileSync(join(root, file), 'utf8'), sandbox, { filename: file });
}

let failures = 0;
function check(label, actual, expected) {
    const ok = typeof expected === 'function' ? expected(actual) : actual === expected;
    if (ok) {
        console.log(`  ok   ${label}`);
    } else {
        failures++;
        console.error(`  FAIL ${label}\n       attendu : ${expected}\n       obtenu  : ${actual}`);
    }
}

// --- Couche Obsidian --------------------------------------------------------

const files = {
    'chapitre 3': 'wiki/docs/02_Cours/Chapitre 3.md',
    'chapitre 3.md': 'wiki/docs/02_Cours/Chapitre 3.md',
    'schema.png': 'wiki/docs/_assets/schema.png',
    'cours.pdf': 'wiki/docs/_assets/cours.pdf',
    'demo.mp4': 'wiki/docs/_assets/demo.mp4',
    'wiki/docs/02_cours/voisin.md': 'wiki/docs/02_Cours/Voisin.md',
    'voisin': 'wiki/docs/02_Cours/Voisin.md'
};

sandbox.window.AcidWikiObsidian.configure({
    resolvePath: (target, baseDir) => {
        const clean = String(target).replace(/^\.\//, '').toLowerCase();
        if (baseDir) {
            const joined = [];
            for (const part of `${baseDir}/${clean}`.split('/')) {
                if (part === '..') joined.pop();
                else if (part && part !== '.') joined.push(part);
            }
            const rel = joined.join('/');
            if (files[rel]) return files[rel];
            if (files[`${rel}.md`]) return files[`${rel}.md`];
        }
        return files[clean] || files[`${clean}.md`] || files[clean.split('/').pop()] || null;
    },
    assetUrl: (p) => `./${p}`,
    pageUrl: (p) => `?page=${p.replace('wiki/docs/', '')}`
});

const O = sandbox.window.AcidWikiObsidian;
const run = (text, docPath = 'wiki/docs/02_Cours/Index.md') => O.preprocess(text, { docPath }).markdown;

check('frontmatter retire',
    O.preprocess('---\ntitle: Test\ntags: a\n---\n# Titre', {}).markdown.trim(), '# Titre');
check('frontmatter lu',
    O.preprocess('---\ntitle: Test\n---\ncorps', {}).frontmatter.title, 'Test');
check('lien wiki resolu',
    run('Voir [[Chapitre 3]] ici.'), 'Voir [Chapitre 3](?page=02_Cours/Chapitre 3.md) ici.');
check('lien wiki avec alias',
    run('Voir [[Chapitre 3|le chapitre]].'), 'Voir [le chapitre](?page=02_Cours/Chapitre 3.md).');
check('lien wiki avec ancre',
    run('Voir [[Chapitre 3#Partie A]].'), (v) => v.includes('#Partie%20A'));
check('lien relatif prioritaire',
    run('[[Voisin]]'), '[Voisin](?page=02_Cours/Voisin.md)');
check('cible inconnue signalee sans casser',
    run('[[Rien du tout]]'), (v) => v.includes('acid-missing-link') && v.includes('Rien du tout'));
check('image integree',
    run('![[schema.png]]'), (v) => v.includes('<img src="./wiki/docs/_assets/schema.png"'));
check('image avec largeur',
    run('![[schema.png|320]]'), (v) => v.includes('width="320"'));
check('video integree',
    run('![[demo.mp4]]'), (v) => v.includes('<video controls'));
check('pdf en conteneur data-pdf',
    run('![[cours.pdf]]'), (v) => v.includes('data-pdf="./wiki/docs/_assets/cours.pdf"') && !v.includes('<iframe'));
check('bloc de code preserve',
    run('```js\nconst x = [[pas un lien]];\n```'), (v) => v.includes('[[pas un lien]]'));
check('code inline preserve',
    run('Ecrire `[[ceci]]` litteralement.'), (v) => v.includes('`[[ceci]]`'));
check('bloc math compacte',
    run('$$\na = b\n\n+ c\n$$'), (v) => v.includes('$$a = b\n+ c$$'));
check('image relative reroutee',
    run('![vue](../_assets/schema.png)'), (v) => v.includes('](./wiki/docs/_assets/schema.png)'));
// Cas rencontres tels quels dans un vrai coffre : la syntaxe [[ ]] de bash et les
// tableaux imbriques de JavaScript ne sont pas des liens de coffre.
check('test bash [[ ]] preserve dans un bloc',
    run('```bash\nif [[ -d $PYENV_ROOT/bin ]]; then echo ok; fi\n```'),
    (v) => v.includes('[[ -d $PYENV_ROOT/bin ]]') && !v.includes('acid-missing-link'));
check('tableau imbrique preserve dans un bloc',
    run('```js\nconst m = [[1, 2], [3, 4]];\n```'), (v) => v.includes('[[1, 2], [3, 4]]'));
check('lien vers un media resolu en lien simple',
    run('[[demo.mp4]]'), '[demo.mp4](./wiki/docs/_assets/demo.mp4)');
check('chemin partiel resolu par le nom de fichier',
    run('[[02_Cours/Voisin]]'), '[02_Cours/Voisin](?page=02_Cours/Voisin.md)');

check('markdown ordinaire inchange',
    run('# Titre\n\nUn [lien](https://exemple.org) et du **gras**.'),
    '# Titre\n\nUn [lien](https://exemple.org) et du **gras**.');

// --- Quizz et flashcards ----------------------------------------------------

const I = sandbox.window.AcidWikiInteractive;

const page = [
    '# Cours',
    '',
    '```flashcard',
    '[{"question": "2 + 2 ?", "answer": "4"}]',
    '```',
    '',
    'Texte conserve.',
    '',
    '```quizz',
    '[{"question": "Capitale ?", "options": [{"text": "Paris", "correct": true}, {"text": "Lyon"}]}]',
    '```',
    ''
].join('\n');

const extracted = I.extract(page);
check('flashcard extraite', extracted.flashcards.length, 1);
check('quizz extrait', extracted.quiz.length, 1);
check('blocs retires du corps', extracted.markdown.includes('```'), false);
check('texte conserve', extracted.markdown.includes('Texte conserve.'), true);

check('alias quiz accepte', I.extract('```quiz\n[{"question":"a","options":["x","y"],"answer":1}]\n```').quiz.length, 1);
check('alias flashcards accepte', I.extract('```flashcards\n[{"front":"a","back":"b"}]\n```').flashcards.length, 1);
check('format objet items accepte', I.extract('```quizz\n{"items":[{"question":"a","options":["x"],"answer":0}]}\n```').quiz.length, 1);
check('bloc illisible ignore sans planter', I.extract('```quizz\n{ pas du json\n```').quiz.length, 0);
check('page sans bloc inchangee', I.extract('# Rien\n\nDu texte.').markdown, '# Rien\n\nDu texte.');

console.log(failures ? `\n${failures} test(s) en echec.` : '\nTous les tests passent.');
process.exit(failures ? 1 : 0);
