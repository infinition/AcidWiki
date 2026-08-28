#!/usr/bin/env node
/**
 * Ecrit wiki/config.js a partir du gabarit du moteur, de acidwiki.json et du
 * contexte du depot.
 *
 * Resout egalement le logo du depot au moment du build (assets, .github, README)
 * et met a jour statiquement index.html et manifest.pwa.json pour eviter tout
 * clignotement ou requete asynchrone au chargement.
 *
 * Utilisation :
 *   node tools/apply-config.mjs --config .github/acidwiki.json \
 *        --target _site/wiki/config.js --repo owner/name --version v1.2.0
 */
import { readFileSync, writeFileSync, copyFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve, extname, basename } from 'node:path';
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
const sourceRoot = resolve(args.root || '.');

// Deduction du dossier de deploiement (_site par defaut si target est dans _site)
let siteDir = args['site-dir'] || '';
if (!siteDir) {
    if (target.startsWith('_site/') || target.startsWith('_site\\') || existsSync('_site')) {
        siteDir = resolve('_site');
    } else {
        siteDir = dirname(resolve(target));
        if (siteDir.endsWith('wiki') || siteDir.endsWith('wiki/') || siteDir.endsWith('wiki\\')) {
            siteDir = dirname(siteDir);
        }
    }
} else {
    siteDir = resolve(siteDir);
}

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

if (userConfig.theme) {
    const known = CONFIG.themes.some(theme => theme.id === userConfig.theme);
    if (known) CONFIG.defaultTheme = userConfig.theme;
    else console.log(`::warning::Theme "${userConfig.theme}" inconnu, theme par defaut conserve.`);
}

for (const [key, value] of Object.entries(userConfig.features || {})) {
    if (key in CONFIG.features) CONFIG.features[key] = value;
    else console.log(`::warning::Drapeau "${key}" inconnu, ignore.`);
}

for (const [key, value] of Object.entries(userConfig.ui || {})) {
    if (key in CONFIG.ui) CONFIG.ui[key] = String(value);
}

if (Array.isArray(userConfig.links?.top)) CONFIG.links.top = userConfig.links.top;
if (Array.isArray(userConfig.links?.bottom)) CONFIG.links.bottom = userConfig.links.bottom;

// --- Resolution automatique du logo au build -------------------------------

const BRANDING_ASSET_DIRS = ['assets', '.github/assets', 'docs/assets', '.github'];
const BRANDING_EXT_RANK = { png: 0, svg: 1, webp: 2, jpg: 3, jpeg: 3, gif: 4, ico: 5 };
const BRANDING_STEM_RANK = ['logo', 'icon', 'appicon', 'favicon', 'applogo'];

function scoreLogoCandidate(filename, rName) {
    const lower = String(filename || '').toLowerCase();
    const dot = lower.lastIndexOf('.');
    if (dot < 1) return null;
    const ext = lower.slice(dot + 1);
    if (!(ext in BRANDING_EXT_RANK)) return null;

    const stem = lower.slice(0, dot).replace(/[\s_.-]+/g, '');
    const repoStem = String(rName || '').toLowerCase().replace(/[\s_.-]+/g, '');

    let stemRank = BRANDING_STEM_RANK.indexOf(stem);
    if (stemRank < 0 && repoStem && stem === repoStem) stemRank = BRANDING_STEM_RANK.length;
    if (stemRank < 0 && BRANDING_STEM_RANK.some(base => stem.startsWith(base))) stemRank = BRANDING_STEM_RANK.length + 1;
    if (stemRank < 0) return null;

    const lastResort = ext === 'ico' ? 1000 : 0;
    return lastResort + stemRank * 10 + BRANDING_EXT_RANK[ext];
}

function isBadgeUrl(url) {
    const u = String(url || '').toLowerCase();
    return u.includes('shields.io') || u.includes('badge.svg') || u.includes('travis-ci')
        || u.includes('/actions/workflows/') || u.includes('codecov.io')
        || u.includes('/workflows/') || u.includes('badgen.net')
        || u.includes('sonarcloud.io') || u.includes('bundlephobia.com')
        || u.includes('david-dm.org') || u.includes('license')
        || u.includes('gitter.im') || u.includes('discord.gg/badge');
}

