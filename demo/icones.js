/* =====================================================================
   AEGO · Pack de ícones de barbearia (traço fino, 24x24, sem preenchimento)
   ---------------------------------------------------------------------
   - Cada ícone tem: id, nome (aparece no seletor do painel), palavras (para achar sozinho pelo nome do serviço)
     e d (o desenho em SVG).
   - Ordem de prioridade para escolher o ícone de um serviço (ver comum.js > iconeDe):
       1) o ícone que o barbeiro escolheu no painel (campo "icone" salvo no serviço)
       2) o ícone do loja.config.js
       3) a primeira palavra-chave que bater com o nome do serviço (aqui embaixo)
       4) "estrela" (nunca fica sem ícone)
   - Para criar um novo: copie uma linha, troque o id e desenhe com path/circle/rect em viewBox 0 0 24 24.
   ===================================================================== */
(function (w) {
  'use strict';
  var I = [
    // ---- cortes ----
    { id: 'tesoura', nome: 'Tesoura', palavras: ['corte', 'cabelo', 'social', 'tesoura', 'americano', 'militar'],
      d: '<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M9.2 14.8L18 3.5M14.8 14.8L6 3.5"/>' },
    { id: 'maquina', nome: 'Máquina', palavras: ['maquina', 'máquina', 'zero', 'raspado', 'careca', 'buzz'],
      d: '<rect x="7.5" y="7" width="9" height="14" rx="3"/><path d="M7 4h10M8.5 4v3M12 4v3M15.5 4v3M12 12.5v3"/>' },
    { id: 'degrade', nome: 'Degradê', palavras: ['degrad', 'fade', 'low fade', 'mid fade', 'high fade', 'disfarçado', 'disfarcado'],
      d: '<path d="M4 20h16"/><path d="M5 16.5h14" stroke-opacity=".85"/><path d="M6 13h12" stroke-opacity=".6"/><path d="M7.5 9.5h9" stroke-opacity=".4"/><path d="M9 6h6" stroke-opacity=".25"/>' },
    { id: 'navalha', nome: 'Navalha', palavras: ['navalha', 'navalhado', 'risco', 'listra'],
      d: '<path d="M3.5 15.5L14 5a2.1 2.1 0 0 1 3 3L6.5 18.5z"/><path d="M14 15.5l5.5 5M6.5 18.5l-2 2"/>' },
    { id: 'pezinho', nome: 'Pezinho', palavras: ['pezinho', 'acabamento', 'contorno', 'nuca', 'limpeza do corte'],
      d: '<path d="M7 3.5c0 6 1.5 9 5 9s5-3 5-9"/><path d="M5 20.5c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"/><path d="M9 16.5v2M12 16v2.5M15 16.5v2"/>' },
    { id: 'infantil', nome: 'Infantil', palavras: ['infantil', 'crian', 'kids', 'menino', 'baby'],
      d: '<circle cx="12" cy="12" r="8.5"/><path d="M8.8 14c1.8 1.7 4.6 1.7 6.4 0M9 9.8h.01M15 9.8h.01"/>' },
    { id: 'freestyle', nome: 'Desenho / Freestyle', palavras: ['freestyle', 'desenho', 'risquinho', 'arte', 'tribal', 'hair tattoo'],
      d: '<path d="M4 17c2-4 4-4 5-1s3 3 4 0 3-6 5-4"/><path d="M15.5 4.5l4 4-6.5 6.5h-4v-4z"/>' },
    { id: 'moicano', nome: 'Moicano', palavras: ['moicano', 'moicano', 'mohawk', 'topete', 'pompadour'],
      d: '<path d="M6 20.5v-7a6 6 0 0 1 12 0v7"/><path d="M9.5 9.5L10.5 3l1.5 4 1.5-4 1 6.5"/>' },
    { id: 'afro', nome: 'Black / Afro', palavras: ['black', 'afro', 'power', 'crespo', 'cacho', 'cachea', 'twist', 'nudred'],
      d: '<circle cx="12" cy="10.5" r="7"/><path d="M8 8.5h.01M11 6.5h.01M14.5 7.5h.01M16 11h.01M9 12h.01M12.5 10.5h.01"/><path d="M9 17.5c.8 2 2 3 3 3s2.2-1 3-3"/>' },
    { id: 'trancas', nome: 'Tranças', palavras: ['tran', 'nagô', 'nago', 'box braid', 'braid'],
      d: '<path d="M9 3c-2 2 2 3 0 5s2 3 0 5 2 3 0 5"/><path d="M15 3c2 2-2 3 0 5s-2 3 0 5-2 3 0 5"/><path d="M8 20.5h2M14 20.5h2"/>' },
    { id: 'dread', nome: 'Dreads', palavras: ['dread', 'locs', 'rasta'],
      d: '<path d="M6 4v12a1.5 1.5 0 0 0 3 0V4M10.5 4v14a1.5 1.5 0 0 0 3 0V4M15 4v12a1.5 1.5 0 0 0 3 0V4"/>' },
    { id: 'penteado', nome: 'Penteado', palavras: ['penteado', 'escova', 'finaliza', 'modelagem'],
      d: '<path d="M4 9.5c3-5 13-5 16 0"/><path d="M6 9.5v8M9 9v9M12 8.8V19M15 9v9M18 9.5v8"/>' },

    // ---- barba ----
    { id: 'barba', nome: 'Barba', palavras: ['barba', 'beard', 'barboterapia'],
      d: '<path d="M5 6v3.5a7 7 0 0 0 14 0V6"/><path d="M9 13.5c1.8 1 4.2 1 6 0M8.5 18.5c2.2 1.6 4.8 1.6 7 0"/>' },
    { id: 'bigode', nome: 'Bigode', palavras: ['bigode', 'cavanhaque', 'mustache'],
      d: '<path d="M12 12c-2-3-5.5-3-7.5-1-1 1 0 3 2 2.5 2-.5 3.5-1 5.5-1.5 2 .5 3.5 1 5.5 1.5 2 .5 3-1.5 2-2.5-2-2-5.5-2-7.5 1z"/>' },
    { id: 'toalha', nome: 'Toalha quente', palavras: ['toalha', 'vapor', 'ozonio', 'ozônio', 'spa'],
      d: '<rect x="4" y="11" width="16" height="9" rx="2.5"/><path d="M4 15h16"/><path d="M8.5 8c-1-1.5 1-2 0-3.5M12 8c-1-1.5 1-2 0-3.5M15.5 8c-1-1.5 1-2 0-3.5"/>' },
    { id: 'pincel', nome: 'Pincel de barbear', palavras: ['espuma', 'pincel', 'barbear', 'shave'],
      d: '<path d="M8 3.5h8l-1 7H9z"/><rect x="9" y="10.5" width="6" height="3" rx="1"/><path d="M10 13.5l-.5 7h5l-.5-7"/>' },
    { id: 'combo', nome: 'Combo', palavras: ['+', 'combo', 'completo', 'pacote', 'e barba'],
      d: '<circle cx="6.5" cy="17" r="2.6"/><circle cx="13.5" cy="17" r="2.6"/><path d="M8.4 15l7-10M11.6 15l-7-10M16.5 9.5h5M19 7v5"/>' },

    // ---- química / cor ----
    { id: 'luzes', nome: 'Luzes / Platinado', palavras: ['luz', 'luzes', 'platin', 'nevou', 'reflexo', 'mechas', 'descolor', 'loiro'],
      d: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/><circle cx="12" cy="12" r="3.5"/>' },
    { id: 'tintura', nome: 'Pigmentação / Cor', palavras: ['pigment', 'tint', 'colora', 'cor ', 'grisalho', 'cobrir branco', 'tonaliz'],
      d: '<path d="M12 3.5c3 4 5.5 7 5.5 10a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-10z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>' },
    { id: 'progressiva', nome: 'Progressiva / Alisamento', palavras: ['progressiv', 'alisa', 'relaxa', 'selagem', 'botox', 'liso'],
      d: '<path d="M5 4v16M9.5 4v16M14 4v16M18.5 4v16"/><path d="M3.5 9h17" stroke-opacity=".5"/>' },
    { id: 'hidratacao', nome: 'Hidratação', palavras: ['hidrata', 'tratamento', 'nutri', 'reconstru', 'cronograma', 'umecta'],
      d: '<path d="M8 3.5c2 3 3.5 5 3.5 7a3.5 3.5 0 0 1-7 0c0-2 1.5-4 3.5-7z"/><path d="M16 10.5c2 3 3.5 5 3.5 7a3.5 3.5 0 0 1-7 0c0-2 1.5-4 3.5-7z"/>' },
    { id: 'lavagem', nome: 'Lavagem', palavras: ['lava', 'shampoo', 'xampu', 'higieniza'],
      d: '<path d="M4 14h16a8 8 0 0 1-16 0z"/><circle cx="9" cy="8" r="1.6"/><circle cx="14" cy="6" r="2.2"/><circle cx="16.5" cy="10.5" r="1.2"/>' },

    // ---- rosto / estética ----
    { id: 'sobrancelha', nome: 'Sobrancelha', palavras: ['sobrancelha', 'brow'],
      d: '<path d="M3.5 13c3-4.2 9.5-5.6 17-2.6"/><path d="M6 16.5c2.6-1.6 6.6-2.2 11-1"/>' },
    { id: 'limpeza', nome: 'Limpeza de pele', palavras: ['limpeza de pele', 'pele', 'facial', 'skin', 'máscara', 'mascara', 'black mask', 'cravo'],
      d: '<path d="M12 3.5c-4.5 0-7 3.5-7 8 0 5 3 9 7 9s7-4 7-9c0-4.5-2.5-8-7-8z"/><path d="M9.5 10.5h.01M14.5 10.5h.01M9.5 15c1.4 1 3.6 1 5 0"/><path d="M18.5 3.5l1 1.5M20.5 6.5l-1.5.5"/>' },
    { id: 'depilacao', nome: 'Depilação (nariz/orelha)', palavras: ['depila', 'nariz', 'orelha', 'cera', 'ouvido'],
      d: '<path d="M12 4c-1.5 4-3 7-3 10a3 3 0 0 0 6 0"/><path d="M18 8h3M18 12h3M18 16h3"/>' },
    { id: 'massagem', nome: 'Massagem', palavras: ['massag', 'relax', 'quick massage', 'terapia'],
      d: '<path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V10M10 9.5V5a1.5 1.5 0 0 1 3 0v5M13 10V6.5a1.5 1.5 0 0 1 3 0V12"/><path d="M7 11c-1.5-1-3 0-2 1.5l3.5 5A5 5 0 0 0 12.6 20H14a4 4 0 0 0 4-4v-4"/>' },
    { id: 'olhos', nome: 'Visagismo', palavras: ['visagis', 'consultoria', 'avalia'],
      d: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>' },

    // ---- produtos / extras ----
    { id: 'pomada', nome: 'Pomada', palavras: ['pomada', 'cera modeladora', 'pasta', 'clay', 'argila'],
      d: '<rect x="4" y="9" width="16" height="10" rx="2.5"/><path d="M4 9.5c0-2 3.5-3.5 8-3.5s8 1.5 8 3.5"/><path d="M4 13h16"/>' },
    { id: 'oleo', nome: 'Óleo / Balm', palavras: ['óleo', 'oleo', 'balm', 'tônico', 'tonico', 'minoxidil', 'loção', 'locao'],
      d: '<path d="M10 3h4v3h-4z"/><path d="M9 6h6l1.5 3v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V9z"/><path d="M12 12.5c1 1.4 1.6 2.3 1.6 3a1.6 1.6 0 0 1-3.2 0c0-.7.6-1.6 1.6-3z"/>' },
    { id: 'pente', nome: 'Pente', palavras: ['pente', 'alinhamento'],
      d: '<path d="M3.5 9.5h17v3h-17z"/><path d="M5.5 12.5v5M8.5 12.5v5M11.5 12.5v5M14.5 12.5v5M17.5 12.5v5"/>' },
    { id: 'secador', nome: 'Secador', palavras: ['secador', 'secagem', 'escova'],
      d: '<path d="M4 6.5h9a4 4 0 0 1 0 8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z"/><path d="M9.5 14.5l1.5 6h3l-1-6M17 9h3M17 12h3"/>' },
    { id: 'coroa', nome: 'Premium / VIP', palavras: ['vip', 'premium', 'luxo', 'king', 'rei', 'executivo', 'dia do noivo', 'noivo'],
      d: '<path d="M3.5 8l4 4 4.5-6.5 4.5 6.5 4-4-2 10h-13z"/><path d="M5.5 20.5h13"/>' },
    { id: 'bebida', nome: 'Cerveja / Drink', palavras: ['cerveja', 'drink', 'chopp', 'whisky', 'bebida', 'café', 'cafe'],
      d: '<path d="M5.5 7h10v11a2.5 2.5 0 0 1-2.5 2.5H8A2.5 2.5 0 0 1 5.5 18z"/><path d="M15.5 10h1.5a2.5 2.5 0 0 1 0 5h-1.5M5.5 7c0-2 1.5-3.5 3.5-3.5 1 0 1.5.5 2 1 .5-.5 1.5-1 2.5-1a2.5 2.5 0 0 1 2 3.5"/>' },
    { id: 'relogio', nome: 'Horário especial', palavras: ['domicílio', 'domicilio', 'em casa', 'madrugada', 'fora de hora', 'urgente', 'encaixe'],
      d: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>' },
    { id: 'presente', nome: 'Vale-presente', palavras: ['presente', 'gift', 'vale', 'cartão presente'],
      d: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18M12 9v11M12 9c-1-3-5-4-5-1.5S10.5 9 12 9zm0 0c1-3 5-4 5-1.5S13.5 9 12 9z"/>' },
    { id: 'assinatura', nome: 'Plano mensal', palavras: ['plano', 'mensal', 'assinatura', 'clube', 'pacote mensal'],
      d: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M8.5 14.5l2.3 2.3 4.7-4.8"/>' },
    { id: 'estrela', nome: 'Destaque', palavras: [],
      d: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>' }
  ];
  var porId = {};
  I.forEach(function (x) { porId[x.id] = x; });
  function norm(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); }
  // escolhe um ícone pelo nome do serviço. Combos ("corte + barba") ganham o ícone de combo.
  function sugerir(nome) {
    var n = ' ' + norm(nome) + ' ';
    if (/\+| e barba|combo|completo/.test(n) && /barba|corte|sobrancelha/.test(n)) return 'combo';
    var melhor = null, tam = 0;
    I.forEach(function (x) {
      x.palavras.forEach(function (p) { var q = norm(p); if (q && n.indexOf(q) >= 0 && q.length > tam) { melhor = x.id; tam = q.length; } });
    });
    return melhor || 'estrela';
  }
  function svg(id, cls, titulo) {
    var x = porId[id] || porId.estrela;
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24"' + (titulo ? ' role="img" aria-label="' + String(titulo).replace(/"/g, '') + '"' : ' aria-hidden="true"') + '>' + x.d + '</svg>';
  }
  w.AEGO_ICONES = { lista: I, porId: porId, sugerir: sugerir, svg: svg, existe: function (id) { return !!porId[id]; } };
})(window);
