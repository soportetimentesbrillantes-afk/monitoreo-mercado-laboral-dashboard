/* ============================== EL PROCESO ==============================

   El motor de agora.html y diana.html: una sola página por proceso, con sus
   herramientas en orden y el avance a la vista. Cada página define antes
   window.PROCESO (nombre, pasos, fases) y carga las herramientas (agora/*.js);
   este archivo hace el resto.

   Las herramientas son las mismas para los dos procesos y guardan en el mismo
   lugar del navegador (llave cmb_agora; el nombre se quedó así por ser la
   primera): lo que la persona ya hizo en Ágora no lo repite en DIANA.

   Si la persona aceptó en la Información inicial que el Club guarde su
   expediente, cada paso que completa se envía también a la hoja interna
   (cuentas/apps-script-autoconocimiento.gs, tipo "agora" o "diana"). Sin esa
   casilla, nada sale del navegador.

   window.PROCESO = {
     id, nombre, tipo,          'agora' | 'diana' y su nombre para mostrar
     unidad,                    'fase' (Ágora) o 'paso' (DIANA, que agrupa pasos en fases)
     fases: [{id, nombre, desc}] opcional: grupos de la ruta
     papas: true|false          ofrece los cuestionarios para papás (Ágora)
     pasos: [{id, nombre, fase, herramienta, marco, cfg, mentor, objetivo, entrega}]
       herramienta   la de agora/*.js que usa (por omisión, la del mismo id)
       mentor        pide la revisión con el mentor (nombre, fecha, comentarios)
   }                                                                          */

const PROCESO = window.PROCESO;
const LLAVE = 'cmb_agora';
const VERSION = 1;
const UNIDAD = PROCESO.unidad || 'fase';
const Unidad = UNIDAD.charAt(0).toUpperCase() + UNIDAD.slice(1);
const UNIDADES = UNIDAD === 'paso' ? 'pasos' : 'fases';
const COMPLETA_TXT = UNIDAD === 'paso' ? 'completos' : 'completas';

const PASOS = PROCESO.pasos.map(p => Object.assign({}, p));
const FASES_PROC = PROCESO.fases || null;

// Las herramientas que traen su archivo en agora/ quedan disponibles.
const FASES_EXT = window.FASES_AGORA || {};
const herramientaDe = p => p.herramienta || p.id;
PASOS.forEach(p => { if(p.id === 'informacion' || p.marco || FASES_EXT[herramientaDe(p)]) p.listo = true; });

const MX_ESTADOS = ['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero','Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas','Fuera de México'];
const NIVELES = ['Secundaria','Preparatoria o bachillerato','Carrera técnica','Licenciatura o ingeniería','Posgrado'];
const SITUACIONES = ['Estudiando','Egresado','En pausa','No terminé'];
const TIPOS_EXP = ['Empleo','Prácticas profesionales','Servicio social','Voluntariado','Proyecto escolar','Negocio propio'];
const NIVELES_IDIOMA = ['Básico','Intermedio','Avanzado','Nativo'];
// Los sectores del monitoreo. Se leen de manifest.json; esta lista es el respaldo.
// Además de los sectores del monitoreo, en la fase 1 se puede elegir:
const NO_SE = 'No lo sé aún';
const SECTORES_EXTRA = ['Negocios', 'Otro', NO_SE];
// Etapa: sirve para segmentar en la hoja y decide si se ofrecen los cuestionarios para papás.
const ETAPAS = ['Secundaria o bachillerato', 'Universidad', 'Ya egresé'];
let SECTORES = ['Automotriz','Turismo','Gestión y Administración','Ventas','Finanzas','Logística','Legal','Metalmecánica','TI'];

