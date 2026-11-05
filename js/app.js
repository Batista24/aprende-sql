/* Aprende bases de datos - app principal (sin servidor, todo en el navegador) */
(function () {
  'use strict';
  const KEY = 'aprendesql.v1';
  const L = window.LECCIONES, KW = window.KEYWORDS, SCHEMA = window.SCHEMA;
  const COLS = SCHEMA.estudiantes;
  const app = document.getElementById('app');

  /* ---------- utilidades ---------- */
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function dist(a, b) { // Damerau (transposición cuenta 1)
    const m = a.length, n = b.length, d = [];
    for (let i = 0; i <= m; i++) { d[i] = [i]; }
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
    return d[m][n];
  }

  /* ---------- progreso ---------- */
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.done) return s; } catch (e) { /* ignorar */ }
    return { done: {}, drafts: {}, notes: {} };
  }
  let P = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignorar */ } };

  /* ---------- base de datos (sql.js) ---------- */
  let SQL = null, loadErr = '';
  function makeDb() { const db = new SQL.Database(); db.run(window.SEED); return db; }
  function exec(sql) {
    let db;
    try {
      db = makeDb();
      const r = db.exec(sql);
      if (!r.length) return { ok: true, none: true };
      const x = r[r.length - 1];
      return { ok: true, cols: x.columns, rows: x.values };
    } catch (e) { return { ok: false, err: String(e.message || e) }; } finally { if (db) db.close(); }
  }

  /* ---------- ayuda con errores de escritura ---------- */
  function words(sql) {
    const noStr = sql.replace(/'[^']*'/g, ' ').replace(/"[^"]*"/g, ' ');
    return noStr.match(/[A-Za-zÁÉÍÓÚáéíóúñÑ_]+/g) || [];
  }
  function suggest(sql) {
    const known = KW.map((k) => k.toLowerCase()).concat(COLS, Object.keys(SCHEMA));
    const out = [], seen = {};
    const aliasAfterAs = {};
    const w = words(sql);
    w.forEach((x, i) => { if (i > 0 && w[i - 1].toLowerCase() === 'as') aliasAfterAs[x.toLowerCase()] = true; });
    w.forEach((x) => {
      const lx = norm(x);
      if (lx.length < 3 || known.indexOf(lx) >= 0 || aliasAfterAs[lx] || seen[lx]) return;
      let best = null, bd = 99;
      known.forEach((k) => { const d = dist(lx, k); if (d < bd) { bd = d; best = k; } });
      const lim = lx.length <= 4 ? 1 : 2;
      if (best && bd <= lim) {
        seen[lx] = true;
        const isKw = KW.indexOf(best.toUpperCase()) >= 0;
        out.push('«' + x + '» no existe. ¿Quisiste decir <strong>' + esc(isKw ? best.toUpperCase() : best) + '</strong>?');
      }
    });
    const q = (sql.match(/'/g) || []).length;
    if (q % 2) out.push('Falta cerrar una comilla simple (<code>\'</code>). El texto va así: <code>\'Bonao\'</code>.');
    const o = (sql.match(/\(/g) || []).length, c = (sql.match(/\)/g) || []).length;
    if (o !== c) out.push('Los paréntesis no están balanceados: abres ' + o + ' y cierras ' + c + '.');
    return out;
  }
  function friendlyError(err, sql) {
    let m = err.match(/no such column: (\S+)/i);
    if (m) return 'La columna «' + esc(m[1]) + '» no existe. Las columnas son: <strong>' + COLS.join(', ') + '</strong>.';
    m = err.match(/no such table: (\S+)/i);
    if (m) return 'La tabla «' + esc(m[1]) + '» no existe. Aquí la tabla se llama <strong>estudiantes</strong>.';
    m = err.match(/unrecognized token: "(.*)"/i);
    if (m && m[1].charAt(0) === "'") return 'Falta cerrar una comilla simple. El texto va entre comillas: <code>\'Bonao\'</code>.';
    if (m && /^\d/.test(m[1])) return '«' + esc(m[1]) + '» es texto, así que va entre comillas simples: <code>\'' + esc(m[1]) + '\'</code>.';
    m = err.match(/near "([^"]*)": syntax error/i);
    if (m) return 'Hay un error de escritura cerca de «' + esc(m[1]) + '». Revisa esa parte.';
    if (/incomplete input/i.test(err)) return 'Tu consulta está incompleta. ¿Falta algo al final?';
    if (/syntax error/i.test(err)) return 'Hay un error de escritura en la consulta.';
    if (/ambiguous/i.test(err)) return 'Hay un nombre repetido y no se sabe a cuál te refieres.';
    return 'La base de datos dijo: ' + esc(err);
  }

  /* ---------- tablas de resultado ---------- */
  function tableHtml(cols, rows) {
    const shown = rows.slice(0, 60);
    const fmt = (v) => v === null ? '<i>NULL</i>' : esc(typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 10000) / 10000 : v);
    return '<div class="tw"><table><thead><tr>' + cols.map((c) => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' +
      shown.map((r) => '<tr>' + r.map((v) => '<td>' + fmt(v) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' +
      '<p class="fine">' + rows.length + (rows.length === 1 ? ' fila' : ' filas') + (rows.length > 60 ? ' (se muestran 60)' : '') + '</p>';
  }
  function resultHtml(r, sql) {
    if (!r.ok) {
      const fe = friendlyError(r.err, sql), tips = suggest(sql).filter((t) => !(/comilla/.test(t) && /comilla/.test(fe)));
      return '<div class="msg bad"><strong>Hay un error.</strong><p>' + fe + '</p>' +
        (tips.length ? '<ul>' + tips.map((t) => '<li>' + t + '</li>').join('') + '</ul>' : '') + '</div>';
    }
    if (r.none) return '<div class="msg warn">La consulta corrió pero no devolvió una tabla. Aquí empezamos con <code>SELECT</code>.</div>';
    return tableHtml(r.cols, r.rows);
  }

  /* ---------- revisar un ejercicio ---------- */
  const normVal = (v) => typeof v === 'number' ? Math.round(v * 10000) / 10000 : v;
  const rowKey = (r) => JSON.stringify(r.map(normVal));
  function check(ex, sql) {
    const u = exec(sql);
    if (!u.ok) return { html: resultHtml(u, sql), good: false };
    if (u.none) return { html: resultHtml(u, sql), good: false };
    const e = exec(ex.sol);
    const ordered = /order\s+by/i.test(ex.sol), names = /\sas\s/i.test(ex.sol);
    const table = tableHtml(u.cols, u.rows);
    const bad = (t, extra) => ({ good: false, html: '<div class="msg bad"><strong>Casi. ' + t + '</strong>' + (extra ? '<p>' + extra + '</p>' : '') + '</div>' + table });
    if (u.cols.length !== e.cols.length) {
      return bad(u.cols.length < e.cols.length ? 'Te faltan columnas.' : 'Tienes columnas de más.',
        'Pediste ' + u.cols.length + ' y el ejercicio pide ' + e.cols.length + '. Revisa qué columnas pide el ejercicio.');
    }
    if (names && u.cols.map((c) => c.toLowerCase()).join() !== e.cols.map((c) => c.toLowerCase()).join()) {
      return bad('El nombre de la columna no es el pedido.', 'El ejercicio pide que se llame <strong>' + esc(e.cols.join(', ')) + '</strong>. Usa <code>AS</code>.');
    }
    if (u.rows.length !== e.rows.length) {
      return bad('Salieron ' + u.rows.length + ' filas y deberían ser ' + e.rows.length + '.',
        u.rows.length > e.rows.length ? 'Salen filas de más: revisa tu condición <code>WHERE</code> o el <code>LIMIT</code>.' : 'Salen menos filas de las que pide el ejercicio: tu condición puede ser muy estricta.');
    }
    const a = u.rows.map(rowKey), b = e.rows.map(rowKey);
    const same = ordered ? a.join('|') === b.join('|') : a.slice().sort().join('|') === b.slice().sort().join('|');
    if (!same) {
      const sameSet = a.slice().sort().join('|') === b.slice().sort().join('|');
      return bad(sameSet ? 'Los datos son los correctos, pero el orden no.' : 'Los datos no coinciden con lo que pide el ejercicio.',
        sameSet ? 'Revisa el <code>ORDER BY</code> y si va <code>ASC</code> o <code>DESC</code>.' : 'Lee otra vez el ejercicio: revisa las columnas y la condición.');
    }
    return { good: true, html: '<div class="msg ok"><strong>¡Correcto!</strong>' + (ex.extra ? '<p>' + md(ex.extra) + '</p>' : '') + '</div>' + table };
  }

  /* ---------- revisar lo que escribe el alumno ---------- */
  function tokenMatch(t, w) { return t === w || (w.length >= 5 && t.length >= 5 && dist(t, w) <= 1); }
  function reviewNote(l, text) {
    const toks = (norm(text).match(/[a-z0-9]+/g) || []);
    if (toks.length < 6) return { ok: false, html: '<div class="msg warn">Escribe un poco más. Intenta explicarlo con tus palabras en una o dos frases.</div>' };
    const ideas = l.escribe.ideas.map((i) => ({ i: i, hit: i.p.some((w) => toks.some((t) => tokenMatch(t, norm(w)))) }));
    const found = ideas.filter((x) => x.hit), miss = ideas.filter((x) => !x.hit);
    const vocab = {};
    L.forEach((ls) => ls.escribe.ideas.forEach((i) => i.p.forEach((w) => { if (norm(w).length >= 5) vocab[norm(w)] = 1; })));
    ['tabla', 'tablas', 'columna', 'columnas', 'registro', 'registros', 'consulta', 'condicion', 'promedio', 'ordenar', 'agrupar', 'resultado', 'informacion'].forEach((w) => { vocab[w] = 1; });
    const typos = [], seen = {};
    toks.forEach((t) => {
      if (t.length < 5 || vocab[t] || seen[t]) return;
      for (const w in vocab) if (Math.abs(w.length - t.length) <= 1 && dist(t, w) === 1) { typos.push([t, w]); seen[t] = 1; break; }
    });
    const need = Math.ceil(ideas.length * 0.75), ok = found.length >= need;
    let h = '<div class="msg ' + (ok ? 'ok' : 'warn') + '"><strong>' + (ok ? '¡Muy bien!' : 'Vas bien, pero te faltan ideas.') + '</strong> Mencionaste ' + found.length + ' de ' + ideas.length + ' ideas clave.</div>';
    h += '<ul class="ideas">' + found.map((x) => '<li class="y">✅ ' + esc(x.i.n) + '</li>').join('') + miss.map((x) => '<li class="n">💡 ' + esc(x.i.tip) + '</li>').join('') + '</ul>';
    if (typos.length) h += '<div class="msg warn"><strong>Revisa la escritura:</strong><ul>' + typos.slice(0, 4).map((t) => '<li>«' + esc(t[0]) + '» → ¿quisiste escribir <strong>' + esc(t[1]) + '</strong>?</li>').join('') + '</ul></div>';
    h += '<details class="model"><summary>Ver una respuesta de ejemplo</summary><p>' + esc(l.escribe.modelo) + '</p></details>';
    return { ok: ok, html: h };
  }

  /* ---------- pantallas ---------- */
  const lessonStats = (l) => ({ done: l.ejercicios.filter((e) => P.done[e.id]).length, total: l.ejercicios.length, note: !!(P.notes[l.id] && P.notes[l.id].ok) });
  let route = { v: 'home', id: 0, tab: 'aprender' };

  function viewHome() {
    let totalD = 0, totalT = 0;
    const cards = L.map((l) => {
      const s = lessonStats(l); totalD += s.done; totalT += s.total;
      const pct = Math.round(100 * s.done / s.total);
      const done = s.done === s.total && s.note;
      return '<a class="lesson' + (done ? ' fin' : '') + '" href="#/l/' + l.id + '"><span class="num">' + (done ? '✓' : l.id) + '</span><span class="lt"><b>' + esc(l.titulo) + '</b><small>' + esc(l.resumen) + '</small>' +
        '<span class="bar"><i style="width:' + pct + '%"></i></span><small>' + s.done + ' de ' + s.total + ' ejercicios' + (s.note ? ' · escrito ✓' : '') + '</small></span></a>';
    }).join('');
    const next = L.find((l) => { const s = lessonStats(l); return s.done < s.total || !s.note; });
    return '<header class="top"><h1>Aprende bases de datos</h1><p class="sub">Paso a paso, desde cero. Practicas escribiendo SQL de verdad.</p></header>' +
      '<section class="prog"><b>' + totalD + ' de ' + totalT + '</b> ejercicios hechos' + (next ? '<a class="btn go" href="#/l/' + next.id + '">' + (totalD ? 'Seguir: ' : 'Empezar: ') + esc(next.titulo) + '</a>' : '<p>¡Terminaste todas las lecciones!</p>') + '</section>' +
      '<section class="list">' + cards + '</section>' +
      '<p class="fine foot">Tus avances se guardan en este aparato. Aquí se practica con SQLite, que se parece mucho a MySQL en lo básico.</p>';
  }

  function tablePreview() {
    const r = exec('SELECT * FROM estudiantes');
    return '<details class="peek"><summary>Ver la tabla <b>estudiantes</b> (los datos con los que practicas)</summary>' + tableHtml(r.cols, r.rows) + '</details>';
  }

  function viewLesson(l) {
    const tabs = [['aprender', '1 Aprende'], ['practica', '2 Practica'], ['escribe', '3 Escribe']];
    const s = lessonStats(l);
    let body = '';
    if (route.tab === 'aprender') {
      let ci = 0;
      body = tablePreview() + l.aprender.map((b) => {
        if (b.t === 'p') return '<p>' + md(b.x) + '</p>';
        const i = ci++;
        return '<div class="try"><textarea class="sql" rows="2" spellcheck="false" autocapitalize="off" autocorrect="off" data-ta="ex' + i + '">' + esc(b.sql) + '</textarea>' +
          '<button class="btn small" data-act="runex" data-i="' + i + '">▶ Ejecutar</button><div id="exres' + i + '" class="res"></div></div>';
      }).join('') + '<button class="btn go" data-act="tab" data-tab="practica">Ir a practicar →</button>';
    } else if (route.tab === 'practica') {
      body = tablePreview() + '<p class="fine">Escribe la consulta, toca <b>Revisar</b> y te digo si está bien. Puedes pedir una pista cuando quieras.</p>' +
        l.ejercicios.map((e, k) => {
          const d = P.done[e.id], draft = P.drafts[e.id] || '';
          return '<section class="ex' + (d ? ' done' : '') + '" id="ex-' + e.id.replace('.', '-') + '"><h3><span class="chk">' + (d ? '✓' : (k + 1)) + '</span> ' + md(e.texto) + '</h3>' +
            '<textarea class="sql" rows="3" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="Escribe aquí tu consulta…" data-ta="' + e.id + '">' + esc(draft) + '</textarea>' +
            '<div class="row"><button class="btn small" data-act="run" data-id="' + e.id + '">▶ Ejecutar</button><button class="btn small main" data-act="check" data-id="' + e.id + '">Revisar</button>' +
            '<button class="btn small ghost" data-act="hint" data-id="' + e.id + '">Pista</button><button class="btn small ghost" data-act="sol" data-id="' + e.id + '">Ver respuesta</button></div>' +
            '<div class="hint" id="hint-' + e.id + '" hidden></div><div class="res" id="res-' + e.id + '"></div></section>';
        }).join('') + (s.done === s.total ? '<button class="btn go" data-act="tab" data-tab="escribe">Ir a escribir lo aprendido →</button>' : '');
    } else {
      const n = P.notes[l.id] || { text: '' };
      body = '<section class="ex"><h3>' + esc(l.escribe.pregunta) + '</h3><textarea class="note" rows="6" data-ta="note" placeholder="Escribe con tus palabras…">' + esc(n.text) + '</textarea>' +
        '<div class="row"><button class="btn small main" data-act="review">Revisar lo que escribí</button></div><div class="res" id="noteres"></div></section>';
    }
    const nav = '<nav class="tabs">' + tabs.map((t) => '<button class="' + (route.tab === t[0] ? 'on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</nav>';
    const next = L.find((x) => x.id === l.id + 1);
    return '<header class="top"><a class="back" href="#/">← Lecciones</a><h1>' + l.id + '. ' + esc(l.titulo) + '</h1></header>' + nav + '<div class="body">' + body + '</div>' +
      (route.tab === 'escribe' && next ? '<a class="btn go" href="#/l/' + next.id + '">Siguiente lección: ' + esc(next.titulo) + ' →</a>' : '');
  }

  function render() {
    if (loadErr) { app.innerHTML = '<div class="msg bad"><strong>No se pudo cargar el motor de bases de datos.</strong><p>' + esc(loadErr) + '</p><p>Recarga la página.</p></div>'; return; }
    if (!SQL) { app.innerHTML = '<p class="loading">Cargando…</p>'; return; }
    if (route.v === 'home') app.innerHTML = viewHome();
    else { const l = L.find((x) => x.id === route.id); app.innerHTML = l ? viewLesson(l) : viewHome(); }
  }

  /* ---------- eventos ---------- */
  function parseHash() {
    const m = location.hash.match(/^#\/l\/(\d+)(?:\/(\w+))?/);
    if (m) { route = { v: 'lesson', id: Number(m[1]), tab: m[2] || 'aprender' }; } else route = { v: 'home', id: 0, tab: 'aprender' };
    render(); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', parseHash);
  const ex = (id) => { for (const l of L) { const e = l.ejercicios.find((x) => x.id === id); if (e) return e; } return null; };
  const ta = (name) => app.querySelector('[data-ta="' + name + '"]');

  document.addEventListener('input', (e) => {
    const n = e.target.dataset && e.target.dataset.ta; if (!n) return;
    if (n === 'note') { const o = P.notes[route.id] || {}; P.notes[route.id] = { text: e.target.value, ok: !!o.ok }; save(); }
    else if (!/^ex\d+$/.test(n)) { P.drafts[n] = e.target.value; save(); }
  });
  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-act]'); if (!el) return;
    const act = el.dataset.act, id = el.dataset.id;
    if (act === 'tab') { location.hash = '#/l/' + route.id + '/' + el.dataset.tab; return; }
    if (act === 'runex') { const q = ta('ex' + el.dataset.i).value; document.getElementById('exres' + el.dataset.i).innerHTML = resultHtml(exec(q), q); return; }
    if (act === 'run' || act === 'check') {
      const q = ta(id).value.trim(), box = document.getElementById('res-' + id);
      if (!q) { box.innerHTML = '<div class="msg warn">Escribe tu consulta primero.</div>'; return; }
      if (act === 'run') { box.innerHTML = resultHtml(exec(q), q); return; }
      const r = check(ex(id), q); box.innerHTML = r.html;
      if (r.good && !P.done[id]) { P.done[id] = true; save(); const sec = el.closest('.ex'); sec.classList.add('done'); sec.querySelector('.chk').textContent = '✓'; }
      return;
    }
    if (act === 'hint') { const h = document.getElementById('hint-' + id); h.hidden = false; h.innerHTML = '💡 ' + md(ex(id).pista); return; }
    if (act === 'sol') {
      const h = document.getElementById('hint-' + id);
      h.hidden = false; h.innerHTML = 'Una respuesta correcta es: <code class="solc">' + esc(ex(id).sol) + '</code><br><small>Intenta escribirla tú y toca Revisar.</small>'; return;
    }
    if (act === 'review') {
      const l = L.find((x) => x.id === route.id), t = ta('note').value;
      const r = reviewNote(l, t);
      P.notes[l.id] = { text: t, ok: r.ok || !!(P.notes[l.id] && P.notes[l.id].ok) }; save();
      document.getElementById('noteres').innerHTML = r.html;
    }
  });

  /* ---------- inicio ---------- */
  render();
  initSqlJs({ locateFile: (f) => 'lib/' + f }).then((S) => { SQL = S; parseHash(); }).catch((e) => { loadErr = String(e && e.message || e); render(); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__aprende = { exec: exec, check: check, reviewNote: reviewNote, suggest: suggest, P: () => P, ex: ex };
})();
