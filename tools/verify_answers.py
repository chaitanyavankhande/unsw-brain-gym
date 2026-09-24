#!/usr/bin/env python3
"""Machine-check every answer that carries a `check` in any lesson.json.

Usage:  python3 tools/verify_answers.py            # all lessons
        python3 tools/verify_answers.py comp9020/l2-if-then/lesson.json

Exit code 1 if any check fails. See docs/LESSON_FORMAT.md → "Checks".
"""
import itertools
import json
import math
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import logic  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent


def strip(s):
    return s.replace("`", "").replace("**", "").strip()


def env_str(env):
    return ", ".join(f"{k}={'T' if v else 'F'}" for k, v in sorted(env.items())) if env else "-"


# ---------------------------------------------------------------------------
# `calc` checks: numbers, sets, words. A tiny, dependency-free sandbox of helpers.
def _pow(S):
    S = list(S)
    return {frozenset(c) for r in range(len(S) + 1) for c in itertools.combinations(S, r)}


def _words(alpha, k):
    return {"".join(w) for w in itertools.product(sorted(alpha), repeat=k)}


def _divides(m, n):
    return n == 0 if m == 0 else n % m == 0


CALC_ENV = {
    "__builtins__": {},
    "floor": math.floor, "ceil": math.ceil, "gcd": math.gcd, "lcm": math.lcm, "sqrt": math.sqrt,
    "isqrt": math.isqrt, "comb": math.comb, "factorial": math.factorial, "pi": math.pi, "e": math.e,
    "abs": abs, "all": all, "any": any, "range": range, "len": len, "set": set, "frozenset": frozenset,
    "sorted": sorted, "sum": sum, "min": min, "max": max, "list": list, "tuple": tuple, "int": int,
    "str": str, "bool": bool, "round": round, "zip": zip, "enumerate": enumerate, "print": print,
    "mod": lambda n, m: n % m,                      # course definition: 0 <= r < m for m > 0
    "divides": _divides,                            # m | n
    "count_mult": lambda k, n, m: sum(1 for x in range(n, m + 1) if x % k == 0),  # brute force
    "Pow": _pow,
    "subsets": _pow,
    "cart": lambda *S: set(itertools.product(*S)),
    "words": _words,                                # all words of length k over alphabet
    "upto": lambda a, n: set().union(*[_words(a, k) for k in range(n + 1)]),
    "lam": "",                                      # the empty word λ
    "is_prime": lambda n: n > 1 and all(n % d for d in range(2, math.isqrt(n) + 1)),
    "product": itertools.product,
    "match": lambda pattern, w: re.fullmatch(pattern, w) is not None,  # grammar membership via a regex
}


def calc(expr, extra=None):
    env = dict(CALC_ENV)
    if extra:
        for k, v in extra.items():
            env[k] = eval(v, dict(env))  # noqa: S307 — our own lesson files only
    return eval(expr, env)  # noqa: S307


