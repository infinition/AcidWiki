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

// Fichiers qui appartiennent au deploiement : jamais ecrases.
const PRESERVED = ['wiki/config.js', 'wiki/assets', 'wiki/index.json', 'wiki/index-links.json'];

// Les feuilles de theme sont choisies a l'execution, pas referencees dans le
// document : elles se decouvrent par le dossier, pas par le balayage ci-dessous.
const ENGINE_DIRS = ['wiki/themes'];

// Ressources chargees autrement que par un attribut src ou href du document.
// Vide aujourd'hui : tout ce que le moteur charge est declare dans index.html.
// Ce qui viendrait a etre injecte par script devrait etre ajoute ici, faute de
// quoi la derivation ne le verrait pas.
const ENGINE_EXTRA = [];

function estPreserve(ref) {
    return PRESERVED.some(entry => ref === entry || ref.startsWith(entry + '/'));
}

// Ce qui appartient au moteur, deduit du document plutot que tenu a la main.
// Une liste manuelle derive des qu'on ajoute une ressource : on l'oublie a la
// synchronisation, et le deploiement la sert en 404 sans rien signaler. Le
// document est deja le fichier qu'on modifie en ajoutant une ressource, donc
// c'est lui qui fait foi.
function fichiersDuMoteur() {
    const html = readFileSync(join(engineRoot, 'index.html'), 'utf8');
    const refs = new Set(['index.html', ...ENGINE_EXTRA]);

    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        const ref = m[1].split('?')[0].split('#')[0];
        if (!ref.startsWith('wiki/')) continue;      // externe, ancre ou donnee
        if (estPreserve(ref)) continue;              // appartient au deploiement
        if (ENGINE_DIRS.some(dir => ref.startsWith(dir + '/'))) continue;
        // Un fichier reclame mais absent est signale par --check, qui rend un
        // rapport ordonne : l'annoncer ici le ferait surgir au milieu du reste.
        if (!existsSync(join(engineRoot, ref))) continue;
        refs.add(ref);
    }
    return [...refs];
}

const ENGINE_FILES = fichiersDuMoteur();

// Surcharges devenues inutiles une fois leurs correctifs remontes dans le moteur.
// Les laisser en place ferait reapparaitre d'anciens contournements par-dessus le
// moteur corrige, avec leurs !important.
const OBSOLETE = ['wiki/mlpro.css', 'wiki/academy-core.css'];

function parseArgs(argv) {
    const args = { target: null, dryRun: false, serve: true, check: false };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--target') args.target = argv[++i];
        else if (argv[i] === '--dry-run') args.dryRun = true;
        else if (argv[i] === '--no-serve') args.serve = false;
        else if (argv[i] === '--check') args.check = true;
        else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || (!args.target && !args.check)) {
    console.log(`Usage: node tools/sync-engine.mjs --target <dossier> [--dry-run] [--no-serve]
       node tools/sync-engine.mjs --check

  --target    deploiement a mettre a jour
  --dry-run   afficher ce qui serait fait, sans rien ecrire
  --no-serve  ne pas recopier tools/serve.py a la racine du deploiement
  --check     verifier le moteur seul, sans deploiement

Preserve : ${PRESERVED.join(', ')}`);
    process.exit(args.help ? 0 : 1);
}

// Verification du moteur seul : toute ressource que le document reclame doit
// exister ici, sinon elle partira en 404 chez chaque deploiement sans que rien
// ne le signale a la source.
if (args.check) {
    const html = readFileSync(join(engineRoot, 'index.html'), 'utf8');
    const absents = [];

    for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        const ref = m[1].split('?')[0].split('#')[0];
        if (!ref.startsWith('wiki/')) continue;
        if (existsSync(join(engineRoot, ref))) continue;
        // La configuration et les index sont fournis par le deploiement.
        if (estPreserve(ref)) continue;
        absents.push(ref);
    }

    console.log(`Moteur : ${engineRoot}`);
    console.log(`         ${ENGINE_FILES.length} fichier(s) deduits d'index.html`);
    for (const f of ENGINE_FILES) console.log(`  ok   ${f}`);

    const themes = existsSync(join(engineRoot, 'wiki/themes'))
        ? readdirSync(join(engineRoot, 'wiki/themes')).filter(n => n.endsWith('.css')).length
        : 0;
    console.log(`  ok   wiki/themes/ (${themes} feuilles)`);

    // Tout sur le meme flux : stdout et stderr s'entrelacent a l'affichage, et le
    // rapport devenait illisible juste au moment ou il signale un probleme.
    if (absents.length) {
        console.log('\nReferences sans fichier correspondant :');
        for (const f of absents) console.log(`  ${f}`);
        console.log('\nMoteur incoherent.');
        process.exit(1);
    }
    console.log('\nMoteur coherent.');
    process.exit(0);
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
console.log(`        ${ENGINE_FILES.length} fichier(s) deduits d'index.html`);
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