function esc(v){
  return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function fechaLegible(d){
  try{ return (d ? new Date(d) : new Date()).toLocaleDateString('es-MX', {day:'numeric', month:'long', year:'numeric'}); }
  catch(e){ return ''; }
}

/* ------------------------------ Estado ------------------------------ */
function estadoVacio(){
  return {version: VERSION, id: null, consentimiento: {acepta: false, fecha: null}, pasos: {}};
}
let E = leer();
function leer(){
  try{
    const g = JSON.parse(localStorage.getItem(LLAVE) || 'null');
    if(g && g.version === VERSION && g.pasos) return g;
  }catch(e){}
  return estadoVacio();
}
function guardar(){
  try{ localStorage.setItem(LLAVE, JSON.stringify(E)); return true; }catch(e){ return false; }
}
function idExpediente(){
  if(!E.id) E.id = (typeof COMPARTIR !== 'undefined') ? COMPARTIR.nuevoId() : String(Date.now());
  return E.id;
}
/* Las herramientas de las fases 2 y 3 guardan lo suyo en sus propias llaves
   (las mismas que usan como páginas sueltas). El estado se lee de ahí, para
   que la ruta diga la verdad aunque la persona haya borrado algo allá. */
function leerLS(llave){ try{ return JSON.parse(localStorage.getItem(llave) || 'null'); }catch(e){ return null; } }
const lineas = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
const ESTADO_HERRAMIENTA = {
  disc(){
    const r = leerLS('cmb_disc');
    if(r && r.puntajes && r.instrumento === 'agora') return 'completo';
    const g = leerLS('cmb_disc_agora_progreso');
    const hay = g && ((g.a && Object.keys(g.a).length) || (g.b && g.b.marcados && g.b.marcados.length) ||
      (g.c && Object.keys(g.c).length) || (g.d && Object.keys(g.d).length) || (g.e && Object.keys(g.e).length));
    return hay ? 'en-curso' : 'pendiente';
  },
  foda(){
    const f = leerLS('cmb_foda');
    const llenos = f ? ['F','D','O','A'].filter(k => lineas(f[k]).length).length : 0;
    const s = E.pasos.foda;
    if(s && s.completo && llenos === 4) return 'completo';
    return f && (llenos || lineas(f.paso).length) ? 'en-curso' : 'pendiente';
  }
};
function estadoPaso(p){
  if(!p) return 'pendiente';
  if(!p.listo) return 'proximamente';
  if(ESTADO_HERRAMIENTA[p.id]) return ESTADO_HERRAMIENTA[p.id]();
  const s = E.pasos[p.id];
  // Una herramienta puede pedir más en un proceso que en otro (Crecimiento
  // personal en DIANA pide valores): si lo hecho no alcanza aquí, sigue en curso.
  const h = FASES_EXT[herramientaDe(p)];
  if(s && s.completo && h && h.completa && !h.completa(s.datos || {}, p.cfg || {})) return 'en-curso';
  if(s && s.completo) return 'completo';
  if(s && s.datos) return 'en-curso';
  return 'pendiente';
}
/* Revisión con el mentor: el paso puede estar completo y esperar al mentor. */
function faltaMentor(p){
  const s = E.pasos[p.id];
  return !!(p.mentor && estadoPaso(p) === 'completo' && !(s && s.mentor && s.mentor.revisado));
}
const ETIQUETA = {completo:'Completo', 'en-curso':'En curso', pendiente:'Pendiente', proximamente:'Próximamente', mentor:'Falta mentor'};

/* ------------------------------ Ruta ------------------------------ */
let pasoActual = 'informacion';

function botonPaso(p){
  const st = estadoPaso(p), i = PASOS.indexOf(p);
  const et = faltaMentor(p) ? 'mentor' : st;
  return '<button type="button" class="paso ' + st + '" data-paso="' + p.id + '"' +
    (p.id === pasoActual ? ' aria-current="step"' : '') + (st === 'proximamente' ? ' disabled' : '') + '>' +
    '<span class="num">' + (st === 'completo' ? '✓' : i + 1) + '</span><span>' + esc(p.nombre) + '</span>' +
    '<span class="estado ' + et + '">' + ETIQUETA[et] + '</span></button>';
}
function pintarRuta(){
  const completos = PASOS.filter(p => estadoPaso(p) === 'completo').length;
  const pct = Math.round(100 * completos / PASOS.length);
  document.getElementById('avancePct').textContent = pct + '%';
  document.getElementById('avanceTxt').textContent = completos + ' de ' + PASOS.length + ' ' + UNIDADES + ' ' + COMPLETA_TXT;
  document.getElementById('avanceBarra').style.width = pct + '%';
  document.getElementById('listaFases').innerHTML = FASES_PROC
    ? FASES_PROC.map(f => {
        const pasos = PASOS.filter(p => p.fase === f.id);
        const hechos = pasos.filter(p => estadoPaso(p) === 'completo').length;
        return '<div class="fase" data-fase="' + f.id + '"><h2>' + esc(f.nombre) + ' <span>' + hechos + ' de ' + pasos.length + '</span></h2>' +
          (f.desc ? '<p class="desc">' + esc(f.desc) + '</p>' : '') + pasos.map(botonPaso).join('') + '</div>';
      }).join('')
    : '<div class="fase">' + PASOS.map(botonPaso).join('') + '</div>';
  document.querySelectorAll('#listaFases .paso').forEach(b => {
    b.onclick = () => abrir(b.dataset.paso);
  });
  const p = PASOS.find(x => x.id === pasoActual);
  document.getElementById('resumenPaso').textContent = Unidad + ' ' + (PASOS.indexOf(p) + 1) + ': ' + p.nombre + ' · ver ' + (UNIDAD === 'paso' ? 'todos los pasos' : 'todas las fases');
}

function abrir(id){
  const p = PASOS.find(x => x.id === id);
  if(!p || !p.listo) return;
  pasoActual = id;
  pintarRuta();
  HERRAMIENTAS[id]();
  document.getElementById('contenido').scrollIntoView({behavior: 'smooth', block: 'start'});
}

function cabecera(p){
  const n = PASOS.indexOf(p) + 1;
  const f = FASES_PROC && FASES_PROC.find(x => x.id === p.fase);
  return '<div class="cabecera-paso"><div class="fase-label">' + (FASES_PROC ? esc(PROCESO.nombre) + ' · ' + esc(f ? f.nombre : '') : 'Proceso ' + esc(PROCESO.nombre)) + ' · ' + Unidad + ' ' + n + ' de ' + PASOS.length + '</div>' +
    '<h2>' + esc(p.nombre) + '</h2><p style="margin:0;">' + esc(p.objetivo) + '</p>' +
    '<div class="entrega"><strong>Lo que te llevas:</strong> ' + esc(p.entrega) + '</div></div>';
}

/* ============================ FASE 1: INFORMACIÓN INICIAL ============================ */

const D0 = () => ({
  nombres:'', apellidoPaterno:'', apellidoMaterno:'', correo:'', telefono:'', edad:'', estado:'', ciudad:'',
  tutorNombre:'', tutorCorreo:'', tutorParentesco:'', tutorAutoriza:false,
  nivel:'', situacion:'', institucion:'', carrera:'', grado:'', anioEgreso:'',
  sinExperiencia:false, experiencia:[],
  sinCertificaciones:false, certificaciones:[],
  idiomas:[{idioma:'Español', nivel:'Nativo'}],
  sectores:[], sectorOtro:'', aspiracion:'', etapa:''
});

function datosInfo(){
  const s = E.pasos.informacion;
  return Object.assign(D0(), s && s.datos ? s.datos : {});
}
const correoValido = c => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(c || '').trim());
const esMenor = d => { const n = parseInt(d.edad, 10); return !isNaN(n) && n < 18; };

/* Qué falta para dar la fase por completa. Devuelve [ [campo, texto] ]. */
function faltantesInfo(d){
  const f = [];
  const req = (campo, txt, ok) => { if(!ok) f.push([campo, txt]); };
  req('nombres', 'tu nombre', d.nombres.trim());
  req('apellidoPaterno', 'tu primer apellido', d.apellidoPaterno.trim());
  req('correo', 'un correo válido', correoValido(d.correo));
  const edad = parseInt(d.edad, 10);
  req('edad', 'tu edad (entre 12 y 99)', !isNaN(edad) && edad >= 12 && edad <= 99);
  req('estado', 'el estado donde vives', d.estado);
  if(esMenor(d)){
    req('tutorNombre', 'el nombre de tu madre, padre o tutor', d.tutorNombre.trim());
    req('tutorCorreo', 'el correo de tu madre, padre o tutor', correoValido(d.tutorCorreo));
    if(E.consentimiento.acepta) req('tutorAutoriza', 'que tu madre, padre o tutor esté de acuerdo con guardar tu expediente', d.tutorAutoriza);
  }
  req('etapa', 'en qué etapa estás (secundaria o bachillerato, universidad, o egresado)', d.etapa);
  req('nivel', 'tu nivel de estudios', d.nivel);
  req('situacion', 'si estás estudiando o ya egresaste', d.situacion);
  req('institucion', 'tu escuela o institución', d.institucion.trim());
  if(['Carrera técnica','Licenciatura o ingeniería','Posgrado'].includes(d.nivel)) req('carrera', 'tu carrera o programa', d.carrera.trim());
  const expOk = d.sinExperiencia || d.experiencia.some(x => (x.rol || '').trim() && (x.organizacion || '').trim());
  req('experiencia', 'al menos una experiencia (o marcar que todavía no tienes)', expOk);
  const certOk = d.sinCertificaciones || d.certificaciones.some(x => (x.nombre || '').trim());
  req('certificaciones', 'al menos un curso o certificación (o marcar que todavía no tienes)', certOk);
  req('idiomas', 'al menos un idioma con su nivel', d.idiomas.some(x => (x.idioma || '').trim() && x.nivel));
  req('sectores', 'al menos un sector que te interese', d.sectores.length > 0);
  return f;
}

function opciones(lista, actual, vacio){
  return '<option value="">' + (vacio || 'Elige…') + '</option>' +
    lista.map(o => '<option' + (o === actual ? ' selected' : '') + '>' + esc(o) + '</option>').join('');
}
function campo(id, etiqueta, html, req, clase){
  return '<div class="campo ' + (clase || '') + '" data-campo="' + id + '"><label for="f_' + id + '">' + etiqueta +
    (req ? ' <span class="req">*</span>' : '') + '</label>' + html + '</div>';
}
function inp(id, valor, tipo, extra){
  return '<input id="f_' + id + '" name="' + id + '" type="' + (tipo || 'text') + '" value="' + esc(valor) + '" ' + (extra || '') + '>';
}

