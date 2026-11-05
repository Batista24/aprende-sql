/* Aprende bases de datos - app principal (sin servidor, todo en el navegador) */
(function () {
  'use strict';
  const KEY = 'aprendesql.v1';
  const L = window.LECCIONES, KW = window.KEYWORDS, SCHEMA = window.SCHEMA;
  const TABLES = Object.keys(SCHEMA);
  const COLS = TABLES.reduce((a, t) => a.concat(SCHEMA[t].filter((c) => a.indexOf(c) < 0)), []);
  let ACTIVE = null; // esquema de "Mis bases" mientras se ejecuta
  let EMPTY = false, SESS = null, SCRIPTSCH = {}; // lecciones con base vacía: el esquema sale de lo que el estudiante escribe
  const tablesNow = () => (ACTIVE ? Object.keys(ACTIVE) : EMPTY ? Object.keys(SCRIPTSCH) : TABLES);
  const colsOfSch = (o) => Object.keys(o).reduce((a, t) => a.concat(o[t].filter((c) => a.indexOf(c) < 0)), []);
  const colsNow = () => (ACTIVE ? colsOfSch(ACTIVE) : EMPTY ? colsOfSch(SCRIPTSCH) : COLS);
  function scriptSchema(sql) {
    const out = {}, st = String(sql).replace(/--[^\n]*/g, ' ').replace(/'(?:[^']|'')*'/g, '0');
    const re = /create\s+(?:temp\s+)?table\s+(?:if\s+not\s+exists\s+)?(\w+)\s*\(/gi; let m;
    while ((m = re.exec(st))) {
      let depth = 1, i = re.lastIndex, cur = '', cols = [];
      for (; i < st.length && depth > 0; i++) {
        const ch = st[i];
        if (ch === '(') depth++; else if (ch === ')') { depth--; if (depth === 0) break; }
        if (ch === ',' && depth === 1) { cols.push(cur); cur = ''; } else cur += ch;
      }
      cols.push(cur);
      out[m[1]] = cols.map((c) => c.trim().split(/\s+/)[0]).filter((c) => c && !/^(primary|foreign|unique|check|constraint|key)$/i.test(c));
    }
    return out;
  }
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
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.done && s.v === 2) return s; } catch (e) { /* ignorar */ }
    return { done: {}, drafts: {}, notes: {}, hist: {}, v: 2 };
  }
  let P = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) { /* ignorar */ } };

  /* ---------- base de datos (sql.js) ---------- */
  let SQL = null, loadErr = '';
  function makeDb(full) { const db = new SQL.Database(); if (full || !EMPTY) db.run(mysql2sqlite(window.SEED)); db.run('PRAGMA foreign_keys = ON'); return db; }
  const ROW_CAP = 1000, SQL_MAX = 20000;
  /* ---------- revisión previa: errores que SQLite deja pasar pero MySQL no ---------- */
  const TYPES = ['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'MEDIUMINT', 'TEXT', 'TINYTEXT', 'MEDIUMTEXT', 'LONGTEXT', 'VARCHAR', 'CHAR', 'CHARACTER', 'NCHAR', 'NVARCHAR', 'DECIMAL', 'NUMERIC', 'REAL', 'FLOAT', 'DOUBLE', 'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR', 'BOOLEAN', 'BOOL', 'BLOB', 'BIT', 'ENUM', 'JSON', 'BINARY', 'VARBINARY', 'CLOB'];
  const TYPE2 = ['UNSIGNED', 'PRECISION', 'VARYING', 'ZEROFILL', 'SIGNED'];
  const CONSTR = ['PRIMARY', 'KEY', 'NOT', 'NULL', 'UNIQUE', 'DEFAULT', 'REFERENCES', 'CHECK', 'AUTOINCREMENT', 'AUTO_INCREMENT', 'COLLATE', 'CONSTRAINT', 'ON', 'DELETE', 'UPDATE', 'CASCADE', 'SET', 'NO', 'ACTION', 'RESTRICT', 'ASC', 'DESC', 'AS', 'GENERATED', 'ALWAYS', 'STORED', 'VIRTUAL', 'MATCH', 'DEFERRABLE', 'INITIALLY', 'DEFERRED', 'IMMEDIATE', 'CONFLICT', 'REPLACE', 'ROLLBACK', 'ABORT', 'FAIL', 'IGNORE', 'FOREIGN', 'INDEX', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME', 'TRUE', 'FALSE', 'COMMENT', 'ENABLE', 'VISIBLE', 'INVISIBLE'];
  function nearest(w, list) {
    let best = null, bd = 99; const u = w.toUpperCase();
    list.forEach((k) => { const d = dist(u, k); if (d < bd) { bd = d; best = k; } });
    return bd <= Math.max(1, Math.floor(u.length / 3)) && best ? best : null;
  }
  function stripSql(sql) {
    return sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?(\*\/|$)/g, ' ').replace(/'(?:[^']|'')*'/g, '0').replace(/"[^"]*"/g, 'x').replace(/`[^`]*`/g, 'x');
  }
  function checkDef(def) {
    if (/\bauto_increment\b/i.test(def)) return 'La palabra <code>AUTO_INCREMENT</code> es de <strong>MySQL</strong> y aquí no funciona. En esta app el número se pone solo escribiendo <code>id INTEGER PRIMARY KEY</code>. Si usaras <code>INT AUTO_INCREMENT</code> aquí, el id quedaría vacío (NULL).';
    let d = def, prev;
    do { prev = d; d = d.replace(/\([^()]*\)/g, ' '); } while (d !== prev);
    if (/[()]/.test(d)) return null;
    const t = d.trim().split(/\s+/).filter(Boolean); if (!t.length) return null;
    const first = t[0].toUpperCase();
    let i = 0;
    if (['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'CONSTRAINT', 'KEY', 'INDEX'].indexOf(first) < 0) {
      i = 1; // nombre de la columna
      const ty = t[1] ? t[1].toUpperCase() : '';
      if (!t[1] || CONSTR.indexOf(ty) >= 0) return 'A la columna «' + esc(t[0]) + '» le falta el <strong>tipo de dato</strong> (por ejemplo <code>INTEGER</code> o <code>TEXT</code>).';
      if (TYPES.indexOf(ty) < 0) { const n = nearest(ty, TYPES); return '«' + esc(t[1]) + '» no es un tipo de dato conocido' + (n ? '. ¿Quisiste decir <code>' + n + '</code>?' : '. Usa por ejemplo <code>INTEGER</code>, <code>TEXT</code> o <code>VARCHAR(50)</code>.'); }
      i = 2;
      while (i < t.length && TYPE2.indexOf(t[i].toUpperCase()) >= 0) i++;
    }
    for (; i < t.length; i++) {
      const w = t[i].toUpperCase();
      if (w === 'DEFAULT' || w === 'REFERENCES' || w === 'CONSTRAINT' || w === 'COLLATE' || w === 'COMMENT') { i++; continue; }
      if (CONSTR.indexOf(w) >= 0 || /^[-+]?\d/.test(w) || /^[-+]$/.test(w)) continue;
      const n = nearest(w, CONSTR);
      return '«' + esc(t[i]) + '» no se reconoce' + (n ? '. ¿Quisiste decir <code>' + n + '</code>?' : ' en la definición de la columna.');
    }
    return null;
  }
  function preCheck(sql) {
    const s = stripSql(sql);
    if (/[^=<>!]==[^=]/.test(s)) return 'En SQL se compara con un solo <code>=</code>, no con <code>==</code>.';
    if (/\brecursive\b/i.test(s)) return '<code>WITH RECURSIVE</code> no está disponible en esta app: una consulta mal hecha se quedaría trabajando para siempre y bloquearía la pantalla.';
    if (/\b(zeroblob|randomblob)\b/i.test(s)) return 'Esa función no está disponible en esta app porque puede llenar la memoria del aparato.';
    const stmts = s.split(';');
    for (let q = 0; q < stmts.length; q++) {
      let flat = stmts[q], pv; do { pv = flat; flat = flat.replace(/\([^()]*\)/g, ' '); } while (flat !== pv);
      const joins = (flat.match(/\bjoin\b/gi) || []).length;
      const fm = flat.match(/\bfrom\b([\s\S]*?)(?:\bwhere\b|\bgroup\b|\border\b|\blimit\b|\bhaving\b|\bunion\b|$)/i);
      const commas = fm ? (fm[1].match(/,/g) || []).length : 0;
      if (joins + commas > 6) return 'Esa consulta junta demasiadas tablas a la vez y podría tardar muchísimo. Junta menos tablas o agrega condiciones <code>ON</code> y <code>WHERE</code>.';
    }
    for (let k = 0; k < stmts.length; k++) {
      const st = stmts[k];
      const mdb = st.match(/^\s*(create|drop)\s+(database|schema)\b/i);
      if (mdb) return '<code>' + mdb[1].toUpperCase() + ' DATABASE</code> no funciona en el Laboratorio ni en Mis bases:'+' Aquí ya estás dentro de una base de datos de práctica. Estos comandos funcionan en la <strong>Lección 1</strong>, donde sí practicas crear y usar bases.';
      if (/^\s*use\s+\w+\s*$/i.test(st)) return '<code>USE</code> no funciona en el Laboratorio ni en Mis bases:'+' Aquí ya estás dentro de una base de datos de práctica. Estos comandos funcionan en la <strong>Lección 1</strong>, donde sí practicas crear y usar bases.';
      if (/^\s*show\s+databases\b/i.test(st)) return '<code>SHOW DATABASES</code> no funciona en el Laboratorio ni en Mis bases:'+' Aquí ya estás dentro de una base de datos de práctica. Estos comandos funcionan en la <strong>Lección 1</strong>, donde sí practicas crear y usar bases.';
      if (/^\s*show\s+tables\b/i.test(st)) return '<code>SHOW TABLES</code> es de <strong>MySQL</strong> y no funciona aquí. Para ver tus tablas escribe: <code class="solc">SELECT name FROM sqlite_master WHERE type = \'table\'</code>';
      const dsc = st.match(/^\s*(?:describe|desc|show\s+columns\s+from)\s+(\w+)\s*$/i);
      if (dsc) return '<code>DESCRIBE</code> es de <strong>MySQL</strong> y no funciona aquí. Para ver las columnas de una tabla escribe: <code class="solc">SELECT name AS columna, type AS tipo FROM pragma_table_info(\'' + esc(dsc[1]) + '\')</code>';
      let m = st.match(/^\s*create\s+(?:temp\s+|temporary\s+)?table\s+(?:if\s+not\s+exists\s+)?\S+\s*\(/i);
      if (m) {
        const body = st.slice(m[0].length), cut = body.lastIndexOf(')'); if (cut < 0) continue;
        let depth = 0, cur = '', defs = [], bad = false;
        for (const ch of body.slice(0, cut)) {
          if (ch === '(') depth++; else if (ch === ')') { depth--; if (depth < 0) { bad = true; break; } }
          if (ch === ',' && depth === 0) { defs.push(cur); cur = ''; } else cur += ch;
        }
        if (bad || depth !== 0) continue;
        defs.push(cur);
        for (const d of defs) { const e = checkDef(d); if (e) return e; }
        continue;
      }
      m = st.match(/^\s*alter\s+table\s+\S+\s+add\s+(?:column\s+)?([\s\S]+)$/i);
      if (m) { const e = checkDef(m[1]); if (e) return e; }
    }
    return null;
  }


  /* ---------- traductor: el estudiante escribe MySQL, por dentro se ejecuta en SQLite ---------- */
  function mysql2sqlite(sql) {
    const keep = [];
    let t = String(sql).replace(/'(?:[^'\\]|\\.|'')*'|"(?:[^"\\]|\\.|"")*"|`[^`]*`|--[^\n]*|\/\*[\s\S]*?\*\//g, (m) => {
      if (m[0] === '-' || m[0] === '/') return m; // comentarios se quedan igual
      if (m[0] === '"' && !/^"(?:[^"\\]|\\.|"")*"$/.test(m)) return m;
      keep.push(m); return '\u0001' + (keep.length - 1) + '\u0001';
    });
    const INTT = '(?:TINYINT|SMALLINT|MEDIUMINT|BIGINT|INTEGER|INT)\\s*(?:\\(\\d+\\))?';
    const ID = '(\\u0001\\d+\\u0001|[A-Za-z_][\\w$]*)';
    // AUTO_INCREMENT -> INTEGER PRIMARY KEY (y se quita la llave de tabla repetida)
    const ai = [];
    const colAI = (m, name) => { ai.push(name); return name + ' INTEGER PRIMARY KEY'; };
    t = t.replace(new RegExp(ID + '\\s+' + INTT + '(?:\\s+UNSIGNED)?(?:\\s+NOT\\s+NULL)?(?:\\s+PRIMARY\\s+KEY)?\\s+AUTO_INCREMENT(?:\\s+NOT\\s+NULL)?(?:\\s+PRIMARY\\s+KEY|\\s+KEY)?', 'gi'), colAI);
    ai.forEach((name) => { t = t.replace(new RegExp(',\\s*PRIMARY\\s+KEY\\s*\\(\\s*' + name.replace(/[$]/g, '\\$') + '\\s*\\)', 'i'), ''); });
    t = t.replace(/\)\s*(?:(?:DEFAULT\s+)?(?:ENGINE|CHARSET|CHARACTER\s+SET|COLLATE|ROW_FORMAT|AUTO_INCREMENT)\s*=?\s*\w+\s*)+(?=;|$)/gi, ')');
    t = t.replace(/\bAUTO_INCREMENT\b(\s*=\s*\d+)?/gi, '');
    t = t.replace(/\b(?:CHARACTER\s+SET|CHARSET)\s+\w+/gi, '').replace(/\bCOLLATE\s+(?:utf8\w*|latin1\w*)/gi, '');
    t = t.replace(new RegExp(ID + '\\s+ENUM\\s*\\(([^)]*)\\)', 'gi'), '$1 TEXT CHECK ($1 IN ($2))');
    t = t.replace(/\bINSERT\s+IGNORE\b/gi, 'INSERT OR IGNORE');
    t = t.replace(/^(\s*)TRUNCATE\s+(?:TABLE\s+)?(\S+)\s*$/gim, '$1DELETE FROM $2');
    // MySQL compara textos sin distinguir mayúsculas: las columnas de texto se crean con COLLATE NOCASE
    t = t.split(';').map((st) => /^\s*(?:create\s+(?:temp\w*\s+)?table|alter\s+table)\b/i.test(st)
      ? st.replace(/([\w\u0001$]\s+)((?:VARCHAR|NVARCHAR|CHAR|NCHAR)\s*\(\s*\d+\s*\)|CHARACTER\s*\(\s*\d+\s*\)|(?:TINY|MEDIUM|LONG)?TEXT\b)(?!\s*COLLATE)/gi, '$1$2 COLLATE NOCASE') : st).join(';');
    // funciones
    const call = (name, fn) => {
      const re = new RegExp('\\b' + name + '\\s*\\(', 'i'); let g = 0;
      for (let m; (m = re.exec(t)) && g++ < 200;) {
        let d = 1, i = m.index + m[0].length, a = [], cur = '';
        for (; i < t.length && d > 0; i++) { const c = t[i]; if (c === '(') d++; else if (c === ')') { d--; if (d === 0) break; } if (c === ',' && d === 1) { a.push(cur); cur = ''; } else cur += c; }
        if (d > 0) break; a.push(cur);
        t = t.slice(0, m.index) + fn(a.map((x) => x.trim())) + t.slice(i + 1);
      }
    };
    call('CONCAT', (a) => a.length ? '(' + a.join(' || ') + ')' : "''");
    call('NOW', () => "datetime('now','localtime')"); call('CURDATE', () => "date('now','localtime')"); call('CURTIME', () => "time('now','localtime')");
    call('YEAR', (a) => "CAST(strftime('%Y', " + a[0] + ') AS INTEGER)'); call('MONTH', (a) => "CAST(strftime('%m', " + a[0] + ') AS INTEGER)'); call('DAY', (a) => "CAST(strftime('%d', " + a[0] + ') AS INTEGER)');
    call('IF', (a) => 'IIF(' + a.join(', ') + ')'); call('LEFT', (a) => 'substr(' + a[0] + ', 1, ' + a[1] + ')'); call('RIGHT', (a) => 'substr(' + a[0] + ', -(' + a[1] + '))');
    return t.replace(/\u0001(\d+)\u0001/g, (m, n) => keep[+n]);
  }
  function runSql(db, sql, cap) {
    if (String(sql).length > SQL_MAX) return { ok: false, err: 'toolong' };
    sql = mysql2sqlite(sql);
    const pre = preCheck(String(sql)); if (pre) return { ok: false, err: '@@' + pre };
    const sets = []; let changes = 0;
    try {
      for (const stmt of db.iterateStatements(sql)) {
        const cols = stmt.getColumnNames();
        if (cols.length) {
          const rows = []; let capped = false;
          while (stmt.step()) { if (rows.length >= cap) { capped = true; break; } rows.push(stmt.get()); }
          sets.push({ cols: cols, rows: rows, capped: capped });
        } else { stmt.step(); changes += db.getRowsModified(); }
      }
      return { ok: true, sets: sets, changes: changes };
    } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
  }

  function setMode(l) { const b = l && l.base; EMPTY = b === 'vacia' || b === 'servidor'; SESS = b === 'servidor' ? 'srv' : b === 'vacia' ? 'auto' : null; }
  /* ---------- simulación del servidor MySQL: CREATE/DROP DATABASE, USE, SHOW, DESCRIBE ---------- */
  function splitStmts(sql) {
    const out = []; let cur = '', q = null, i = 0;
    while (i < sql.length) {
      const c = sql[i], n = sql[i + 1];
      if (q) { cur += c; if (c === q) q = null; i++; continue; }
      if (c === "'" || c === '"' || c === '`') { q = c; cur += c; i++; continue; }
      if (c === '-' && n === '-') { while (i < sql.length && sql[i] !== '\n') i++; continue; }
      if (c === '/' && n === '*') { const e = sql.indexOf('*/', i + 2); i = e < 0 ? sql.length : e + 2; cur += ' '; continue; }
      if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
      cur += c; i++;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  const SYSDB = ['information_schema', 'mysql', 'performance_schema', 'sys'];
  const dbName = (t) => String(t).replace(/^`|`$/g, '');
  function execSess(sql) {
    const dbs = {}, order = []; let cur = null, scratch = null, changes = 0, last = null;
    const open = () => { const d = new SQL.Database(); d.run('PRAGMA foreign_keys = ON'); return d; };
    const fail = (m) => ({ ok: false, err: '@@' + m });
    const NM = '(`[^`]+`|[A-Za-z_][\\w$]*)';
    try {
      if (SESS === 'auto') { dbs.mi_base = { name: 'mi_base', db: open() }; order.push('mi_base'); cur = 'mi_base'; }
      if (String(sql).length > SQL_MAX) return { ok: false, err: 'toolong' };
      const list = splitStmts(sql); let m;
      for (const st of list) {
        if ((m = st.match(new RegExp('^create\\s+(?:database|schema)\\s+(if\\s+not\\s+exists\\s+)?' + NM + '\\s*((?:default\\s+)?(?:character\\s+set|charset|collate)\\b[\\w\\s=\\-]*)?$', 'i')))) {
          const n = dbName(m[2]), k = n.toLowerCase();
          if (dbs[k] || SYSDB.indexOf(k) >= 0) { if (m[1]) continue; return fail('No se puede crear la base de datos <code>' + esc(n) + '</code> porque <strong>ya existe</strong>. <span class="fine">(MySQL: ERROR 1007)</span> Usa otro nombre o escribe <code>CREATE DATABASE IF NOT EXISTS ' + esc(n) + ';</code>'); }
          dbs[k] = { name: n, db: open() }; order.push(k); changes++; continue;
        }
        if (/^create\s+(database|schema)\b/i.test(st)) return fail('Revisa la forma de <code>CREATE DATABASE</code>. Es: <code class="solc">CREATE DATABASE nombre;</code> (una sola palabra, sin espacios).');
        if ((m = st.match(new RegExp('^drop\\s+(?:database|schema)\\s+(if\\s+exists\\s+)?' + NM + '$', 'i')))) {
          const n = dbName(m[2]), k = n.toLowerCase();
          if (!dbs[k]) { if (m[1]) continue; return fail('No se puede borrar <code>' + esc(n) + '</code> porque <strong>no existe</strong>. <span class="fine">(MySQL: ERROR 1008)</span>'); }
          dbs[k].db.close(); delete dbs[k]; order.splice(order.indexOf(k), 1); if (cur === k) cur = null; changes++; continue;
        }
        if (/^drop\s+(database|schema)\b/i.test(st)) return fail('Revisa la forma de <code>DROP DATABASE</code>. Es: <code class="solc">DROP DATABASE nombre;</code>');
        if ((m = st.match(new RegExp('^use\\s+' + NM + '$', 'i')))) {
          const n = dbName(m[1]), k = n.toLowerCase();
          if (!dbs[k]) return fail('No existe una base de datos llamada <code>' + esc(n) + '</code>. <span class="fine">(MySQL: ERROR 1049 Unknown database)</span> Créala primero con <code class="solc">CREATE DATABASE ' + esc(n) + ';</code>' + (SYSDB.indexOf(k) >= 0 ? '' : ' o revisa cómo la escribiste.'));
          cur = k; continue;
        }
        if (/^show\s+(databases|schemas)\s*$/i.test(st)) { last = { cols: ['Database'], rows: SYSDB.slice().concat(order.map((k) => dbs[k].name)).sort((a, b) => a.toLowerCase() < b.toLowerCase() ? -1 : 1).map((x) => [x]) }; continue; }
        if (/^select\s+(?:database|schema)\s*\(\s*\)\s*$/i.test(st)) { last = { cols: ['DATABASE()'], rows: [[cur ? dbs[cur].name : null]] }; continue; }
        const need = 'No hay ninguna base de datos seleccionada. <span class="fine">(MySQL: ERROR 1046 No database selected)</span> Primero escribe <code class="solc">USE nombre_de_tu_base;</code>';
        if (/^show\s+tables\s*$/i.test(st)) {
          if (!cur) return fail(need);
          const t = dbs[cur].db.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
          last = { cols: ['Tables_in_' + dbs[cur].name], rows: t.length ? t[0].values : [] }; continue;
        }
        if ((m = st.match(new RegExp('^(?:describe|desc|show\\s+columns\\s+from|explain)\\s+' + NM + '$', 'i')))) {
          if (!cur) return fail(need);
          const t = dbName(m[1]);
          const r = dbs[cur].db.exec("SELECT name, type, \"notnull\", dflt_value, pk FROM pragma_table_info('" + t.replace(/'/g, "''") + "')");
          if (!r.length) return fail('La tabla <code>' + esc(dbs[cur].name) + '.' + esc(t) + '</code> no existe. <span class="fine">(MySQL: ERROR 1146)</span> Mira tus tablas con <code>SHOW TABLES;</code>');
          last = { cols: ['Field', 'Type', 'Null', 'Key', 'Default', 'Extra'], rows: r[0].values.map((v) => { const ty = String(v[1] || '').toLowerCase(); const ai = v[4] && ty === 'integer'; return [v[0], ty === 'integer' ? 'int' : ty, v[2] || v[4] ? 'NO' : 'YES', v[4] ? 'PRI' : '', v[3] === null ? null : v[3], ai ? 'auto_increment' : '']; }) }; continue;
        }
        let db;
        if (cur) db = dbs[cur].db;
        else if (/^select\b/i.test(st) && !/\bfrom\b/i.test(stripSql(st))) db = scratch || (scratch = open());
        else return fail(need);
        const r = runSql(db, st, 5000);
        if (!r.ok) return r;
        changes += r.changes;
        if (r.sets.length) last = r.sets[r.sets.length - 1];
      }
      if (!last) return { ok: true, none: true, changes: changes };
      return { ok: true, cols: last.cols, rows: last.rows, capped: !!last.capped };
    } catch (e) { return { ok: false, err: String(e && e.message || e) }; }
    finally { order.forEach((k) => { try { dbs[k].db.close(); } catch (x) {} }); if (scratch) scratch.close(); }
  }
  function exec(sql) {
    let db; if (EMPTY) SCRIPTSCH = scriptSchema(sql);
    if (SESS) return execSess(sql);
    try {
      db = makeDb();
      const r = runSql(db, sql, 5000);
      if (!r.ok) return r;
      if (!r.sets.length) return { ok: true, none: true, changes: r.changes };
      const x = r.sets[r.sets.length - 1];
      return { ok: true, cols: x.cols, rows: x.rows, capped: x.capped };
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
  const FN = { now: ["<code>NOW()</code>", "<code>datetime('now')</code> (fecha y hora) o <code>date('now')</code> (solo la fecha)"], curdate: ["<code>CURDATE()</code>", "<code>date('now')</code>"], year: ["<code>YEAR(fecha)</code>", "<code>strftime('%Y', fecha)</code>"], month: ["<code>MONTH(fecha)</code>", "<code>strftime('%m', fecha)</code>"], day: ["<code>DAY(fecha)</code>", "<code>strftime('%d', fecha)</code>"], date_format: ["<code>DATE_FORMAT</code>", "<code>strftime('%d/%m/%Y', fecha)</code>"], datediff: ["<code>DATEDIFF(a, b)</code>", "<code>julianday(a) - julianday(b)</code>"], left: ["<code>LEFT(texto, n)</code>", "<code>substr(texto, 1, n)</code>"], right: ["<code>RIGHT(texto, n)</code>", "<code>substr(texto, -n)</code>"], rand: ["<code>RAND()</code>", "<code>random()</code>"], stddev: ["<code>STDDEV</code>", 'no existe aquí'], lpad: ["<code>LPAD</code>", 'no existe aquí'], concat_ws: ["<code>CONCAT_WS</code>", "el operador <code>||</code>, por ejemplo <code>nombre || ' ' || ciudad</code>"] };
  function mysqlHint(err, sql) {
    const s = stripSql(sql), M = (t) => '<strong>' + t + ' es de MySQL</strong> y no funciona en esta app (que usa SQLite). ';
    let m = err.match(/no such function: (\w+)/i);
    if (m) { const f = FN[m[1].toLowerCase()]; return f ? M(f[0]) + 'Aquí usa: ' + f[1] + '.' : 'La función <code>' + esc(m[1]) + '</code> no existe en esta app (que usa SQLite). Puede que sí exista en MySQL.'; }
    if (!/syntax error|incomplete input|unrecognized token/i.test(err)) return null;
    if (/\bengine\s*=|\bcharset\s*=|\bcharacter\s+set\b|\bcollate\s*=/i.test(s)) return M('<code>ENGINE=…</code> / <code>CHARSET=…</code>') + 'Son opciones del final del <code>CREATE TABLE</code> en MySQL. Quítalas aquí y funciona.';
    if (/\bunsigned\b/i.test(s)) return M('<code>UNSIGNED</code>') + 'Quítalo aquí.';
    if (/\benum\s*\(/i.test(s)) return M('<code>ENUM(...)</code>') + 'Aquí usa <code>TEXT</code>, y si quieres limitar los valores: <code>TEXT CHECK (columna IN (\'a\', \'b\'))</code>.';
    if (/\balter\s+table\s+\S+\s+(modify|change)\b/i.test(s)) return M('<code>ALTER TABLE … MODIFY / CHANGE</code>') + 'Aquí solo puedes <code>ADD COLUMN</code>, <code>RENAME COLUMN a TO b</code> y <code>DROP COLUMN</code>.';
    if (/\balter\s+table\s+\S+\s+add\s+(constraint|primary\s+key|unique|foreign\s+key|index|key)\b/i.test(s)) return M('<code>ALTER TABLE … ADD CONSTRAINT / PRIMARY KEY / FOREIGN KEY</code>') + 'Aquí las llaves y restricciones se escriben dentro del <code>CREATE TABLE</code>.';
    if (/^\s*truncate\b/i.test(s)) return M('<code>TRUNCATE TABLE</code>') + 'Aquí usa <code>DELETE FROM tabla</code>.';
    if (/on\s+duplicate\s+key/i.test(s)) return M('<code>ON DUPLICATE KEY UPDATE</code>') + 'Aquí usa <code>INSERT OR REPLACE INTO …</code>.';
    if (/^\s*(update|delete)\b[\s\S]*\b(limit|order\s+by)\b/i.test(s)) return M('<code>UPDATE/DELETE … LIMIT</code> (y <code>ORDER BY</code> en ellos)') + 'Aquí usa <code>WHERE</code> con el id de la fila.';
    if (/\bdiv\b/i.test(s)) return M('<code>DIV</code>') + 'Aquí, dividir dos enteros con <code>/</code> ya da un entero.';
    if (/^\s*show\s+create\b/i.test(s)) return M('<code>SHOW CREATE TABLE</code>') + 'Aquí mira <code>SELECT sql FROM sqlite_master WHERE name = \'tabla\'</code>.';
    return null;
  }
  function friendlyError(err, sql, ex) {
    { const mh = mysqlHint(String(err), String(sql || '')); if (mh && err.slice(0, 2) !== '@@') return mh; }
    if (EMPTY) SCRIPTSCH = scriptSchema(sql);
    if (err.slice(0, 2) === '@@') return err.slice(2);
    if (err === 'toolong') return 'Tu SQL es demasiado largo para esta app (máximo ' + SQL_MAX + ' letras).';
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
      '<p class="fine">' + rows.length + ' row(s) returned' + (rows.length > 60 ? ' (se muestran 60)' : '') + '</p>';
  }
  function resultHtml(r, sql, ex) {
    if (!r.ok) {
      const fe = friendlyError(r.err, sql, ex), tips = /es de MySQL|no existe en esta app/.test(fe) ? [] : suggest(sql).filter((t) => !(/comilla/.test(t) && /comilla/.test(fe)));
      return '<div class="msg bad"><strong>Hay un error.</strong><p>' + fe + '</p>' +
        (tips.length ? '<ul>' + tips.map((t) => '<li>' + t + '</li>').join('') + '</ul>' : '') + '</div>';
    }
    if (r.none) return '<div class="msg ok"><strong>' + (r.changes || 0) + ' row(s) affected.</strong> Se ejecutó sin errores. Esa instrucción no muestra una tabla; usa un <code>SELECT</code> para ver cómo quedó.</div>';
    return tableHtml(r.cols, r.rows);
  }

  /* ---------- revisar un ejercicio ---------- */
  const normVal = (v) => typeof v === 'number' ? Math.round(v * 10000) / 10000 : v;
  const rowKey = (r) => JSON.stringify(r.map(normVal));
  const trimSql = (q) => q.replace(/[\s;]+$/, '');
  const lessonOfEx = (ex) => L.find((l) => l.ejercicios.indexOf(ex) >= 0);
  function check(ex, sql) {
    const prev = EMPTY, ps = SESS, l = lessonOfEx(ex); setMode(l);
    try { return checkInner(ex, sql); } finally { EMPTY = prev; SESS = ps; }
  }
  function checkInner(ex, sql) {
    const verify = !!ex.verify;
    let u = exec(verify ? trimSql(sql) + ';\n' + ex.verify : sql);
    if (!u.ok) return { html: resultHtml(u, sql, ex), good: false };
    if (u.none && verify) u = { ok: true, cols: ['(no se encontró nada)'], rows: [] };
    if (u.none) return { html: resultHtml(u, sql, ex), good: false };
    let e = exec(verify ? trimSql(ex.sol) + ';\n' + ex.verify : ex.sol);
    if (e.none) e = { ok: true, cols: [], rows: [] };
    const ordered = /order\s+by/i.test(ex.sol), names = ex.names === true || /\sas\s/i.test(ex.sol);
    const table = (verify ? '<p class="fine">Así quedó:</p>' : '') + tableHtml(u.cols, u.rows);
    const bad = (t, extra) => ({ good: false, html: '<div class="msg bad"><strong>Casi. ' + t + '</strong>' + (extra ? '<p>' + extra + '</p>' : '') + '</div>' + table });
    const miss = (ex.must || []).filter((m) => !m[0].test(sql)).map((m) => m[1]);
    if (miss.length) return bad('Falta usar ' + miss.map((m) => '<code>' + m + '</code>').join(' y ') + '.', 'El ejercicio pide usar esas instrucciones. Escríbelas en tu consulta.');
    const a = u.rows.map(rowKey), b = e.rows.map(rowKey);
    const sameSet = a.length === b.length && a.slice().sort().join('|') === b.slice().sort().join('|');
    if (verify) {
      if (ex.names === true && u.cols.map((c) => c.toLowerCase()).join() !== e.cols.map((c) => c.toLowerCase()).join()) return bad('Los nombres de las columnas no son los que pide el ejercicio.', 'Revisa cómo escribiste los nombres al crear la tabla. Deben ser: <strong>' + esc(e.cols.join(', ')) + '</strong>.');
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
    if (EMPTY) return '';
    const body = TABLES.map((t) => { const r = exec('SELECT * FROM ' + t); return '<h4 class="tn">Tabla ' + t + '</h4>' + tableHtml(r.cols, r.rows); }).join('');
    return '<details class="peek"><summary>Ver las tablas con las que practicas</summary><h4 class="tn">Diagrama</h4>' + practiceDiagram() + body + '</details>';
  }

  function viewLesson(l) {
    const tabs = [['aprender', '1 Aprende'], ['practica', '2 Practica'], ['escribe', '3 Escribe']];
    const s = lessonStats(l);
    let body = '';
    if (route.tab === 'aprender') {
      let ci = 0;
      EXV = []; COPYS = [];
      body = (window.VOZ && window.VOZ.canSpeak ? '<div class="row"><button class="btn small ghost" data-voz="lesson">🔊 Escuchar la lección</button></div>' : '') + tablePreview() + l.aprender.map((b) => {
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
        '<div class="row"><button class="btn small ghost" data-voz="mic" data-target="[data-ta=note]">🎤 Dictar</button><button class="btn small ghost" data-voz="note">🔊 Escuchar</button><button class="btn small main" data-act="review">Revisar lo que escribí</button></div><div class="res" id="noteres"></div></section>';
    }
    const nav = '<nav class="tabs">' + tabs.map((t) => '<button class="' + (route.tab === t[0] ? 'on' : '') + '" data-act="tab" data-tab="' + t[0] + '">' + t[1] + '</button>').join('') + '</nav>';
    const next = L.find((x) => x.id === l.id + 1);
    return '<header class="top"><a class="back" href="#/">← Lecciones</a><h1>' + l.id + '. ' + esc(l.titulo) + '</h1></header>' + nav + '<div class="body">' + body + '</div>' +
      (route.tab === 'escribe' && next ? '<a class="btn go" href="#/l/' + next.id + '">Siguiente lección: ' + esc(next.titulo) + ' →</a>' : '');
  }

  function render() {
    { const lz = route.v === 'lesson' ? L.find((x) => x.id === route.id) : null; setMode(lz); }
    const nav = document.getElementById('bnav');
    if (loadErr) { app.innerHTML = '<div class="msg bad"><strong>No se pudo cargar el motor de bases de datos.</strong><p>' + esc(loadErr) + '</p><p>Recarga la página.</p></div>'; return; }
    if (!SQL) { app.innerHTML = '<p class="loading">Cargando…</p>'; return; }
    if (route.v !== 'db') closeCur();
    if (route.v === 'lab') app.innerHTML = viewLab();
    else if (route.v === 'mas') app.innerHTML = viewMas();
    else if (route.v === 'cert') app.innerHTML = viewCert();
    else if (route.v === 'ia') app.innerHTML = window.IA ? window.IA.view() : viewHome();
    else if (route.v === 'dblist') app.innerHTML = viewDbList();
    else if (route.v === 'db') app.innerHTML = viewDb(route.dbid);
    else if (route.v === 'home') app.innerHTML = viewHome();
    else { const l = L.find((x) => x.id === route.id); app.innerHTML = l ? viewLesson(l) : viewHome(); }
    enhanceEditors();
    if (route.v === 'ia' && window.IA) window.IA.mount(app);
    const sec = route.v === 'lab' ? 'lab' : (route.v === 'dblist' || route.v === 'db') ? 'db' : (route.v === 'mas' || route.v === 'cert' || route.v === 'ia') ? 'mas' : 'lec';
    nav.innerHTML = [['lec', '#/', '📚', 'Lecciones'], ['lab', '#/lab', '🧪', 'Laboratorio'], ['db', '#/db', '🗄', 'Mis bases'], ['mas', '#/mas', '⚙️', 'Más']].map((x) =>
      '<a href="' + x[1] + '"' + (sec === x[0] ? ' class="on" aria-current="page"' : '') + '><span aria-hidden="true">' + x[2] + '</span>' + x[3] + '</a>').join('');
  }

  /* ---------- ejecutar SQL libre (Laboratorio y Mis bases) ---------- */
  function execOn(db, sql) { return runSql(db, sql, ROW_CAP); }
  function freeHtml(r, sql) {
    if (!r.ok) return resultHtml(r, sql);
    if (!r.sets.length) return '<div class="msg ok">Se ejecutó sin errores.' + (r.changes ? ' Filas afectadas: <strong>' + r.changes + '</strong>.' : '') + '</div>';
    return r.sets.map((x, i) => (r.sets.length > 1 ? '<p class="fine">Resultado ' + (i + 1) + ':</p>' : '') + tableHtml(x.cols, x.rows) +
      (x.capped ? '<div class="msg warn">La consulta devuelve muchísimas filas. Se cortó en las primeras ' + ROW_CAP + '. Agrega un <code>WHERE</code> o un <code>LIMIT</code>.</div>' : '')).join('');
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
      histHtml('lab') + '<h3 class="mt">Ejemplos para probar</h3><div class="chips">' + EJEMPLOS.map((e, i) => '<button class="btn small ghost chipb" data-act="fill" data-target="lab" data-i="' + i + '">' + esc(e) + '</button>').join('') + '</div>';
  }

  /* ---------- preferencias, copia de seguridad y certificado ---------- */
  const PREF = 'aprendesql.prefs';
  function loadPrefs() {
    let x = {}; try { x = JSON.parse(localStorage.getItem(PREF)) || {}; } catch (e) { /* ignorar */ }
    return { theme: ['auto', 'light', 'dark'].indexOf(x.theme) >= 0 ? x.theme : 'auto', size: [1, 2, 3].indexOf(x.size) >= 0 ? x.size : 1, name: typeof x.name === 'string' ? x.name.slice(0, 60) : '' };
  }
  let PR = loadPrefs();
  const savePrefs = () => { try { localStorage.setItem(PREF, JSON.stringify(PR)); } catch (e) { /* ignorar */ } };
  function applyPrefs() {
    document.documentElement.setAttribute('data-theme', PR.theme === 'light' ? 'light' : PR.theme);
    document.documentElement.style.fontSize = { 1: '100%', 2: '112%', 3: '125%' }[PR.size];
    const mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.setAttribute('content', PR.theme === 'dark' ? '#07111a' : '#0f4c5c');
  }
  applyPrefs();
  const totals = () => {
    let ex = 0, done = 0, notes = 0, tl = L.length;
    L.forEach((l) => { ex += l.ejercicios.length; done += l.ejercicios.filter((e) => P.done[e.id]).length; if (P.notes[l.id] && P.notes[l.id].ok) notes++; });
    return { ex: ex, done: done, notes: notes, lessons: tl, complete: done === ex && notes === tl };
  };
  const today = () => new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' });
  const seg = (name, cur2, opts) => '<div class="seg">' + opts.map((o) => '<button class="' + (cur2 === o[0] ? 'on' : '') + '" data-act="pref" data-k="' + name + '" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>';

  function viewMas() {
    const t = totals(), dbs = loadIdx();
    return '<header class="top"><h1>Más</h1></header>' +
      '<section class="ex"><h3>Tu avance</h3><div class="stat"><span>Lecciones</span><b>' + t.lessons + '</b></div><div class="stat"><span>Ejercicios hechos</span><b>' + t.done + ' de ' + t.ex + '</b></div>' +
      '<div class="stat"><span>Lecciones escritas</span><b>' + t.notes + ' de ' + t.lessons + '</b></div><div class="stat"><span>Mis bases de datos</span><b>' + dbs.length + '</b></div>' +
      '<a class="btn go" href="#/certificado">' + (t.complete ? '🎓 Ver mi certificado' : '🎓 Certificado (al terminar el curso)') + '</a></section>' +
      '<section class="ex"><h3>Asistente IA</h3><p class="fine">Una IA pequeña que responde tus dudas de SQL dentro de tu teléfono, sin internet y gratis. Solo funciona en aparatos nuevos.</p><a class="btn go" href="#/ia">🤖 Abrir el asistente</a></section>' +
      '<section class="ex"><h3>Apariencia</h3><p class="fine">Tema</p>' + seg('theme', PR.theme, [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']]) +
      '<p class="fine">Tamaño de la letra</p>' + seg('size', PR.size, [[1, 'Normal'], [2, 'Grande'], [3, 'Muy grande']]) + '</section>' +
      '<section class="ex"><h3>Copia de seguridad</h3><p class="fine">Guarda en un archivo tu avance, lo que escribiste y todas tus bases de datos. Así no pierdes nada si cambias de aparato o borras los datos del navegador.</p>' +
      '<div class="row"><button class="btn small main" data-act="bkexport">⬇ Guardar copia de todo</button><label class="btn small">Restaurar copia<input type="file" accept=".json,application/json" data-act-change="bkimport" hidden></label></div><div class="res" id="bkmsg"></div></section>' +
      '<section class="ex"><h3>Borrar</h3><div class="row"><button class="btn small ghost danger" data-act="resetprog">Borrar mi avance</button><button class="btn small ghost danger" data-act="resetall">Borrar todo</button></div>' +
      '<p class="fine">"Borrar mi avance" deja tus bases de datos. "Borrar todo" también las quita.</p></section>' +
      '<section class="ex"><h3>Acerca de</h3><p class="fine">Aprende bases de datos · curso práctico de SQL con ' + L.length + ' lecciones. Funciona sin internet y todo se guarda en tu aparato, no se envía a ningún servidor. Las consultas se ejecutan con <strong>SQLite</strong> dentro de tu navegador. Lo básico (SELECT, WHERE, JOIN, INSERT, UPDATE, DELETE) se escribe igual que en MySQL, pero hay diferencias reales: están listadas en la lección "MySQL de verdad" y la app avisa cuando escribes algo que solo existe en MySQL.</p></section>';
  }

  function viewCert() {
    const t = totals();
    if (!t.complete) {
      return '<header class="top"><a class="back" href="#/mas">← Más</a><h1>Certificado</h1></header><div class="msg warn"><strong>Todavía no está disponible.</strong><p>Para obtenerlo termina todos los ejercicios (' + t.done + ' de ' + t.ex + ') y escribe lo aprendido en todas las lecciones (' + t.notes + ' de ' + t.lessons + ').</p></div><a class="btn go" href="#/">Seguir con las lecciones</a>';
    }
    return '<header class="top noprint"><a class="back" href="#/mas">← Más</a><h1>Certificado</h1></header>' +
      '<label class="fld noprint"><span>Tu nombre</span><input class="inp" id="certname" type="text" maxlength="60" value="' + esc(PR.name) + '" placeholder="Escribe tu nombre completo" autocomplete="name"></label>' +
      '<div class="cert"><small>Constancia de curso completado</small><h2>Aprende bases de datos</h2><p>Se hace constar que</p><div class="who" id="certwho">' + esc(PR.name || 'Tu nombre') + '</div>' +
      '<p>completó el curso práctico de bases de datos y SQL: <b>' + t.lessons + ' lecciones</b> y <b>' + t.ex + ' ejercicios</b>, desde crear tablas hasta consultas con JOIN, diseño de bases de datos y MySQL.</p><p><small>' + esc(today()) + '</small></p></div>' +
      '<button class="btn go noprint" data-act="print">🖨 Imprimir o guardar como PDF</button>';
  }

  function exportBackup() {
    const dbs = loadIdx().map((d) => { let data = null; try { data = localStorage.getItem('aprendesql.db.' + d.id); } catch (e) { /* ignorar */ } return { id: d.id, name: d.name, created: d.created, data: data }; });
    return JSON.stringify({ app: 'aprende-sql', v: 1, saved: new Date().toISOString(), progress: P, prefs: PR, dbs: dbs });
  }
  function importBackup(text) {
    let b; try { b = JSON.parse(text); } catch (e) { return { ok: false, msg: 'El archivo no es una copia válida (no se pudo leer).' }; }
    if (!b || b.app !== 'aprende-sql' || !b.progress || typeof b.progress !== 'object') return { ok: false, msg: 'Ese archivo no es una copia de esta app.' };
    const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
    const prog = { done: {}, drafts: {}, notes: {}, hist: {}, v: 2 };
    const oldProg = b.progress.v !== 2;
    if (isObj(b.progress.done)) Object.keys(b.progress.done).filter((k) => k !== '__proto__').forEach((k) => { if (b.progress.done[k] === true) prog.done[k] = true; });
    if (isObj(b.progress.drafts)) Object.keys(b.progress.drafts).filter((k) => k !== '__proto__').forEach((k) => { if (typeof b.progress.drafts[k] === 'string') prog.drafts[k] = b.progress.drafts[k].slice(0, SQL_MAX); });
    if (isObj(b.progress.notes)) Object.keys(b.progress.notes).filter((k) => k !== '__proto__').forEach((k) => { const n = b.progress.notes[k]; if (isObj(n) && typeof n.text === 'string') prog.notes[k] = { text: n.text.slice(0, 5000), ok: n.ok === true }; });
    if (isObj(b.progress.hist)) Object.keys(b.progress.hist).filter((k) => k !== '__proto__').forEach((k) => { if (Array.isArray(b.progress.hist[k])) prog.hist[k] = b.progress.hist[k].filter((q) => typeof q === 'string').slice(0, HIST_MAX); });
    let okDbs = 0, badDbs = 0; const idx = [];
    (Array.isArray(b.dbs) ? b.dbs : []).forEach((d) => {
      if (!isObj(d) || typeof d.id !== 'string' || !/^\w+$/.test(d.id) || typeof d.name !== 'string' || typeof d.data !== 'string') { badDbs++; return; }
      try { const t = new SQL.Database(unb64(d.data)); t.exec('SELECT name FROM sqlite_master'); t.close(); } catch (e) { badDbs++; return; }
      try { localStorage.setItem('aprendesql.db.' + d.id, d.data); } catch (e) { badDbs++; return; }
      idx.push({ id: d.id, name: d.name.slice(0, 40), created: typeof d.created === 'string' ? d.created.slice(0, 30) : '' }); okDbs++;
    });
    if (!oldProg) { P = prog; save(); }
    if (idx.length) { const old = loadIdx().filter((o) => !idx.some((n) => n.id === o.id)); saveIdx(old.concat(idx)); }
    if (isObj(b.prefs)) { PR = Object.assign(PR, loadPrefsFrom(b.prefs)); savePrefs(); applyPrefs(); }
    return { ok: true, msg: 'Copia restaurada: ' + (oldProg ? 'el avance era de una versión anterior del curso y no se pudo usar, y ' : 'avance y ') + okDbs + (okDbs === 1 ? ' base de datos' : ' bases de datos') + (badDbs ? ' (' + badDbs + ' no se pudieron leer)' : '') + '.' };
  }
  function loadPrefsFrom(x) { return { theme: ['auto', 'light', 'dark'].indexOf(x.theme) >= 0 ? x.theme : 'auto', size: [1, 2, 3].indexOf(x.size) >= 0 ? x.size : 1, name: typeof x.name === 'string' ? x.name.slice(0, 60) : '' }; }

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
      '<details class="peek"><summary>Diagrama de mis tablas</summary><div id="dbdiag">' + diagramHtml(modelOf(cur.db)) + '</div></details>' +
      '<h3 class="mt">Escribe tu SQL</h3><textarea class="sql" rows="7" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="Escribe aquí tu SQL…" data-ta="dbq:' + id + '">' + esc(P.drafts['dbq:' + id] || '') + '</textarea>' +
      '<div class="row"><button class="btn small main" data-act="dbrun">▶ Ejecutar</button><button class="btn small ghost" data-act="dbundo">↩ Deshacer última ejecución</button></div>' +
      '<div class="res" id="dbres"></div>' + histHtml('db:' + id) +
      '<section class="ex mt"><h3>Guardar copia y administrar</h3><div class="row">' +
      '<button class="btn small" data-act="dbdl">⬇ Descargar .sql (para MySQL)</button><button class="btn small" data-act="dbdlq">⬇ Descargar .sqlite</button></div>' +
      '<div class="row"><button class="btn small ghost" data-act="dbren">Cambiar nombre</button><button class="btn small ghost danger" data-act="dbdel">Borrar esta base</button></div></section>';
  }

  /* ---------- diagrama de tablas (entidad-relación) ---------- */
  function modelOf(db) {
    const sc = schemaOf(db), names = Object.keys(sc), fks = [];
    names.forEach((t) => {
      try {
        const r = db.exec("SELECT \"table\", \"from\", \"to\" FROM pragma_foreign_key_list('" + t.replace(/'/g, "''") + "')");
        (r.length ? r[0].values : []).forEach((f) => {
          let to = f[2];
          if (!to && sc[f[0]]) { const pk = sc[f[0]].cols.find((c) => c[2]); to = pk ? pk[0] : null; }
          fks.push({ t: t, c: f[1], pt: f[0], pc: to });
        });
      } catch (e) { /* ignorar */ }
    });
    return { sc: sc, names: names, fks: fks };
  }
  function bestOrder(model, cols) { // ordena las tablas para que las relacionadas queden cerca
    const n = model.names.length; if (n < 3 || n > 7 || !model.fks.length) return model.names.slice();
    const idx = {}; model.names.forEach((t, i) => { idx[t] = i; });
    const links = model.fks.filter((f) => idx[f.pt] !== undefined).map((f) => [idx[f.t], idx[f.pt]]);
    const cost = (perm) => { const at = []; perm.forEach((ti, slot) => { at[ti] = slot; });
      return links.reduce((a, l) => { const x = at[l[0]], y = at[l[1]]; return a + Math.abs(Math.floor(x / cols) - Math.floor(y / cols)) + Math.abs((x % cols) - (y % cols)); }, 0); };
    let best = null, bc = 1e9; const arr = model.names.map((_, i) => i);
    (function permute(k) { if (k === n) { const c = cost(arr); if (c < bc) { bc = c; best = arr.slice(); } return; } for (let i = k; i < n; i++) { [arr[k], arr[i]] = [arr[i], arr[k]]; permute(k + 1); [arr[k], arr[i]] = [arr[i], arr[k]]; } }(0));
    return best.map((i) => model.names[i]);
  }
  function diagramHtml(model) {
    if (!model.names.length) return '<p class="fine">Todavía no hay tablas para dibujar.</p>';
    const COLS_N = model.names.length === 1 ? 1 : 2, names = bestOrder(model, COLS_N);
    const W = 188, GAP = 40, PAD = 10, HEAD = 30, ROW = 22, VGAP = 34;
    const pos = {}, rowsH = [];
    names.forEach((t, i) => { const h = HEAD + Math.max(1, model.sc[t].cols.length) * ROW + 8; const r = Math.floor(i / COLS_N), c = i % COLS_N; (rowsH[r] = rowsH[r] || []).push(h); pos[t] = { r: r, c: c, h: h }; });
    const rowTop = []; let y = PAD; rowsH.forEach((hs, r) => { rowTop[r] = y; y += Math.max.apply(null, hs) + VGAP; });
    const totalW = PAD * 2 + COLS_N * W + (COLS_N - 1) * GAP + 30, totalH = y - VGAP + PAD;
    names.forEach((t) => { pos[t].x = PAD + 15 + pos[t].c * (W + GAP); pos[t].y = rowTop[pos[t].r]; });
    const rowY = (t, col) => { const i = model.sc[t].cols.findIndex((c) => c[0] === col); return pos[t].y + HEAD + (i < 0 ? 0 : i) * ROW + ROW / 2; };
    let edges = '';
    model.fks.forEach((f) => {
      if (!pos[f.t] || !pos[f.pt]) return;
      const a = pos[f.t], b = pos[f.pt], ya = rowY(f.t, f.c), yb = f.pc ? rowY(f.pt, f.pc) : b.y + HEAD;
      let d, ax, bx, la, lb;
      if (a === b) { ax = a.x + W; bx = a.x + W; d = 'M' + ax + ' ' + ya + ' C' + (ax + 26) + ' ' + ya + ' ' + (bx + 26) + ' ' + yb + ' ' + bx + ' ' + yb; la = ax + 8; lb = bx + 8; }
      else if (a.c === b.c) { ax = a.x; bx = b.x; d = 'M' + ax + ' ' + ya + ' C' + (ax - 28) + ' ' + ya + ' ' + (bx - 28) + ' ' + yb + ' ' + bx + ' ' + yb; la = ax - 10; lb = bx - 10; }
      else if (a.c < b.c) { ax = a.x + W; bx = b.x; const m = (bx - ax) / 2; d = 'M' + ax + ' ' + ya + ' C' + (ax + m) + ' ' + ya + ' ' + (bx - m) + ' ' + yb + ' ' + bx + ' ' + yb; la = ax + 8; lb = bx - 8; }
      else { ax = a.x; bx = b.x + W; const m = (ax - bx) / 2; d = 'M' + ax + ' ' + ya + ' C' + (ax - m) + ' ' + ya + ' ' + (bx + m) + ' ' + yb + ' ' + bx + ' ' + yb; la = ax - 8; lb = bx + 8; }
      edges += '<path class="er-edge" d="' + d + '"/><circle class="er-dot" cx="' + ax + '" cy="' + ya + '" r="3.5"/><circle class="er-dot" cx="' + bx + '" cy="' + yb + '" r="3.5"/>' +
        '<text class="er-n" x="' + la + '" y="' + (ya - 5) + '" text-anchor="middle">N</text><text class="er-n" x="' + lb + '" y="' + (yb - 5) + '" text-anchor="middle">1</text>';
    });
    let boxes = '';
    names.forEach((t) => {
      const p = pos[t], fkc = {}; model.fks.forEach((f) => { if (f.t === t) fkc[f.c] = 1; });
      boxes += '<g><rect class="er-box" x="' + p.x + '" y="' + p.y + '" width="' + W + '" height="' + p.h + '" rx="8"/><rect class="er-head" x="' + p.x + '" y="' + p.y + '" width="' + W + '" height="' + HEAD + '" rx="8"/><rect class="er-head" x="' + p.x + '" y="' + (p.y + HEAD - 8) + '" width="' + W + '" height="8"/>' +
        '<text class="er-title" x="' + (p.x + 10) + '" y="' + (p.y + 20) + '">' + esc(t.length > 20 ? t.slice(0, 19) + '…' : t) + '</text>';
      model.sc[t].cols.forEach((c, i) => {
        const yy = p.y + HEAD + i * ROW + 15, nm = String(c[0]);
        boxes += '<text class="er-col' + (c[2] ? ' pk' : '') + '" x="' + (p.x + 10) + '" y="' + yy + '">' + (c[2] ? '🔑 ' : fkc[nm] ? '🔗 ' : '') + esc(nm.length > 14 ? nm.slice(0, 13) + '…' : nm) + '</text><text class="er-type" x="' + (p.x + W - 8) + '" y="' + yy + '" text-anchor="end">' + esc(String(c[1] || '').toLowerCase().slice(0, 12)) + '</text>';
      });
      boxes += '</g>';
    });
    return '<div class="erwrap"><svg class="er" viewBox="0 0 ' + totalW + ' ' + totalH + '" role="img" aria-label="Diagrama de las tablas y sus relaciones">' + edges + boxes + '</svg></div>' +
      '<p class="fine">🔑 llave primaria · 🔗 llave foránea. Las líneas conectan una llave foránea (<b>N</b>, muchos) con la llave primaria a la que apunta (<b>1</b>, uno).</p>';
  }
  let practiceDiag = null;
  function practiceDiagram() {
    if (!practiceDiag) { const db = makeDb(true); practiceDiag = diagramHtml(modelOf(db)); db.close(); }
    return practiceDiag;
  }

  /* ---------- editor de SQL: colores, autocompletar, historial ---------- */
  const KWSET = {}; KW.forEach((k) => { KWSET[k.toLowerCase()] = 1; });
  function schemaFor(t) {
    const n = t.dataset.ta || '';
    if (n.indexOf('dbq:') === 0 && cur) return activeSchema(cur.db);
    return SCHEMA;
  }
  function highlight(text, sc) {
    const names = {}; Object.keys(sc).forEach((t) => { names[t.toLowerCase()] = 1; sc[t].forEach((c) => { names[String(c).toLowerCase()] = 1; }); });
    const re = /('[^']*'?)|(--[^\n]*)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_À-ÿ]+)|([\s\S])/g;
    let out = '', m;
    while ((m = re.exec(text)) !== null) {
      if (m[1]) out += '<span class="hs">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="hc">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="hn">' + esc(m[3]) + '</span>';
      else if (m[4]) { const w = m[4].toLowerCase(); out += KWSET[w] ? '<span class="hk">' + esc(m[4]) + '</span>' : names[w] ? '<span class="hi">' + esc(m[4]) + '</span>' : esc(m[4]); }
      else out += esc(m[5]);
    }
    return out + '\n​';
  }
  function suggestions(t) {
    const pos = t.selectionStart, before = t.value.slice(0, pos), sc = schemaFor(t);
    let m = before.match(/([A-Za-z_]\w*)\.(\w*)$/);
    if (m) {
      const tn = Object.keys(sc).find((x) => x.toLowerCase() === m[1].toLowerCase());
      if (tn) return { word: m[2], list: sc[tn].filter((c) => String(c).toLowerCase().indexOf(m[2].toLowerCase()) === 0 && String(c).toLowerCase() !== m[2].toLowerCase()) };
      return { word: m[2], list: [] };
    }
    m = before.match(/([A-Za-zÀ-ÿ_]{2,})$/);
    if (!m) return { word: '', list: [] };
    const w = m[1].toLowerCase(), set = [];
    const add = (x) => { if (x.toLowerCase().indexOf(w) === 0 && x.toLowerCase() !== w && set.indexOf(x) < 0) set.push(x); };
    Object.keys(sc).forEach((tn) => add(tn));
    Object.keys(sc).forEach((tn) => sc[tn].forEach((c) => add(String(c))));
    KW.forEach((k) => add(k));
    return { word: m[1], list: set.slice(0, 8) };
  }
  function syncEd(t) {
    const wrap = t.closest('.edwrap'); if (!wrap) return;
    wrap.querySelector('.hl').innerHTML = highlight(t.value, schemaFor(t));
    t.style.height = 'auto'; t.style.height = Math.max(t.scrollHeight, 60) + 'px';
    const bar = wrap.parentNode.querySelector('.sugg'); if (!bar) return;
    const sg = suggestions(t);
    bar.innerHTML = sg.list.map((x) => '<button type="button" class="sg" data-act="sugg" data-w="' + esc(x) + '">' + esc(x) + '</button>').join('');
    bar._for = t;
  }
  function enhanceEditors() {
    app.querySelectorAll('textarea.sql').forEach((t) => {
      if (t.closest('.edwrap')) { syncEd(t); return; }
      const par = t.parentNode, host = document.createElement('div'), wrap = document.createElement('div'), pre = document.createElement('pre'), bar = document.createElement('div');
      host.className = 'edhost'; wrap.className = 'edwrap'; pre.className = 'hl'; pre.setAttribute('aria-hidden', 'true'); bar.className = 'sugg';
      par.insertBefore(host, t); host.appendChild(wrap); wrap.appendChild(pre); wrap.appendChild(t); host.appendChild(bar);
      t.addEventListener('input', () => syncEd(t));
      t.addEventListener('keyup', (e) => { if (/Arrow|Home|End/.test(e.key)) syncEd(t); });
      t.addEventListener('click', () => syncEd(t));
      t.addEventListener('focus', () => syncEd(t));
      syncEd(t);
    });
  }
  function applySugg(bar, word) {
    const t = bar._for; if (!t) return;
    const pos = t.selectionStart, before = t.value.slice(0, pos), after = t.value.slice(pos);
    const m = before.match(/([A-Za-zÀ-ÿ_]*)$/), typed = m ? m[1] : '';
    const isKw = KW.indexOf(word) >= 0;
    const rep2 = isKw ? (typed && typed === typed.toLowerCase() ? word.toLowerCase() : word) : word;
    t.value = before.slice(0, before.length - typed.length) + rep2 + ' ' + after;
    const np = before.length - typed.length + rep2.length + 1; t.focus(); t.setSelectionRange(np, np);
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const HIST_MAX = 15;
  const histInner = (key) => ((P.hist && P.hist[key]) || []).map((q, i) => '<button class="btn small ghost chipb" data-act="histfill" data-key="' + esc(key) + '" data-h="' + i + '">' + esc(q.replace(/\s+/g, ' ').slice(0, 90)) + '</button>').join('') || '<p class="fine">Todavía no has ejecutado nada.</p>';
  function pushHist(key, q) {
    P.hist = P.hist || {}; const l = (P.hist[key] || []).filter((x) => x !== q); l.unshift(q); P.hist[key] = l.slice(0, HIST_MAX); save();
    const box = document.getElementById('hist'); if (box) box.innerHTML = histInner(key);
  }
  const histHtml = (key) => '<details class="peek mt"><summary>Historial (lo último que ejecutaste)</summary><div class="chips" id="hist">' + histInner(key) + '</div></details>';

  /* ---------- eventos ---------- */
  function parseHash() {
    const m = location.hash.match(/^#\/l\/(\d+)(?:\/(\w+))?/), md2 = location.hash.match(/^#\/db\/(\w+)/);
    if (m) { route = { v: 'lesson', id: Number(m[1]), tab: ['aprender', 'practica', 'escribe'].indexOf(m[2]) >= 0 ? m[2] : 'aprender' }; }
    else if (md2) route = { v: 'db', dbid: md2[1] };
    else if (/^#\/db/.test(location.hash)) route = { v: 'dblist' };
    else if (/^#\/lab/.test(location.hash)) route = { v: 'lab' };
    else if (/^#\/mas/.test(location.hash)) route = { v: 'mas' };
    else if (/^#\/certificado/.test(location.hash)) route = { v: 'cert' };
    else if (/^#\/ia/.test(location.hash)) route = { v: 'ia' };
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
    if (act === 'pref') { const k = el.dataset.k; PR[k] = k === 'size' ? Number(el.dataset.v) : el.dataset.v; savePrefs(); applyPrefs(); render(); return; }
    if (act === 'print') { window.print(); return; }
    if (act === 'bkexport') {
      download('aprende-sql-copia-' + new Date().toISOString().slice(0, 10) + '.json', exportBackup(), 'application/json');
      document.getElementById('bkmsg').innerHTML = '<div class="msg ok">Copia guardada. Revisa tu carpeta de descargas.</div>'; return;
    }
    if (act === 'resetprog') {
      if (confirm('¿Borrar todo tu avance, lo que escribiste y el historial? Tus bases de datos no se tocan.')) { P = { done: {}, drafts: {}, notes: {}, hist: {}, v: 2 }; save(); render(); }
      return;
    }
    if (act === 'resetall') {
      if (confirm('¿Borrar TODO: avance y todas tus bases de datos? Esto no se puede deshacer.')) {
        loadIdx().forEach((d) => { try { localStorage.removeItem('aprendesql.db.' + d.id); localStorage.removeItem('aprendesql.undo.' + d.id); } catch (e) { /* ignorar */ } });
        saveIdx([]); P = { done: {}, drafts: {}, notes: {}, hist: {}, v: 2 }; save(); render();
      }
      return;
    }
    if (act === 'labrun') {
      const q = ta('lab').value.trim(), box = document.getElementById('labres');
      if (!q) { box.innerHTML = '<div class="msg warn">Escribe tu SQL primero.</div>'; return; }
      const db = makeDb(); const r = execOn(db, q); db.close(); box.innerHTML = freeHtml(r, q); pushHist('lab', q); return;
    }
    if (act === 'labclear') { ta('lab').value = ''; syncEd(ta('lab')); P.drafts.lab = ''; save(); document.getElementById('labres').innerHTML = ''; return; }
    if (act === 'fill') { const t = ta(el.dataset.target); t.value = EJEMPLOS[Number(el.dataset.i)]; P.drafts[el.dataset.target] = t.value; save(); syncEd(t); t.focus(); return; }
    if (act === 'sugg') { applySugg(el.closest('.edhost').querySelector('.sugg'), el.dataset.w); return; }
    if (act === 'histfill') {
      const q = P.hist[el.dataset.key][Number(el.dataset.h)], t = ta(el.dataset.key === 'lab' ? 'lab' : 'dbq:' + el.dataset.key.slice(3));
      if (t) { t.value = q; P.drafts[t.dataset.ta] = q; save(); syncEd(t); t.focus(); window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 80 }); }
      return;
    }
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
      box.innerHTML = freeHtml(r, q); ACTIVE = null; pushHist('db:' + cur.id, q);
      try { cur.db.run('ROLLBACK'); } catch (e) { /* no había transacción abierta */ }
      cur.db.run('PRAGMA foreign_keys = ON');
      if (r.ok && !readOnly && !persist(cur.id, cur.db)) box.innerHTML += '<div class="msg bad">No se pudo guardar el cambio en este aparato.</div>';
      document.getElementById('dbtables').innerHTML = tablesPanel(cur.db); document.getElementById('dbdiag').innerHTML = diagramHtml(modelOf(cur.db)); return;
    }
    if (act === 'dbundo') {
      let raw = null; try { raw = localStorage.getItem('aprendesql.undo.' + cur.id); } catch (e) { /* ignorar */ }
      const box = document.getElementById('dbres');
      if (!raw) { box.innerHTML = '<div class="msg warn">No hay nada que deshacer.</div>'; return; }
      try { cur.db.close(); } catch (e) { /* ignorar */ }
      cur.db = new SQL.Database(unb64(raw)); cur.db.run('PRAGMA foreign_keys = ON'); persist(cur.id, cur.db);
      try { localStorage.removeItem('aprendesql.undo.' + cur.id); } catch (e) { /* ignorar */ }
      box.innerHTML = '<div class="msg ok">Listo: volvió a como estaba antes de la última ejecución.</div>';
      document.getElementById('dbtables').innerHTML = tablesPanel(cur.db); document.getElementById('dbdiag').innerHTML = diagramHtml(modelOf(cur.db)); return;
    }
    if (act === 'dbview') {
      const t = ta('dbq:' + cur.id); t.value = 'SELECT * FROM ' + el.dataset.t; P.drafts['dbq:' + cur.id] = t.value; save(); syncEd(t);
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
  document.addEventListener('input', (e) => {
    if (e.target.id === 'certname') { PR.name = e.target.value.slice(0, 60); savePrefs(); const w = document.getElementById('certwho'); if (w) w.textContent = PR.name || 'Tu nombre'; }
  });
  document.addEventListener('change', (e) => {
    const el0 = e.target;
    if (el0.dataset && el0.dataset.actChange === 'bkimport') {
      const f = el0.files && el0.files[0]; if (!f) return; const box = document.getElementById('bkmsg');
      if (f.size > 40 * 1024 * 1024) { box.innerHTML = '<div class="msg bad">Ese archivo es demasiado grande.</div>'; el0.value = ''; return; }
      const rd = new FileReader();
      rd.onload = () => { if (!confirm('¿Restaurar esta copia? Reemplaza tu avance actual y agrega las bases de datos de la copia.')) return; const r = importBackup(String(rd.result)); render(); const b2 = document.getElementById('bkmsg'); if (b2) b2.innerHTML = '<div class="msg ' + (r.ok ? 'ok' : 'bad') + '">' + esc(r.msg) + '</div>'; };
      rd.onerror = () => { box.innerHTML = '<div class="msg bad">No se pudo leer el archivo.</div>'; };
      rd.readAsText(f); el0.value = ''; return;
    }
    const el = e.target; if (!el.dataset || el.dataset.actChange !== 'dbimport') return;
    const f = el.files && el.files[0]; if (!f) return;
    const name = f.name.replace(/\.[^.]+$/, '').slice(0, 40) || 'importada', msg = document.getElementById('dbmsg');
    const say = (cls, t) => { if (msg) msg.innerHTML = '<div class="msg ' + cls + '">' + t + '</div>'; };
    if (f.size > 40 * 1024 * 1024) { say('bad', 'Ese archivo es demasiado grande para esta app (máximo 40 MB).'); el.value = ''; return; }
    const fin = (db) => {
      let n = 0; try { n = db.exec("SELECT count(*) FROM sqlite_master WHERE type = 'table'")[0].values[0][0]; } catch (e) { n = 0; }
      if (!n) { db.close(); say('warn', 'Ese archivo no tiene ninguna tabla, así que no se creó nada. Revisa que sea el archivo correcto.'); return; }
      const id = 'd' + Date.now().toString(36); db.run('PRAGMA foreign_keys = ON');
      if (!persist(id, db)) { db.close(); say('bad', 'No se pudo guardar en este aparato. Puede que el navegador no deje guardar datos (¿ventana privada?) o que no haya espacio.'); return; }
      db.close(); const l = loadIdx(); l.push({ id: id, name: name, created: new Date().toLocaleDateString('es-DO') }); saveIdx(l); location.hash = '#/db/' + id;
    };
    const r = new FileReader();
    r.onerror = () => say('bad', 'No se pudo leer el archivo.');
    if (/\.(sql|txt)$/i.test(f.name)) {
      r.onload = () => { const db = new SQL.Database(); try { db.run(cleanMysql(String(r.result))); fin(db); } catch (err) { db.close(); say('bad', '<strong>No pude leer ese archivo.</strong><p>' + esc(String(err.message || err)) + '</p><p>Si viene de MySQL, puede tener instrucciones que esta app no entiende. Prueba exportar solo las tablas y los datos.</p>'); } };
      r.readAsText(f);
    } else {
      r.onload = () => { try { const db = new SQL.Database(new Uint8Array(r.result)); db.exec('SELECT name FROM sqlite_master'); fin(db); } catch (err) { say('bad', 'Ese archivo no es una base de datos válida. Usa un archivo <code>.sql</code> o <code>.sqlite</code>.'); } };
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
