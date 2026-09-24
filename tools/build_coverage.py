"""Generate docs/COVERAGE_COMP9020.md (run: python3 tools/build_coverage.py): every slide section, lecture exercise, problem-set question,
tutorial exercise, reading and course program -> the gym step(s) that train it. Validates every reference."""
import json
import pathlib

REPO = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://chaitanyavankhande.github.io/unsw-brain-gym/comp9020/"
cat = json.loads((REPO / "catalog.json").read_text())
units = {u["code"]: u for c in cat["courses"] if c["id"] == "comp9020" for u in c["units"]}
steps = {}
for code, u in units.items():
    L = json.loads((REPO / "comp9020" / u["path"] / "lesson.json").read_text())
    steps[code] = {b["id"]: (b.get("short") or b.get("toc") or b.get("title") or b.get("level")) for b in L["blocks"]
                   if b["type"] in ("idea", "practice", "table") or (b["type"] == "steps")}

LEVEL = {"p-green": "🟢", "p-yellow": "🟡", "p-red": "🔴", "p-boss": "🟣", "p-retest": "🔁",
         "h-green": "🟢", "h-yellow": "🟡", "h-red": "🔴", "h-boss": "🟣", "h-retest": "🔁"}


def esc(cell):
    return cell.replace("|", "\\|")


def ref(code, sid):
    assert code in units, code
    assert sid in steps[code], (code, sid, list(steps[code]))
    label = LEVEL.get(sid) or steps[code][sid]
    return f"[{code} {esc(label)}]({SITE}{units[code]['path']}#{sid})"


def refs(*pairs):
    return " · ".join(ref(c, s) for c, s in pairs)