function pintarInformacion(){
  const p = PASOS[0];
  document.body.classList.remove('con-documento');
  const d = datosInfo();
  const s = E.pasos.informacion || {};
  const cont = document.getElementById('contenido');
  cont.innerHTML =
    '<div class="card">' + cabecera(p) + '</div>' +

    '<div class="card" id="cardConsentimiento">' +
      '<h3>Tu expediente en el Club</h3>' +
      '<p style="margin-top:0;">Cada ' + UNIDAD + ' que completes se guarda en este dispositivo. Si aceptas, también se guarda en tu expediente del Club, para que tu orientador vea tu avance y te acompañe en el proceso. Se guarda tu información de este proceso con tu nombre y correo; no se publica, no se comparte con empresas y no se usa para descartarte de nada.</p>' +
      '<label class="check"><input type="checkbox" id="consiente"' + (E.consentimiento.acepta ? ' checked' : '') + '> <span>Acepto que el Club de Mentes Brillantes guarde mi expediente del proceso ' + esc(PROCESO.nombre) + ', según el <a href="aviso-privacidad.html" target="_blank" rel="noopener">Aviso de Privacidad</a>.</span></label>' +
      '<p class="note" id="notaConsentimiento">' + (E.consentimiento.acepta ? 'Aceptado el ' + esc(fechaLegible(E.consentimiento.fecha)) + '. Puedes retirarlo cuando quieras desmarcando la casilla; para que borremos lo ya guardado, escribe a clubmentesbrillantesla@gmail.com.' : 'Si no lo aceptas, el proceso te sirve igual y nada sale de tu navegador.') + '</p>' +
    '</div>' +

    '<form class="card" id="formInfo" autocomplete="on" novalidate>' +
      '<h3>Datos personales</h3>' +
      '<div class="grid">' +
        campo('nombres', 'Nombre(s)', inp('nombres', d.nombres, 'text', 'autocomplete="given-name"'), true) +
        campo('apellidoPaterno', 'Primer apellido', inp('apellidoPaterno', d.apellidoPaterno, 'text', 'autocomplete="family-name"'), true) +
        campo('apellidoMaterno', 'Segundo apellido', inp('apellidoMaterno', d.apellidoMaterno)) +
        campo('correo', 'Correo', inp('correo', d.correo, 'email', 'autocomplete="email" inputmode="email"'), true) +
        campo('telefono', 'Teléfono (opcional)', inp('telefono', d.telefono, 'tel', 'autocomplete="tel"')) +
        campo('edad', 'Edad', inp('edad', d.edad, 'number', 'min="12" max="99" inputmode="numeric"'), true) +
        campo('estado', 'Estado donde vives', '<select id="f_estado" name="estado">' + opciones(MX_ESTADOS, d.estado) + '</select>', true) +
        campo('ciudad', 'Ciudad o municipio', inp('ciudad', d.ciudad)) +
      '</div>' +

      '<div id="bloqueTutor"' + (esMenor(d) ? '' : ' hidden') + '>' +
        '<h3>Tu madre, padre o tutor</h3>' +
        '<p class="note" style="margin-top:0;">Como eres menor de edad, necesitamos saber quién te acompaña en el proceso. A su correo le llegarán tus resultados de Crecimiento personal y tu reporte final.</p>' +
        '<div class="grid">' +
          campo('tutorNombre', 'Nombre', inp('tutorNombre', d.tutorNombre), true) +
          campo('tutorCorreo', 'Correo', inp('tutorCorreo', d.tutorCorreo, 'email', 'inputmode="email"'), true) +
          campo('tutorParentesco', 'Parentesco', '<select id="f_tutorParentesco" name="tutorParentesco">' + opciones(['Madre','Padre','Tutor o tutora'], d.tutorParentesco) + '</select>') +
        '</div>' +
        '<div class="campo" data-campo="tutorAutoriza" id="campoTutorAutoriza"' + (E.consentimiento.acepta ? '' : ' hidden') + '><label class="check"><input type="checkbox" id="f_tutorAutoriza" name="tutorAutoriza"' + (d.tutorAutoriza ? ' checked' : '') + '> <span>Mi madre, padre o tutor está de acuerdo con que el Club guarde mi expediente.</span></label></div>' +
      '</div>' +

      '<h3>Estudios actuales</h3>' +
      '<div class="campo" data-campo="etapa"><label>¿En qué etapa estás? <span class="req">*</span></label>' +
        '<div class="chips" id="chipsEtapa">' + ETAPAS.map(e => '<label><input type="radio" name="etapa" value="' + esc(e) + '"' + (d.etapa === e ? ' checked' : '') + '> ' + esc(e) + '</label>').join('') + '</div></div>' +
      '<div class="grid" style="margin-top:12px;">' +
        campo('nivel', 'Nivel de estudios', '<select id="f_nivel" name="nivel">' + opciones(NIVELES, d.nivel) + '</select>', true) +
        campo('situacion', 'Situación', '<select id="f_situacion" name="situacion">' + opciones(SITUACIONES, d.situacion) + '</select>', true) +
        campo('institucion', 'Escuela o institución', inp('institucion', d.institucion), true) +
        campo('carrera', 'Carrera o programa', inp('carrera', d.carrera), ['Carrera técnica','Licenciatura o ingeniería','Posgrado'].includes(d.nivel)) +
        campo('grado', 'Semestre o año que cursas', inp('grado', d.grado, 'text', 'placeholder="Ej. 6.º semestre"')) +
        campo('anioEgreso', 'Año de egreso (o esperado)', inp('anioEgreso', d.anioEgreso, 'number', 'min="1980" max="2045" inputmode="numeric"')) +
      '</div>' +

      '<h3>Experiencia</h3>' +
      '<p class="note" style="margin-top:0;">Cuenta todo: empleos, prácticas, servicio social, voluntariado, proyectos escolares o un negocio propio. Escribe lo que hiciste, no lo que suena bien.</p>' +
      '<div data-campo="experiencia"><div id="listaExp"></div>' +
      '<div class="acciones"><button type="button" class="secondary" id="agregarExp">+ Agregar experiencia</button>' +
      '<label class="check" style="margin:0;"><input type="checkbox" id="f_sinExperiencia"' + (d.sinExperiencia ? ' checked' : '') + '> <span>Todavía no tengo experiencia</span></label></div></div>' +

      '<h3>Cursos y certificaciones</h3>' +
      '<div data-campo="certificaciones"><div id="listaCert"></div>' +
      '<div class="acciones"><button type="button" class="secondary" id="agregarCert">+ Agregar curso o certificación</button>' +
      '<label class="check" style="margin:0;"><input type="checkbox" id="f_sinCertificaciones"' + (d.sinCertificaciones ? ' checked' : '') + '> <span>Todavía no tengo</span></label></div></div>' +

      '<h3>Idiomas</h3>' +
      '<div data-campo="idiomas"><div id="listaIdiomas"></div>' +
      '<div class="acciones"><button type="button" class="secondary" id="agregarIdioma">+ Agregar idioma</button></div></div>' +

      '<h3>Lo que te interesa</h3>' +
      '<div class="campo" data-campo="sectores"><label>¿Qué sectores te interesan? <span class="req">*</span></label>' +
        '<div class="chips" id="chipsSectores">' + SECTORES.map(sec =>
          '<label><input type="checkbox" value="' + esc(sec) + '"' + (d.sectores.includes(sec) ? ' checked' : '') + '> ' + esc(sec) + '</label>').join('') +
          SECTORES_EXTRA.map(x => '<label><input type="checkbox" value="' + esc(x) + '"' + (d.sectores.includes(x) ? ' checked' : '') + '> ' + esc(x) + '</label>').join('') +
        '</div></div>' +
      '<div class="grid dos" style="margin-top:12px;">' +
        campo('sectorOtro', '¿Cuál otro?', inp('sectorOtro', d.sectorOtro), false, d.sectores.includes('Otro') ? '' : 'oculto') +
        campo('aspiracion', '¿Qué te gustaría estudiar o en qué te gustaría trabajar? (opcional)', '<textarea id="f_aspiracion" name="aspiracion">' + esc(d.aspiracion) + '</textarea>', false, 'ancho') +
      '</div>' +

      '<div id="avisoInfo"></div>' +
      '<div class="acciones" style="margin-top:16px;">' +
        '<button type="submit" class="primary" id="btnCompletarInfo">' + (s.completo ? 'Guardar cambios' : 'Guardar y marcar como completo') + '</button>' +
        '<span class="guardado" id="estadoGuardado">' + (s.actualizado ? 'Guardado en este dispositivo.' : '') + '</span>' +
      '</div>' +
    '</form>';

  document.querySelectorAll('.campo.oculto').forEach(el => { el.hidden = true; });
  pintarLista('exp'); pintarLista('cert'); pintarLista('idiomas');

  const form = document.getElementById('formInfo');
  form.addEventListener('input', alEditarInfo);
  form.addEventListener('change', alEditarInfo);
  form.addEventListener('submit', ev => { ev.preventDefault(); completarInfo(); });
  document.getElementById('agregarExp').onclick = () => { agregar('exp'); };
  document.getElementById('agregarCert').onclick = () => { agregar('cert'); };
  document.getElementById('agregarIdioma').onclick = () => { agregar('idiomas'); };
  document.getElementById('consiente').onchange = ev => {
    E.consentimiento = ev.target.checked ? {acepta: true, fecha: new Date().toISOString()} : {acepta: false, fecha: null};
    guardar();
    document.getElementById('campoTutorAutoriza').hidden = !ev.target.checked;
    document.getElementById('notaConsentimiento').textContent = ev.target.checked
      ? 'Aceptado hoy. Tu expediente se guarda cuando completes cada ' + UNIDAD + '.'
      : 'Si no lo aceptas, el proceso te sirve igual y nada sale de tu navegador.';
  };
}

