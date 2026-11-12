/* =====================================================================
   AEGO · Produto 3D (pomadas, ceras, potes, latas, frascos)
   ---------------------------------------------------------------------
   Sem biblioteca externa (respeita o CSP do site): o modelo 3D é um cilindro em CSS 3D
   texturizado com as fotos que o barbeiro tirou no painel.

   1) P3D.montar(fotos, caixas)  -> no PAINEL, depois das fotos:
        fotos = { frente, direita, verso, esquerda, topo, base }  (File, Blob ou dataURL; frente e topo bastam)
        caixas = { frente:[ymin,xmin,ymax,xmax] ... } em 0–1000 (opcional; vem da IA e ajuda a recortar)
      Remove o fundo liso (folha branca, bancada), recorta o produto, "desenrola" a lateral de cada foto
      (corrige a curvatura do cilindro) e junta tudo numa faixa de 360°. Resolve:
        { lateral: dataURL, topo: dataURL, proporcao: altura/diametro, cor: '#rrggbb', capa: dataURL }
      Esse objeto é salvo junto do produto (campo modelo3d) — o cliente não reprocessa nada.

   2) P3D.criar(elemento, modelo3d, opcoes) -> no SITE e no PAINEL, mostra o modelo:
        opcoes = { auto: true (gira sozinho), arrastar: true, inclinacao: -16, faces: 40 }
      Devolve { angulo(graus), inclinar(graus), destruir() }.
   ===================================================================== */
