/**
 * Rastreo de convocatorias de fondeo — Apps Script
 * Club de Mentes Brillantes (uso interno del equipo)
 *
 * Proyecto de Apps Script independiente que escribe en la hoja "Rastreo de
 * convocatorias (uso interno)" de la cuenta del Club (HOJA_ID, abajo). La
 * página convocatorias.html del sitio lee y escribe aquí. El ID de la hoja no
 * es secreto: la hoja solo la abren las cuentas con las que se comparte.
 *
 * LA CLAVE DEL EQUIPO NO ESTÁ EN ESTE ARCHIVO NI EN EL SITIO. Vive en las
 * propiedades del script (Configuración del proyecto → Propiedades del
 * script → CLAVE_EQUIPO). Quien no la tiene no puede leer ni escribir nada.
 * Para cambiarla basta con editar esa propiedad: no hay que volver a publicar.
 *
 * Instalación (una vez):
 *   1. Pega este código y guarda.
 *   2. Ejecuta instalar() (primera función del archivo) y autoriza.
 *   3. Configuración del proyecto → Propiedades del script → agrega
 *      CLAVE_EQUIPO con una frase larga que el equipo conozca.
 *   4. Implementar → Nueva implementación → Aplicación web, Ejecutar como: yo,
 *      Acceso: cualquier persona. Copia la URL .../exec en convocatorias.html
 *      (constante URL_RASTREO).
 *
 * Qué guarda cada pestaña
 *   Convocatorias  una fila por convocatoria; las primeras columnas son para
 *                  leer en la hoja y la última (Datos) es la ficha completa
 *                  que usa la página. Si editas la hoja a mano, edita Datos.
 *   Fuentes        el directorio del documento "Sistema de rastreo". Se puede
 *                  editar aquí directo: la página solo lo lee.
 *   Canales        canales de revisión; la página anota la última revisión.
 *   Alertas        feeds RSS o Atom (Google Alerts, agregadores) que el
 *                  rastreo automático lee cada mañana. Se editan aquí.
 *
 * Automatización (versión 2, 2026-11-26) — una vez, después de instalar():
 *   5. Ejecuta instalarAutomatizacion() y autoriza (pide leer páginas
 *      externas, leer el correo del Club y mandar correos).
 *   6. Propiedades del script → CORREOS_AVISO: correos que reciben el resumen
 *      diario, separados por coma.
 *   7. Pega en la pestaña Alertas la URL del feed de cada Google Alert
 *      (al crear la alerta: "Enviar a" → "Feed RSS").
 *   8. Opcional: en Gmail, filtra los boletines (CEMEFI, BID Lab, POSiBLE,
 *      Fundación BBVA, convocatoriasmexico.com) a la etiqueta "Convocatorias".
 *   Después: Implementar → Gestionar implementaciones → editar → Versión nueva
 *   (la URL no cambia), para que el botón "Buscar ahora" de la página sirva.
 *
 *   Qué hace solo, cada mañana (rastrearAutomatico, 7:00):
 *     - Lee los feeds de Alertas y el correo con etiqueta "Convocatorias", y
 *       registra como "Detectada" lo que parezca convocatoria y no esté ya
 *       (compara enlace y nombre). Propone área temática, fecha de cierre y
 *       monto si vienen en el texto; el equipo los confirma.
 *     - Descarta solas las que cierran en menos de 15 días desde la detección
 *       (filtro 4.1) y las que ya cerraron sin haber pasado a "Aplicando".
 *   Y en días hábiles (avisoDiario, 8:00) manda a CORREOS_AVISO el resumen:
 *   nuevas, plazos vencidos del flujo, decisiones pendientes y canales por
 *   revisar.
 */

function instalar() {
  var ss = libro_();
  hoja_(ss, 'Convocatorias', COLS_CONV);
  var f = hoja_(ss, 'Fuentes', COLS_FUENTES);
  var k = hoja_(ss, 'Canales', COLS_CANALES);
  var al = hoja_(ss, 'Alertas', COLS_ALERTAS);
  if (al.getLastRow() < 2) ALERTAS_INICIALES.forEach(function (x) { al.appendRow(x); });
  if (f.getLastRow() < 2) FUENTES_INICIALES.forEach(function (x, i) {
    f.appendRow([x[1], x[0], x[2], x[3], x[4], x[5], i + 1, x[6] || '']);
  });
  if (k.getLastRow() < 2) CANALES_INICIALES.forEach(function (x, i) {
    k.appendRow([x[0], x[1], x[2], x[3] || '', x[4], x[5], x[6] || '', i + 1, '', '']);
  });
  var l = ss.getSheetByName('Léeme') || ss.insertSheet('Léeme', 0);
  l.clear();
  l.getRange(1, 1, 8, 1).setValues([
    ['Rastreo de convocatorias de fondeo (uso interno del Club)'],
    ['La página del equipo es convocatorias.html en el sitio del monitoreo. Pide la clave del equipo.'],
    ['Convocatorias: una fila por convocatoria. La columna Datos es la ficha completa; las demás son para leer.'],
    ['Fuentes: el directorio de fuentes. Se edita aquí; la página solo lo lee.'],
    ['Canales: canales de revisión con su frecuencia. La página anota la última revisión.'],
    ['La clave está en Configuración del proyecto → Propiedades del script → CLAVE_EQUIPO.'],
    ['Alertas: feeds RSS/Atom que el rastreo automático lee cada mañana. Pega la URL y pon Activa = sí.'],
    ['Lo que entra solo trae Origen = automático en su ficha; el equipo confirma área, cierre y monto.']
  ]);
  l.getRange(1, 1).setFontWeight('bold');
}

