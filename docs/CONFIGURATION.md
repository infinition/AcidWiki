# Configuration

Tout se declare dans un seul fichier, `.github/acidwiki.json` pour un depot GitHub,
`wiki/config.js` pour un usage local. Aucune ligne de JavaScript a ecrire.

## Modes de fonctionnement

Un wiki peut etre servi de quatre facons. Le mode se choisit avec la cle `mode`.

| `mode` | Decouverte du contenu | Pour quoi |
|---|---|---|
| `auto` (defaut) | index statique s'il existe, sinon detection historique | ne rien decider |
| `github` | API GitHub (arborescence, releases, dates) | GitHub Pages, depot public |
| `local` | listings HTTP du serveur | `python -m http.server`, `tools/serve.py` |
| `vault` | alias de `local` | coffre Obsidian |
| `static` | `wiki/index.json` seul | hors ligne, intranet, aucun appel tiers |

`auto` reproduit exactement le comportement d'avant, avec en plus la lecture de
l'index statique quand il est present. Un depot existant n'a donc rien a changer.

> [!TIP]
> `static` est le mode a preferer des que le contenu depasse quelques dizaines de
> pages. Sans index, chaque visiteur interroge l'API GitHub pour l'arborescence
> puis une fois par page pour la date de derniere edition, avec un plafond de
> soixante requetes par heure et par adresse.

## Cles de `.github/acidwiki.json`

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
  "projectName": "Mon Projet",
  "description": "Documentation de Mon Projet",
  "footerText": "© 2026 Mon Projet",
  "features": {
    "sortMode": "name",
    "readingProgress": true,
    "showChangelog": true,
    "autoCollapseSidebar": false
  },
  "ui": {
    "breadcrumbRoot": "wiki",
    "searchPlaceholder": "Rechercher (Ctrl+K)..."
  }
}
```

Toutes les cles sont facultatives. Une cle absente garde sa valeur par defaut, un
drapeau inconnu est signale dans le journal de construction sans arreter le
deploiement. Un identifiant de theme inconnu est refuse et le theme par defaut
est conserve, plutot que de livrer un wiki sans feuille de style.

Nom du projet, version, URL du depot et annee de copyright sont deduits du depot
quand ils ne sont pas declares.

## Drapeaux de `features`

| Cle | Defaut | Effet |
|---|---|---|
| `sortMode` | `"name"` | ordre de la navigation : `name` (tri naturel) ou `date` (recents en tete, demande un index statique) |
| `readingProgress` | `true` | barre de progression de lecture en haut de page |
| `showChangelog` | `true` | page des releases GitHub, masquee sans depot configure |
| `showSearch` | `true` | recherche plein texte |
| `showSocialBadges` | `true` | pastilles Discord, Reddit, GitHub |
| `showThemeToggle` | `true` | selecteur de theme |
| `pageTransitions` | `true` | transitions entre pages |
| `autoCollapseSidebar` | `false` | ne garder qu'une rubrique ouverte a la fois |
| `stickyBreadcrumbs` | `true` | fil d'Ariane colle en haut |
| `showRootReadme` | `true` | README du depot en page d'accueil |
| `searchIndexConcurrency` | `8` | requetes simultanees pendant l'indexation |
| `debug` | `false` | journal detaille dans la console |

## Index statique

```bash
node tools/build-index.mjs
```

Produit `wiki/index.json` (arborescence, fichiers de racine, dates de
modification, quizz voisins) et `wiki/index-links.json` (table de resolution des
liens de coffre). Le second n'est telecharge que par les pages qui contiennent
reellement un lien `[[...]]`.

Options : `--root <dossier>`, `--content <sous-dossier>`, `--out <fichier>`.

Le workflow GitHub le construit automatiquement a chaque deploiement. Pour un
coffre local, `python tools/serve.py --build` fait la meme chose, et le serveur
le regenere de lui-meme pendant qu'il tourne.

## Serveur local

```bash
python tools/serve.py --vault "chemin/vers/le/coffre"
```

Un seul moteur sert autant de coffres que voulu. Le port est deduit du nom du
coffre, ou impose par `--port`.

| Option | Effet |
|---|---|
| `--vault` | dossier du contenu (defaut : dossier courant) |
| `--port` | port d'ecoute |
| `--no-browser` | ne pas ouvrir le navigateur |
| `--build [dossier]` | ecrire l'index et quitter |
| `--legacy-translate` | traduire la syntaxe Obsidian cote serveur (ancien comportement) |

Par defaut le serveur envoie le markdown brut et le moteur applique la meme
traduction que sur GitHub Pages : le rendu local et le rendu publie sont
identiques. `--legacy-translate` restaure la traduction cote serveur si besoin.
