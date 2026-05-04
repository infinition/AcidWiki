<img width="128" height="128" alt="unnamed-removebg-preview" src="https://github.com/user-attachments/assets/4b9aba15-5567-4726-a193-7b6fd138b459" />

# AcidWiki - Set & Forget GitHub Wiki Engine
![unnamed](https://github.com/user-attachments/assets/6851a18b-ec2b-4a10-8118-170b100cfdc7)

AcidWiki is a modern, high-performance, and **fully automated** wiki engine designed for GitHub repositories.
It uses a **centralized architecture**: logic and updates are managed by the source repository (`AcidWiki`), while your project simply "calls" the engine.

## ✨  Features

- **🧠 Centralized Intelligence**: The core logic lives in `AcidWiki`. Client repositories use a reusable workflow to stay in sync.
- **⚙️ Configuration as Code**: Customize your wiki via a simple `acidwiki.json` file. No JavaScript knowledge required.
- **🔄 Auto-Update (CRON)**: Your wiki checks for engine updates automatically every day at 4:00 AM.
- **📂 Dynamic Discovery**: Automatically scans `wiki/docs/` via GitHub API to build the navigation menu.
- **🏷️ Smart Versioning**: Detects GitHub Releases or Tags automatically to display the project version.
- **🎨 Modern UI**: Dark mode, glassmorphism, smooth transitions, and responsive design.
- **🚀 Zero Maintenance**: Repo name, copyright year, and GitHub links are injected dynamically at every build.

## 🛠️ Quick Start

### Method A: Use this Template (New Project)
1. Click the **"Use this template"** button to create a new repository.
2. **Important**: Go to `Settings > Actions > General`. Under "Workflow permissions", select **Read and write permissions** and Save.
3. **Trigger Setup**: Push a simple change (like editing README).
   - *The workflow will automatically create the `wiki/docs/` folder and a default `acidwiki.json` config file.*
4. **Enable Pages**: Go to `Settings > Pages`, set source to **Deploy from a branch** > **main** > **/(root)**.

### Method B: Add to Existing Project (Manual Setup)
1. In your existing repository, create this file: `.github/workflows/wiki-sync.yml`.
2. Paste the following trigger code:

```yaml
name: Wiki Sync

on:
  push:
    branches: [ main ]
    paths:
      - 'wiki/**'
      - 'acidwiki.json'
      - '.github/workflows/wiki-sync.yml'
  workflow_dispatch:
  schedule:
    - cron: '0 4 * * *' # Checks for updates every day at 4am

permissions:
  contents: write
  pages: write
  id-token: write

jobs:
  deploy-wiki:
    # Calls the central logic from AcidWiki
    uses: infinition/AcidWiki/.github/workflows/reusable-wiki-sync.yml@main

```

3. **Push**. The action will download the engine, create the structure, and generate your configuration automatically.

## ⚙️ Configuration (`acidwiki.json`)

**⛔ DO NOT EDIT `wiki/config.js` MANUALLY.**
It is regenerated automatically by the workflow at every push.

To customize your wiki, edit the **`acidwiki.json`** file at the root of your repository (it is created automatically on the first run).

```json
{
  "debug": false,
  "social": {
    "discord": "[https://discord.gg/your-invite-code](https://discord.gg/your-invite-code)",
    "reddit": null
  },
  "buymeacoffee": "[https://buymeacoffee.com/your-username](https://buymeacoffee.com/your-username)"
}

```

### Options:

* **`social.discord`**: Your Discord invite URL. Set to `null` to disable the button.
* **`social.reddit`**: Your Subreddit URL. Set to `null` to disable the button.
* **`buymeacoffee`**: Your donation link (defaults to Infinition if removed).
* **`debug`**: Set to `true` to enable verbose logging in the browser console.

> **Note:** The Project Name, Version, GitHub URL, and Footer Copyright are automatically detected from your repository context.

## 🖼️ Branding & Logo

The engine automatically detects your project logo and favicon using the following priority order:

1.  **`wiki/assets/logo.png`**: If this file exists, it will be used as the primary logo and favicon.
2.  **README.md**: If the above file is missing, the engine will use the **first image** found in your `README.md`.
3.  **Fallback**: Otherwise, the default configuration logo is used.

> **Tip:** For the best results, use a square transparent PNG.

## 📂 Folder Structure

You must respect this structure for the auto-discovery engine to work:

```text
.
├── .github/workflows/
│   └── wiki-sync.yml      # The Trigger (Calls AcidWiki logic)
├── acidwiki.json          # YOUR Configuration (Social links, etc.)
├── wiki/
│   ├── docs/              # ⚠️ PUT YOUR MARKDOWN FILES HERE
│   │   ├── 01_Intro/      # Folders become categories
│   │   │   └── Setup.md
│   │   └── Guide.md
│   ├── assets/            # Images (logo.png, screenshots)
│   └── config.js          # ⛔ Generated File (Do not touch)
├── index.html             # The Engine (Auto-updated from Source)
└── README.md              # Your Home Page

```

## 📝 Writing Content

1. Create standard Markdown (`.md`) files inside **`wiki/docs/`**.
2. **Folders** become menu categories.
3. **Files** become pages.
4. **Ordering**: Files and folders are sorted alphabetically. You can prefix them with numbers (e.g., `01_General`, `02_Advanced`) to control the order.
5. **Images**: Place images in `wiki/assets/` and link them like `![](../assets/image.png)`.

## 🔄 How Updates Work

This architecture uses a **"Pull" model** to keep all wikis up to date:

1. **On Push**: When you add content or change `acidwiki.json`, the site rebuilds immediately with your specific configuration.
2. **On Schedule (CRON)**: Every day at 4:00 AM, your repository wakes up and checks `infinition/AcidWiki`.
* If the core engine (`index.html`) or the logic has changed, it downloads the new version.
* It regenerates your specific configuration.
* It commits and pushes the update automatically.



## 🧪 Local Development

Since the engine relies on the GitHub API to discover files in production, local development uses a fallback filesystem scan.

1. Open your terminal in the repository root.
2. Start a local server (required for security reasons):
```bash
# Python 3
python -m http.server 8000

```


3. Open `http://localhost:8000`.
4. *Note: Ensure your markdown files are strictly located in `wiki/docs/`.*

---

**By [Infinition](https://github.com/infinition)**

