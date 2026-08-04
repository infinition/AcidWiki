(() => {
    let mermaidCounter = 0;
    let mermaidReady = false;

    function initMermaid() {
        if (mermaidReady || typeof window.mermaid === 'undefined') return;
        window.mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict',
            theme: 'dark',
            flowchart: { htmlLabels: true, useMaxWidth: true }
        });
        mermaidReady = true;
    }

    window.renderMermaidDiagrams = async function renderMermaidDiagrams(root = document) {
        initMermaid();
        if (!mermaidReady) return;

        root.querySelectorAll('pre > code.language-mermaid').forEach(code => {
            const pre = code.parentElement;
            pre.classList.add('mermaid');
            pre.dataset.mermaidSource = code.textContent.trim();
            pre.replaceChildren();
        });

        const nodes = [...root.querySelectorAll('pre.mermaid:not([data-mermaid-rendered])')];
        for (const node of nodes) {
            const source = node.dataset.mermaidSource || node.textContent.trim();
            if (!source) continue;
            try {
                const id = `acidwiki-mermaid-${++mermaidCounter}`;
                const { svg, bindFunctions } = await window.mermaid.render(id, source);
                node.innerHTML = svg;
                node.dataset.mermaidRendered = 'true';
                if (bindFunctions) bindFunctions(node);
            } catch (error) {
                node.textContent = source;
                node.classList.add('mermaid-error');
                console.warn('[AcidWiki] Mermaid rendering failed:', error);
            }
        }
    };

    function movePageMeta() {
        const tocSticky = document.querySelector('aside .sticky:has(#toc-container)');
        const readingTime = document.getElementById('reading-time');
        const lastUpdated = document.getElementById('last-updated');
        const tocAside = tocSticky?.parentElement;
        if (!tocSticky || !tocAside || !readingTime || !lastUpdated || document.getElementById('wiki-meta')) return;

        const meta = readingTime.parentElement;
        meta.id = 'wiki-meta';
        meta.classList.remove('flex', 'items-center', 'gap-4', 'shrink-0');
        tocAside.insertBefore(meta, tocSticky);
    }

    function installSidebarThemeButton() {
        const footer = document.getElementById('sidebar-footer');
        if (!footer || document.getElementById('sidebar-theme-btn')) return;
        if (window.CONFIG?.features?.showThemeToggle === false) return;

        const line = document.createElement('div');
        line.id = 'sidebar-footer-line';
        const text = document.createElement('span');
        text.textContent = footer.textContent.trim();
        text.style.minWidth = '0';
        text.style.textAlign = 'left';

        const button = document.createElement('button');
        button.id = 'sidebar-theme-btn';
        button.type = 'button';
        button.className = 'text-gray-500 hover:text-hack-green transition-colors bg-hack-sidebar border border-hack-border rounded p-1.5';
        button.title = 'Switch Theme';
        button.setAttribute('aria-label', 'Switch Theme');
        button.setAttribute('aria-haspopup', 'true');
        button.setAttribute('aria-expanded', 'false');
        button.innerHTML = '<i data-lucide="palette" class="w-4 h-4"></i>';
        button.addEventListener('click', event => {
            event.stopPropagation();
            // This is the only theme trigger visible on desktop, so it must open the
            // picker. cycleTheme is kept as a fallback for an older engine build.
            if (typeof window.toggleThemeMenu === 'function') window.toggleThemeMenu(button);
            else if (typeof window.cycleTheme === 'function') window.cycleTheme();
        });

        line.append(text, button);
        footer.replaceChildren(line);
        window.lucide?.createIcons();
    }

    function installInternalNavigation() {
        document.addEventListener('click', event => {
            const link = event.target.closest('#markdown-viewer a[href]');
            if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const href = link.getAttribute('href');
            if (!href || !href.startsWith('?page=')) return;

            const page = decodeURIComponent(new URL(href, window.location.href).searchParams.get('page') || '');
            const cleanPage = typeof window.stripWikiIdFromPageParam === 'function' ? window.stripWikiIdFromPageParam(page) : page;
            const item = typeof window.getFlatPageList === 'function'
                ? window.getFlatPageList().find(candidate => `${candidate.folder ? `${candidate.folder}/` : ''}${candidate.file}` === cleanPage)
                : null;
            if (!item) return;

            event.preventDefault();
            window.loadContent(item.folder, item.title, item.file, true, item.folder === '');
        });
    }

    function keepActiveTocVisible() {
        const toc = document.getElementById('toc-container');
        if (!toc) return;
        const scroller = toc.closest('.sticky');
        if (!scroller) return;

        new MutationObserver(() => {
            const activeLink = toc.querySelector('.toc-link.active');
            if (!activeLink) return;

            const linkTop = activeLink.offsetTop;
            const linkBottom = linkTop + activeLink.offsetHeight;
            const visibleTop = scroller.scrollTop;
            const visibleBottom = visibleTop + scroller.clientHeight;

            if (linkTop < visibleTop) {
                scroller.scrollTo({ top: Math.max(0, linkTop - 12), behavior: 'smooth' });
            } else if (linkBottom > visibleBottom) {
                scroller.scrollTo({ top: linkBottom - scroller.clientHeight + 12, behavior: 'smooth' });
            }
        }).observe(toc, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const canvas = document.createElement('canvas');
        canvas.id = 'home-bg-canvas';
        canvas.setAttribute('aria-hidden', 'true');
        document.body.prepend(canvas);

        movePageMeta();
        installInternalNavigation();
        keepActiveTocVisible();
        installSidebarThemeButton();

        const footer = document.getElementById('sidebar-footer');
        if (footer) new MutationObserver(installSidebarThemeButton).observe(footer, { childList: true, subtree: true, characterData: true });
    });
})();
