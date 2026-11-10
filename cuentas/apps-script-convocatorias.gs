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
 */

function instalar() {
  var ss = libro_();
  hoja_(ss, 'Convocatorias', COLS_CONV);
  var f = hoja_(ss, 'Fuentes', COLS_FUENTES);
  var k = hoja_(ss, 'Canales', COLS_CANALES);
  if (f.getLastRow() < 2) FUENTES_INICIALES.forEach(function (x, i) {
    f.appendRow([x[1], x[0], x[2], x[3], x[4], x[5], i + 1, x[6] || '']);
  });
  if (k.getLastRow() < 2) CANALES_INICIALES.forEach(function (x, i) {
    k.appendRow([x[0], x[1], x[2], x[3] || '', x[4], x[5], x[6] || '', i + 1, '', '']);
  });
  var l = ss.getSheetByName('Léeme') || ss.insertSheet('Léeme', 0);
  l.clear();
  l.getRange(1, 1, 6, 1).setValues([
    ['Rastreo de convocatorias de fondeo (uso interno del Club)'],
    ['La página del equipo es convocatorias.html en el sitio del monitoreo. Pide la clave del equipo.'],
    ['Convocatorias: una fila por convocatoria. La columna Datos es la ficha completa; las demás son para leer.'],
    ['Fuentes: el directorio de fuentes. Se edita aquí; la página solo lo lee.'],
    ['Canales: canales de revisión con su frecuencia. La página anota la última revisión.'],
    ['La clave está en Configuración del proyecto → Propiedades del script → CLAVE_EQUIPO.']
  ]);
  l.getRange(1, 1).setFontWeight('bold');
}

/* La hoja del rastreo. Vacío = la hoja a la que esté ligado el script. */
var HOJA_ID = '1R1-fKA3Xjky9nCyGuTYE0fYN_4hmSbjmm84tIIj_MpU';
function libro_() { return HOJA_ID ? SpreadsheetApp.openById(HOJA_ID) : SpreadsheetApp.getActiveSpreadsheet(); }

var COLS_CONV = ['ID', 'Nombre', 'Fuente', 'Estatus', 'Área temática', 'Cierre', 'Monto estimado', 'Puntaje', 'Responsable', 'Actualizado', 'Actualizado por', 'Datos'];
var COLS_FUENTES = ['ID', 'Categoría', 'Institución', 'Programa', 'Tipo de apoyo', 'Portal', 'Orden', 'Nota de la categoría'];
var COLS_CANALES = ['ID', 'Canal', 'Frecuencia', 'Cada (días)', 'Responsable', 'Qué buscar', 'Enlace', 'Orden', 'Última revisión', 'Revisado por'];
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
  return { ok: true, convocatorias: conv, fuentes: fuentes, canales: canales, ahora: new Date().toISOString() };
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
