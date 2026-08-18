#!/usr/bin/env python3
"""
Serveur universel pour les wikis de cours Nephystos (AcidWiki).
Partage par l'ensemble des academies (ML Academy, CG Academy, Cyber Hackademy, Science Academy).
"""

import html
import mimetypes
import os
import re
import socket
import sys
import threading
import urllib.parse
import webbrowser
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

# --------------------------------------------------------------------------
# Parametres et detection de l'environnement
# --------------------------------------------------------------------------

ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
WIKI_DIR = ENGINE_DIR

parser = argparse.ArgumentParser(description="Universal Academy Wiki Server")
parser.add_argument("--vault", default=None, help="Path to the Academy Vault folder")
parser.add_argument("--port", type=int, default=None, help="Port to listen on")
parser.add_argument("--no-browser", action="store_true", help="Do not open browser automatically")
args, _ = parser.parse_known_args()

if args.vault:
    VAULT = os.path.abspath(args.vault)
else:
    cwd = os.getcwd()
    if os.path.basename(cwd).lower() == '_wiki':
        VAULT = os.path.dirname(cwd)
    else:
        VAULT = cwd

if args.port:
    PORT = args.port
else:
    vault_name = os.path.basename(VAULT).lower()
    if "cg" in vault_name:
        PORT = int(os.environ.get("CG_WIKI_PORT", "8766"))
    elif "cyber" in vault_name:
        PORT = int(os.environ.get("CYBER_WIKI_PORT", "8767"))
    elif "science" in vault_name:
        PORT = int(os.environ.get("SCIENCE_WIKI_PORT", "8768"))
    else:
        PORT = int(os.environ.get("MLPRO_WIKI_PORT", "8765"))

HIDDEN_DIRS = {
    "_assets", "_build", "_wiki", "_github", "videos",
    ".obsidian", ".git", ".trash", "__pycache__", ".smart-env", ".agents", "node_modules"
}

IMG_EXT = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".avif"}
VID_EXT = {".mp4", ".webm", ".mov", ".m4v"}
AUD_EXT = {".mp3", ".wav", ".m4a", ".ogg", ".flac"}
DOC_EXT = {".pdf", ".ipynb", ".zip", ".csv", ".xlsx", ".docx", ".pptx", ".py", ".txt"}

mimetypes.add_type("text/markdown; charset=utf-8", ".md")
mimetypes.add_type("application/javascript; charset=utf-8", ".js")
mimetypes.add_type("text/css; charset=utf-8", ".css")
mimetypes.add_type("image/png", ".png")
mimetypes.add_type("image/jpeg", ".jpg")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")

def strip_wiki_id(path_str):
    """Supprime les suffixes d'id de wiki comme _f8gti2.md ajoutes par l'URL."""
    return re.sub(r'_[a-z0-9]{5,15}(\.md)$', r'\1', path_str, flags=re.IGNORECASE)

# --------------------------------------------------------------------------
# Indexation des fichiers
# --------------------------------------------------------------------------

FILE_INDEX = {}
DIRS_WITH_MD = set()

def norm_key(name):
    return name.strip().lower()

def build_index():
    global FILE_INDEX, DIRS_WITH_MD
    f_index = {}
    md_dirs = set()

    for root, dirs, files in os.walk(VAULT):
        dirs[:] = [d for d in dirs if d not in {".git", ".trash", "__pycache__", ".obsidian"}]
        has_md = any(f.lower().endswith(".md") for f in files)
        if has_md:
            cur = root
            while True:
                md_dirs.add(os.path.normpath(cur))
                if os.path.normpath(cur) == os.path.normpath(VAULT):
                    break
                parent_dir = os.path.dirname(cur)
                if parent_dir == cur:
                    break
                cur = parent_dir

        for f in files:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, VAULT).replace("\\", "/")
            stem, ext = os.path.splitext(f)

            f_index.setdefault(norm_key(f), rel)
            f_index.setdefault(norm_key(stem), rel)
            f_index.setdefault(norm_key(rel), rel)

    FILE_INDEX = f_index
    DIRS_WITH_MD = md_dirs

build_index()

