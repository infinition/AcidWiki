# Writing content

The engine reads plain Markdown. Everything below is optional: a page that uses
none of it renders exactly as before.

## Obsidian vault syntax

It now works in every mode, including on GitHub Pages. An Obsidian vault can be
published without changing anything in its content.

| Written | Result |
|---|---|
| `[[Chapter 3]]` | link to the page, resolved by name |
| `[[Chapter 3\|the chapter]]` | link with a different label |
| `[[Chapter 3#Part A]]` | link to a heading on that page |
| `![[diagram.png]]` | embedded image |
| `![[diagram.png\|320]]` | embedded image, forced width |
| `![[demo.mp4]]` | video player |
| `![[lecture.mp3]]` | audio player |
| `![[handout.pdf]]` | PDF preview inside the page |
| `![[Another page]]` | link to that page |

The target is looked up relative to the document first, then by full path, then
by plain file name, the same way Obsidian does. A target that cannot be found is
greyed out rather than breaking the read.

Code block content is left untouched: a bash `[[ -d $DIR ]]` or a JavaScript
`[[1, 2], [3, 4]]` are not mistaken for links.

YAML front matter is stripped from the rendering.

## Callouts

Both notations are recognised and rendered the same way.

```markdown
> [!NOTE]
> GitHub style alert.

> [!warning] Free form title
> Obsidian callout with a custom title.

> [!tip]- Collapsed on load
> The content appears when the title is clicked.
```

Recognised types: `note`, `info`, `tip`, `hint`, `important`, `warning`,
`caution`, `danger`, `error`, `bug`, `failure`, `success`, `check`, `done`,
`question`, `faq`, `example`, `quote`, `cite`, `abstract`, `summary`, `tldr`,
`todo`. The `+` suffix makes the block collapsible, `-` collapses it on load.

## Quizzes and flashcards

Nothing to enable. A page carrying data shows the buttons, a page without shows
nothing.

### Inline in the page

````markdown
```flashcard
[
  {"question": "Derivative of $x^2$?", "answer": "$2x$"},
  {"front": "Capital of France", "back": "Paris"}
]
```

```quizz
[
  {
    "question": "How much is 2 + 2?",
    "options": [{"text": "3"}, {"text": "4", "correct": true}],
    "explanation": "Shown after answering."
  },
  {
    "question": "Colour of the sky?",
    "options": ["Green", "Blue"],
    "answer": 1
  }
]
```
````

The blocks are removed from the displayed text. Accepted names: `flashcard`,
`flashcards`, `cards` for cards, `quizz`, `quiz` for questions.

### In a file next to the page

For `02_Course/Chapter 1.md`, drop alongside it:

- `02_Course/Chapter 1.quiz.json`
- `02_Course/Chapter 1.cards.json`

These files hold the same JSON as the blocks. Both sources add up: a page can
keep its cards inline and its quiz in a file.

### Accepted formats

A card: `question`/`answer`, `front`/`back`, `q`/`a`, or `recto`/`verso`.

A question: `options` as objects `{"text": "...", "correct": true}`, or as plain
strings with `answer` giving the index or the text of the right answer.
`explanation` is optional.

A file can be an array, or an object `{"items": [...]}`.

The score is remembered per page and compared with the previous attempt. `$...$`
formulas are rendered in cards as they are in the page body.

## Search highlights

Opening a page from a search result highlights the matches. The one the page
scrolled to is coloured differently from the others. `Escape`, or the dedicated
button, clears them and restores the plain text.

## Everything else

Mermaid, KaTeX, tables, syntax highlighting, copy button, automatic table of
contents, full text search and image lightbox work with no declaration.
