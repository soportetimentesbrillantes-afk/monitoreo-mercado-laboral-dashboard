/* =====================================================================
   Perfil DISC de una postulación (disc-agora.html?postulacion=<token>)

   El postulante llega aquí desde el correo de la bolsa de trabajo. Arriba se
   le dice para qué vacante es; al terminar, el resultado se manda a esa
   postulación SOLO cuando toca "Enviar a la empresa". Ya aceptó al
   postularse que su DISC llegue a la empresa; el botón hace visible el
   momento en que sale de su navegador.

   La empresa lo ve como información sobre su estilo de trabajo: no entra al
   filtro ni a los duelos de la comparación, y no cambia el ranking.
   ===================================================================== */
const POSTULACION_DISC = (function(){
  const token = (new URLSearchParams(location.search).get('postulacion') || '').trim();
  if(!/^[a-f0-9]{30,48}$/.test(token) || typeof BOLSA === 'undefined') return null;
  const esc = BOLSA.esc;
  let info = null, cont = null, registro = null, estado = '';

  function aviso(){
    const intro = document.getElementById('intro');
    if(!intro) return;
    let a = document.getElementById('avisoPostulacion');
    if(!a){ a = document.createElement('div'); a.id = 'avisoPostulacion'; a.className = 'aviso limites'; intro.insertBefore(a, intro.firstChild); }
    a.innerHTML = info
      ? '<strong>Perfil DISC para tu postulación' + (info.puesto ? ' a ' + esc(info.puesto) : '') + (info.empresa ? ' en ' + esc(info.empresa) : '') + '.</strong> ' +
        (info.discHecho ? 'Ya enviaste tu resultado; si lo vuelves a contestar, puedes mandar el nuevo.' : 'Al terminar, toca «Enviar a la empresa». No hay respuestas buenas ni malas: la empresa lo usa para conocer tu estilo de trabajo, no para descartarte.')
      : (estado || 'Revisando tu postulación…');
  }
  async function cargar(){
    let r; try{ r = await BOLSA.api('postulacion-info', {token}); }catch(e){ r = {ok: false, error: 'red'}; }
    if(r.ok) info = r; else estado = BOLSA.mensaje(r.error);
    aviso(); pintarTarjeta();
  }
  function pintarTarjeta(){
    if(!cont) return;
    if(!info){ cont.innerHTML = estado ? '<div class="card"><p class="note">' + esc(estado) + '</p></div>' : ''; return; }
    cont.innerHTML = '<div class="card"><h2>Enviar a la empresa</h2>' +
      '<p>Tu resultado va a tu postulación' + (info.puesto ? ' a <strong>' + esc(info.puesto) + '</strong>' : '') + (info.empresa ? ' en ' + esc(info.empresa) : '') + ': tus puntajes, tu estilo dominante y tus respuestas. ' +
      'La empresa lo ve como información sobre cómo te gusta trabajar; no se usa para descartarte.</p>' +
      '<button class="primary" type="button" id="btnEnviarPost">' + (info.discHecho ? 'Enviar este resultado (reemplaza el anterior)' : 'Enviar a la empresa') + '</button>' +
      '<p class="note" id="msgEnviarPost" aria-live="polite"></p></div>';
    const b = document.getElementById('btnEnviarPost'), m = document.getElementById('msgEnviarPost');
    b.onclick = async () => {
      const disc = registro && registro();
      if(!disc || !disc.puntajes){ m.textContent = 'Todavía no hay un resultado para enviar.'; return; }
      b.disabled = true; m.textContent = 'Enviando…';
      let r; try{ r = await BOLSA.api('postulacion-disc', {token, disc}); }catch(e){ r = {ok: false, error: 'red'}; }
      b.disabled = false;
      if(r.ok){ info.discHecho = true; m.textContent = 'Listo: la empresa ya tiene tu Perfil DISC. Gracias.'; b.textContent = 'Enviar de nuevo'; aviso(); }
      else m.textContent = BOLSA.mensaje(r.error);
    };
  }
  document.addEventListener('DOMContentLoaded', () => { aviso(); cargar(); });
  return {
    /* La llama disc-interpretacion.js al pintar el resultado. */
    pintar(contenedor, fn){ cont = contenedor; registro = fn; pintarTarjeta(); }
  };
})();
