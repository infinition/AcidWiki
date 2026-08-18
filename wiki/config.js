/**
 * AcidWiki Configuration (Master Template)
 * Ce fichier est écrasé dynamiquement par le workflow GitHub Actions.
 * Ne modifiez pas les valeurs ici pour un projet spécifique, utilisez acidwiki.json.
 */
const CONFIG = {
    // Project Information (Sera remplacé par le nom du Repo)
    projectName: "ACIDWIKI",
    projectSubtitle: "ACIDWIKI WIKI",
    description: "Official Documentation and Wiki for AcidWiki",

    // Versioning Settings
    versioning: {
        type: "local",
        manualVersion: "v1.0.0",
        manualDate: "2026-02-26"
    },

    // GitHub Repository
    repo: "infinition/AcidWiki",
    branch: "main",

    // Theme Settings
    themes: [
        { id: "dark", name: "Dark Mode", file: "wiki/themes/dark.css", isDark: true },
        { id: "deep-math-academy", name: "Deep Math Academy", file: "wiki/themes/deep-math-academy.css", isDark: true },
        { id: "dim", name: "Dim Mode", file: "wiki/themes/light.css", isDark: true },
        { id: "electric-blue", name: "Electric Blue", file: "wiki/themes/electric-blue.css", isDark: true },
        { id: "cyberpunk", name: "Cyberpunk", file: "wiki/themes/cyberpunk.css", isDark: true },
        { id: "dow", name: "Dow", file: "wiki/themes/dow.css", isDark: true },
        { id: "forest", name: "Forest", file: "wiki/themes/forest.css", isDark: true },
        { id: "monochrome", name: "Monochrome", file: "wiki/themes/monochrome.css", isDark: true },
        { id: "retro-hackers", name: "Retro Hackers", file: "wiki/themes/retro-hackers.css", isDark: true },
        { id: "retro-hackers-w", name: "Retro Hackers White", file: "wiki/themes/retro-hackers-w.css", isDark: false },
        { id: "retro-acid-burn", name: "Retro Acid Burn", file: "wiki/themes/retro-acid-burn.css", isDark: true },
        { id: "paper", name: "Paper", file: "wiki/themes/paper.css", isDark: false },
        { id: "solarized-light", name: "Solarized Light", file: "wiki/themes/solarized-light.css", isDark: false },
        { id: "nord-light", name: "Nord Light", file: "wiki/themes/nord-light.css", isDark: false },
        { id: "paper-sepia", name: "Sepia Paper", file: "wiki/themes/paper-sepia.css", isDark: false },
        { id: "paper-cool", name: "Cool Paper", file: "wiki/themes/paper-cool.css", isDark: false },
        { id: "retro-irc", name: "Retro IRC", file: "wiki/themes/retro-irc.css", isDark: false },
        { id: "nature", name: "Nature", file: "wiki/themes/nature.css", isDark: false },
        { id: "glassmorphism", name: "Glassmorphism", file: "wiki/themes/glassmorphism.css", isDark: true },
        { id: "cg-academy", name: "CG Academy Synthwave", file: "wiki/themes/cg-academy.css", isDark: true },
        { id: "cyber-hackademy", name: "Cyber Hackademy Terminal", file: "wiki/themes/cyber-hackademy.css", isDark: true },
        { id: "science-academy", name: "Science Academy Quantum", file: "wiki/themes/science-academy.css", isDark: true }
    ],
    // Ecrase par la cle "theme" de .github/acidwiki.json quand le repo en definit une.
    // Sert uniquement de premiere visite : le choix du visiteur est ensuite memorise
    // par repo dans localStorage.
    defaultTheme: "dark",

    // Root Markdown files to expose during a local static-server preview.
    // GitHub Pages discovers root files automatically through the repository API.
    localRootMarkdown: ["README.md", "AcidWiki-Feature-Test.md"],

    // Feature Toggles
    features: {
        showChangelog: true,
        showSearch: true,
        showSocialBadges: true,
        showThemeToggle: true,
        pageTransitions: true,
        autoCollapseSidebar: false,
        stickyBreadcrumbs: true,
        showRootReadme: true,
        searchIndexConcurrency: 8,
        allowIframes: false,
        debug: true
    },

    // Custom Navigation Links (Vides par défaut)
    links: {
        top: [],
        bottom: []
    },

    // Footer
    footerText: "© 2026 ACIDWIKI WIKI - All rights reserved",

    // UI Strings
    ui: {
        joinUsTitle: ":: JOIN US ::",
        onThisPageTitle: "On this page",
        changelogTitle: "Changelog",
        rootReadmeTitle: "Project Home",
        searchPlaceholder: "Search (Ctrl+K)...",
        lastUpdatedText: "Updated",
        readingTimePrefix: "~",
        readingTimeSuffix: "min read",
        noResultsText: "No results found.",
        noSectionsText: "No sections",
        fetchingReleasesText: "Fetching GitHub releases...",
        checkingVersionText: "checking...",
        initializingText: "Initializing...",
        indexingSearchText: "Indexing documents",
        themeChangedText: "Theme changed to: ",
        menuText: "Menu",
        onThisPageMobile: "On this page"
    },

    // Logo Settings
    // Chaine de resolution du logo, dans l'ordre : wiki/assets/logo.png fourni par
    // le repo, puis la premiere image de son README, puis ce placeholder. Le workflow
    // renomme le logo AcidWiki en logo-fallback.png quand le repo n'en fournit pas,
    // pour que l'etape README soit reellement atteinte.
    logoPath: "wiki/assets/logo.png",
    logoPlaceholder: "wiki/assets/logo-fallback.png",

    // PWA & SEO Settings
    themeColor: "#0B0C0E",
    accentColor: "#22c55e",
    manifestPath: "wiki/manifest.pwa.json",

    // Social Links
    social: {
        discord: null,
        reddit: null,
        github: "https://github.com/infinition/AcidWiki", // Virgule respectée par le script
        buyMeACoffee: "https://buymeacoffee.com/infinition"
    },

    // Badge Labels
    badges: {
        discordLabel: "COMMUNITY",
        redditLabel: "REDDIT",
        githubLabel: "ACIDWIKI"
    }
};

// Le moteur charge ce fichier en script classique : un `const` de premier niveau
// ne remonte pas sur window. Les modules externes (enhancements.js, providers)
// lisent window.CONFIG, cet export est donc obligatoire.
window.CONFIG = CONFIG;