def resolve_target(target, base_dir=""):
    target = target.split("#")[0].split("|")[0].strip()
    if not target:
        return None

    if base_dir:
        cand = os.path.normpath(os.path.join(base_dir, target))
        cand_norm = cand.replace("\\", "/").lstrip("./")
        if os.path.isfile(os.path.join(VAULT, cand)):
            return cand_norm
        if not os.path.splitext(cand)[1]:
            if os.path.isfile(os.path.join(VAULT, cand + ".md")):
                return cand_norm + ".md"

    k = norm_key(target)
    if k in FILE_INDEX:
        return FILE_INDEX[k]

    cand_md = norm_key(target + ".md")
    if cand_md in FILE_INDEX:
        return FILE_INDEX[cand_md]

    base = norm_key(os.path.basename(target))
    if base in FILE_INDEX:
        return FILE_INDEX[base]
    if norm_key(base + ".md") in FILE_INDEX:
        return FILE_INDEX[norm_key(base + ".md")]

    return None

def url_for(rel_path):
    return "/docs/" + urllib.parse.quote(rel_path)

def page_url_for(rel_path):
    return "?page=" + urllib.parse.quote(rel_path)

def media_html(rel_path, label):
    ext = os.path.splitext(rel_path)[1].lower()
    src = url_for(rel_path)

    if ext in IMG_EXT:
        return f'<img src="{src}" alt="{html.escape(label or os.path.basename(rel_path))}" loading="lazy">'
    if ext in VID_EXT:
        return (f'<video controls preload="metadata" style="max-width:100%;border-radius:8px">'
                f'<source src="{src}">Votre navigateur ne supporte pas la balise video.</video>')
    if ext in AUD_EXT:
        return f'<audio controls preload="metadata" src="{src}" style="width:100%"></audio>'
    if ext == ".pdf":
        nom = html.escape(os.path.basename(label or rel_path))
        return (f'<div class="pdf-wrap">'
                f'<div class="pdf-open"><a href="{src}" target="_blank" rel="noopener">'
                f'Ouvrir le PDF : {nom}</a></div>'
                f'<iframe class="pdf-embed" src="{src}#view=FitH" title="{nom}"></iframe>'
                f'</div>')
    return f'<p><a href="{src}" target="_blank" rel="noopener">{html.escape(label or os.path.basename(rel_path))}</a></p>'

# --------------------------------------------------------------------------
# Traduction Markdown Obsidian
# --------------------------------------------------------------------------

CALLOUT_TITRES = {
    "note": "Note", "info": "Information", "tip": "Astuce", "hint": "Indice",
    "important": "Important", "warning": "Attention", "caution": "Prudence",
    "danger": "Danger", "question": "Question", "faq": "FAQ",
    "example": "Exemple", "quote": "Citation",
}

def translate_markdown(text, doc_rel_path=""):
    base_dir = os.path.dirname(doc_rel_path)

    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            rest = text[end + 4:]
            if rest.startswith("\r\n"):
                rest = rest[2:]
            elif rest.startswith("\n"):
                rest = rest[1:]
            text = rest

    # Math blocks
    def math_block_sub(m):
        corps = re.sub(r"\n[ \t]*\n", "\n", m.group(1).strip())
        return '<div class="math-block">$$' + corps + '$$</div>'
    text = re.sub(r"\$\$\n([\s\S]*?)\n\$\$", math_block_sub, text)

    # Callouts
    def callout_sub(m):
        genre = (m.group(1) or "note").lower()
        titre_custom = m.group(2)
        corps_brut = m.group(3) or ""
        titre = titre_custom.strip() if titre_custom else CALLOUT_TITRES.get(genre, genre.capitalize())
        lignes = corps_brut.splitlines()
        corps_lignes = []
        for l in lignes:
            corps_lignes.append(re.sub(r"^>[ \t]?", "", l))
        corps = "\n".join(corps_lignes).strip()
        return (f'<div class="callout callout-{genre}">'
                f'<div class="callout-title">{html.escape(titre)}</div>'
                f'<div class="callout-body">\n\n{corps}\n\n</div></div>')
    text = re.sub(r"^>[ \t]*\[!([a-zA-Z0-9_-]+)\][+-]?(?:[ \t]+([^\n]*))?\n((?:>[^\n]*\n?)*)",
                  callout_sub, text, flags=re.MULTILINE)

    # Embeds ![[...]]
    def embed_sub(m):
        raw = m.group(1)
        target, _, alias = raw.partition("|")
        target = target.strip()
        alias = alias.strip() if alias else None
        rel = resolve_target(target, base_dir)
        if not rel:
            return f"<em>[Fichier introuvable : {html.escape(target)}]</em>"
        if rel.lower().endswith(".md"):
            return f'<p><a href="{page_url_for(rel)}">{html.escape(alias or target)}</a></p>'
        return media_html(rel, alias or target)
    text = re.sub(r"!\[\[([^\]]+)\]\]", embed_sub, text)

    # Links [[...]]
    def link_sub(m):
        raw = m.group(1)
        target, _, alias = raw.partition("|")
        target = target.strip()
        label = alias.strip() if alias else target
        rel = resolve_target(target, base_dir)
        if not rel:
            return html.escape(label)
        if rel.lower().endswith(".md"):
            return f'<a href="{page_url_for(rel)}">{html.escape(label)}</a>'
        return f'<a href="{url_for(rel)}" target="_blank" rel="noopener">{html.escape(label)}</a>'
    text = re.sub(r"\[\[([^\]]+)\]\]", link_sub, text)

    # Images classiques ![](...)
    def md_img_sub(m):
        alt = m.group(1)
        target = m.group(2).strip()
        title = m.group(3) or ""
        if target.startswith(("http://", "https://", "data:", "/")):
            return m.group(0)
        rel = resolve_target(urllib.parse.unquote(target), base_dir)
        if not rel:
            return m.group(0)
        return f"![{alt}]({url_for(rel)}{title})"
    text = re.sub(r"!\[([^\]]*)\]\(([^ \t\)]+)([ \t]+[\"'][^\"']*[\"'])?\)", md_img_sub, text)

    return text

