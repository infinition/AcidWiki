#!/usr/bin/env node
/**
 * Construit wiki/index.json, l'index statique du moteur.
 *
 * Sans lui, le moteur decouvre son contenu soit par l'API GitHub (60 requetes par
 * heure en anonyme, une par page pour la date de derniere edition), soit en lisant
 * les listings HTML du serveur, ce qui suppose un serveur qui en produit.
 * Avec lui, tout tient dans un seul fichier : aucune requete tierce, fonctionne
 * hors ligne, et les liens [[wiki]] se resolvent puisque la table des fichiers
 * accompagne l'arborescence.
 *
 * Utilisation :
 *   node tools/build-index.mjs
 *   node tools/build-index.mjs --root "G:/.../mon-coffre" --out wiki/index.json
 *   node tools/build-index.mjs --content docs
 */
import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, extname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const engineRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Dossiers jamais parcourus. Reprend la liste du serveur local pour que les deux
// outils voient exactement le meme contenu.
const SKIP_DIRS = new Set([
    '.git', '.github', '.obsidian', '.trash', '.smart-env', '.agents',
    '__pycache__', 'node_modules', '_build', '_wiki', 'tools',
    '.vscode', '.idea', 'venv', '.venv'
]);

// Extensions indexees comme pieces jointes : ce que ![[...]] peut cibler.
const ASSET_EXT = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.avif', '.ico',
    '.mp4', '.webm', '.mov', '.m4v', '.ogv',
    '.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac',
    '.pdf', '.csv', '.zip', '.ipynb', '.txt'
]);

function parseArgs(argv) {
    const args = { root: null, out: null, content: null };
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        if (key === '--root') args.root = argv[++i];
        else if (key === '--out') args.out = argv[++i];
        else if (key === '--content') args.content = argv[++i];
        else if (key === '--help' || key === '-h') args.help = true;
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
    console.log(`Usage: node tools/build-index.mjs [--root <dossier>] [--content <sous-dossier>] [--out <fichier>]

  --root     racine a parcourir (defaut : le dossier du moteur)
  --content  racine de contenu a l'interieur (defaut : detection wiki/docs, wiki, docs)
  --out      fichier produit (defaut : <root>/wiki/index.json)`);
    process.exit(0);
}

const root = resolve(args.root || engineRoot);
const outFile = resolve(args.out ? resolve(args.out) : join(root, 'wiki', 'index.json'));

if (!existsSync(root)) {
    console.error(`Racine introuvable : ${root}`);
    process.exit(1);
}

/** Racine de contenu : le premier candidat qui existe et contient du markdown. */
function detectContentRoot() {
    if (args.content) return args.content.replace(/\\/g, '/').replace(/^\/|\/$/g, '');
    for (const candidate of ['wiki/docs', 'docs', 'wiki']) {
        const full = join(root, candidate);
        if (existsSync(full) && statSync(full).isDirectory() && hasMarkdown(full)) return candidate;
    }
    return '';
}

function hasMarkdown(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name.startsWith('.')) continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            if (hasMarkdown(full)) return true;
        } else if (entry.name.toLowerCase().endsWith('.md')) {
            return true;
        }
    }
    return false;
}

const contentPrefix = detectContentRoot();
const contentRoot = contentPrefix ? join(root, contentPrefix) : root;

const structure = {};
const rootMdFiles = [];
const mtimes = {};
const files = {};
// Fichiers de quizz et de flashcards poses a cote d'une page. Les recenser ici
// evite au moteur de sonder quatre URL par page pour n'obtenir que des 404.
const sidecars = {};
let fileCount = 0;

const SIDECAR_SUFFIXES = ['.quiz.json', '.quizz.json', '.cards.json', '.flashcards.json'];

/** Une cle de resolution n'ecrase jamais une cle deja posee : le premier gagne. */
function addLookup(key, value) {
    if (!key) return;
    const normalized = String(key).toLowerCase().replace(/\\/g, '/');
    if (!(normalized in files)) files[normalized] = value;
}

function titleOf(filename) {
    return filename.replace(/\.md$/i, '').replace(/_/g, ' ');
}

/** Chemin tel que le moteur le lira, toujours en separateurs avant. */
function repoPath(fullPath) {
    return relative(root, fullPath).split(sep).join('/');
}

