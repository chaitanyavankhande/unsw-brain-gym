# UNSW Brain Gym — instructions for Claude

A static website (GitHub Pages) of interactive lessons and practice drills for the repo owner's
UNSW Master of IT courses. Live at **https://chaitanyavankhande.github.io/unsw-brain-gym/**.
Every answer starts hidden: the learner thinks, tries, then reveals. Lessons are shown **one step at a
time** (Start → one idea per step → one practice level per step → Finish), never as one long page.

**How to teach is in the guide below. It is not optional: read it before writing or editing any lesson.**

@docs/TEACHING_GUIDE.md

## Where things are

| Path | What |
|---|---|
| `index.html`, `comp9020/index.html` | Home and course pages (drawn from `catalog.json`) |
| `catalog.json` | Every course and unit, with status `ready` / `next` / `planned` |
| `<course>/<lesson>/lesson.json` | Lesson content. Format: `docs/LESSON_FORMAT.md` |
| `<course>/<lesson>/index.html` | Identical page shell (made by `tools/new_lesson.py`) |
| `assets/gym.js`, `assets/gym.css` | The one engine and stylesheet for every page |
| `tools/verify_answers.py` | Machine-checks every answer that has a `check` |
| `tools/lint_lessons.py` | Checks structure, no repeated examples, catalog consistency |
| `tools/logic.py` | Propositional-logic engine used by the checker (also reads `BA:` Boolean-algebra notation) |
| `tools/build_coverage.py` | Regenerates `docs/COVERAGE_COMP9020.md` and fails if a mapped step no longer exists |
| `docs/COVERAGE_COMP9020.md` | Every slide section / exercise / problem-set question → the step that trains it |
| `docs/ROADMAP.md` | What's built and what's next — update it when a lesson ships |

No build step, no framework, no dependencies. Plain HTML + CSS + vanilla JS + JSON.

## Workflow: building a lesson

1. **Read the source material fully** (lecture slides, tutorial slides) before deciding anything.
   Note slide numbers. Check the problem set's "Assessment" footer: it names the next quiz questions.
2. List the concepts **in lecture order**, with the known traps for each.
3. Scaffold: `python3 tools/new_lesson.py <course> <folder> <id> <code> "<title>"`.
4. Write `lesson.json` using the idea-step recipe and the practice ladder from the guide.
   Different example every time. Every answer labelled and explained.
5. Add a `check` to every answer that code can verify.
6. Run, and fix until clean:
   ```bash
   python3 tools/verify_answers.py     # must say 0 failures
   python3 tools/lint_lessons.py       # must say 0 errors
   python3 -m http.server              # click through EVERY step at desktop and phone width (~390px)
   ```
7. Update `catalog.json` (status `ready`, `path`, `group`), the neighbours' `prev`/`next`, `docs/ROADMAP.md`,
   and the coverage map (`tools/build_coverage.py`).
8. Commit with a clear message, then publish (below). Tell the learner the live URL of the new page.

Never ship a lesson with unchecked answers when a check is possible. Never mark `"verified": true`
unless `verify_answers.py` passes for that file.

## Publishing (git push)

- **Claude Code on the owner's Mac:** normal `git push` with his own GitHub login.
- **A cloud Claude session:** the cloud workspace's git proxy only pushes to repositories attached to
  that session, so a plain push from there fails with 403. Either attach this repo to the session, or,
  if the session is linked to the owner's Mac, push from the Mac's shell instead.
- **Credentials:** a fine-grained token scoped to this repo only (Contents: read & write). Ask the owner
  for it, or check the Claude project note about this gym. **Never** write a token into any file in this
  repo, into a remote URL, or into `.git/config`. Pass it only through a one-off credential helper, e.g.
  `git -c credential.helper= -c 'credential.helper=!f(){ echo username=x-access-token; echo "password=$GHTOK"; }; f' push`.
- Pages rebuilds from `main` about a minute after a push.

## Hard rules

- The site is **public**. No problem-set text, no problem-set answers, no copied slides, no personal data,
  no secrets. Quiz drills are original variations, and a variation must not be the problem-set formula with its letters
  renamed or negated. (Details in the guide → Academic integrity.)
- Keep `CLAUDE.md` under 200 lines. Put teaching detail in `docs/TEACHING_GUIDE.md`,
  format detail in `docs/LESSON_FORMAT.md`.
- Keep the engine small and dependency-free. New interaction types go into `assets/gym.js` as a new block
  type, documented in `docs/LESSON_FORMAT.md` and accepted by `tools/lint_lessons.py`.
- Progress is stored in the browser's localStorage under `ubg:v1:<lessonId>:<itemId>`. Changing an item's
  `id` resets its saved ✅/❌, so don't rename ids casually.
