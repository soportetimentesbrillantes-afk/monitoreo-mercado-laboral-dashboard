/* =====================================================================
   Compartir con el Club — DISC y FODA
   =====================================================================

   Las herramientas de autoconocimiento funcionan completas sin mandar nada a
   ningún lado. Esto agrega UNA opción, al final, para que la persona decida
   compartir su resultado con el Club y un orientador le dé seguimiento.

   Reglas que no se rompen:
   - La casilla empieza SIN marcar. Nada se envía si la persona no la marca y
     toca el botón. No hay envío automático, ni al terminar ni al escribir.
   - Quien no comparte usa la herramienta exactamente igual.
   - Se dice qué se envía, a quién, para qué y cómo pedir que se borre.

   Lo recibe un Apps Script ligado a la hoja interna "Autoconocimiento DISC y
   FODA (uso interno)" (cuentas/apps-script-autoconocimiento.gs). Mientras
   COMPARTIR_ENDPOINT esté vacío, la opción no aparece y las páginas se
   comportan como antes.

   La CLAVE está a la vista: no es un secreto, es un filtro de ruido. El
   script solo sabe escribir; nadie puede leer la hoja a través de él.
   ===================================================================== */

const COMPARTIR = (function(){

// Para las pruebas automáticas se puede apuntar a un servidor falso con
// window.__CMB_ENDPOINT_PRUEBA; en el sitio real esa variable no existe.
const COMPARTIR_ENDPOINT = (typeof window !== 'undefined' && window.__CMB_ENDPOINT_PRUEBA) || '';
const CLAVE = 'cmb-autoconocimiento-2026';
const CORREO_CLUB = 'clubmentesbrillantesla@gmail.com';

function esc(v){
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function leer(llave){ try{ return JSON.parse(localStorage.getItem(llave) || 'null'); }catch(e){ return null; } }
function escribirLS(llave, v){ try{ localStorage.setItem(llave, JSON.stringify(v)); }catch(e){} }

function nuevoId(){
  const a = new Uint8Array(12);
  (window.crypto || window.msCrypto).getRandomValues(a);
  return Array.from(a, b => b.toString(16).padStart(2, '0')).join('');
}

/* Un identificador por navegador, para que el FODA corregido actualice su
   fila en vez de duplicarla. No identifica a la persona: es un número al azar
   que vive solo en este dispositivo. */
function dispositivo(){
  let d = leer('cmb_dispositivo');
  if(!d || typeof d !== 'string'){ d = nuevoId(); escribirLS('cmb_dispositivo', d); }
  return d;
}

/* Nombre y correo para prellenar: lo último que la persona escribió aquí, o
   el nombre que ya puso en su FODA o en su informe. Nunca se envían solos. */
function contactoPrevio(){
  const c = leer('cmb_contacto') || {};
  const foda = leer('cmb_foda') || {};
  const informe = leer('cmb_informe') || {};
  return { nombre: c.nombre || foda.nombre || informe.nombre || '', correo: c.correo || '' };
}

function activo(){ return !!COMPARTIR_ENDPOINT; }

const TEXTO = {
  disc: 'tu nombre, tu correo, tus puntajes y tus respuestas del cuestionario',
  foda: 'tu nombre, tu correo y lo que escribiste en los cuatro cuadros y en tu siguiente paso'
};

/* Dibuja la tarjeta dentro de `contenedor`.
   opciones.tipo      'disc' | 'foda'
   opciones.datos()   devuelve lo que se manda (sin nombre ni correo)
   opciones.id()      id del envío; el mismo id actualiza la misma fila     */
function pintar(contenedor, opciones){
  if(!contenedor) return;
  if(!activo()){ contenedor.innerHTML = ''; contenedor.style.display = 'none'; return; }
  const o = opciones || {};
  const previo = contactoPrevio();
  const ya = (leer('cmb_compartido') || {})[o.tipo];
  const u = 'cc' + Math.random().toString(36).slice(2, 7);   // ids únicos por tarjeta

  contenedor.style.display = '';
  contenedor.innerHTML =
    '<div class="card compartir">' +
      '<h2>Compartir con el Club <span class="opcional">(opcional)</span></h2>' +
      '<p>Si quieres que un orientador del Club te dé seguimiento, puedes mandarnos ' + TEXTO[o.tipo] + '. ' +
      'Se guardan en una hoja interna del Club, solo para orientarte: no se publican, no se comparten con empresas y no se usan para descartarte de nada. ' +
      'Si no lo compartes, la herramienta te sirve igual.</p>' +
      '<div class="compartir-campos">' +
        '<div><label for="' + u + 'n">Nombre</label><input type="text" id="' + u + 'n" autocomplete="name" value="' + esc(previo.nombre) + '"></div>' +
        '<div><label for="' + u + 'c">Correo</label><input type="email" id="' + u + 'c" autocomplete="email" inputmode="email" value="' + esc(previo.correo) + '"></div>' +
      '</div>' +
      '<label class="compartir-acepta"><input type="checkbox" id="' + u + 'a">' +
        '<span>Acepto compartir estos datos con el Club de Mentes Brillantes para recibir orientación, según el <a href="aviso-privacidad.html" target="_blank" rel="noopener">Aviso de Privacidad</a>.</span></label>' +
      '<button class="secondary" type="button" id="' + u + 'b" disabled>Enviar al Club</button>' +
      '<p class="note" id="' + u + 'e" aria-live="polite">' +
        (ya ? 'Ya compartiste esto el ' + esc(ya.fecha) + '. Si lo vuelves a enviar, se actualiza.' : '') + '</p>' +
      '<p class="note">Para pedir que lo borremos, escribe a <a href="mailto:' + CORREO_CLUB + '">' + CORREO_CLUB + '</a>.</p>' +
    '</div>';

  const $ = s => contenedor.querySelector('#' + u + s);
  const valido = () => {
    const n = $('n').value.trim(), c = $('c').value.trim();
    return $('a').checked && n.length >= 2 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
  };
  const refrescar = () => { $('b').disabled = !valido(); };
  ['n', 'c', 'a'].forEach(s => $(s).addEventListener('input', refrescar));
  $('a').addEventListener('change', refrescar);

  $('b').onclick = async () => {
    if(!valido()) return;
    const estado = $('e');
    const nombre = $('n').value.trim(), correo = $('c').value.trim();
    $('b').disabled = true; estado.textContent = 'Enviando…';
    const cuerpo = Object.assign({}, o.datos ? o.datos() : {}, {
      clave: CLAVE, acepta: true, tipo: o.tipo, id: o.id ? o.id() : nuevoId(),
      nombre, correo, dispositivo: dispositivo()
    });
    try{
      // Texto plano a propósito: así el navegador no hace la petición previa
      // (preflight), que Apps Script no sabe contestar.
      const r = await fetch(COMPARTIR_ENDPOINT, {
        method: 'POST', headers: {'content-type': 'text/plain;charset=utf-8'}, body: JSON.stringify(cuerpo)
      });
      const d = await r.json();
      if(!d || !d.ok) throw new Error((d && d.error) || 'respuesta inesperada');
      escribirLS('cmb_contacto', {nombre, correo});
      const hechos = leer('cmb_compartido') || {};
      const fecha = (window.DISC && DISC.fechaLegible) ? DISC.fechaLegible() : new Date().toLocaleDateString('es-MX');
      hechos[o.tipo] = {fecha, id: cuerpo.id};
      escribirLS('cmb_compartido', hechos);
      estado.textContent = 'Listo: el Club recibió tus respuestas. Gracias.';
      $('a').checked = false; refrescar();
    }catch(err){
      estado.textContent = 'No se pudo enviar ahora. Revisa tu conexión e intenta otra vez; tus respuestas siguen guardadas en este dispositivo.';
      refrescar();
    }
  };
}

const CSS = `
  .compartir .opcional{font-family:var(--font-sans);font-size:.8rem;font-weight:600;color:var(--texto-suave);}
  .compartir-campos{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0;}
  .compartir label{display:block;font-size:.8rem;font-weight:700;color:var(--texto-suave);margin-bottom:4px;}
  .compartir input[type=text], .compartir input[type=email]{width:100%;padding:10px 12px;border:1px solid var(--gris-borde);border-radius:10px;font-family:var(--font-sans);font-size:.93rem;background:#fff;color:var(--texto);}
  .compartir input:focus{outline:2px solid var(--gold-light);border-color:var(--azul);}
  .compartir label.compartir-acepta{display:flex;gap:10px;align-items:flex-start;font-weight:400;font-size:.88rem;color:var(--texto);line-height:1.45;margin:6px 0 4px;cursor:pointer;}
  .compartir label.compartir-acepta input{width:20px;height:20px;flex:none;margin-top:1px;accent-color:var(--azul-osc);}
  .compartir label.compartir-acepta a{color:var(--azul-osc);}
  .compartir button:disabled{opacity:.45;cursor:not-allowed;}
  @media(max-width:600px){ .compartir-campos{grid-template-columns:1fr;} }
`;
(function(){
  if(typeof document === 'undefined' || document.getElementById('compartir-css')) return;
  const s = document.createElement('style'); s.id = 'compartir-css'; s.textContent = CSS;
  document.head.appendChild(s);
})();

/* Envío genérico para otras páginas (el proceso DIANA). Mismo endpoint, misma
   clave, misma regla: quien llama es responsable de no mandar nada sin
   consentimiento; el Apps Script vuelve a revisar acepta === true. */
async function enviar(cuerpo){
  if(!activo()) return {ok:false, error:'sin endpoint'};
  const r = await fetch(COMPARTIR_ENDPOINT, {
    method: 'POST', headers: {'content-type': 'text/plain;charset=utf-8'},
    body: JSON.stringify(Object.assign({clave: CLAVE, dispositivo: dispositivo()}, cuerpo))
  });
  return r.json();
}

return {activo, pintar, nuevoId, enviar, dispositivo, ENDPOINT: COMPARTIR_ENDPOINT};
})();
