# Roadmap

What's built, what's next, and why in that order. Update this file whenever a lesson ships.

## COMP9020 — Foundations of Computer Science (T3 2026)

Weeks 1–2 are complete. The course page shows them in lecture order, grouped by topic.

| Unit | Status | Notes |
|---|---|---|
| N1 · Floor, Ceiling & Counting | ✅ ready | floor, ceiling, absolute value, counting multiples, divisible by a or b (PS1 Q1a, Q2b) |
| N2 · Divisibility, mod, gcd & lcm | ✅ ready | divisibility, `mod` with negatives, gcd/lcm, both Euclids, Quiz 1 one-liners (PS1 Q2a) |
| S1 · Sets & Set Operations | ✅ ready | counting elements, set-builder, `∪ ∩ \ ⊕ ᶜ`, Quiz 1 Q4-style expressions |
| S2 · Subsets, Set Laws & Set Proofs | ✅ ready | `∈` vs `⊆`, laws, true-for-all-sets, element chasing (PS1 Q3, Q5) |
| S3 · Power Sets, Intervals & Products | ✅ ready | `Pow`, intervals over ℤ/ℝ, `2ℤ`, products, functions (PS1 Q6) |
| F1 · Words & Alphabets | ✅ ready | `Σᵏ Σ* Σ⁺ Σ≤ⁿ`, languages, grammars (PS2 Q1a, Q2) |
| R1 · AND, OR, NOT from Zero | ✅ ready | propositions, truth-functional, `¬ ∧ ∨`, well-formed formulas, reading formulas (PS2 Q1b) |
| L2 · If–Then & Friends | ✅ ready | `⇒`, 8 phrasings, only-if, converse/inverse/contrapositive, `¬A ∨ B`, unless, `⇔` |
| L2B · English → Logic | ✅ ready | joiners, binding order, main joiner, nested conditions, Q3b-style drills |
| D1 · If–Then Decoder | ✅ ready | decoder table + rapid fire + who-breaks-the-rule |
| L3 · Truth-Table Detective | ✅ ready | tables, every satisfying row, sat/valid/unsat, puzzles (PS2 Q1c, Q3a) |
| L3B · Equivalence & the Laws | ✅ ready | `≡`, law toolkit, chain proofs, one-row disproofs, substitution, `⊕` (PS2 Q4) |
| L4 · Arguments & Entailment | ✅ ready | `⊨`, entailed options (Quiz 2 Q5b), specs, liars/truth-tellers, `∀ ∃` (PS2 Q5, Q6) |
| D2 · Quiz 2 Gym | ✅ ready | 7 original Q3(b) + 8 original Q5(b) variations + speed mix; **Quiz 2 is Thu 1 Oct 2026** |
| L5 · Proofs | ✅ ready | direct, cases, contrapositive, contradiction, broken proofs, good writing (PS2 Q7) |
| L6 · Boolean Algebra | ✅ ready | `+ · ′`, Boolean functions, BA laws/examples, `2ᵏ`, simplification, NOR |
| L7 · CNF, DNF & K-maps | ✅ ready | normal forms, canonical DNF, 3- and 4-variable K-maps |

**Coverage:** `docs/COVERAGE_COMP9020.md` maps every Week 1–2 slide section, lecture exercise, problem-set question, tutorial exercise,
reading and program to the step that trains it (regenerate with `python3 tools/build_coverage.py` after changing lessons).

**Next:** Week 3 (functions and relations) when its slides and Problem set 3 land; Quiz 3 drill from PS3's assessment footer.

Mid-term: Wed 21 Oct 2026, covers Weeks 1–5 — boss levels should reach that depth.

## Other courses

COMP9024 and COMP9021 get a folder and a catalog entry the first time a lesson is written for them.

## Engine ideas (later)

- "Review my misses" page across all lessons, with spaced retest dates (1, 3, 7 days).
- Fill-in truth-table block (click T/F cells, check row by row).
- Clickable K-map block (today K-maps are shown with an item `grid`).
- Optional sync of progress across devices (today it's per browser).
