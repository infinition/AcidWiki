#!/usr/bin/env node
/**
 * Construit wiki/themes.js, le catalogue des themes, a partir des fichiers
 * reellement presents dans wiki/themes/.
 *
 * La liste vivait a la main dans chaque config.js. Elle derivait donc d'un
 * deploiement a l'autre : le moteur en exposait vingt-deux, le portail des
 * academies onze, et ajouter un theme demandait de modifier chaque copie. Ici
 * le catalogue est deduit des fichiers, ecrit une fois, et recopie tel quel dans
 * chaque deploiement par sync-engine. Un theme ajoute apparait partout.
 *
 * Le caractere clair ou sombre est lu dans la feuille elle-meme (--bg-body),
 * pas declare a la main : un nouveau theme est classe correctement sans rien
 * ecrire nulle part.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const themesDir = join(root, 'wiki', 'themes');
const outFile = join(root, 'wiki', 'themes.js');

// Identifiants et libelles historiques. L'identifiant sert de cle de stockage du
// choix du visiteur : le changer reinitialiserait la preference de tout le monde,
// d'ou "dim" conserve pour light.css malgre le nom du fichier.
const KNOWN = {
    'dark.css': { id: 'dark', name: 'Dark Mode' },
    'deep-math-academy.css': { id: 'deep-math-academy', name: 'Deep Math Academy' },
    'light.css': { id: 'dim', name: 'Dim Mode' },
    'electric-blue.css': { id: 'electric-blue', name: 'Electric Blue' },
    'cyberpunk.css': { id: 'cyberpunk', name: 'Cyberpunk' },
    'dow.css': { id: 'dow', name: 'Dow' },
    'forest.css': { id: 'forest', name: 'Forest' },
    'monochrome.css': { id: 'monochrome', name: 'Monochrome' },
    'retro-hackers.css': { id: 'retro-hackers', name: 'Retro Hackers' },
    'retro-hackers-w.css': { id: 'retro-hackers-w', name: 'Retro Hackers White' },
    'retro-acid-burn.css': { id: 'retro-acid-burn', name: 'Retro Acid Burn' },
    'paper.css': { id: 'paper', name: 'Paper' },
    'solarized-light.css': { id: 'solarized-light', name: 'Solarized Light' },
    'nord-light.css': { id: 'nord-light', name: 'Nord Light' },
    'paper-sepia.css': { id: 'paper-sepia', name: 'Sepia Paper' },
    'paper-cool.css': { id: 'paper-cool', name: 'Cool Paper' },
    'retro-irc.css': { id: 'retro-irc', name: 'Retro IRC' },
    'nature.css': { id: 'nature', name: 'Nature' },
    'glassmorphism.css': { id: 'glassmorphism', name: 'Glassmorphism' },
    'cg-academy.css': { id: 'cg-academy', name: 'CG Academy Synthwave' },
    'science-academy.css': { id: 'science-academy', name: 'Science Academy Quantum' },
    'cyber-hackademy.css': { id: 'cyber-hackademy', name: 'Cyber Hackademy Terminal' }
};

// Ordre d'affichage voulu. Un fichier absent de cette liste est ajoute a la fin,
// donc un nouveau theme apparait sans toucher a ce tableau.
const ORDER = Object.keys(KNOWN);

function prettyName(file) {
    return basename(file, '.css')
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

/** Luminance perceptuelle d'une couleur CSS, ou null si elle n'est pas lisible. */
function luminance(value) {
    if (!value) return null;
    const raw = value.trim();

    // transparent ne dit rien du rendu : le theme laisse voir ce qu'il y a derriere.
    if (/^transparent$/i.test(raw)) return null;

    let r;
    let g;
    let b;

    const hex = raw.match(/^#([0-9a-f]{3,8})$/i);
    if (hex) {
        let digits = hex[1];
        if (digits.length === 3 || digits.length === 4) digits = [...digits.slice(0, 3)].map(c => c + c).join('');
        const packed = parseInt(digits.slice(0, 6), 16);
        r = (packed >> 16) & 255;
        g = (packed >> 8) & 255;
        b = packed & 255;
    } else {
        const rgb = raw.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i);
        if (!rgb) return null;
        [, r, g, b] = rgb.map(Number);
    }

    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Un theme est sombre quand son fond l'est. Le fond de page peut valoir
 * transparent, cas des themes qui laissent voir le canevas anime : on retombe
 * alors sur le fond du bandeau lateral, qui est toujours opaque.
 */
function isDarkTheme(css, file) {
    for (const variable of ['--bg-body', '--bg-sidebar']) {
        const match = css.match(new RegExp(`${variable}\\s*:\\s*([^;]+);`, 'i'));
        const value = luminance(match && match[1]);
        if (value !== null) return value < 0.5;
    }

    console.log(`  ${file} : aucun fond lisible, classe comme sombre`);
    return true;
}

const files = readdirSync(themesDir).filter(name => name.endsWith('.css'));
const ordered = [
    ...ORDER.filter(name => files.includes(name)),
    ...files.filter(name => !ORDER.includes(name)).sort()
];

const themes = ordered.map(file => {
    const css = readFileSync(join(themesDir, file), 'utf8');
    const known = KNOWN[file];
    return {
        id: known ? known.id : basename(file, '.css'),
        name: known ? known.name : prettyName(file),
        file: `wiki/themes/${file}`,
        isDark: isDarkTheme(css, file)
    };
});

const missing = ORDER.filter(name => !files.includes(name));
if (missing.length) console.log(`  Declares sans fichier, ignores : ${missing.join(', ')}`);

const body = `/**
 * Catalogue des themes. Genere par tools/build-themes.mjs a partir des fichiers
 * de wiki/themes/. Ne pas modifier a la main.
 *
 * Le moteur utilise cette liste quand la configuration ne declare pas de cle
 * "themes". Un deploiement qui veut restreindre le choix declare la sienne.
 */
window.ACIDWIKI_THEMES = ${JSON.stringify(themes, null, 4)};
`;

writeFileSync(outFile, body, 'utf8');

const dark = themes.filter(theme => theme.isDark).length;
console.log(`Catalogue ecrit : ${outFile}`);
console.log(`  ${themes.length} themes (${dark} sombres, ${themes.length - dark} clairs)`);
