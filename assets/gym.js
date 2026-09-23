/* UNSW Brain Gym — one engine for every page.
 *
 * Pages declare what they are on <body>:
 *   data-page="home"                      → renders catalog.json as the home page
 *   data-page="course" data-course="id"   → renders one course from catalog.json
 *   data-page="lesson"                    → renders ./lesson.json
 *   data-root="../../"                    → relative path back to the site root
 *
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
    h = h.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<code>' + codes[+i] + '</code>'; });
    return h;
  }

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
  var L = null;          // the lesson data
  var recs = [];         // every answerable thing on the page
  var byId = {};

  var LEVELS = {
    green: '🟢 Warm-up',
    yellow: '🟡 Getting there',
    red: '🔴 Quiz level',
    boss: '🟣 Boss level',
    retest: '🔁 Retest — come back in 2 days'
  };

  function renderLesson(data) {
    L = data;
    document.title = (L.code ? L.code + ' · ' : '') + L.title + ' — UNSW Brain Gym';
    var courseCrumb = L.course ? [{ label: L.course.code, href: L.course.href || '../' }] : [];
    var html = topbar(courseCrumb.concat([{ label: (L.code || '') + ' ' + L.title }]));

    html += '<section class="wrap hero">' +
      (L.eyebrow ? '<div class="eyebrow">' + md(L.eyebrow) + '</div>' : '') +
      '<h1>' + (L.emoji ? esc(L.emoji) + ' ' : '') + md(L.title) + '</h1>' +
      (L.goal ? '<p class="goal">🎯 ' + md(L.goal) + '</p>' : '') +
      '<div class="meta" id="meta"></div></section>';

    html += '<div class="wrap stack">';
    if (L.roadmap && L.roadmap.length) {
      html += '<div class="box"><h2>🗺️ In this lesson, in this order</h2><ol>' +
        L.roadmap.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ol></div>';
    }
    if (L.magic && L.magic.length) {
      html += '<div class="box magic"><h2>🔑 The whole lesson in ' + L.magic.length + ' lines</h2><ul>' +
        L.magic.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul></div>';
    }
    html += '<nav class="toc" id="toc" aria-label="On this page"></nav></div>';

    html += '<div class="controls" role="region" aria-label="Answer controls"><div class="wrap">' +
      '<div class="seg"><button type="button" id="showAll" aria-pressed="false">Show all answers</button>' +
      '<button type="button" id="hideAll" aria-pressed="true">Hide all</button></div>' +
      '<label class="tog" title="Hides hints and the helper columns"><input type="checkbox" id="hard"> Hard mode</label>' +
      '<label class="tog" id="missWrap" title="Show only the questions you marked ❌"><input type="checkbox" id="missOnly"> Only my ❌</label>' +
      '<span class="count" id="count" aria-live="polite"></span>' +
      '<button type="button" class="linkbtn" id="reset">Reset my marks</button>' +
      '</div></div>';

    html += '<main class="wrap" id="main"></main>';
    app.innerHTML = html;

    var main = document.getElementById('main');
    var container = main;
    var ideaN = 0;
    var toc = [];

    (L.blocks || []).forEach(function (b) {
      var node;
      switch (b.type) {
        case 'section':
          node = el('section', { class: 'part', id: b.id });
          node.innerHTML = '<h2>' + md(b.title) + '</h2>' + (b.sub ? '<p class="sub">' + md(b.sub) + '</p>' : '');
          main.appendChild(node);
          container = node;
          return;
        case 'idea':
          ideaN += 1;
          node = renderIdea(b, ideaN);
          toc.push({ id: b.id, label: ideaN + ' · ' + (b.short || b.title) });
          break;
        case 'practice':
          node = renderPractice(b);
          toc.push({ id: b.id, label: b.toc || (b.title || LEVELS[b.level] || 'Practice') });
          break;
        case 'table':
          node = renderRevealTable(b);
          if (b.toc) toc.push({ id: b.id, label: b.toc });
          break;
        case 'grid': node = renderGridBox(b); break;
        case 'steps': node = renderSteps(b); if (b.toc) toc.push({ id: b.id, label: b.toc }); break;
        case 'callout': node = renderCallout(b); break;
        case 'recap': node = renderRecap(b); break;
        case 'links': node = renderLinks(b); toc.push({ id: b.id || 'links', label: b.toc || '📚 More practice' }); break;
        default: node = el('div', { class: 'callout trap' }, 'Unknown block type: ' + esc(b.type));
      }
      container.appendChild(node);
    });

    // footer
    var foot = '<footer class="navfoot">';
    foot += L.prev ? '<a href="' + esc(L.prev.href) + '">← ' + md(L.prev.label) + '</a>' : '<span></span>';
    foot += L.next ? '<a href="' + esc(L.next.href) + '">' + md(L.next.label) + ' →</a>' : '<span></span>';
    foot += '</footer>';
    if (L.sources) main.appendChild(el('p', { class: 'sources' }, '📎 ' + md(L.sources)));
    main.insertAdjacentHTML('beforeend', foot);

    document.getElementById('toc').innerHTML = toc.map(function (t) {
      return '<a href="#' + esc(t.id) + '">' + md(t.label) + '</a>';
    }).join('');

    var nItems = recs.length;
    document.getElementById('meta').innerHTML =
      (L.minutes ? '<span class="chip">⏱ ~' + esc(L.minutes) + ' min</span>' : '') +
      '<span class="chip">✋ ' + nItems + ' questions</span>' +
      (L.verified ? '<span class="chip">🧮 answers checked by code</span>' : '');

    wireControls();
    restoreMarks();
    updateAll();
    store.set('last', JSON.stringify({ href: location.pathname, title: (L.code ? L.code + ' · ' : '') + L.title, course: L.course ? L.course.code : '' }));
  }

  /* ---------- blocks ---------- */
  function renderIdea(b, n) {
    var a = el('article', { class: 'idea block', id: b.id });
    var h = '<header class="idea-head"><span class="idea-num">Idea ' + n + '</span><h3>' + md(b.title) + '</h3></header>';
    if (b.picture) h += '<div class="sec picture teach"><span class="lab">🧒 Picture it</span><p>' + md(b.picture) + '</p></div>';
    if (b.official) h += '<div class="sec official teach"><span class="lab">🎓 Official version</span><p>' + md(b.official) + '</p></div>';
    if (b.grid) h += '<div class="sec teach">' + (b.grid.title ? '<span class="lab">' + md(b.grid.title) + '</span>' : '') + gridTable(b.grid) + '</div>';
    if (b.watch) {
      h += '<div class="sec watch teach"><span class="lab">👀 Watch me do one</span>' +
        '<p>' + md(b.watch.q) + '</p>' +
        (b.watch.steps ? '<ol>' + b.watch.steps.map(function (s) { return '<li>' + md(s) + '</li>'; }).join('') + '</ol>' : '') +
        (b.watch.answer ? '<p class="final">➜ ' + md(b.watch.answer) + '</p>' : '') + '</div>';
    }
    a.innerHTML = h;
    if (b.tries && b.tries.length) {
      var sec = el('div', { class: 'sec' });
      sec.appendChild(el('span', { class: 'lab teach' }, '✋ Your turn — think, try, then reveal'));
      var list = el('div', { class: 'items' });
      b.tries.forEach(function (it, i) { list.appendChild(renderItem(it, 'T' + (i + 1), a)); });
      sec.appendChild(list);
      a.appendChild(sec);
    }
    var tail = '';
    if (b.trap) {
      tail += '<div class="sec teach"><span class="lab">🪤 The trap</span><div class="trap">' +
        '<div class="tempt"><span class="t-lab">Tempting ❌</span>' + md(b.trap.tempting) + '</div>' +
        '<div class="right"><span class="t-lab">Correct ✅</span>' + md(b.trap.correct) + '</div></div>' +
        (b.trap.test ? '<p class="trap-test">🔎 Catch it: ' + md(b.trap.test) + '</p>' : '') + '</div>';
    }
    if (b.magic) tail += '<div class="sec magicline teach"><p>' + md(b.magic) + '</p></div>';
    if (tail) a.insertAdjacentHTML('beforeend', tail);
    return a;
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
    var d = el('div', { class: 'box teach', id: b.id });
    d.innerHTML = (b.title ? '<h2>' + md(b.title) + '</h2>' : '') + (b.sub ? '<p>' + md(b.sub) + '</p>' : '') + gridTable(b);
    return d;
  }

  function renderPractice(b) {
    var s = el('section', { class: 'level block ' + (b.level || 'green'), id: b.id });
    s.innerHTML = '<h3>' + md(b.title || LEVELS[b.level] || 'Practice') + '</h3>' + (b.sub ? '<p class="sub">' + md(b.sub) + '</p>' : '');
    var list = el('div', { class: 'items' });
    var prefix = { green: 'G', yellow: 'Y', red: 'R', boss: 'B', retest: 'RT' }[b.level] || 'P';
    (b.items || []).forEach(function (it, i) { list.appendChild(renderItem(it, prefix + (i + 1), s)); });
    s.appendChild(list);
    return s;
  }

  function renderItem(it, label, blockEl) {
    var d = el('div', { class: 'item', id: 'it-' + it.id, 'data-id': it.id });
    var labels = it.labels || '123456789';
    var h = '<span class="badge" aria-hidden="true"></span>';
    if (it.letters) h += '<div class="letters">🔤 ' + md(it.letters) + '</div>';
    h += '<p class="q"><span class="num">' + esc(label) + '</span>' + md(it.q) + '</p>';
    if (it.hint) h += '<div class="hint">' + md(it.hint) + '</div>';
    if (it.options) {
      h += '<div class="opts" role="group" aria-label="Options' + (it.multi ? ' (pick all that apply)' : ' (pick one)') + '">' +
        it.options.map(function (o, i) {
          return '<button type="button" class="opt' + (it.mono ? ' mono' : '') + '" data-i="' + i + '" aria-pressed="false">' +
            '<span class="ol">(' + esc(labels.charAt(i)) + ')</span><span class="ot">' + md(o) + '</span></button>';
        }).join('') + '</div>';
      if (it.multi) h += '<div class="hint">Pick <strong>all</strong> that apply.</div>';
    }
    h += '<div class="row-actions">' +
      (it.options ? '<button type="button" class="btn solid chk">Check my answer</button>' : '') +
      '<button type="button" class="btn rv" aria-expanded="false">Reveal answer</button></div>';
    h += '<div class="ans" hidden><div class="a">' + md(it.a) + '</div>' +
      (it.steps ? '<ol>' + it.steps.map(function (s) { return '<li>' + md(s) + '</li>'; }).join('') + '</ol>' : '') +
      (it.why ? '<p class="why">' + md(it.why) + '</p>' : '') +
      (it.wrong ? '<div class="wrong">' + md(it.wrong) + '</div>' : '') +
      '<div class="markrow">Did you get it? <button type="button" class="mk" data-m="got" aria-pressed="false">✅ Got it</button>' +
      '<button type="button" class="mk" data-m="miss" aria-pressed="false">❌ Missed it</button></div></div>';
    d.innerHTML = h;

    var rec = {
      id: it.id, el: d, block: blockEl, row: null, cell: false,
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

  function renderRevealTable(b) {
    var s = el('section', { class: 'box block', id: b.id });
    var head = (b.title ? '<h2>' + md(b.title) + '</h2>' : '') + (b.sub ? '<p>' + md(b.sub) + '</p>' : '');
    var t = '<div class="scroll"><table class="rtable"><thead><tr>' +
      b.columns.map(function (c) { return '<th scope="col">' + md(c.label) + '</th>'; }).join('') + '</tr></thead><tbody></tbody></table></div>';
    s.innerHTML = head + t;
    var tbody = s.querySelector('tbody');
    b.rows.forEach(function (r) {
      var tr = el('tr', { class: 'rrow' });
      r.cells.forEach(function (c, ci) {
        var col = b.columns[ci] || {};
        var td = el('td', { 'data-hideable': col.hideable ? 'true' : null, 'data-label': col.label.replace(/[`*]/g, '') });
        if (c && typeof c === 'object') td.appendChild(renderCell(c, s, tr));
        else td.innerHTML = '<div>' + md(c) + '</div>';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    return s;
  }

  function renderCell(c, blockEl, tr) {
    var d = el('div', { class: 'cell cell-item', id: 'it-' + c.id, 'data-id': c.id });
    d.innerHTML = '<span class="badge" aria-hidden="true"></span><p class="s">' + md(c.s) + '</p>' +
      '<button type="button" class="btn small rv" aria-expanded="false">Reveal</button>' +
      '<div class="cans" hidden><span class="logic">' + md(c.a) + '</span>' +
      (c.tag ? '<span class="tag ' + esc(c.tone || 'same') + '">' + md(c.tag) + '</span>' : '') +
      (c.why ? '<span>' + md(c.why) + '</span>' : '') +
      '<div class="mini"><button type="button" class="mk" data-m="got" aria-pressed="false" title="Got it" aria-label="Got it">✅</button>' +
      '<button type="button" class="mk" data-m="miss" aria-pressed="false" title="Missed it" aria-label="Missed it">❌</button></div></div>';
    var rec = {
      id: c.id, el: d, block: blockEl, row: tr, cell: true,
      ans: d.querySelector('.cans'), btn: d.querySelector('.rv'),
      badge: d.querySelector('.badge'), marks: d.querySelectorAll('.mk'),
      opts: null, correct: [], multi: false, open: false, mark: null
    };
    register(rec);
    rec.btn.addEventListener('click', function () { setOpen(rec, !rec.open); });
    return d;
  }

  function renderSteps(b) {
    var s = el('section', { class: 'box steps block teach', id: b.id });
    s.innerHTML = '<h2>' + md(b.title) + '</h2>' + (b.sub ? '<p>' + md(b.sub) + '</p>' : '') +
      '<ol>' + b.steps.map(function (x) { return '<li hidden>' + md(x) + '</li>'; }).join('') + '</ol>' +
      '<div class="row-actions"><button type="button" class="btn" data-act="next">Show next step</button>' +
      '<button type="button" class="btn" data-act="all">Show all steps</button></div>';
    var lis = s.querySelectorAll('li');
    s.querySelector('[data-act="next"]').addEventListener('click', function () {
      for (var i = 0; i < lis.length; i++) if (lis[i].hidden) { lis[i].hidden = false; break; }
    });
    s.querySelector('[data-act="all"]').addEventListener('click', function () {
      for (var i = 0; i < lis.length; i++) lis[i].hidden = false;
    });
    return s;
  }

  function renderCallout(b) {
    return el('div', { class: 'callout teach ' + (b.tone || 'tip'), id: b.id },
      (b.title ? '<h3>' + md(b.title) + '</h3>' : '') + '<p>' + md(b.body) + '</p>');
  }

  function renderRecap(b) {
    return el('div', { class: 'box recap teach', id: b.id || 'recap' },
      '<h2>' + md(b.title || '🧠 60-second recap') + '</h2><ul>' +
      b.lines.map(function (x) { return '<li>' + md(x) + '</li>'; }).join('') + '</ul>');
  }

  function renderLinks(b) {
    return el('div', { class: 'box links teach', id: b.id || 'links' },
      '<h2>' + md(b.title || '📚 Want more practice?') + '</h2>' + (b.sub ? '<p>' + md(b.sub) + '</p>' : '') + '<ul>' +
      b.items.map(function (x) {
        return '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + md(x.title) + '</a>' +
          '<span class="src">' + md(x.source || '') + (x.checked ? ' · ✅ link checked ' + esc(x.checked) : '') + '</span>' +
          (x.note ? '<span>' + md(x.note) + '</span>' : '') + '</li>';
      }).join('') + '</ul>');
  }

  /* ---------- answer state ---------- */
  function register(rec) {
    if (byId[rec.id]) console.warn('Duplicate item id', rec.id);
    recs.push(rec);
    byId[rec.id] = rec;
    rec.marks.forEach(function (m) {
      m.addEventListener('click', function () {
        var v = m.getAttribute('data-m');
        setMark(rec, rec.mark === v ? null : v);
      });
    });
  }

  function paintOptions(rec) {
    rec.opts.forEach(function (o, i) {
      var sel = o.classList.contains('sel');
      var ok = rec.correct.indexOf(i) >= 0;
      o.classList.remove('ok', 'no', 'missed');
      if (ok && sel) o.classList.add('ok');
      else if (!ok && sel) o.classList.add('no');
      else if (ok && !sel) o.classList.add(anySelected(rec) ? 'missed' : 'ok');
    });
  }
  function anySelected(rec) { return rec.opts.some(function (o) { return o.classList.contains('sel'); }); }
  function clearOptions(rec) { rec.opts.forEach(function (o) { o.classList.remove('ok', 'no', 'missed'); }); }

  function checkOptions(rec) {
    if (!anySelected(rec)) {
      var b = rec.el.querySelector('.chk');
      var old = b.textContent;
      b.textContent = 'Pick an option first';
      setTimeout(function () { b.textContent = old; }, 1400);
      return;
    }
    var right = rec.opts.every(function (o, i) {
      return o.classList.contains('sel') === (rec.correct.indexOf(i) >= 0);
    });
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
    var total = recs.length, open = 0, got = 0, miss = 0;
    recs.forEach(function (r) { if (r.open) open++; if (r.mark === 'got') got++; if (r.mark === 'miss') miss++; });
    var c = document.getElementById('count');
    if (c) c.textContent = '👀 ' + open + '/' + total + ' open · ✅ ' + got + ' · ❌ ' + miss;
    var sa = document.getElementById('showAll'), ha = document.getElementById('hideAll');
    if (sa) sa.setAttribute('aria-pressed', String(total > 0 && open === total));
    if (ha) ha.setAttribute('aria-pressed', String(open === 0));

    // which blocks / rows / sections contain a ❌
    document.querySelectorAll('.block, tr.rrow, section.part').forEach(function (b) {
      b.classList.toggle('has-miss', !!b.querySelector('.is-miss'));
    });
    var mo = document.getElementById('missOnly'), mw = document.getElementById('missWrap');
    if (mo) {
      mo.disabled = miss === 0;
      mw.classList.toggle('disabled', miss === 0);
      if (miss === 0 && mo.checked) { mo.checked = false; document.body.classList.remove('misses'); }
    }
    store.set(L.id + ':meta', JSON.stringify({ total: total, got: got, miss: miss, t: Date.now() }));
  }

  function wireControls() {
    document.getElementById('showAll').addEventListener('click', function () {
      recs.forEach(function (r) { setOpen(r, true, true); });
      document.querySelectorAll('.steps li').forEach(function (li) { li.hidden = false; });
      updateAll();
    });
    document.getElementById('hideAll').addEventListener('click', function () {
      recs.forEach(function (r) { setOpen(r, false, true); });
      updateAll();
    });
    var hard = document.getElementById('hard');
    hard.checked = store.get('hard') === '1';
    document.body.classList.toggle('hard', hard.checked);
    hard.addEventListener('change', function () {
      document.body.classList.toggle('hard', hard.checked);
      store.set('hard', hard.checked ? '1' : '0');
    });
    var mo = document.getElementById('missOnly');
    mo.addEventListener('change', function () {
      document.body.classList.toggle('misses', mo.checked);
      if (mo.checked) window.scrollTo({ top: document.getElementById('main').offsetTop - 60 });
    });
    var reset = document.getElementById('reset'), armed = null;
    reset.addEventListener('click', function () {
      if (!armed) {
        reset.textContent = 'Tap again to clear all ✅/❌';
        armed = setTimeout(function () { reset.textContent = 'Reset my marks'; armed = null; }, 3000);
        return;
      }
      clearTimeout(armed); armed = null;
      reset.textContent = 'Reset my marks';
      recs.forEach(function (r) { store.del(L.id + ':' + r.id); setMark(r, null, true); });
      updateAll();
    });
  }

  /* ======================================================================
   * HOME + COURSE PAGES
   * ==================================================================== */
  function unitProgress(u) {
    var raw = store.get(u.id + ':meta');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function progressHTML(p) {
    if (!p || !p.total) return { st: 'Not started', bar: '' };
    var pct = Math.round(100 * p.got / p.total);
    return {
      st: '✅ ' + p.got + '/' + p.total + (p.miss ? ' · ❌ ' + p.miss : ''),
      bar: '<div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div>'
    };
  }

  function renderHome(cat) {
    document.title = 'UNSW Brain Gym';
    var h = topbar();
    h += '<section class="wrap home-hero"><div class="eyebrow">Think · Try · Reveal</div>' +
      '<h1>🧠 UNSW <span>Brain Gym</span></h1>' +
      '<p class="goal">' + md(cat.tagline || '') + '</p></section>';
    h += '<div class="wrap stack">';
    var last = null;
    try { last = JSON.parse(store.get('last') || 'null'); } catch (e) { last = null; }
    if (last && last.href) {
      h += '<a class="card" href="' + esc(last.href) + '"><span class="eyebrow">Continue where you left off</span><h3>' + md(last.title) + '</h3></a>';
    }
    h += '<div class="how">' +
      '<div><b>🤔 Think</b>Read the idea and its one worked example.</div>' +
      '<div><b>✍️ Try</b>Answer in your head or on paper first.</div>' +
      '<div><b>👀 Reveal</b>Open one answer at a time.</div>' +
      '<div><b>✅ Mark</b>Tap ✅ or ❌, honestly.</div>' +
      '<div><b>🔁 Redo</b>In 2 days, turn on “Only my ❌”.</div></div>';
    h += '<div class="cards">';
    cat.courses.forEach(function (c) {
      var ready = c.units.filter(function (u) { return u.status === 'ready'; });
      var tot = 0, got = 0;
      ready.forEach(function (u) { var p = unitProgress(u); if (p) { tot += p.total; got += p.got; } });
      var pct = tot ? Math.round(100 * got / tot) : 0;
      h += '<a class="card" href="' + esc(c.href) + '"><span class="eyebrow">' + esc(c.term || '') + '</span>' +
        '<h3>' + esc(c.code) + ' · ' + md(c.title) + '</h3><p class="sub">' + ready.length + ' ready · ' +
        (c.units.length - ready.length) + ' coming' + (tot ? ' · ✅ ' + got + '/' + tot + ' answered right' : '') + '</p>' +
        '<div class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div></a>';
    });
    h += '</div></div><footer class="wrap navfoot"><span class="sources">' + md(cat.footer || '') + '</span></footer>';
    app.innerHTML = h;
  }

  function renderCourse(cat, id) {
    var c = null;
    cat.courses.forEach(function (x) { if (x.id === id) c = x; });
    if (!c) return fail('Course "' + id + '" is not in catalog.json');
    document.title = c.code + ' — UNSW Brain Gym';
    var h = topbar([{ label: c.code }]);
    h += '<section class="wrap hero"><div class="eyebrow">' + esc(c.term || '') + '</div><h1>' + esc(c.code) + ' · ' + md(c.title) + '</h1>' +
      (c.blurb ? '<p class="goal">' + md(c.blurb) + '</p>' : '') + '</section><div class="wrap stack">';
    var groups = [];
    var byGroup = {};
    c.units.forEach(function (u) {
      var g = u.group || 'Lessons';
      if (!byGroup[g]) { byGroup[g] = []; groups.push(g); }
      byGroup[g].push(u);
    });
    groups.forEach(function (g) {
      h += '<section class="part"><h2>' + md(g) + '</h2><div class="cards">';
      byGroup[g].forEach(function (u) {
        var kind = u.kind === 'drill' ? '<span class="kind">drill</span>' : '';
        if (u.status === 'ready') {
          var p = progressHTML(unitProgress(u));
          h += '<a class="card unit" href="' + esc(u.path) + '"><span class="code">' + esc(u.code) + '</span>' +
            '<span class="ttl">' + md(u.title) + kind + '</span><span class="st">' + p.st + '</span>' +
            '<p class="sum">' + md(u.summary || '') + (u.minutes ? ' · ⏱ ~' + esc(u.minutes) + ' min' : '') + '</p>' + p.bar + '</a>';
        } else {
          h += '<div class="card unit planned"><span class="code">' + esc(u.code) + '</span>' +
            '<span class="ttl">' + md(u.title) + kind + '</span><span class="st">' + (u.status === 'next' ? '⏭ Coming next' : '🗓 Planned') + '</span>' +
            '<p class="sum">' + md(u.summary || '') + '</p></div>';
        }
      });
      h += '</div></section>';
    });
    h += '</div><footer class="wrap navfoot"><a href="' + esc(ROOT || './') + '">← All courses</a></footer>';
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