(function (w) {
  'use strict';
  var d = document;

  /* ---------- carregar imagem (File, Blob ou URL) ---------- */
  function carregar(src) {
    return new Promise(function (ok, erro) {
      if (!src) return ok(null);
      var url = src, revogar = false;
      if (typeof Blob !== 'undefined' && src instanceof Blob) { url = URL.createObjectURL(src); revogar = true; }
      var im = new Image();
      im.decoding = 'async';
      im.onload = function () { if (revogar) URL.revokeObjectURL(url); ok(im); };
      im.onerror = function () { if (revogar) URL.revokeObjectURL(url); erro(new Error('imagem')); };
      im.src = url;
    });
  }
  function canvas(wd, ht) { var c = d.createElement('canvas'); c.width = Math.max(1, Math.round(wd)); c.height = Math.max(1, Math.round(ht)); return c; }
  // reduz para no máximo `max` px no lado maior (celular tira foto de 12 MP)
  function reduzir(im, max) {
    var k = Math.min(1, max / Math.max(im.naturalWidth || im.width, im.naturalHeight || im.height));
    var c = canvas((im.naturalWidth || im.width) * k, (im.naturalHeight || im.height) * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return c;
  }
  // foto -> JPEG em base64 pequeno (para mandar à IA e guardar miniaturas)
  function comprimir(src, max, q, tipo) {
    return carregar(src).then(function (im) {
      if (!im) return '';
      var c = reduzir(im, max || 1024);
      try { var u = c.toDataURL(tipo || 'image/webp', q || .82); if (u.indexOf('data:image/webp') === 0 || tipo) return u; } catch (e) {}
      return c.toDataURL('image/jpeg', q || .82);
    });
  }

  /* ---------- remover fundo liso (inunda a partir das bordas) ----------
     Funciona bem com foto em fundo de cor única (folha, parede, bancada). Se a borda não for uniforme, não mexe. */
  function removerFundo(c) {
    var ctx = c.getContext('2d'), W = c.width, H = c.height, img = ctx.getImageData(0, 0, W, H), p = img.data;
    var amostras = [], i, x, y;
    for (x = 0; x < W; x += Math.max(1, W >> 5)) { amostras.push(x * 4); amostras.push(((H - 1) * W + x) * 4); }
    for (y = 0; y < H; y += Math.max(1, H >> 5)) { amostras.push((y * W) * 4); amostras.push((y * W + W - 1) * 4); }
    // já tem transparência (recorte pronto)? então nada a fazer
    var transp = 0, tot = 0;
    for (i = 3; i < p.length; i += 4 * 37) { tot++; if (p[i] < 20) transp++; }
    if (transp > tot * .03) return c;   // a imagem já vem recortada (PNG/WebP com transparência)
    var mr = 0, mg = 0, mb = 0;
    amostras.forEach(function (k) { mr += p[k]; mg += p[k + 1]; mb += p[k + 2]; });
    mr /= amostras.length; mg /= amostras.length; mb /= amostras.length;
    var desvio = 0;
    amostras.forEach(function (k) { desvio += Math.abs(p[k] - mr) + Math.abs(p[k + 1] - mg) + Math.abs(p[k + 2] - mb); });
    desvio /= amostras.length;
    if (desvio > 60) return c;   // fundo bagunçado: melhor não arriscar
    var tol = 38 + desvio * 1.2, vis = new Uint8Array(W * H), fila = new Int32Array(W * H), ini = 0, fim = 0;
    function perto(k) { return Math.abs(p[k] - mr) + Math.abs(p[k + 1] - mg) + Math.abs(p[k + 2] - mb) < tol * 1.6; }
    function por(n) { if (!vis[n] && perto(n * 4)) { vis[n] = 1; fila[fim++] = n; } }
    for (x = 0; x < W; x++) { por(x); por((H - 1) * W + x); }
    for (y = 0; y < H; y++) { por(y * W); por(y * W + W - 1); }
    while (ini < fim) {
      var n = fila[ini++], nx = n % W, ny = (n - nx) / W;
      if (nx > 0) por(n - 1); if (nx < W - 1) por(n + 1); if (ny > 0) por(n - W); if (ny < H - 1) por(n + W);
    }
    for (i = 0; i < W * H; i++) if (vis[i]) p[i * 4 + 3] = 0;
    // borda suave (1px) para não ficar serrilhado
    for (i = W; i < W * H - W; i++) if (!vis[i] && (vis[i - 1] || vis[i + 1] || vis[i - W] || vis[i + W])) p[i * 4 + 3] = 150;
    ctx.putImageData(img, 0, 0);
    return c;
  }
  // caixa do que não é transparente
  function caixaAlfa(c) {
    var ctx = c.getContext('2d'), W = c.width, H = c.height, p = ctx.getImageData(0, 0, W, H).data;
    var x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (var y = 0; y < H; y += 2) for (var x = 0; x < W; x += 2) {
      if (p[(y * W + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return [0, 0, W, H];
    return [x0, y0, Math.min(W, x1 + 2), Math.min(H, y1 + 2)];
  }
  function recortar(c, cx) {
    var o = canvas(cx[2] - cx[0], cx[3] - cx[1]);
    o.getContext('2d').drawImage(c, cx[0], cx[1], o.width, o.height, 0, 0, o.width, o.height);
    return o;
  }
  // caixa da IA [ymin,xmin,ymax,xmax] 0–1000 -> recorte com folga de 3%
  function preRecorte(c, bx) {
    if (!bx || bx.length !== 4) return c;
    var W = c.width, H = c.height, f = .03;
    var x0 = Math.max(0, (bx[1] / 1000 - f) * W), y0 = Math.max(0, (bx[0] / 1000 - f) * H);
    var x1 = Math.min(W, (bx[3] / 1000 + f) * W), y1 = Math.min(H, (bx[2] / 1000 + f) * H);
    if (x1 - x0 < W * .15 || y1 - y0 < H * .15) return c;
    return recortar(c, [x0, y0, x1, y1]);
  }
  function prepararFoto(src, bx) {
    return carregar(src).then(function (im) {
      if (!im) return null;
      var c = preRecorte(reduzir(im, 900), bx);
      c = removerFundo(c);
      return recortar(c, caixaAlfa(c));
    });
  }

  /* ---------- desenrolar a lateral ----------
     Numa foto de frente, a coluna x do cilindro corresponde a sen(θ). Para cada coluna da textura (θ entre -arco/2 e +arco/2)
     lemos a coluna x = (sen θ + 1)/2 · largura. Assim o rótulo fica reto, sem "esticar" nas bordas. */
  function desenrolar(foto, arcoGraus, largOut, altOut) {
    var o = canvas(largOut, altOut), ctx = o.getContext('2d'), meio = arcoGraus / 2 * Math.PI / 180;
    // topo e base de cada coluna (a borda de cima/baixo do pote aparece curva na foto): cada coluna é esticada
    // para a altura toda, o que "achata" a curva e evita buracos transparentes na faixa
    var W = foto.width, H = foto.height, px = foto.getContext('2d').getImageData(0, 0, W, H).data, topo = new Int16Array(W), base = new Int16Array(W);
    for (var x = 0; x < W; x++) {
      var t = 0, b = H - 1;
      while (t < H - 1 && px[(t * W + x) * 4 + 3] < 90) t++;
      while (b > t && px[(b * W + x) * 4 + 3] < 90) b--;
      topo[x] = t; base[x] = b;
    }
    // suaviza (mediana móvel): borda de foto real é ruidosa e deixaria a faixa "serrilhada"
    function mediana(arr) {
      var r = Math.max(2, Math.round(W * .06)), out = new Int16Array(W), jan = [];
      for (var i = 0; i < W; i++) {
        jan.length = 0;
        for (var k = Math.max(0, i - r); k <= Math.min(W - 1, i + r); k += 2) jan.push(arr[k]);
        jan.sort(function (a, b) { return a - b; }); out[i] = jan[jan.length >> 1];
      }
      return out;
    }
    topo = mediana(topo); base = mediana(base);
    var ct = topo[W >> 1], cb = base[W >> 1];
    for (x = 0; x < W; x++) { topo[x] = Math.min(topo[x], ct + H * .12); base[x] = Math.max(base[x], cb - H * .12); }
    for (var u = 0; u < o.width; u++) {
      var ang = -meio + (u + .5) / o.width * 2 * meio, sx = Math.max(0, Math.min(W - 1, Math.floor((Math.sin(ang) + 1) / 2 * W)));
      var t2 = topo[sx], b2 = base[sx];
      if (b2 - t2 < H * .4) { t2 = 0; b2 = H - 1; }
      ctx.drawImage(foto, sx, t2, 1, b2 - t2 + 1, u, 0, 1, altOut);
    }
    return o;
  }
  function suavizarBordas(c, f) {
    var x = c.getContext('2d'), g = x.createLinearGradient(0, 0, c.width, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(f, '#000'); g.addColorStop(1 - f, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); x.globalCompositeOperation = 'source-over';
    return c;
  }
  function corMedia(c, fator) {
    var t = canvas(8, 8), x = t.getContext('2d'); x.drawImage(c, 0, 0, 8, 8);
    var p = x.getImageData(0, 0, 8, 8).data, r = 0, g = 0, b = 0, n = 0;
    for (var i = 0; i < p.length; i += 4) if (p[i + 3] > 100) { r += p[i]; g += p[i + 1]; b += p[i + 2]; n++; }
    if (!n) return '#333333';
    function h(v) { v = Math.round(v / n * (fator || .7)); return (v < 16 ? '0' : '') + v.toString(16); }   // escurece p/ a base
    return '#' + h(r) + h(g) + h(b);
  }
  function webp(c, q) { var u = c.toDataURL('image/webp', q || .8); return u.indexOf('data:image/webp') === 0 ? u : c.toDataURL('image/jpeg', q || .85); }

  function montar(fotos, caixas) {
    fotos = fotos || {}; caixas = caixas || {};
    var lados = ['frente', 'direita', 'verso', 'esquerda'];
    return Promise.all(lados.map(function (k) { return prepararFoto(fotos[k], caixas[k]); })
      .concat([prepararFoto(fotos.topo, caixas.topo)])).then(function (r) {
      var lat = r.slice(0, 4), topo = r[4];
      var tem = lat.filter(Boolean);
      if (!tem.length && !topo) throw new Error('Envie pelo menos a foto de frente.');
      var ref = lat[0] || tem[0];
      var proporcao = ref ? Math.max(.18, Math.min(3.2, ref.height / ref.width)) : .5;
      var ALT = 300, LARG = Math.round(ALT / proporcao * Math.PI);   // faixa de 360°: perímetro = π·diâmetro
      LARG = Math.max(600, Math.min(2048, LARG));
      var faixa = canvas(LARG, ALT), fx = faixa.getContext('2d');
      fx.fillStyle = corMedia(ref, 1); fx.fillRect(0, 0, LARG, ALT);   // fundo com a cor do pote (tapa qualquer fresta)
      if (tem.length >= 4 || (lat[0] && lat[2])) {
        // 4 lados (ou frente+verso): cada foto cobre 90° (ou 180°)
        var quarto = tem.length >= 4;
        lados.forEach(function (k, i) {
          var f = lat[i] || (quarto ? null : (i === 1 ? lat[0] : i === 3 ? lat[2] : null));
          if (!quarto && (i === 1 || i === 3)) return;
          if (!f) return;
          var arco = quarto ? 90 : 180, wseg = LARG * arco / 360;
          var x = quarto ? i * wseg - wseg / 2 : (i === 0 ? -wseg / 2 : wseg / 2);
          var seg = desenrolar(f, quarto ? 96 : 150, wseg, ALT);
          fx.drawImage(seg, x, 0); if (x < 0) fx.drawImage(seg, x + LARG, 0);
        });
      } else {
        // só a frente (ou poucos lados): repete o rótulo em volta, como na maioria das latas
        // cada cópia fica 20% mais larga e se funde com a vizinha (bordas em degradê), sem emenda dura
        var fr = ref, wl = LARG / 2 * 1.2, seg2 = suavizarBordas(desenrolar(fr, 150, wl, ALT), .1);
        [0, LARG / 2, LARG].forEach(function (cx) { fx.drawImage(seg2, cx - wl / 2, 0); });
      }
      // tampa: recorte redondo e centralizado
      var tampa = null;
      if (topo) {
        var lado = Math.min(topo.width, topo.height), tc = canvas(420, 420), tx = tc.getContext('2d');
        tx.beginPath(); tx.arc(210, 210, 210, 0, Math.PI * 2); tx.clip();
        tx.drawImage(topo, (topo.width - lado) / 2, (topo.height - lado) / 2, lado, lado, 0, 0, 420, 420);
        tampa = webp(tc, .82);
      }
      var capa = ref ? (function () { var c = canvas(Math.min(640, ref.width), Math.min(640, ref.width) * ref.height / ref.width); c.getContext('2d').drawImage(ref, 0, 0, c.width, c.height); return c.toDataURL('image/webp', .82); })() : tampa;
      return { lateral: webp(faixa, .8), topo: tampa, proporcao: Math.round(proporcao * 1000) / 1000, cor: corMedia(faixa), capa: capa, versao: 1 };
    });
  }

  /* ---------- visualizador (CSS 3D) ---------- */
  var reduz = !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches);
  function urlOk(u) { return typeof u === 'string' && (/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(u) || /^[\w\-./]+\.(webp|jpe?g|png)$/i.test(u)); }

  function criar(el, m, o) {
    o = o || {};
    if (!el || !m || !urlOk(m.lateral)) { if (el) el.innerHTML = ''; return { angulo: function () {}, inclinar: function () {}, destruir: function () {} }; }
    var N = o.faces || 40, prop = Math.max(.18, Math.min(3.2, Number(m.proporcao) || .5));
    el.classList.add('p3d');
    el.innerHTML = '<div class="p3d-cena"><div class="p3d-obj"></div></div><div class="p3d-sombra"></div>';
    var cena = el.firstChild, obj = cena.firstChild, faces = [], topoEl = null, baseEl = null;
    var estado = { a: o.angulo || -25, t: o.inclinacao != null ? o.inclinacao : -16, va: 0, auto: o.auto !== false && !reduz, arrastando: false, vivo: true, ultimo: 0 };

    function medir() {
      var W = el.clientWidth || 240, Hc = el.clientHeight || 240;
      // diâmetro que cabe na caixa considerando altura do objeto e a tampa inclinada
      var D = Math.min(W * .62, (Hc * .78) / (prop + .35));
      return { D: D, H: D * prop };
    }
    function construir() {
      var t = medir(), D = t.D, H = t.H, fw = Math.PI * D / N + .9, r = D / 2;
      obj.innerHTML = ''; faces = [];
      obj.style.width = D + 'px'; obj.style.height = H + 'px';
      for (var i = 0; i < N; i++) {
        var f = d.createElement('div'); f.className = 'p3d-f';
        f.style.width = fw + 'px'; f.style.height = H + 'px';
        f.style.left = (D - fw) / 2 + 'px';
        f.style.backgroundImage = 'url("' + m.lateral + '")';
        f.style.backgroundSize = (Math.PI * D) + 'px ' + H + 'px';
        f.style.backgroundPosition = (-(i * Math.PI * D / N)) + 'px 0';
        f.style.transform = 'rotateY(' + (i * 360 / N) + 'deg) translateZ(' + (r - .4) + 'px)';
        obj.appendChild(f); faces.push(f);
      }
      topoEl = d.createElement('div'); topoEl.className = 'p3d-topo';
      topoEl.style.width = topoEl.style.height = D + 'px';
      topoEl.style.top = (H / 2 - r) + 'px';
      if (urlOk(m.topo)) topoEl.style.backgroundImage = 'url("' + m.topo + '")'; else topoEl.style.background = m.cor || '#222';
      topoEl.style.transform = 'rotateX(90deg) translateZ(' + (H / 2) + 'px)';
      baseEl = d.createElement('div'); baseEl.className = 'p3d-base';
      baseEl.style.width = baseEl.style.height = D + 'px'; baseEl.style.top = (H / 2 - r) + 'px';
      baseEl.style.background = /^#[0-9a-f]{6}$/i.test(m.cor || '') ? m.cor : '#222';
      baseEl.style.transform = 'rotateX(-90deg) translateZ(' + (H / 2) + 'px)';
      obj.appendChild(topoEl); obj.appendChild(baseEl);
      el.style.setProperty('--p3d-d', D + 'px'); el.style.setProperty('--p3d-h', H + 'px');
      ultA = null; pintar();
    }
    // luz fixa na cena: cada face clareia/escurece conforme gira (parece volume de verdade)
    var ultA = null, ultT = null;
    function pintar() {
      if (estado.a === ultA && estado.t === ultT) return;
      ultA = estado.a; ultT = estado.t;
      obj.style.transform = 'rotateX(' + estado.t + 'deg) rotateY(' + estado.a + 'deg)';
      for (var i = 0; i < faces.length; i++) {
        var ang = (i * 360 / N + estado.a) * Math.PI / 180, c = Math.cos(ang - .55);
        var luz = .5 + .55 * Math.max(0, c) + .12 * Math.pow(Math.max(0, Math.cos(ang - .35)), 24);
        var fl = 'brightness(' + luz.toFixed(2) + ')';
        if (faces[i]._fl !== fl) { faces[i]._fl = fl; faces[i].style.filter = fl; }
      }
      if (topoEl) topoEl.style.filter = 'brightness(' + (1.02 + estado.t / -200).toFixed(3) + ')';
    }
    function quadro(ts) {
      if (!estado.vivo) return;
      var dt = estado.ultimo ? Math.min(50, ts - estado.ultimo) : 16; estado.ultimo = ts;
      if (!estado.arrastando) {
        if (Math.abs(estado.va) > .01) { estado.a += estado.va; estado.va *= .94; }
        else if (estado.auto && !d.hidden) estado.a += dt * .022;
      }
      pintar();
      raf = requestAnimationFrame(quadro);
    }
    var raf = 0;
    if (o.arrastar !== false) {
      var x0 = 0, y0 = 0, a0 = 0, t0 = 0, lx = 0;
      el.style.touchAction = 'pan-y';
      el.addEventListener('pointerdown', function (e) {
        estado.arrastando = true; estado.va = 0; x0 = lx = e.clientX; y0 = e.clientY; a0 = estado.a; t0 = estado.t;
        try { el.setPointerCapture(e.pointerId); } catch (er) {}
        el.classList.add('is-arrastando');
      });
      el.addEventListener('pointermove', function (e) {
        if (!estado.arrastando) return;
        estado.a = a0 + (e.clientX - x0) * .6;
        estado.t = Math.max(-60, Math.min(20, t0 - (e.clientY - y0) * .25));
        estado.va = (e.clientX - lx) * .6; lx = e.clientX;
        if (o.estatico) pintar();
      });
      function solta() { estado.arrastando = false; el.classList.remove('is-arrastando'); }
      el.addEventListener('pointerup', solta); el.addEventListener('pointercancel', solta);
    }
    construir();
    var ro = w.ResizeObserver ? new ResizeObserver(function () { construir(); }) : null;
    if (ro) ro.observe(el);
    if (!o.estatico) raf = requestAnimationFrame(quadro);
    return {
      angulo: function (g) { estado.a = g; estado.auto = false; if (o.estatico) pintar(); },
      inclinar: function (g) { estado.t = g; if (o.estatico) pintar(); },
      girar: function (liga) { estado.auto = !!liga && !reduz; },
      destruir: function () { estado.vivo = false; cancelAnimationFrame(raf); if (ro) ro.disconnect(); el.innerHTML = ''; el.classList.remove('p3d'); }
    };
  }

  w.P3D = { montar: montar, criar: criar, comprimir: comprimir, carregar: carregar, urlOk: urlOk };
})(window);
