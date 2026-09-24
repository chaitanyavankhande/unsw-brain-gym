# Teaching guide — how every lesson in this gym is written

This is the contract for every lesson and drill. It exists because the learner found most notes
too dense, too repetitive or too dry. These rules come from what actually worked for him.
Follow all of them. When a rule and your instinct disagree, the rule wins.

## The learner

- Master of IT student at UNSW. A backend engineer (Java, Spring Boot, Kafka, Redis, microservices)
  and a strong competitive programmer, **but new to formal discrete maths**, and he gets lost fast when
  notation is dropped on him without a picture first.
- He learns by **struggling first**: he attempts, then reveals. So answers are always hidden.
- Long walls of text drain him. Repeating the same example in every row actively hurts.

## The one-line style rule

> **Explain it like he's 10. Short and to the point, but never missing a detail. Long only where it's necessary.**

- One idea per sentence. Aim for ≤ 20 words per sentence.
- Say every symbol in words the first time it appears ("`⇒` means *if … then*").
- No undefined jargon. If a technical term is needed, give its plain meaning in the same line.
- **Long is allowed only when:** the rule is counterintuitive (e.g. `F ⇒ T` is true); the method has
  several steps (proofs, K-maps, truth tables); or it's a known confusion point for him (e.g. "only if").
  Even then, long means **numbered steps or reveal-one-step-at-a-time**, never a wall of text.
- No filler: no "as we saw", no "it's important to note", no repeated explanations.

## Lesson shape — focus mode, summary first

The site shows **one step at a time**, never the whole lesson on one page (a single long page felt like a dump).

1. **Start**: 🎯 goal · 🗺️ the plan (every step in order, each with a one-line `summary`) · 🔑 the whole lesson
   in 3–7 `magic` lines. This is the book-style "here's what you'll learn, then here's the short version".
2. **One step per idea**, in the lecture's order. Keep each idea to what fits on a couple of phone screens.
3. **One step per practice level**: 🟢 → 🟡 → 🔴 quiz level → 🟣 boss level → 🔁 retest.
4. **Finish**: score, 🧠 60-second recap, 📚 more practice (Tier-1 sources with the date the link was checked),
   and the lecture slides the lesson covers.

If an idea needs more than ~6 questions or two tables, split it into two ideas instead.

## The idea step recipe (every idea, in this order: learn, then try)

| Step | Field | What goes in it |
|---|---|---|
| 🧒 Picture | `picture` | An everyday scene, 1–3 short sentences. Use the **classic textbook example** for the concept (umbrella promise, ticket-to-board, light switch, Paris ⇒ France). |
| 🎓 Official | `official` | The exact definition in the **course's own notation** (Thielscher's slides), straight after the picture. Never put all the plain parts first and all the formal parts later. |
| 📊 Grid | `grid` (optional) | A small visible table when a table *is* the idea (truth tables, "who broke the rule?"). |
| 👀 Watch me | `watch` | ONE fully worked example, revealed step by step. **Label every part** (A = …, B = …, direction, why). |
| 🪤 Trap | `trap` | The #1 mistake as *Tempting ❌ vs Correct ✅*, plus a quick test that catches it. |
| 🔑 Remember | `magic` | One line to memorise. |
| ✋ Your turn | `tries` | 3–6 **new** examples, answers hidden, each answer fully labelled plus a one-line *why*. |
| 🗺️ Plan line | `summary` | One short line describing the idea, shown in the Start step's plan. |

## Examples — the rules he asked for explicitly

- **Never reuse an example inside a lesson.** Every row and every question gets its own scenario.
  (The linter fails on repeated questions or repeated table sentences.)
- Mix: the classic textbook example first, then everyday life, then his world
  (APIs, queues, caches, deploys, Kafka, Redis, tests, builds).
- **Every answer validates every part.** For a translation: the formula, which side is which, the
  direction (➡️ same order / 🔄 flipped) when relevant, and *why*. He wants confirmation per sentence.
- Where a wrong answer is likely, add `wrong`: "If you said X: here's why that's wrong."
- Give each question its own letters line (`letters`) so it stands alone.

## Practice ladder — enough practice to go from confused to exam-ready

| Level | Purpose | Guide |
|---|---|---|
| 🟢 Warm-up | one idea per question | ~6–8 items |
| 🟡 Getting there | two ideas combined | ~6–8 items |
| 🔴 Quiz level | the exact style of the next quiz question (read the problem set's "Assessment" footer) | ~6–9 items, multi-select where the quiz is |
| 🟣 Boss level | mid-term / exam depth: tricky edge cases, chains, proofs of equivalence, real-world specs | ~5–8 items |
| 🔁 Retest | 3–5 items to redo from memory **2 days later** | no hints |

A lesson should have **15+ questions** outside the retest. Drills can be pure practice.

## Answers — always hidden, always checked

- Every practice answer starts hidden. The page gives per-question Reveal, Show all / Hide all,
  self-marking ✅/❌, and in ⚙️ Options: Hard mode (hides hints and helper columns) and **Review my ❌**.
- **Every answer that can be checked by code, must be.** Add a `check` (see `LESSON_FORMAT.md`):
  truth values, equivalences, validity, entailment, falsifying rows, and every multi-choice option list.
  `python3 tools/verify_answers.py` must pass with 0 failures before a push.
- Multi-choice items must mark **all** correct options; the checker recomputes them.

## Course notation (COMP9020, Prof. Thielscher) — teach in THESE conventions

- ℕ includes 0. ℙ = positive integers. `m | n` ⇔ n = k·m for some integer k. `n mod m` has 0 ≤ r < m.
- `A ⇒ B` is defined as `¬(A ∧ ¬B)`. "A only if B", "B is necessary for A", "A is sufficient for B" = `A ⇒ B`.
- "A unless B" = `¬B ⇒ A` (= `A ∨ B`), **one way only** — it does not also give `B ⇒ ¬A`.
- "Just in case" = `⇔` (not "as a precaution"). "or" is inclusive.
- Binding: `¬` first, then `∧` and `∨` (not ranked against each other → always bracket mixes), then `⇒` and `⇔`.
- `⊤` / `⊥` are formulas (always true / always false).

## Academic integrity — this site is PUBLIC

- **Never** copy problem-set text, and **never** publish problem-set answers (not even partial ones).
  The course's problem-set pages say reproducing or posting them is a copyright infringement.
- Quiz-style drills are **original variations**, never the real questions. A relabelled copy (same formula with letters
  renamed or negated, same sets with the numbers shifted) counts as the real question: change the structure, not just the names.
- Lecture examples may be used briefly with a slide reference ("a lecture example").
- Tutorial answers only if course staff already worked them in class, and even then prefer original drills.

## When he asks for help on graded work (outside the site)

He wants to be taught to find answers himself. Don't hand over solutions. Use a hint ladder, escalating
only when he asks again: (1) "there's an error, go find it" → (2) which part → (3) which step → (4) the exact line.
Give the solution only when he explicitly asks for it.
