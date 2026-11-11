/* AEGO Barber · pacote de ícones de navegação, traço uniforme */
(function(){
 'use strict';
 var icons={
  inicio:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  agenda:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/>',
  clientes:'<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  produtos:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="M3 8v9l9 5 9-5V8M12 13v9"/>',
  fin:'<path d="M3 21h18M6 17V9M12 17V4M18 17v-6"/>',
  aj:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>'
 };
 function draw(el,key){
  if(!icons[key])return;
  var svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('class','ui-icon');svg.setAttribute('aria-hidden','true');
  svg.innerHTML=icons[key];
  var old=el.querySelector('svg');if(old)old.replaceWith(svg);else el.insertBefore(svg,el.firstChild);
 }
 function apply(){
  document.querySelectorAll('.side-nav .side-i[data-v], .nav .tab[data-v]').forEach(function(el){draw(el,el.getAttribute('data-v'));});
  var a=document.querySelector('.top-aj');if(a)draw(a,'aj');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();