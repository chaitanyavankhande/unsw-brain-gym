# Lesson format — `lesson.json`

Every lesson or drill is a folder with two files:

```
comp9020/l2-if-then/
├── index.html    ← 20-line shell, identical for every lesson (made by tools/new_lesson.py)
└── lesson.json   ← all the content
```

`assets/gym.js` reads `lesson.json` and draws the page. You never write HTML for a lesson.
The site's list of lessons lives in `catalog.json`.

## How a lesson is shown: one step at a time (focus mode)

The page never shows the whole lesson at once. `gym.js` turns the blocks into **steps**:

| Step | Made from | Shows |
|---|---|---|
| **Start** | automatic | title, goal, the plan (every step with its `summary`), the `magic` lines, a Start / Continue button |
| **One step per idea** | each `idea` block, plus any `table` / `callout` / `grid` / `steps` blocks right after it | learn (picture → official → grid → watch me step by step → trap → remember), then ✋ your turn |
| **One step per practice level** | each `practice` block | the questions for that level |
| **Finish** | automatic, plus every `recap` and `links` block | score ring and per-step table, recap, more-practice links, next lesson |

A `table` that comes before any idea (a drill's first round) becomes its own step.
`section` blocks don't render; they only group steps. The URL hash is the step (`#i3`, `#p-red`, `#finish`),
and `#review` shows only the questions marked ❌ across the whole lesson.

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
  "magic": ["one-liner", "…"],                // the whole lesson in a few lines, shown on Start
  "blocks": [ … ],
  "checks": [ … ],                            // optional: extra machine checks for claims in the text
  "sources": "Lecture slides: Week 1 slides 57–63 …",
  "prev": {"href": "../", "label": "…"}, "next": {"href": "../l2b-…/", "label": "…"}
}
```

## Blocks

| `type` | Fields | Notes |
|---|---|---|
| `section` | `id`, `title`, `sub?` | Not rendered; groups the steps that follow ("💡 Learn it", "🏋️ Practice ladder"). |
| `idea` | `id`, `short` (label in the progress bar and nav buttons), `title`, `summary` (one line for the Start plan), `picture`, `official`, `grid?`, `watch {q, steps[], answer}`, `tries[]`, `trap {tempting, correct, test}`, `magic` | One step. Numbered automatically ("Idea 1 of 7"). The worked example is revealed one step at a time. |
| `practice` | `id`, `level` (`green` `yellow` `red` `boss` `retest`), `title?`, `sub?`, `summary?`, `toc?` (short label), `items[]` | One step. Default titles: 🟢 Warm-up, 🟡 Getting there, 🔴 Quiz level, 🟣 Boss level, 🔁 Retest. |
| `table` | `id`, `title`, `sub`, `summary?`, `toc?`, `columns[{label, hideable?}]`, `rows[{cells[]}]` | Reveal table (the Decoder). A cell is a string, or `{id, s, a, tag?, tone?: "same"\|"rev", why?}`. `hideable` columns vanish in Hard mode. On phones each row becomes a card. |
| `grid` | `id`, `title`, `sub?`, `cols[]`, `rows[[]]`, `emph?[]` | A plain visible table (row indexes in `emph` are highlighted). An idea's `grid` uses the same shape. |
| `steps` | `id`, `title`, `sub?`, `steps[]` | Revealed one step at a time. Use for long procedures. |
| `callout` | `tone` (`tip` `key` `trap`), `title`, `body` | |
| `recap` | `title?`, `lines[]` | 🧠 60-second recap, shown on the Finish step. |
| `links` | `id`, `sub?`, `items[{title, url, source, checked, note}]` | Shown on the Finish step. Tier-1 sources only (universities, official material). `checked` = date you opened the link. |

A `steps` or `callout` block placed **before** any idea or practice becomes its own step (D2 uses this for its method card).

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
  "grid": {"title": "…", "cols": [], "rows": [[]]},  // optional: a table shown under the question (K-maps, truth tables)
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
| `options_equiv_any` | `targets[]` | the options equivalent to **at least one** target are exactly `correct` (Quiz 2 Q3(b) shape) |
| `options_valid` | — | the options that are tautologies are exactly `correct` |
| `options_sat` | — | the options that are satisfiable are exactly `correct` |
| `calc` | `expr`, `expect` or `is`, `let?` | a Python expression over numbers/sets/words equals `expect` (JSON value) or the value of the expression `is` |
| `options_calc` | `exprs[]` (one per option), `let?` | the options whose expression is true are exactly `correct` |

**Boolean-algebra notation.** Any formula string that starts with `BA:` is read in `+ · ′` notation: `+` or, `·`/juxtaposition and,
`′` (or `'`) not, `0`/`1`; variables are single letters, so `BA:xy′ + z` means `(x ∧ ¬y) ∨ z`. Option lists in BA notation need `"ba": true`
on their `options_*` check.

**`calc` sandbox** (see `CALC_ENV` in `tools/verify_answers.py`): `floor ceil gcd lcm mod divides abs sqrt isqrt comb factorial pi e`,
`count_mult(k, n, m)` (brute-force count of multiples), `is_prime`, sets via Python `{…}` and `frozenset`, `Pow(S)`, `cart(A, B, …)`,
`words(alphabet, k)`, `upto(alphabet, n)` (`Σ≤ⁿ`), `match(regex, word)` (grammar membership), `product`, and `all any sum len sorted range …`.
`let` defines names first, e.g. `{"U": "{1, 2, 3}"}`, so \"true for all sets\" claims can be brute-forced with `all(… for A in Pow(U) for B in Pow(U))`.
Prefer a brute-force check (e.g. `count_mult`, or looping over all subsets) over re-typing the formula you used in the answer.

## Adding a lesson — checklist

1. `python3 tools/new_lesson.py comp9020 l3-truth-tables comp9020-l3 L3 "Truth-Table Detective"`
2. Write `lesson.json` following `docs/TEACHING_GUIDE.md`.
3. In `catalog.json`: set the unit's `status` to `ready` and its `path` to the folder (with a trailing `/`).
4. Link it from the previous lesson's `next` and the new lesson's `prev`.
5. Run `python3 tools/verify_answers.py` and `python3 tools/lint_lessons.py` → 0 failures, 0 errors.
6. Preview: `python3 -m http.server` → open `http://localhost:8000/comp9020/…/`, click through **every step** on desktop and at phone width (~390px).
7. Commit and push (see CLAUDE.md → Publishing). GitHub Pages updates in about a minute.
