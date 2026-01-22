# 🧪 AcidWiki Template

A modern, lightweight, and highly customizable wiki template designed for developers and documentation enthusiasts. Built with a focus on speed, aesthetics, and ease of use.

<img width="1302" height="739" alt="image" src="https://github.com/user-attachments/assets/3dc02e6e-d9bd-47d4-88c2-2e9841f60256" />


## ✨ Features

- **🎨 Dynamic Theme Engine**: Comes with 17+ pre-configured themes (Cyberpunk, Retro Hackers, Glassmorphism, etc.).
- **🔍 Instant Search**: Fast, client-side search indexing for all your articles.
- **📱 Mobile-First Design**: Fully responsive with a slide-out menu and Table of Contents.
- **📝 Markdown Powered**: Write in Markdown and let AcidWiki handle the rendering with syntax highlighting.
- **🚀 Zero Backend**: Purely static HTML/JS/CSS. Host it on GitHub Pages, Vercel, or any static host.
- **⚙️ Easy Configuration**: Manage your entire site from a single `config.js` file.

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/AcidWiki-template.git
cd AcidWiki-template
```

### 2. Customize Configuration
Open `config.js` and update the `CONFIG` object with your project details, social links, and preferred default theme.

### 3. Add Content
- Place your `.md` files in the `wiki/` directory (you can use subdirectories).
- Update `wiki/structure.json` to define the sidebar navigation and order.

### 4. Deploy
Simply upload the files to any static web server or use GitHub Pages.

## 📂 Project Structure

```text
├── assets/             # Images, logos, and icons
├── themes/             # CSS theme definitions
├── wiki/               # Your markdown content
│   └── structure.json  # Sidebar navigation config
├── config.js           # Main site configuration
├── index.html          # The core application
└── README.md           # You are here!
```

## 🛠️ Tech Stack

- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide](https://lucide.dev/)
- **Markdown**: [Marked](https://marked.js.org/)
- **Sanitization**: [DOMPurify](https://github.com/cure53/dompurify)
- **Syntax Highlighting**: [Highlight.js](https://highlightjs.org/)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
