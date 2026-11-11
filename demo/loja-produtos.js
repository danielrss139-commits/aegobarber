/* =====================================================================
   AEGO · Vitrine de produtos na página do cliente (index.html)
   ---------------------------------------------------------------------
   1) Palco fixo guiado pela rolagem: texto gigante desliza ao fundo, a pomada 3D gira conforme você rola
      e troca de produto a cada trecho (inspirado nos sites de carro/viagem com scroll cinematográfico).
   2) Cartões de vidro que empilham (sticky) com foto, descrição e preço.
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
    var com3d = lista.filter(function (p) { return p.modelo3d; });
    v.style.setProperty('--n', Math.max(1, com3d.length));
    var big = (lista.map(function (p) { return p.categoria || 'Pomada'; }).filter(function (c, i, a) { return a.indexOf(c) === i; }).join(' · ') + ' · ').toUpperCase();
    $('vtBig').innerHTML = '<span>' + esc(big + big + big) + '</span>';
    $('vtProg').innerHTML = com3d.map(function (_, i) { return '<i class="' + (i ? '' : 'on') + '"></i>'; }).join('');
    $('vtPin').hidden = !com3d.length;
    $('vtCards').innerHTML = lista.map(function (p, i) {
      var c = capa(p);
      return '<article class="vt-card lg" style="--i:' + i + '" data-id="' + esc(p.id) + '">' +
        '<div class="vt-card-img">' + (c ? '<img src="' + esc(c) + '" alt="' + esc(p.nome) + '" loading="lazy" decoding="async">' : AEGO_ICONES.svg('pomada', 'ico-xl')) +
        (p.destaque ? '<em class="tag tag-dest">Mais vendida</em>' : '') + '</div>' +
        '<div class="vt-card-b"><span class="pd-cat">' + esc([p.marca, p.categoria].filter(Boolean).join(' · ')) + '</span><h3>' + esc(p.nome) + '</h3>' +
        '<div class="pc-meta">' + (p.fixacao ? dots(p.fixacao) + '<span>fixação ' + FIX[p.fixacao] + '</span>' : '') + (p.brilho ? '<span>· brilho ' + esc(p.brilho.toLowerCase()) + '</span>' : '') + '</div>' +
        (p.descricao ? '<p>' + esc(p.descricao) + '</p>' : '') +
        '<div class="vt-card-f"><b class="num">' + esc(U.brl(p.preco)) + '</b><button class="btn btn-primary" type="button" data-ver="' + esc(p.id) + '">' +
        '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5l6.5 3.7v7.6L10 17.5l-6.5-3.7V6.2z"/><path d="M3.5 6.2L10 10l6.5-3.8M10 10v7.5"/></svg>' + (p.modelo3d ? 'Ver em 3D' : 'Detalhes') + '</button></div></div></article>';
    }).join('');
    atual = -1;
    if (com3d.length) mostrar(0, true);
    rolar();
  }

  function mostrar(i, primeira) {
    var com3d = lista.filter(function (p) { return p.modelo3d; });
    var p = com3d[i]; if (!p || i === atual) return;
    atual = i;
    if (palco) palco.destruir();
    var el = $('vt3d');
    palco = P3D.criar(el, p.modelo3d, { auto: false, arrastar: false, estatico: true, inclinacao: -14 });
    if (!primeira && !calmo) { el.classList.remove('troca'); void el.offsetWidth; el.classList.add('troca'); }
    var info = $('vtInfo');
    info.innerHTML = '<span class="vt-cat">' + esc([p.marca, p.categoria].filter(Boolean).join(' · ')) + '</span>' +
      '<h3>' + esc(p.nome) + '</h3><span class="vt-preco num">' + esc(U.brlCurto(p.preco)) + '</span>' +
      '<span class="vt-meta">' + (p.fixacao ? dots(p.fixacao) : '') + (p.brilho ? '<span>' + esc(p.brilho) + '</span>' : '') + '</span>' +
      '<button class="btn btn-primary" type="button" data-ver="' + esc(p.id) + '">Ver em 3D</button>';
    if (!primeira && !calmo) { info.classList.remove('troca'); void info.offsetWidth; info.classList.add('troca'); }
    $('vtProg').querySelectorAll('i').forEach(function (x, k) { x.classList.toggle('on', k === i); });
  }

  /* ---------- rolagem: gira o produto, desliza o texto, empilha cartões ---------- */
  var tick = false;
  function rolar() {
    tick = false;
    var pin = $('vtPin');
    if (pin && !pin.hidden && palco) {
      var r = pin.getBoundingClientRect(), total = pin.offsetHeight - innerHeight;
      var p = Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
      var n = lista.filter(function (x) { return x.modelo3d; }).length || 1;
      var idx = Math.min(n - 1, Math.floor(p * n)), loc = p * n - idx;
      if (r.bottom > 0 && r.top < innerHeight) {
        mostrar(idx);
        if (palco) { palco.angulo(-30 + loc * 360); palco.inclinar(-8 - Math.sin(loc * Math.PI) * 18); }
        $('vtBig').style.transform = 'translate3d(' + (-p * 55) + '%,0,0)';
        $('vtDica').style.opacity = p > .04 ? 0 : 1;
      }
    }
    var cards = document.querySelectorAll('.vt-card');
    cards.forEach(function (c, i) {
      var prox = cards[i + 1]; if (!prox) { c.style.setProperty('--s', 0); return; }
      var a = c.getBoundingClientRect(), b = prox.getBoundingClientRect();
      var s = Math.max(0, Math.min(1, 1 - (b.top - a.top) / Math.max(1, a.height)));
      c.style.setProperty('--s', s.toFixed(3));
    });
  }
  window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(rolar); } }, { passive: true });
  window.addEventListener('resize', function () { requestAnimationFrame(rolar); });

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
