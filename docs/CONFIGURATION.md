# Configuration

Everything is declared in a single file: `.github/acidwiki.json` for a GitHub
repository, `wiki/config.js` for local use. No JavaScript to write.

## Operating modes

A wiki can be served in four ways. The mode is picked with the `mode` key.

| `mode` | Content discovery | Use it for |
|---|---|---|
| `auto` (default) | static index when present, otherwise legacy detection | deciding nothing |
| `github` | GitHub API (tree, releases, dates) | GitHub Pages, public repository |
| `local` | server directory listings | `python -m http.server`, `tools/serve.py` |
| `vault` | alias of `local` | Obsidian vault |
| `static` | `wiki/index.json` only | offline, intranet, no third party call |

`auto` reproduces the previous behaviour exactly, plus reading the static index
when it exists. An existing repository has nothing to change.

> [!TIP]
> Prefer `static` as soon as the content passes a few dozen pages. Without an
> index, every visitor queries the GitHub API once for the tree and once per page
> for the last edit date, against a limit of sixty requests per hour per address.

## Keys of `.github/acidwiki.json`

```json
{
  "mode": "auto",
  "theme": "dark",
  "debug": false,
  "social": {
    "discord": "https://discord.gg/xxxx",
    "reddit": "https://reddit.com/r/xxxx"
  },
  "buymeacoffee": "https://buymeacoffee.com/xxxx",
  "projectName": "My Project",
  "description": "Documentation for My Project",
  "footerText": "© 2026 My Project",
  "features": {
    "sortMode": "name",
    "readingProgress": true,
    "showChangelog": true,
    "autoCollapseSidebar": false
  },
  "ui": {
    "breadcrumbRoot": "wiki",
    "searchPlaceholder": "Search (Ctrl+K)..."
  }
}
```

Every key is optional. A missing key keeps its default, an unknown flag is
reported in the build log without stopping the deployment. An unknown theme id
is rejected and the default theme is kept, rather than shipping a wiki with no
stylesheet.

Project name, version, repository URL and copyright year are derived from the
repository when they are not declared.

## Theme catalog

The theme list is generated from the stylesheets actually present in
`wiki/themes/`:

```bash
node tools/build-themes.mjs
```

The engine serves that catalog whenever the configuration declares no `themes`
key, so every deployment gets the full set. Declaring `themes` in your own
configuration deliberately restricts the choice and takes over, at the cost of
maintaining that list by hand on every theme added to the engine.

## `features` flags

| Key | Default | Effect |
|---|---|---|
| `sortMode` | `"name"` | navigation order: `name` (natural sort) or `date` (most recent first, requires a static index) |
| `readingProgress` | `true` | reading progress bar at the top of the page |
| `showChangelog` | `true` | GitHub releases page, hidden without a configured repository |
| `showSearch` | `true` | full text search |
| `showSocialBadges` | `true` | Discord, Reddit and GitHub badges |
| `showThemeToggle` | `true` | theme picker |
| `pageTransitions` | `true` | transitions between pages |
| `autoCollapseSidebar` | `false` | keep only one section open at a time |
| `stickyBreadcrumbs` | `true` | breadcrumbs pinned to the top |
| `showRootReadme` | `true` | repository README as the home page |
| `groupRootFiles` | `false` | group root markdown files under a collapsible section; at `false` they sit directly at the top of the navigation |
| `themeHoverPreview` | `true` | preview a theme by hovering its name in the picker |
| `searchIndexConcurrency` | `8` | concurrent requests while indexing |
| `debug` | `false` | verbose console logging |

## Theme preview

Hovering a theme name in the picker applies it to the page immediately. Leaving
the list or closing the menu restores the current theme, only a click commits
the change.

The stylesheet is requested at hover time only: opening the menu downloads
nothing, and a theme never hovered is never loaded. A short delay before
applying avoids chaining downloads when the pointer merely crosses the list. The
keyboard triggers the same preview as focus moves.

Controlled by `features.themeHoverPreview`.

## Expand and collapse

The button next to the search field opens or closes every section at once. Its
icon and label announce the action to come and follow the real state of the
navigation, including when a section was opened by navigating rather than by the
button.

`Escape` clears the search highlights, after closing the search dialog and the
lightbox, which keep priority.

## Static index

```bash
node tools/build-index.mjs
```

Produces `wiki/index.json` (tree, root files, modification dates, neighbouring
quizzes) and `wiki/index-links.json` (vault link resolution table). The second
one is downloaded only by pages that actually contain a `[[...]]` link.

Options: `--root <folder>`, `--content <subfolder>`, `--out <file>`.

The GitHub workflow builds it on every deployment. For a local vault,
`python tools/serve.py --build` does the same, and the running server
regenerates it on its own.

## Local server

```bash
python tools/serve.py --vault "path/to/the/vault"
```

A single engine serves as many vaults as you like. The port is derived from the
vault name, or forced with `--port`.

| Option | Effect |
|---|---|
| `--vault` | content folder (default: current directory) |
| `--self` | serve the engine repository itself, from any directory |
| `--port` | listening port |
| `--no-browser` | do not open the browser |
| `--build [folder]` | write the index and quit |
| `--legacy-translate` | translate Obsidian syntax server side (previous behaviour) |

By default the server sends raw markdown and the engine applies the same
translation as on GitHub Pages: local and published rendering are identical.
`--legacy-translate` restores server side translation if needed.

`--self` anchors on the engine location instead of the current directory, and
listens on a separate port so it can run alongside an open vault. On Windows,
`acidwiki.bat` does exactly that in one double click.

## Updating a local deployment

```bash
node tools/sync-engine.mjs --target "path/to/the/deployment" --dry-run
```

Copies the engine over an existing deployment while preserving what belongs to
it: `wiki/config.js`, `wiki/assets`, and the index files. What belongs to the
engine is derived from `index.html` itself, so a resource added to the engine is
carried over without editing any list.

`--check` verifies the engine on its own, without a deployment, and reports any
resource the document asks for but that is missing from the repository.