/* La hoja del rastreo. Vacío = la hoja a la que esté ligado el script. */
var HOJA_ID = '1R1-fKA3Xjky9nCyGuTYE0fYN_4hmSbjmm84tIIj_MpU';
function libro_() { return HOJA_ID ? SpreadsheetApp.openById(HOJA_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

var COLS_CONV = ['ID', 'Nombre', 'Fuente', 'Estatus', 'Área temática', 'Cierre', 'Monto estimado', 'Puntaje', 'Responsable', 'Actualizado', 'Actualizado por', 'Datos'];
var COLS_FUENTES = ['ID', 'Categoría', 'Institución', 'Programa', 'Tipo de apoyo', 'Portal', 'Orden', 'Nota de la categoría'];
var COLS_CANALES = ['ID', 'Canal', 'Frecuencia', 'Cada (días)', 'Responsable', 'Qué buscar', 'Enlace', 'Orden', 'Última revisión', 'Revisado por'];
var COLS_ALERTAS = ['ID', 'Nombre', 'Feed (RSS o Atom)', 'Activa', 'Última lectura', 'Nuevas', 'Último error'];
var CATEGORIAS = ['federal', 'fundaciones', 'internacionales', 'empresas', 'universidades'];

function doGet() {
  return ContentService.createTextOutput('Servicio del rastreo de convocatorias del Club. Se usa desde la página del equipo.');
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'formato' }); }
  var cache = CacheService.getScriptCache();
  var fallos = Number(cache.get('fallos') || 0);
  if (fallos >= 20) return json_({ ok: false, error: 'bloqueado' });
  var clave = PropertiesService.getScriptProperties().getProperty('CLAVE_EQUIPO');
  if (!clave) return json_({ ok: false, error: 'sin clave configurada' });
  if (typeof d.clave !== 'string' || d.clave !== clave) {
    cache.put('fallos', String(fallos + 1), 600);
    return json_({ ok: false, error: 'clave' });
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return json_({ ok: false, error: 'ocupado' });
  try {
    var ss = libro_();
    if (d.accion === 'leer') return json_(leerTodo_(ss));
    if (d.accion === 'guardar') return json_(guardar_(ss, d));
    if (d.accion === 'borrar') return json_(borrar_(ss, d));
    if (d.accion === 'revisado') return json_(revisado_(ss, d));
    if (d.accion === 'rastrear') return json_(rastrear_(ss, d.autor));
    return json_({ ok: false, error: 'accion' });
  } finally {
    lock.releaseLock();
  }
}

function leerTodo_(ss) {
  var conv = filas_(ss, 'Convocatorias').map(function (r) {
    var x = {};
    try { x = JSON.parse(r['Datos'] || '{}'); } catch (err) { x = {}; }
    x.id = String(r['ID']);
    x.version = String(r['Actualizado'] || '');
    return x;
  }).filter(function (x) { return x.id; });
  var fuentes = filas_(ss, 'Fuentes').map(function (r) {
    return { id: String(r['ID']), categoria: String(r['Categoría']), institucion: String(r['Institución']), programa: String(r['Programa']),
      apoyo: String(r['Tipo de apoyo']), portal: String(r['Portal']), orden: Number(r['Orden']) || 0, notaCategoria: String(r['Nota de la categoría'] || '') };
  }).filter(function (x) { return x.id && CATEGORIAS.indexOf(x.categoria) >= 0; });
  var canales = filas_(ss, 'Canales').map(function (r) {
    return { id: String(r['ID']), nombre: String(r['Canal']), frecuencia: String(r['Frecuencia']), cadaDias: Number(r['Cada (días)']) || null,
      responsable: String(r['Responsable']), queBuscar: String(r['Qué buscar']), enlace: String(r['Enlace'] || ''), orden: Number(r['Orden']) || 0,
      ultima: fecha_(r['Última revisión']), revisadoPor: String(r['Revisado por'] || '') };
  }).filter(function (x) { return x.id; });
  var alertas = filas_(ss, 'Alertas').map(function (r) {
    return { id: String(r['ID']), nombre: String(r['Nombre']), activa: siNo_(r['Activa']) && !!String(r['Feed (RSS o Atom)'] || '').trim(),
      conFeed: !!String(r['Feed (RSS o Atom)'] || '').trim(), ultima: String(r['Última lectura'] || ''), nuevas: Number(r['Nuevas']) || 0, error: String(r['Último error'] || '') };
  }).filter(function (x) { return x.id; });
  var props = PropertiesService.getScriptProperties();
  var auto = { ultima: props.getProperty('ULTIMO_RASTREO') || '', resumen: props.getProperty('ULTIMO_RASTREO_RESUMEN') || '' };
  return { ok: true, convocatorias: conv, fuentes: fuentes, canales: canales, alertas: alertas, auto: auto, ahora: new Date().toISOString() };
}

