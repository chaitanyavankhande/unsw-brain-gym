#!/usr/bin/env python3
"""Check that every lesson follows docs/LESSON_FORMAT.md and docs/TEACHING_GUIDE.md.

Usage:  python3 tools/lint_lessons.py
Fails (exit 1) on errors. Prints warnings for things worth a second look.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
errors, warnings = [], []


def err(where, msg):
    errors.append(f"❌ {where}: {msg}")


def warn(where, msg):
    warnings.append(f"⚠️  {where}: {msg}")


def norm(s):
    s = re.sub(r"[`*]", "", s or "").lower()
    return re.sub(r"[^a-z0-9⇒⇔¬∧∨⊕]+", " ", s).strip()


def markup_ok(where, s):
    if not isinstance(s, str):
        return
    if s.count("`") % 2:
        err(where, f"odd number of backticks in: {s[:70]}")
    if s.count("**") % 2:
        err(where, f"odd number of ** in: {s[:70]}")


def walk_strings(obj, where):
    if isinstance(obj, str):
        markup_ok(where, obj)
    elif isinstance(obj, list):
        for i, x in enumerate(obj):
            walk_strings(x, f"{where}[{i}]")
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if k != "check":
                walk_strings(v, f"{where}.{k}")


def lint_item(it, where, ids, seen_q, in_retest=False):
    iid = it.get("id")
    if not iid:
        err(where, "item has no id")
        return
    if iid in ids:
        err(where, f"duplicate id {iid}")
    ids.add(iid)
    w = f"{where}#{iid}"
    if not it.get("q"):
        err(w, "missing q (question)")
    if not it.get("a"):
        err(w, "missing a (answer)")
    if not in_retest and not (it.get("why") or it.get("steps")):
        warn(w, "no 'why' — answers should explain themselves")
    key = norm(it.get("q"))
    if key and key in seen_q:
        err(w, f"same question as {seen_q[key]} — every example must be different")
    seen_q[key] = iid
    if "options" in it:
        c = it.get("correct")
        if not c:
            err(w, "options without a 'correct' list")
        elif any(i < 0 or i >= len(it["options"]) for i in c):
            err(w, "'correct' index out of range")
        elif len(c) > 1 and not it.get("multi"):
            err(w, "more than one correct option but 'multi' is not true")
        if not it.get("check") and not it.get("nocheck"):
            warn(w, "option item without a machine check (add check, or nocheck with a reason)")


def lint_lesson(path):
    rel = path.relative_to(ROOT)
    try:
        L = json.loads(path.read_text())
    except json.JSONDecodeError as e:
        err(rel, f"invalid JSON: {e}")
        return None
    for key in ("id", "title", "blocks"):
        if key not in L:
            err(rel, f"missing top-level '{key}'")
    for key in ("goal", "roadmap", "magic"):
        if not L.get(key):
            warn(rel, f"missing '{key}' (book-style opening: goal → roadmap → magic sentences)")
    walk_strings(L, str(rel))
    ids, seen_q, seen_s = set(), {}, {}
    n_items = 0
    for bi, b in enumerate(L.get("blocks", [])):
        where = f"{rel} block {bi} ({b.get('type')} {b.get('id', '')})"
        t = b.get("type")
        if t == "idea":
            for k in ("title", "picture", "official"):
                if not b.get(k):
                    err(where, f"idea missing '{k}'")
            if not b.get("watch"):
                warn(where, "idea has no 'watch' worked example")
            if not b.get("trap"):
                warn(where, "idea has no 'trap'")
            for it in b.get("tries", []):
                lint_item(it, where, ids, seen_q)
                n_items += 1
        elif t == "practice":
            for it in b.get("items", []):
                lint_item(it, where, ids, seen_q, in_retest=b.get("level") == "retest")
                n_items += 1
        elif t == "table":
            for r in b.get("rows", []):
                if len(r.get("cells", [])) != len(b.get("columns", [])):
                    err(where, "row has a different number of cells than columns")
                for c in r.get("cells", []):
                    if isinstance(c, dict):
                        if c.get("id") in ids:
                            err(where, f"duplicate id {c.get('id')}")
                        ids.add(c.get("id"))
                        if not c.get("a"):
                            err(where, f"cell {c.get('id')} missing answer")
                        k = norm(c.get("s"))
                        if k in seen_s:
                            err(where, f"cell {c.get('id')} repeats sentence of {seen_s[k]}")
                        seen_s[k] = c.get("id")
                        n_items += 1
        elif t == "links":
            for x in b.get("items", []):
                if not str(x.get("url", "")).startswith("https://"):
                    err(where, f"link must be https: {x.get('url')}")
                if not x.get("checked"):
                    warn(where, f"link not marked as checked: {x.get('title')}")
        elif t in ("section", "callout", "recap", "grid", "steps"):
            pass
        else:
            err(where, f"unknown block type {t!r}")
    if n_items < 15 and "drill" not in str(rel):
        warn(rel, f"only {n_items} questions — lessons should have plenty of practice (15+)")
    return L


def main():
    catalog = json.loads((ROOT / "catalog.json").read_text())
    lessons = {}
    for p in sorted(ROOT.glob("*/**/lesson.json")):
        L = lint_lesson(p)
        if L:
            lessons[L["id"]] = p
    for c in catalog["courses"]:
        cdir = ROOT / c["href"]
        if not (cdir / "index.html").exists():
            err("catalog", f"{c['id']}: {c['href']}index.html missing")
        for u in c["units"]:
            if u.get("status") == "ready":
                ldir = cdir / u["path"]
                if not (ldir / "index.html").exists() or not (ldir / "lesson.json").exists():
                    err("catalog", f"{u['id']}: {ldir.relative_to(ROOT)} needs index.html + lesson.json")
                elif json.loads((ldir / "lesson.json").read_text()).get("id") != u["id"]:
                    err("catalog", f"{u['id']}: lesson.json id doesn't match catalog id")
    orphan = set(lessons) - {u["id"] for c in catalog["courses"] for u in c["units"]}
    for o in orphan:
        warn("catalog", f"{o} ({lessons[o].relative_to(ROOT)}) is not listed in catalog.json")
    print("\n".join(errors + warnings) or "No problems found.")
    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
