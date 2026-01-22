# Installation

Setting up AcidWiki is extremely simple. Since it's a static site, you don't need any server-side processing.

## Prerequisites

- A web browser.
- (Optional) A GitHub account for hosting via GitHub Pages.

## Local Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/your-repo.git
   cd your-repo
   ```

2. **Open `index.html`**:
   Simply open the `index.html` file in your favorite browser.

## Customization

### 1. Configuration
Open `config.js` and update the variables:
```javascript
const CONFIG = {
    projectName: "My Project",
    // ...
};
```

### 2. Adding Content
- Create folders in the `wiki/` directory (e.g., `01_General`).
- Add `.md` files inside these folders.
- Update `wiki/structure.json` to include your new files.

## Deployment

### GitHub Pages
1. Push your code to a GitHub repository.
2. Go to **Settings > Pages**.
3. Select the branch and folder (usually `main` and `/root`).
4. Click **Save**.

Your wiki will be live at `https://yourusername.github.io/your-repo/`.