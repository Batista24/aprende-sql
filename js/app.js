/* Aprende bases de datos - app principal (sin servidor, todo en el navegador) */
(function () {
  'use strict';
  const KEY = 'aprendesql.v1';
  const L = window.LECCIONES, KW = window.KEYWORDS, SCHEMA = window.SCHEMA;
  const TABLES = Object.keys(SCHEMA);
  const COLS = TABLES.reduce((a, t) => a.concat(SCHEMA[t].filter((c) => a.indexOf(c) < 0)), []);
  let ACTIVE = null; // esquema de "Mis bases" mientras se ejecuta
  const tablesNow = () => (ACTIVE ? Object.keys(ACTIVE) : TABLES);
  const colsNow = () => (ACTIVE ? Object.keys(ACTIVE).reduce((a, t) => a.concat(ACTIVE[t].filter((c) => a.indexOf(c) < 0)), []) : COLS);
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
  function makeDb() { const db = new SQL.Database(); db.run(window.SEED); db.run('PRAGMA foreign_keys = ON'); return db; }
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
    const known = KW.map((k) => k.toLowerCase()).concat(colsNow(), tablesNow());
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
  function friendlyError(err, sql, ex) {
    let m = err.match(/no such column: (\S+)/i);
    if (m) return 'La columna «' + esc(m[1]) + '» no existe. Las columnas son: <strong>' + colsNow().join(', ') + '</strong>.';
    m = err.match(/no such table: (\S+)/i);
    if (m && ex && ex.verify) return 'La tabla «' + esc(m[1]) + '» todavía no existe. ¿Escribiste el <code>CREATE TABLE</code> con ese nombre, en el mismo bloque?';
    if (m) return 'La tabla «' + esc(m[1]) + '» no existe. Las tablas son: <strong>' + (tablesNow().join(', ') || 'ninguna todavía')  + '</strong>.';
    if (/FOREIGN KEY constraint failed/i.test(err)) return 'Esa fila está conectada con otra tabla (llave foránea). El valor que pones no existe en la otra tabla, o hay filas que dependen de la que quieres borrar.';
    if (/UNIQUE constraint failed/i.test(err)) return 'Ese valor ya existe y la columna no permite repetidos (<code>PRIMARY KEY</code> o <code>UNIQUE</code>).';
    if (/NOT NULL constraint failed/i.test(err)) return 'Esa columna no puede quedar vacía (<code>NOT NULL</code>). Ponle un valor.';
    if (/already exists/i.test(err)) return 'Esa tabla ya existe. Si quieres, bórrala primero con <code>DROP TABLE</code>.';
    if (/duplicate column/i.test(err)) return 'Esa columna ya existe en la tabla.';
    if (/values for \d+ columns|has \d+ columns but \d+ values/i.test(err)) return 'La cantidad de valores no coincide con la cantidad de columnas. Cuéntalos.';
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
  function resultHtml(r, sql, ex) {
    if (!r.ok) {
      const fe = friendlyError(r.err, sql, ex), tips = suggest(sql).filter((t) => !(/comilla/.test(t) && /comilla/.test(fe)));
      return '<div class="msg bad"><strong>Hay un error.</strong><p>' + fe + '</p>' +
        (tips.length ? '<ul>' + tips.map((t) => '<li>' + t + '</li>').join('') + '</ul>' : '') + '</div>';
    }
    if (r.none) return '<div class="msg ok">Se ejecutó sin errores. Esa instrucción no muestra una tabla; usa un <code>SELECT</code> para ver cómo quedó.</div>';
    return tableHtml(r.cols, r.rows);
  }

  /* ---------- revisar un ejercicio ---------- */
  const normVal = (v) => typeof v === 'number' ? Math.round(v * 10000) / 10000 : v;
  const rowKey = (r) => JSON.stringify(r.map(normVal));
  const trimSql = (q) => q.replace(/[\s;]+$/, '');
  function check(ex, sql) {
    const verify = !!ex.verify;
    let u = exec(verify ? trimSql(sql) + ';\n' + ex.verify : sql);
    if (!u.ok) return { html: resultHtml(u, sql, ex), good: false };
    if (u.none && verify) u = { ok: true, cols: ['(no se encontró nada)'], rows: [] };
    if (u.none) return { html: resultHtml(u, sql, ex), good: false };
    let e = exec(verify ? trimSql(ex.sol) + ';\n' + ex.verify : ex.sol);
    if (e.none) e = { ok: true, cols: [], rows: [] };
    const ordered = /order\s+by/i.test(ex.sol), names = /\sas\s/i.test(ex.sol);
    const table = (verify ? '<p class="fine">Así quedó:</p>' : '') + tableHtml(u.cols, u.rows);
    const bad = (t, extra) => ({ good: false, html: '<div class="msg bad"><strong>Casi. ' + t + '</strong>' + (extra ? '<p>' + extra + '</p>' : '') + '</div>' + table });
    const a = u.rows.map(rowKey), b = e.rows.map(rowKey);
    const sameSet = a.length === b.length && a.slice().sort().join('|') === b.slice().sort().join('|');
    if (verify) {
      if (!sameSet) return bad('Lo que hiciste no coincide con lo que pide el ejercicio.', (/pragma|sqlite_master/i.test(ex.verify) ? 'Revisa los nombres de las tablas y columnas, los tipos y las restricciones que pide el ejercicio.' : 'Revisa si te falta o te sobra algo, por ejemplo un <code>WHERE</code>.') + ' Toca <strong>Ejecutar</strong> para ver cómo quedó y compara.');
      return { good: true, html: '<div class="msg ok"><strong>¡Correcto!</strong></div>' + table };
    }
    if (u.cols.length !== e.cols.length) {
      return bad(u.cols.length < e.cols.length ? 'Te faltan columnas.' : 'Tienes columnas de más.',
        'Pediste ' + u.cols.length + ' y el ejercicio pide ' + e.cols.length + '. Revisa qué columnas pide el ejercicio.');
    }
    if (names && u.cols.map((c) => c.toLowerCase()).join() !== e.cols.map((c) => c.toLowerCase()).join()) {
      return bad('El nombre de la columna no es el pedido.', 'El ejercicio pide que se llame <strong>' + esc(e.cols.join(', ')) + '</strong>. Usa <code>AS</code>.');
    }
    if (u.rows.length !== e.rows.length) {
      return bad('Salieron ' + u.rows.length + ' filas y deberían ser ' + e.rows.length + '.',
        u.rows.length > e.rows.length ? 'Salen filas de más: revisa tu condición <code>WHERE</code>, el <code>JOIN</code> o el <code>LIMIT</code>.' : 'Salen menos filas de las que pide el ejercicio: tu condición o tu <code>JOIN</code> pueden ser muy estrictos.');
    }
    const same = ordered ? a.join('|') === b.join('|') : sameSet;
    if (!same) {
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
  let EXV = [], COPYS = [];

  function viewHome() {
    let totalD = 0, totalT = 0;
    const cards = L.map((l) => {
      const part = window.PARTES && window.PARTES[l.id] ? '<h2 class="part">' + esc(window.PARTES[l.id]) + '</h2>' : '';
      const s = lessonStats(l); totalD += s.done; totalT += s.total;
      const pct = Math.round(100 * s.done / s.total);
      const done = s.done === s.total && s.note;
      return part + '<a class="lesson' + (done ? ' fin' : '') + '" href="#/l/' + l.id + '"><span class="num">' + (done ? '✓' : l.id) + '</span><span class="lt"><b>' + esc(l.titulo) + '</b><small>' + esc(l.resumen) + '</small>' +
        '<span class="bar"><i style="width:' + pct + '%"></i></span><small>' + s.done + ' de ' + s.total + ' ejercicios' + (s.note ? ' · escrito ✓' : '') + '</small></span></a>';
    }).join('');
    const next = L.find((l) => { const s = lessonStats(l); return s.done < s.total || !s.note; });
    return '<header class="top"><h1>Aprende bases de datos</h1><p class="sub">Paso a paso, desde cero. Practicas escribiendo SQL de verdad.</p></header>' +
      '<section class="prog"><b>' + totalD + ' de ' + totalT + '</b> ejercicios hechos' + (next ? '<a class="btn go" href="#/l/' + next.id + '">' + (totalD ? 'Seguir: ' : 'Empezar: ') + esc(next.titulo) + '</a>' : '<p>¡Terminaste todas las lecciones!</p>') + '</section>' +
      '<section class="list">' + cards + '</section>' +
      '<p class="fine foot">Tus avances se guardan en este aparato. Aquí se practica con SQLite, que se parece mucho a MySQL en lo básico.</p>';
  }

  function tablePreview() {
    const body = TABLES.map((t) => { const r = exec('SELECT * FROM ' + t); return '<h4 class="tn">Tabla ' + t + '</h4>' + tableHtml(r.cols, r.rows); }).join('');
    return '<details class="peek"><summary>Ver las tablas con las que practicas</summary>' + body + '</details>';
  }

  function viewLesson(l) {
    const tabs = [['aprender', '1 Aprende'], ['practica', '2 Practica'], ['escribe', '3 Escribe']];
    const s = lessonStats(l);
    let body = '';
    if (route.tab === 'aprender') {
      let ci = 0;
      EXV = []; COPYS = [];
      body = tablePreview() + l.aprender.map((b) => {
        if (b.t === 'p') return '<p>' + md(b.x) + '</p>';
        if (b.t === 'pre') return '<pre class="pre">' + esc(b.x) + '</pre>';
        if (b.t === 'copy') { const j = COPYS.push(b.x) - 1; return '<pre class="pre big">' + esc(b.x) + '</pre><button class="btn small" data-act="copy" data-j="' + j + '">📋 Copiar script</button><p></p>'; }
        const i = ci++; EXV[i] = b.ver || '';
        return '<div class="try"><textarea class="sql" rows="' + Math.min(8, Math.max(2, b.sql.split('\n').length)) + '" spellcheck="false" autocapitalize="off" autocorrect="off" data-ta="ex' + i + '">' + esc(b.sql) + '</textarea>' +
          '<button class="btn small" data-act="runex" data-i="' + i + '">▶ Ejecutar</button><div id="exres' + i + '" class="res"></div></div>';
      }).join('') + '<button class="btn go" data-act="tab" data-tab="practica">Ir a practicar →</button>';
    } else if (route.tab === 'practica') {
      body = tablePreview() + '<p class="fine">Escribe tu respuesta, toca <b>Revisar</b> y te digo si está bien. Puedes pedir una pista cuando quieras.</p>' +
        l.ejercicios.map((e, k) => {
          const d = P.done[e.id], draft = P.drafts[e.id] || '';
          if (e.q) {
            return '<section class="ex' + (d ? ' done' : '') + '" id="ex-' + e.id.replace('.', '-') + '"><h3><span class="chk">' + (d ? '✓' : (k + 1)) + '</span> ' + md(e.texto) + '</h3><div class="opts">' +
              e.q.opts.map((o, j) => '<button class="btn opt" data-act="opt" data-id="' + e.id + '" data-k="' + j + '">' + esc(o) + '</button>').join('') + '</div><div class="res" id="res-' + e.id + '"></div></section>';
          }
          return '<section class="ex' + (d ? ' done' : '') + '" id="ex-' + e.id.replace('.', '-') + '"><h3><span class="chk">' + (d ? '✓' : (k + 1)) + '</span> ' + md(e.texto) + '</h3>' +
            '<textarea class="sql" rows="' + (e.verify ? 5 : 3) + '" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="Escribe aquí tu consulta…" data-ta="' + e.id + '">' + esc(draft) + '</textarea>' +
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
    const nav = document.getElementById('bnav');
    if (loadErr) { app.innerHTML = '<div class="msg bad"><strong>No se pudo cargar el motor de bases de datos.</strong><p>' + esc(loadErr) + '</p><p>Recarga la página.</p></div>'; return; }
    if (!SQL) { app.innerHTML = '<p class="loading">Cargando…</p>'; return; }
    if (route.v !== 'db') closeCur();
    if (route.v === 'lab') app.innerHTML = viewLab();
    else if (route.v === 'dblist') app.innerHTML = viewDbList();
    else if (route.v === 'db') app.innerHTML = viewDb(route.dbid);
    else if (route.v === 'home') app.innerHTML = viewHome();
    else { const l = L.find((x) => x.id === route.id); app.innerHTML = l ? viewLesson(l) : viewHome(); }
    const sec = route.v === 'lab' ? 'lab' : (route.v === 'dblist' || route.v === 'db') ? 'db' : 'lec';
    nav.innerHTML = [['lec', '#/', '📚', 'Lecciones'], ['lab', '#/lab', '🧪', 'Laboratorio'], ['db', '#/db', '🗄', 'Mis bases']].map((x) =>
      '<a href="' + x[1] + '"' + (sec === x[0] ? ' class="on" aria-current="page"' : '') + '><span aria-hidden="true">' + x[2] + '</span>' + x[3] + '</a>').join('');
  }

  /* ---------- ejecutar SQL libre (Laboratorio y Mis bases) ---------- */
  function execOn(db, sql) {
    try {
      const r = db.exec(sql);
      return { ok: true, sets: r.map((x) => ({ cols: x.columns, rows: x.values })), changes: db.getRowsModified() };
    } catch (e) { return { ok: false, err: String(e.message || e) }; }
  }
  function freeHtml(r, sql) {
    if (!r.ok) return resultHtml(r, sql);
    if (!r.sets.length) return '<div class="msg ok">Se ejecutó sin errores.' + (r.changes ? ' Filas afectadas: <strong>' + r.changes + '</strong>.' : '') + '</div>';
    return r.sets.map((x, i) => (r.sets.length > 1 ? '<p class="fine">Resultado ' + (i + 1) + ':</p>' : '') + tableHtml(x.cols, x.rows)).join('');
  }
  const EJEMPLOS = ['SELECT * FROM estudiantes', 'SELECT nombre, nota FROM estudiantes ORDER BY nota DESC', 'SELECT curso, AVG(nota) FROM estudiantes GROUP BY curso', 'SELECT * FROM materias JOIN profesores ON materias.profesor_id = profesores.id'];

  function viewLab() {
    const q = P.drafts.lab || '';
    return '<header class="top"><h1>Laboratorio</h1><p class="sub">Escribe cualquier SQL y míralo funcionar. Usa las tablas de práctica: estudiantes, profesores, materias y notas.</p></header>' +
      '<div class="msg warn">Aquí <strong>nada se guarda</strong>: cada vez que ejecutas, la base empieza de nuevo. Para guardar tu trabajo usa <a href="#/db">Mis bases</a>.</div>' +
      tablePreview() +
      '<textarea class="sql" rows="6" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="Escribe aquí tu SQL…" data-ta="lab">' + esc(q) + '</textarea>' +
      '<div class="row"><button class="btn small main" data-act="labrun">▶ Ejecutar</button><button class="btn small ghost" data-act="labclear">Borrar</button></div>' +
      '<div class="res" id="labres"></div>' +
      '<h3 class="mt">Ejemplos para probar</h3><div class="chips">' + EJEMPLOS.map((e, i) => '<button class="btn small ghost chipb" data-act="fill" data-target="lab" data-i="' + i + '">' + esc(e) + '</button>').join('') + '</div>';
  }

  /* ---------- Mis bases de datos (se guardan en este aparato) ---------- */
  const DBX = 'aprendesql.dbs';
  const loadIdx = () => { try { const x = JSON.parse(localStorage.getItem(DBX)); if (Array.isArray(x)) return x; } catch (e) { /* ignorar */ } return []; };
  const saveIdx = (l) => { try { localStorage.setItem(DBX, JSON.stringify(l)); } catch (e) { /* ignorar */ } };
  const b64 = (u) => { let t = ''; for (let i = 0; i < u.length; i += 8192) t += String.fromCharCode.apply(null, u.subarray(i, i + 8192)); return btoa(t); };
  const unb64 = (t) => { const x = atob(t), u = new Uint8Array(x.length); for (let i = 0; i < x.length; i++) u[i] = x.charCodeAt(i); return u; };
  function openDb(id) {
    let raw = null; try { raw = localStorage.getItem('aprendesql.db.' + id); } catch (e) { /* ignorar */ }
    const db = raw ? new SQL.Database(unb64(raw)) : new SQL.Database(); db.run('PRAGMA foreign_keys = ON'); return db;
  }
  function snapshot(db) { const u = db.export(); db.run('PRAGMA foreign_keys = ON'); return u; }
  function persist(id, db) {
    try { localStorage.setItem('aprendesql.db.' + id, b64(snapshot(db))); return true; } catch (e) { return false; }
  }
  let cur = null; // { id, db } base abierta
  function closeCur() { if (cur) { try { cur.db.close(); } catch (e) { /* ignorar */ } cur = null; } }
  function schemaOf(db) {
    const out = {};
    try {
      const t = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid");
      (t.length ? t[0].values : []).forEach((r) => {
        const c = db.exec("SELECT name, type, pk FROM pragma_table_info('" + r[0].replace(/'/g, "''") + "')");
        const n = db.exec('SELECT COUNT(*) FROM "' + r[0].replace(/"/g, '""') + '"');
        out[r[0]] = { cols: c.length ? c[0].values : [], n: n.length ? n[0].values[0][0] : 0 };
      });
    } catch (e) { /* ignorar */ }
    return out;
  }
  function tablesPanel(db) {
    const sc = schemaOf(db), names = Object.keys(sc);
    if (!names.length) return '<div class="msg warn">Esta base de datos todavía no tiene tablas. Crea la primera con <code>CREATE TABLE</code>. Ejemplo:<code class="solc">CREATE TABLE cursos (id INTEGER PRIMARY KEY, nombre TEXT);</code></div>';
    return names.map((t) => '<div class="tcard"><div class="th"><b>' + esc(t) + '</b><small>' + sc[t].n + (sc[t].n === 1 ? ' fila' : ' filas') + '</small></div><div class="cols">' +
      sc[t].cols.map((c) => '<span class="col">' + (c[2] ? '🔑 ' : '') + esc(c[0]) + ' <small>' + esc(c[1] || '') + '</small></span>').join('') + '</div>' +
      '<button class="btn small ghost" data-act="dbview" data-t="' + esc(t) + '">Ver datos</button></div>').join('');
  }
  function activeSchema(db) { const sc = schemaOf(db), o = {}; Object.keys(sc).forEach((t) => { o[t] = sc[t].cols.map((c) => c[0]); }); return o; }
  const sqlName = (n) => (norm(n).replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'mi_base');
  function dumpSql(db, name) {
    const q = (v) => v === null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
    const L2 = ['-- Base de datos "' + name + '" exportada desde "Aprende bases de datos".', '-- Pégala en MySQL Workbench y ejecútala con el rayo.', '',
      'CREATE DATABASE IF NOT EXISTS ' + sqlName(name) + ';', 'USE ' + sqlName(name) + ';', ''];
    const t = db.exec("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid");
    (t.length ? t[0].values : []).forEach((r) => {
      const ddl = String(r[1]).replace(/INTEGER\s+PRIMARY\s+KEY(\s+AUTOINCREMENT)?/gi, 'INT AUTO_INCREMENT PRIMARY KEY').replace(/\bINTEGER\b/gi, 'INT').replace(/\bTEXT\b/gi, 'VARCHAR(255)');
      L2.push(ddl + ';');
      const d = db.exec('SELECT * FROM "' + String(r[0]).replace(/"/g, '""') + '"');
      if (d.length && d[0].values.length) {
        L2.push('INSERT INTO ' + r[0] + ' (' + d[0].columns.join(', ') + ') VALUES');
        L2.push(d[0].values.map((v) => '(' + v.map(q).join(', ') + ')').join(',\n') + ';');
      }
      L2.push('');
    });
    return L2.join('\n');
  }
  function download(name, data, type) {
    const url = URL.createObjectURL(new Blob([data], { type: type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function viewDbList() {
    const list = loadIdx();
    const cards = list.length ? list.map((d) => '<a class="lesson" href="#/db/' + d.id + '"><span class="num">🗄</span><span class="lt"><b>' + esc(d.name) + '</b><small>Creada el ' + esc(d.created || '') + '</small></span></a>').join('') :
      '<p class="fine">Todavía no tienes ninguna base de datos. Crea la primera aquí abajo.</p>';
    return '<header class="top"><h1>Mis bases de datos</h1><p class="sub">Aquí creas tus propias bases de datos. Todo lo que hagas se guarda en este aparato y lo puedes usar otro día.</p></header>' +
      '<section class="list">' + cards + '</section>' +
      '<section class="ex mt"><h3>Crear una base de datos nueva</h3>' +
      '<label class="fld"><span>Nombre</span><input class="inp" id="dbname" type="text" maxlength="40" placeholder="Ejemplo: colegio" autocomplete="off"></label>' +
      '<label class="fld"><span>¿Con qué empieza?</span><select class="inp" id="dbstart"><option value="vacia">Vacía (yo creo las tablas)</option><option value="colegio">Con las tablas del colegio de las lecciones</option></select></label>' +
      '<button class="btn main" data-act="dbcreate">Crear base de datos</button><div class="res" id="dbmsg"></div></section>' +
      '<section class="ex"><h3>Traer una que ya tengo</h3><p class="fine">Puedes cargar un archivo <b>.sql</b> (por ejemplo, exportado de MySQL) o un archivo <b>.sqlite</b>.</p>' +
      '<label class="btn small">Elegir archivo<input type="file" accept=".sql,.sqlite,.db,.txt" data-act-change="dbimport" hidden></label></section>' +
      '<p class="fine foot">Las bases se guardan solo en este aparato y navegador. Descarga una copia de cada una para no perderla.</p>';
  }

  function viewDb(id) {
    const d = loadIdx().find((x) => x.id === id);
    if (!d) return '<header class="top"><a class="back" href="#/db">← Mis bases</a><h1>No encontrada</h1></header><p>Esa base de datos no existe en este aparato.</p>';
    if (!cur || cur.id !== id) { closeCur(); cur = { id: id, db: openDb(id) }; }
    return '<header class="top"><a class="back" href="#/db">← Mis bases</a><h1>' + esc(d.name) + '</h1></header>' +
      '<div class="msg warn">Aquí los cambios <strong>sí se guardan</strong>. Si te equivocas, toca <b>Deshacer</b> para volver a como estaba antes de la última ejecución.</div>' +
      '<h3>Mis tablas</h3><div id="dbtables">' + tablesPanel(cur.db) + '</div>' +
      '<h3 class="mt">Escribe tu SQL</h3><textarea class="sql" rows="7" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="Escribe aquí tu SQL…" data-ta="dbq:' + id + '">' + esc(P.drafts['dbq:' + id] || '') + '</textarea>' +
      '<div class="row"><button class="btn small main" data-act="dbrun">▶ Ejecutar</button><button class="btn small ghost" data-act="dbundo">↩ Deshacer última ejecución</button></div>' +
      '<div class="res" id="dbres"></div>' +
      '<section class="ex mt"><h3>Guardar copia y administrar</h3><div class="row">' +
      '<button class="btn small" data-act="dbdl">⬇ Descargar .sql (para MySQL)</button><button class="btn small" data-act="dbdlq">⬇ Descargar .sqlite</button></div>' +
      '<div class="row"><button class="btn small ghost" data-act="dbren">Cambiar nombre</button><button class="btn small ghost danger" data-act="dbdel">Borrar esta base</button></div></section>';
  }

  /* ---------- eventos ---------- */
  function parseHash() {
    const m = location.hash.match(/^#\/l\/(\d+)(?:\/(\w+))?/), md2 = location.hash.match(/^#\/db\/(\w+)/);
    if (m) { route = { v: 'lesson', id: Number(m[1]), tab: m[2] || 'aprender' }; }
    else if (md2) route = { v: 'db', dbid: md2[1] };
    else if (/^#\/db/.test(location.hash)) route = { v: 'dblist' };
    else if (/^#\/lab/.test(location.hash)) route = { v: 'lab' };
    else route = { v: 'home', id: 0, tab: 'aprender' };
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
    if (act === 'runex') {
      const i = el.dataset.i, q = ta('ex' + i).value, ver = EXV[i], box = document.getElementById('exres' + i);
      const r = exec(q);
      if (r.ok && r.none && ver) { const r2 = exec(trimSql(q) + ';\n' + ver); box.innerHTML = '<div class="msg ok">Se ejecutó sin errores. Así quedó:</div>' + resultHtml(r2, q); }
      else box.innerHTML = resultHtml(r, q);
      return;
    }
    if (act === 'labrun') {
      const q = ta('lab').value.trim(), box = document.getElementById('labres');
      if (!q) { box.innerHTML = '<div class="msg warn">Escribe tu SQL primero.</div>'; return; }
      const db = makeDb(); const r = execOn(db, q); db.close(); box.innerHTML = freeHtml(r, q); return;
    }
    if (act === 'labclear') { ta('lab').value = ''; P.drafts.lab = ''; save(); document.getElementById('labres').innerHTML = ''; return; }
    if (act === 'fill') { const t = ta(el.dataset.target); t.value = EJEMPLOS[Number(el.dataset.i)]; P.drafts[el.dataset.target] = t.value; save(); t.focus(); return; }
    if (act === 'dbcreate') {
      const name = document.getElementById('dbname').value.trim(), msg = document.getElementById('dbmsg');
      if (!name) { msg.innerHTML = '<div class="msg warn">Escribe un nombre para tu base de datos.</div>'; return; }
      const id = 'd' + Date.now().toString(36), db = document.getElementById('dbstart').value === 'colegio' ? makeDb() : new SQL.Database();
      db.run('PRAGMA foreign_keys = ON');
      if (!persist(id, db)) { db.close(); msg.innerHTML = '<div class="msg bad">No se pudo guardar. Puede que el navegador no deje guardar datos (¿ventana privada?).</div>'; return; }
      db.close();
      const l = loadIdx(); l.push({ id: id, name: name, created: new Date().toLocaleDateString('es-DO') }); saveIdx(l);
      location.hash = '#/db/' + id; return;
    }
    if (act === 'dbrun') {
      const q = ta('dbq:' + cur.id).value.trim(), box = document.getElementById('dbres');
      if (!q) { box.innerHTML = '<div class="msg warn">Escribe tu SQL primero.</div>'; return; }
      const readOnly = /^\s*(select|pragma|with|explain)\b/i.test(q) && q.indexOf(';') < 0;
      if (!readOnly) { try { localStorage.setItem('aprendesql.undo.' + cur.id, b64(snapshot(cur.db))); } catch (e) { /* ignorar */ } }
      ACTIVE = activeSchema(cur.db); const r = execOn(cur.db, q);
      box.innerHTML = freeHtml(r, q); ACTIVE = null;
      if (r.ok && !readOnly && !persist(cur.id, cur.db)) box.innerHTML += '<div class="msg bad">No se pudo guardar el cambio en este aparato.</div>';
      document.getElementById('dbtables').innerHTML = tablesPanel(cur.db); return;
    }
    if (act === 'dbundo') {
      let raw = null; try { raw = localStorage.getItem('aprendesql.undo.' + cur.id); } catch (e) { /* ignorar */ }
      const box = document.getElementById('dbres');
      if (!raw) { box.innerHTML = '<div class="msg warn">No hay nada que deshacer.</div>'; return; }
      try { cur.db.close(); } catch (e) { /* ignorar */ }
      cur.db = new SQL.Database(unb64(raw)); cur.db.run('PRAGMA foreign_keys = ON'); persist(cur.id, cur.db);
      try { localStorage.removeItem('aprendesql.undo.' + cur.id); } catch (e) { /* ignorar */ }
      box.innerHTML = '<div class="msg ok">Listo: volvió a como estaba antes de la última ejecución.</div>';
      document.getElementById('dbtables').innerHTML = tablesPanel(cur.db); return;
    }
    if (act === 'dbview') {
      const t = ta('dbq:' + cur.id); t.value = 'SELECT * FROM ' + el.dataset.t; P.drafts['dbq:' + cur.id] = t.value; save();
      document.getElementById('dbres').innerHTML = freeHtml(execOn(cur.db, t.value), t.value); return;
    }
    if (act === 'dbdl' || act === 'dbdlq') {
      const d = loadIdx().find((x) => x.id === cur.id);
      if (act === 'dbdl') download(sqlName(d.name) + '.sql', dumpSql(cur.db, d.name), 'text/plain');
      else { download(sqlName(d.name) + '.sqlite', snapshot(cur.db), 'application/octet-stream'); }
      return;
    }
    if (act === 'dbren') {
      const l = loadIdx(), d = l.find((x) => x.id === cur.id), n = prompt('Nuevo nombre:', d.name);
      if (n && n.trim()) { d.name = n.trim().slice(0, 40); saveIdx(l); render(); }
      return;
    }
    if (act === 'dbdel') {
      const l = loadIdx(), d = l.find((x) => x.id === cur.id);
      if (confirm('¿Borrar la base de datos "' + d.name + '" y todo lo que tiene? Esto no se puede deshacer.')) {
        const idd = cur.id; closeCur(); saveIdx(l.filter((x) => x.id !== idd));
        try { localStorage.removeItem('aprendesql.db.' + idd); localStorage.removeItem('aprendesql.undo.' + idd); } catch (e) { /* ignorar */ }
        location.hash = '#/db';
      }
      return;
    }
    if (act === 'copy') {
      const txt = COPYS[Number(el.dataset.j)];
      const done = () => { el.textContent = '✓ ¡Copiado!'; setTimeout(() => { el.textContent = '📋 Copiar script'; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done).catch(() => { fallbackCopy(txt); done(); });
      else { fallbackCopy(txt); done(); }
      return;
    }
    if (act === 'opt') {
      const e = ex(id), box = document.getElementById('res-' + id);
      if (Number(el.dataset.k) === e.q.ok) {
        box.innerHTML = '<div class="msg ok"><strong>¡Correcto!</strong><p>' + esc(e.fb) + '</p></div>';
        if (!P.done[id]) { P.done[id] = true; save(); const sec = el.closest('.ex'); sec.classList.add('done'); sec.querySelector('.chk').textContent = '✓'; }
      } else box.innerHTML = '<div class="msg warn">Esa no es. Piénsalo otra vez y prueba con otra opción.</div>';
      return;
    }
    if (act === 'run' || act === 'check') {
      const q = ta(id).value.trim(), box = document.getElementById('res-' + id);
      if (!q) { box.innerHTML = '<div class="msg warn">Escribe tu consulta primero.</div>'; return; }
      if (act === 'run') {
        const e0 = ex(id), r = exec(q);
        if (r.ok && r.none && e0.verify) { const r2 = exec(trimSql(q) + ';\n' + e0.verify); box.innerHTML = r2.none ? '<div class="msg warn">Se ejecutó sin errores, pero todavía no encuentro lo que pide el ejercicio. Revisa el nombre de la tabla y de las columnas.</div>' : '<div class="msg ok">Se ejecutó sin errores. Así quedó:</div>' + resultHtml(r2, q, e0); }
        else box.innerHTML = resultHtml(r, q, e0);
        return;
      }
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

  function cleanMysql(t) {
    return t.replace(/\/\*![\s\S]*?\*\/;?/g, '').replace(/`/g, '').replace(/^\s*(CREATE DATABASE|USE|SET|LOCK TABLES|UNLOCK TABLES)\b[^;]*;/gim, '')
      .replace(/\)\s*ENGINE\s*=[^;]*;/gi, ');').replace(/\bAUTO_INCREMENT\b(\s*=\s*\d+)?/gi, '').replace(/\bINT(EGER)?\s*(\(\d+\))?\s+(NOT\s+NULL\s+)?PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY')
      .replace(/\bUNSIGNED\b/gi, '');
  }
  document.addEventListener('change', (e) => {
    const el = e.target; if (!el.dataset || el.dataset.actChange !== 'dbimport') return;
    const f = el.files && el.files[0]; if (!f) return;
    const name = f.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'importada', msg = document.getElementById('dbmsg');
    const fin = (db) => {
      const id = 'd' + Date.now().toString(36); db.run('PRAGMA foreign_keys = ON');
      if (!persist(id, db)) { db.close(); alert('No se pudo guardar en este aparato.'); return; }
      db.close(); const l = loadIdx(); l.push({ id: id, name: name, created: new Date().toLocaleDateString('es-DO') }); saveIdx(l); location.hash = '#/db/' + id;
    };
    const r = new FileReader();
    if (/\.(sql|txt)$/i.test(f.name)) {
      r.onload = () => { const db = new SQL.Database(); try { db.run(cleanMysql(String(r.result))); fin(db); } catch (err) { db.close(); alert('No pude leer ese archivo: ' + (err.message || err) + '\nSi viene de MySQL, puede tener instrucciones que esta app no entiende.'); } };
      r.readAsText(f);
    } else {
      r.onload = () => { try { const db = new SQL.Database(new Uint8Array(r.result)); db.exec('SELECT name FROM sqlite_master'); fin(db); } catch (err) { alert('Ese archivo no es una base de datos válida.'); } };
      r.readAsArrayBuffer(f);
    }
    el.value = '';
  });

  function fallbackCopy(t) {
    const x = document.createElement('textarea'); x.value = t; x.style.position = 'fixed'; x.style.opacity = '0';
    document.body.appendChild(x); x.select(); try { document.execCommand('copy'); } catch (e) { /* ignorar */ } x.remove();
  }

  /* ---------- inicio ---------- */
  render();
  initSqlJs({ locateFile: (f) => 'lib/' + f }).then((S) => { SQL = S; parseHash(); }).catch((e) => { loadErr = String(e && e.message || e); render(); });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__aprende = { exec: exec, check: check, reviewNote: reviewNote, suggest: suggest, P: () => P, ex: ex };
})();