function guardar_(ss, d) {
  var c = d.conv;
  if (!c || typeof c !== 'object') return { ok: false, error: 'formato' };
  var id = String(c.id || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  if (!id) return { ok: false, error: 'formato' };
  var h = hoja_(ss, 'Convocatorias', COLS_CONV);
  var fila = buscar_(h, id);
  if (fila > 0 && d.base !== undefined) {
    var actual = String(h.getRange(fila, COLS_CONV.indexOf('Actualizado') + 1).getValue());
    if (d.base !== actual) return { ok: false, error: 'conflicto' };
  }
  delete c.version;
  c.id = id;
  var datos = JSON.stringify(c);
  if (datos.length > 45000) return { ok: false, error: 'demasiado grande' };
  var ahora = new Date().toISOString();
  var valores = [id, txt_(c.nombre, 300), txt_(c.fuenteNombre, 200), txt_(c.estatus, 40), txt_(c.area, 80), txt_(c.cierre, 10),
    c.monto === '' || c.monto == null ? '' : Number(c.monto) || '', c.puntajeTotal == null ? '' : Number(c.puntajeTotal) || '',
    txt_(c.responsable, 120), ahora, txt_(d.autor, 80), datos];
  if (fila > 0) h.getRange(fila, 1, 1, valores.length).setValues([valores]);
  else h.appendRow(valores);
  return { ok: true, id: id, version: ahora };
}

function borrar_(ss, d) {
  var h = hoja_(ss, 'Convocatorias', COLS_CONV);
  var fila = buscar_(h, String(d.id || ''));
  if (fila < 1) return { ok: true };
  var actual = String(h.getRange(fila, COLS_CONV.indexOf('Actualizado') + 1).getValue());
  if (d.base !== undefined && d.base !== actual) return { ok: false, error: 'conflicto' };
  h.deleteRow(fila);
  return { ok: true };
}

function revisado_(ss, d) {
  var h = hoja_(ss, 'Canales', COLS_CANALES);
  var fila = buscar_(h, String(d.canal || ''));
  if (fila < 1) return { ok: false, error: 'canal' };
  var hoy = /^\d{4}-\d{2}-\d{2}$/.test(String(d.fecha)) ? String(d.fecha) : Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd');
  h.getRange(fila, COLS_CANALES.indexOf('Última revisión') + 1, 1, 2).setValues([["'" + hoy, txt_(d.autor, 80)]]);
  return { ok: true };
}

/* =====================================================================
   AUTOMATIZACIÓN (versión 2)
   Las reglas son las del documento "Sistema de rastreo de convocatorias de
   fondeo" y las mismas que usa convocatorias.html; si cambian allá, cambian
   aquí (AREAS_AUTO, puntajeAuto_, avisosAuto_).
   ===================================================================== */

/* Crea (o rehace) los disparadores diarios. Se puede correr varias veces. */
function instalarAutomatizacion() {
  instalar();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (['rastrearAutomatico', 'avisoDiario'].indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('rastrearAutomatico').timeBased().everyDays(1).atHour(7).inTimezone(ZONA).create();
  ScriptApp.newTrigger('avisoDiario').timeBased().everyDays(1).atHour(8).inTimezone(ZONA).create();
}

var ZONA = 'America/Mexico_City';
var AUTOR_AUTO = 'Rastreo automático';
var ETIQUETA_GMAIL = 'Convocatorias';
var ETIQUETA_GMAIL_HECHA = 'Convocatorias/Registradas';
var MAX_NUEVAS = 40;           // por corrida, para que un feed ruidoso no inunde la hoja
var DIAS_ATRAS = 30;           // entradas más viejas que esto no se registran
var URL_PAGINA = 'https://soportetimentesbrillantes-afk.github.io/monitoreo-mercado-laboral-dashboard/convocatorias.html';

var ALERTAS_INICIALES = [
  ['ga-emprendimiento', 'Google Alert: convocatoria emprendimiento México', '', 'sí', '', '', ''],
  ['ga-educacion', 'Google Alert: fondo educación formación México', '', 'sí', '', '', ''],
  ['ga-secihti', 'Google Alert: convocatoria SECIHTI 2026', '', 'sí', '', '', ''],
  ['ga-innovacion', 'Google Alert: convocatoria innovación social México', '', 'sí', '', '', ''],
  ['convocatoriasmexico', 'convocatoriasmexico.com (probar el feed antes de activarlo)', 'https://convocatoriasmexico.com/feed/', 'no', '', '', '']
];

/* Áreas en el orden en que se prueban: primero las de prioridad alta. */
var AREAS_AUTO = [
  ['Formación y certificación laboral', 'alta', /certificaci[oó]n|conocer|renec|capacitaci[oó]n|diplomado|empleabilidad|competencias? laboral|formaci[oó]n laboral|formaci[oó]n para el empleo/],
  ['Emprendimiento y PYMES', 'alta', /emprend|pymes?\b|mipymes?|capital semilla|incubad|acelerad|startups?|negocios? local/],
  ['Turismo', 'alta', /tur[ií]s|hoteler|hospitalidad|gastronom|alimentos y bebidas|destinos?\b/],
  ['Automotriz y manufactura', 'alta', /automotri|manufactur|electromovilidad|mantenimiento industrial|metalmec|industria 4/],
  ['Educación técnica y vocacional', 'media', /educaci[oó]n t[eé]cnica|vocacional|bachillerato t[eé]cnico|formaci[oó]n para el trabajo|becas?\b/],
  ['Habilidades digitales y tecnología', 'media', /digital|tecnol[oó]g|inteligencia artificial|ciberseguridad|automatizaci|programaci[oó]n|software/],
  ['Innovación social', 'media', /innovaci[oó]n social|impacto social|econom[ií]a social|cooperativ|comunitari/],
  ['Logística y comercio exterior', 'media', /log[ií]stic|comercio exterior|cadena de suministro|exportaci/],
  ['Salud y bienestar ocupacional', 'baja', /salud|bienestar/],
  ['Medio ambiente y sostenibilidad', 'baja', /ambient|sostenib|sustentab|clim[aá]t/],
  ['Investigación científica pura', 'baja', /investigaci[oó]n cient|ciencia b[aá]sica/]
];
var PALABRAS_CONV = /convocatori|fondos?\b|financiamiento|subsidio|becas?\b|est[ií]mulo|grants?\b|premio|aceleradora|incubaci|capital semilla|apoyos? (econ[oó]mico|para)|call for proposals/i;
var MESES_ES = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

/* Disparador diario. */
function rastrearAutomatico() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(60000)) return;
  try { rastrear_(libro_(), AUTOR_AUTO); } finally { lock.releaseLock(); }
}

