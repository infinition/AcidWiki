# 🚀 AcidWiki - Dynamic GitHub Wiki Template

AcidWiki is a modern, high-performance, and fully automated wiki template designed for GitHub repositories. It automatically configures itself and generates its own structure based on your files.

## ✨ Features

- **Fully Automated**: GitHub Actions handle the configuration and structure generation.
- **Dynamic Discovery**: Your wiki automatically scans `wiki/docs/` and builds the navigation menu.
- **Dynamic Home Page**: Your root `README.md` is automatically used as the wiki's home page.
- **Centralized Updates**: Core engine files (`index.html`) are automatically kept in sync with the source repository.
- **Auto-Configuration**: Repository name, links, and settings are automatically detected and configured.
- **Modern UI**: Dark mode, glassmorphism, smooth transitions, and responsive design.
- **Search & TOC**: Built-in search (Ctrl+K) and automatic Table of Contents.
- **PWA Ready**: Works offline and can be installed as an app.

## 🛠️ Quick Start

### Method A: Use this Template (Recommended)
1. Click the \"Use this template\" button on GitHub to create a new repository.
2. **Enable GitHub Pages**: Go to `Settings > Pages`, set source to **Deploy from a branch**, branch to **main**, and folder to **/(root)**.
3. **Add your content**: Create `.md` files in `wiki/docs/`.
4. **Push**: The wiki will automatically configure itself and detect your files!

### Method B: One-File Setup (For existing repos)
1. In your existing repository, create the file `.github/workflows/wiki-sync.yml`.
2. Copy the content of the workflow from [here](https://raw.githubusercontent.com/infinition/AcidWiki/main/.github/workflows/wiki-sync.yml).
3. **Push**: The action will automatically download the entire wiki engine, create the `wiki/docs/` folder, and configure everything!
4. Add your `.md` files to the newly created `wiki/docs/` folder.

## 📂 Folder Structure

```text
.
├── .github/workflows/wiki-sync.yml  # The automation engine
├── wiki/                            # All wiki assets and configuration
│   ├── docs/                        # Your documentation files (auto-discovered)
│   │   ├── 01_Getting_Started/      # Folders become categories
│   │   │   └── Installation.md      # Files become pages
│   │   └── 02_Advanced/
│   │       └── Configuration.md
│   ├── config.js                    # Wiki configuration (auto-updated)
│   ├── themes/                      # Available themes
│   └── assets/                      # Images and resources
├── index.html                       # The wiki engine
└── README.md                        # Your Home Page
```

## 🔄 How It Works

AcidWiki uses a **dual discovery system** to automatically detect and build your wiki structure:

### Production (GitHub Pages)
1. **GitHub API Discovery**: The wiki queries the GitHub API to scan your `wiki/docs/` folder
2. **Automatic Navigation**: Builds the sidebar menu based on your folder structure
3. **Zero Configuration**: No manual file lists needed

### Local Development
1. **HTTP Server Parsing**: When running locally (e.g., `python -m http.server`), the wiki parses directory listings
2. **Recursive Scanning**: Automatically discovers all nested folders and markdown files
3. **Real-time Updates**: Just refresh the page to see new files

### Auto-Configuration
- The GitHub Action automatically updates `wiki/config.js` with your repository name and links
- **No manual setup required**: Just add `.md` files to `wiki/docs/`, and they appear instantly

> **Note**: For local development, you must use an HTTP server (like `python -m http.server` or VS Code Live Server). The `file://` protocol won't work due to browser security restrictions.

## ⚙️ Configuration

While most things are automatic, you can customize `wiki/config.js` for:
- **Project Info**: The GitHub Action updates this automatically, but you can override it.
- **Themes**: Choose from 15+ built-in themes.
- **Social Links**: Add your Discord, Reddit, or GitHub links.
- **Features**: Toggle search, changelog, or transitions.


## 🧪 Local Development

To test your wiki locally before pushing to GitHub:

```bash
# Navigate to your repository
cd your-repo

# Start a local HTTP server (Python 3)
python -m http.server 8000

# Or use Python 2
python -m SimpleHTTPServer 8000

# Open http://localhost:8000 in your browser
```

The wiki will automatically scan and discover all your `.md` files in `wiki/docs/`. Changes will be visible after refreshing the page.

> **Alternative**: Use VS Code Live Server extension for automatic reload on file changes.

## 📝 Writing Content

- Use standard Markdown (`.md`) or MDX (`.mdx`).
- Folders in `wiki/docs/` are automatically detected and sorted alphabetically.
- You can prefix them with numbers (e.g., `01_Intro`) to control order.
- Images should be placed in `wiki/assets/` and linked relatively.

## 🔄 Centralized Updates

This template features a centralized update mechanism. Every time the `Wiki Sync` action runs:
1. It checks for updates to the core engine (`index.html`) from the source repository defined in `wiki/config.js`.
2. It automatically updates `wiki/config.js` with your repository information.

To disable this or change the source:
1. Open `wiki/config.js`.
2. Modify the `repo` and `branch` settings.
3. If you want to stop automatic updates, you can remove the \"Sync Core Files from Source\" step in `.github/workflows/wiki-sync.yml`.

---
Built with ❤️ by [Infinition](https://github.com/infinition)
