/**
 * Bolsa de trabajo del Club — Apps Script
 * Club de Mentes Brillantes
 *
 * Lo usan dos páginas del sitio:
 *   vacantes.html   el postulante ve las vacantes abiertas, se postula con su
 *                   CV y recibe por correo el enlace a su Perfil DISC.
 *   empleador.html  la empresa entra con su clave, crea vacantes (con el mismo
 *                   flujo de Comparación de CVs) y ve llegar las postulaciones
 *                   con el DISC de cada persona.
 * Y disc-agora.html?postulacion=<token> manda aquí el DISC terminado.
 *
 * Se instala ligado a una hoja nueva ("Bolsa de trabajo del Club (uso
 * interno)"), aparte de las demás: así se puede compartir con quien atiende
 * a las empresas sin darle los CVs del sitio ni las cuentas.
 *
 * CLAVES DE EMPRESA. No se guardan: solo un hash con la "pimienta" del script
 * (propiedad PIMIENTA). Se dan de alta desde la hoja: menú Bolsa del Club →
 * Dar de alta una empresa. La clave se muestra UNA vez; si se pierde, se
 * genera otra con "Nueva clave para la empresa seleccionada".
 *
 * INSTALACIÓN (una vez)
 *   1. Crea la hoja, Extensiones → Apps Script, pega este código y guarda.
 *   2. Ejecuta instalar() y autoriza (hoja, correo y caché).
 *   3. Implementar → Nueva implementación → Aplicación web. Ejecutar como: yo;
 *      Acceso: cualquier persona. Pega la URL .../exec en bolsa.js
 *      (constante URL_BOLSA).
 *   4. Recarga la hoja: aparece el menú "Bolsa del Club" para dar de alta
 *      empresas.
 *
 * LÍMITES. Los correos salen de la cuenta del Club: 100 al día con Gmail,
 * compartidos con lo demás que mande esa cuenta. Si se agota, la postulación
 * se guarda igual y la página le da al postulante su enlace al DISC.
 */

var URL_SITIO = 'https://soportetimentesbrillantes-afk.github.io/monitoreo-mercado-laboral-dashboard/';
var CORREO_CLUB = 'clubmentesbrillantesla@gmail.com';

function instalar() {
  var p = PropertiesService.getScriptProperties();
  if (!p.getProperty('PIMIENTA')) p.setProperty('PIMIENTA', Utilities.getUuid() + Utilities.getUuid());
  var ss = libro_();
  Object.keys(COLS).forEach(function (k) { hoja_(ss, k); });
  var l = ss.getSheetByName('Léeme') || ss.insertSheet('Léeme', 0);
  l.clear();
  l.getRange(1, 1, 7, 1).setValues([
    ['Bolsa de trabajo del Club (uso interno)'],
    ['Empresas: una fila por empresa. La clave no está aquí, solo su hash. Menú Bolsa del Club para dar de alta y cambiar claves.'],
    ['Vacantes: las crea cada empresa en empleador.html. Público = lo que ve el postulante; Configuración = rúbrica y filtro ATS.'],
    ['Postulaciones: una fila por persona y vacante. Nombre y contacto van en sus columnas; la empresa compara el CV sin ellos.'],
    ['DISC: llega cuando la persona termina su Perfil DISC desde el enlace del correo. Es informativo: no cambia el ranking.'],
    ['Para borrar los datos de una persona, borra su fila de Postulaciones.'],
    ['Las páginas: vacantes.html (postulantes) y empleador.html (empresas), en el sitio del monitoreo.']
  ]);
  l.getRange(1, 1).setFontWeight('bold');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Bolsa del Club')
    .addItem('Dar de alta una empresa', 'altaEmpresa')
    .addItem('Nueva clave para la empresa seleccionada', 'nuevaClave')
    .addToUi();
}

var COLS = {
  'Empresas': ['ID', 'Empresa', 'Correo de contacto', 'Activa', 'Alta', 'Hash de la clave'],
  'Vacantes': ['ID', 'Empresa ID', 'Empresa', 'Puesto', 'Estado', 'Creada', 'Actualizada', 'Postulaciones', 'Público', 'Configuración'],
  'Postulaciones': ['ID', 'Vacante ID', 'Empresa ID', 'Fecha', 'Nombre', 'Correo', 'Teléfono', 'Ciudad', 'CV', 'Token DISC',
    'Correo DISC', 'DISC', 'DISC fecha', 'DISC resultado', 'Contacto visto', 'Acepta']
};