/* ---- Listas repetibles: experiencia, certificaciones, idiomas ---- */
const LISTAS = {
  exp: {clave:'experiencia', cont:'listaExp', nuevo:() => ({tipo:'', rol:'', organizacion:'', desde:'', hasta:'', descripcion:''}),
    html:(x, i) =>
      '<div class="grid">' +
        campo('exp_tipo_' + i, 'Tipo', '<select id="f_exp_tipo_' + i + '" data-lista="exp" data-i="' + i + '" data-k="tipo">' + opciones(TIPOS_EXP, x.tipo) + '</select>') +
        campo('exp_rol_' + i, 'Puesto o rol', '<input id="f_exp_rol_' + i + '" data-lista="exp" data-i="' + i + '" data-k="rol" value="' + esc(x.rol) + '">') +
        campo('exp_org_' + i, 'Organización', '<input id="f_exp_org_' + i + '" data-lista="exp" data-i="' + i + '" data-k="organizacion" value="' + esc(x.organizacion) + '">') +
        campo('exp_desde_' + i, 'Desde', '<input type="month" id="f_exp_desde_' + i + '" data-lista="exp" data-i="' + i + '" data-k="desde" value="' + esc(x.desde) + '">') +
        campo('exp_hasta_' + i, 'Hasta (vacío si sigues ahí)', '<input type="month" id="f_exp_hasta_' + i + '" data-lista="exp" data-i="' + i + '" data-k="hasta" value="' + esc(x.hasta) + '">') +
        campo('exp_desc_' + i, 'Qué hiciste', '<textarea id="f_exp_desc_' + i + '" data-lista="exp" data-i="' + i + '" data-k="descripcion">' + esc(x.descripcion) + '</textarea>', false, 'ancho') +
      '</div>'},
  cert: {clave:'certificaciones', cont:'listaCert', nuevo:() => ({nombre:'', institucion:'', anio:''}),
    html:(x, i) =>
      '<div class="grid">' +
        campo('cert_nombre_' + i, 'Nombre del curso o certificación', '<input id="f_cert_nombre_' + i + '" data-lista="cert" data-i="' + i + '" data-k="nombre" value="' + esc(x.nombre) + '">') +
        campo('cert_inst_' + i, 'Quién lo otorga', '<input id="f_cert_inst_' + i + '" data-lista="cert" data-i="' + i + '" data-k="institucion" value="' + esc(x.institucion) + '">') +
        campo('cert_anio_' + i, 'Año', '<input type="number" min="1980" max="2045" id="f_cert_anio_' + i + '" data-lista="cert" data-i="' + i + '" data-k="anio" value="' + esc(x.anio) + '">') +
      '</div>'},
  idiomas: {clave:'idiomas', cont:'listaIdiomas', nuevo:() => ({idioma:'', nivel:''}),
    html:(x, i) =>
      '<div class="grid dos">' +
        campo('id_idioma_' + i, 'Idioma', '<input id="f_id_idioma_' + i + '" data-lista="idiomas" data-i="' + i + '" data-k="idioma" value="' + esc(x.idioma) + '">') +
        campo('id_nivel_' + i, 'Nivel', '<select id="f_id_nivel_' + i + '" data-lista="idiomas" data-i="' + i + '" data-k="nivel">' + opciones(NIVELES_IDIOMA, x.nivel) + '</select>') +
      '</div>'}
};

function pintarLista(nombre){
  const L = LISTAS[nombre]; const d = datosInfo(); const items = d[L.clave];
  document.getElementById(L.cont).innerHTML = items.map((x, i) =>
    '<div class="lista-item">' + (items.length > (nombre === 'idiomas' ? 1 : 0) ? '<button type="button" class="quitar" data-quitar="' + nombre + '" data-i="' + i + '">Quitar</button>' : '') + L.html(x, i) + '</div>').join('');
  document.querySelectorAll('[data-quitar="' + nombre + '"]').forEach(b => {
    b.onclick = () => { const dd = datosInfo(); dd[L.clave].splice(Number(b.dataset.i), 1); fijarDatosInfo(dd); pintarLista(nombre); };
  });
}
function agregar(nombre){
  const L = LISTAS[nombre]; const d = datosInfo();
  d[L.clave].push(L.nuevo());
  if(nombre === 'exp') d.sinExperiencia = false;
  if(nombre === 'cert') d.sinCertificaciones = false;
  fijarDatosInfo(d); pintarLista(nombre);
  if(nombre === 'exp') document.getElementById('f_sinExperiencia').checked = false;
  if(nombre === 'cert') document.getElementById('f_sinCertificaciones').checked = false;
}