function detectLogoFromReadme(readmePath) {
    if (!existsSync(readmePath)) return null;
    try {
        const text = readFileSync(readmePath, 'utf8');
        const candidates = [];

        // Recherche Markdown : ![alt](url)
        const mdRegex = /!\[.*?\]\((.*?)\)/g;
        let match;
        while ((match = mdRegex.exec(text)) !== null) {
            let url = match[1].trim();
            url = url.split(/\s+/)[0].replace(/^["']|["']$/g, '');
            if (url && !isBadgeUrl(url)) {
                candidates.push({ index: match.index, url });
            }
        }

        // Recherche HTML : <img ... src="url" ...>
        const htmlRegex = /<img[\s\S]*?src=["'](.*?)["']/gi;
        while ((match = htmlRegex.exec(text)) !== null) {
            const url = match[1].trim();
            if (url && !isBadgeUrl(url)) {
                candidates.push({ index: match.index, url });
            }
        }

        candidates.sort((a, b) => a.index - b.index);
        return candidates.length > 0 ? candidates[0].url : null;
    } catch (_) {
        return null;
    }
}

async function resolveBuildLogo() {
    // 1. Configuration explicite (.github/acidwiki.json)
    const explicitLogo = userConfig.logo || userConfig.logoPath || userConfig.branding?.logo;
    if (explicitLogo) {
        if (/^https?:\/\//i.test(explicitLogo)) return { type: 'remote', url: explicitLogo };
        const localPath = resolve(sourceRoot, explicitLogo);
        if (existsSync(localPath)) return { type: 'file', path: localPath };
    }

    // 2. Fichier fourni explicitement dans wiki/assets/logo.*
    for (const ext of ['.png', '.svg', '.webp', '.jpg', '.jpeg', '.ico']) {
        const p = resolve(sourceRoot, 'wiki', 'assets', `logo${ext}`);
        if (existsSync(p)) return { type: 'file', path: p };
    }

    // 3. Sondage des dossiers d'assets et de la racine .github/
    let best = null;
    for (const dirName of BRANDING_ASSET_DIRS) {
        const dirPath = resolve(sourceRoot, dirName);
        if (!existsSync(dirPath) || !statSync(dirPath).isDirectory()) continue;

        try {
            const entries = readdirSync(dirPath);
            for (const entry of entries) {
                const entryPath = join(dirPath, entry);
                if (!statSync(entryPath).isFile()) continue;
                const score = scoreLogoCandidate(entry, repoName);
                if (score === null) continue;
                if (!best || score < best.score) {
                    best = { score, path: entryPath };
                }
            }
        } catch (_) {}
    }
    if (best) return { type: 'file', path: best.path };

    // 4. Extraction depuis README.md
    for (const rmName of ['README.md', 'readme.md', 'Readme.md', 'docs/README.md', 'wiki/README.md']) {
        const rmPath = resolve(sourceRoot, rmName);
        const logoUrl = detectLogoFromReadme(rmPath);
        if (logoUrl) {
            if (/^https?:\/\//i.test(logoUrl)) {
                return { type: 'remote', url: logoUrl };
            }
            const clean = logoUrl.replace(/^\.\//, '');
            const localFromReadme = resolve(sourceRoot, clean);
            if (existsSync(localFromReadme)) {
                return { type: 'file', path: localFromReadme };
            }
        }
    }

    return { type: 'fallback' };
}

// Application du logo detecte au dossier de sortie
const siteAssetsDir = join(siteDir, 'wiki', 'assets');
if (!existsSync(siteAssetsDir)) {
    mkdirSync(siteAssetsDir, { recursive: true });
}

// Sauvegarde du fallback AcidWiki d'origine
const fallbackPath = join(siteAssetsDir, 'logo-fallback.png');
const defaultLogoPath = join(siteAssetsDir, 'logo.png');
if (existsSync(defaultLogoPath) && !existsSync(fallbackPath)) {
    copyFileSync(defaultLogoPath, fallbackPath);
}

const resolvedLogo = await resolveBuildLogo();
let finalLogoPath = 'wiki/assets/logo.png';
let finalMimeType = 'image/png';

if (resolvedLogo.type === 'file') {
    const ext = extname(resolvedLogo.path).toLowerCase() || '.png';
    const destFile = join(siteAssetsDir, `logo${ext}`);
    copyFileSync(resolvedLogo.path, destFile);
    finalLogoPath = `wiki/assets/logo${ext}`;
    if (ext === '.svg') finalMimeType = 'image/svg+xml';
    else if (ext === '.webp') finalMimeType = 'image/webp';
    else if (ext === '.ico') finalMimeType = 'image/x-icon';
    else if (ext === '.jpg' || ext === '.jpeg') finalMimeType = 'image/jpeg';
    console.log(`Logo detecte et copie : ${resolvedLogo.path} -> ${finalLogoPath}`);
} else if (resolvedLogo.type === 'remote') {
    let downloaded = false;
    if (typeof fetch === 'function') {
        try {
            console.log(`Telechargement du logo distant : ${resolvedLogo.url}`);
            const res = await fetch(resolvedLogo.url, { headers: { 'User-Agent': 'AcidWiki-Build' } });
            if (res.ok) {
                const arrayBuf = await res.arrayBuffer();
                const buffer = Buffer.from(arrayBuf);
                if (buffer.length > 0) {
                    const cType = res.headers.get('content-type') || '';
                    let ext = '.png';
                    if (cType.includes('svg')) ext = '.svg';
                    else if (cType.includes('webp')) ext = '.webp';
                    else if (cType.includes('jpeg') || cType.includes('jpg')) ext = '.jpg';
                    else if (cType.includes('icon') || cType.includes('ico')) ext = '.ico';
                    else {
                        const parsedExt = extname(resolvedLogo.url.split('?')[0]).toLowerCase();
                        if (parsedExt) ext = parsedExt;
                    }
                    const destFile = join(siteAssetsDir, `logo${ext}`);
                    writeFileSync(destFile, buffer);
                    finalLogoPath = `wiki/assets/logo${ext}`;
                    if (ext === '.svg') finalMimeType = 'image/svg+xml';
                    else if (ext === '.webp') finalMimeType = 'image/webp';
                    else if (ext === '.ico') finalMimeType = 'image/x-icon';
                    else if (ext === '.jpg' || ext === '.jpeg') finalMimeType = 'image/jpeg';
                    downloaded = true;
                    console.log(`Logo distant integre localement : ${finalLogoPath}`);
                }
            }
        } catch (err) {
            console.log(`Echec du telechargement distant (${err.message}), conservation de l'URL brute.`);
        }
    }
    if (!downloaded) {
        finalLogoPath = resolvedLogo.url;
    }
} else {
    console.log('Aucun logo specifique detecte, conservation du logo AcidWiki par defaut.');
}

CONFIG.logoPath = finalLogoPath;
CONFIG.logoPlaceholder = 'wiki/assets/logo-fallback.png';

// --- Mise a jour statique de index.html --------------------------------------

const htmlPath = join(siteDir, 'index.html');
if (existsSync(htmlPath)) {
    let html = readFileSync(htmlPath, 'utf8');

    // Balises de titre et de description
    html = html.replace(/<title id="site-title">[\s\S]*?<\/title>/i, `<title id="site-title">${CONFIG.projectName} // ${CONFIG.projectSubtitle}</title>`);
    html = html.replace(/<meta name="description" id="meta-description" content="[^"]*">/i, `<meta name="description" id="meta-description" content="${CONFIG.description}">`);

    // Meta OpenGraph et Twitter
    html = html.replace(/<meta property="og:title" id="og-title" content="[^"]*">/i, `<meta property="og:title" id="og-title" content="${CONFIG.projectName}">`);
    html = html.replace(/<meta property="og:description" id="og-desc" content="[^"]*">/i, `<meta property="og:description" id="og-desc" content="${CONFIG.description}">`);
    html = html.replace(/<meta property="og:image" id="og-image" content="[^"]*">/i, `<meta property="og:image" id="og-image" content="${finalLogoPath}">`);

    html = html.replace(/<meta property="twitter:title" id="tw-title" content="[^"]*">/i, `<meta property="twitter:title" id="tw-title" content="${CONFIG.projectName}">`);
    html = html.replace(/<meta property="twitter:description" id="tw-desc" content="[^"]*">/i, `<meta property="twitter:description" id="tw-desc" content="${CONFIG.description}">`);
    html = html.replace(/<meta property="twitter:image" id="tw-image" content="[^"]*">/i, `<meta property="twitter:image" id="tw-image" content="${finalLogoPath}">`);

    // Favicon et Apple Touch Icon
    html = html.replace(/<link rel="icon" id="favicon-32"[^>]*>/i, `<link rel="icon" id="favicon-32" type="${finalMimeType}" sizes="32x32" href="${finalLogoPath}">`);
    html = html.replace(/<link rel="icon" id="favicon-16"[^>]*>/i, `<link rel="icon" id="favicon-16" type="${finalMimeType}" sizes="16x16" href="${finalLogoPath}">`);
    html = html.replace(/<link rel="apple-touch-icon" id="apple-icon"[^>]*>/i, `<link rel="apple-touch-icon" id="apple-icon" sizes="180x180" href="${finalLogoPath}">`);

    // Images de logo dans le corps de page
    html = html.replace(/id="sidebar-logo" src="[^"]*"/i, `id="sidebar-logo" src="${finalLogoPath}"`);
    html = html.replace(/id="mobile-logo" src="[^"]*"/i, `id="mobile-logo" src="${finalLogoPath}"`);

    // Noms de projet dans la navigation
    html = html.replace(/<h1 id="sidebar-project-name"[^>]*>[\s\S]*?<\/h1>/i, `<h1 id="sidebar-project-name" class="font-bold text-hack-heading leading-none text-lg">${CONFIG.projectName}</h1>`);
    html = html.replace(/<span id="mobile-project-name"[^>]*>[\s\S]*?<\/span>/i, `<span id="mobile-project-name" class="font-bold text-hack-heading text-sm">${CONFIG.projectName}</span>`);

    writeFileSync(htmlPath, html, 'utf8');
    console.log(`index.html mis a jour statiquement : ${htmlPath}`);
}

// --- Mise a jour statique de manifest.pwa.json ------------------------------

const manifestPath = join(siteDir, 'wiki', 'manifest.pwa.json');
if (existsSync(manifestPath)) {
    try {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
        manifest.name = `${CONFIG.projectName} WIKI`;
        manifest.short_name = CONFIG.projectName;
        if (Array.isArray(manifest.icons)) {
            manifest.icons.forEach(ic => { ic.src = finalLogoPath; });
        }
        if (Array.isArray(manifest.shortcuts)) {
            manifest.shortcuts.forEach(sc => {
                if (Array.isArray(sc.icons)) {
                    sc.icons.forEach(ic => { ic.src = finalLogoPath; });
                }
            });
        }
        writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
        console.log(`manifest.pwa.json mis a jour : ${manifestPath}`);
    } catch (err) {
        console.log(`Avertissement mise a jour manifest.pwa.json : ${err.message}`);
    }
}

// --- Ecriture de la configuration -------------------------------------------

const banner = `/**\n * Genere par tools/apply-config.mjs. Ne pas modifier a la main :\n`
    + ` * toute retouche est perdue au prochain deploiement.\n`
    + ` * Les reglages d'un depot se declarent dans .github/acidwiki.json.\n */\n`;

writeFileSync(target, `${banner}const CONFIG = ${JSON.stringify(CONFIG, null, 4)};\n\nwindow.CONFIG = CONFIG;\n`, 'utf8');

console.log(`Configuration ecrite : ${target}`);
console.log(`  depot   : ${CONFIG.repo || '(aucun)'}`);
console.log(`  mode    : ${CONFIG.mode}`);
console.log(`  logo    : ${CONFIG.logoPath}`);
console.log(`  theme   : ${CONFIG.defaultTheme}`);
console.log(`  version : ${CONFIG.versioning.manualVersion || '(aucune)'}`);