# ---------------------------------------------------------------- lecture slides
W1 = [
    ("10–11", "Floor, ceiling; `⌊−x⌋ = −⌈x⌉`, `⌊x + t⌋ = ⌊x⌋ + t`", refs(("N1", "f1"), ("N1", "f2"))),
    ("11", "Counting multiples of `k` in `[n, m]`", refs(("N1", "f5"), ("N1", "p-red"))),
    ("12–13", "Exercises 1.1.4(b)(d), 1.1.19(a)", refs(("N1", "f2"), ("N1", "f4"))),
    ("14", "Divisibility `m | n`, `n mod m`, `m | n ⇔ n mod m = 0`", refs(("N2", "d1"), ("N2", "d2"))),
    ("15", "gcd, lcm (always positive), primes, relatively prime", refs(("N2", "d3"), ("N2", "d4"))),
    ("16", "Absolute value; `gcd · lcm = |m| · |n|`", refs(("N1", "f3"), ("N2", "d4"))),
    ("17–18", "Exercises 1.2.2, 1.2.7(b), 1.2.9, 1.2.12", refs(("N2", "d1"), ("N2", "d4"), ("N2", "p-boss"))),
    ("19", "Euclid's gcd algorithm; termination; `gcd(m, n) = gcd(m − n, n)` and its \"why?\"", refs(("N2", "d5"), ("L5", "p2"))),
    ("21–22", "What sets are; enumeration; `|X|`; set-builder; `a ≠ {a}`; `∅`", refs(("S1", "e1"), ("S1", "e2"))),
    ("23", "Number sets `ℕ ℙ ℤ ℚ ℝ`", refs(("S1", "e2"),)),
    ("24–25", "Exercise 1.3.2 (cardinalities)", refs(("S1", "e3"),)),
    ("26–27", "`∪ ∩`, disjoint, `\\`, `⊕`, complement; link to logic", refs(("S1", "e4"), ("S1", "e5"))),
    ("28–29", "Venn diagrams; laws of set operations", refs(("S2", "u3"),)),
    ("30", "Subsets `⊆ ⊂`; element vs subset; `A ∪ B = B ⇔ A ⊆ B`; `∅ ⊆ X`", refs(("S2", "u1"), ("S2", "u2"), ("S2", "u3"))),
    ("31–33", "Power set, `|Pow(X)| = 2^|X|`; exercises 1.4.4, 1.4.7, 1.4.8", refs(("S3", "w1"), ("S1", "e5"), ("S2", "u6"))),
    ("34", "Containments; `ℕ>0`, `ℚ>0`; `2ℤ`, `3ℤ + 1`", refs(("S1", "e2"), ("S3", "w4"))),
    ("35–37", "Intervals; exercise 1.3.10", refs(("S3", "w3"),)),
    ("38", "Sidetrack: constructing numbers; `≝`", "Not drilled (background only)."),
    ("39", "Cartesian product; `|S × T|`; `∅ × S = ∅`", refs(("S3", "w5"),)),
    ("40", "Functions as pairings `f : S → T`", refs(("S3", "w6"),)),
    ("42–44", "Alphabets, words, `λ`, length, concatenation, `Σᵏ Σ* Σ⁺ Σ≤ⁿ`, languages, grammars", refs(("F1", "v1"), ("F1", "v2"), ("F1", "v3"), ("F1", "v4"))),
    ("45", "Exercise 1.3.10(e)(f): `|Σ*|`, `|Σ≤⁴| = 121`", refs(("F1", "v2"),)),
    ("47–48", "Necessary condition exercise (Terminates ⇒ Positive Input)", refs(("L2", "i2"), ("D1", "round1"))),
    ("49–54", "Proofs; propositions; truth-functional vs not", refs(("L5", "p1"), ("R1", "a1"), ("R1", "a2"))),
    ("55", "`∧ ∨ ¬` and their words; truth tables", refs(("R1", "a3"), ("L3", "t1"))),
    ("56", "Program logic: `p ∨ (¬p ∧ q) ≡ p ∨ q`", refs(("R1", "a6"), ("L3B", "q3"))),
    ("57–58", "Eight English forms of `A ⇒ B`; definition and table of `⇒`; converse", refs(("L2", "i1"), ("L2", "i2"), ("L2", "i4"))),
    ("59–60", "LLM Problem 3.2 (HD translations)", refs(("L2B", "j1"), ("L2B", "j3"))),
    ("61", "Unless", refs(("L2", "i6"),)),
    ("62", "Just in case, `⇔`", refs(("L2", "i7"),)),
    ("63", "Formal language of propositional logic; binding", refs(("R1", "a4"), ("L2B", "j2"))),
    ("64–65", "Supplementary 1.8.2(b), 1.8.9", refs(("S2", "p-boss"), ("N1", "p-boss"))),
]
W2 = [
    ("2", "Quiz rules", refs(("D2", "method"),)),
    ("4", "Satisfiability", refs(("L3", "t3"),)),
    ("5–7", "Constraint satisfaction: the party example; satisfying assignments", refs(("L3", "t6"),)),
    ("8–9", "Exercise 2.7.14 (which formulas are always true)", refs(("L3", "t5"),)),
    ("10–12", "Logical equivalence; the well-known equivalences; circuit optimisation", refs(("L3B", "q1"), ("L3B", "q2"))),
    ("12–14", "Chain proof example; exercise 2.2.18 (prove or disprove)", refs(("L3B", "q3"), ("L3B", "q4"))),
    ("15–20", "Arguments, validity, `⊨`, truth-table method, Frank's car", refs(("L4", "e1"), ("L4", "e2"))),
    ("21–25", "Requirements: implementable, guaranteed, redundant; burglar alarm", refs(("L4", "e5"),)),
    ("26", "Validity (tautology), `⊨ φ`", refs(("L3", "t4"),)),
    ("27", "`⊨` ↔ valid `⇒`; `≡` ↔ valid `⇔`", refs(("L4", "e4"),)),
    ("28–30", "Quantifiers `∀ ∃`; Goldbach; order of quantifiers", refs(("L4", "e7"),)),
    ("32", "Proof by cases (6 people example)", refs(("L5", "p3"),)),
    ("33", "Proof of the contrapositive", refs(("L5", "p4"),)),
    ("34", "Proof by contradiction (√2, infinitely many primes)", refs(("L5", "p5"),)),
    ("35–38", "Judging generative-AI proofs", refs(("L5", "p6"),)),
    ("39–42", "Substitution; substitution rules", refs(("L3B", "q5"),)),
    ("44–46", "Boolean functions; Boolean arithmetic; digital circuits", refs(("L6", "k1"), ("L6", "k2"))),
    ("47–51", "Boolean algebra definition; 10.1.2 (`B × B`); 10.1.1 (`Pow({a, b, c})`)", refs(("L6", "k3"),)),
    ("53–55", "BA notation for formulas; calculating laws; worked example", refs(("L6", "k2"), ("L6", "k5"))),
    ("56–57", "Exercise 10.2.9 (optimal expression)", refs(("L6", "p-red"), ("L6", "p-boss"))),
    ("58–61", "Literals, CNF, DNF; normal-form theorem; CNF example", refs(("L7", "c1"), ("L7", "c2"))),
    ("62–65", "Canonical DNF; exercise 10.2.3", refs(("L7", "c3"),)),
    ("66–68", "Karnaugh maps; 10.4.2; covering rules", refs(("L7", "c4"), ("L7", "c5"))),
    ("69–70", "Supplementary 10.6.6(c) (4-variable map)", refs(("L7", "c6"), ("L7", "p-red"))),
    ("72–73", "Boolean algebras in CS: bit vectors, `Pow(S)`, `Map(S, B)`, `bool(n)`", refs(("L6", "k3"), ("L6", "k4"))),
    ("74–75", "`|T| = 2ᵏ`; isomorphism; `Pow(S) ≃ B^|S|`", refs(("L6", "k4"),)),
]