function fijarDatosInfo(d){
  const s = E.pasos.informacion || {};
  E.pasos.informacion = Object.assign(s, {datos: d, actualizado: new Date().toISOString()});
  const ok = guardar();
  const g = document.getElementById('estadoGuardado');
  if(g) g.textContent = ok ? 'Guardado en este dispositivo.' : 'No se pudo guardar en este navegador: no cierres la página hasta terminar.';
  pintarRuta();
}

/* Lee todo el formulario al estado. Más simple y más seguro que seguir cada
   campo por separado: lo que está en pantalla es lo que se guarda. */
function alEditarInfo(ev){
  const d = datosInfo();
  const t = ev && ev.target;
  if(t && t.dataset && t.dataset.lista){
    const L = LISTAS[t.dataset.lista];
    d[L.clave][Number(t.dataset.i)][t.dataset.k] = t.value;
  }
  ['nombres','apellidoPaterno','apellidoMaterno','correo','telefono','edad','estado','ciudad','tutorNombre','tutorCorreo','tutorParentesco',
   'nivel','situacion','institucion','carrera','grado','anioEgreso','sectorOtro','aspiracion'].forEach(k => {
    const el = document.getElementById('f_' + k); if(el) d[k] = el.value;
  });
  d.tutorAutoriza = !!(document.getElementById('f_tutorAutoriza') || {}).checked;
  d.sinExperiencia = document.getElementById('f_sinExperiencia').checked;
  d.sinCertificaciones = document.getElementById('f_sinCertificaciones').checked;
  // "No lo sé aún" no se combina con otros: si elige un sector, se quita; si lo elige, se quitan los demás.
  if(t && t.closest && t.closest('#chipsSectores') && t.checked){
    document.querySelectorAll('#chipsSectores input').forEach(x => { if(x !== t && (x.value === NO_SE || t.value === NO_SE)) x.checked = false; });
  }
  d.sectores = [...document.querySelectorAll('#chipsSectores input:checked')].map(x => x.value);
  const etapa = document.querySelector('#chipsEtapa input:checked'); d.etapa = etapa ? etapa.value : '';
  fijarDatosInfo(d);

  document.getElementById('bloqueTutor').hidden = !esMenor(d);
  const otro = document.querySelector('[data-campo="sectorOtro"]'); if(otro) otro.hidden = !d.sectores.includes('Otro');
  const carreraReq = ['Carrera técnica','Licenciatura o ingeniería','Posgrado'].includes(d.nivel);
  const lbl = document.querySelector('[data-campo="carrera"] label');
  if(lbl) lbl.innerHTML = 'Carrera o programa' + (carreraReq ? ' <span class="req">*</span>' : '');
  // Al corregir un campo marcado como faltante, se le quita la marca.
  if(t){ const c = t.closest('.campo'); if(c) c.classList.remove('falta'); }
}

async function completarInfo(){
  alEditarInfo();
  const d = datosInfo();
  const faltan = faltantesInfo(d);
  const aviso = document.getElementById('avisoInfo');
  document.querySelectorAll('.campo.falta').forEach(el => el.classList.remove('falta'));
  if(faltan.length){
    faltan.forEach(([c]) => { const el = document.querySelector('[data-campo="' + c + '"]'); if(el) el.classList.add('falta'); });
    aviso.innerHTML = '<div class="aviso malo"><strong>Te falta:</strong> ' + faltan.map(x => esc(x[1])).join('; ') + '.</div>';
    const primero = document.querySelector('[data-campo="' + faltan[0][0] + '"]');
    if(primero) primero.scrollIntoView({behavior: 'smooth', block: 'center'});
    return;
  }
  const s = E.pasos.informacion;
  s.completo = true; s.completadoEn = s.completadoEn || new Date().toISOString();
  guardar(); pintarRuta();
  document.getElementById('btnCompletarInfo').textContent = 'Guardar cambios';

  let msg = '<div class="aviso bien"><strong>Listo, completaste tu información inicial.</strong> ' + (UNIDAD === 'paso' ? 'El siguiente paso' : 'La siguiente fase') + ' es tu Perfil DISC';
  const sig = PASOS.find(p => p.id === 'disc');
  msg += sig && sig.listo ? '.' : ', que estará disponible muy pronto.';
  if(E.consentimiento.acepta){
    const r = await enviarPaso('informacion', d);
    msg += r.ok ? ' Tu expediente en el Club quedó actualizado.' :
      (r.error === 'sin endpoint' ? '' : ' <br>No pudimos actualizar tu expediente en el Club ahora; tus datos siguen guardados aquí y se enviarán la próxima vez que guardes.');
    if(r.ok) await enviarPendientes();
  }
  if(sig && sig.listo) msg += '<br><button class="primary" type="button" id="btnIrDisc" style="margin-top:12px;">Seguir con mi Perfil DISC →</button>';
  // ¿Está en el proceso que le toca? Ágora es para secundaria y bachillerato; DIANA, para universidad y egresados.
  const otro = PROCESO.otro;
  if(otro && otro.etapas.includes(d.etapa)) msg += '<div class="aviso limites" style="margin-top:12px;">Por tu etapa (' + esc(d.etapa) + '), el proceso pensado para ti es <strong>' + esc(otro.nombre) + '</strong>. Lo que ya hiciste aquí te lo lleva. <a href="' + esc(otro.href) + '">Ir a ' + esc(otro.nombre) + ' →</a></div>';
  aviso.innerHTML = msg + '</div>';
  const ir = document.getElementById('btnIrDisc'); if(ir) ir.onclick = () => abrir('disc');
}

/* ---- Envío al expediente (solo con consentimiento) ---- */
function nombreCompleto(d){ return [d.nombres, d.apellidoPaterno, d.apellidoMaterno].map(x => (x || '').trim()).filter(Boolean).join(' '); }
async function enviarPaso(paso, datos){
  if(!E.consentimiento.acepta) return {ok:false, error:'sin consentimiento'};
  // El expediente empieza con la fase 1: ahí están la edad y, si es menor, la
  // autorización de su tutor. Antes de eso no se manda ninguna otra fase; se
  // mandan después, al completar la fase 1 (ver enviarPendientes).
  if(paso !== 'informacion' && !(E.pasos.informacion && E.pasos.informacion.completo)) return {ok:false, error:'falta información inicial'};
  if(typeof COMPARTIR === 'undefined' || !COMPARTIR.activo()) return {ok:false, error:'sin endpoint'};
  const info = datosInfo();
  const pm = PASOS.find(p => p.id === paso);
  if(pm && pm.mentor && datos && datos.hoja) datos = Object.assign({}, datos, {hoja: Object.assign({}, datos.hoja, hojaMentor(paso))});
  try{
    const r = await COMPARTIR.enviar({
      acepta: true, tipo: PROCESO.tipo, paso, id: idExpediente(),
      nombre: nombreCompleto(info), correo: info.correo.trim(),
      completos: PASOS.filter(p => estadoPaso(p) === 'completo').map(p => p.id),
      pendientesMentor: PASOS.filter(p => faltaMentor(p)).map(p => p.id),
      total: PASOS.length, datos
    });
    guardar();
    if(r && r.ok){ E.pasos[paso].enviadoEn = new Date().toISOString(); E.pasos[paso].pendienteEnvio = false; guardar(); }
    return r || {ok:false};
  }catch(e){ return {ok:false, error:String(e)}; }
}

