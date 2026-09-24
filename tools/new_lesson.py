#!/usr/bin/env python3
"""Scaffold a new lesson or drill folder.

Usage:
  python3 tools/new_lesson.py <course> <folder> <id> <code> "<title>"
Example:
  python3 tools/new_lesson.py comp9020 l3-truth-tables comp9020-l3 L3 "Truth-Table Detective"

Creates <course>/<folder>/index.html (page shell) and lesson.json (skeleton to fill in).
Then: write the lesson (docs/TEACHING_GUIDE.md), set the unit's status to "ready" and its
"path" in catalog.json, and run the checks in CLAUDE.md before pushing.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

SHELL = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{code} · {title} — UNSW Brain Gym</title>
<meta name="description" content="{title}">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧠</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=JetBrains+Mono:wght@500;700&display=swap">
<link rel="stylesheet" href="../../assets/gym.css">
</head>
<body data-page="lesson" data-root="../../">
<div id="app"><p class="wrap" style="padding-block:40px">Loading…</p></div>
<noscript><p class="wrap">This page needs JavaScript to show its questions and answers.</p></noscript>
<script src="../../assets/gym.js"></script>
</body>
</html>
"""


def main(argv):
    if len(argv) != 5:
        print(__doc__)
        return 2
    course, folder, lid, code, title = argv
    d = ROOT / course / folder
    if d.exists():
        print(f"{d} already exists")
        return 1
    d.mkdir(parents=True)
    (d / "index.html").write_text(SHELL.format(code=code, title=title))
    skeleton = {
        "id": lid, "course": {"code": course.upper(), "href": "../"}, "code": code, "emoji": "", "title": title,
        "eyebrow": "", "minutes": 40, "verified": False, "goal": "", "magic": [],
        "blocks": [
            {"type": "section", "id": "learn", "title": "💡 Learn it, one idea at a time"},
            {"type": "idea", "id": "i1", "short": "", "title": "", "summary": "", "picture": "", "official": "",
             "watch": {"q": "", "steps": [], "answer": ""}, "tries": [], "trap": {"tempting": "", "correct": "", "test": ""}, "magic": ""},
            {"type": "section", "id": "practice", "title": "🏋️ Practice ladder"},
            {"type": "practice", "id": "p-green", "level": "green", "items": []},
            {"type": "practice", "id": "p-yellow", "level": "yellow", "items": []},
            {"type": "practice", "id": "p-red", "level": "red", "title": "🔴 Quiz level", "items": []},
            {"type": "practice", "id": "p-boss", "level": "boss", "items": []},
            {"type": "practice", "id": "p-retest", "level": "retest", "items": []},
            {"type": "recap", "lines": []},
            {"type": "links", "id": "links", "items": []},
        ],
        "sources": "", "prev": None, "next": None,
    }
    (d / "lesson.json").write_text(json.dumps(skeleton, ensure_ascii=False, indent=1) + "\n")
    print(f"Created {d.relative_to(ROOT)}/index.html and lesson.json")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
