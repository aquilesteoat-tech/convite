/* Convite interativo: JavaScript puro, sem dependências e sem enviar dados a servidores. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Estado das escolhas (mantido ao navegar entre telas)
  var state = { vibe: null, idea: '', day: null, time: null, otherOn: false, otherTime: '' };
  var current = 0;
  var screens = $$('.screen');

  /* ---------- Navegação ---------- */
  function show(key) {
    screens.forEach(function (s) { s.hidden = String(s.dataset.screen) !== String(key); });
    var active = screens.filter(function (s) { return !s.hidden; })[0];
    var h = active && $('h1,h2', active);
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
    window.scrollTo(0, 0);
    if (key === 3) renderSummary();
  }
  function go(n) { current = n; show(n); }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-action]');
    if (!a) return;
    var act = a.dataset.action;
    if (act === 'next') go(Math.min(current + 1, 3));
    if (act === 'back') go(Math.max(current - 1, 0));
    if (act === 'restart') restart();
  });

  /* ---------- Seleções (rádio visual) ---------- */
  function paint(group) {
    $$('[data-group="' + group + '"]').forEach(function (b) {
      b.setAttribute('aria-checked', String(state[group] === b.dataset.value));
    });
  }
  $$('[data-group]').forEach(function (b) {
    b.addEventListener('click', function () {
      var g = b.dataset.group;
      state[g] = b.dataset.value;
      if (g === 'time') { state.otherOn = false; syncOther(); }
      paint(g);
      if (g === 'vibe') syncVibe();
      validate();
    });
  });

  function syncVibe() {
    $('#ideaBox').hidden = state.vibe !== 'Quer algo específico';
  }
  function syncOther() {
    $('#otherBox').hidden = !state.otherOn;
    $('#otherTimeBtn').setAttribute('aria-pressed', String(state.otherOn));
    if (state.otherOn) { state.time = null; paint('time'); }
  }
  $('#otherTimeBtn').addEventListener('click', function () {
    state.otherOn = !state.otherOn;
    syncOther();
    if (state.otherOn) $('#otherTime').focus();
    validate();
  });
  $('#idea').addEventListener('input', function (e) { state.idea = e.target.value; });
  $('#otherTime').addEventListener('input', function (e) { state.otherTime = e.target.value; validate(); });

  function validate() {
    $('#next1').disabled = !state.vibe;
    var timeOk = state.time || (state.otherOn && state.otherTime.trim().length > 0);
    $('#next2').disabled = !(state.day && timeOk);
  }

  /* ---------- Resumo (usa textContent: nada de HTML injetado) ---------- */
  function timeText() { return state.otherOn ? state.otherTime.trim() + ' (sugestão dela)' : state.time; }
  function rows() {
    var r = [['Tipo de encontro', state.vibe]];
    if (state.vibe === 'Quer algo específico' && state.idea.trim()) r.push(['Ideia', state.idea.trim()]);
    r.push(['Dia', state.day], ['Horário', timeText()]);
    return r;
  }
  function summaryText() {
    return 'Proposta registrada! 🥳\n' + rows().map(function (x) { return x[0] + ': ' + x[1]; }).join('\n') +
      '\nAgora só falta combinar os detalhes. 😎';
  }
  function renderSummary() {
    var dl = $('#summary');
    dl.textContent = '';
    rows().forEach(function (x) {
      var d = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd');
      dt.textContent = x[0]; dd.textContent = x[1];
      d.appendChild(dt); d.appendChild(dd); dl.appendChild(d);
    });
    $('#wa').href = 'https://wa.me/?text=' + encodeURIComponent(summaryText());
    $('#copyMsg').hidden = true; $('#fallback').hidden = true;
  }

  /* ---------- Copiar com alternativa ---------- */
  function msg(t) { var m = $('#copyMsg'); m.textContent = t; m.hidden = false; }
  $('#copy').addEventListener('click', function () {
    var text = summaryText();
    function fallback() {
      var ta = $('#fallback');
      ta.value = text; ta.hidden = false; ta.focus(); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      msg(ok ? 'Resumo copiado! Agora é só colar na conversa.' : 'Não consegui copiar sozinho. Selecionei o texto: copie manualmente.');
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { msg('Resumo copiado! Agora é só colar na conversa.'); }, fallback);
    } else { fallback(); }
  });

  /* ---------- Botões fujões (Talvez / Não) ---------- */
  var runners = $$('.runner');
  var yes = $('#yes');
  var lastMove = 0, flees = 0;

  function overlap(a, b, pad) {
    return !(a.right + pad < b.left || a.left - pad > b.right || a.bottom + pad < b.top || a.top - pad > b.bottom);
  }
  function flee(btn) {
    if (!btn.dataset.fled) { // cria espaço reservado para o layout não pular
      var r0 = btn.getBoundingClientRect(), ph = document.createElement('span');
      ph.className = 'ph'; ph.style.cssText = 'display:inline-block;width:' + r0.width + 'px;height:' + r0.height + 'px';
      btn.after(ph); btn.dataset.fled = '1'; btn.classList.add('fled');
    }
    var w = btn.offsetWidth, h = btn.offsetHeight, m = 12;
    var maxX = Math.max(m, window.innerWidth - w - m), maxY = Math.max(m, window.innerHeight - h - m);
    var avoid = [yes.getBoundingClientRect()];
    runners.forEach(function (o) { if (o !== btn && o.dataset.fled) avoid.push(o.getBoundingClientRect()); });
    var x, y, box, tries = 0;
    do {
      x = m + Math.random() * (maxX - m); y = m + Math.random() * (maxY - m);
      box = { left: x, top: y, right: x + w, bottom: y + h };
      tries++;
    } while (tries < 20 && avoid.some(function (a) { return overlap(box, a, 14); }));
    btn.style.left = x + 'px'; btn.style.top = y + 'px';
    flees++;
    if (flees === 6) notice('Ok, já percebi que os botões são tímidos. Mas você pode recusar de verdade, sem pressão.');
  }
  function notice(t) { var n = $('#notice'); n.textContent = t; n.hidden = false; }

  runners.forEach(function (btn) {
    btn.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') flee(btn); });
    btn.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') { e.preventDefault(); flee(btn); } });
    btn.addEventListener('click', function (e) {
      if (e.detail === 0) { // teclado: não foge, responde com gentileza
        show('exit');
      } else { flee(btn); }
    });
  });
  document.addEventListener('pointermove', function (e) { // foge ao se aproximar do cursor
    if (e.pointerType !== 'mouse' || current !== 0) return;
    var now = Date.now(); if (now - lastMove < 200) return;
    runners.forEach(function (b) {
      var r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (Math.hypot(e.clientX - cx, e.clientY - cy) < 90) { lastMove = now; flee(b); }
    });
  });
  window.addEventListener('resize', function () { // mantém os botões dentro da tela
    runners.forEach(function (b) {
      if (!b.dataset.fled) return;
      b.style.left = Math.min(parseFloat(b.style.left) || 12, Math.max(12, window.innerWidth - b.offsetWidth - 12)) + 'px';
      b.style.top = Math.min(parseFloat(b.style.top) || 12, Math.max(12, window.innerHeight - b.offsetHeight - 12)) + 'px';
    });
  });

  yes.addEventListener('click', function () { go(1); });
  $('#exit').addEventListener('click', function () { show('exit'); });

  /* ---------- Reiniciar ---------- */
  function restart() {
    state = { vibe: null, idea: '', day: null, time: null, otherOn: false, otherTime: '' };
    $('#idea').value = ''; $('#otherTime').value = '';
    ['vibe', 'day', 'time'].forEach(paint);
    syncVibe(); syncOther(); validate();
    runners.forEach(function (b) {
      var ph = b.nextElementSibling;
      if (ph && ph.classList.contains('ph')) ph.remove();
      b.classList.remove('fled'); b.removeAttribute('style'); delete b.dataset.fled;
    });
    flees = 0; $('#notice').hidden = true;
    go(0);
  }

  validate();
})();
