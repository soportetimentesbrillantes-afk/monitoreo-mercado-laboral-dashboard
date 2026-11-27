/* =====================================================================
   Empleador · Club de Mentes Brillantes (empleador.html)

   La empresa entra con la clave que le dio el Club, ve sus vacantes y abre
   una: de ahí sigue el mismo flujo de Comparación de CVs (comparar-cvs.js en
   "modo empleador"), con dos diferencias:
   - Paso 1: además de la rúbrica, lo que verá el postulante en
     vacantes.html, y el botón para publicar.
   - Paso 2: los CVs no se suben a mano. Llegan de las postulaciones,
     conforme la gente se postula, cada uno con su Perfil DISC cuando lo
     contesta. El nombre se usa para ocultarlo y no se guarda en el CV.
   El DISC es SOLO INFORMATIVO: se muestra junto a cada CV y la IA lo comenta
   en el reporte, pero no entra a los duelos ni cambia el ranking.
   Al final, el contacto de los finalistas se pide aparte y queda registrado.

   Tiene que cargarse ANTES de comparar-cvs.js: define CMB_COMPARAR_MODO.
   ===================================================================== */
(function(){
'use strict';
const LS_CLAVE = 'cmb_bolsa_clave';
const esc = BOLSA.esc;
const $ = s => document.querySelector(s);
const leerLS = k => { try{ return sessionStorage.getItem(k) || localStorage.getItem(k) || ''; }catch(e){ return ''; } };
let clave = leerLS(LS_CLAVE);
let EMP = null, VACS = [], actual = null, POSTS = [], msgEmpresa = '', msgPub = '', msgPost = '', ultimaSync = null, sincronizando = false;
const contactos = {};

const llaveDe = id => 'cmb_empleador_' + id;
const enEmpresa = () => !actual || location.hash === '#empresa';
const C = () => window.CMB_COMPARAR;

/* ---------------- ganchos de comparar-cvs.js ---------------- */
window.CMB_COMPARAR_MODO = {
  arranque(){ return true; },
  listo(){ return !enEmpresa(); },
  trasVacante: pintarPublicacion,
  cvs: pintarPostulaciones,
  trasReporte: pintarContactos
};

/* ---------------- vistas ---------------- */
function mostrar(){
  const e = enEmpresa();
  $('#v-empresa').hidden = !e;
  document.querySelectorAll('nav.pasos a[data-v]:not([data-v="empresa"])').forEach(a => { a.hidden = e; });
  $('#barraVacante').hidden = e;
  if(e){
    document.querySelectorAll('.vista:not(#v-empresa)').forEach(v => { v.hidden = true; });
    document.querySelectorAll('nav.pasos a').forEach(a => a.setAttribute('aria-current', a.dataset.v === 'empresa' ? 'page' : 'false'));
    pintarEmpresa();
  }else{
    $('#barraVacante').innerHTML = '<strong>' + esc((C().estado().vacante.puesto) || 'Vacante nueva') + '</strong> <span class="pill ' + ({abierta: 'ok', pausada: 'warn', cerrada: 'bad'}[actual.estado] || '') + '">' + esc(actual.id ? actual.estado : 'sin publicar') + '</span>' +
      (actual.id ? ' <span class="small muted">' + POSTS.length + ' postulaciones</span>' : '') + ' <a class="btn mini" href="#empresa">← Mis vacantes</a>';
  }
}
window.addEventListener('hashchange', mostrar);   // corre antes que el de comparar-cvs.js

/* ---------------- acceso y lista de vacantes ---------------- */
function pintarEmpresa(){
  const el = $('#v-empresa');
  if(!EMP){
    el.innerHTML = '<form class="banda" id="formClave" style="max-width:520px"><h2>Entrar como empresa</h2>' +
      '<p class="muted small">Escribe la clave que te dio el Club de Mentes Brillantes. Con ella creas tus vacantes y ves a quienes se postulan. Si no tienes clave, escribe a <a href="mailto:clubmentesbrillantesla@gmail.com">clubmentesbrillantesla@gmail.com</a>.</p>' +
      '<div class="campo"><label for="e_clave">Clave de la empresa</label><input id="e_clave" type="password" autocomplete="current-password" value="' + esc(clave) + '" required></div>' +
      '<label class="small"><input type="checkbox" id="e_rec"> Recordarme en este equipo (no lo marques en una computadora compartida)</label>' +
      '<div class="acciones"><button class="btn pri" type="submit">Entrar</button></div><p class="small" id="e_msg">' + esc(msgEmpresa) + '</p></form>';
    $('#formClave').onsubmit = async ev => {
      ev.preventDefault();
      const c = $('#e_clave').value.trim(), m = $('#e_msg');
      m.textContent = 'Revisando…';
      let r; try{ r = await BOLSA.api('empresa-entrar', {clave: c}); }catch(e){ r = {ok: false, error: 'red'}; }
      if(!r.ok){ m.textContent = BOLSA.mensaje(r.error); return; }
      clave = c;
      try{ sessionStorage.setItem(LS_CLAVE, c); if($('#e_rec').checked) localStorage.setItem(LS_CLAVE, c); }catch(e){}
      EMP = r.empresa; VACS = r.vacantes || []; msgEmpresa = ''; pintarEmpresa();
    };
    return;
  }
  el.innerHTML = '<div class="banda"><div class="acciones" style="justify-content:space-between"><div><h2>Vacantes de ' + esc(EMP.nombre) + '</h2>' +
      '<p class="muted small">Las vacantes abiertas aparecen en la <a href="vacantes.html" target="_blank" rel="noopener">bolsa de trabajo del Club</a>. Las postulaciones llegan solas al paso 2 de cada vacante, con el Perfil DISC de cada persona cuando lo contesta.</p></div>' +
      '<div class="acciones"><button class="btn pri" type="button" id="btnNuevaVac">+ Nueva vacante</button><button class="btn" type="button" id="btnSalirEmp">Salir</button></div></div>' +
    (VACS.length ? '<div class="tabla-c"><table><thead><tr><th>Puesto</th><th>Estado</th><th class="c">Postulaciones</th><th class="c">Con DISC</th><th>Actualizada</th><th></th></tr></thead><tbody>' +
      VACS.map(v => '<tr><td><strong>' + esc(v.puesto) + '</strong><div class="small muted">' + esc([v.ciudad, v.modalidad].filter(Boolean).join(' · ')) + '</div></td>' +
        '<td><span class="pill ' + ({abierta: 'ok', pausada: 'warn', cerrada: 'bad'}[v.estado] || '') + '">' + esc(v.estado) + '</span></td><td class="c num">' + v.postulaciones + '</td><td class="c num">' + v.conDisc + '</td><td class="small">' + esc(v.actualizada) + '</td>' +
        '<td><button class="btn mini" type="button" data-abrir-vac="' + esc(v.id) + '">Abrir</button></td></tr>').join('') + '</tbody></table></div>'
      : '<p class="muted">Todavía no tienes vacantes. Crea la primera con <strong>+ Nueva vacante</strong>.</p>') + '</div>';
  $('#btnNuevaVac').onclick = () => abrir({id: '', puesto: '', estado: 'abierta', config: null, temporal: 'nueva-' + Date.now().toString(36)});
  $('#btnSalirEmp').onclick = () => { try{ sessionStorage.removeItem(LS_CLAVE); localStorage.removeItem(LS_CLAVE); }catch(e){} clave = ''; EMP = null; VACS = []; actual = null; pintarEmpresa(); };
  el.querySelectorAll('[data-abrir-vac]').forEach(b => b.onclick = () => abrir(VACS.find(v => v.id === b.dataset.abrirVac)));
}

function abrir(v){
  actual = Object.assign({publico: {ciudad: v.ciudad || '', modalidad: v.modalidad || '', sueldo: v.sueldo || '', sector: v.sector || '', descripcion: v.descripcion || '', requisitos: v.requisitos || '', cierre: v.cierre || ''}}, v);
  POSTS = []; msgPub = ''; msgPost = ''; ultimaSync = null;
  location.hash = '#vacante';
  C().usar(llaveDe(v.id || v.temporal), v.id ? Object.assign({id: v.id}, v.config || {}) : null);
  mostrar();
  if(v.id) sincronizar();
}

/* ---------------- paso 1: publicación ---------------- */
function pintarPublicacion(el){
  const p = actual.publico, S = C().estado();
  const div = document.createElement('div');
  div.className = 'banda'; div.id = 'bandaPublicar';
  div.innerHTML = '<div><h2>Lo que verá el postulante</h2><p class="muted small">Esto aparece en la bolsa de trabajo del Club. La rúbrica, el filtro ATS y el prompt de arriba no se publican: son solo para ti.</p></div>' +
    '<div class="grid2"><div class="campo"><label for="p_ciudad">Ciudad</label><input id="p_ciudad" data-pub="ciudad" value="' + esc(p.ciudad) + '"></div>' +
    '<div class="campo"><label for="p_modalidad">Modalidad</label><select id="p_modalidad" data-pub="modalidad">' + ['', 'Presencial', 'Híbrido', 'Remoto'].map(x => '<option' + (p.modalidad === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div></div>' +
    '<div class="grid2"><div class="campo"><label for="p_sueldo">Sueldo</label><input id="p_sueldo" data-pub="sueldo" value="' + esc(p.sueldo) + '" placeholder="Ej. $14,000 a $16,000 al mes"></div>' +
    '<div class="campo"><label for="p_cierre">Recibe postulaciones hasta (opcional)</label><input id="p_cierre" type="date" data-pub="cierre" value="' + esc(p.cierre) + '"></div></div>' +
    '<div class="campo"><label for="p_desc">Descripción del puesto</label><textarea id="p_desc" data-pub="descripcion" rows="5" placeholder="Qué hará la persona, con quién trabaja, qué ofrece la empresa">' + esc(p.descripcion) + '</textarea></div>' +
    '<div class="campo"><label for="p_req">Requisitos</label><textarea id="p_req" data-pub="requisitos" rows="4" placeholder="Sin edad, sexo, estado civil ni «buena presentación» (LFT art. 133)">' + esc(p.requisitos) + '</textarea></div>' +
    '<div class="grid2"><div class="campo"><label for="p_estado">Estado</label><select id="p_estado">' + [['abierta', 'Abierta: recibe postulaciones'], ['pausada', 'Pausada: no aparece en la bolsa'], ['cerrada', 'Cerrada']].map(([k, t]) => '<option value="' + k + '"' + (actual.estado === k ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div><div></div></div>' +
    (/\b(edad|años de edad|sexo|mujer|hombre|soltera|soltero|casad[oa]|buena presentaci[oó]n)\b/i.test(p.requisitos + ' ' + p.descripcion) ? '<p class="aviso warn">La descripción o los requisitos mencionan edad, sexo, estado civil o presentación. La Ley Federal del Trabajo (art. 133) prohíbe negar empleo por esos motivos; quítalos antes de publicar.</p>' : '') +
    '<div class="acciones"><button class="btn pri" type="button" id="btnPublicar">' + (actual.id ? 'Guardar cambios' : 'Publicar la vacante') + '</button>' +
      (actual.id ? '<a class="btn" href="vacantes.html#' + esc(actual.id) + '" target="_blank" rel="noopener">Ver como postulante</a>' : '') + '</div>' +
    '<p class="small" id="msgPub">' + esc(msgPub) + '</p>' +
    '<p class="small muted">La rúbrica y el filtro se guardan en este navegador mientras los editas; al tocar el botón también quedan en la hoja de la bolsa, para abrirlos en otro equipo.</p>';
  el.appendChild(div);
  div.querySelectorAll('[data-pub]').forEach(x => x.oninput = x.onchange = () => { actual.publico[x.dataset.pub] = x.value; });
  $('#p_estado').onchange = e => { actual.estado = e.target.value; };
  $('#btnPublicar').onclick = publicar;
}
async function publicar(){
  const S = C().estado(), m = $('#msgPub'), b = $('#btnPublicar');
  if(!S.vacante.puesto.trim()){ m.textContent = 'Escribe el nombre del puesto arriba, en «Contexto de la vacante».'; return; }
  b.disabled = true; m.textContent = 'Guardando…';
  let r; try{ r = await BOLSA.api('empresa-vacante', {clave, vacante: {id: actual.id, puesto: S.vacante.puesto, estado: actual.estado, publico: actual.publico, config: {vacante: S.vacante, ats: S.ats}}}); }catch(e){ r = {ok: false, error: 'red'}; }
  b.disabled = false;
  if(!r.ok){ m.textContent = BOLSA.mensaje(r.error); return; }
  if(!actual.id){
    // La vacante nueva ya tiene id: su estado pasa a la llave definitiva.
    try{ const t = localStorage.getItem(llaveDe(actual.temporal)); if(t){ const o = JSON.parse(t); o.vacanteId = r.id; localStorage.setItem(llaveDe(r.id), JSON.stringify(o)); localStorage.removeItem(llaveDe(actual.temporal)); } }catch(e){}
    actual.id = r.id; delete actual.temporal;
    C().usar(llaveDe(r.id), null);
  }
  msgPub = actual.estado === 'abierta' ? 'Publicada. Ya aparece en la bolsa de trabajo del Club.' : 'Guardada.';
  const i = VACS.findIndex(v => v.id === actual.id);
  const fila = Object.assign({}, actual.publico, {id: actual.id, puesto: S.vacante.puesto, estado: actual.estado, postulaciones: POSTS.length, conDisc: POSTS.filter(p => p.disc).length, actualizada: new Date().toISOString().slice(0, 10), config: {vacante: S.vacante, ats: S.ats}});
  if(i >= 0) VACS[i] = fila; else VACS.unshift(fila);
  C().pintar(); mostrar();
}

/* ---------------- paso 2: postulaciones ---------------- */
async function sincronizar(){
  if(!actual || !actual.id || sincronizando) return;
  sincronizando = true;
  let r; try{ r = await BOLSA.api('empresa-postulaciones', {clave, vacanteId: actual.id}); }catch(e){ r = {ok: false, error: 'red'}; }
  sincronizando = false;
  if(!r.ok){ msgPost = BOLSA.mensaje(r.error); refrescarCVs(); return; }
  POSTS = r.postulaciones || []; ultimaSync = new Date(); msgPost = '';
  const S = C().estado(), errores = [];
  let nuevos = 0;
  POSTS.forEach(p => {
    const disc = p.disc ? {dominante: p.disc.dominante, segundo: p.disc.segundo, lectura: p.disc.lectura, puntajes: p.disc.puntajes, fecha: p.disc.fecha} : {};
    const cv = S.cvs.find(c => c.postId === p.id);
    if(cv){ cv.disc = disc; return; }
    const res = C().agregarCV(p.cv, p.nombre, '', {postId: p.id, disc});
    if(res.error) errores.push('Una postulación del ' + p.fecha + ' ' + res.error + '.'); else { nuevos++; p.cvId = res.id; }
  });
  POSTS.forEach(p => { const c = S.cvs.find(x => x.postId === p.id); if(c) p.cvId = c.id; });
  if(nuevos) msgPost = nuevos === 1 ? 'Llegó 1 CV nuevo.' : 'Llegaron ' + nuevos + ' CVs nuevos.';
  if(errores.length) msgPost += ' ' + errores.join(' ');
  C().guardar();
  refrescarCVs(); mostrar();
}
function refrescarCVs(){ if(location.hash === '#cvs' && !enEmpresa()) C().pintar(); }
function pintarPostulaciones(el){
  const box = el.querySelector('#cvsModo');
  if(!actual.id){
    box.innerHTML = '<div class="banda"><h2>Postulaciones</h2><p class="muted">Publica la vacante en el paso 1 para empezar a recibir CVs.</p></div>'; return;
  }
  const conDisc = POSTS.filter(p => p.disc).length;
  box.innerHTML = '<div class="banda"><div class="acciones" style="justify-content:space-between"><div><h2>Postulaciones</h2>' +
      '<p class="muted small">Los CVs llegan solos conforme la gente se postula en la bolsa de trabajo; se revisan cada minuto mientras esta página está abierta. Antes de guardarlos se oculta el nombre y los datos de contacto. Cada postulante recibe por correo su Perfil DISC; cuando lo contesta, aparece aquí. ' +
      'El DISC es <strong>solo informativo</strong>: no entra al filtro ni a los duelos, y no cambia el ranking.</p></div>' +
      '<button class="btn" type="button" id="btnSync"' + (sincronizando ? ' disabled' : '') + '>' + (sincronizando ? 'Revisando…' : 'Revisar ahora') + '</button></div>' +
    '<p class="small"><strong>' + POSTS.length + '</strong> postulaciones · <strong>' + conDisc + '</strong> con Perfil DISC' + (ultimaSync ? ' · revisado a las ' + ultimaSync.toLocaleTimeString('es-MX', {hour: '2-digit', minute: '2-digit'}) : '') + '</p>' +
    (msgPost ? '<p class="aviso">' + esc(msgPost) + '</p>' : '') +
    (POSTS.length ? '<div class="tabla-c"><table><thead><tr><th>CV</th><th>Recibido</th><th>Perfil DISC</th><th></th></tr></thead><tbody>' +
      POSTS.map(p => '<tr><td><strong>' + esc(p.cvId || '—') + '</strong></td><td class="small">' + esc(p.fecha) + '</td>' +
        '<td>' + (p.disc ? '<span class="pill disc">' + esc(C().textoDisc({disc: p.disc}).replace(/^DISC: /, '')) + '</span>' : '<span class="pill warn">Pendiente</span>' + (p.correoDisc ? ' <span class="small muted">correo enviado el ' + esc(p.correoDisc) + '</span>' : ' <span class="small muted">correo no enviado</span>')) + '</td>' +
        '<td>' + (p.disc ? '' : '<button class="btn mini" type="button" data-reenviar="' + esc(p.id) + '">Reenviar DISC</button>') + '</td></tr>').join('') + '</tbody></table></div>'
      : '<p class="muted">Todavía nadie se postula. Comparte el enlace: <a href="vacantes.html#' + esc(actual.id) + '" target="_blank" rel="noopener">bolsa de trabajo → esta vacante</a>.</p>') + '</div>';
  box.querySelector('#btnSync').onclick = () => { sincronizar(); };
  box.querySelectorAll('[data-reenviar]').forEach(b => b.onclick = async () => {
    b.disabled = true; b.textContent = 'Enviando…';
    let r; try{ r = await BOLSA.api('empresa-reenviar-disc', {clave, postId: b.dataset.reenviar}); }catch(e){ r = {ok: false, error: 'red'}; }
    b.textContent = r.ok ? ({enviado: 'Enviado', ya: 'Ya lo contestó', cuota: 'Sin cupo de correos hoy'}[r.correoDisc] || 'No se pudo') : BOLSA.mensaje(r.error);
  });
}
setInterval(() => { if(document.visibilityState === 'visible' && actual && actual.id && EMP) sincronizar(); }, 60000);

/* ---------------- paso 5: contacto de los finalistas ---------------- */
function pintarContactos(el, R){
  const S = C().estado();
  const fin = R.ranking.map(s => S.cvs.find(c => c.id === s.id)).filter(c => c && c.postId);
  if(!fin.length) return;
  const div = document.createElement('div');
  div.className = 'banda no-imprimir';
  div.innerHTML = '<div><h2>Contactar a los finalistas</h2><p class="muted small">Ver el contacto revela quién es cada CV. Hazlo cuando ya decidiste a quién invitar a la siguiente etapa: queda registrado en la hoja del Club.</p></div>' +
    '<div class="tabla-c"><table><thead><tr><th>CV</th><th>Contacto</th></tr></thead><tbody>' +
    fin.map(c => { const k = contactos[c.postId];
      return '<tr><td><strong>' + esc(c.id) + '</strong></td><td>' + (k ? esc(k.nombre) + ' · <a href="mailto:' + esc(k.correo) + '">' + esc(k.correo) + '</a>' + (k.telefono ? ' · ' + esc(k.telefono) : '') + (k.ciudad ? ' · ' + esc(k.ciudad) : '')
        : '<button class="btn mini" type="button" data-contacto="' + esc(c.postId) + '">Ver contacto</button>') + '</td></tr>'; }).join('') + '</tbody></table></div>';
  el.appendChild(div);
  div.querySelectorAll('[data-contacto]').forEach(b => b.onclick = async () => {
    b.disabled = true;
    let r; try{ r = await BOLSA.api('empresa-contacto', {clave, postId: b.dataset.contacto}); }catch(e){ r = {ok: false, error: 'red'}; }
    if(r.ok){ contactos[b.dataset.contacto] = r; C().pintar(); } else { b.textContent = BOLSA.mensaje(r.error); }
  });
}

/* ---------------- arranque ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  if(!BOLSA.activo()){ msgEmpresa = BOLSA.mensaje('sin servicio'); location.hash = '#empresa'; mostrar(); return; }
  if(clave){
    let r; try{ r = await BOLSA.api('empresa-entrar', {clave}); }catch(e){ r = {ok: false, error: 'red'}; }
    if(r.ok){ EMP = r.empresa; VACS = r.vacantes || []; } else { msgEmpresa = BOLSA.mensaje(r.error); if(r.error === 'clave'){ clave = ''; try{ sessionStorage.removeItem(LS_CLAVE); localStorage.removeItem(LS_CLAVE); }catch(e){} } }
  }
  location.hash = '#empresa'; mostrar();
});
})();