def run_check(chk, item):
    """Return (ok, message)."""
    kind = chk.get("kind")
    if kind == "value":
        got = logic.value(chk["f"])
        return got == chk["expect"], f"value {chk['f']} = {got}, expected {chk['expect']}"
    if kind == "equiv":
        same, env = logic.equivalent(chk["f"], chk["g"])
        exp = chk.get("expect", True)
        return same == exp, f"{chk['f']} ≡ {chk['g']}: {same} (expected {exp}; differing row {env_str(env)})"
    if kind == "valid":
        ok, env = logic.valid(chk["f"])
        exp = chk.get("expect", True)
        return ok == exp, f"valid({chk['f']}) = {ok} (expected {exp}; failing row {env_str(env)})"
    if kind == "entails":
        ok, env = logic.entails(chk["premises"], chk["f"])
        exp = chk.get("expect", True)
        return ok == exp, f"{chk['premises']} ⊨ {chk['f']}: {ok} (expected {exp}; counter-row {env_str(env)})"
    if kind == "falsifying":
        want = sorted([sorted(r.items()) for r in chk["rows"]])
        names = set().union(*[set(r) for r in chk["rows"]]) if chk["rows"] else set()
        got = sorted([sorted(r.items()) for r in logic.falsifying(chk["f"], names)])
        return got == want, f"rows making {chk['f']} false: {got} (expected {want})"
    if kind == "calc":
        got = calc(chk["expr"], chk.get("let"))
        if "is" in chk:
            want = calc(chk["is"], chk.get("let"))
        else:
            want = chk.get("expect", True)
        ok = got == want
        if isinstance(got, float) or isinstance(want, float):
            ok = abs(got - want) < 1e-9
        return ok, f"calc {chk['expr']} = {got!r}, expected {want!r}"
    if kind == "options_calc":
        vals = [bool(calc(x, chk.get("let"))) for x in chk["exprs"]]
        truth = [i for i, v in enumerate(vals) if v]
        want = sorted(item["correct"])
        if len(chk["exprs"]) != len(item["options"]):
            return False, "options_calc needs one expression per option"
        return truth == want, f"options that are true: {[i + 1 for i in truth]} (answer key says {[i + 1 for i in want]})"
    if kind in ("options_valid", "options_sat"):
        pre = "BA:" if chk.get("ba") else ""
        nodes = [logic.parse(pre + strip(o)) for o in item["options"]]
        if kind == "options_valid":
            truth = [i for i, n in enumerate(nodes) if all(logic.evaluate(n, env) for env in logic.rows(logic.variables(n)))]
        else:
            truth = [i for i, n in enumerate(nodes) if any(logic.evaluate(n, env) for env in logic.rows(logic.variables(n)))]
        want = sorted(item["correct"])
        word = "valid" if kind == "options_valid" else "satisfiable"
        return truth == want, f"{word} options: {[i + 1 for i in truth]} (answer key says {[i + 1 for i in want]})"
    if kind == "options_equiv_any":
        pre = "BA:" if chk.get("ba") else ""
        opts = [pre + strip(o) for o in item["options"]]
        truth = [i for i, o in enumerate(opts) if any(logic.equivalent(t, o)[0] for t in chk["targets"])]
        want = sorted(item["correct"])
        return truth == want, f"options equivalent to one of {chk['targets']}: {[i + 1 for i in truth]} (answer key says {[i + 1 for i in want]})"
    if kind == "options_equiv":
        opts = [("BA:" if chk.get("ba") else "") + strip(o) for o in item["options"]]
        truth = [i for i, o in enumerate(opts) if logic.equivalent(chk["target"], o)[0]]
        want = sorted(item["correct"])
        return truth == want, f"options equivalent to {chk['target']}: {[i + 1 for i in truth]} (answer key says {[i + 1 for i in want]})"
    if kind == "options_falsify":
        truth = [i for i, r in enumerate(chk["rows"]) if not logic.evaluate(logic.parse(chk["f"]), r)]
        want = sorted(item["correct"])
        return truth == want, f"options that break {chk['f']}: {[i + 1 for i in truth]} (answer key says {[i + 1 for i in want]})"
    if kind == "options_entailed":
        opts = [("BA:" if chk.get("ba") else "") + strip(o) for o in item["options"]]
        truth = [i for i, o in enumerate(opts) if logic.entails(chk["premises"], o)[0]]
        want = sorted(item["correct"])
        return truth == want, f"options entailed by {chk['premises']}: {[i + 1 for i in truth]} (answer key says {[i + 1 for i in want]})"
    return False, f"unknown check kind {kind!r}"


def walk_items(lesson):
    """Yield (item_id, item_dict) for every answerable thing plus lesson-level checks."""
    for b in lesson.get("blocks", []):
        for it in b.get("tries", []) + b.get("items", []):
            yield it.get("id"), it
    for i, chk in enumerate(lesson.get("checks", [])):
        yield f"lesson-check-{i + 1}", {"check": chk}


def verify_file(path):
    lesson = json.loads(pathlib.Path(path).read_text())
    n = bad = 0
    for iid, item in walk_items(lesson):
        checks = item.get("check")
        if not checks:
            continue
        for chk in checks if isinstance(checks, list) else [checks]:
            n += 1
            try:
                ok, msg = run_check(chk, item)
            except Exception as e:  # noqa: BLE001
                ok, msg = False, f"error: {e}"
            if not ok:
                bad += 1
                print(f"  ❌ {iid}: {msg}")
    return n, bad


def main(argv):
    files = [pathlib.Path(a) for a in argv] or sorted(ROOT.glob("*/**/lesson.json"))
    total = failed = 0
    for f in files:
        n, bad = verify_file(f)
        total += n
        failed += bad
        print(f"{'✅' if not bad else '❌'} {f.relative_to(ROOT) if f.is_absolute() else f}: {n - bad}/{n} checks pass")
    print(f"\n{total - failed}/{total} checks pass overall")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