def get_markdown(full_path):
    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            raw = f.read()
    except OSError:
        return None
    rel = os.path.relpath(full_path, VAULT).replace("\\", "/")
    translated = translate_markdown(raw, rel)
    return translated.encode("utf-8")

def href_quote(path):
    out = path.replace("%", "%25").replace("#", "%23").replace("?", "%3F")
    return out.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")

def listing_html(entries):
    lines = ["<!doctype html><meta charset='utf-8'><title>index</title><ul>"]
    for href, label in entries:
        lines.append(f'<li><a href="{href_quote(href)}">{html.escape(label)}</a></li>')
    lines.append("</ul>")
    return "\n".join(lines).encode("utf-8")

def dir_has_markdown(path):
    p_norm = os.path.normpath(path)
    return p_norm in DIRS_WITH_MD

def build_listing(fs_dir, url_prefix):
    entries = []
    try:
        names = sorted(os.listdir(fs_dir), key=lambda s: s.lower())
    except OSError:
        return None
    racine = os.path.normpath(fs_dir) == os.path.normpath(VAULT)
    for name in names:
        if name.startswith("."):
            continue
        full = os.path.join(fs_dir, name)
        if os.path.isdir(full):
            if name in HIDDEN_DIRS:
                continue
            if not dir_has_markdown(full):
                continue
            entries.append((f"{url_prefix}{name}/", name))
        elif name.lower().endswith(".md") and not racine:
            entries.append((f"{url_prefix}{name}", name))
    return entries