/* Fases que se completaron sin poder mandarse (antes de la fase 1, sin
   conexión, o antes de aceptar el expediente). */
async function enviarPendientes(){
  for(const p of PASOS){
    const s = E.pasos[p.id];
    if(p.id === 'informacion' || !s || !s.completo || !s.envio || estadoPaso(p) !== 'completo') continue;
    if(s.pendienteEnvio || !s.enviadoEn) await enviarPaso(p.id, s.envio);
  }
}

/* ============================ FASES 2 Y 3: DENTRO DE UN MARCO ============================
   Perfil DISC (disc-agora.html) y Análisis FODA (foda.html) son las mismas
   páginas que funcionan solas. Con ?en=agora se esconden su encabezado y sus
   enlaces sueltos, y le avisan a esta página (agora-embebido.js):
     altura     cuánto miden, para que el marco no tenga barra propia
     arriba     cambiaron de sección: subir al inicio del marco
     progreso   la persona contestó algo: refrescar la ruta
     resultado  terminó el DISC        completo  completó el FODA
     borrado    borró lo suyo          ir        quiere abrir otra fase       */
function pintarMarco(id){
  const p = PASOS.find(x => x.id === id);
  document.body.classList.remove('con-documento');
  document.getElementById('contenido').innerHTML =
    '<div class="card">' + cabecera(p) + '</div>' +
    '<div id="avisoFase" aria-live="polite"></div>' +
    '<iframe class="marco" id="marcoHerramienta" title="' + esc(p.nombre) + '" src="' + p.marco + '?en=agora"></iframe>';
}

async function alTerminarFase(id, envio){
  E.pasos[id] = Object.assign(E.pasos[id] || {}, {completo: true, completadoEn: new Date().toISOString(), envio, pendienteEnvio: true});
  guardar(); pintarRuta();
  const sig = PASOS[PASOS.findIndex(p => p.id === id) + 1];
  let msg = '<div class="aviso bien"><strong>' + Unidad + (UNIDAD === 'paso' ? ' completo.' : ' completa.') + '</strong> ';
  const pm = PASOS.find(p => p.id === id);
  if(pm && pm.mentor && !(E.pasos[id].mentor && E.pasos[id].mentor.revisado)) msg += 'Falta revisarlo con tu mentor (abajo). ';
  msg += sig ? (sig.listo ? 'La siguiente es ' + esc(sig.nombre) + '.' : 'La siguiente, ' + esc(sig.nombre) + ', estará disponible muy pronto.') : '';
  if(E.consentimiento.acepta){
    const r = await enviarPaso(id, envio);
    if(r.ok) msg += ' Tu expediente en el Club quedó actualizado.';
    else if(r.error === 'falta información inicial') msg += ' Se agregará a tu expediente cuando completes tu información inicial.';
    else if(r.error !== 'sin endpoint') msg += ' No pudimos actualizar tu expediente ahora; lo intentaremos la próxima vez.';
  }
  if(sig && sig.listo) msg += '<br><button class="primary" type="button" data-abrir="' + sig.id + '" style="margin-top:12px;">Seguir con ' + esc(sig.nombre) + ' →</button>';
  msg += '</div>' + tarjetaPapas(id);
  const av = document.getElementById('avisoFase');
  if(av){
    av.innerHTML = msg; AG.conectar(av);
    // En el DISC y el FODA el aviso queda arriba del marco: se sube para verlo.
    if(PASOS.find(p => p.id === id).marco) av.scrollIntoView({behavior: 'smooth', block: 'start'});
  }
}

/* ---- Cuestionarios para papás (modelo de bachillerato) ----
   Ágora manda a la madre, padre o tutor un formulario después de ciertos
   módulos. Se ofrecen al terminar esa fase, solo a quien está en secundaria o
   bachillerato. La página no los manda: abre el formulario o el correo de la
   persona con el enlace listo. */