function walk(dir, node) {
    let entries;
    try {
        entries = readdirSync(dir, { withFileTypes: true });
    } catch (error) {
        console.warn(`  ignore ${dir} : ${error.message}`);
        return;
    }

    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        const full = join(dir, entry.name);

        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            const child = {};
            walk(full, child);
            // Un dossier sans page n'a pas sa place dans la navigation. Ses pieces
            // jointes restent indexees, elles ont ete ajoutees pendant la descente.
            if (Object.keys(child).length) node[entry.name] = child;
            continue;
        }

        const path = repoPath(full);
        const ext = extname(entry.name).toLowerCase();

        if (ext === '.md') {
            // Quand la racine de contenu est celle du depot, les markdown poses a
            // sa racine sont des pages d'accueil, pas des entrees de navigation :
            // la passe rootMdFiles les reprend juste apres.
            if (!contentPrefix && dir === contentRoot) {
                addLookup(path, path);
                continue;
            }
            node[titleOf(entry.name)] = entry.name;
            fileCount++;
            const stem = full.slice(0, -3);
            const found = SIDECAR_SUFFIXES.filter(suffix => existsSync(stem + suffix));
            if (found.length) sidecars[path] = found;
            try {
                mtimes[path] = statSync(full).mtime.toISOString();
            } catch (error) {
                // Fichier disparu entre le listing et la lecture : sans date, le
                // moteur affiche simplement le champ vide.
            }
        } else if (!ASSET_EXT.has(ext)) {
            continue;
        }

        addLookup(path, path);
        addLookup(entry.name, path);
        addLookup(basename(entry.name, ext), path);
        // Chemin relatif a la racine de contenu : c'est ainsi qu'un auteur ecrit
        // ses liens depuis l'interieur du coffre.
        if (contentPrefix && path.startsWith(`${contentPrefix}/`)) {
            addLookup(path.slice(contentPrefix.length + 1), path);
        }
    }
}

walk(contentRoot, structure);

// Fichiers markdown poses a la racine du depot (README et compagnie).
for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
    rootMdFiles.push({ title: titleOf(entry.name), filename: entry.name });
    addLookup(entry.name, entry.name);
    addLookup(basename(entry.name, '.md'), entry.name);
    try {
        mtimes[entry.name] = statSync(join(root, entry.name)).mtime.toISOString();
    } catch (error) {
        // idem : la date est facultative.
    }
}

rootMdFiles.sort((a, b) => {
    if (a.filename.toLowerCase() === 'readme.md') return -1;
    if (b.filename.toLowerCase() === 'readme.md') return 1;
    return a.filename.localeCompare(b.filename, undefined, { numeric: true, sensitivity: 'base' });
});

// La table de resolution pese a elle seule dix fois l'arborescence sur un gros
// coffre : chaque fichier y apparait sous quatre a sept cles, avec son chemin
// complet en valeur. On la sort dans un fichier separe, charge seulement quand une
// page contient reellement un lien [[wiki]], et on remplace les chemins repetes par
// un renvoi vers un tableau. Sur 1960 pages, 2,3 Mo tombent ainsi a environ 600 Ko
// que la plupart des visiteurs ne telechargent jamais.
const paths = [];
const pathIds = new Map();
const lookup = {};
for (const [key, value] of Object.entries(files)) {
    let id = pathIds.get(value);
    if (id === undefined) {
        id = paths.length;
        paths.push(value);
        pathIds.set(value, id);
    }
    lookup[key] = id;
}

const linksFile = basename(outFile).replace(/\.json$/i, '') + '-links.json';

const index = {
    generated: new Date().toISOString(),
    contentPrefix,
    fileCount,
    structure,
    rootMdFiles,
    mtimes,
    sidecars,
    linksFile
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(index), 'utf8');

const linksPath = join(dirname(outFile), linksFile);
writeFileSync(linksPath, JSON.stringify({ paths, lookup }), 'utf8');

const sizeOf = (file) => `${(statSync(file).size / 1024).toFixed(0)} Ko`;

console.log(`Racine        : ${root}`);
console.log(`Contenu       : ${contentPrefix || '(racine)'}`);
console.log(`Pages         : ${fileCount}`);
console.log(`Racine .md    : ${rootMdFiles.length}`);
console.log(`Resolutions   : ${Object.keys(lookup).length}`);
console.log(`Quizz voisins : ${Object.keys(sidecars).length}`);
console.log(`Index ecrit   : ${outFile} (${sizeOf(outFile)})`);
console.log(`Liens ecrits  : ${linksPath} (${sizeOf(linksPath)})`);