# --------------------------------------------------------------------------
# HTTP Server Handler
# --------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    server_version = "AcademyWiki/2.0"

    def log_message(self, fmt, *args):
        pass

    def _send(self, data, ctype, extra=None, status=200):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Access-Control-Allow-Origin", "*")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def _not_found(self):
        self._send(b"404 Not Found", "text/plain; charset=utf-8", status=404)

    def _send_file(self, full_path):
        try:
            size = os.path.getsize(full_path)
        except OSError:
            return self._not_found()

        ctype = mimetypes.guess_type(full_path)[0] or "application/octet-stream"
        rng = self.headers.get("Range")

        try:
            if rng and rng.startswith("bytes="):
                try:
                    start_s, _, end_s = rng[6:].partition("-")
                    start = int(start_s) if start_s else 0
                    end = int(end_s) if end_s else size - 1
                    end = min(end, size - 1)
                    if start > end:
                        raise ValueError
                except ValueError:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                length = end - start + 1
                self.send_response(206)
                self.send_header("Content-Type", ctype)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
                self.send_header("Accept-Ranges", "bytes")
                self.send_header("Content-Length", str(length))
                self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                if self.command != "HEAD":
                    with open(full_path, "rb") as f:
                        f.seek(start)
                        self.wfile.write(f.read(length))
                return

            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(size))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            if self.command != "HEAD":
                with open(full_path, "rb") as f:
                    while chunk := f.read(64 * 1024):
                        self.wfile.write(chunk)
        except (OSError, BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self):
        raw_path = urllib.parse.urlparse(self.path).path
        path = urllib.parse.unquote(raw_path)

        while path.startswith("/wiki/wiki/"):
            path = path[5:]

        # 1. Override config.js with local vault configuration
        if path == "/wiki/config.js":
            for cand in [
                os.path.join(VAULT, "config.js"),
                os.path.join(VAULT, "academy.config.js"),
                os.path.join(VAULT, "_wiki", "wiki", "config.js"),
                os.path.join(VAULT, "_wiki", "config.js"),
                os.path.join(WIKI_DIR, "wiki", "config.js")
            ]:
                if os.path.isfile(cand):
                    return self._send_file(cand)

        # 2. Override logo.png anywhere requested
        if path.endswith("logo.png") and ("assets" in path or "wiki" in path or path == "/logo.png"):
            for cand in [
                os.path.join(VAULT, "logo.png"),
                os.path.join(VAULT, "assets", "logo.png"),
                os.path.join(VAULT, "_wiki", "wiki", "assets", "logo.png"),
                os.path.join(VAULT, "_wiki", "assets", "logo.png"),
                os.path.join(WIKI_DIR, "wiki", "assets", "logo.png")
            ]:
                if os.path.isfile(cand):
                    return self._send_file(cand)

        # 3. Main SPA
        if path in ("/", "/index.html"):
            return self._send_file(os.path.join(WIKI_DIR, "index.html"))

        # 4. Engine wiki assets
        if path == "/wiki/":
            return self._send(listing_html([]), "text/html; charset=utf-8")

        if path.startswith("/wiki/"):
            return self._serve_under(os.path.join(WIKI_DIR, "wiki"),
                                     path[len("/wiki/"):], "/wiki/", markdown=False)

        # 5. Docs crawling
        if path in ("/docs", "/docs/"):
            entries = build_listing(VAULT, "/docs/")
            if entries is None:
                return self._not_found()
            return self._send(listing_html(entries), "text/html; charset=utf-8")

        if path.startswith("/docs/"):
            return self._serve_under(VAULT, path[len("/docs/"):], "/docs/", markdown=True)

        # 6. Direct Vault content
        rel = path.lstrip("/")
        if rel:
            candidate = os.path.normpath(os.path.join(VAULT, rel.replace("/", os.sep)))
            if not os.path.isfile(candidate):
                cand_stripped = strip_wiki_id(candidate)
                if os.path.isfile(cand_stripped):
                    candidate = cand_stripped

            if (os.path.abspath(candidate).startswith(os.path.abspath(VAULT))
                    and os.path.isfile(candidate)):
                if candidate.lower().endswith(".md"):
                    data = get_markdown(candidate)
                    if data is not None:
                        return self._send(data, "text/markdown; charset=utf-8")
                else:
                    return self._send_file(candidate)

        # 7. Engine assets fallback
        candidate = os.path.join(WIKI_DIR, path.lstrip("/").replace("/", os.sep))
        if not os.path.isfile(candidate):
            cand_stripped = strip_wiki_id(candidate)
            if os.path.isfile(cand_stripped):
                candidate = cand_stripped

        if os.path.isfile(candidate):
            return self._send_file(candidate)

        return self._not_found()

    def _serve_under(self, base, rel, url_prefix, markdown):
        rel_fs = rel.replace("/", os.sep)
        full = os.path.normpath(os.path.join(base, rel_fs))

        if not os.path.isfile(full) and not os.path.isdir(full):
            full_stripped = strip_wiki_id(full)
            if os.path.isfile(full_stripped) or os.path.isdir(full_stripped):
                full = full_stripped

        if not os.path.abspath(full).startswith(os.path.abspath(base)):
            return self._not_found()

        if os.path.isdir(full):
            entries = build_listing(full, url_prefix + rel.rstrip("/") + "/")
            if entries is None:
                return self._not_found()
            return self._send(listing_html(entries), "text/html; charset=utf-8")

        if os.path.isfile(full):
            if markdown and full.lower().endswith(".md"):
                data = get_markdown(full)
                if data is None:
                    return self._not_found()
                return self._send(data, "text/markdown; charset=utf-8")
            return self._send_file(full)

        return self._not_found()

def main():
    print("=" * 60)
    print("      NEPHYSTOS ACADEMY WIKI - MOTEUR UNIFIÉ")
    print("=" * 60)
    print(f"  Coffre (Vault) : {VAULT}")
    print(f"  Moteur (Core)  : {ENGINE_DIR}")
    print(f"  URL Locale     : http://127.0.0.1:{PORT}")
    print("=" * 60)

    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    if not args.no_browser:
        threading.Thread(target=lambda: (import_time := __import__('time'), import_time.sleep(0.5), webbrowser.open(f"http://127.0.0.1:{PORT}")), daemon=True).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Arrêt du wiki.")

if __name__ == "__main__":
    main()
