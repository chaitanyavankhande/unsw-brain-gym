# Lesson format — `lesson.json`

Every lesson or drill is a folder with two files:

```
comp9020/l2-if-then/
├── index.html    ← 20-line shell, identical for every lesson (made by tools/new_lesson.py)
└── lesson.json   ← all the content
```

`assets/gym.js` reads `lesson.json` and draws the page. You never write HTML for a lesson.
The site's list of lessons lives in `catalog.json`.

## Text markup (inside any string)

| Write | Shows as |
|---|---|
| `` `p ⇒ q` `` | formula chip (monospace) — wrap **every** formula in backticks |
| `**bold**` | bold |
| `*italic*` | italic |
| `[text](https://…)` | link (opens in a new tab) |
| `\n` | line break |

Everything else is escaped, so raw HTML shows as text. Keep backticks and `**` balanced; the linter checks.

## Top level

```json
{
  "id": "comp9020-l2",                       // unique, matches catalog.json
  "course": {"code": "COMP9020", "href": "../"},
  "code": "L2", "emoji": "➡️", "title": "If–Then & Friends",
  "eyebrow": "COMP9020 · Week 2 · Propositional logic",
  "minutes": 50,
  "verified": true,                           // shows "answers checked by code" — only if verify passes
  "goal": "After this you can …",
  "roadmap": ["First …", "Then …"],
  "magic": ["one-liner", "…"],
  "blocks": [ … ],
  "checks": [ … ],                            // optional: extra machine checks for claims in the text
  "sources": "Lecture slides: Week 1 slides 57–63 …",
  "prev": {"href": "../", "label": "…"}, "next": {"href": "../l2b-…/", "label": "…"}
}
```

## Blocks

| `type` | Fields | Notes |
|---|---|---|
| `section` | `id`, `title`, `sub?` | Starts a big part ("💡 Learn it", "🏋️ Practice ladder"). Following blocks go inside it. |
| `idea` | `id`, `short` (TOC label), `title`, `picture`, `official`, `grid?`, `watch {q, steps[], answer}`, `tries[]`, `trap {tempting, correct, test}`, `magic` | Numbered automatically ("Idea 1"). |
| `practice` | `id`, `level` (`green` `yellow` `red` `boss` `retest`), `title?`, `sub?`, `toc?`, `items[]` | Default titles: 🟢 Warm-up, 🟡 Getting there, 🔴 Quiz level, 🟣 Boss level, 🔁 Retest. |
| `table` | `id`, `title`, `sub`, `toc?`, `columns[{label, hideable?}]`, `rows[{cells[]}]` | Reveal table (the Decoder). A cell is a string, or `{id, s, a, tag?, tone?: "same"\|"rev", why?}`. `hideable` columns vanish in Hard mode. On phones each row becomes a card. |
| `grid` | `id`, `title`, `sub?`, `cols[]`, `rows[[]]`, `emph?[]` | A plain visible table (row indexes in `emph` are highlighted). An idea's `grid` uses the same shape. |
| `steps` | `id`, `title`, `sub?`, `steps[]` | Revealed one step at a time. Use for long procedures. |
| `callout` | `tone` (`tip` `key` `trap`), `title`, `body` | |
| `recap` | `title?`, `lines[]` | 🧠 60-second recap. |
| `links` | `id`, `sub?`, `items[{title, url, source, checked, note}]` | Tier-1 sources only (universities, official material). `checked` = date you opened the link. |

## Items (in `tries` and `practice.items`)

```json
{
  "id": "r1",                                  // unique within the lesson; progress is saved under it
  "letters": "`p` = you pass · `s` = you study",
  "q": "\"You pass only if you study.\" Which options mean the same?",
  "hint": "optional — hidden in Hard mode",
  "options": ["`s ⇒ p`", "`p ⇒ s`", "`¬s ⇒ ¬p`"],   // optional → clickable choices
  "correct": [1, 2],                           // 0-based indexes
  "multi": true,                               // required when more than one is correct
  "labels": "abcd",                            // optional: (a)(b) instead of (1)(2)
  "mono": true,                                // options are formulas
  "a": "**(2), (3)**",                         // the answer (always required)
  "steps": ["optional worked steps"],
  "why": "one line: why it's right",           // expected everywhere except retest
  "wrong": "If you said X: why that's wrong",  // optional, for likely mistakes
  "check": { … } or [ … ],                     // machine check(s), see below
  "nocheck": "reason"                          // only for option items that can't be machine-checked
}
```

## Checks (`tools/verify_answers.py`)

Formulas use the same symbols as the page: `¬ ∧ ∨ ⊕ ⇒ ⇔ ⊤ ⊥` and brackets (ASCII `~ & | ^ -> <->` also work).

| `kind` | Fields | Passes when |
|---|---|---|
| `value` | `f`, `expect` | a constant formula like `⊤ ⇒ ⊥` has that value |
| `equiv` | `f`, `g`, `expect` (default true) | `f ≡ g` is `expect` |
| `valid` | `f`, `expect` | `f` is true in every row |
| `entails` | `premises[]`, `f`, `expect` | premises ⊨ f is `expect` |
| `falsifying` | `f`, `rows[{var: bool}]` | exactly these rows make `f` false |
| `options_equiv` | `target` | the options equivalent to `target` are exactly `correct` |
| `options_entailed` | `premises[]` | the options entailed by the premises are exactly `correct` |
| `options_falsify` | `f`, `rows[]` (one per option) | the options whose row makes `f` false are exactly `correct` |

## Adding a lesson — checklist

1. `python3 tools/new_lesson.py comp9020 l3-truth-tables comp9020-l3 L3 "Truth-Table Detective"`
2. Write `lesson.json` following `docs/TEACHING_GUIDE.md`.
3. In `catalog.json`: set the unit's `status` to `ready` and its `path` to the folder (with a trailing `/`).
4. Link it from the previous lesson's `next` and the new lesson's `prev`.
5. Run `python3 tools/verify_answers.py` and `python3 tools/lint_lessons.py` → 0 failures, 0 errors.
6. Preview: `python3 -m http.server` → open `http://localhost:8000/comp9020/…/` on desktop and phone width.
7. Commit and push (see CLAUDE.md → Publishing). GitHub Pages updates in about a minute.