const FORMULARIOS_PAPAS = {
  foda: {nombre: 'OV1 4x4 papás', url: 'https://docs.google.com/forms/d/e/1FAIpQLSc-_mHyCq0BnKyetn36ACfCkKI4mUEyGKp9d7sCw_CEDr7DWw/viewform?usp=sharing'},
  disc: {nombre: 'OV2 4x4 papás', url: 'https://docs.google.com/forms/d/e/1FAIpQLSdT6pgFjY2k9auP_QK5o42NvM7wJKsN6IPpeOeAVFlN4tD4jQ/viewform?usp=sharing'},
  ruta: {nombre: 'Cuestionario para papás: ruta profesional', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeJ6-_rk0YAQvLJ7XEryvg5Xxgobg-sdx9ju0sE9xRlvZwjjg/viewform?usp=sharing'}
};
function esBachillerato(){
  const d = datosInfo();
  if(d.etapa) return d.etapa === ETAPAS[0];
  return ['Secundaria', 'Preparatoria o bachillerato'].includes(d.nivel);
}
function tarjetaPapas(id){
  const f = FORMULARIOS_PAPAS[id];
  if(!PROCESO.papas || !f || !esBachillerato()) return '';
  const d = datosInfo();
  const tutor = d.tutorNombre.trim();
  const p = PASOS.find(x => x.id === id);
  const cuerpo = 'Hola' + (tutor ? ' ' + tutor : '') + ':\n\nTerminé la fase de ' + p.nombre + ' de mi proceso Ágora en el Club de Mentes Brillantes. ' +
    '¿Me ayudas a contestar este cuestionario para papás? Es corto:\n\n' + f.url + '\n\nGracias.\n— ' + nombreCompleto(d);
  return '<div class="card" data-papas="' + id + '"><h3>Cuestionario para tu mamá, papá o tutor</h3>' +
    '<p style="margin-top:0;">Después de esta fase, el proceso Ágora le pide a tu familia contestar el cuestionario <strong>' + esc(f.nombre) + '</strong>. Mándaselo o ábranlo juntos.</p>' +
    '<div class="acciones">' +
      '<a class="secondary" href="' + esc(AG.mailto(correoValido(d.tutorCorreo) ? d.tutorCorreo.trim() : '', 'Cuestionario del proceso Ágora: ' + f.nombre, cuerpo)) + '">' + (tutor ? 'Mandárselo a ' + esc(tutor) : 'Mandarlo por correo') + '</a>' +
      '<a class="secondary" href="' + esc(f.url) + '" target="_blank" rel="noopener">Abrir el cuestionario</a>' +
    '</div></div>';
}

window.addEventListener('message', ev => {
  const marco = document.getElementById('marcoHerramienta');
  if(ev.origin !== location.origin || !marco || ev.source !== marco.contentWindow) return;
  const m = ev.data || {}, d = m.datos || {};
  if(m.cmbAgora === 'altura'){ marco.style.height = Math.max(200, Math.min(d.h || 0, 30000)) + 'px'; }
  else if(m.cmbAgora === 'arriba'){
    const y = marco.getBoundingClientRect().top + window.scrollY - 12;
    if(marco.getBoundingClientRect().top < 0) window.scrollTo({top: y, behavior: 'smooth'});
  }
  else if(m.cmbAgora === 'progreso'){ pintarRuta(); }
  else if(m.cmbAgora === 'resultado' && d.herramienta === 'disc' && pasoActual === 'disc'){
    const r = d.resultado || {};
    alTerminarFase('disc', {puntajes: r.puntajes, instrumento: 'agora', escala: r.escala, respuestas: r.respuestas || null,
      versionClave: r.versionClave, fecha: r.fecha, lectura: d.lectura, resultadoId: r.id});
  }
  else if(m.cmbAgora === 'completo' && d.herramienta === 'foda' && pasoActual === 'foda'){
    alTerminarFase('foda', d.foda || {});
  }
  else if(m.cmbAgora === 'borrado' && (d.herramienta === 'disc' || d.herramienta === 'foda')){
    if(E.pasos[d.herramienta]){ E.pasos[d.herramienta].completo = false; guardar(); }
    const av = document.getElementById('avisoFase'); if(av) av.innerHTML = '';
    pintarRuta();
  }
  else if(m.cmbAgora === 'ir'){
    const p = PASOS.find(x => x.id === d.fase);
    if(p && p.listo) abrir(p.id);
  }
});

/* ============================ FASES 4 A 10: PIEZAS COMUNES ============================
   Cada fase vive en su archivo (agora/fase4-estilo.js …) y recibe AG: lo que
   necesita saber de las fases anteriores y cómo guardar, completar y avisar.
   Ninguna fase escribe en localStorage por su cuenta ni manda nada al Club:
   eso pasa por AG.fijar y AG.terminar, con las mismas reglas que las fases 1 a 3. */
const cacheJSON = {};
function traerJSON(url){
  if(!cacheJSON[url]) cacheJSON[url] = fetch(url, {cache: 'no-store'}).then(r => r.ok ? r.json() : null).catch(() => null);
  return cacheJSON[url];
}
const AG = {
  esc, fechaLegible, lineas, leerLS,
  PASOS, PROCESO, UNIDAD,
  faltaMentor: id => faltaMentor(AG.paso(id)),
  mentor: id => (E.pasos[id] || {}).mentor || null,
  enProceso: id => !!AG.paso(id),
  paso: id => PASOS.find(p => p.id === id),
  info: () => datosInfo(),
  infoCompleta: () => !!(E.pasos.informacion && E.pasos.informacion.completo),
  nombre: () => nombreCompleto(datosInfo()),
  edad(){ const n = parseInt(datosInfo().edad, 10); return isNaN(n) ? null : n; },
  esMenor: () => esMenor(datosInfo()),
  /* El Perfil DISC de la fase 2, ya analizado. null si no está. */
  disc(){
    const r = leerLS('cmb_disc');
    if(!r || !r.puntajes || r.instrumento !== 'agora' || typeof DISC === 'undefined') return null;
    const escala = r.escala || {min: 0, max: 82};
    const a = DISC.analizar(r.puntajes, escala);
    return Object.assign({r, p: r.puntajes, escala}, a);
  },
  foda(){ const f = leerLS('cmb_foda'); return f && ['F','D','O','A'].some(k => lineas(f[k]).length) ? f : null; },
  estado: id => estadoPaso(AG.paso(id)),
  completa: id => estadoPaso(AG.paso(id)) === 'completo',
  datos(id){ const s = E.pasos[id]; return s && s.datos ? JSON.parse(JSON.stringify(s.datos)) : null; },
  fijar(id, datos){
    E.pasos[id] = Object.assign(E.pasos[id] || {}, {datos, actualizado: new Date().toISOString()});
    const ok = guardar(); pintarRuta(); return ok;
  },
  terminar: (id, envio) => alTerminarFase(id, envio),
  /* Lista de lo que falta, en el aviso de la fase. */
  faltan(lista){
    const av = document.getElementById('avisoFase');
    if(av) av.innerHTML = '<div class="aviso malo"><strong>Te falta:</strong> ' + lista.map(esc).join('; ') + '.</div>';
  },
  /* Si a la fase le falta algo de las anteriores, devuelve el aviso (html). */
  requiere(ids){
    const faltan = ids.filter(id => !AG.completa(id)).map(id => AG.paso(id));
    if(!faltan.length) return '';
    return '<div class="card"><h3>Antes de ' + (UNIDAD === 'paso' ? 'este paso' : 'esta fase') + '</h3><p style="margin-top:0;">Esta herramienta se arma con lo que contestaste antes. Te falta completar: ' +
      faltan.map(p => '<strong>' + esc(p.nombre) + '</strong>').join(', ') + '.</p><div class="acciones">' +
      faltan.map(p => '<button class="primary" type="button" data-abrir="' + p.id + '">Ir a ' + esc(p.nombre) + ' →</button>').join('') + '</div></div>';
  },
  conectar(raiz){ (raiz || document).querySelectorAll('[data-abrir]').forEach(b => { b.onclick = () => abrir(b.dataset.abrir); }); },
  abrir: id => abrir(id),
  /* Casillas: una lista de frases que la persona marca como suyas. */
  checks(grupo, items, marcados, nota){
    const m = marcados || [];
    return '<div class="opciones" data-grupo="' + grupo + '">' + items.map(t => {
      const txt = typeof t === 'string' ? t : t.texto, sub = typeof t === 'string' ? '' : (t.nota || '');
      return '<label class="check"><input type="checkbox" data-grupo="' + grupo + '" value="' + esc(txt) + '"' + (m.includes(txt) ? ' checked' : '') + '> <span>' + esc(txt) +
        (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></label>';
    }).join('') + '</div>' + (nota ? '<p class="note">' + nota + '</p>' : '');
  },
  marcados: (raiz, grupo) => [...raiz.querySelectorAll('input[data-grupo="' + grupo + '"]:checked')].map(x => x.value),
  radios(nombre, opciones, actual){
    return '<div class="radios">' + opciones.map(o => '<label><input type="radio" name="' + nombre + '" value="' + esc(o) + '"' + (o === actual ? ' checked' : '') + '> ' + esc(o) + '</label>').join('') + '</div>';
  },
  radio: (raiz, nombre) => { const r = raiz.querySelector('input[name="' + nombre + '"]:checked'); return r ? r.value : ''; },
  lista: items => items && items.length ? '<ul>' + items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '',
  vinetas: items => (items || []).map(x => '• ' + x).join('\n'),
  boton: (fase, completo, texto) => '<div id="avisoFase" aria-live="polite"></div><div class="acciones" style="margin-top:14px;">' +
    '<button type="button" class="primary" id="btnCompletar">' + (completo ? 'Guardar cambios' : (texto || 'Guardar y marcar como completa')) + '</button>' +
    '<span class="guardado" id="estadoGuardado"></span></div>',
  guardadoTxt(ok){ const g = document.getElementById('estadoGuardado'); if(g) g.textContent = ok ? 'Guardado en este dispositivo.' : 'No se pudo guardar en este navegador.'; },
  manifest: () => traerJSON('manifest.json'),
  sector: clave => traerJSON('data/sector_' + clave + '.json'),
  /* Correo armado por la persona misma (se abre su programa de correo). */
  mailto(para, asunto, cuerpo){
    const b = String(cuerpo || '').slice(0, 1800);
    return 'mailto:' + String(para || '').replace(/[^A-Za-z0-9._%+@-]/g, '') + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(b);
  },
  tutor(){ const d = datosInfo(); return {nombre: d.tutorNombre.trim(), correo: correoValido(d.tutorCorreo) ? d.tutorCorreo.trim() : '', parentesco: d.tutorParentesco}; },
  esBachillerato: () => esBachillerato(),
  tarjetaPapas: id => tarjetaPapas(id),
  FORMULARIOS_PAPAS,
  NO_SE
};

function pintarFaseExt(id){
  const p = AG.paso(id);
  document.body.classList.remove('con-documento');
  document.getElementById('contenido').innerHTML = '<div class="card">' + cabecera(p) + '</div><div id="cuerpoFase"></div>' +
    (p.mentor ? '<div id="cuerpoMentor"></div>' : '');
  const cuerpo = document.getElementById('cuerpoFase');
  FASES_EXT[herramientaDe(p)].pintar(cuerpo, AG, p);
  AG.conectar(cuerpo);
  if(p.mentor) pintarMentor(p);
}

/* ---- Revisión con el mentor ----
   Los pasos que DIANA pide "revisado por mentor y usuario" traen este recuadro.
   La persona anota que lo revisó con su mentor, quién y cuándo, y lo que el
   mentor le dijo. El paso puede completarse antes: queda "Falta mentor" en la
   ruta hasta que se marque. Se guarda con el paso y llega a su pestaña. */
function pintarMentor(p){
  const caja = document.getElementById('cuerpoMentor'); if(!caja) return;
  const m = Object.assign({nombre:'', fecha:'', comentarios:'', revisado:false}, (E.pasos[p.id] || {}).mentor || {});
  caja.innerHTML = '<div class="card mentor-card"><h3>Revisión con tu mentor</h3>' +
    '<p class="note" style="margin-top:0;">Este paso se revisa con tu mentor. Cuando lo hayan visto juntos, anótalo aquí.</p>' +
    '<div class="grid dos">' +
      '<div class="campo"><label for="f_mentor_nombre">Nombre de tu mentor</label><input id="f_mentor_nombre" value="' + esc(m.nombre) + '"></div>' +
      '<div class="campo"><label for="f_mentor_fecha">Fecha de la revisión</label><input id="f_mentor_fecha" type="date" value="' + esc(m.fecha) + '"></div>' +
      '<div class="campo ancho"><label for="f_mentor_com">Lo que te dijo tu mentor (comentarios, ajustes, acuerdos)</label><textarea id="f_mentor_com" rows="3">' + esc(m.comentarios) + '</textarea></div>' +
    '</div>' +
    '<label class="check"><input type="checkbox" id="f_mentor_ok"' + (m.revisado ? ' checked' : '') + '> <span>Mi mentor y yo revisamos este paso.</span></label>' +
    '<div id="avisoMentor" aria-live="polite"></div>' +
    '<div class="acciones"><button type="button" class="secondary" id="btnMentor">Guardar revisión</button></div></div>';
  const leerM = () => ({nombre: caja.querySelector('#f_mentor_nombre').value.trim(), fecha: caja.querySelector('#f_mentor_fecha').value,
    comentarios: caja.querySelector('#f_mentor_com').value, revisado: caja.querySelector('#f_mentor_ok').checked});
  caja.querySelector('#btnMentor').onclick = async () => {
    const x = leerM(), av = caja.querySelector('#avisoMentor');
    if(x.revisado && (!x.nombre || !x.fecha)){ av.innerHTML = '<div class="aviso malo">Para marcarlo como revisado, anota el nombre de tu mentor y la fecha.</div>'; return; }
    E.pasos[p.id] = Object.assign(E.pasos[p.id] || {}, {mentor: x});
    guardar(); pintarRuta();
    let msg = x.revisado ? 'Revisión guardada.' : 'Guardado. Cuando lo revisen, marca la casilla.';
    const s = E.pasos[p.id];
    if(s.completo && s.envio && E.consentimiento.acepta){
      const r = await enviarPaso(p.id, s.envio);
      if(r.ok) msg += ' Tu expediente quedó actualizado.';
    }
    av.innerHTML = '<div class="aviso bien">' + msg + '</div>';
  };
}
function hojaMentor(id){
  const m = (E.pasos[id] || {}).mentor;
  if(!m) return {};
  return {'Mentor': m.nombre || '', 'Revisión del mentor': m.revisado ? (m.fecha || 'Sí') : 'Pendiente', 'Comentarios del mentor': m.comentarios || ''};
}

/* ---- Pasos todavía no construidos ---- */
function pintarProximamente(id){
  const p = PASOS.find(x => x.id === id);
  document.getElementById('contenido').innerHTML = '<div class="card">' + cabecera(p) + '</div>' +
    '<div class="card proximamente-card"><div class="icono">◷</div><h2>Próximamente</h2><p>Esta herramienta todavía se está construyendo.</p></div>';
}

const HERRAMIENTAS = {informacion: pintarInformacion};
PASOS.forEach(p => { if(!HERRAMIENTAS[p.id] && p.marco) HERRAMIENTAS[p.id] = () => pintarMarco(p.id); });
PASOS.forEach(p => { if(!HERRAMIENTAS[p.id] && FASES_EXT[herramientaDe(p)]) HERRAMIENTAS[p.id] = () => pintarFaseExt(p.id); });
PASOS.forEach(p => { if(!HERRAMIENTAS[p.id]) HERRAMIENTAS[p.id] = () => pintarProximamente(p.id); });

/* ---- Arranque ---- */
(async function iniciar(){
  try{
    const m = await fetch('manifest.json', {cache: 'no-store'}).then(r => r.json());
    if(m && Array.isArray(m.sectores) && m.sectores.length) SECTORES = m.sectores.map(s => s.nombre);
  }catch(e){ /* sin manifiesto se usa la lista de respaldo */ }
  // Abre la primera fase disponible que no esté completa.
  // agora.html#disc (o diana.html#mapa) abre directo esa fase o paso.
  const pedido = PASOS.find(p => p.listo && '#' + p.id === location.hash);
  const siguiente = pedido || PASOS.find(p => p.listo && estadoPaso(p) !== 'completo') || PASOS[0];
  pasoActual = siguiente.id;
  // En pantallas angostas la lista de fases empieza plegada para que la
  // herramienta quede a la vista.
  if(window.matchMedia && window.matchMedia('(max-width: 900px)').matches) document.getElementById('plegable').open = false;
  pintarRuta();
  HERRAMIENTAS[pasoActual]();
})();
