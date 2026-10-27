/* =====================================================================
   Modo "dentro del proceso Ágora"
   =====================================================================

   agora.html abre cada herramienta (disc-agora.html, foda.html…) dentro de un
   marco, con ?en=agora en la dirección. Este archivo, cargado en el <head> de
   cada herramienta, hace que la misma página sirva para las dos cosas:

   - Sola (sin ?en=agora): no hace nada. La página se ve y funciona como antes.
   - Dentro de Ágora: esconde lo que ya pone agora.html (barra de arriba,
     encabezado, tarjetas de compartir sueltas, enlaces a otras herramientas),
     le dice a agora.html qué alto tiene para que el marco no lleve barra de
     desplazamiento, y le avisa cuando la persona termina o borra algo.

   Solo habla con una página del mismo sitio. Si el marco lo abre otra página,
   el modo no se activa.                                                    */

(function(){
  var embebido = false;
  try{
    embebido = window.parent !== window &&
      /[?&]en=agora(&|$)/.test(location.search) &&
      window.parent.location.origin === location.origin;   // lanza error si es otro sitio
  }catch(e){ embebido = false; }

  window.AGORA_EMBEBIDO = embebido;
  window.CMB_AGORA = {
    embebido: embebido,
    // evento: 'resultado' | 'borrado' | 'completo' | 'ir'
    avisar: function(evento, datos){
      if(!embebido) return;
      try{ window.parent.postMessage({cmbAgora: evento, datos: datos || {}}, location.origin); }catch(e){}
    }
  };
  // Lo marcado .solo-agora solo aparece dentro del proceso.
  var css = document.createElement('style');
  css.id = 'agora-embebido-css';
  css.textContent = '.solo-agora{display:none;}';
  document.head.appendChild(css);
  if(!embebido) return;

  document.documentElement.classList.add('embebido');
  css.textContent +=
    ' html.embebido .topbar, html.embebido body > header, html.embebido .solo-suelto,' +
    ' html.embebido #compartirDisc, html.embebido #compartirFoda{display:none !important;}' +
    ' html.embebido, html.embebido body{background:transparent !important;}' +
    ' html.embebido main{max-width:none !important;margin:0 !important;padding:0 0 8px !important;}' +
    ' html.embebido .solo-agora{display:block;}';

  /* Alto: lo que mide <main>, no la ventana (la ventana del marco nunca se
     encoge, y el marco se quedaría con espacio vacío). */
  var ultimo = 0;
  function medir(){
    var m = document.querySelector('main') || document.body;
    if(!m) return;
    var h = Math.ceil(m.getBoundingClientRect().bottom + window.scrollY);
    if(Math.abs(h - ultimo) > 1){ ultimo = h; CMB_AGORA.avisar('altura', {h: h}); }
  }
  function vigilar(){
    medir();
    if(window.ResizeObserver){
      var ro = new ResizeObserver(medir);
      ro.observe(document.body);
      var m = document.querySelector('main'); if(m) ro.observe(m);
    }
    window.addEventListener('load', medir);
    setTimeout(medir, 300); setTimeout(medir, 1200);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', vigilar);
  else vigilar();

  /* Las herramientas suben al inicio con window.scrollTo. Dentro del marco eso
     no movería nada: se le pide a agora.html que suba al inicio del marco. */
  window.scrollTo = function(){ CMB_AGORA.avisar('arriba'); };

  /* Enlaces entre herramientas: en vez de salir del proceso, se abre la fase
     correspondiente. Cualquier otro enlace del sitio se abre en la ventana
     completa, no dentro del marco. */
  var FASE_DE = {'disc.html':'disc', 'disc-agora.html':'disc', 'foda.html':'foda', 'informe.html':'resumen'};
  document.addEventListener('click', function(ev){
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
    if(!a || a.target === '_blank') return;
    var href = a.getAttribute('href') || '';
    if(/^(mailto:|tel:|#)/.test(href)) return;
    var pagina = href.split(/[?#]/)[0].split('/').pop();
    if(FASE_DE[pagina]){ ev.preventDefault(); CMB_AGORA.avisar('ir', {fase: FASE_DE[pagina]}); return; }
    a.target = '_top';
  });
})();
