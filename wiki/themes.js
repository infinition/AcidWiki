/**
 * Catalogue des themes. Genere par tools/build-themes.mjs a partir des fichiers
 * de wiki/themes/. Ne pas modifier a la main.
 *
 * Le moteur utilise cette liste quand la configuration ne declare pas de cle
 * "themes". Un deploiement qui veut restreindre le choix declare la sienne.
 */
window.ACIDWIKI_THEMES = [
    {
        "id": "dark",
        "name": "Dark Mode",
        "file": "wiki/themes/dark.css",
        "isDark": true
    },
    {
        "id": "deep-math-academy",
        "name": "Deep Math Academy",
        "file": "wiki/themes/deep-math-academy.css",
        "isDark": true
    },
    {
        "id": "dim",
        "name": "Dim Mode",
        "file": "wiki/themes/light.css",
        "isDark": true
    },
    {
        "id": "electric-blue",
        "name": "Electric Blue",
        "file": "wiki/themes/electric-blue.css",
        "isDark": true
    },
    {
        "id": "cyberpunk",
        "name": "Cyberpunk",
        "file": "wiki/themes/cyberpunk.css",
        "isDark": true
    },
    {
        "id": "dow",
        "name": "Dow",
        "file": "wiki/themes/dow.css",
        "isDark": true
    },
    {
        "id": "forest",
        "name": "Forest",
        "file": "wiki/themes/forest.css",
        "isDark": true
    },
    {
        "id": "monochrome",
        "name": "Monochrome",
        "file": "wiki/themes/monochrome.css",
        "isDark": true
    },
    {
        "id": "retro-hackers",
        "name": "Retro Hackers",
        "file": "wiki/themes/retro-hackers.css",
        "isDark": true
    },
    {
        "id": "retro-hackers-w",
        "name": "Retro Hackers White",
        "file": "wiki/themes/retro-hackers-w.css",
        "isDark": true
    },
    {
        "id": "retro-acid-burn",
        "name": "Retro Acid Burn",
        "file": "wiki/themes/retro-acid-burn.css",
        "isDark": true
    },
    {
        "id": "paper",
        "name": "Paper",
        "file": "wiki/themes/paper.css",
        "isDark": false
    },
    {
        "id": "solarized-light",
        "name": "Solarized Light",
        "file": "wiki/themes/solarized-light.css",
        "isDark": false
    },
    {
        "id": "nord-light",
        "name": "Nord Light",
        "file": "wiki/themes/nord-light.css",
        "isDark": false
    },
    {
        "id": "paper-sepia",
        "name": "Sepia Paper",
        "file": "wiki/themes/paper-sepia.css",
        "isDark": false
    },
    {
        "id": "paper-cool",
        "name": "Cool Paper",
        "file": "wiki/themes/paper-cool.css",
        "isDark": false
    },
    {
        "id": "retro-irc",
        "name": "Retro IRC",
        "file": "wiki/themes/retro-irc.css",
        "isDark": false
    },
    {
        "id": "nature",
        "name": "Nature",
        "file": "wiki/themes/nature.css",
        "isDark": false
    },
    {
        "id": "glassmorphism",
        "name": "Glassmorphism",
        "file": "wiki/themes/glassmorphism.css",
        "isDark": true
    },
    {
        "id": "cg-academy",
        "name": "CG Academy Synthwave",
        "file": "wiki/themes/cg-academy.css",
        "isDark": true
    },
    {
        "id": "science-academy",
        "name": "Science Academy Quantum",
        "file": "wiki/themes/science-academy.css",
        "isDark": true
    },
    {
        "id": "cyber-hackademy",
        "name": "Cyber Hackademy Terminal",
        "file": "wiki/themes/cyber-hackademy.css",
        "isDark": true
    }
];
