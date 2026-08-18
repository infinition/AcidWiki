#!/usr/bin/env node
/**
 * Recopie le moteur vers un deploiement local (coffre, portail, clef USB).
 *
 * Un deploiement hors GitHub n'a pas de workflow pour se mettre a jour. Sans
 * outil, on recopie les fichiers a la main, on en oublie un, et la copie derive
 * jusqu'a devenir une seconde version du moteur a maintenir. Ce script recopie
 * exactement ce qui appartient au moteur et ne touche jamais a ce qui appartient
 * au deploiement : sa configuration, son logo, son contenu.
 *
 * Utilisation :
 *   node tools/sync-engine.mjs --target "G:/.../academy-wiki"
 *   node tools/sync-engine.mjs --target "..." --dry-run
 */
import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const engineRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Ce qui appartient au moteur et doit etre identique partout.
const ENGINE_FILES = [
    'index.html',
    'wiki/enhancements.css',
    'wiki/enhancements.js',
    'wiki/interactive.css',
    'wiki/interactive.js',
    'wiki/obsidian.js',
    'wiki/deep-math-background.js',
    'wiki/manifest.pwa.json'
];

const ENGINE_DIRS = ['wiki/themes'];

// Fichiers qui appartiennent au deploiement : jamais ecrases.
const PRESERVED = ['wiki/config.js', 'wiki/assets', 'wiki/index.json', 'wiki/index-links.json'];

// Surcharges devenues inutiles une fois leurs correctifs remontes dans le moteur.
// Les laisser en place ferait reapparaitre d'anciens contournements par-dessus le
// moteur corrige, avec leurs !important.
const OBSOLETE = ['wiki/mlpro.css', 'wiki/academy-core.css'];

function parseArgs(argv) {
    const args = { target: null, dryRun: false, serve: true };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--target') args.target = argv[++i];
        else if (argv[i] === '--dry-run') args.dryRun = true;
        else if (argv[i] === '--no-serve') args.serve = false;
        else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.target) {
    console.log(`Usage: node tools/sync-engine.mjs --target <dossier> [--dry-run] [--no-serve]

  --target    deploiement a mettre a jour
  --dry-run   afficher ce qui serait fait, sans rien ecrire
  --no-serve  ne pas recopier tools/serve.py a la racine du deploiement

Preserve : ${PRESERVED.join(', ')}`);
    process.exit(args.help ? 0 : 1);
}

const target = resolve(args.target);
if (!existsSync(target)) {
    console.error(`Cible introuvable : ${target}`);
    process.exit(1);
}
if (resolve(target) === engineRoot) {
    console.error('La cible est le moteur lui-meme.');
    process.exit(1);
}

let copied = 0;
let skipped = 0;
let removed = 0;

function sameContent(a, b) {
    if (!existsSync(b)) return false;
    try {
        return readFileSync(a).equals(readFileSync(b));
    } catch (error) {
        return false;
    }
}

function copyOne(relPath, destRel = relPath) {
    const from = join(engineRoot, relPath);
    const to = join(target, destRel);
    if (!existsSync(from)) return;

    if (sameContent(from, to)) {
        skipped++;
        return;
    }
    console.log(`  ${existsSync(to) ? 'maj ' : 'new '} ${destRel}`);
    if (!args.dryRun) {
        mkdirSync(dirname(to), { recursive: true });
        copyFileSync(from, to);
    }
    copied++;
}

console.log(`Moteur : ${engineRoot}`);
console.log(`Cible  : ${target}\n`);

for (const file of ENGINE_FILES) copyOne(file);

for (const dir of ENGINE_DIRS) {
    const full = join(engineRoot, dir);
    if (!existsSync(full)) continue;
    for (const name of readdirSync(full)) {
        if (statSync(join(full, name)).isFile()) copyOne(`${dir}/${name}`);
    }
}

if (args.serve) copyOne('tools/serve.py', 'serve.py');

for (const file of OBSOLETE) {
    const dead = join(target, file);
    if (!existsSync(dead)) continue;
    console.log(`  del  ${file}  (correctifs remontes dans le moteur)`);
    if (!args.dryRun) rmSync(dead);
    removed++;
}

for (const kept of PRESERVED) {
    if (existsSync(join(target, kept))) console.log(`  keep ${kept}`);
}

console.log(`\n${copied} fichier(s) ecrit(s), ${skipped} deja a jour, ${removed} supprime(s).`);
if (args.dryRun) console.log('Essai a blanc : rien n\'a ete modifie.');
else console.log(`Pensez a reconstruire l'index : node tools/build-index.mjs --root "${relative(process.cwd(), target) || target}"`);
