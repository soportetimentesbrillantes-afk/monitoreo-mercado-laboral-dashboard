/* =====================================================================
   Guardar en mi cuenta — DISC y FODA
   =====================================================================

   Si la persona tiene sesión en su cuenta del Club (la misma de index.html:
   código por correo, token en localStorage 'cmb_sesion'), al final del DISC y
   del FODA aparece "Guardar en mi cuenta". Lo guardado se ve después en el
   centro de control (mi-centro.html), desde cualquier dispositivo.

   Reglas:
   - Nada se guarda solo: la persona toca el botón. Es su cuenta, pero sigue
     siendo un dato que sale del navegador.
   - Sin sesión, la tarjeta invita a entrar y no manda nada.
   - El mismo id actualiza el mismo registro (el FODA corregido); un DISC
     contestado otra vez trae id nuevo y queda como otro registro del historial.

   Habla con el Worker de cuentas (cuentas/worker-cuentas.js):
   POST /cuenta/registro y POST /cuenta/registro/borrar.
   ===================================================================== */

const REGISTROS = (function(){

const BASE = (typeof window !== 'undefined' && window.__CMB_CUENTA_PRUEBA) ||
  'https://cv-analisis.soportetimentesbrillantes.workers.dev';
const LLAVE_SESION = 'cmb_sesion';
const LLAVE_GUARDADOS = 'cmb_registros_guardados';

function esc(v){
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function leer(llave){ try{ return JSON.parse(localStorage.getItem(llave) || 'null'); }catch(e){ return null; } }
function escribir(llave, v){ try{ localStorage.setItem(llave, JSON.stringify(v)); }catch(e){} }

function sesion(){
  const s = leer(LLAVE_SESION);
  return s && s.token ? s : null;
}

async function api(ruta, cuerpo){
  const s = sesion();
  if(!s) throw new Error('sin sesión');
  const r = await fetch(BASE + ruta, {
    method: cuerpo ? 'POST' : 'GET',
    headers: Object.assign({authorization: 'Bearer ' + s.token}, cuerpo ? {'content-type': 'application/json'} : {}),
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  let d = {};
  try{ d = await r.json(); }catch(e){}
  // Sesión vencida: se olvida, igual que en index.html, para que la persona
  // vea "Entrar" en vez de un botón que falla siempre.
  if(r.status === 401){ try{ localStorage.removeItem(LLAVE_SESION); }catch(e){} const err = new Error('sesion'); err.sesion = true; throw err; }
  if(!r.ok || !d.ok) throw new Error((d && d.error) || ('El servicio respondió ' + r.status));
  return d;
}

function hoyLegible(){ return new Date().toLocaleDateString('es-MX', {day:'numeric', month:'long', year:'numeric'}); }

/* Dibuja la tarjeta dentro de `contenedor`.
   opciones.tipo        'disc' | 'foda'
   opciones.registro()  {id, titulo, resumen, datos}: lo que se guarda        */
function pintar(contenedor, opciones){
  if(!contenedor) return;
  const o = opciones || {};
  const s = sesion();
  const nombre = s && s.usuario ? (s.usuario.nombre || s.usuario.correo || '') : '';
  const que = o.tipo === 'disc' ? 'tu Perfil DISC' : 'tu FODA';
  contenedor.style.display = '';

  if(!s){
    contenedor.innerHTML =
      '<div class="card cuenta-reg">' +
        '<h2>Guárdalo en tu cuenta</h2>' +
        '<p>Con una cuenta del Club guardas ' + que + ' y lo vuelves a ver cuando quieras, desde cualquier dispositivo, en tu <a href="mi-centro.html">centro de control</a>. ' +
        'Entras con un código que llega a tu correo; no hay contraseñas.</p>' +
        '<a class="secondary" href="index.html?entrar=1">Entrar o crear mi cuenta</a>' +
        '<p class="note">Tu resultado sigue guardado en este dispositivo. Cuando entres, regresa a esta página y guárdalo.</p>' +
      '</div>';
    return;
  }

  const u = 'cr' + Math.random().toString(36).slice(2, 7);
  const r0 = o.registro ? o.registro() : null;
  const previo = r0 ? (leer(LLAVE_GUARDADOS) || {})[r0.id] : null;
  contenedor.innerHTML =
    '<div class="card cuenta-reg">' +
      '<h2>Guardar en mi cuenta</h2>' +
      '<p>' + (nombre ? esc(nombre) + ', guarda ' : 'Guarda ') + que + ' en tu cuenta para verlo después en tu <a href="mi-centro.html">centro de control</a>, junto con tus registros anteriores. ' +
      'Solo tú lo ves ahí; no se comparte con empresas.</p>' +
      '<button class="primary" type="button" id="' + u + 'b">' + (previo ? 'Actualizar en mi cuenta' : 'Guardar en mi cuenta') + '</button> ' +
      '<a class="secondary" href="mi-centro.html">Ver mi centro de control</a>' +
      '<p class="note" id="' + u + 'e" aria-live="polite">' + (previo ? 'Ya lo guardaste el ' + esc(previo) + '. Si cambiaste algo, actualízalo.' : '') + '</p>' +
    '</div>';

  const btn = contenedor.querySelector('#' + u + 'b'), est = contenedor.querySelector('#' + u + 'e');
  btn.onclick = async () => {
    const r = o.registro ? o.registro() : null;
    if(!r || !r.id){ est.textContent = 'Todavía no hay un resultado para guardar.'; return; }
    btn.disabled = true; est.textContent = 'Guardando…';
    try{
      const d = await api('/cuenta/registro', {registro: Object.assign({tipo: o.tipo}, r)});
      const g = leer(LLAVE_GUARDADOS) || {}; g[r.id] = hoyLegible(); escribir(LLAVE_GUARDADOS, g);
      est.innerHTML = (d.actualizado ? 'Actualizado en tu cuenta.' : 'Guardado en tu cuenta.') + ' <a href="mi-centro.html">Verlo en mi centro de control →</a>';
      btn.textContent = 'Actualizar en mi cuenta';
    }catch(err){
      if(err.sesion){ pintar(contenedor, o); return; }
      est.textContent = 'No se pudo guardar ahora. Revisa tu conexión e intenta otra vez; tu resultado sigue en este dispositivo.';
    }
    btn.disabled = false;
  };
}

const CSS = `
  .cuenta-reg .note a{color:var(--azul-osc);}
  .cuenta-reg button:disabled{opacity:.45;cursor:not-allowed;}
`;
(function(){
  if(typeof document === 'undefined' || document.getElementById('cuenta-reg-css')) return;
  const st = document.createElement('style'); st.id = 'cuenta-reg-css'; st.textContent = CSS;
  document.head.appendChild(st);
})();

return {pintar, sesion, api, esc, BASE};
})();
