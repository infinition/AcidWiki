# Ecrire du contenu

Le moteur lit du Markdown ordinaire. Tout ce qui suit est facultatif : une page
qui n'utilise rien de tout cela s'affiche exactement comme avant.

## Syntaxe de coffre Obsidian

Elle fonctionne desormais dans tous les modes, y compris sur GitHub Pages. Un
coffre Obsidian se publie donc sans rien changer a son contenu.

| Ecriture | Resultat |
|---|---|
| `[[Chapitre 3]]` | lien vers la page, resolue par son nom |
| `[[Chapitre 3\|le chapitre]]` | lien avec un libelle different |
| `[[Chapitre 3#Partie A]]` | lien vers un titre de cette page |
| `![[schema.png]]` | image integree |
| `![[schema.png\|320]]` | image integree, largeur imposee |
| `![[demo.mp4]]` | lecteur video |
| `![[cours.mp3]]` | lecteur audio |
| `![[polycopie.pdf]]` | apercu du PDF dans la page |
| `![[Autre page]]` | lien vers cette page |

La cible est cherchee d'abord relativement au document, puis par chemin complet,
puis par simple nom de fichier, comme dans Obsidian. Une cible introuvable est
affichee en grise plutot que de casser la lecture.

Le contenu des blocs de code est laisse intact : un `[[ -d $DIR ]]` de bash ou un
`[[1, 2], [3, 4]]` de JavaScript ne sont pas pris pour des liens.

L'en-tete YAML est retire du rendu.

## Callouts

Les deux ecritures sont reconnues et rendues de la meme facon.

```markdown
> [!NOTE]
> Alerte au format GitHub.

> [!warning] Titre libre
> Callout Obsidian avec un titre personnalise.

> [!tip]- Replie au chargement
> Le contenu apparait au clic sur le titre.
```

Types reconnus : `note`, `info`, `tip`, `hint`, `important`, `warning`,
`caution`, `danger`, `error`, `bug`, `failure`, `success`, `check`, `done`,
`question`, `faq`, `example`, `quote`, `cite`, `abstract`, `summary`, `tldr`,
`todo`. Le suffixe `+` rend le bloc repliable, `-` le replie au chargement.

## Quizz et flashcards

Rien a activer. Une page qui porte des donnees affiche les boutons, une page
qui n'en a pas n'affiche rien.

### Dans la page

````markdown
```flashcard
[
  {"question": "Derivee de $x^2$ ?", "answer": "$2x$"},
  {"front": "Capitale de la France", "back": "Paris"}
]
```

```quizz
[
  {
    "question": "Combien font 2 + 2 ?",
    "options": [{"text": "3"}, {"text": "4", "correct": true}],
    "explanation": "Affichee apres la reponse."
  },
  {
    "question": "Couleur du ciel ?",
    "options": ["Vert", "Bleu"],
    "answer": 1
  }
]
```
````

Les blocs sont retires du texte affiche. Noms acceptes : `flashcard`,
`flashcards`, `cards` pour les cartes, `quizz`, `quiz` pour les questions.

### Dans un fichier a cote

Pour `02_Cours/Chapitre 1.md`, deposer a cote :

- `02_Cours/Chapitre 1.quiz.json`
- `02_Cours/Chapitre 1.cards.json`

Ces fichiers contiennent le meme JSON que les blocs. Les deux sources se
cumulent : une page peut avoir ses cartes dans le texte et son quizz dans un
fichier.

### Formats acceptes

Une carte : `question`/`answer`, `front`/`back`, `q`/`a`, ou `recto`/`verso`.

Une question : `options` sous forme d'objets `{"text": "...", "correct": true}`,
ou sous forme de simples chaines avec `answer` donnant l'indice ou le texte de
la bonne reponse. `explanation` est facultatif.

Un fichier peut etre un tableau, ou un objet `{"items": [...]}`.

Le score est memorise par page et compare a la tentative precedente. Les
formules `$...$` sont rendues dans les cartes comme dans le corps de page.

## Le reste

Mermaid, KaTeX, tableaux, coloration syntaxique, bouton de copie, sommaire
automatique, recherche plein texte et lightbox sur les images fonctionnent sans
declaration.