/* Lee feeds y correo, registra lo nuevo y aplica los descartes automáticos. */
function rastrear_(ss, autor) {
  var hoy = hoy_();
  var h = hoja_(ss, 'Convocatorias', COLS_CONV);
  var existentes = filas_(ss, 'Convocatorias').map(function (r) { try { return JSON.parse(r['Datos'] || '{}'); } catch (e) { return {}; } });
  var vistos = {};
  existentes.forEach(function (c) { if (c.link) vistos['l:' + claveLink_(c.link)] = 1; if (c.nombre) vistos['n:' + claveNombre_(c.nombre)] = 1; });
  var fuentes = filas_(ss, 'Fuentes').map(function (r) { return { id: String(r['ID']), institucion: String(r['Institución']), portal: String(r['Portal'] || '') }; });

  var candidatas = [], errores = [];
  var al = hoja_(ss, 'Alertas', COLS_ALERTAS);
  filas_(ss, 'Alertas').forEach(function (a, i) {
    var url = String(a['Feed (RSS o Atom)'] || '').trim();
    if (!url || !siNo_(a['Activa'])) return;
    var fila = i + 2, error = '';
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
      if (resp.getResponseCode() !== 200) throw new Error('el feed respondió ' + resp.getResponseCode());
      var entradas = leerFeed_(resp.getContentText());
      if (!entradas.length) throw new Error('no se encontraron entradas (¿es un feed RSS o Atom?)');
      entradas.forEach(function (e) { e.origenNombre = String(a['Nombre']); e.filaAlerta = fila; candidatas.push(e); });
    } catch (err) { error = String(err.message || err).slice(0, 200); errores.push(String(a['Nombre']) + ': ' + error); }
    al.getRange(fila, COLS_ALERTAS.indexOf('Última lectura') + 1, 1, 3).setValues([["'" + hoy, 0, error]]);
  });
  try { correosConEtiqueta_().forEach(function (e) { candidatas.push(e); }); }
  catch (err) { errores.push('Correo: ' + String(err.message || err).slice(0, 200)); }

  var nuevas = [], porAlerta = {};
  candidatas.forEach(function (e) {
    if (nuevas.length >= MAX_NUEVAS) return;
    var texto = e.titulo + ' ' + e.resumen;
    if (!e.deCorreo && !PALABRAS_CONV.test(texto)) return;   // el correo ya lo filtró el equipo con la etiqueta
    if (e.fecha && diasEntre_(e.fecha, hoy) > DIAS_ATRAS) return;
    var kl = e.link ? 'l:' + claveLink_(e.link) : '', kn = 'n:' + claveNombre_(e.titulo);
    if ((kl && vistos[kl]) || vistos[kn]) return;
    if (kl) vistos[kl] = 1; vistos[kn] = 1;
    var c = convDesdeEntrada_(e, fuentes, hoy, autor);
    nuevas.push(c);
    if (e.filaAlerta) porAlerta[e.filaAlerta] = (porAlerta[e.filaAlerta] || 0) + 1;
  });
  nuevas.forEach(function (c) { escribirConv_(h, c, autor); });
  Object.keys(porAlerta).forEach(function (fila) { al.getRange(Number(fila), COLS_ALERTAS.indexOf('Nuevas') + 1).setValue(porAlerta[fila]); });

  var descartadas = descartesAutomaticos_(ss, h, hoy, autor);
  var resumen = nuevas.length + ' nuevas, ' + nuevas.filter(function (c) { return c.estatus === 'Descartada'; }).length + ' de ellas descartadas por plazo; ' +
    descartadas + ' cerradas sin aplicar' + (errores.length ? '; ' + errores.length + ' fuentes con error' : '');
  var props = PropertiesService.getScriptProperties();
  props.setProperty('ULTIMO_RASTREO', new Date().toISOString());
  props.setProperty('ULTIMO_RASTREO_RESUMEN', resumen);
  return { ok: true, nuevas: nuevas.length, descartadas: descartadas, errores: errores, resumen: resumen };
}

/* Arma la ficha con lo que se pueda leer del texto. El equipo confirma. */
function convDesdeEntrada_(e, fuentes, hoy, autor) {
  var texto = e.titulo + ' ' + e.resumen;
  var dom = dominio_(e.link);
  var f = null;
  fuentes.forEach(function (x) { var p = dominio_(x.portal); if (!f && p && dom && (dom === p || dom.slice(-p.length - 1) === '.' + p || p.indexOf(dom) === 0)) f = x; });
  var area = areaAuto_(texto);
  var cierre = cierreAuto_(texto, hoy);
  var monto = montoAuto_(texto);
  var ahora = new Date().toISOString();
  var c = { id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), nombre: e.titulo.slice(0, 280),
    fuenteId: f ? f.id : '', fuenteTexto: f ? '' : (dom || e.origenNombre), fuenteNombre: f ? f.institucion : (dom || e.origenNombre),
    link: e.link || '', deteccion: hoy, cierre: cierre, monto: monto === null ? '' : monto, area: area, estatus: 'Detectada',
    filtros: {}, motivo: '', puntaje: {}, resumen: '', responsable: '', fechaInterna: '', carpeta: '', envio: '', folio: '', respuesta: '',
    montoAprobado: '', notas: '', origen: 'automatico', origenNombre: e.origenNombre, extracto: e.resumen.slice(0, 600),
    creadoPor: autor, creado: ahora, desde: hoy, historia: [{ estatus: 'Detectada', fecha: ahora, por: autor }] };
  if (cierre && diasEntre_(hoy, cierre) < 15) {
    c.estatus = 'Descartada';
    c.motivo = diasEntre_(hoy, cierre) < 0 ? 'Ya había cerrado al detectarse (descarte automático).'
      : 'Cierra en ' + diasEntre_(hoy, cierre) + ' días desde la detección; el mínimo es 15 (descarte automático, sección 4.1). Se monitorea para la próxima edición.';
    c.historia.push({ estatus: 'Descartada', fecha: ahora, por: autor });
  }
  return c;
}

/* Detectada o En evaluación con el cierre ya pasado: no hay a qué aplicar. */
function descartesAutomaticos_(ss, h, hoy, autor) {
  var n = 0;
  filas_(ss, 'Convocatorias').forEach(function (r) {
    var c; try { c = JSON.parse(r['Datos'] || '{}'); } catch (e) { return; }
    if (['Detectada', 'En evaluación'].indexOf(c.estatus) < 0 || !c.cierre || diasEntre_(c.cierre, hoy) <= 0) return;
    var ahora = new Date().toISOString();
    c.id = String(r['ID']); c.estatus = 'Descartada'; c.desde = hoy;
    c.motivo = (c.motivo ? c.motivo + ' ' : '') + 'Cerró el ' + c.cierre + ' sin pasar a Aplicando (descarte automático).';
    c.historia = (c.historia || []).concat([{ estatus: 'Descartada', fecha: ahora, por: autor }]);
    escribirConv_(h, c, autor);
    n++;
  });
  return n;
}