# ---------------------------------------------------------------- problem sets (own-words skill descriptions only)
PS1 = [
    ("Q1(a)", "Floor/ceiling one-liner; counting evens with the slide-11 formula", refs(("N1", "f2"), ("N1", "f5"), ("N1", "p-red"))),
    ("Q1(b)", "List the elements of set-builder sets over ℕ, ℤ, ℝ (or ∅)", refs(("S1", "e2"),)),
    ("Q1(c)", "`∩ \\ ∪ ⊕` with a finite set and two infinite sets over ℙ", refs(("S1", "p-yellow"), ("S1", "e5"))),
    ("Q2(a) 🎯 Quiz 1", "One line mixing gcd, lcm, mod, floor, ceiling", refs(("N2", "p-red"),)),
    ("Q2(b)", "Count numbers in an interval divisible by `a`, `b`, both, either", refs(("N1", "f6"), ("N1", "p-red"))),
    ("Q3", "True for all sets? Reason or counterexample (`Pow`, `|·|`, `\\`, complement)", refs(("S2", "u4"), ("S2", "p-red"))),
    ("Q4 🎯 Quiz 1", "Compute a set expression like `(Sᶜ ∩ R) \\ T` over ℙ", refs(("S1", "e6"), ("S1", "p-red"))),
    ("Q5", "Prove a set identity with Venn diagrams and by element chasing", refs(("S2", "u5"), ("S2", "p-red"))),
    ("Q6", "True for all sets? Claims about `Pow(A)`", refs(("S3", "w2"), ("S3", "p-red"))),
    ("Q7", "Trace the fast gcd; adapt the correctness proof", refs(("N2", "d6"), ("N2", "d5")) + " (the proof adaptation is left for you, as the site never posts PS answers)"),
    ("Challenge", "Multiplicative magic square", "Not drilled: a one-off puzzle, not a lecture skill."),
]
PS2 = [
    ("Q1(a)", "List words of length ≤ 2 in `Σ*` and `Σ⁺`", refs(("F1", "v2"), ("F1", "p-red"))),
    ("Q1(b)", "Describe formulas in English", refs(("R1", "a5"), ("R1", "p-red"))),
    ("Q1(c)", "Satisfiable? Tautology? (with truth tables)", refs(("L3", "t4"), ("L3", "p-red"))),
    ("Q2(a)", "Operations on `Σ²`, `Σ*` for two alphabets", refs(("F1", "v3"), ("F1", "p-yellow"), ("F1", "p-red"))),
    ("Q2(b)", "Which strings does a grammar accept?", refs(("F1", "v4"), ("F1", "p-red"))),
    ("Q3(a)", "All truth assignments that make a formula true", refs(("L3", "t3"), ("L3", "p-red"))),
    ("Q3(b) 🎯 Quiz 2", "Two English statements → pick the equivalent formulas", refs(("L2B", "h-red"), ("D2", "round1"))),
    ("Q4", "Prove or disprove equivalences (converse, contrapositive, `⇔`, `⊕`)", refs(("L3B", "q4"), ("L3B", "q6"), ("L3B", "p-red"))),
    ("Q5(a)", "Prove that a formula follows from premises", refs(("L4", "e4"), ("L4", "p-red"))),
    ("Q5(b) 🎯 Quiz 2", "Which formulas are entailed by a premise?", refs(("L4", "e3"), ("L4", "p-red"), ("D2", "round2"))),
    ("Q6(a)", "Answer the burglar-alarm questions (slides 22–25)", refs(("L4", "e5"),)),
    ("Q6(b)", "Liars and truth-tellers puzzle", refs(("L4", "e6"), ("L4", "p-boss"))),
    ("Q7(a)", "Proof by cases with floor/ceiling", refs(("L5", "p3"), ("N1", "f4"))),
    ("Q7(b)", "Divisibility proof for odd `n`", refs(("L5", "p2"), ("L5", "p3"), ("L5", "p-red"))),
    ("Q7(c)", "What's wrong with an AI proof?", refs(("L5", "p5"), ("L5", "p6"))),
    ("Challenge", "Everything from nand only", refs(("L6", "k6")) + " (trains the method with NOR; nand is left for you)"),
]
TUT1 = [
    ("Floor/ceiling/abs one-liners", refs(("N1", "f1"), ("N1", "f3"))),
    ("Counting evens in an interval, including negative bounds", refs(("N1", "f5"),)),
    ("`⌊m⌋ = ⌈m⌉` means `m` is an integer", refs(("N1", "f4"),)),
    ("Divisible by 3 or 5 in `[1, 666]` (left open by the tutor)", refs(("N1", "f6"), ("N1", "p-red"))),
    ("`pq | qr ⇒ p | r` (needs `q ≠ 0`)", refs(("L5", "p6"),)),
    ("`m` and `m + 1` are coprime", refs(("N2", "d3"), ("N2", "p-boss"))),
    ("`k | m` and equal remainders mod `m` ⇒ equal remainders mod `k` (and the slide's gap)", refs(("L5", "p-boss"),)),
    ("Quiz 1 walkthroughs (PS1 Q2a, Q4)", refs(("N2", "p-red"), ("S1", "p-red"))),
    ("gcd and lcm of a pair by Euclid", refs(("N2", "d5"), ("N2", "d6"))),
    ("Set operations drill with a small universe", refs(("S1", "e4"), ("S1", "e5"))),
    ("`Pow(A)`, `|Pow(A)|`, `A × A`, `|A × A|`", refs(("S3", "w1"), ("S3", "w5"))),
]
OTHER = [
    ("Reading: *Guidelines for Good Mathematical Writing* (F. E. Su), set for PS2", refs(("L5", "p1"),)),
    ("Program `euclid.python` (recursive gcd by subtraction)", refs(("N2", "d5"),)),
    ("Program `party.asp` (answer-set program for the party puzzle)", refs(("L3", "t6"),)),
]

