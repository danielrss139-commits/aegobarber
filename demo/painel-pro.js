/* =====================================================================
   AEGO · Painel profissional (complemento do painel.js)
   ---------------------------------------------------------------------
   - Início: indicadores do mês (com comparação), próximos clientes, gráfico 14 dias, serviços do mês, alertas.
   - Agenda: faixa da semana + "Novo agendamento" feito pelo barbeiro.
   - Clientes: histórico montado a partir dos agendamentos (fiéis, sumidos, novos) com atalho de WhatsApp.
   - Produtos: vitrine com IA (fotos -> identificação -> descrição/preço -> modelo 3D), estoque e vendas.
   - Ajustes: escolher o ícone de cada serviço (pack em icones.js) e testar a IA.
   Tudo que vem do banco ou da IA é escapado (esc) antes de ir para a tela.
   ===================================================================== */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var P = window.PAINEL;
  if (!P || !window.DB || !window.JC) return;
  var U = DB.util, esc = P.esc, st = P.st, LJ = JC.loja;
  var cache = { produtos: [] };

  function n2(v) { return Math.round(v * 100) / 100; }
  function pct(a, b) { if (!b) return null; return Math.round((a - b) / b * 100); }   // sem base no mês passado: não mostra %
  function primeiroDoMes(iso) { return iso.slice(0, 8) + '01'; }
  function mesAnterior(iso) { var d = U.parseISO(iso); d.setDate(1); d.setMonth(d.getMonth() - 1); return U.iso ? U.iso(d) : d.toISOString().slice(0, 10); }
  function mesmoDiaMesAnterior(iso) { var d = U.parseISO(iso), dia = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() - 1); var ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(dia, ult)); return U.iso(d); }
  function soma(l, f) { return l.reduce(function (s, x) { return s + Number(f ? f(x) : x.valor || 0); }, 0); }
  function ehProduto(c) { return c.categoria === 'produto'; }
  function svg(d, vb) { return '<svg viewBox="' + (vb || '0 0 20 20') + '" aria-hidden="true">' + d + '</svg>'; }
  var ICO = {
    zap: '<path class="wa-bubble" d="M20.2 11.7a8.2 8.2 0 0 1-12.1 7.2L3.5 20l1.1-4.4A8.2 8.2 0 1 1 20.2 11.7Z"/><path class="wa-phone" d="M8.1 7.7c.3-.6.6-.6 1-.6h.5c.2 0 .4.2.5.4l.8 1.8c.1.2 0 .4-.1.6l-.7.8c.7 1.4 1.7 2.4 3.1 3.1l.8-.7c.2-.2.4-.2.6-.1l1.8.8c.3.1.4.3.4.6v.5c0 .4-.1.7-.6 1-1 .5-2.8.1-5-1.8-2.1-1.9-3.5-4.8-3.1-6.4Z"/>',
    caixa: '<rect x="3.5" y="8" width="13" height="9" rx="2"/><path d="M3.5 8.5c0-1.8 2.9-3 6.5-3s6.5 1.2 6.5 3M3.5 12h13"/>',
    alerta: '<path d="M10 3.5l7.5 13h-15z"/><path d="M10 8.5v3.5M10 14.5h.01"/>',
    user: '<circle cx="10" cy="7" r="3.2"/><path d="M3.5 17c.8-3.4 3.4-5 6.5-5s5.7 1.6 6.5 5"/>',
    relogio: '<circle cx="10" cy="10" r="7"/><path d="M10 6v4l2.8 1.8"/>',
    seta: '<path d="M7.5 4.5L13 10l-5.5 5.5"/>',
    camera: '<path d="M3 6.5h3l1.5-2h5L14 6.5h3v10H3z"/><circle cx="10" cy="11" r="3"/>',
    ok: '<path d="M4.5 10.5l3.5 3.5 7.5-8"/>',
    lapis: '<path d="M4 16l1-4 8-8 3 3-8 8z"/><path d="M11.5 5.5l3 3"/>'
  };

  /* ---------- carregamento único por renderização ---------- */
  function dados() {
    var h = U.hoje(), de = primeiroDoMes(mesAnterior(h)), de14 = U.addDias(h, -13);
    if (de14 < de) de = de14;
    return Promise.all([DB.agendamentos(), DB.cortes(de, h), DB.saidas(de, h), DB.produtos ? DB.produtos() : Promise.resolve([]), DB.config(), DB.servicos()])
      .then(function (r) { cache.produtos = r[3]; badgeEstoque(); return { ags: r[0], cortes: r[1], saidas: r[2], produtos: r[3], cfg: r[4], servicos: r[5] }; });
  }
  function badgeEstoque() {
    var b = $('badgeEstoque'); if (!b) return;
    var n = cache.produtos.filter(function (p) { return p.ativo !== false && (p.estoque || 0) <= (p.estoqueMin || 0); }).length;
    b.textContent = n; b.classList.toggle('hidden', !n);
  }

  /* =================================================================
     INÍCIO
     ================================================================= */
  function sparkline(vals) {
    var max = Math.max.apply(null, vals.concat([1])), w = 100, h = 28;
    var pts = vals.map(function (v, i) { return [i / (vals.length - 1) * w, h - 2 - v / max * (h - 6)]; });
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    return '<svg class="spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><path class="spark-a" d="' + d + ' L100 28 L0 28Z"/><path class="spark-l" d="' + d + '"/></svg>';
  }
  function serie(cortes, dias, filtro) {
    var h = U.hoje(), out = [];
    for (var i = dias - 1; i >= 0; i--) {
      var d = U.addDias(h, -i);
      out.push(soma(cortes.filter(function (c) { return c.data === d && (!filtro || filtro(c)); })));
    }
    return out;
  }
  function kpi(id, rotulo, valor, fmt, delta, spark, ir) {
    var cls = delta == null ? '' : delta >= 0 ? ' up' : ' down';
    return '<button class="kpi lg' + (ir ? '' : ' no-link') + '" type="button"' + (ir ? ' data-v="' + ir + '"' : '') + ' style="--k:' + id + '">' +
      '<span class="kpi-l">' + esc(rotulo) + '</span><span class="kpi-v num" data-kv="' + id + '" data-alvo="' + valor + '" data-fmt="' + fmt + '">0</span>' +
      (delta == null ? '<span class="kpi-d">&nbsp;</span>' : '<span class="kpi-d' + cls + '">' + (delta >= 0 ? '▲ ' : '▼ ') + Math.abs(delta) + '% <small>vs mês passado</small></span>') +
      (spark || '') + '</button>';
  }
  var FMT = { brl: function (v) { return U.brlCurto(Math.round(v)); }, int: String };

  P.views.inicio = function (animar) {
    dados().then(function (D) {
      if (!st.autorizado || st.view !== 'inicio') return;
      var h = U.hoje(), ini = primeiroDoMes(h), iniA = primeiroDoMes(mesAnterior(h)), fimA = mesmoDiaMesAnterior(h);
      var cm = D.cortes.filter(function (c) { return c.data >= ini && c.data <= h; }), ca = D.cortes.filter(function (c) { return c.data >= iniA && c.data <= fimA; });
      var fat = soma(cm), fatA = soma(ca);
      var am = D.ags.filter(function (a) { return a.data >= ini && a.data <= h && a.status === 'atendido'; });
      var aa = D.ags.filter(function (a) { return a.data >= iniA && a.data <= fimA && a.status === 'atendido'; });
      var svcM = soma(am, function (a) { return a.preco; }), svcA = soma(aa, function (a) { return a.preco; });
      var tk = am.length ? svcM / am.length : 0, tkA = aa.length ? svcA / aa.length : 0;
      var pm = cm.filter(ehProduto), pa = ca.filter(ehProduto);
      var un = soma(pm, function (c) { return c.qtd || 1; });
      $('kpis').innerHTML =
        kpi(0, 'Faturamento do mês', Math.round(fat), 'brl', pct(fat, fatA), sparkline(serie(D.cortes, 14)), 'fin') +
        kpi(1, 'Atendimentos', am.length, 'int', pct(am.length, aa.length), sparkline(serie(D.cortes, 14, function (c) { return !ehProduto(c); })), 'agenda') +
        kpi(2, 'Ticket médio', Math.round(tk), 'brl', pct(tk, tkA), null, 'clientes') +
        kpi(3, 'Produtos vendidos', Math.round(soma(pm)), 'brl', pct(soma(pm), soma(pa)), '<span class="kpi-s">' + un + (un === 1 ? ' unidade' : ' unidades') + ' no mês</span>', 'produtos');
      $('kpis').querySelectorAll('[data-kv]').forEach(function (el) {
        P.contar(el, Number(el.dataset.alvo), FMT[el.dataset.fmt], animar ? 0 : null);
      });
      renderProx(D); renderGraf(D); renderTopSvc(D, am); renderAlertas(D);
    }).catch(P.falhaLeitura);
  };

  function renderProx(D) {
    var h = U.hoje(), d = new Date(), agora = d.getHours() * 60 + d.getMinutes(), lim = U.addDias(h, 6);
    var l = D.ags.filter(function (a) { return a.status === 'marcado' && a.data <= lim && (a.data > h || (a.data === h && a.fim > agora)); }).slice(0, 5);
    if (!l.length) { $('proxLista').innerHTML = '<li class="mini-vazio">Nenhum horário marcado para os próximos dias. Que tal divulgar o link de agendamento no seu status?</li>'; return; }
    $('proxLista').innerHTML = l.map(function (a, i) {
      var quando = a.data === h ? (a.inicio <= agora ? 'agora' : 'hoje') : a.data === U.addDias(h, 1) ? 'amanhã' : U.DIAS3[U.parseISO(a.data).getDay()];
      return '<li class="mini' + (i === 0 ? ' is-prox' : '') + '"><span class="mini-h num">' + esc(U.hhmm(a.inicio)) + '<small>' + esc(quando) + '</small></span>' +
        '<span class="mini-ico">' + JC.icone({ id: a.servicoId, nome: a.servicoNome }) + '</span>' +
        '<span class="mini-m"><b>' + esc(a.nome) + '</b><small>' + esc(a.servicoNome) + ' · ' + esc(U.brlCurto(a.preco)) + '</small></span>' +
        '<a class="ibtn ibtn-sm" href="' + esc(P.zapLink(a)) + '" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de ' + esc(a.nome) + '">' + svg(ICO.zap) + '</a></li>';
    }).join('');
  }

  function renderGraf(D) {
    var h = U.hoje(), dias = [], max = 1;
    for (var i = 13; i >= 0; i--) {
      var d = U.addDias(h, -i), l = D.cortes.filter(function (c) { return c.data === d; });
      var s = soma(l.filter(function (c) { return !ehProduto(c); })), p = soma(l.filter(ehProduto));
      dias.push({ d: d, s: s, p: p }); if (s + p > max) max = s + p;
    }
    var box = $('graf14');
    box.innerHTML = '<div class="graf-bars">' + dias.map(function (x, i) {
      var dt = U.parseISO(x.d);
      return '<button class="gb' + (x.d === h ? ' is-hoje' : '') + '" type="button" style="--i:' + i + '" data-txt="' + esc(P.diaCurto(x.d) + ' · ' + U.brlCurto(x.s + x.p) + (x.p ? ' (' + U.brlCurto(x.p) + ' em produtos)' : '')) + '">' +
        '<span class="gb-t"><span class="gb-p" style="height:' + (x.p / max * 100).toFixed(1) + '%"></span><span class="gb-s" style="height:' + (x.s / max * 100).toFixed(1) + '%"></span></span>' +
        '<span class="gb-l">' + (x.d === h ? 'hoje' : dt.getDate()) + '</span></button>';
    }).join('') + '</div><div class="graf-tip" id="grafTip">' + esc(P.diaCurto(h) + ' · ' + U.brlCurto(dias[13].s + dias[13].p)) + '</div>';
  }
  document.addEventListener('pointerover', function (e) { var b = e.target.closest && e.target.closest('.gb'); if (b && $('grafTip')) $('grafTip').textContent = b.dataset.txt; });
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('.gb'); if (b && $('grafTip')) $('grafTip').textContent = b.dataset.txt; });

  function renderTopSvc(D, am) {
    var por = {};
    am.forEach(function (a) { var k = a.servicoNome; por[k] = por[k] || { nome: k, id: a.servicoId, n: 0, v: 0 }; por[k].n++; por[k].v += Number(a.preco) || 0; });
    var l = Object.keys(por).map(function (k) { return por[k]; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 5);
    if (!l.length) { $('topSvc').innerHTML = '<p class="mini-vazio">Os serviços atendidos no mês aparecem aqui.</p>'; return; }
    var max = l[0].v || 1;
    $('topSvc').innerHTML = l.map(function (x, i) {
      return '<div class="tsv" style="--i:' + i + '"><span class="mini-ico">' + JC.icone({ id: x.id, nome: x.nome }) + '</span><div class="tsv-m"><div class="tsv-t"><b>' + esc(x.nome) + '</b><span class="num">' + esc(U.brlCurto(x.v)) + '</span></div>' +
        '<div class="tsv-bar"><span style="width:' + (x.v / max * 100).toFixed(1) + '%"></span></div><small>' + x.n + (x.n === 1 ? ' atendimento' : ' atendimentos') + '</small></div></div>';
    }).join('');
  }

  function renderAlertas(D) {
    var out = [], h = U.hoje();
    D.produtos.filter(function (p) { return p.ativo !== false && (p.estoque || 0) <= (p.estoqueMin || 0); }).forEach(function (p) {
      out.push('<li class="mini al-warn" data-v="produtos"><span class="mini-ico">' + svg(ICO.caixa) + '</span><span class="mini-m"><b>' + esc(p.nome) + '</b><small>' + (p.estoque ? 'Só ' + p.estoque + ' no estoque' : 'Acabou o estoque') + '</small></span><span class="mini-seta">' + svg(ICO.seta) + '</span></li>');
    });
    var sum = clientes(D.ags).filter(function (c) { return c.status === 'sumido'; }).length;
    if (sum) out.push('<li class="mini" data-v="clientes" data-filtro="sumidos"><span class="mini-ico">' + svg(ICO.user) + '</span><span class="mini-m"><b>' + sum + (sum === 1 ? ' cliente sumido' : ' clientes sumidos') + '</b><small>Há mais de 30 dias sem voltar. Mande um oi.</small></span><span class="mini-seta">' + svg(ICO.seta) + '</span></li>');
    var cfg = D.cfg, d = new Date(), agora = d.getHours() * 60 + d.getMinutes();
    if (cfg && !U.diaFechado(h, cfg)) {
      var faixas = D.ags.filter(function (a) { return a.data === h && a.status !== 'faltou' && a.status !== 'cancelado'; }).map(function (a) { return [a.inicio, a.fim]; });
      var livres = U.horariosLivres(h, 30, cfg, faixas, agora).length;
      if (livres) out.push('<li class="mini" data-v="agenda"><span class="mini-ico">' + svg(ICO.relogio) + '</span><span class="mini-m"><b>' + livres + ' horários livres hoje</b><small>Poste o link no status para encher a agenda.</small></span><span class="mini-seta">' + svg(ICO.seta) + '</span></li>');
    }
    $('alertas').innerHTML = out.length ? out.join('') : '<li class="mini-vazio">Tudo em ordem por aqui.</li>';
  }
  document.addEventListener('click', function (e) {
    var li = e.target.closest && e.target.closest('[data-filtro]'); if (!li) return;
    filtroCli = li.dataset.filtro; marcarFiltro();
  });

  /* =================================================================
     AGENDA: faixa da semana + novo agendamento
     ================================================================= */
  P.semana = function () {
    var box = $('semana'); if (!box) return;
    var base = U.parseISO(st.dia), dow = (base.getDay() + 6) % 7, seg = U.addDias(st.dia, -dow);
    DB.agendamentos().then(function (ags) {
      var html = '<div class="sem-h"><span class="eyebrow">Semana</span></div><div class="sem-d">';
      for (var i = 0; i < 7; i++) {
        var d = U.addDias(seg, i), n = ags.filter(function (a) { return a.data === d && a.status !== 'faltou' && a.status !== 'cancelado'; }).length;
        var dt = U.parseISO(d);
        html += '<button class="sem-b' + (d === st.dia ? ' is-on' : '') + (d === U.hoje() ? ' is-hoje' : '') + '" type="button" data-dia="' + d + '"><span>' + U.DIAS3[dt.getDay()] + '</span><b class="num">' + dt.getDate() + '</b><i>' + (n ? n : '·') + '</i></button>';
      }
      box.innerHTML = html + '</div>';
    }).catch(P.falhaLeitura);
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.sem-b'); if (!b) return;
    st.dir = b.dataset.dia > st.dia ? 1 : -1; st.dia = b.dataset.dia; st.animar = true; P.renderAgenda(); P.semana();
  });
  ['diaAnt', 'diaProx', 'irHoje'].forEach(function (id) { $(id).addEventListener('click', function () { setTimeout(P.semana, 0); }); });

  var nAg = { svc: null, ini: null, servicos: [] };
  function abrirNovoAg() {
    nAg = { svc: null, ini: null, servicos: [] };
    $('nAgNome').value = ''; $('nAgTel').value = ''; $('nAgMsg').classList.add('hidden');
    $('nAgData').value = st.dia >= U.hoje() ? st.dia : U.hoje(); $('nAgData').min = U.hoje();
    $('nAgSlots').innerHTML = '<p class="small muted">Escolha o serviço.</p>';
    Promise.all([DB.servicos(), DB.agendamentos()]).then(function (r) {
      nAg.servicos = r[0].filter(function (s) { return s.ativo !== false; });
      $('nAgSvc').innerHTML = nAg.servicos.map(function (s) { return '<button class="chip" type="button" data-id="' + esc(s.id) + '">' + JC.icone(s, 'ico-chip') + esc(s.nome) + '</button>'; }).join('');
      var vistos = {};
      $('dlClientes').innerHTML = r[1].filter(function (a) { var k = a.nome + a.telefone; if (vistos[k]) return false; vistos[k] = 1; return true; })
        .slice(-200).map(function (a) { return '<option value="' + esc(a.nome) + '" data-tel="' + esc(a.telefone || '') + '">'; }).join('');
    }).catch(P.falhaLeitura);
    P.abrirFolha('shAg');
    setTimeout(function () { $('nAgNome').focus(); }, 350);
  }
  $('nAgNome').addEventListener('change', function () {
    var v = this.value, o = Array.prototype.filter.call($('dlClientes').options, function (x) { return x.value === v; })[0];
    if (o && !$('nAgTel').value) $('nAgTel').value = o.dataset.tel || '';
  });
  $('nAgSvc').addEventListener('click', function (e) {
    var b = e.target.closest('.chip'); if (!b) return;
    nAg.svc = nAg.servicos.filter(function (s) { return s.id === b.dataset.id; })[0];
    this.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-on', c === b); });
    slotsNovo();
  });
  $('nAgData').addEventListener('change', slotsNovo);
  function slotsNovo() {
    nAg.ini = null;
    var data = $('nAgData').value; if (!nAg.svc || !data) return;
    Promise.all([DB.config(), DB.ocupados(data)]).then(function (r) {
      var d = new Date(), ag = data === U.hoje() ? d.getHours() * 60 + d.getMinutes() : null;
      var l = U.horariosLivres(data, nAg.svc.duracao, r[0], r[1], ag);
      $('nAgSlots').innerHTML = l.length ? l.map(function (m) { return '<button class="slot opt" type="button" data-m="' + m + '">' + U.hhmm(m) + '</button>'; }).join('')
        : '<p class="small muted">' + (U.diaFechado(data, r[0]) ? 'Fechado neste dia.' : 'Sem horário livre neste dia.') + '</p>';
    }).catch(P.falhaLeitura);
  }
  $('nAgSlots').addEventListener('click', function (e) {
    var b = e.target.closest('.slot'); if (!b) return;
    nAg.ini = Number(b.dataset.m);
    this.querySelectorAll('.slot').forEach(function (c) { c.classList.toggle('is-on', c === b); });
  });
  $('nAgSalvar').addEventListener('click', function () {
    var msg = $('nAgMsg'), nome = $('nAgNome').value.trim(), tel = U.soDigitos($('nAgTel').value);
    function erro(t) { msg.textContent = t; msg.classList.remove('hidden'); }
    if (nome.length < 2) return erro('Escreva o nome do cliente.');
    if (!nAg.svc) return erro('Escolha o serviço.');
    if (nAg.ini == null) return erro('Escolha um horário livre.');
    if (tel && (tel.length < 10 || tel.length > 13)) return erro('WhatsApp inválido (com DDD).');
    var bt = this; bt.disabled = true; bt.textContent = 'Agendando…';
    var data = $('nAgData').value;
    DB.criarAgendamento({ nome: nome, telefone: tel || '00000000000', servicoId: nAg.svc.id, servicoNome: nAg.svc.nome, preco: nAg.svc.preco, duracao: nAg.svc.duracao,
      data: data, inicio: nAg.ini, origem: 'painel' }).then(function () {
      P.toast('Agendado: ' + nome.split(' ')[0] + ' · ' + U.hhmm(nAg.ini));
      P.fecharFolhas(); st.dia = data;
      if (st.view !== 'agenda') P.irPara('agenda'); else P.renderTudo(true);
    }, function (err) { erro(JC.msgErro(err)); if (err && err.code === 'ocupado') slotsNovo(); })
      .then(function () { bt.disabled = false; bt.textContent = 'Agendar'; });
  });

  /* =================================================================
     CLIENTES
     ================================================================= */
  var filtroCli = 'todos';
  function clientes(ags) {
    var h = U.hoje(), lim30 = U.addDias(h, -30), por = {};
    ags.forEach(function (a) {
      var tel = U.soDigitos(a.telefone || a.whatsapp).slice(-11), k = tel && !/^0+$/.test(tel) ? tel : 'n:' + String(a.nome).toLowerCase().trim();
      var c = por[k] = por[k] || { k: k, nome: a.nome, telefone: tel, visitas: 0, faltas: 0, gasto: 0, ultima: '', primeira: '', futuro: null, servicos: {} };
      if (a.status === 'atendido') {
        c.visitas++; c.gasto += Number(a.preco) || 0; c.servicos[a.servicoNome] = (c.servicos[a.servicoNome] || 0) + 1;
        if (a.data > c.ultima) { c.ultima = a.data; c.nome = a.nome; }
        if (!c.primeira || a.data < c.primeira) c.primeira = a.data;
      } else if (a.status === 'faltou') c.faltas++;
      else if (a.status === 'marcado' && a.data >= h && (!c.futuro || a.data < c.futuro.data)) c.futuro = a;
    });
    return Object.keys(por).map(function (k) {
      var c = por[k];
      c.preferido = Object.keys(c.servicos).sort(function (a, b) { return c.servicos[b] - c.servicos[a]; })[0] || '';
      c.status = c.visitas >= 3 ? 'fiel' : (c.visitas <= 1 && c.primeira >= lim30) || (!c.visitas && c.futuro) ? 'novo' : 'ativo';
      if (c.ultima && c.ultima < lim30 && !c.futuro) c.status = 'sumido';
      c.dias = c.ultima ? Math.round((U.parseISO(h) - U.parseISO(c.ultima)) / 864e5) : null;
      return c;
    });
  }
  function zapCliente(c) {
    var n = c.telefone; if (!n) return '';
    if (n.length <= 11) n = '55' + n;
    var pn = String(c.nome).split(' ')[0];
    var msg = c.status === 'sumido' ? 'Fala, ' + pn + '! Aqui é da ' + LJ.nome + '. Faz tempo que você não aparece, bora dar um trato no visual? Agenda pelo link: ' + location.origin + location.pathname.replace(/painel\.html.*$/, 'index.html')
      : 'Olá, ' + pn + '! Aqui é da ' + LJ.nome + '.';
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg);
  }
  var ROT = { fiel: 'Fiel', sumido: 'Sumido', novo: 'Novo', ativo: 'Ativo' };
  P.views.clientes = function () {
    DB.agendamentos().then(function (ags) {
      if (st.view !== 'clientes') return;
      var todos = clientes(ags), q = ($('cliBusca').value || '').toLowerCase().trim(), qd = U.soDigitos(q);
      var cont = { fiel: 0, sumido: 0, novo: 0 };
      todos.forEach(function (c) { if (cont[c.status] != null) cont[c.status]++; });
      $('cliResumo').innerHTML = '<div class="cr lg"><b class="num">' + todos.length + '</b><span>clientes nos últimos 90 dias</span></div>' +
        '<div class="cr lg"><b class="num">' + cont.fiel + '</b><span>fiéis (3+ visitas)</span></div>' +
        '<div class="cr lg cr-w"><b class="num">' + cont.sumido + '</b><span>sumidos há 30+ dias</span></div>' +
        '<div class="cr lg"><b class="num">' + cont.novo + '</b><span>novos</span></div>';
      var l = todos.filter(function (c) {
        if (filtroCli === 'fieis' && c.status !== 'fiel') return false;
        if (filtroCli === 'sumidos' && c.status !== 'sumido') return false;
        if (filtroCli === 'novos' && c.status !== 'novo') return false;
        if (q && String(c.nome).toLowerCase().indexOf(q) < 0 && !(qd && c.telefone.indexOf(qd) >= 0)) return false;
        return true;
      }).sort(function (a, b) { return b.gasto - a.gasto || (b.ultima > a.ultima ? 1 : -1); });
      if (!l.length) { $('cliLista').innerHTML = '<div class="empty"><strong>Ninguém por aqui</strong>Mude o filtro ou a busca.</div>'; return; }
      $('cliLista').innerHTML = '<div class="ct ct-h"><span>Cliente</span><span>Visitas</span><span>Gasto</span><span>Última visita</span><span>Status</span><span></span></div>' +
        l.map(function (c, i) {
          var ini = String(c.nome).split(' ').map(function (p) { return p.charAt(0); }).slice(0, 2).join('').toUpperCase();
          var zap = zapCliente(c);
          return '<div class="ct" style="--i:' + Math.min(i, 14) + '"><span class="ct-n"><i class="av">' + esc(ini) + '</i><span><b>' + esc(c.nome) + '</b><small>' + esc(c.preferido || '—') + (c.futuro ? ' · volta ' + esc(P.diaCurto(c.futuro.data)) : '') + '</small></span></span>' +
            '<span class="num" data-l="Visitas">' + c.visitas + (c.faltas ? '<small class="falta"> · ' + c.faltas + ' falta' + (c.faltas > 1 ? 's' : '') + '</small>' : '') + '</span>' +
            '<span class="num" data-l="Gasto">' + esc(U.brlCurto(c.gasto)) + '</span>' +
            '<span data-l="Última">' + (c.ultima ? esc(P.diaCurto(c.ultima)) + '<small> · ' + c.dias + 'd</small>' : '—') + '</span>' +
            '<span><em class="tag tag-' + c.status + '">' + ROT[c.status] + '</em></span>' +
            '<span class="ct-a">' + (zap ? '<a class="btn btn-ghost btn-sm" href="' + esc(zap) + '" target="_blank" rel="noopener noreferrer">' + svg(ICO.zap) + (c.status === 'sumido' ? 'Chamar de volta' : 'WhatsApp') + '</a>' : '') + '</span></div>';
        }).join('');
    }).catch(P.falhaLeitura);
  };
  function marcarFiltro() {
    $('cliFiltros').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-on', c.dataset.f === filtroCli); });
    if (st.view === 'clientes') P.views.clientes();
  }
  $('cliFiltros').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; filtroCli = b.dataset.f; marcarFiltro(); });
  var buscaT; $('cliBusca').addEventListener('input', function () { clearTimeout(buscaT); buscaT = setTimeout(P.views.clientes, 160); });

  /* =================================================================
     PRODUTOS
     ================================================================= */
  var hero3d = null;
  function dots(n) { var o = ''; for (var i = 1; i <= 5; i++) o += '<i class="' + (i <= n ? 'on' : '') + '"></i>'; return '<span class="dots" aria-label="Fixação ' + n + ' de 5">' + o + '</span>'; }
  function capaDe(p) { var m = p.modelo3d || {}; return m.capa || (p.fotos && p.fotos.frente) || ''; }
  P.views.produtos = function (animar) {
    if (!DB.produtos) return;
    Promise.all([DB.produtos(), DB.cortes(primeiroDoMes(U.hoje()), U.hoje())]).then(function (r) {
      if (st.view !== 'produtos') return;
      var l = r[0]; cache.produtos = l; badgeEstoque();
      var vm = r[1].filter(ehProduto);
      var ativos = l.filter(function (p) { return p.ativo !== false; });
      var un = soma(l, function (p) { return p.estoque || 0; }), val = soma(l, function (p) { return (p.estoque || 0) * (p.preco || 0); });
      $('prodStats').innerHTML = '<div class="cr lg"><b class="num">' + ativos.length + '</b><span>no site</span></div>' +
        '<div class="cr lg"><b class="num">' + un + '</b><span>unidades em estoque</span></div>' +
        '<div class="cr lg"><b class="num">' + esc(U.brlCurto(Math.round(val))) + '</b><span>valor em estoque</span></div>' +
        '<div class="cr lg"><b class="num">' + esc(U.brlCurto(Math.round(soma(vm)))) + '</b><span>vendido no mês</span></div>';
      var dest = l.filter(function (p) { return p.destaque && p.modelo3d; })[0] || l.filter(function (p) { return p.modelo3d; })[0];
      if (hero3d) { hero3d.destruir(); hero3d = null; }
      if (dest && window.P3D) hero3d = P3D.criar($('prodHero3d'), dest.modelo3d, { auto: true, inclinacao: -18 });
      if (!l.length) { $('prodGrid').innerHTML = '<div class="empty"><strong>Nenhum produto ainda</strong>Toque em “Novo produto com IA” e fotografe sua primeira pomada.</div>'; return; }
      $('prodGrid').innerHTML = l.map(function (p, i) {
        var baixo = (p.estoque || 0) <= (p.estoqueMin || 0), capa = capaDe(p);
        return '<article class="pc lg' + (p.ativo === false ? ' is-off' : '') + (animar ? ' pc-in' : '') + '" style="--i:' + Math.min(i, 10) + '" data-id="' + esc(p.id) + '">' +
          '<div class="pc-img">' + (P3D && P3D.urlOk(capa) ? '<img src="' + esc(capa) + '" alt="" loading="lazy" decoding="async">' : '<span class="pc-ph">' + AEGO_ICONES.svg('pomada', 'ico-xl') + '</span>') +
          (p.destaque ? '<em class="tag tag-dest">Destaque</em>' : '') + (p.ativo === false ? '<em class="tag">Oculto</em>' : '') + (p.modelo3d ? '<em class="tag tag-3d">3D</em>' : '') + '</div>' +
          '<div class="pc-b"><span class="pc-cat">' + esc([p.marca, p.categoria].filter(Boolean).join(' · ')) + '</span><h3>' + esc(p.nome) + '</h3>' +
          '<div class="pc-meta">' + (p.fixacao ? dots(p.fixacao) : '') + (p.brilho ? '<span>' + esc(p.brilho) + '</span>' : '') + '</div>' +
          '<div class="pc-row"><b class="num">' + esc(U.brl(p.preco)) + '</b><span class="pc-est' + (baixo ? ' is-baixo' : '') + '">' + (p.estoque || 0) + ' em estoque</span></div>' +
          '<div class="pc-acts"><button class="btn btn-primary btn-sm" type="button" data-vender="' + esc(p.id) + '"' + (p.estoque ? '' : ' disabled') + '>Vender</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" data-editar="' + esc(p.id) + '">' + svg(ICO.lapis) + 'Editar</button></div></div></article>';
      }).join('');
    }).catch(P.falhaLeitura);
  };
  P.limpar = function () { if (hero3d) { hero3d.destruir(); hero3d = null; } ['kpis', 'proxLista', 'graf14', 'topSvc', 'alertas', 'cliLista', 'cliResumo', 'prodGrid', 'prodStats', 'semana'].forEach(function (id) { if ($(id)) $(id).innerHTML = ''; }); };
  $('prodGrid').addEventListener('click', function (e) {
    var v = e.target.closest('[data-vender]'), ed = e.target.closest('[data-editar]');
    if (v) return abrirVenda(v.dataset.vender);
    if (ed) return abrirProduto(cache.produtos.filter(function (p) { return p.id === ed.dataset.editar; })[0]);
    var card = e.target.closest('.pc'); if (card && !e.target.closest('button')) abrirProduto(cache.produtos.filter(function (p) { return p.id === card.dataset.id; })[0]);
  });

  /* ---------- assistente: fotos -> IA -> revisar ---------- */
  var LADOS = [
    { k: 'frente', t: 'Frente', obr: true, dica: 'rótulo de frente' },
    { k: 'topo', t: 'Tampa', obr: true, dica: 'de cima, reta' },
    { k: 'direita', t: 'Lado direito', dica: 'gire ¼ de volta' },
    { k: 'verso', t: 'Verso', dica: 'parte de trás' },
    { k: 'esquerda', t: 'Lado esquerdo', dica: 'gire mais ¼' }
  ];
  var pw = null, pw3d = null, ladoAtual = null;
  function novoPw(p) { return { id: p ? p.id : null, base: p || null, fotos: {}, modelo: p ? p.modelo3d || null : null, ia: p ? p.ia || null : null, fix: p ? p.fixacao || 0 : 3, brilho: p ? p.brilho || '' : '' }; }
  function passo(n) {
    [1, 2, 3].forEach(function (i) { $('pw' + i).classList.toggle('hidden', i !== n); });
    $('pwSteps').querySelectorAll('li').forEach(function (li, i) { li.classList.toggle('is-on', i === n - 1); li.classList.toggle('is-feito', i < n - 1); });
    $('shProd').scrollTop = 0;
  }
  function renderFotos() {
    $('pwFotos').innerHTML = LADOS.map(function (l) {
      var f = pw.fotos[l.k];
      return '<button class="pf' + (f ? ' tem' : '') + (l.obr ? ' obr' : '') + '" type="button" data-lado="' + l.k + '">' +
        (f ? '<img src="' + esc(f) + '" alt="">' : '<span class="pf-ico">' + svg(ICO.camera) + '</span>') +
        '<span class="pf-t"><b>' + l.t + (l.obr ? ' *' : '') + '</b><small>' + (f ? 'trocar' : l.dica) + '</small></span>' + (f ? '<span class="pf-ok">' + svg(ICO.ok) + '</span>' : '') + '</button>';
    }).join('');
    $('pwAnalisar').disabled = !(pw.fotos.frente && pw.fotos.topo);
  }
  function abrirProduto(p, manual) {
    pw = novoPw(p);
    if (pw3d) { pw3d.destruir(); pw3d = null; }
    $('shProdT').textContent = p ? 'Editar produto' : 'Novo produto';
    $('pwExcluir').classList.toggle('hidden', !p);
    $('pwMsg').classList.add('hidden');
    P.abrirFolha('shProd');
    if (p || manual) { preencherForm(p || {}); passo(3); mostrar3d(); }
    else { renderFotos(); passo(1); }
  }
  $('shProd').addEventListener('fechou', function () { if (pw3d) { pw3d.destruir(); pw3d = null; } });
  $('pwFotos').addEventListener('click', function (e) {
    var b = e.target.closest('.pf'); if (!b) return;
    ladoAtual = b.dataset.lado; $('pwFile').value = ''; $('pwFile').click();
  });
  $('pwFile').addEventListener('change', function () {
    var f = this.files && this.files[0]; if (!f || !ladoAtual) return;
    P3D.comprimir(f, 1024, .85, 'image/jpeg').then(function (u) { pw.fotos[ladoAtual] = u; renderFotos(); }, function () { P.toast('Não deu para abrir essa foto. Tente outra (JPG ou PNG).'); });
  });
  $('pwVarias').addEventListener('click', function () { $('pwFiles').value = ''; $('pwFiles').click(); });
  $('pwFiles').addEventListener('change', function () {
    var fs = Array.prototype.slice.call(this.files || [], 0, 5);
    var vazios = LADOS.map(function (l) { return l.k; }).filter(function (k) { return !pw.fotos[k]; });
    Promise.all(fs.map(function (f) { return P3D.comprimir(f, 1024, .85, 'image/jpeg'); })).then(function (us) {
      us.forEach(function (u, i) { if (vazios[i]) pw.fotos[vazios[i]] = u; });
      renderFotos();
    });
  });

  function chamarIA(fotos) {
    var tk = ''; try { tk = localStorage.getItem('aego_ia_token') || ''; } catch (e) {}
    var corpo = { fotos: Object.keys(fotos).map(function (k) { return { lado: k, img: fotos[k] }; }) };
    return fetch('/api/identificar-produto', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, tk ? { 'x-painel-token': tk } : {}), body: JSON.stringify(corpo) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, erro: 'sem-funcao' }; }).then(function (j) { if (r.status === 404 || !j || typeof j !== 'object') j = { ok: false, erro: 'sem-funcao' }; return j; }); })
      .catch(function () { return { ok: false, erro: 'rede' }; });
  }
  var MSG_IA = {
    'sem-chave': 'A IA ainda não foi ligada (falta a chave GEMINI_API_KEY na Vercel). O 3D ficou pronto; preencha os dados abaixo.',
    'sem-funcao': 'A função de IA não está publicada neste endereço (ela roda na Vercel). O 3D ficou pronto; preencha os dados abaixo.',
    'token': 'O token do painel não confere. Ajuste em Ajustes > IA dos produtos.',
    'limite': 'A IA atingiu o limite de uso agora. Tente de novo em alguns minutos ou preencha à mão.',
    'rede': 'Sem internet para falar com a IA. Preencha os dados à mão.'
  };
  function etapa(e, estado) { var li = $('scanEtapas').querySelector('[data-e="' + e + '"]'); if (li) { li.classList.remove('is-on', 'is-ok', 'is-x'); if (estado) li.classList.add(estado); } }
  function espera(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  $('pwAnalisar').addEventListener('click', function () {
    passo(2);
    $('scanImg').style.backgroundImage = 'url("' + pw.fotos.frente + '")';
    ['ler', 'id', 'preco', '3d'].forEach(function (e) { etapa(e); });
    etapa('ler', 'is-on');
    var t0 = Date.now();
    var iaP = chamarIA(pw.fotos);
    setTimeout(function () { etapa('ler', 'is-ok'); etapa('id', 'is-on'); }, 1400);
    setTimeout(function () { if (!$('scanEtapas').querySelector('[data-e="id"].is-ok')) etapa('preco', 'is-on'); }, 3200);
    iaP.then(function (r) {
      return espera(Math.max(0, 2600 - (Date.now() - t0))).then(function () {
        etapa('ler', 'is-ok');
        etapa('id', r.ok ? 'is-ok' : 'is-x'); etapa('preco', r.ok ? 'is-ok' : 'is-x'); etapa('3d', 'is-on');
        pw.iaResp = r;
        return P3D.montar(pw.fotos, r.ok ? r.produto.caixas : null).catch(function (e) { console.warn('[3d]', e); return null; });
      });
    }).then(function (modelo) {
      etapa('3d', modelo ? 'is-ok' : 'is-x');
      pw.modelo = modelo;
      var r = pw.iaResp || {}, base = {};
      if (r.ok) {
        var x = r.produto;
        base = { nome: x.nome, marca: x.marca, categoria: x.categoria, fixacao: x.fixacao, brilho: x.brilho, conteudo: x.conteudo, indicacao: x.indicacao,
          descricao: x.descricao, comoUsar: x.comoUsar, preco: x.precoSugerido, estoque: pw.base ? pw.base.estoque : 1 };
        pw.ia = { confianca: x.confianca, modelo: r.modelo, em: Date.now(), faixa: x.faixaPreco, obs: x.observacao, identificado: x.identificado };
      }
      if (pw.base) base = Object.assign({}, pw.base, r.ok ? base : {});
      return espera(500).then(function () {
        preencherForm(base);
        var av = $('pwAviso');
        if (!r.ok) { av.textContent = MSG_IA[r.erro] || 'A IA não conseguiu identificar agora. O 3D ficou pronto; preencha os dados abaixo.'; av.className = 'note aviso-ia'; }
        else if (!r.produto.identificado || r.produto.confianca < .55) { av.textContent = 'A IA não teve certeza deste produto' + (r.produto.observacao ? ' (' + r.produto.observacao + ')' : '') + '. Confira o nome e o preço.'; av.className = 'note aviso-ia'; }
        else av.className = 'note hidden';
        passo(3); mostrar3d();
      });
    });
  });
  function mostrar3d() {
    if (pw3d) { pw3d.destruir(); pw3d = null; }
    var el = $('pw3d');
    if (pw.modelo && window.P3D) { pw3d = P3D.criar(el, pw.modelo, { auto: true }); el.classList.remove('vazio'); }
    else { el.innerHTML = '<span class="pc-ph">' + AEGO_ICONES.svg('pomada', 'ico-xl') + '</span><small>Sem fotos: o site mostra o ícone.</small>'; el.classList.add('vazio'); }
    var b = $('iaBadge');
    if (pw.ia && pw.ia.confianca) { b.innerHTML = '<span class="pulse"></span>IA · ' + Math.round(pw.ia.confianca * 100) + '% de certeza'; b.classList.remove('hidden'); } else b.classList.add('hidden');
  }
  function renderFix() {
    var o = ''; for (var i = 1; i <= 5; i++) o += '<button type="button" class="fx' + (i <= pw.fix ? ' on' : '') + '" data-n="' + i + '" role="radio" aria-checked="' + (i === pw.fix) + '" aria-label="' + i + '"></button>';
    $('fpFix').innerHTML = o + '<span class="fx-t">' + (['', 'Leve', 'Média-leve', 'Média', 'Forte', 'Extra forte'][pw.fix] || '') + '</span>';
  }
  $('fpFix').addEventListener('click', function (e) { var b = e.target.closest('.fx'); if (b) { pw.fix = Number(b.dataset.n); renderFix(); } });
  $('fpBrilho').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; pw.brilho = b.textContent; marcarBrilho(); });
  function marcarBrilho() { $('fpBrilho').querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-on', c.textContent === pw.brilho); }); }
  function setTg(id, on) { $(id).setAttribute('aria-checked', !!on); }
  ['fpAtivo', 'fpDest'].forEach(function (id) { $(id).addEventListener('click', function () { setTg(id, this.getAttribute('aria-checked') !== 'true'); }); });
  function preencherForm(p) {
    $('fpNome').value = p.nome || ''; $('fpMarca').value = p.marca || '';
    var cat = $('fpCat'); cat.value = p.categoria && Array.prototype.some.call(cat.options, function (o) { return o.value === p.categoria; }) ? p.categoria : 'Pomada';
    pw.fix = p.fixacao || pw.fix || 3; renderFix();
    pw.brilho = p.brilho || pw.brilho || ''; marcarBrilho();
    $('fpPreco').value = p.preco ? String(n2(p.preco)).replace('.', ',') : '';
    $('fpEst').value = p.estoque != null ? p.estoque : 1;
    $('fpCont').value = p.conteudo || ''; $('fpDesc').value = p.descricao || ''; $('fpInd').value = p.indicacao || ''; $('fpUso').value = p.comoUsar || '';
    setTg('fpAtivo', p.ativo !== false); setTg('fpDest', !!p.destaque);
    var fx = $('fpFaixa'), f = pw.ia && pw.ia.faixa;
    if (f && f.max) { fx.textContent = 'Faixa de preço no varejo, segundo a IA: ' + U.brl(f.min) + ' a ' + U.brl(f.max) + '. Confira antes de salvar.'; fx.classList.remove('hidden'); } else fx.classList.add('hidden');
    if (!pw.ia) $('pwAviso').className = 'note hidden';
  }
  $('pwRefazer').addEventListener('click', function () {
    if (pw.base && pw.base.fotos) Object.keys(pw.base.fotos).forEach(function (k) { if (!pw.fotos[k] && /^data:/.test(pw.base.fotos[k])) pw.fotos[k] = pw.base.fotos[k]; });
    if (pw3d) { pw3d.destruir(); pw3d = null; }
    renderFotos(); passo(1);
  });
  $('pwSalvar').addEventListener('click', function () {
    var msg = $('pwMsg'); function erro(t) { msg.textContent = t; msg.classList.remove('hidden'); }
    var nome = $('fpNome').value.trim(), preco = P.parseValor($('fpPreco').value), est = parseInt($('fpEst').value, 10);
    if (nome.length < 2) return erro('Dê um nome ao produto.');
    if (!(preco > 0) || preco > 5000) return erro('Preço inválido.');
    if (!(est >= 0) || est > 99999) return erro('Estoque inválido.');
    var bt = this; bt.disabled = true; bt.textContent = 'Salvando…';
    // miniaturas pequenas das fotos (o cliente só precisa do modelo 3D e da capa)
    var fotosP = Promise.all(['frente', 'topo'].map(function (k) { return pw.fotos[k] ? P3D.comprimir(pw.fotos[k], 520, .8) : Promise.resolve(pw.base && pw.base.fotos ? pw.base.fotos[k] || '' : ''); }));
    fotosP.then(function (f) {
      var prod = Object.assign({}, pw.base || {}, {
        id: pw.id || undefined, nome: nome, marca: $('fpMarca').value, categoria: $('fpCat').value, fixacao: pw.fix, brilho: pw.brilho,
        preco: preco, estoque: est, estoqueMin: pw.base ? pw.base.estoqueMin || 2 : 2, conteudo: $('fpCont').value, descricao: $('fpDesc').value,
        indicacao: $('fpInd').value, comoUsar: $('fpUso').value, ativo: $('fpAtivo').getAttribute('aria-checked') === 'true', destaque: $('fpDest').getAttribute('aria-checked') === 'true',
        fotos: { frente: f[0], topo: f[1] }, modelo3d: pw.modelo, ia: pw.ia
      });
      if (!prod.id) delete prod.id;
      if (JSON.stringify(prod).length > 950000) throw Object.assign(new Error('grande'), { code: 'grande' });
      return DB.salvarProduto(prod);
    }).then(function () {
      P.toast(pw.id ? 'Produto atualizado' : 'Produto salvo e publicado no site');
      P.fecharFolhas();
      if (st.view !== 'produtos') P.irPara('produtos'); else P.views.produtos(true);
    }, function (err) {
      erro(err && err.code === 'grande' ? 'As fotos ficaram grandes demais. Tire de mais perto, com menos fundo.' : err && err.code === 'cheio' ? err.message : JC.msgErro(err));
    }).then(function () { bt.disabled = false; bt.textContent = 'Salvar produto'; });
  });
  $('pwExcluir').addEventListener('click', function () {
    if (!pw.id) return;
    var b = this;
    if (b.dataset.conf !== '1') { b.dataset.conf = '1'; b.textContent = 'Toque de novo para excluir'; setTimeout(function () { b.dataset.conf = ''; b.textContent = 'Excluir produto'; }, 3000); return; }
    DB.removerProduto(pw.id).then(function () { P.toast('Produto excluído'); P.fecharFolhas(); P.views.produtos(); }, function (err) { P.toast(JC.msgErro(err)); });
  });

  /* ---------- venda ---------- */
  var venda = null, v3d = null;
  function abrirVenda(id) {
    var p = cache.produtos.filter(function (x) { return x.id === id; })[0]; if (!p) return;
    venda = { p: p, q: 1, forma: 'Pix' };
    $('shVendaT').textContent = p.nome;
    $('vendaEst').textContent = (p.estoque || 0) + ' em estoque · ' + U.brl(p.preco) + ' cada';
    $('vForma').querySelectorAll('.chip').forEach(function (c, i) { c.classList.toggle('is-on', i === 0); });
    if (v3d) v3d.destruir();
    v3d = p.modelo3d ? P3D.criar($('venda3d'), p.modelo3d, { auto: true, arrastar: false }) : null;
    if (!p.modelo3d) $('venda3d').innerHTML = '<span class="pc-ph">' + AEGO_ICONES.svg('pomada', 'ico') + '</span>';
    atuVenda(); P.abrirFolha('shVenda');
  }
  $('shVenda').addEventListener('fechou', function () { if (v3d) { v3d.destruir(); v3d = null; } });
  function atuVenda() { $('vQtd').textContent = venda.q; $('vTotal').textContent = U.brl(venda.p.preco * venda.q); $('vMenos').disabled = venda.q <= 1; $('vMais').disabled = venda.q >= (venda.p.estoque || 0); }
  $('vMenos').addEventListener('click', function () { if (venda.q > 1) { venda.q--; atuVenda(); } });
  $('vMais').addEventListener('click', function () { if (venda.q < (venda.p.estoque || 0)) { venda.q++; atuVenda(); } });
  $('vForma').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (!b) return; venda.forma = b.textContent; this.querySelectorAll('.chip').forEach(function (c) { c.classList.toggle('is-on', c === b); }); });
  $('vConfirmar').addEventListener('click', function () {
    var bt = this; bt.disabled = true; bt.textContent = 'Registrando…';
    DB.venderProduto(venda.p.id, venda.q, venda.forma).then(function (l) {
      P.toast(U.brl(l.valor) + ' no caixa · ' + venda.p.nome); P.fecharFolhas(); P.renderTudo(true);
    }, function (err) { P.toast(err && err.code === 'sem-estoque' ? 'Sem estoque suficiente.' : JC.msgErro(err)); })
      .then(function () { bt.disabled = false; bt.textContent = 'Registrar venda'; });
  });

  /* ---------- botões de ação (topo, cards) ---------- */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-acao]'); if (!b || !st.autorizado) return;
    var a = b.dataset.acao;
    if (a === 'novo-ag') abrirNovoAg();
    else if (a === 'novo-prod') abrirProduto(null);
    else if (a === 'novo-prod-manual') abrirProduto(null, true);
  });

  /* =================================================================
     AJUSTES: ícone do serviço + IA
     ================================================================= */
  var linhaIco = null;
  $('svcEd').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ico]'); if (!b || !window.AEGO_ICONES) return;
    linhaIco = b.closest('.svc-ed');
    var nome = linhaIco.querySelector('[data-k="nome"]').value, atual = linhaIco.dataset.icone || AEGO_ICONES.sugerir(nome), sug = AEGO_ICONES.sugerir(nome);
    $('icoSug').textContent = nome ? 'Sugestão para “' + nome + '”: ' + AEGO_ICONES.porId[sug].nome + '.' : 'Escolha o ícone que aparece para o cliente.';
    $('icoGrade').innerHTML = AEGO_ICONES.lista.map(function (x) {
      return '<button class="ico-b' + (x.id === atual ? ' is-on' : '') + '" type="button" data-id="' + x.id + '">' + AEGO_ICONES.svg(x.id) + '<span>' + esc(x.nome) + '</span></button>';
    }).join('');
    P.abrirFolha('shIco');
  });
  $('icoGrade').addEventListener('click', function (e) {
    var b = e.target.closest('.ico-b'); if (!b || !linhaIco) return;
    linhaIco.dataset.icone = b.dataset.id;
    linhaIco.querySelector('[data-ico]').innerHTML = AEGO_ICONES.svg(b.dataset.id);
    P.fecharFolhas(); P.toast('Ícone trocado. Toque em “Salvar serviços”.');
  });
  // ao digitar o nome de um serviço sem ícone escolhido, o ícone sugerido acompanha
  $('svcEd').addEventListener('input', function (e) {
    var inp = e.target.closest('[data-k="nome"]'); if (!inp || !window.AEGO_ICONES) return;
    var row = inp.closest('.svc-ed'); if (row.dataset.icone) return;
    row.querySelector('[data-ico]').innerHTML = AEGO_ICONES.svg(AEGO_ICONES.sugerir(inp.value));
  });
  try { $('iaToken').value = localStorage.getItem('aego_ia_token') || ''; } catch (e) {}
  $('iaToken').addEventListener('change', function () { try { localStorage.setItem('aego_ia_token', this.value.trim()); } catch (e) {} });
  $('iaTestar').addEventListener('click', function () {
    var bt = this; bt.disabled = true; bt.textContent = 'Testando…';
    chamarIA({}).then(function (r) {
      var t = r.erro === 'sem-fotos' ? 'IA conectada e pronta.' : MSG_IA[r.erro] || 'Não deu certo agora (' + (r.erro || 'erro') + ').';
      $('iaSt').textContent = t; P.toast(t);
    }).then(function () { bt.disabled = false; bt.textContent = 'Testar conexão com a IA'; });
  });

  /* ---------- financeiro: exportar CSV ---------- */
  $('exportCsv').addEventListener('click', function () {
    var h = U.hoje(), de = st.periodo === '7' ? U.addDias(h, -6) : st.periodo === 'mes' ? primeiroDoMes(h) : h;
    Promise.all([DB.cortes(de, h), DB.saidas(de, h)]).then(function (r) {
      var linhas = [['data', 'hora', 'tipo', 'descricao', 'valor']];
      r[0].forEach(function (c) { linhas.push([c.data, c.hora || '', ehProduto(c) ? 'produto' : 'servico', c.descricao, String(c.valor).replace('.', ',')]); });
      r[1].forEach(function (c) { linhas.push([c.data, c.hora || '', 'saida', c.descricao, '-' + String(c.valor).replace('.', ',')]); });
      linhas = [linhas[0]].concat(linhas.slice(1).sort(function (a, b) { return (a[0] + a[1]).localeCompare(b[0] + b[1]); }));
      var csv = '\ufeff' + linhas.map(function (l) { return l.map(function (v) { v = String(v == null ? '' : v); return /[;"\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(';'); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      a.download = 'caixa-' + de + (de !== h ? '_a_' + h : '') + '.csv'; document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }).catch(P.falhaLeitura);
  });
})();