/* ------------------------------ alta de empresas ------------------------------ */
function altaEmpresa() {
  var ui = SpreadsheetApp.getUi();
  var n = ui.prompt('Dar de alta una empresa', 'Nombre de la empresa:', ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK || !n.getResponseText().trim()) return;
  var c = ui.prompt('Dar de alta una empresa', 'Correo de contacto de la empresa (opcional):', ui.ButtonSet.OK_CANCEL);
  if (c.getSelectedButton() !== ui.Button.OK) return;
  var r = crearEmpresa_(n.getResponseText().trim(), c.getResponseText().trim());
  ui.alert('Empresa dada de alta',
    'Empresa: ' + r.nombre + '\n\nClave: ' + r.clave + '\n\nCópiala y entrégasela a la empresa por un canal privado. ' +
    'No se vuelve a mostrar: en la hoja solo queda su hash.\n\nLa empresa entra en ' + URL_SITIO + 'empleador.html', ui.ButtonSet.OK);
}
/* Sin menú (script que no está ligado a la hoja): escribe aquí el nombre y
   el correo, elige altaEmpresaDesdeEditor arriba y dale a Ejecutar. La clave
   sale en el Registro de ejecución, una sola vez. */
var EMPRESA_NUEVA = { nombre: '', correo: '' };
function altaEmpresaDesdeEditor() {
  if (!EMPRESA_NUEVA.nombre.trim()) throw new Error('Escribe el nombre en EMPRESA_NUEVA (arriba de esta función) y guarda.');
  var r = crearEmpresa_(EMPRESA_NUEVA.nombre.trim(), EMPRESA_NUEVA.correo.trim());
  Logger.log('Empresa: ' + r.nombre + '\nClave: ' + r.clave + '\nCópiala ahora: no se vuelve a mostrar. La empresa entra en ' + URL_SITIO + 'empleador.html');
}

function nuevaClave() {
  var ui = SpreadsheetApp.getUi(), h = SpreadsheetApp.getActiveSheet();
  if (h.getName() !== 'Empresas' || h.getActiveRange().getRow() < 2) { ui.alert('Selecciona la fila de la empresa en la pestaña Empresas.'); return; }
  var fila = h.getActiveRange().getRow();
  var clave = claveNueva_();
  h.getRange(fila, COLS['Empresas'].indexOf('Hash de la clave') + 1).setValue(hashClave_(clave));
  ui.alert('Nueva clave', 'Empresa: ' + h.getRange(fila, 2).getValue() + '\n\nClave nueva: ' + clave + '\n\nLa anterior ya no sirve.', ui.ButtonSet.OK);
}
function crearEmpresa_(nombre, correo) {
  var clave = claveNueva_(), id = 'e' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  hoja_(libro_(), 'Empresas').appendRow([id, txt_(nombre, 120), txt_(correo, 120), 'sí', new Date(), hashClave_(clave)]);
  return { id: id, nombre: nombre, clave: clave };
}
/* 4 grupos de 4 letras y números sin los que se confunden (0/O, 1/l/I). */
function claveNueva_() {
  var abc = 'abcdefghjkmnpqrstuvwxyz23456789', s = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''), out = '';
  for (var i = 0; i < 16; i++) { out += abc.charAt(parseInt(s.substr(i * 2, 2), 16) % abc.length); if (i % 4 === 3 && i < 15) out += '-'; }
  return out;
}
function hashClave_(clave) {
  var pim = PropertiesService.getScriptProperties().getProperty('PIMIENTA') || '';
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(clave).trim().toLowerCase() + '|' + pim, Utilities.Charset.UTF_8);
  return b.map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('');
}

