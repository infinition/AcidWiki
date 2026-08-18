#!/usr/bin/env node
/**
 * Ecrit wiki/config.js a partir du gabarit du moteur, de acidwiki.json et du
 * contexte du depot.
 *
 * Remplace une vingtaine de `sed -i "s|cle: \".*\"|..."` appliques a du code
 * JavaScript. Cette approche cassait des qu'un nom de depot ou une URL contenait
 * une barre verticale, un guillemet ou une apostrophe, et le fichier produit
 * n'etait plus analysable : le wiki s'affichait vide sans message clair. Ici le
 * gabarit est evalue, l'objet est modifie, puis reserialise. Une valeur ne peut
 * plus casser la syntaxe, et une erreur arrete la construction au lieu de
 * publier un site mort.
 *
 * Utilisation :
 *   node tools/apply-config.mjs --config .github/acidwiki.json \
 *        --target _site/wiki/config.js --repo owner/name --version v1.2.0
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1] ?? '';
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));
const target = args.target || 'wiki/config.js';
const configPath = args.config || '.github/acidwiki.json';

if (!existsSync(target)) {
    console.error(`Gabarit introuvable : ${target}`);
    process.exit(1);
}

// Le gabarit est un script navigateur : on lui donne juste un window factice.
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(readFileSync(target, 'utf8'), sandbox, { filename: target });

const CONFIG = sandbox.CONFIG || sandbox.window.CONFIG;
if (!CONFIG || typeof CONFIG !== 'object') {
    console.error(`Le gabarit ${target} ne definit pas d'objet CONFIG.`);
    process.exit(1);
}

let userConfig = {};
if (existsSync(configPath)) {
    try {
        userConfig = JSON.parse(readFileSync(configPath, 'utf8'));
    } catch (error) {
        console.error(`${configPath} n'est pas un JSON valide : ${error.message}`);
        process.exit(1);
    }
} else {
    console.log(`Aucun ${configPath}, valeurs par defaut conservees.`);
}

// --- Contexte du depot ------------------------------------------------------

const repoFull = args.repo || process.env.GITHUB_REPOSITORY || '';
const repoName = repoFull.split('/')[1] || CONFIG.projectName;
const year = new Date().getFullYear();

if (repoFull) {
    CONFIG.repo = repoFull;
    CONFIG.projectName = repoName.toUpperCase();
    CONFIG.projectSubtitle = `${repoName.toUpperCase()} WIKI`;
    CONFIG.description = `Official Documentation and Wiki for ${repoName}`;
    CONFIG.footerText = `© ${year} ${repoName.toUpperCase()} WIKI - All rights reserved`;
    CONFIG.social.github = `https://github.com/${repoFull}`;
    CONFIG.badges.githubLabel = repoName.toUpperCase();
}

CONFIG.versioning.type = 'local';
CONFIG.versioning.manualDate = new Date().toISOString().slice(0, 10);
// Une version absente vaut mieux qu'un fragment d'erreur de l'API affiche comme
// un numero de version : l'appelant ne transmet que ce qu'il a pu lire.
const version = (args.version || '').trim();
CONFIG.versioning.manualVersion = /^[\w.+-]{1,64}$/.test(version) ? version : '';

// --- Reglages du depot appelant ---------------------------------------------

const social = userConfig.social || {};
CONFIG.social.discord = social.discord || null;
CONFIG.social.reddit = social.reddit || null;
CONFIG.social.buyMeACoffee = userConfig.buymeacoffee || null;
CONFIG.features.debug = Boolean(userConfig.debug);

if (userConfig.mode) CONFIG.mode = String(userConfig.mode);
if (userConfig.projectName) {
    CONFIG.projectName = String(userConfig.projectName);
    CONFIG.projectSubtitle = String(userConfig.projectSubtitle || CONFIG.projectSubtitle);
}
if (userConfig.description) CONFIG.description = String(userConfig.description);
if (userConfig.footerText) CONFIG.footerText = String(userConfig.footerText);

// Un identifiant de theme inconnu est refuse plutot que livre : le moteur
// retomberait sur le premier theme de la liste, ce qui masquerait la faute.
if (userConfig.theme) {
    const known = CONFIG.themes.some(theme => theme.id === userConfig.theme);
    if (known) CONFIG.defaultTheme = userConfig.theme;
    else console.log(`::warning::Theme "${userConfig.theme}" inconnu, theme par defaut conserve.`);
}

// Les drapeaux de fonctionnalites sont fusionnes cle par cle : un depot ne
// declare que ce qu'il change.
for (const [key, value] of Object.entries(userConfig.features || {})) {
    if (key in CONFIG.features) CONFIG.features[key] = value;
    else console.log(`::warning::Drapeau "${key}" inconnu, ignore.`);
}

for (const [key, value] of Object.entries(userConfig.ui || {})) {
    if (key in CONFIG.ui) CONFIG.ui[key] = String(value);
}

if (Array.isArray(userConfig.links?.top)) CONFIG.links.top = userConfig.links.top;
if (Array.isArray(userConfig.links?.bottom)) CONFIG.links.bottom = userConfig.links.bottom;

// --- Ecriture ---------------------------------------------------------------

const banner = `/**\n * Genere par tools/apply-config.mjs. Ne pas modifier a la main :\n`
    + ` * toute retouche est perdue au prochain deploiement.\n`
    + ` * Les reglages d'un depot se declarent dans .github/acidwiki.json.\n */\n`;

writeFileSync(target, `${banner}const CONFIG = ${JSON.stringify(CONFIG, null, 4)};\n\nwindow.CONFIG = CONFIG;\n`, 'utf8');

console.log(`Configuration ecrite : ${target}`);
console.log(`  depot   : ${CONFIG.repo || '(aucun)'}`);
console.log(`  mode    : ${CONFIG.mode}`);
console.log(`  theme   : ${CONFIG.defaultTheme}`);
console.log(`  version : ${CONFIG.versioning.manualVersion || '(aucune)'}`);
