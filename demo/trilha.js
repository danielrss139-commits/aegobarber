/* Trilha de etapas do agendamento: linha que vai se preenchendo e cartões que entram ao rolar. Só transform/opacity. */
(function () {
  var t = document.getElementById('trilha'); if (!t) return;
  var ids = ['s1', 's2', 's3', 's4'], passos = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var fill = document.getElementById('trilhaFill'), reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  passos.forEach(function (s, i) {
    var n = document.createElement('span'); n.className = 'trilha-n num'; n.setAttribute('aria-hidden', 'true');
    n.textContent = ('0' + (i + 1)).slice(-2); s.insertBefore(n, s.firstChild);
  });
  var raf = 0;
  function atualizar() {
    raf = 0;
    var atual = 0;
    for (var i = 0; i < passos.length; i++) { if (passos[i].classList.contains('is-done')) atual = Math.min(i + 1, passos.length - 1); else break; }
    passos.forEach(function (s, i) { s.classList.toggle('is-atual', i === atual && !s.classList.contains('is-locked')); s.classList.toggle('is-passou', i < atual || s.classList.contains('is-done')); });
    var h = t.offsetHeight || 1, alvo = passos[atual].querySelector('.trilha-n');
    var y = alvo ? (passos[atual].offsetTop + alvo.offsetTop + alvo.offsetHeight / 2) : 0;
    fill.style.transform = 'scaleY(' + Math.max(0, Math.min(1, y / h)).toFixed(4) + ')';
  }
  function pedir() { if (!raf) raf = requestAnimationFrame(atualizar); }
  var mo = new MutationObserver(pedir);
  passos.forEach(function (s) { mo.observe(s, { attributes: true, attributeFilter: ['class'] }); });
  window.addEventListener('resize', pedir, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(pedir).observe(t);
  // entrada dos cartões ao rolar (uma vez só)
  if (!reduz && 'IntersectionObserver' in window) {
    passos.forEach(function (s) { s.classList.add('tr-esconde'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('tr-entra'); e.target.classList.remove('tr-esconde'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
    passos.forEach(function (s) { io.observe(s); });
  }
  pedir(); setTimeout(pedir, 600);
})();