/* ------------------------------ entrada ------------------------------ */
function doGet() {
  return ContentService.createTextOutput('Servicio de la bolsa de trabajo del Club. Se usa desde las páginas del sitio.');
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'formato' }); }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return json_({ ok: false, error: 'ocupado' });
  try {
    var ss = libro_();
    switch (d.accion) {
      // Públicas: postulantes
      case 'vacantes':           return json_(vacantesPublicas_(ss));
      case 'postular':           return json_(postular_(ss, d));
      case 'postulacion-info':   return json_(postulacionInfo_(ss, d));
      case 'postulacion-disc':   return json_(postulacionDisc_(ss, d));
    }
    // De empresa: con su clave
    var emp = empresaPorClave_(ss, d.clave);
    if (emp.error) return json_({ ok: false, error: emp.error });
    switch (d.accion) {
      case 'empresa-entrar':        return json_(empresaEntrar_(ss, emp));
      case 'empresa-vacante':       return json_(guardarVacante_(ss, emp, d));
      case 'empresa-postulaciones': return json_(postulacionesEmpresa_(ss, emp, d));
      case 'empresa-contacto':      return json_(contacto_(ss, emp, d));
      case 'empresa-reenviar-disc': return json_(reenviarDisc_(ss, emp, d));
    }
    return json_({ ok: false, error: 'accion' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err).slice(0, 200) });
  } finally {
    lock.releaseLock();
  }
}

/* 20 claves equivocadas seguidas bloquean 10 minutos, para todos. */
function empresaPorClave_(ss, clave) {
  var cache = CacheService.getScriptCache(), fallos = Number(cache.get('fallos') || 0);
  if (fallos >= 20) return { error: 'bloqueado' };
  if (typeof clave !== 'string' || clave.length < 8) { cache.put('fallos', String(fallos + 1), 600); return { error: 'clave' }; }
  var h = hashClave_(clave);
  var e = filas_(ss, 'Empresas').filter(function (r) { return String(r['Hash de la clave']) === h; })[0];
  if (!e) { cache.put('fallos', String(fallos + 1), 600); return { error: 'clave' }; }
  if (!siNo_(e['Activa'])) return { error: 'inactiva' };
  return { id: String(e['ID']), nombre: String(e['Empresa']) };
}

/* ------------------------------ postulantes ------------------------------ */
function publicoDe_(r) {
  var p = {}; try { p = JSON.parse(String(r['Público'] || '{}')); } catch (e) { p = {}; }
  return {
    id: String(r['ID']), empresa: String(r['Empresa']), puesto: String(r['Puesto']),
    ciudad: String(p.ciudad || ''), modalidad: String(p.modalidad || ''), sueldo: String(p.sueldo || ''),
    sector: String(p.sector || ''), descripcion: String(p.descripcion || ''), requisitos: String(p.requisitos || ''),
    cierre: String(p.cierre || ''), publicada: fecha_(r['Creada'])
  };
}
function abierta_(r) {
  if (String(r['Estado']) !== 'abierta') return false;
  var p = publicoDe_(r);
  return !p.cierre || p.cierre >= hoy_();
}
function vacantesPublicas_(ss) {
  return { ok: true, vacantes: filas_(ss, 'Vacantes').filter(abierta_).map(publicoDe_).reverse() };
}

