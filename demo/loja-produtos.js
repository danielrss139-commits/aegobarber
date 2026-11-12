/* =====================================================================
   AEGO · Vitrine de produtos na página do cliente (index.html)
   ---------------------------------------------------------------------
   1) Palco 3D: a pomada gira sozinha e troca de produto deslizando para o lado ou pelas setas
      (sem prender a rolagem da página) (inspirado nos sites de carro/viagem com scroll cinematográfico).
   2) Carrossel horizontal de cartões de vidro (deslize) com foto, descrição e preço.
   3) Toque em "Ver em 3D": folha com o modelo para girar com o dedo e reservar pelo WhatsApp.
   Só aparece se a barbearia tiver produtos ativos (cadastrados no painel).
   ===================================================================== */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  if (!window.DB || !window.JC || !window.P3D || !$('vitrine')) return;
  var U = DB.util, esc = JC.esc, LJ = JC.loja;
  var lista = [], palco = null, atual = -1, sheet3d = null;
  var calmo = JC.reduz;

  function dots(n) { var o = ''; for (var i = 1; i <= 5; i++) o += '<i class="' + (i <= n ? 'on' : '') + '"></i>'; return '<span class="dots" aria-label="Fixação ' + n + ' de 5">' + o + '</span>'; }
  function capa(p) { var m = p.modelo3d || {}; var c = m.capa || (p.fotos && p.fotos.frente) || ''; return P3D.urlOk(c) ? c : ''; }
  var FIX = ['', 'leve', 'média-leve', 'média', 'forte', 'extra forte'];

  function carregar(tent) {
    DB.produtos().then(function (l) {
      lista = l.filter(function (p) { return p.ativo !== false && (p.estoque || 0) > 0; })
        .sort(function (a, b) { return (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0) || (a.ordem || 0) - (b.ordem || 0); }).slice(0, 8);
      if (!lista.length && (tent || 0) < 2 && LJ.demo) return setTimeout(function () { carregar((tent || 0) + 1); }, 400);
      render();
    }).catch(function (e) { console.warn('[vitrine]', e && e.code); });
  }

  function render() {
    var v = $('vitrine');
    if (!lista.length) { v.hidden = true; return; }
    v.hidden = false;
    com3d = lista.filter(function (p) { return p.modelo3d; });
    var big = (lista.map(function (p) { return p.categoria || 'Pomada'; }).filter(function (c, i, a) { return a.indexOf(c) === i; }).join(' · ') + ' · ').toUpperCase();
    $('vtBig').innerHTML = '<span>' + esc(big + big + big) + '</span>';
    $('vtProg').innerHTML = com3d.map(function (_, i) { return '<i class="' + (i ? '' : 'on') + '"></i>'; }).join('');
    $('vtPin').hidden = !com3d.length;
    $('vtAnt').hidden = $('vtProx').hidden = com3d.length < 2;
    var velhoM = $('vt3d').querySelectorAll('.vt-m'); if (palco) { palco.destruir(); palco = null; } velhoM.forEach(function (x) { x.remove(); });
    $('vtCards').innerHTML = lista.map(function (p, i) {
      var c = capa(p);
      return '<article class="vt-card lg" style="--i:' + i + '" data-id="' + esc(p.id) + '">' +
        '<div class="vt-card-img">' + (c ? '<img src="' + esc(c) + '" alt="' + esc(p.nome) + '" loading="lazy" decoding="async" width="300" height="300">' : AEGO_ICONES.svg('pomada', 'ico-xl')) +
        (p.destaque ? '<em class="tag tag-dest">Mais vendida</em>' : '') + '</div>' +
        '<div class="vt-card-b"><span class="pd-cat">' + esc([p.marca, p.categoria].filter(Boolean).join(' · ')) + '</span><h3>' + esc(p.nome) + '</h3>' +
        '<div class="pc-meta">' + (p.fixacao ? dots(p.fixacao) + '<span>fixação ' + FIX[p.fixacao] + '</span>' : '') + (p.brilho ? '<span>· brilho ' + esc(p.brilho.toLowerCase()) + '</span>' : '') + '</div>' +
        (p.descricao ? '<p>' + esc(p.descricao) + '</p>' : '') +
        '<div class="vt-card-f"><b class="num">' + esc(U.brl(p.preco)) + '</b><button class="btn btn-primary" type="button" data-ver="' + esc(p.id) + '">' +
        '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5l6.5 3.7v7.6L10 17.5l-6.5-3.7V6.2z"/><path d="M3.5 6.2L10 10l6.5-3.8M10 10v7.5"/></svg>' + (p.modelo3d ? 'Ver em 3D' : 'Detalhes') + '</button></div></div></article>';
    }).join('');
    atual = -1;
    if (com3d.length) mostrar(0, true);
  }

  /* ---------- palco: um produto por vez, troca por deslize/setas, sem sequestrar a rolagem ---------- */
  var com3d = [], visivel = true, trocando = false;
  function mostrar(i, primeira) {
    var n = com3d.length; if (!n) return;
    i = ((i % n) + n) % n;
    var p = com3d[i]; if (!p || i === atual) return;
    var dir = i > atual ? 1 : -1; if (atual === n - 1 && i === 0) dir = 1; if (atual === 0 && i === n - 1) dir = -1;
    atual = i;
    var el = $('vt3d'), antigo = palco, velho = el.querySelector('.vt-m');
    var box = document.createElement('div'); box.className = 'vt-m';
    if (!primeira && !calmo) { box.classList.add('entra'); box.style.setProperty('--d', dir); }
    el.appendChild(box);
    palco = P3D.criar(box, p.modelo3d, { auto: visivel && !calmo, arrastar: false, faces: 28, inclinacao: -12 });
    if (velho) {
      if (!primeira && !calmo) { velho.style.setProperty('--d', dir); velho.classList.add('sai'); }
      setTimeout(function () { if (antigo) antigo.destruir(); if (velho.parentNode) velho.parentNode.removeChild(velho); }, calmo ? 0 : 420);
    }
    if (!primeira && !calmo) requestAnimationFrame(function () { box.classList.remove('entra'); });
    var info = $('vtInfo');
    info.innerHTML = '<span class="vt-cat">' + esc([p.marca, p.categoria].filter(Boolean).join(' · ')) + '</span>' +
      '<h3>' + esc(p.nome) + '</h3><span class="vt-preco num">' + esc(U.brlCurto(p.preco)) + '</span>' +
      '<span class="vt-meta">' + (p.fixacao ? dots(p.fixacao) : '') + (p.brilho ? '<span>' + esc(p.brilho) + '</span>' : '') + '</span>' +
      '<button class="btn btn-primary" type="button" data-ver="' + esc(p.id) + '">Ver em 3D</button>';
    if (!primeira && !calmo) { info.classList.remove('troca'); void info.offsetWidth; info.classList.add('troca'); }
    $('vtProg').querySelectorAll('i').forEach(function (x, k) { x.classList.toggle('on', k === i); });
    $('vtBig').style.transform = 'translate3d(' + (-(i / Math.max(1, n)) * 40) + '%,0,0)';
  }
  function passo(d) { if (trocando) return; trocando = true; mostrar(atual + d); $('vtDica').style.opacity = 0; setTimeout(function () { trocando = false; }, 380); }
  $('vtAnt').addEventListener('click', function () { passo(-1); });
  $('vtProx').addEventListener('click', function () { passo(1); });
  /* deslize horizontal no palco (vertical continua rolando a página normalmente) */
  (function () {
    var st = $('vtStage'), x0 = 0, y0 = 0, ativo = false;
    st.addEventListener('touchstart', function (e) { if (e.target.closest('button')) return; var t = e.touches[0]; x0 = t.clientX; y0 = t.clientY; ativo = true; }, { passive: true });
    st.addEventListener('touchend', function (e) {
      if (!ativo) return; ativo = false;
      var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) passo(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();
  /* só anima quando o palco está na tela (economiza bateria e evita travadas) */
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
    visivel = es[0].isIntersecting; if (palco && palco.girar) palco.girar(visivel && !calmo);
  }, { threshold: .15 }).observe($('vtStage'));
  function rolar() {}

  /* ---------- folha do produto ---------- */
  function abrir(id) {
    var p = lista.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    var b = $('pdBody');
    b.innerHTML = '<div class="pd-3d" id="pd3d"></div>' + (p.modelo3d ? '<p class="pd-dica">Arraste para girar</p>' : '') +
      '<span class="pd-cat">' + esc([p.marca, p.categoria, p.conteudo].filter(Boolean).join(' · ')) + '</span>' +
      '<h2 class="pd-nome" id="pdT">' + esc(p.nome) + '</h2>' +
      '<div class="pd-chips">' + (p.fixacao ? '<span>' + dots(p.fixacao) + 'Fixação ' + FIX[p.fixacao] + '</span>' : '') + (p.brilho ? '<span>Brilho ' + esc(p.brilho.toLowerCase()) + '</span>' : '') + (p.indicacao ? '<span>' + esc(p.indicacao) + '</span>' : '') + '</div>' +
      (p.descricao ? '<p class="pd-desc">' + esc(p.descricao) + '</p>' : '') +
      (p.comoUsar ? '<p class="pd-desc small muted"><b>Como usar:</b> ' + esc(p.comoUsar) + '</p>' : '') +
      '<div class="pd-preco num">' + esc(U.brl(p.preco)) + '</div>';
    if (sheet3d) sheet3d.destruir();
    if (p.modelo3d) sheet3d = P3D.criar($('pd3d'), p.modelo3d, { auto: true });
    else $('pd3d').innerHTML = capa(p) ? '<img src="' + esc(capa(p)) + '" alt="" style="height:100%;margin:auto;object-fit:contain">' : '';
    var msg = 'Olá! Vi no site a ' + p.nome + ' (' + U.brl(p.preco) + '). Quero reservar para retirar na barbearia.';
    var z = $('pdZap');
    if (LJ.whatsapp) { z.href = 'https://wa.me/' + LJ.whatsapp + '?text=' + encodeURIComponent(msg); z.classList.remove('hidden'); } else z.classList.add('hidden');
    $('pdScrim').classList.add('is-on'); $('pdSheet').classList.add('is-on'); $('pdSheet').setAttribute('aria-hidden', 'false');
  }
  function fechar() {
    $('pdScrim').classList.remove('is-on'); $('pdSheet').classList.remove('is-on'); $('pdSheet').setAttribute('aria-hidden', 'true');
    setTimeout(function () { if (sheet3d && !$('pdSheet').classList.contains('is-on')) { sheet3d.destruir(); sheet3d = null; } }, 500);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ver]'); if (b) { e.preventDefault(); abrir(b.dataset.ver); return; }
    var c = e.target.closest('.vt-card'); if (c && !e.target.closest('a,button')) abrir(c.dataset.id);
  });
  $('pdScrim').addEventListener('click', fechar);
  $('pdFechar').addEventListener('click', fechar);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('pdSheet').classList.contains('is-on')) fechar(); });

  function iniciar() {
    carregar(0);
    if (DB.aoMudar) DB.aoMudar(function () { carregar(2); });
  }
  if (document.readyState === 'complete') setTimeout(iniciar, 50); else window.addEventListener('load', function () { setTimeout(iniciar, 50); });
})();