function escribirConv_(h, c, autor) {
  var p = puntajeAuto_(c);
  c.puntajeTotal = p.completos === 6 ? p.total : '';
  delete c.version;
  var datos = JSON.stringify(c);
  var valores = [c.id, txt_(c.nombre, 300), txt_(c.fuenteNombre, 200), txt_(c.estatus, 40), txt_(c.area, 80), txt_(c.cierre, 10),
    c.monto === '' || c.monto == null ? '' : Number(c.monto) || '', c.puntajeTotal === '' ? '' : Number(c.puntajeTotal),
    txt_(c.responsable, 120), new Date().toISOString(), txt_(autor, 80), datos];
  var fila = buscar_(h, c.id);
  if (fila > 0) h.getRange(fila, 1, 1, valores.length).setValues([valores]);
  else h.appendRow(valores);
}

/* ---------- lectura de feeds (RSS 2.0 y Atom; Google Alerts es Atom) ---------- */
function leerFeed_(xml) {
  var bloques = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return bloques.map(function (b) {
    var link = '';
    var m = b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || b.match(/<link[^>]*href=["']([^"']+)["']/i);
    if (m) link = m[1]; else { m = b.match(/<link>([\s\S]*?)<\/link>/i); if (m) link = limpiar_(m[1]); }
    link = desenvolverGoogle_(entidades_(link));
    var fecha = etiqueta_(b, 'published') || etiqueta_(b, 'updated') || etiqueta_(b, 'pubDate') || etiqueta_(b, 'dc:date');
    var d = fecha ? new Date(fecha) : null;
    return { titulo: limpiar_(etiqueta_(b, 'title')), link: link,
      resumen: limpiar_(etiqueta_(b, 'content') || etiqueta_(b, 'summary') || etiqueta_(b, 'description')),
      fecha: d && !isNaN(d.getTime()) ? Utilities.formatDate(d, ZONA, 'yyyy-MM-dd') : '' };
  }).filter(function (e) { return e.titulo; });
}
function etiqueta_(b, n) {
  var m = b.match(new RegExp('<' + n + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + n + '>', 'i'));
  return m ? m[1] : '';
}
function limpiar_(s) {
  s = String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  s = entidades_(s).replace(/<[^>]+>/g, ' ');
  return entidades_(s).replace(/\s+/g, ' ').trim();
}
function entidades_(s) {
  return String(s || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, function (_, n) { return String.fromCharCode(Number(n)); })
    .replace(/&#x([0-9a-f]+);/gi, function (_, n) { return String.fromCharCode(parseInt(n, 16)); }).replace(/&amp;/g, '&');
}
/* Google Alerts manda https://www.google.com/url?...&url=<enlace real>&... */
function desenvolverGoogle_(u) {
  var m = String(u || '').match(/^https?:\/\/(?:www\.)?google\.[a-z.]+\/url\?(.*)$/i);
  if (!m) return String(u || '').trim();
  var q = m[1].split('&');
  for (var i = 0; i < q.length; i++) if (/^(url|q)=/.test(q[i])) { try { return decodeURIComponent(q[i].replace(/^(url|q)=/, '')); } catch (e) { return q[i].replace(/^(url|q)=/, ''); } }
  return String(u).trim();
}

/* ---------- correo: boletines y alertas filtrados a la etiqueta "Convocatorias" ---------- */
function correosConEtiqueta_() {
  if (typeof GmailApp === 'undefined') return [];
  var etq = GmailApp.getUserLabelByName(ETIQUETA_GMAIL);
  if (!etq) return [];
  var hecha = GmailApp.getUserLabelByName(ETIQUETA_GMAIL_HECHA) || GmailApp.createLabel(ETIQUETA_GMAIL_HECHA);
  var hilos = GmailApp.search('label:' + ETIQUETA_GMAIL.toLowerCase() + ' -label:' + ETIQUETA_GMAIL_HECHA.toLowerCase().replace('/', '-') + ' newer_than:' + DIAS_ATRAS + 'd', 0, 30);
  var salida = [];
  hilos.forEach(function (hilo) {
    var msj = hilo.getMessages()[0];
    var cuerpo = msj.getPlainBody() || '';
    var link = (cuerpo.match(/https?:\/\/[^\s<>"')\]]+/) || [''])[0];
    salida.push({ titulo: limpiar_(msj.getSubject()), link: desenvolverGoogle_(link), resumen: limpiar_(cuerpo).slice(0, 1500),
      fecha: Utilities.formatDate(msj.getDate(), ZONA, 'yyyy-MM-dd'), deCorreo: true, origenNombre: 'Correo: ' + limpiar_(msj.getFrom()).slice(0, 80) });
    hilo.addLabel(hecha);
  });
  return salida;
}

/* ---------- lo que se lee del texto ---------- */
function areaAuto_(texto) {
  var t = String(texto || '').toLowerCase();
  for (var i = 0; i < AREAS_AUTO.length; i++) if (AREAS_AUTO[i][2].test(t)) return AREAS_AUTO[i][0];
  return '';
}
/* Fecha de cierre solo si el texto la liga a "cierre", "fecha límite", "hasta el", "vence"… */
function cierreAuto_(texto, hoy) {
  var t = String(texto || '').toLowerCase();
  var meses = Object.keys(MESES_ES).join('|');
  var gatillo = '(?:cierr[ae]n?|cierre|fecha l[ií]mite|l[ií]mite|hasta el|vence|vencimiento|antes del|plazo|registro abierto hasta)';
  var m = t.match(new RegExp(gatillo + '[^.]{0,60}?(\\d{1,2})\\s+de\\s+(' + meses + ')(?:\\s+(?:de|del)\\s+(\\d{4}))?'));
  var dia, mes, anio;
  if (m) { dia = Number(m[1]); mes = MESES_ES[m[2]]; anio = m[3] ? Number(m[3]) : null; }
  else {
    m = t.match(new RegExp(gatillo + '[^.]{0,40}?(\\d{1,2})[/.-](\\d{1,2})[/.-](\\d{2,4})'));
    if (!m) return '';
    dia = Number(m[1]); mes = Number(m[2]); anio = Number(m[3]); if (anio < 100) anio += 2000;
  }
  if (!mes || dia < 1 || dia > 31 || mes > 12) return '';
  var base = Number(hoy.slice(0, 4));
  if (!anio) { anio = base; if (diasEntre_(fmt_(anio, mes, dia), hoy) > 60) anio = base + 1; }
  return fmt_(anio, mes, dia);
}
/* Monto en pesos: "$500,000", "$2 millones", "1.5 mdp", "300 mil pesos". Sin "$" ni "pesos"
   no se toma (para no leer "5 mil jóvenes" como dinero). En dólares no se adivina. */
function montoAuto_(texto) {
  var t = String(texto || '').toLowerCase();
  if (/usd|d[oó]lares|us\$|euros?/.test(t)) return null;
  var re = /(\$\s?)?(\d{1,3}(?:[,.]\d{3})+|\d+(?:\.\d+)?)\s*(millones de pesos|millones|mill[oó]n|mdp|mil pesos|mil)?/g, m, mayor = null;
  while ((m = re.exec(t))) {
    if (!m[1] && !/pesos|mdp/.test(m[3] || '')) continue;
    var n = Number(m[2].replace(/[,](?=\d{3})/g, '').replace(/\.(?=\d{3}(\D|$))/g, ''));
    if (/mill|mdp/.test(m[3] || '')) n *= 1000000; else if (/mil/.test(m[3] || '')) n *= 1000;
    if (n >= 1000 && (mayor === null || n > mayor)) mayor = Math.round(n);
  }
  return mayor;
}

/* ---------- puntaje y avisos (los mismos de convocatorias.html) ---------- */
function prioridadArea_(area) { for (var i = 0; i < AREAS_AUTO.length; i++) if (AREAS_AUTO[i][0] === area) return { alta: 3, media: 2, baja: 1 }[AREAS_AUTO[i][1]]; return null; }
function puntajeAuto_(c, hoy) {
  hoy = hoy || hoy_();
  var p = c.puntaje || {};
  var auto = {
    afinidad: prioridadArea_(c.area),
    monto: c.monto === '' || c.monto == null ? null : (Number(c.monto) > 500000 ? 3 : Number(c.monto) >= 100000 ? 2 : 1),
    margen: c.cierre ? (diasEntre_(hoy, c.cierre) > 45 ? 3 : diasEntre_(hoy, c.cierre) >= 15 ? 2 : 1) : null
  };
  var vals = ['afinidad', 'monto', 'exito', 'esfuerzo', 'alianza', 'margen'].map(function (k) { return p[k] ? Number(p[k]) : (auto[k] || null); });
  return { total: vals.reduce(function (s, v) { return s + (v || 0); }, 0), completos: vals.filter(Boolean).length };
}
function avisosAuto_(c, hoy) {
  var A = [];
  var activos = ['Detectada', 'En evaluación', 'Aplicando', 'Aplicada'];
  if (activos.indexOf(c.estatus) >= 0 && c.estatus !== 'Aplicada' && c.cierre) {
    var d = diasEntre_(hoy, c.cierre);
    if (d >= 0 && d <= 15) A.push({ grave: d <= 5, t: 'Cierra en ' + d + ' días (' + c.cierre + ')' });
  }
  var desde = String(c.desde || c.deteccion || hoy).slice(0, 10);
  if (c.estatus === 'Detectada' && diasEntre_(desde, hoy) >= 2) A.push({ grave: true, t: 'Filtro de elegibilidad vencido: ' + diasEntre_(desde, hoy) + ' días en Detectada (máximo 48 horas)' });
  if (c.estatus === 'En evaluación') {
    var p = puntajeAuto_(c, hoy);
    if (p.completos < 6) { var hb = habiles_(desde, hoy); if (hb > 3) A.push({ grave: true, t: 'Puntuación vencida: ' + hb + ' días hábiles en evaluación (máximo 3)' }); }
    else A.push({ grave: false, t: 'Decidir: ' + p.total + '/18 → ' + (p.total >= 14 ? 'elevar a dirección' : p.total >= 10 ? 'reunión semanal' : 'descartar o monitorear') });
  }
  if (c.estatus === 'Aplicando') {
    if (!c.responsable) A.push({ grave: false, t: 'Asignar responsable' });
    var fi = c.fechaInterna || (c.cierre ? restarHabiles_(c.cierre, 5) : '');
    if (fi) { var dd = diasEntre_(hoy, fi); if (dd < 0) A.push({ grave: true, t: 'Pasó la fecha límite interna (' + fi + ')' }); else if (dd <= 3) A.push({ grave: false, t: 'Fecha límite interna en ' + dd + ' días (' + fi + ')' }); }
  }
  if (c.estatus === 'Aplicada' && c.respuesta && diasEntre_(c.respuesta, hoy) > 0) A.push({ grave: false, t: 'Dar seguimiento: la respuesta se esperaba el ' + c.respuesta });
  return A;
}

/* Disparador diario: resumen por correo en días hábiles. */
function avisoDiario() {
  var dia = Number(Utilities.formatDate(new Date(), ZONA, 'u')); // 1 = lunes … 7 = domingo
  if (dia > 5) return;
  var correos = String(PropertiesService.getScriptProperties().getProperty('CORREOS_AVISO') || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
  if (!correos.length) return;
  var r = resumenDiario_(libro_());
  if (!r.hayAlgo) return;
  MailApp.sendEmail({ to: correos.join(','), subject: r.asunto, htmlBody: r.html, body: r.texto, name: 'Rastreo de convocatorias del Club' });
}

function resumenDiario_(ss, hoy) {
  hoy = hoy || hoy_();
  var conv = filas_(ss, 'Convocatorias').map(function (r) { try { var c = JSON.parse(r['Datos'] || '{}'); c.id = String(r['ID']); return c; } catch (e) { return null; } }).filter(Boolean);
  var nuevas = conv.filter(function (c) { return c.origen === 'automatico' && c.estatus === 'Detectada' && diasEntre_(String(c.deteccion || ''), hoy) <= 1; });
  var avisos = [];
  conv.forEach(function (c) { avisosAuto_(c, hoy).forEach(function (a) { avisos.push({ c: c, a: a }); }); });
  avisos.sort(function (x, y) { return (y.a.grave ? 1 : 0) - (x.a.grave ? 1 : 0); });
  var canales = filas_(ss, 'Canales').filter(function (k) {
    var cada = Number(k['Cada (días)']) || 0; if (!cada) return false;
    var u = fecha_(k['Última revisión']); return !u || diasEntre_(u, hoy) >= cada;
  }).map(function (k) { return String(k['Canal']) + ' (' + String(k['Frecuencia']).toLowerCase() + ', ' + String(k['Responsable']) + ')'; });
  var errores = filas_(ss, 'Alertas').filter(function (a) { return siNo_(a['Activa']) && String(a['Último error'] || ''); })
    .map(function (a) { return String(a['Nombre']) + ': ' + String(a['Último error']); });

  var e = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]; }); };
  var html = [], texto = [];
  var sec = function (titulo, items) {
    if (!items.length) return;
    html.push('<h3 style="margin:18px 0 6px">' + e(titulo) + '</h3><ul>' + items.map(function (i) { return '<li>' + i.h + '</li>'; }).join('') + '</ul>');
    texto.push('', titulo.toUpperCase()); items.forEach(function (i) { texto.push('- ' + i.t); });
  };
  sec('Nuevas detectadas automáticamente (' + nuevas.length + ')', nuevas.map(function (c) {
    var extra = [c.area || 'área por confirmar', c.cierre ? 'cierra ' + c.cierre : 'sin fecha de cierre'].join(' · ');
    return { h: (c.link ? '<a href="' + e(c.link) + '">' + e(c.nombre) + '</a>' : e(c.nombre)) + ' <span style="color:#666">— ' + e(extra) + '</span>', t: c.nombre + ' — ' + extra + (c.link ? ' — ' + c.link : '') };
  }));
  sec('Plazos y decisiones pendientes (' + avisos.length + ')', avisos.map(function (x) {
    return { h: (x.a.grave ? '<b style="color:#b5483f">' : '<b>') + e(x.a.t) + '</b> · ' + e(x.c.nombre) + ' <span style="color:#666">(' + e(x.c.estatus) + ')</span>', t: x.a.t + ' · ' + x.c.nombre + ' (' + x.c.estatus + ')' };
  }));
  sec('Canales por revisar (' + canales.length + ')', canales.map(function (t) { return { h: e(t), t: t }; }));
  sec('Fuentes automáticas con error', errores.map(function (t) { return { h: e(t), t: t }; }));
  var hayAlgo = html.length > 0;
  var graves = avisos.filter(function (x) { return x.a.grave; }).length;
  return {
    hayAlgo: hayAlgo,
    asunto: 'Convocatorias: ' + nuevas.length + ' nuevas, ' + avisos.length + ' pendientes' + (graves ? ' (' + graves + ' vencidos)' : ''),
    html: '<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">' + html.join('') +
      '<p style="margin-top:20px"><a href="' + URL_PAGINA + '">Abrir el tablero del rastreo</a></p></div>',
    texto: texto.join('\n') + '\n\nTablero: ' + URL_PAGINA,
    nuevas: nuevas.length, avisos: avisos.length, canales: canales.length
  };
}

/* ---------- fechas y textos ---------- */
function hoy_() { return Utilities.formatDate(new Date(), ZONA, 'yyyy-MM-dd'); }
function fmt_(a, m, d) { return a + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d; }
function diaUTC_(s) { var p = String(s).slice(0, 10).split('-'); return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])); }
function diasEntre_(a, b) { return Math.round((diaUTC_(b) - diaUTC_(a)) / 86400000); }
function habiles_(a, b) { var n = 0, d = diaUTC_(a), fin = diaUTC_(b); while (d < fin) { d += 86400000; var w = new Date(d).getUTCDay(); if (w !== 0 && w !== 6) n++; } return n; }
function restarHabiles_(s, n) { var d = diaUTC_(s); while (n > 0) { d -= 86400000; var w = new Date(d).getUTCDay(); if (w !== 0 && w !== 6) n--; } return new Date(d).toISOString().slice(0, 10); }
function siNo_(v) { return v === true || /^(s[ií]|si|yes|1|true|x)$/i.test(String(v == null ? '' : v).trim()); }
function dominio_(u) { var m = String(u || '').toLowerCase().replace(/^https?:\/\//, '').match(/^(?:www\.)?([^/?#:\s]+)/); return m ? m[1] : ''; }
function claveLink_(u) { return String(u || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/+$/, ''); }
function claveNombre_(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 120); }

/* ---------- utilidades ---------- */
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function hoja_(ss, nombre, cols) {
  var h = ss.getSheetByName(nombre);
  if (!h) { h = ss.insertSheet(nombre); h.appendRow(cols); h.setFrozenRows(1); h.getRange(1, 1, 1, cols.length).setFontWeight('bold'); }
  return h;
}
function filas_(ss, nombre) {
  var h = ss.getSheetByName(nombre);
  if (!h || h.getLastRow() < 2) return [];
  var v = h.getRange(1, 1, h.getLastRow(), h.getLastColumn()).getValues();
  var enc = v[0];
  return v.slice(1).map(function (r) { var o = {}; enc.forEach(function (c, i) { o[c] = r[i]; }); return o; });
}
function buscar_(h, id) {
  if (!id || h.getLastRow() < 2) return -1;
  var ids = h.getRange(2, 1, h.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}
/* Texto limpio y nunca como fórmula. */
function txt_(v, max) {
  var s = String(v == null ? '' : v).slice(0, max || 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function fecha_(v) {
  if (!v) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, 'America/Mexico_City', 'yyyy-MM-dd');
  return String(v).slice(0, 10);
}

/* ---------- Directorio inicial (documento "Sistema de rastreo de convocatorias de fondeo") ---------- */
var FUENTES_INICIALES = [
  ['federal', 'se', 'Secretaría de Economía', 'Fondo Nacional del Emprendedor (convocatorias estatales vigentes)', 'Recursos no reembolsables, equipamiento, capital semilla', 'gob.mx/se', 'El INADEM fue disuelto en 2019; sus funciones pasaron a la Secretaría de Economía y a las secretarías estatales de desarrollo económico. Revisa los portales estatales, no referencias al INADEM.'],
  ['federal', 'inaes', 'Secretaría de Bienestar / INAES', 'Estímulos a la Economía Social', 'Fondos colectivos para cooperativas y proyectos comunitarios', 'inaes.gob.mx'],
  ['federal', 'sep', 'SEP', 'Programas de fortalecimiento educativo y becas institucionales', 'Subsidios, becas, infraestructura', 'sep.gob.mx'],
  ['federal', 'secihti', 'SECIHTI (antes CONAHCYT)', 'Convocatoria SDTVI 2026: Desarrollo Tecnológico, Vinculación e Innovación; Jóvenes Innovadores', 'Recursos para innovación social y tecnológica', 'secihti.mx'],
  ['federal', 'estatales', 'Secretarías estatales (SEDECO, COMECYT)', 'Jóvenes Emprendedores e Innovadores (Estado de México y otros estados)', 'Capital semilla, mentorías, equipamiento', ''],
  ['fundaciones', 'bbva', 'Fundación BBVA México', 'Convocatoria anual de becas (2026-2027, 5,500 jóvenes)', 'Educación media superior y superior', 'fundacion.bbva.com.mx'],
  ['fundaciones', 'coppel', 'Fundación Coppel', 'Convocatorias para emprendedores y educación básica', 'Emprendimiento popular, educación', 'fundacioncoppel.org'],
  ['fundaciones', 'pormexico', 'Fundación Por México', 'Programas de desarrollo comunitario y educación', 'Educación, inclusión social', 'pormexicofundacion.org'],
  ['fundaciones', 'posible', 'POSiBLE (ITESM + Secretaría de Economía)', 'POSiBLE 2026: programa nacional de emprendimiento', 'Emprendimiento de impacto social e innovación', 'posible.org.mx'],
  ['fundaciones', 'cemefi', 'CEMEFI', 'Distintivo ESR; convocatorias para consultores y entidades promotoras', 'RSE, capacitación, fortalecimiento institucional', 'cemefi.org'],
  ['fundaciones', 'plai', 'Emergente / PLAI', 'Emergente 2026', 'Innovación social, startups de impacto', 'conectar.plai.mx'],
  ['internacionales', 'bidlab', 'BID / BID Lab', 'Fondos de innovación para pymes y startups de impacto social', 'Emprendimiento, tecnología, formación', 'bidlab.org'],
  ['internacionales', 'pnud', 'PNUD México', 'Aceleradora de ODS; convocatorias periódicas', 'Proyectos alineados a los Objetivos de Desarrollo Sostenible', 'undp.org/es/mexico'],
  ['internacionales', 'unesco', 'UNESCO', 'Programas de fortalecimiento educativo y cultural', 'Educación técnica y vocacional, patrimonio', 'unesco.org/es/mexico'],
  ['internacionales', 'oea', 'OEA', 'Becas y programas de capacitación para organizaciones', 'Formación profesional, liderazgo', 'oas.org/es'],
  ['internacionales', 'bm', 'Banco Mundial', 'Grants para organizaciones de la sociedad civil', 'Educación, inclusión económica', 'worldbank.org'],
  ['empresas', 'cemex', 'CEMEX', 'Programa Construyendo Futuros; RSE comunitaria', 'Capacitación, infraestructura comunitaria', '', 'Las empresas rara vez publican convocatorias abiertas: el acceso suele ser por contacto directo con su área de RSE o a través de CEMEFI. Prioriza empresas de turismo y automotriz del Corredor Bajío-Norte.'],
  ['empresas', 'walmart', 'Walmart México (Fundación Walmart)', 'Convocatorias para empleabilidad y nutrición', 'Formación para el empleo', ''],
  ['empresas', 'televisa', 'Televisa Foundation', 'Becas Únete y programas de educación digital', 'Educación básica, habilidades digitales', ''],
  ['empresas', 'bimbo', 'Grupo Bimbo', 'Programas de emprendimiento y nutrición comunitaria', 'Emprendimiento, RSE', ''],
  ['empresas', 'microsoft', 'Microsoft México', 'AI Skills Initiative; programas de empleabilidad digital', 'Formación tecnológica, certificaciones', ''],
  ['universidades', 'unam', 'UNAM (FENO, DGIRE)', 'Convocatorias de innovación social y extensión universitaria', 'Validación académica, co-diseño de programas', ''],
  ['universidades', 'itesm', 'ITESM', 'Convocatorias de vinculación empresarial; POSiBLE', 'Emprendimiento, certificaciones', ''],
  ['universidades', 'ipn', 'IPN', 'Incubadoras de proyectos sociales', 'Formación técnica, industria', ''],
  ['universidades', 'anuies', 'ANUIES', 'Programas de movilidad y vinculación interinstitucional', 'Alianzas con IES para programas de CMB', '']
];
var CANALES_INICIALES = [
  ['gob', 'Portales .gob.mx (SE, INAES, SEP, SECIHTI)', 'Semanal', 7, 'Coordinador de proyectos', 'Nuevas convocatorias en áreas temáticas prioritarias', ''],
  ['cemefi', 'CEMEFI', 'Quincenal', 14, 'Coordinador de proyectos', 'Convocatorias de fundaciones y empresas RSE', 'cemefi.org/convocatorias'],
  ['agregador', 'convocatoriasmexico.com', 'Semanal', 7, 'Coordinador de proyectos', 'Agregador de convocatorias nacionales', 'convocatoriasmexico.com'],
  ['redes', 'Redes sociales (LinkedIn, X)', 'Diaria (pasiva)', '', 'Todo el equipo', 'Anuncios de apertura de convocatorias', ''],
  ['boletines', 'Boletines de organismos internacionales', 'Al recibir', '', 'Dirección', 'Boletines de BID Lab, PNUD y UNESCO', ''],
  ['contactos', 'Red de contactos (aliados, universidades)', 'Mensual', 30, 'Dirección', 'Convocatorias no publicadas, invitaciones directas', '']
];