function postular_(ss, d) {
  if (d.acepta !== true) return { ok: false, error: 'consentimiento' };
  var correo = String(d.correo || '').trim().toLowerCase(), nombre = String(d.nombre || '').trim();
  var cv = String(d.cv || '').trim();
  if (nombre.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { ok: false, error: 'datos' };
  if (cv.length < 80) return { ok: false, error: 'cv' };
  var cache = CacheService.getScriptCache(), k = 'p:' + correo, n = Number(cache.get(k) || 0);
  if (n >= 10) return { ok: false, error: 'limite' };         // 10 postulaciones por correo por hora
  cache.put(k, String(n + 1), 3600);

  var vac = filas_(ss, 'Vacantes').filter(function (r) { return String(r['ID']) === String(d.vacanteId); })[0];
  if (!vac || !abierta_(vac)) return { ok: false, error: 'cerrada' };
  var hp = hoja_(ss, 'Postulaciones');
  var previa = filas_(ss, 'Postulaciones').filter(function (r) { return String(r['Vacante ID']) === String(vac['ID']) && String(r['Correo']).toLowerCase() === correo; })[0];
  var token = previa ? String(previa['Token DISC']) : Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  var id = previa ? String(previa['ID']) : 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  var valores = [id, String(vac['ID']), String(vac['Empresa ID']), new Date(), txt_(nombre, 120), txt_(correo, 120), txt_(d.telefono, 40), txt_(d.ciudad, 80),
    txt_(cv, 30000), token, '', previa ? previa['DISC'] : 'pendiente', previa ? previa['DISC fecha'] : '', previa ? previa['DISC resultado'] : '', '', 'sí'];
  if (previa) hp.getRange(previa._fila, 1, 1, valores.length).setValues([valores]);   // vuelve a postularse: se actualiza su CV
  else {
    hp.appendRow(valores);
    var hv = hoja_(ss, 'Vacantes');
    hv.getRange(vac._fila, COLS['Vacantes'].indexOf('Postulaciones') + 1).setValue((Number(vac['Postulaciones']) || 0) + 1);
  }
  var enviado = previa && String(previa['DISC']) === 'hecho' ? 'ya' : mandarDisc_(ss, { nombre: nombre, correo: correo, token: token }, vac);
  return { ok: true, id: id, token: token, correoDisc: enviado, actualizada: !!previa, discHecho: previa && String(previa['DISC']) === 'hecho' };
}

function enlaceDisc_(token) { return URL_SITIO + 'disc-agora.html?postulacion=' + encodeURIComponent(token); }
function mandarDisc_(ss, p, vac) {
  try {
    if (MailApp.getRemainingDailyQuota() < 1) return 'cuota';
    var nombre = String(p.nombre).split(/\s+/)[0];
    var enlace = enlaceDisc_(p.token);
    MailApp.sendEmail({
      to: p.correo, name: 'Club de Mentes Brillantes', replyTo: CORREO_CLUB,
      subject: 'Tu Perfil DISC para la vacante de ' + vac['Puesto'],
      body: 'Hola ' + nombre + ':\n\nRecibimos tu postulación a ' + vac['Puesto'] + ' en ' + vac['Empresa'] + '.\n\n' +
        'El siguiente paso es tu Perfil DISC, un cuestionario de unos 20 minutos sobre tu estilo de trabajo. ' +
        'No hay respuestas buenas ni malas, y no se usa para descartarte: le ayuda a la empresa a conocer cómo te gusta trabajar.\n\n' +
        'Hazlo aquí: ' + enlace + '\n\nSi no te postulaste, ignora este correo.\n\nClub de Mentes Brillantes',
      htmlBody: '<p>Hola ' + esc_(nombre) + ':</p><p>Recibimos tu postulación a <strong>' + esc_(vac['Puesto']) + '</strong> en ' + esc_(vac['Empresa']) + '.</p>' +
        '<p>El siguiente paso es tu <strong>Perfil DISC</strong>, un cuestionario de unos 20 minutos sobre tu estilo de trabajo. No hay respuestas buenas ni malas, y no se usa para descartarte: le ayuda a la empresa a conocer cómo te gusta trabajar.</p>' +
        '<p><a href="' + enlace + '">Hacer mi Perfil DISC</a></p><p style="color:#666;font-size:12px">Si no te postulaste, ignora este correo.</p><p>Club de Mentes Brillantes</p>'
    });
    var f = filas_(ss, 'Postulaciones').filter(function (r) { return String(r['Token DISC']) === String(p.token); })[0];
    if (f) hoja_(ss, 'Postulaciones').getRange(f._fila, COLS['Postulaciones'].indexOf('Correo DISC') + 1).setValue(new Date());
    return 'enviado';
  } catch (e) { return 'error'; }
}

function porToken_(ss, token) {
  if (!/^[a-f0-9]{30,48}$/.test(String(token || ''))) return null;
  return filas_(ss, 'Postulaciones').filter(function (r) { return String(r['Token DISC']) === String(token); })[0] || null;
}
function postulacionInfo_(ss, d) {
  var p = porToken_(ss, d.token);
  if (!p) return { ok: false, error: 'token' };
  var vac = filas_(ss, 'Vacantes').filter(function (r) { return String(r['ID']) === String(p['Vacante ID']); })[0] || {};
  return { ok: true, puesto: String(vac['Puesto'] || ''), empresa: String(vac['Empresa'] || ''), nombre: String(p['Nombre']).split(/\s+/)[0], discHecho: String(p['DISC']) === 'hecho' };
}
function postulacionDisc_(ss, d) {
  var p = porToken_(ss, d.token);
  if (!p) return { ok: false, error: 'token' };
  var r = d.disc || {}, pts = r.puntajes || {};
  var ok = ['D', 'I', 'S', 'C'].every(function (k) { return pts[k] && isFinite(Number(pts[k].neto)); });
  if (!ok) return { ok: false, error: 'disc' };
  var limpio = {
    puntajes: { D: { neto: Number(pts.D.neto) }, I: { neto: Number(pts.I.neto) }, S: { neto: Number(pts.S.neto) }, C: { neto: Number(pts.C.neto) } },
    dominante: /^[DISC]$/.test(r.dominante) ? r.dominante : '', segundo: /^[DISC]$/.test(r.segundo) ? r.segundo : '',
    lectura: ['dominante claro', 'empate', 'parejo'].indexOf(r.lectura) >= 0 ? r.lectura : '',
    instrumento: r.instrumento === 'bloques' ? 'bloques' : 'agora', escala: r.escala || null,
    versionClave: String(r.versionClave || '').slice(0, 80), respuestas: r.respuestas || null
  };
  var datos = JSON.stringify(limpio);
  if (datos.length > 40000) return { ok: false, error: 'disc' };
  var h = hoja_(ss, 'Postulaciones'), c = COLS['Postulaciones'];
  h.getRange(p._fila, c.indexOf('DISC') + 1, 1, 3).setValues([['hecho', new Date(), datos]]);
  return { ok: true };
}

/* ------------------------------ empresas ------------------------------ */
function vacantesDe_(ss, emp) {
  return filas_(ss, 'Vacantes').filter(function (r) { return String(r['Empresa ID']) === emp.id; });
}
function empresaEntrar_(ss, emp) {
  var posts = filas_(ss, 'Postulaciones');
  return { ok: true, empresa: emp, vacantes: vacantesDe_(ss, emp).map(function (r) {
    var conf = {}; try { conf = JSON.parse(String(r['Configuración'] || '{}')); } catch (e) { conf = {}; }
    var mias = posts.filter(function (p) { return String(p['Vacante ID']) === String(r['ID']); });
    return Object.assign(publicoDe_(r), { estado: String(r['Estado']), actualizada: fecha_(r['Actualizada']), config: conf,
      postulaciones: mias.length, conDisc: mias.filter(function (p) { return String(p['DISC']) === 'hecho'; }).length });
  }).reverse() };
}

function guardarVacante_(ss, emp, d) {
  var v = d.vacante || {}, pub = v.publico || {}, conf = v.config || {};
  if (!String(v.puesto || '').trim()) return { ok: false, error: 'puesto' };
  var publico = JSON.stringify({ ciudad: txtPlano_(pub.ciudad, 80), modalidad: txtPlano_(pub.modalidad, 40), sueldo: txtPlano_(pub.sueldo, 80),
    sector: txtPlano_(pub.sector, 40), descripcion: txtPlano_(pub.descripcion, 3000), requisitos: txtPlano_(pub.requisitos, 2000),
    cierre: /^\d{4}-\d{2}-\d{2}$/.test(String(pub.cierre || '')) ? pub.cierre : '' });
  var config = JSON.stringify({ vacante: conf.vacante || null, ats: conf.ats || null });
  if (config.length > 45000) return { ok: false, error: 'grande' };
  var estado = ['abierta', 'pausada', 'cerrada'].indexOf(v.estado) >= 0 ? v.estado : 'abierta';
  var h = hoja_(ss, 'Vacantes');
  var prev = v.id ? vacantesDe_(ss, emp).filter(function (r) { return String(r['ID']) === String(v.id); })[0] : null;
  if (v.id && !prev) return { ok: false, error: 'vacante' };     // no es suya
  var id = prev ? String(prev['ID']) : 'v' + Utilities.getUuid().replace(/-/g, '').slice(0, 10);
  var valores = [id, emp.id, txt_(emp.nombre, 120), txt_(v.puesto, 120), estado, prev ? prev['Creada'] : new Date(), new Date(),
    prev ? prev['Postulaciones'] : 0, publico, config];
  if (prev) h.getRange(prev._fila, 1, 1, valores.length).setValues([valores]);
  else h.appendRow(valores);
  return { ok: true, id: id };
}

/* El CV va con el nombre para que la página lo oculte antes de compararlo;
   correo y teléfono NO van: se piden aparte (contacto_) y queda registrado. */
function postulacionesEmpresa_(ss, emp, d) {
  var vac = vacantesDe_(ss, emp).filter(function (r) { return String(r['ID']) === String(d.vacanteId); })[0];
  if (!vac) return { ok: false, error: 'vacante' };
  return { ok: true, postulaciones: filas_(ss, 'Postulaciones').filter(function (p) { return String(p['Vacante ID']) === String(vac['ID']); }).map(function (p) {
    var disc = null;
    if (String(p['DISC']) === 'hecho') { try { var x = JSON.parse(String(p['DISC resultado'] || '{}')); disc = { puntajes: x.puntajes, dominante: x.dominante, segundo: x.segundo, lectura: x.lectura, fecha: fecha_(p['DISC fecha']) }; } catch (e) { disc = null; } }
    return { id: String(p['ID']), fecha: fecha_(p['Fecha']), nombre: String(p['Nombre']), cv: String(p['CV']), disc: disc,
      discEstado: String(p['DISC'] || 'pendiente'), correoDisc: fecha_(p['Correo DISC']) };
  }) };
}
function postDeEmpresa_(ss, emp, id) {
  var p = filas_(ss, 'Postulaciones').filter(function (r) { return String(r['ID']) === String(id); })[0];
  return p && String(p['Empresa ID']) === emp.id ? p : null;
}
function contacto_(ss, emp, d) {
  var p = postDeEmpresa_(ss, emp, d.postId);
  if (!p) return { ok: false, error: 'postulacion' };
  hoja_(ss, 'Postulaciones').getRange(p._fila, COLS['Postulaciones'].indexOf('Contacto visto') + 1).setValue(new Date());
  return { ok: true, nombre: String(p['Nombre']), correo: String(p['Correo']), telefono: String(p['Teléfono']), ciudad: String(p['Ciudad']) };
}
function reenviarDisc_(ss, emp, d) {
  var p = postDeEmpresa_(ss, emp, d.postId);
  if (!p) return { ok: false, error: 'postulacion' };
  if (String(p['DISC']) === 'hecho') return { ok: true, correoDisc: 'ya' };
  var vac = filas_(ss, 'Vacantes').filter(function (r) { return String(r['ID']) === String(p['Vacante ID']); })[0];
  return { ok: true, correoDisc: mandarDisc_(ss, { nombre: p['Nombre'], correo: p['Correo'], token: p['Token DISC'] }, vac) };
}

/* ------------------------------ utilidades ------------------------------ */
// Vacío = la hoja a la que está ligado el script. Si el script se creó aparte
// (en script.google.com), pon aquí el ID de la hoja: lo que va entre /d/ y /edit en su dirección.
var HOJA_ID = '';
function libro_() { return HOJA_ID ? SpreadsheetApp.openById(HOJA_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
function hoja_(ss, nombre) {
  var h = ss.getSheetByName(nombre);
  if (!h) { h = ss.insertSheet(nombre); h.appendRow(COLS[nombre]); h.setFrozenRows(1); h.getRange(1, 1, 1, COLS[nombre].length).setFontWeight('bold'); }
  return h;
}
function filas_(ss, nombre) {
  var h = hoja_(ss, nombre);
  if (h.getLastRow() < 2) return [];
  var v = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues(), enc = v[0];
  return v.slice(1).map(function (r, i) { var o = { _fila: i + 2 }; enc.forEach(function (c, j) { o[c] = r[j]; }); return o; });
}
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
/* Texto para una celda: nunca como fórmula. */
function txt_(v, max) { var s = String(v == null ? '' : v).slice(0, max || 500); return /^[=+\-@]/.test(s) ? "'" + s : s; }
/* Texto que va dentro de un JSON (no es celda): solo se recorta. */
function txtPlano_(v, max) { return String(v == null ? '' : v).slice(0, max || 500); }
function esc_(v) { return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function siNo_(v) { return v === true || /^(s[ií]|si|yes|1|true|x)$/i.test(String(v == null ? '' : v).trim()); }
function hoy_() { return Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd'); }
function fecha_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, 'America/Mexico_City', 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}
