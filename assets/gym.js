/* UNSW Brain Gym — one engine for every page.
 *
 * Pages declare what they are on <body>:
 *   data-page="home"                      → renders catalog.json as the home page
 *   data-page="course" data-course="id"   → renders one course from catalog.json
 *   data-page="lesson"                    → renders ./lesson.json as a step-by-step lesson
 *   data-root="../../"                    → relative path back to the site root
 *
 * A lesson is shown ONE STEP AT A TIME (focus mode):
 *   Start → one step per idea → one step per practice level → Finish.
 * The URL hash is the current step (#i2, #p-red, #finish, #review).
 * Lesson format: docs/LESSON_FORMAT.md. Progress lives in localStorage (per device).
 */
(function () {
  'use strict';

  var NS = 'ubg:v1:';
  var store = {
    get: function (k) { try { return window.localStorage.getItem(NS + k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(NS + k, v); } catch (e) { /* private mode */ } },
    del: function (k) { try { window.localStorage.removeItem(NS + k); } catch (e) { /* ignore */ } }
  };
  function getJSONStore(k) { try { return JSON.parse(store.get(k) || 'null'); } catch (e) { return null; } }

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); }

  /* Tiny markup: `code`, **bold**, *italic*, [text](https://url), \n → line break. Everything else is escaped. */
  function md(s) {
    if (s === undefined || s === null) return '';
    var h = esc(s);
    var codes = [];  // protect `code` spans (they may contain * like Σ*)
    h = h.replace(/`([^`]+)`/g, function (_, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    h = h.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?=[^*\w]|$)/g, '$1<em>$2</em>');
    h = h.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    h = h.replace(/\n/g, '<br>');
    h = h.replace(/\u0000(\d+)\u0000/g, function (_, i) {
      var c = codes[+i];  // long formulas may wrap at spaces so they never push the page wider than a phone
      return (c.length > 22 ? '<code class="long">' : '<code>') + c + '</code>';
    });
    return h;
  }
  function plain(s) { return String(s || '').replace(/[`*]/g, ''); }

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) return;
        if (k === 'class') e.className = v; else e.setAttribute(k, v === true ? '' : v);
      });
    }
    if (html !== undefined && html !== null) e.innerHTML = html;
    return e;
  }

  var ROOT = document.body.getAttribute('data-root') || '';
  var app = document.getElementById('app');

  function topbar(crumbs) {
    var c = (crumbs || []).map(function (x) {
      return x.href ? '<a href="' + esc(x.href) + '">' + esc(x.label) + '</a>' : '<span>' + esc(x.label) + '</span>';
    }).join('<span aria-hidden="true">›</span>');
    return '<header class="topbar"><div class="wrap"><a class="brand" href="' + esc(ROOT || './') + '">🧠 UNSW <span>Brain Gym</span></a>' +
      (c ? '<nav class="crumbs" aria-label="Breadcrumb"><span aria-hidden="true">›</span>' + c + '</nav>' : '') + '</div></header>';
  }

  function fail(msg) {
    app.innerHTML = topbar() + '<div class="wrap err"><h2>Couldn\'t load this page</h2><p>' + esc(msg) +
      '</p><p>Opened the file straight from disk? Run <code>python3 -m http.server</code> in the repo folder and open <code>http://localhost:8000</code>.</p></div>';
  }

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' → HTTP ' + r.status);
      return r.json();
    });
  }

  /* ======================================================================
   * LESSON PAGE
   * ==================================================================== */
  var L = null;          // lesson data
  var steps = [];        // [{id, kind, title, short, summary, blocks, el, recs}]
  var stepById = {};
  var recs = [];         // every answerable thing
  var cur = null;        // current step id

  var LEVELS = {
    green: { t: '🟢 Warm-up', s: 'Warm-up' },
    yellow: { t: '🟡 Getting there', s: 'Getting there' },
    red: { t: '🔴 Quiz level', s: 'Quiz level' },
    boss: { t: '🟣 Boss level', s: 'Boss level' },
    retest: { t: '🔁 Retest in 2 days', s: 'Retest' }
  };

  function buildSteps(data) {
    var out = [{ id: 'start', kind: 'start', title: 'Start here', short: 'Start', blocks: [] }];
    var finish = { id: 'finish', kind: 'finish', title: 'Finish line', short: 'Finish', blocks: [] };
    var group = '', last = null, ideaN = 0;
    (data.blocks || []).forEach(function (b) {
      if (b.type === 'section') { group = b.title; return; }
      if (b.type === 'recap' || b.type === 'links') { finish.blocks.push(b); return; }
      if (b.type === 'idea') {
        ideaN += 1;
        last = { id: b.id, kind: 'idea', n: ideaN, title: b.title, short: b.short || b.title, summary: b.summary, group: group, blocks: [b] };
        out.push(last);
        return;
      }
      if (b.type === 'practice') {
        var lv = LEVELS[b.level] || { t: 'Practice', s: 'Practice' };
        last = { id: b.id, kind: 'practice', level: b.level, title: b.title || lv.t, short: b.toc || lv.s,
          summary: b.summary || b.sub, group: group, blocks: [b] };
        out.push(last);
        return;
      }
      if (b.type === 'table' && (!last || b.step)) {
        last = { id: b.id, kind: 'table', title: b.title, short: b.toc || b.title, summary: b.summary || b.sub, group: group, blocks: [b] };
        out.push(last);
        return;
      }
      if (last) last.blocks.push(b);
      else { last = { id: b.id || 'part' + out.length, kind: 'misc', title: b.title || '', short: b.title || '', group: group, blocks: [b] }; out.push(last); }
    });
    out.push(finish);
    var ideas = out.filter(function (s) { return s.kind === 'idea'; }).length;
    out.forEach(function (s, i) { s.index = i; s.ideas = ideas; s.recs = []; });
    return out;
  }

  function renderLesson(data) {
    L = data;
    document.title = (L.code ? L.code + ' · ' : '') + L.title + ' — UNSW Brain Gym';
    steps = buildSteps(L);
    steps.forEach(function (s) { stepById[s.id] = s; });

    var crumbs = (L.course ? [{ label: L.course.code, href: L.course.href || '../' }] : []).concat([{ label: (L.code ? L.code + ' · ' : '') + L.title }]);
    app.innerHTML = topbar(crumbs) +
      '<div class="lessonbar" id="lessonbar"><div class="wrap narrow">' +
        '<div class="lb-row"><span class="lb-step" id="lbStep"></span>' +
        '<details class="menu" id="menu"><summary>⚙️ Options</summary><div class="menu-pop">' +
          '<label class="tog"><input type="checkbox" id="hard"> <span><b>Hard mode</b><small>Hides hints and helper columns</small></span></label>' +
          '<button type="button" class="menu-btn" id="reviewBtn">🔁 Review my ❌ <span id="missN"></span></button>' +
          '<button type="button" class="menu-btn subtle" id="reset">Reset my ✅/❌ marks</button>' +
        '</div></details></div>' +
        '<nav class="segbar" id="segbar" aria-label="Lesson steps"></nav>' +
      '</div></div>' +
      '<main class="wrap narrow" id="main"></main>';

    var main = document.getElementById('main');
    steps.forEach(function (s) {
      s.el = el('section', { class: 'step step-' + s.kind, id: 'step-' + s.id, 'data-step': s.id, hidden: true });
      main.appendChild(s.el);
    });
    steps.forEach(function (s) { renderStep(s); });

    document.getElementById('segbar').innerHTML = steps.map(function (s) {
      return '<a class="sg" href="#' + esc(s.id) + '" data-step="' + esc(s.id) + '" title="' + esc(plain(s.short)) + '" aria-label="' + esc(plain(s.short)) + '"></a>';
    }).join('');

    wireLessonControls();
    restoreMarks();
    updateAll();
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', function (e) {
      if (e.altKey || e.metaKey || e.ctrlKey || /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { var n = neighbour(1); if (n) location.hash = n.id; }
      if (e.key === 'ArrowLeft') { var p = neighbour(-1); if (p) location.hash = p.id; }
    });
    route();
  }

  function neighbour(d) {
    var s = stepById[cur];
    if (!s) return null;
    return steps[s.index + d] || null;
  }

  function route() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    // old deep links to a block inside a step (e.g. #decoder) → open that step
    if (id && !stepById[id] && id !== 'review') {
      var node = document.getElementById(id) || document.getElementById('it-' + id);
      var host = node && node.closest('.step');
      id = host ? host.getAttribute('data-step') : 'start';
    }
    if (!id) id = 'start';
    document.getElementById('menu').open = false;
    if (id === 'review') return showReview();
    document.body.classList.remove('misses');
    cur = id;
    steps.forEach(function (s) { s.el.hidden = s.id !== id; });
    var s = stepById[id];
    if (s.kind === 'finish') refreshFinish();
    if (s.kind === 'start') refreshStart();
    updateLessonbar();
    window.scrollTo(0, 0);
    if (s.kind !== 'start' && s.kind !== 'finish') {
      store.set(L.id + ':step', id);
      store.set('last', JSON.stringify({ href: location.pathname + '#' + id, title: (L.code ? L.code + ' · ' : '') + L.title, step: plain(s.short), course: L.course ? L.course.code : '' }));
    }
  }

  function showReview() {
    cur = 'review';
    document.body.classList.add('misses');
    steps.forEach(function (s) { s.el.hidden = s.kind === 'start' || s.kind === 'finish'; });
    var n = recs.filter(function (r) { return r.mark === 'miss'; }).length;
    var banner = document.getElementById('reviewBanner');
    if (!banner) {
      banner = el('div', { class: 'review-banner', id: 'reviewBanner' });
      document.getElementById('main').insertBefore(banner, document.getElementById('main').firstChild);
    }
    banner.innerHTML = n
      ? '<h2>🔁 Review: your ' + n + ' ❌</h2><p>Only the questions you marked ❌ are shown. Try each one again before you reveal it. Mark ✅ when you get it right, and it leaves this list next time.</p><a class="navbtn next" href="#start">Done reviewing</a>'
      : '<h2>🔁 Nothing to review</h2><p>You have no ❌ marks in this lesson. Nice.</p><a class="navbtn next" href="#start">Back to the start</a>';
    banner.hidden = false;
    updateLessonbar();
    window.scrollTo(0, 0);
  }

  function updateLessonbar() {
    var lb = document.getElementById('lbStep');
    var rb = document.getElementById('reviewBanner');
    if (rb && cur !== 'review') rb.hidden = true;
    if (cur === 'review') {
      lb.innerHTML = '<b>Review mode</b>';
    } else {
      var s = stepById[cur];
      var label = s.kind === 'idea' ? 'Idea ' + s.n + ' of ' + s.ideas : (s.kind === 'practice' ? 'Practice' : '');
      lb.innerHTML = '<span class="lb-count">' + (s.index + 1) + '/' + steps.length + '</span> ' +
        (label ? '<span class="lb-kind">' + esc(label) + '</span> ' : '') + '<b>' + md(s.short) + '</b>';
    }
    document.querySelectorAll('#segbar .sg').forEach(function (a) {
      var s = stepById[a.getAttribute('data-step')];
      var st = stepStatus(s);
      a.className = 'sg' + (s.id === cur ? ' cur' : '') + (st.total && st.marked === st.total ? ' done' : (st.marked ? ' part' : '')) +
        (!st.total && visited(s) ? ' done' : '');
    });
  }

  function visited(s) { return !!store.get(L.id + ':seen:' + s.id); }

  function stepStatus(s) {
    var t = s.recs.length, got = 0, miss = 0, open = 0;
    s.recs.forEach(function (r) { if (r.mark === 'got') got++; if (r.mark === 'miss') miss++; if (r.open) open++; });
    return { total: t, got: got, miss: miss, marked: got + miss, open: open };
  }

  /* ---------- step rendering ---------- */
  function stepHead(s, eyebrow, title, sub) {
    return '<header class="step-head"><div class="eyebrow">' + md(eyebrow) + '</div><h2>' + md(title) + '</h2>' +
      (sub ? '<p class="step-sub">' + md(sub) + '</p>' : '') + '</header>';
  }

  function renderStep(s) {
    var host = s.el;
    if (s.kind === 'start') return renderStart(s);
    if (s.kind === 'finish') return renderFinish(s);

    if (s.kind === 'idea') {
      var b = s.blocks[0];
      host.innerHTML = stepHead(s, 'Idea ' + s.n + ' of ' + s.ideas, b.title);
      host.appendChild(renderLearn(b));
      if (b.tries && b.tries.length) host.appendChild(renderTurn(s, b.tries, '✋ Your turn', 'Think first, write your answer, then reveal.'));
      s.blocks.slice(1).forEach(function (x) { host.appendChild(renderExtra(s, x)); });
    } else if (s.kind === 'practice') {
      var p = s.blocks[0];
      host.innerHTML = stepHead(s, 'Practice' + (p.level === 'retest' ? ' · later' : ''), s.title, p.sub);
      host.appendChild(renderTurn(s, p.items || [], null, null));
      s.blocks.slice(1).forEach(function (x) { host.appendChild(renderExtra(s, x)); });
    } else {
      var t = s.blocks[0];
      host.innerHTML = stepHead(s, 'Drill', t.title, t.sub);
      s.blocks.forEach(function (x, i) { host.appendChild(i === 0 && x.type === 'table' ? renderRevealTable(s, x, true) : renderExtra(s, x)); });
    }
    host.appendChild(renderStepFoot(s));
  }

  function renderExtra(s, b) {
    switch (b.type) {
      case 'table': return renderRevealTable(s, b);
      case 'grid': return renderGridBox(b);
      case 'steps': return renderSteps(b);
      case 'callout': return renderCallout(b);
      case 'practice': return renderTurn(s, b.items || [], b.title || (LEVELS[b.level] || {}).t, b.sub);
      default: return el('div', { class: 'callout trap' }, 'Unknown block type: ' + esc(b.type));
    }
  }

  function renderLearn(b) {
    var wrap = el('div', { class: 'learn teach' });
    var h = '';
    if (b.picture) h += '<div class="card-picture"><span class="lab">🧒 Picture it</span><p>' + md(b.picture) + '</p></div>';
    if (b.official) h += '<div class="card-official"><span class="lab">🎓 In the lecture\'s words</span><p>' + md(b.official) + '</p></div>';
    if (b.grid) h += '<div class="card-grid">' + (b.grid.title ? '<span class="lab">📊 ' + md(b.grid.title) + '</span>' : '') + gridTable(b.grid) + '</div>';
    wrap.innerHTML = h;
    if (b.watch) wrap.appendChild(renderWatch(b.watch));
    var tail = '';
    if (b.trap) {
      tail += '<div class="card-trap"><span class="lab">🪤 The trap</span><div class="trap">' +
        '<div class="tempt"><span class="t-lab">Tempting ❌</span>' + md(b.trap.tempting) + '</div>' +
        '<div class="right"><span class="t-lab">Correct ✅</span>' + md(b.trap.correct) + '</div></div>' +
        (b.trap.test ? '<p class="trap-test">🔎 <b>Catch it:</b> ' + md(b.trap.test) + '</p>' : '') + '</div>';
    }
    if (b.magic) tail += '<div class="remember"><span class="lab">🔑 Remember</span><p>' + md(b.magic) + '</p></div>';
    if (tail) wrap.insertAdjacentHTML('beforeend', tail);
    return wrap;
  }

  function renderWatch(w) {
    var d = el('div', { class: 'card-watch' });
    var n = (w.steps || []).length;
    d.innerHTML = '<span class="lab">👀 Watch me do one</span><p class="wq">' + md(w.q) + '</p>' +
      (n ? '<ol class="wsteps">' + w.steps.map(function (x) { return '<li hidden>' + md(x) + '</li>'; }).join('') + '</ol>' : '') +
      (w.answer ? '<p class="final" hidden>➜ ' + md(w.answer) + '</p>' : '') +
      '<div class="row-actions"><button type="button" class="btn solid" data-act="next">▶ Walk me through it</button>' +
      '<button type="button" class="btn" data-act="all">Show the whole example</button></div>';
    var lis = d.querySelectorAll('.wsteps li'), fin = d.querySelector('.final');
    var nextB = d.querySelector('[data-act="next"]'), allB = d.querySelector('[data-act="all"]');
    function shown() { var k = 0; lis.forEach(function (li) { if (!li.hidden) k++; }); return k; }
    function refresh() {
      var k = shown();
      if (k >= n && (!fin || !fin.hidden)) { nextB.hidden = true; allB.hidden = true; return; }
      nextB.textContent = k === 0 ? '▶ Walk me through it' : (k < n ? '▶ Next step (' + (k + 1) + ' of ' + n + ')' : '▶ Show the answer');
    }
    nextB.addEventListener('click', function () {
      var k = shown();
      if (k < n) lis[k].hidden = false; else if (fin) fin.hidden = false;
      refresh();
    });
    allB.addEventListener('click', function () { lis.forEach(function (li) { li.hidden = false; }); if (fin) fin.hidden = false; refresh(); });
    if (!n && fin) { nextB.textContent = '▶ Show the answer'; allB.hidden = true; }
    return d;
  }

  function renderTurn(s, items, title, sub) {
    var box = el('div', { class: 'turn block' });
    box.innerHTML = '<div class="turn-head">' +
      (title ? '<div><h3>' + md(title) + ' <span class="cnt">' + items.length + '</span></h3>' + (sub ? '<p>' + md(sub) + '</p>' : '') + '</div>' : '<div></div>') +
      '<div class="mini-seg"><button type="button" data-act="show">Show all</button><button type="button" data-act="hide">Hide all</button></div></div>';
    var list = el('div', { class: 'items' });
    items.forEach(function (it, i) { list.appendChild(renderItem(it, i + 1, s, box)); });
    box.appendChild(list);
    box.querySelector('[data-act="show"]').addEventListener('click', function () { s.recs.forEach(function (r) { setOpen(r, true, true); }); updateAll(); });
    box.querySelector('[data-act="hide"]').addEventListener('click', function () { s.recs.forEach(function (r) { setOpen(r, false, true); }); updateAll(); });
    return box;
  }

  function lettersHTML(letters) {
    return '<div class="letters">' + String(letters).split(/\s+·\s+/).map(function (x) {
      return '<span class="lchip">' + md(x) + '</span>';
    }).join('') + '</div>';
  }

  function renderItem(it, num, s, blockEl) {
    var d = el('div', { class: 'item', id: 'it-' + it.id, 'data-id': it.id });
    var labels = it.labels || '123456789';
    var h = '<div class="item-top"><span class="num">' + num + '</span>' + (it.letters ? lettersHTML(it.letters) : '') +
      '<span class="badge" aria-hidden="true"></span></div>';
    h += '<p class="q">' + md(it.q) + '</p>';
    if (it.grid) h += '<div class="q-grid">' + (it.grid.title ? '<span class="lab">📊 ' + md(it.grid.title) + '</span>' : '') + gridTable(it.grid) + '</div>';
    if (it.hint) h += '<div class="hint">' + md(it.hint) + '</div>';
    if (it.options) {
      h += '<div class="opts" role="group" aria-label="Options' + (it.multi ? ' (pick all that apply)' : ' (pick one)') + '">' +
        it.options.map(function (o, i) {
          return '<button type="button" class="opt' + (it.mono ? ' mono' : '') + '" data-i="' + i + '" aria-pressed="false">' +
            '<span class="ol">' + esc(labels.charAt(i)) + '</span><span class="ot">' + md(o) + '</span></button>';
        }).join('') + '</div>';
      if (it.multi) h += '<div class="pickall">Pick <strong>every</strong> option that fits.</div>';
    }
    h += '<div class="row-actions">' +
      (it.options ? '<button type="button" class="btn solid chk">Check</button>' : '') +
      '<button type="button" class="btn rv" aria-expanded="false">Reveal answer</button></div>';
    h += '<div class="ans" hidden><div class="a">' + md(it.a) + '</div>' +
      (it.steps ? '<ol>' + it.steps.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ol>' : '') +
      (it.why ? '<p class="why">' + md(it.why) + '</p>' : '') +
      (it.wrong ? '<div class="wrong">' + md(it.wrong) + '</div>' : '') +
      '<div class="markrow"><span>How did you do?</span><button type="button" class="mk" data-m="got" aria-pressed="false">✅ Got it</button>' +
      '<button type="button" class="mk" data-m="miss" aria-pressed="false">❌ Missed it</button></div></div>';
    d.innerHTML = h;

    var rec = {
      id: it.id, el: d, step: s, block: blockEl, row: null, cell: false,
      ans: d.querySelector('.ans'), btn: d.querySelector('.rv'),
      badge: d.querySelector('.badge'), marks: d.querySelectorAll('.mk'),
      opts: it.options ? Array.prototype.slice.call(d.querySelectorAll('.opt')) : null,
      correct: it.correct || [], multi: !!it.multi, open: false, mark: null
    };
    register(rec);
    rec.btn.addEventListener('click', function () { setOpen(rec, !rec.open); });
    if (rec.opts) {
      rec.opts.forEach(function (o) {
        o.addEventListener('click', function () {
          if (!rec.multi) rec.opts.forEach(function (x) { if (x !== o) { x.classList.remove('sel'); x.setAttribute('aria-pressed', 'false'); } });
          var on = !o.classList.contains('sel');
          o.classList.toggle('sel', on);
          o.setAttribute('aria-pressed', String(on));
          if (rec.open) paintOptions(rec);
        });
      });
      d.querySelector('.chk').addEventListener('click', function () { checkOptions(rec); });
    }
    return d;
  }

  function renderRevealTable(s, b, isMain) {
    var box = el('div', { class: 'turn block' + (isMain ? '' : ' table-turn'), id: b.id });
    var n = 0;
    b.rows.forEach(function (r) { r.cells.forEach(function (c) { if (c && typeof c === 'object') n++; }); });
    box.innerHTML = '<div class="turn-head"><div>' + (isMain ? '' : '<h3>' + md(b.title) + ' <span class="cnt">' + n + '</span></h3>' + (b.sub ? '<p>' + md(b.sub) + '</p>' : '')) +
      '</div><div class="mini-seg"><button type="button" data-act="show">Show all</button><button type="button" data-act="hide">Hide all</button></div></div>' +
      '<div class="scroll"><table class="rtable"><thead><tr>' +
      b.columns.map(function (c) { return '<th scope="col">' + md(c.label) + '</th>'; }).join('') + '</tr></thead><tbody></tbody></table></div>';
    var tbody = box.querySelector('tbody');
    var mine = [];
    b.rows.forEach(function (r) {
      var tr = el('tr', { class: 'rrow' });
      r.cells.forEach(function (c, ci) {
        var col = b.columns[ci] || {};
        var td = el('td', { 'data-hideable': col.hideable ? 'true' : null, 'data-label': plain(col.label) });
        if (c && typeof c === 'object') { var cell = renderCell(c, s, box, tr); td.appendChild(cell.el); mine.push(cell); }
        else td.innerHTML = '<div>' + md(c) + '</div>';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    box.querySelector('[data-act="show"]').addEventListener('click', function () { mine.forEach(function (r) { setOpen(r, true, true); }); updateAll(); });
    box.querySelector('[data-act="hide"]').addEventListener('click', function () { mine.forEach(function (r) { setOpen(r, false, true); }); updateAll(); });
    return box;
  }

  function renderCell(c, s, blockEl, tr) {
    var d = el('div', { class: 'cell cell-item', id: 'it-' + c.id, 'data-id': c.id });
    d.innerHTML = '<span class="badge" aria-hidden="true"></span><p class="s">' + md(c.s) + '</p>' +
      '<button type="button" class="btn small rv" aria-expanded="false">Reveal</button>' +
      '<div class="cans" hidden><span class="logic">' + md(c.a) + '</span>' +
      (c.tag ? '<span class="tag ' + esc(c.tone || 'same') + '">' + md(c.tag) + '</span>' : '') +
      (c.why ? '<span>' + md(c.why) + '</span>' : '') +
      '<div class="mini"><button type="button" class="mk" data-m="got" aria-pressed="false" title="Got it" aria-label="Got it">✅</button>' +
      '<button type="button" class="mk" data-m="miss" aria-pressed="false" title="Missed it" aria-label="Missed it">❌</button></div></div>';
    var rec = {
      id: c.id, el: d, step: s, block: blockEl, row: tr, cell: true,
      ans: d.querySelector('.cans'), btn: d.querySelector('.rv'),
      badge: d.querySelector('.badge'), marks: d.querySelectorAll('.mk'),
      opts: null, correct: [], multi: false, open: false, mark: null
    };
    register(rec);
    rec.btn.addEventListener('click', function () { setOpen(rec, !rec.open); });
    return rec;
  }

  function gridTable(g) {
    var emph = g.emph || [];
    var t = '<div class="scroll"><table class="grid"><thead><tr>' +
      g.cols.map(function (c) { return '<th scope="col">' + md(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
    g.rows.forEach(function (r, ri) {
      var hl = emph.indexOf(ri) >= 0 ? ' class="hl"' : '';
      t += '<tr>' + r.map(function (c) { return '<td' + hl + '>' + md(c) + '</td>'; }).join('') + '</tr>';
    });
    return t + '</tbody></table></div>';
  }

  function renderGridBox(b) {
    return el('div', { class: 'card-grid teach', id: b.id },
      (b.title ? '<span class="lab">📊 ' + md(b.title) + '</span>' : '') + (b.sub ? '<p>' + md(b.sub) + '</p>' : '') + gridTable(b));
  }

  function renderSteps(b) {
    return renderWatch({ q: b.title + (b.sub ? '\n' + b.sub : ''), steps: b.steps });
  }

  function renderCallout(b) {
    return el('div', { class: 'callout teach ' + (b.tone || 'tip'), id: b.id },
      (b.title ? '<h3>' + md(b.title) + '</h3>' : '') + '<p>' + md(b.body) + '</p>');
  }

  function renderStepFoot(s) {
    var f = el('footer', { class: 'stepfoot' });
    var prev = steps[s.index - 1], next = steps[s.index + 1];
    f.innerHTML = (s.recs.length ? '<p class="stepscore" data-score="' + esc(s.id) + '"></p>' : '') +
      '<div class="navrow">' +
      (prev ? '<a class="navbtn prev" href="#' + esc(prev.id) + '"><small>← Back</small>' + md(prev.short) + '</a>' : '<span></span>') +
      (next ? '<a class="navbtn next" href="#' + esc(next.id) + '"><small>Next →</small>' + md(next.short) + '</a>' : '<span></span>') +
      '</div>';
    return f;
  }

  /* ---------- start + finish ---------- */
  function renderStart(s) {
    var h = '<div class="start-hero">' +
      (L.eyebrow ? '<div class="eyebrow">' + md(L.eyebrow) + '</div>' : '') +
      '<h1>' + (L.emoji ? esc(L.emoji) + ' ' : '') + md(L.title) + '</h1>' +
      (L.goal ? '<p class="goal">' + md(L.goal) + '</p>' : '') +
      '<div class="meta">' + (L.minutes ? '<span class="chip">⏱ ~' + esc(L.minutes) + ' min</span>' : '') +
      '<span class="chip" id="qCount">✋ questions</span>' + (L.verified ? '<span class="chip">🧮 answers checked by code</span>' : '') + '</div>' +
      '<div class="cta" id="startCta"></div></div>';

    // What you'll learn = the steps themselves, in order (book style: the plan first)
    var groups = [];
    steps.forEach(function (x) {
      if (x.kind === 'start' || x.kind === 'finish') return;
      var g = x.ideas === 0 ? 'Rounds' : (x.kind === 'practice' ? 'Then practise' : (x.kind === 'idea' ? 'First, learn' : 'Also'));
      if (!groups.length || groups[groups.length - 1].g !== g) groups.push({ g: g, items: [] });
      groups[groups.length - 1].items.push(x);
    });
    h += '<div class="plan"><h2>🗺️ In this lesson, in this order</h2>' + groups.map(function (g) {
      return '<div class="plan-group"><div class="plan-label">' + esc(g.g) + '</div><ol class="path">' + g.items.map(function (x) {
        var num = x.ideas === 0 ? x.index : (x.kind === 'idea' ? x.n : (x.kind === 'practice' && LEVELS[x.level] ? LEVELS[x.level].t.split(' ')[0] : '•'));
        return '<li><a class="prow" href="#' + esc(x.id) + '"><span class="pnum">' + esc(num) + '</span>' +
          '<span class="ptxt"><b>' + md(x.kind === 'practice' ? x.short : x.title) + '</b>' + (x.summary ? '<small>' + md(x.summary) + '</small>' : '') + '</span>' +
          '<span class="pst" data-pst="' + esc(x.id) + '"></span></a></li>';
      }).join('') + '</ol></div>';
    }).join('') + '</div>';

    if (L.magic && L.magic.length) {
      h += '<div class="summary-card"><h2>🔑 The whole lesson in ' + L.magic.length + ' lines</h2><ul>' +
        L.magic.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>' +
        '<p class="muted">Read these now, then again at the end. By then every line should make sense.</p></div>';
    }
    h += '<p class="howto">🤔 Think → ✍️ Try → 👀 Reveal → ✅/❌ Mark honestly → 🔁 In 2 days, open ⚙️ Options → <b>Review my ❌</b>.</p>';
    s.el.innerHTML = h;
  }

  function refreshStart() {
    document.getElementById('qCount').textContent = '✋ ' + recs.length + ' questions';
    var resume = store.get(L.id + ':step');
    var first = steps[1];
    var rs = resume && stepById[resume] && resume !== first.id ? stepById[resume] : null;
    document.getElementById('startCta').innerHTML = rs
      ? '<a class="navbtn next big" href="#' + esc(rs.id) + '"><small>Continue where you left off →</small>' + md(rs.short) + '</a>' +
        '<a class="linkish" href="#' + esc(first.id) + '">or start from the beginning</a>'
      : '<a class="navbtn next big" href="#' + esc(first.id) + '"><small>Start →</small>' + md(first.kind === 'idea' ? 'Idea 1 · ' + plain(first.short) : first.short) + '</a>';
    document.querySelectorAll('[data-pst]').forEach(function (e) {
      var st = stepStatus(stepById[e.getAttribute('data-pst')]);
      e.innerHTML = !st.total ? '' : (st.marked === 0 ? '<span class="st-none">' + st.total + ' q</span>'
        : '<span class="st-got">✅ ' + st.got + '</span>' + (st.miss ? '<span class="st-miss">❌ ' + st.miss + '</span>' : '') + '<span class="st-of">/ ' + st.total + '</span>');
    });
  }

  function renderFinish(s) {
    var h = '<header class="step-head"><div class="eyebrow">Finish line</div><h2>🏁 How did it go?</h2></header>' +
      '<div class="scorecard" id="scorecard"></div>';
    s.el.innerHTML = h;
    s.blocks.forEach(function (b) {
      if (b.type === 'recap') {
        s.el.appendChild(el('div', { class: 'summary-card recap' }, '<h2>' + md(b.title || '🧠 60-second recap') + '</h2><ul>' +
          b.lines.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>'));
      } else if (b.type === 'links') {
        s.el.appendChild(el('div', { class: 'links-card' }, '<h2>' + md(b.title || '📚 Want more practice?') + '</h2>' +
          (b.sub ? '<p class="muted">' + md(b.sub) + '</p>' : '') + '<ul>' +
          b.items.map(function (x) {
            return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + md(x.title) + ' ↗</a>' +
              '<span class="src">' + md(x.source || '') + (x.checked ? ' · ✅ link checked ' + esc(x.checked) : '') + '</span>' +
              (x.note ? '<span>' + md(x.note) + '</span>' : '') + '</li>';
          }).join('') + '</ul>'));
      }
    });
    if (L.sources) s.el.appendChild(el('p', { class: 'sources' }, '📎 ' + md(L.sources)));
    var f = el('footer', { class: 'stepfoot' });
    var prev = steps[s.index - 1];
    f.innerHTML = '<div class="navrow">' +
      (prev ? '<a class="navbtn prev" href="#' + esc(prev.id) + '"><small>← Back</small>' + md(prev.short) + '</a>' : '<span></span>') +
      (L.next ? '<a class="navbtn next" href="' + esc(L.next.href) + '"><small>Next lesson →</small>' + md(L.next.label) + '</a>' : '<span></span>') + '</div>';
    s.el.appendChild(f);
  }

  function refreshFinish() {
    var rows = '', tg = 0, tm = 0, tt = 0;
    steps.forEach(function (x) {
      if (!x.recs.length) return;
      var st = stepStatus(x);
      tg += st.got; tm += st.miss; tt += st.total;
      rows += '<tr><td><a href="#' + esc(x.id) + '">' + md(x.short) + '</a></td><td>' + st.got + '</td><td>' + st.miss + '</td><td>' + (st.total - st.marked) + '</td></tr>';
    });
    var pct = tt ? Math.round(100 * tg / tt) : 0;
    document.getElementById('scorecard').innerHTML =
      '<div class="bigscore"><div class="ring" style="--p:' + pct + '"><span>' + pct + '%</span></div><div><b>✅ ' + tg + ' of ' + tt + '</b> marked right' +
      (tm ? '<br>❌ ' + tm + ' to review' : '') + '<br><span class="muted">' + (tt - tg - tm) + ' not marked yet</span></div></div>' +
      (tm ? '<a class="navbtn next" href="#review"><small>Worth doing in 2 days →</small>🔁 Review my ' + tm + ' ❌</a>' : '') +
      '<div class="scroll"><table class="grid"><thead><tr><th>Step</th><th>✅</th><th>❌</th><th>Not marked</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* ---------- answer state ---------- */
  function register(rec) {
    recs.push(rec);
    rec.step.recs.push(rec);
    rec.marks.forEach(function (m) {
      m.addEventListener('click', function () {
        var v = m.getAttribute('data-m');
        setMark(rec, rec.mark === v ? null : v);
      });
    });
  }

  function anySelected(rec) { return rec.opts.some(function (o) { return o.classList.contains('sel'); }); }
  function paintOptions(rec) {
    var any = anySelected(rec);
    rec.opts.forEach(function (o, i) {
      var sel = o.classList.contains('sel'), ok = rec.correct.indexOf(i) >= 0;
      o.classList.remove('ok', 'no', 'missed');
      if (ok && sel) o.classList.add('ok');
      else if (!ok && sel) o.classList.add('no');
      else if (ok) o.classList.add(any ? 'missed' : 'ok');
    });
  }
  function clearOptions(rec) { rec.opts.forEach(function (o) { o.classList.remove('ok', 'no', 'missed'); }); }

  function checkOptions(rec) {
    if (!anySelected(rec)) {
      var b = rec.el.querySelector('.chk'), old = b.textContent;
      b.textContent = 'Pick an option first';
      setTimeout(function () { b.textContent = old; }, 1400);
      return;
    }
    var right = rec.opts.every(function (o, i) { return o.classList.contains('sel') === (rec.correct.indexOf(i) >= 0); });
    setOpen(rec, true);
    setMark(rec, right ? 'got' : 'miss');
  }

  function setOpen(rec, open, quiet) {
    rec.open = open;
    rec.ans.hidden = !open;
    rec.btn.setAttribute('aria-expanded', String(open));
    rec.btn.textContent = rec.cell ? (open ? 'Hide' : 'Reveal') : (open ? 'Hide answer' : 'Reveal answer');
    if (rec.opts) { if (open) paintOptions(rec); else clearOptions(rec); }
    if (!quiet) updateAll();
  }

  function setMark(rec, m, quiet) {
    rec.mark = m;
    rec.el.classList.toggle('is-got', m === 'got');
    rec.el.classList.toggle('is-miss', m === 'miss');
    rec.badge.textContent = m === 'got' ? '✅' : (m === 'miss' ? '❌' : '');
    rec.marks.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === m)); });
    if (!quiet) {
      if (m) store.set(L.id + ':' + rec.id, m); else store.del(L.id + ':' + rec.id);
      updateAll();
    }
  }

  function restoreMarks() {
    recs.forEach(function (r) {
      var m = store.get(L.id + ':' + r.id);
      if (m === 'got' || m === 'miss') setMark(r, m, true);
    });
  }

  function updateAll() {
    var got = 0, miss = 0;
    recs.forEach(function (r) { if (r.mark === 'got') got++; if (r.mark === 'miss') miss++; });
    steps.forEach(function (s) {
      var sc = s.el.querySelector('[data-score]');
      if (sc) {
        var st = stepStatus(s);
        sc.innerHTML = st.marked
          ? 'This step: <b>✅ ' + st.got + '</b>' + (st.miss ? ' · <b>❌ ' + st.miss + '</b>' : '') + ' · ' + (st.total - st.marked) + ' not marked' +
            (st.marked === st.total ? (st.miss ? ' · done, come back for the ❌' : ' · 🎉 all ✅') : '')
          : 'This step: ' + st.total + ' questions. Mark each one ✅ or ❌ after you reveal it.';
      }
      s.el.classList.toggle('has-miss', !!s.el.querySelector('.is-miss'));
    });
    document.querySelectorAll('.block, tr.rrow').forEach(function (b) { b.classList.toggle('has-miss', !!b.querySelector('.is-miss')); });
    var mn = document.getElementById('missN');
    if (mn) mn.textContent = miss ? '(' + miss + ')' : '';
    if (cur && cur !== 'review') {
      if (stepById[cur] && !stepById[cur].recs.length) store.set(L.id + ':seen:' + cur, '1');
      updateLessonbar();
    }
    store.set(L.id + ':meta', JSON.stringify({ total: recs.length, got: got, miss: miss, t: Date.now() }));
  }

  function wireLessonControls() {
    var hard = document.getElementById('hard');
    hard.checked = store.get('hard') === '1';
    document.body.classList.toggle('hard', hard.checked);
    hard.addEventListener('change', function () {
      document.body.classList.toggle('hard', hard.checked);
      store.set('hard', hard.checked ? '1' : '0');
    });
    document.getElementById('reviewBtn').addEventListener('click', function () { location.hash = 'review'; });
    var reset = document.getElementById('reset'), armed = null;
    reset.addEventListener('click', function () {
      if (!armed) {
        reset.textContent = 'Tap again to clear every ✅/❌';
        armed = setTimeout(function () { reset.textContent = 'Reset my ✅/❌ marks'; armed = null; }, 3000);
        return;
      }
      clearTimeout(armed); armed = null;
      reset.textContent = 'Reset my ✅/❌ marks';
      recs.forEach(function (r) { store.del(L.id + ':' + r.id); setMark(r, null, true); });
      updateAll();
    });
    document.addEventListener('click', function (e) {
      var m = document.getElementById('menu');
      if (m.open && !m.contains(e.target)) m.open = false;
    });
  }

  /* ======================================================================
   * HOME + COURSE PAGES
   * ==================================================================== */
  function unitProgress(u) { return getJSONStore(u.id + ':meta'); }

  function progressBits(p) {
    if (!p || !p.total) return { st: '<span class="st-none">Not started</span>', pct: 0 };
    var pct = Math.round(100 * p.got / p.total);
    return { st: '<span class="st-got">✅ ' + p.got + '</span>' + (p.miss ? '<span class="st-miss">❌ ' + p.miss + '</span>' : '') + '<span class="st-of">/ ' + p.total + '</span>', pct: pct };
  }

  function continueCard(courseCode) {
    var last = getJSONStore('last');
    if (!last || !last.href || (courseCode && last.course !== courseCode)) return '';
    return '<a class="continue" href="' + esc(last.href) + '"><span class="eyebrow">▶ Continue where you left off</span>' +
      '<b>' + md(last.title) + '</b>' + (last.step ? '<small>' + md(last.step) + '</small>' : '') + '</a>';
  }

  function renderHome(cat) {
    document.title = 'UNSW Brain Gym';
    var h = topbar();
    h += '<section class="wrap narrow home-hero"><div class="eyebrow">Think · Try · Reveal</div>' +
      '<h1>🧠 UNSW <span>Brain Gym</span></h1><p class="goal">' + md(cat.tagline || '') + '</p></section>';
    h += '<div class="wrap narrow stack">' + continueCard();
    h += '<section><h2 class="sec-title">📚 Courses</h2><div class="cards">';
    cat.courses.forEach(function (c) {
      var ready = c.units.filter(function (u) { return u.status === 'ready'; });
      var tot = 0, got = 0;
      ready.forEach(function (u) { var p = unitProgress(u); if (p) { tot += p.total; got += p.got; } });
      var pct = tot ? Math.round(100 * got / tot) : 0;
      h += '<a class="card course-card" href="' + esc(c.href) + '"><span class="eyebrow">' + esc(c.term || '') + '</span>' +
        '<h3>' + esc(c.code) + ' · ' + md(c.title) + '</h3><p class="sub">' + ready.length + ' ready now · ' +
        c.units.filter(function (u) { return u.status === 'next'; }).length + ' coming next</p>' +
        '<div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>' +
        '<span class="muted small">' + (tot ? '✅ ' + got + ' of ' + tot + ' questions right so far' : 'Not started yet') + '</span></a>';
    });
    h += '</div></section>';
    h += '<section><h2 class="sec-title">🧭 How to use it</h2><ol class="how">' +
      '<li><b>🤔 Think</b><span>Read one idea: a picture, the official version, one worked example.</span></li>' +
      '<li><b>✍️ Try</b><span>Answer in your head or on paper before you look.</span></li>' +
      '<li><b>👀 Reveal</b><span>Open one answer at a time.</span></li>' +
      '<li><b>✅ Mark</b><span>Tap ✅ or ❌, honestly.</span></li>' +
      '<li><b>🔁 Review</b><span>In 2 days: ⚙️ Options → Review my ❌.</span></li></ol></section>';
    h += '</div><footer class="wrap narrow sitefoot"><span class="muted small">' + md(cat.footer || '') + '</span></footer>';
    app.innerHTML = h;
  }

  function renderCourse(cat, id) {
    var c = null;
    cat.courses.forEach(function (x) { if (x.id === id) c = x; });
    if (!c) return fail('Course "' + id + '" is not in catalog.json');
    document.title = c.code + ' — UNSW Brain Gym';
    var h = topbar([{ label: c.code }]);
    h += '<section class="wrap narrow home-hero"><div class="eyebrow">' + esc(c.term || '') + '</div><h1>' + esc(c.code) + '<br><span>' + md(c.title) + '</span></h1>' +
      (c.blurb ? '<p class="goal">' + md(c.blurb) + '</p>' : '') + '</section><div class="wrap narrow stack">';
    h += continueCard(c.code);
    var path = c.units.filter(function (u) { return u.status === 'ready' || u.status === 'next'; });
    var later = c.units.filter(function (u) { return u.status !== 'ready' && u.status !== 'next'; });
    h += '<section><h2 class="sec-title">🧭 Your path</h2><ol class="timeline">';
    var lastGroup = null;
    path.forEach(function (u, i) {
      if (u.group && u.group !== lastGroup) {
        h += '<li class="tl-group" aria-hidden="false"><span>' + md(u.group) + '</span></li>';
        lastGroup = u.group;
      }
      var ready = u.status === 'ready';
      var p = progressBits(unitProgress(u));
      var kind = u.kind === 'drill' ? '<span class="kind">drill</span>' : '';
      var inner = '<span class="tl-code">' + esc(u.code) + '</span><span class="tl-body"><span class="tl-title">' + md(u.title) + kind + '</span>' +
        '<span class="tl-sum">' + md(u.summary || '') + '</span>' +
        (ready ? '<span class="tl-prog"><span class="bar"><i style="width:' + p.pct + '%"></i></span><span class="tl-st">' + p.st + (u.minutes ? '<span class="st-of">· ~' + esc(u.minutes) + ' min</span>' : '') + '</span></span>'
               : '<span class="tl-soon">⏭ Coming next</span>') + '</span>';
      h += '<li class="' + (ready ? 'ready' : 'soon') + '">' + (ready ? '<a class="tl-card" href="' + esc(u.path) + '">' + inner + '</a>' : '<div class="tl-card">' + inner + '</div>') + '</li>';
    });
    h += '</ol></section>';
    if (later.length) {
      h += '<details class="later"><summary>🗓 Later in the course <span class="cnt">' + later.length + '</span></summary><ul>' +
        later.map(function (u) { return '<li><span class="tl-code">' + esc(u.code) + '</span><span><b>' + md(u.title) + '</b><small>' + md(u.summary || '') + '</small></span></li>'; }).join('') +
        '</ul></details>';
    }
    h += '</div><footer class="wrap narrow sitefoot"><a href="' + esc(ROOT || './') + '">← All courses</a></footer>';
    app.innerHTML = h;
  }

  /* ======================================================================
   * BOOT
   * ==================================================================== */
  var page = document.body.getAttribute('data-page');
  if (page === 'lesson') {
    getJSON('lesson.json').then(renderLesson).catch(function (e) { fail(e.message); });
  } else if (page === 'home' || page === 'course') {
    getJSON(ROOT + 'catalog.json').then(function (cat) {
      if (page === 'home') renderHome(cat); else renderCourse(cat, document.body.getAttribute('data-course'));
    }).catch(function (e) { fail(e.message); });
  }
})();