out = ["# COMP9020 coverage map — Weeks 1–2", "",
       "Every lecture-slide section, lecture exercise, problem-set question, tutorial exercise, reading and course program,",
       "and the gym step that trains it. Links open that exact step on the live site.", "",
       "> Problem-set questions are listed by **number and skill only**. Their text and answers are never reproduced here:",
       "> the course pages forbid it. Every gym question is an original variation.", "",
       "Generated by the build script from the lesson files; every link below was checked to exist.", "",
       "## Week 1 lecture — Numbers, Sets, Formal Languages, Logic", "", "| Slides | Topic | Trained in |", "|---|---|---|"]
out += [f"| {esc(a)} | {esc(b)} | {c} |" for a, b, c in W1]
out += ["", "## Week 2 lecture — Logic, Proofs, Boolean Algebra", "", "| Slides | Topic | Trained in |", "|---|---|---|"]
out += [f"| {esc(a)} | {esc(b)} | {c} |" for a, b, c in W2]
out += ["", "## Problem set 1 — Numbers and Sets", "", "| Question | Skill | Trained in |", "|---|---|---|"]
out += [f"| {esc(a)} | {esc(b)} | {c} |" for a, b, c in PS1]
out += ["", "## Problem set 2 — Logic and Proofs", "", "| Question | Skill | Trained in |", "|---|---|---|"]
out += [f"| {esc(a)} | {esc(b)} | {c} |" for a, b, c in PS2]
out += ["", "## Tutorial 1 (Week 1 tutorial slides)", "", "| Exercise | Trained in |", "|---|---|"]
out += [f"| {esc(a)} | {b} |" for a, b in TUT1]
out += ["", "## Reading and course programs", "", "| Item | Trained in |", "|---|---|"]
out += [f"| {esc(a)} | {b} |" for a, b in OTHER]
out += ["", "## Not covered (and why)", "",
        "- **Week 2 tutorial slides:** not available when this map was built (only Tutorial 1 slides were shared).",
        "- **Week 1 slide 38** (constructing numbers from sets, Dedekind cuts): background only, no exercise.",
        "- **PS1 challenge** (magic square): a one-off puzzle, not a lecture skill.",
        "- **Lecture recordings (Moodle):** not accessible; the slides were used instead.", "",
        "## Quiz map", "",
        "| Quiz | Date | Questions | Drill here |", "|---|---|---|---|",
        f"| Quiz 1 | Thu 24 Sep 2026 | PS1 Q2(a), Q4 | {refs(('N2', 'p-red'), ('S1', 'p-red'))} |",
        f"| Quiz 2 | Thu 1 Oct 2026 | PS2 Q3(b), Q5(b) | {refs(('D2', 'round1'), ('D2', 'round2'), ('L4', 'p-red'), ('L2B', 'h-red'))} |",
        ""]
(REPO / "docs" / "COVERAGE_COMP9020.md").write_text("\n".join(out))
print("wrote coverage map;", sum(len(x) for x in (W1, W2, PS1, PS2, TUT1, OTHER)), "rows")
