/* Voz: escuchar (texto a voz) y dictar (voz a texto). Todo en el aparato / navegador. */
(function () {
  const TS = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const KEY = 'aprendesql.voz';
  const get = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const set = (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* ignorar */ } };
  let speaking = false, rec = null, recBtn = null;

  const clean = (s) => String(s).replace(/<[^>]+>/g, ' ').replace(/\*\*|__/g, '').replace(/`([^`]*)`/g, '$1').replace(/&amp;/g, 'y').replace(/&[a-z]+;/g, ' ').replace(/[→←▶🔊✅💡⚠️🎓]/g, ' ').replace(/\s+/g, ' ').trim();
  function chunks(t) {
    const out = []; (t.match(/[^.!?:;\n]+[.!?:;]?/g) || [t]).forEach((s) => { s = s.trim(); while (s.length > 180) { let i = s.lastIndexOf(' ', 180); if (i < 40) i = 180; out.push(s.slice(0, i)); s = s.slice(i).trim(); } if (s) out.push(s); });
    return out;
  }
  function voice() {
    let vs = []; try { vs = speechSynthesis.getVoices() || []; } catch (e) { return null; }
    const es = vs.filter((v) => /^es/i.test(v.lang)); if (!es.length) return null;
    for (const p of ['es-DO', 'es-MX', 'es-US', 'es-419', 'es-ES']) { const v = es.find((x) => x.lang.replace('_', '-') === p); if (v) return v; }
    return es[0];
  }
  function stop() { if (TS) { try { speechSynthesis.cancel(); } catch (e) { /* ignorar */ } } speaking = false; document.querySelectorAll('[data-voz].on').forEach((b) => { b.classList.remove('on'); if (b.dataset.lbl) b.textContent = b.dataset.lbl; }); }
  function speak(text, btn) {
    if (!TS) { say('Este navegador no puede leer en voz alta.'); return; }
    stop(); const parts = chunks(clean(text)); if (!parts.length) return;
    const v = voice();
    if (btn) { btn.dataset.lbl = btn.dataset.lbl || btn.textContent; btn.classList.add('on'); btn.textContent = '⏹ Parar'; }
    speaking = true; let i = 0, bad = false;
    const next = () => {
      if (!speaking || i >= parts.length) { if (speaking) stop(); return; }
      const u = new SpeechSynthesisUtterance(parts[i++]); u.lang = v ? v.lang.replace('_', '-') : 'es-ES'; if (v) u.voice = v; u.rate = 0.95;
      u.onend = next; u.onerror = (e) => { if (e.error === 'canceled' || e.error === 'interrupted') return; if (!bad) { bad = true; say('No se pudo leer en voz alta. Sube el volumen y revisa que el teléfono no esté en silencio.'); } stop(); };
      try { speechSynthesis.speak(u); } catch (e) { stop(); }
    };
    next();
  }
  function say(t) {
    let b = document.getElementById('vozmsg');
    if (!b) { b = document.createElement('div'); b.id = 'vozmsg'; b.className = 'msg warn'; b.setAttribute('role', 'status'); b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:84px;z-index:50'; document.body.appendChild(b); }
    b.textContent = t; b.hidden = false; clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 7000);
  }

  /* dictado */
  function dictate(target, btn) {
    if (rec) { try { rec.stop(); } catch (e) { /* ignorar */ } return; }
    if (!SR) { say('Este navegador no tiene dictado. En el iPhone toca el micrófono 🎤 que está en tu teclado, abajo a la derecha, y habla.'); return; }
    const r = new SR(); rec = r; recBtn = btn; let base = target.value ? target.value.replace(/\s*$/, ' ') : '', got = false, tryEs = false;
    r.lang = 'es-DO'; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    btn.classList.add('on'); btn.dataset.lbl = btn.dataset.lbl || btn.textContent; btn.textContent = '⏹ Escuchando…';
    r.onresult = (ev) => { let t = ''; for (let i = 0; i < ev.results.length; i++) t += ev.results[i][0].transcript; got = true; target.value = (base + t).slice(0, Number(target.maxLength) > 0 ? target.maxLength : 5000); target.dispatchEvent(new Event('input', { bubbles: true })); };
    r.onerror = (ev) => {
      const e = ev.error;
      if (e === 'language-not-supported' && !tryEs) { tryEs = true; return; }
      if (e === 'not-allowed' || e === 'service-not-allowed') say('No tengo permiso para usar el micrófono. En el iPhone: Ajustes → Safari → Micrófono → Permitir, y activa el dictado en Ajustes → General → Teclado → Activar dictado. Mientras tanto usa el 🎤 de tu teclado.');
      else if (e === 'no-speech') say('No te escuché. Acércate al micrófono y habla un poco más fuerte.');
      else if (e === 'audio-capture') say('No encuentro el micrófono de este aparato.');
      else if (e === 'network') say('El dictado necesita internet. Conéctate o usa el 🎤 de tu teclado.');
      else if (e !== 'aborted') say('El dictado falló (' + e + '). Usa el 🎤 de tu teclado.');
    };
    r.onend = () => { rec = null; btn.classList.remove('on'); btn.textContent = btn.dataset.lbl; if (tryEs && !got) { tryEs = false; const r2 = new SR(); /* segundo intento en es-ES */ r2.lang = 'es-ES'; r2.onresult = r.onresult; r2.onend = () => {}; r2.onerror = r.onerror; try { r2.start(); } catch (x) { /* ignorar */ } } };
    try { r.start(); } catch (e) { rec = null; btn.classList.remove('on'); btn.textContent = btn.dataset.lbl; say('No se pudo iniciar el micrófono. Intenta de nuevo.'); }
  }

  function lessonText() {
    const m = location.hash.match(/#\/l\/(\d+)/); const l = m && (window.LECCIONES || []).find((x) => x.id === Number(m[1])); if (!l) return '';
    return l.titulo + '. ' + l.aprender.filter((b) => b.t === 'p').map((b) => b.x).join(' ');
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('[data-voz]'); if (!el) return;
    const a = el.dataset.voz;
    if (el.classList.contains('on') && a !== 'mic') { stop(); return; }
    if (a === 'lesson') speak(lessonText(), el);
    else if (a === 'text') speak(el.dataset.text || '', el);
    else if (a === 'bubble') { const b = el.closest('.iab'); speak(b ? b.dataset.raw || b.firstChild.textContent : '', el); }
    else if (a === 'note') { const t = document.querySelector('[data-ta=note]'); speak(t ? t.value : '', el); }
    else if (a === 'mic') { const t = document.querySelector(el.dataset.target); if (t) dictate(t, el); }
    else if (a === 'auto') { set(el.checked); }
  });
  document.addEventListener('change', (e) => { if (e.target.dataset && e.target.dataset.voz === 'auto') set(e.target.checked); });
  window.addEventListener('hashchange', () => { stop(); if (rec) { try { rec.abort(); } catch (e) { /* ignorar */ } } });
  window.addEventListener('pagehide', stop);
  if (TS) { try { speechSynthesis.getVoices(); } catch (e) { /* ignorar */ } }

  window.VOZ = { speak: speak, stop: stop, auto: get, canSpeak: TS, canDictate: !!SR };
}());
