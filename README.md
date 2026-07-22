<img width="128" height="128" alt="AcidWiki" src="https://github.com/user-attachments/assets/4b9aba15-5567-4726-a193-7b6fd138b459" />

# AcidWiki

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black) [![Release](https://img.shields.io/github/v/release/infinition/AcidWiki?style=flat)](https://github.com/infinition/AcidWiki/releases) [![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=flat&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/infinition)

A self-updating wiki engine for GitHub repositories. Deploy once, forget it. Content goes into Markdown files, the engine handles navigation, versioning, and daily updates automatically.

![AcidWiki](https://github.com/user-attachments/assets/6851a18b-ec2b-4a10-8118-170b100cfdc7)

The core logic lives in this repository. Client repositories reference AcidWiki via a reusable GitHub Actions workflow and get updates pulled in every day at 4 AM without any manual intervention.

---

## Features

- Centralized engine: client repos stay thin, logic stays here.
- Configuration via `acidwiki.json` only, no JavaScript required.
- Auto-discovery of docs via GitHub API — add a Markdown file, it appears in the nav.
- Detects GitHub Releases or Tags automatically for version display.
- Project name, copyright year, and GitHub links injected at build time.
- Daily CRON update: checks for engine changes and self-patches.
- Dark mode, responsive layout, smooth transitions.
- Native Mermaid diagrams, centered on a fully transparent canvas.
- Deep Math Academy theme with an animated particle background.
- Natural folder sorting, stable folder icons, and Index/README-first breadcrumbs.
- Scrollable, self-following table of contents for long chapters.

---

## Quick Start

### Method A: Template (new project)

1. Click "Use this template" to create a new repository.
2. Go to Settings > Actions > General. Under "Workflow permissions", select "Read and write permissions".
3. Push any change. The workflow creates `wiki/docs/` and a default `acidwiki.json`.
4. Go to Settings > Pages, set source to "Deploy from a branch" > main > /(root).

### Method B: Existing project

Create `.github/workflows/wiki-sync.yml` in your repository:

```yaml
name: Wiki Sync

on:
  push:
    branches: [ main ]
    paths:
      - 'wiki/**'
      - 'acidwiki.json'
  schedule:
    - cron: '0 4 * * *'
  workflow_dispatch:

jobs:
  sync:
    uses: infinition/AcidWiki/.github/workflows/wiki-engine.yml@main
    secrets: inherit
```

---

## Configuration (`acidwiki.json`)

```json
{
  "social": {
    "discord": "https://discord.gg/yourserver",
    "reddit": "https://reddit.com/r/yoursubreddit"
  },
  "buymeacoffee": "https://buymeacoffee.com/yourname",
  "debug": false
}
```

- `social.discord` / `social.reddit`: set to `null` to hide the buttons.
- `buymeacoffee`: your donation link.
- `debug`: verbose browser console logging.

Project name, version, GitHub URL, and footer copyright are detected automatically from repository context.

---

## Logo

Priority order for logo and favicon:

1. `wiki/assets/logo.png` if it exists.
2. First image found in `README.md`.
3. Default AcidWiki logo.

Use a square transparent PNG for best results.

---

## Folder structure

```
.
  .github/workflows/
    wiki-sync.yml         Trigger (calls AcidWiki logic)
  acidwiki.json           Your configuration
  wiki/
    docs/                 Put your Markdown files here
      01_Intro/           Folders become categories
        Setup.md
      Guide.md
    assets/               Images (logo.png, screenshots)
    config.js             Generated — do not edit manually
  index.html              The engine (auto-updated from source)
  README.md               Becomes the home page
```

---

## Writing content

- Create `.md` files inside `wiki/docs/`.
- Folders become menu categories, files become pages.
- Prefix names with numbers to control order: `01_General`, `02_Advanced`.
- Link images: `![](../assets/image.png)`.
- Add Mermaid diagrams with a fenced `mermaid` code block.

---

## How updates work

- On push: site rebuilds immediately with your config.
- On schedule: checks for engine changes in `infinition/AcidWiki`, pulls the new `index.html`, regenerates config, commits and pushes automatically.

---

## Local development

The engine uses the GitHub API in production. Locally it falls back to a filesystem scan.

```bash
python -m http.server 8000
```

Open `http://localhost:8000`. Markdown files inside `wiki/docs/` are discovered automatically. Root Markdown files can be listed in `CONFIG.localRootMarkdown` for a fully offline preview; production discovers them through the GitHub API.

`AcidWiki-Feature-Test.md` is a ready-made visual test page for Mermaid, KaTeX, tables, code, the animated theme, and long tables of contents.

---

## Star History

<a href="https://www.star-history.com/?repos=infinition%2FAcidWiki&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=infinition/AcidWiki&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=infinition/AcidWiki&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=infinition/AcidWiki&type=date&legend=top-left" />
 </picture>
</a>

---

## License

MIT. See [LICENSE](LICENSE).
