/* Asistente de IA que corre dentro del teléfono (WebLLM). Sin servidor, sin pagar. */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MODEL_F16 = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', MODEL_F32 = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC';
  let mod = null, engine = null, modelId = null, busy = false, history = [], root = null, comp = null;

  /* ---- revisión del aparato: devuelve { ok, problems:[html], notes:[html], f16 } ---- */
  async function compat(env) {
    env = env || {};
    const ua = env.ua !== undefined ? env.ua : (navigator.userAgent || '');
    const gpu = env.gpu !== undefined ? env.gpu : navigator.gpu;
    const problems = [], notes = []; let f16 = false;
    const ios = /iP(hone|ad|od)/.test(ua) ? ua.match(/OS (\d+)[_.](\d+)/) : null;
    const isIos = /iP(hone|ad|od)/.test(ua);
    if (isIos) {
      const v = ios ? Number(ios[1]) : 0;
      if (v && v < 26) problems.push('Tu iPhone tiene <strong>iOS ' + v + '</strong>. El asistente necesita <strong>iOS 26 o más nuevo</strong>.<br>Revisa en <em>Ajustes → General → Actualización de software</em>. Si tu modelo no puede actualizarse a iOS 26, no se puede usar la IA en ese aparato (el resto de la app sí funciona).');
    }
    if (!gpu) {
      if (!problems.length) problems.push('Este navegador o este aparato <strong>no permite usar la tarjeta gráfica (WebGPU)</strong>, que la IA necesita.' + (isIos ? '<br>Abre la app en <strong>Safari</strong> y actualiza el iPhone a iOS 26.' : '<br>Prueba con <strong>Chrome o Edge actualizado</strong> (en Android se necesita Android 12 o más nuevo).'));
    } else if (!problems.length) {
      let ad = null;
      try { ad = env.adapter !== undefined ? env.adapter : await gpu.requestAdapter(); } catch (e) { ad = null; }
      if (!ad) problems.push('El aparato <strong>no dejó usar la tarjeta gráfica</strong>. Puede ser muy viejo o el navegador la tiene bloqueada. Prueba cerrar otras apps y abrir de nuevo.');
      else {
        try { f16 = !!(ad.features && ad.features.has && ad.features.has('shader-f16')); } catch (e) { f16 = false; }
      }
    }
    const mem = env.deviceMemory !== undefined ? env.deviceMemory : navigator.deviceMemory;
    if (typeof mem === 'number' && mem < 4) problems.push('Tu aparato tiene muy poca memoria (' + mem + ' GB o menos). La IA necesita al menos 4 GB.');
    let free = env.free;
    if (free === undefined) { try { const e = await navigator.storage.estimate(); free = e.quota - e.usage; } catch (x) { free = undefined; } }
    if (typeof free === 'number' && free < 700 * 1024 * 1024) problems.push('No hay espacio suficiente en el aparato para guardar el modelo (necesita unos 700 MB libres).');
    const online = env.online !== undefined ? env.online : navigator.onLine;
    if (!online) notes.push('Estás sin internet. La <strong>primera vez</strong> hay que descargar el modelo (unos 300 a 1000 MB, mejor con WiFi). Después funciona sin internet.');
    else notes.push('La primera vez descarga el modelo (unos 300 a 1000 MB). <strong>Usa WiFi</strong>. Después funciona sin internet.');
    return { ok: problems.length === 0, problems: problems, notes: notes, f16: f16 };
  }

  function view() {
    return '<header class="top"><a class="back" href="#/mas">← Más</a><h1>Asistente IA</h1></header>' +
      '<p class="fine">Una IA pequeña que corre <strong>dentro de tu teléfono</strong>. No se envía nada a internet ni cuesta dinero. Es lenta y a veces se equivoca: confirma siempre con la lección.</p>' +
      '<div id="iabox"><p class="loading">Revisando si tu aparato es compatible…</p></div>';
  }

  async function mount(app) {
    root = app.querySelector('#iabox'); if (!root) return;
    comp = await compat(); if (!document.body.contains(root)) return;
    if (!comp.ok) {
      root.innerHTML = '<div class="msg warn"><strong>Tu aparato no es compatible con la IA</strong>' + comp.problems.map((p) => '<p>' + p + '</p>').join('') + '</div><p class="fine">No pasa nada: todas las lecciones, el laboratorio y tus bases de datos funcionan igual.</p>';
      return;
    }
    if (engine) { chatUi(); return; }
    root.innerHTML = '<div class="msg ok"><strong>Tu aparato parece compatible.</strong>' + comp.notes.map((n) => '<p>' + n + '</p>').join('') + '</div><button class="btn go" data-ia="start">Activar el asistente</button><div id="iaprog"></div>';
  }

  function schemaText() {
    const S = window.SCHEMA || {};
    return Object.keys(S).map((t) => t + '(' + S[t].join(', ') + ')').join('; ');
  }
  const SYSTEM = () => 'Eres un tutor de bases de datos y SQL para estudiantes de secundaria y politécnico en República Dominicana. Responde SIEMPRE en español, con frases cortas y sencillas (máximo 6 líneas), con un ejemplo de SQL cuando ayude. Si no estás seguro, dilo. Las tablas de práctica son: ' + schemaText() + '. No inventes datos.';

  async function start() {
    const prog = root.querySelector('#iaprog'), btn = root.querySelector('[data-ia=start]'); if (btn) btn.disabled = true;
    const setP = (t, p) => { prog.innerHTML = '<div class="msg"><p>' + esc(t) + '</p>' + (p != null ? '<div class="pbar"><div style="width:' + Math.round(p * 100) + '%"></div></div>' : '') + '</div>'; };
    try {
      setP('Cargando el programa de IA…');
      mod = mod || await import('../lib/web-llm.js');
      modelId = comp.f16 ? MODEL_F16 : MODEL_F32;
      setP('Descargando el modelo… no cierres esta pantalla.', 0);
      engine = await mod.CreateMLCEngine(modelId, { initProgressCallback: (r) => setP(r.text || 'Preparando…', typeof r.progress === 'number' ? r.progress : null) });
      chatUi();
    } catch (e) {
      engine = null; if (btn) btn.disabled = false;
      prog.innerHTML = '<div class="msg bad"><strong>No se pudo activar la IA.</strong><p>' + esc(explainError(e)) + '</p></div>';
    }
  }
  function explainError(e) {
    const m = String(e && (e.message || e) || '');
    if (/memory|alloc|buffer|OOM|out of/i.test(m)) return 'El aparato se quedó sin memoria. Cierra otras apps y pestañas y vuelve a intentar. Si sigue igual, este aparato es muy limitado para la IA.';
    if (/device.*lost|lost/i.test(m)) return 'El navegador cortó el uso de la tarjeta gráfica (pasa cuando la memoria se llena). Cierra otras apps y vuelve a intentar.';
    if (/fetch|network|Failed to|load failed|NetworkError|Cache|quota/i.test(m)) return 'No se pudo descargar o guardar el modelo. Revisa tu internet (mejor WiFi) y el espacio libre, y vuelve a intentar.';
    if (/WebGPU|adapter|shader|feature|limit/i.test(m)) return 'Este aparato no tiene todo lo que la IA necesita en la tarjeta gráfica.';
    return 'Ocurrió un error inesperado (' + m.slice(0, 120) + '). Vuelve a intentar; si se repite, este aparato no es compatible.';
  }

  function chatUi() {
    root.innerHTML = '<div id="iachat" class="iachat" aria-live="polite"></div>' +
      '<div class="row"><button class="btn small ghost chipb" data-ia="q" data-q="¿Qué es un JOIN? Explícamelo fácil.">¿Qué es un JOIN?</button><button class="btn small ghost chipb" data-ia="q" data-q="¿Para qué sirve GROUP BY?">¿Para qué sirve GROUP BY?</button><button class="btn small ghost chipb" data-ia="q" data-q="¿Cuál es la diferencia entre WHERE y HAVING?">WHERE vs HAVING</button></div>' +
      '<textarea id="iain" class="inp" rows="2" maxlength="500" placeholder="Escribe tu duda de SQL…"></textarea>' +
      '<div class="row"><button class="btn go" data-ia="send">Preguntar</button><button class="btn small ghost" data-ia="stop">Detener</button><button class="btn small ghost danger" data-ia="del">Quitar el modelo del aparato</button></div>';
    history.forEach((m) => addBubble(m.role, m.content));
  }
  function addBubble(role, text) {
    const c = document.getElementById('iachat'); if (!c) return null;
    const d = document.createElement('div'); d.className = 'iab ' + (role === 'user' ? 'u' : 'a'); d.textContent = text; c.appendChild(d); d.scrollIntoView({ block: 'nearest' }); return d;
  }
  async function ask(text) {
    text = String(text || '').trim().slice(0, 500); if (!text || busy || !engine) return;
    busy = true; addBubble('user', text); const out = addBubble('assistant', '…'); let acc = '';
    const inp = document.getElementById('iain'); if (inp) inp.value = '';
    try {
      const msgs = [{ role: 'system', content: SYSTEM() }].concat(history.slice(-6), [{ role: 'user', content: text }]);
      const it = await engine.chat.completions.create({ messages: msgs, stream: true, temperature: 0.3, max_tokens: 350 });
      for await (const ch of it) { const t = ch.choices[0] && ch.choices[0].delta && ch.choices[0].delta.content; if (t) { acc += t; out.textContent = acc; out.scrollIntoView({ block: 'nearest' }); } }
      if (!acc) out.textContent = '(La IA no respondió. Intenta otra vez.)';
      history.push({ role: 'user', content: text }, { role: 'assistant', content: acc || '' }); history = history.slice(-12);
    } catch (e) {
      out.textContent = acc ? acc + '\n\n(Se cortó la respuesta.)' : 'No pude responder: ' + explainError(e);
      if (/lost|memory/i.test(String(e && e.message || e))) engine = null;
    }
    busy = false;
  }

  document.addEventListener('click', async (e) => {
    const el = e.target.closest && e.target.closest('[data-ia]'); if (!el) return;
    const a = el.dataset.ia;
    if (a === 'start') start();
    else if (a === 'send') ask((document.getElementById('iain') || {}).value);
    else if (a === 'q') ask(el.dataset.q);
    else if (a === 'stop') { try { engine && engine.interruptGenerate(); } catch (x) { /* ignorar */ } }
    else if (a === 'del') {
      if (!confirm('¿Quitar el modelo descargado? Para volver a usar la IA tendrás que descargarlo otra vez.')) return;
      try { mod = mod || await import('../lib/web-llm.js'); await mod.deleteModelAllInfoInCache(modelId || (comp && comp.f16 ? MODEL_F16 : MODEL_F32)); } catch (x) { /* ignorar */ }
      try { engine && await engine.unload(); } catch (x) { /* ignorar */ }
      engine = null; history = []; if (root) root.innerHTML = '<div class="msg ok">Modelo quitado del aparato.</div>';
    }
  });
  document.addEventListener('keydown', (e) => { if (e.target && e.target.id === 'iain' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(e.target.value); } });

  window.IA = { view: view, mount: mount, compat: compat };
}());
