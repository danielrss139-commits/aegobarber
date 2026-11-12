/* AEGO Barber · tema claro/escuro persistente */
(function(){
  'use strict';
  var KEY='aego_barber_theme';
  var root=document.documentElement;
  function aplicar(theme){
    theme=theme==='dark'?'dark':'light';
    root.setAttribute('data-theme',theme);
    try{localStorage.setItem(KEY,theme);}catch(e){}
    document.querySelectorAll('[data-theme-toggle]').forEach(function(btn){
      var dark=theme==='dark';
      btn.setAttribute('aria-label',dark?'Ativar tema claro':'Ativar tema escuro');
      btn.setAttribute('title',dark?'Tema escuro ativo · alternar para claro':'Tema claro ativo · alternar para escuro');
      btn.innerHTML=dark
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 15.2A8.5 8.5 0 0 1 8.8 3.8 8.7 8.7 0 1 0 20.2 15.2Z"/></svg>';
    });
  }
  var saved='light';try{saved=localStorage.getItem(KEY)||'light';}catch(e){}
  aplicar(saved);
  document.addEventListener('click',function(e){
    var btn=e.target.closest('[data-theme-toggle]');if(!btn)return;
    root.classList.add('tema-troca');
    aplicar(root.getAttribute('data-theme')==='dark'?'light':'dark');
    setTimeout(function(){root.classList.remove('tema-troca');},420);
  });
})();