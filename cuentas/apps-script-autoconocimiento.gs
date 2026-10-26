/**
 * Autoconocimiento DISC y FODA — Apps Script
 * Club de Mentes Brillantes
 *
 * Recibe los resultados del DISC (disc.html y disc-agora.html) y el FODA
 * (foda.html) que una persona decidió compartir con el Club, y los escribe en
 * la hoja interna "Autoconocimiento DISC y FODA (uso interno)".
 *
 * SOLO LLEGA LO QUE LA PERSONA ACEPTÓ MANDAR. Las páginas no envían nada por
 * su cuenta: hay una casilla sin marcar, nombre y correo, y un botón. Este
 * script vuelve a revisar que venga `acepta: true`; si no, rechaza.
 *
 * LA CLAVE NO ES UN SECRETO. Está escrita en compartir-club.js, que es público.
 * Sirve para filtrar ruido de bots que peguen al URL a ciegas, no para
 * autorizar. Por eso este script no sabe leer nada: solo escribe. Nadie puede
 * sacar datos de la hoja a través de él.
 *
 * INSTALACIÓN (una sola vez, desde la cuenta de Google del Club)
 *   1. Abre la hoja "Autoconocimiento DISC y FODA (uso interno)".
 *   2. Extensiones → Apps Script. Borra lo que haya y pega este archivo.
 *   3. Guarda. Ejecuta una vez la función `revisarPestanas` (menú de arriba)
 *      para dar permisos; debe terminar sin error.
 *   4. Implementar → Nueva implementación → tipo "Aplicación web".
 *        Ejecutar como: yo
 *        Quién tiene acceso: cualquier usuario
 *   5. Copia la URL que termina en /exec y pégala en COMPARTIR_ENDPOINT de
 *      compartir-club.js. Hasta que no esté ahí, las páginas no muestran la
 *      opción de compartir y siguen funcionando igual que siempre.
 *
 * Si algún día cambias este archivo, vuelve a Implementar → Gestionar
 * implementaciones → editar → Versión nueva. Si creas una implementación
 * nueva cambia la URL y hay que volver a pegarla.
 */

var CLAVE = 'cmb-autoconocimiento-2026';

var PESTANAS = { disc: 'DISC', foda: 'FODA', expediente: 'Expediente Ágora', informacion: 'Ágora · Información inicial' };

/* Los encabezados son el contrato con la hoja. El script busca cada columna
   por su nombre, así que puedes reordenarlas o agregar columnas tuyas a la
   derecha sin romper nada. Lo que no puedes es renombrarlas. */
var ENCABEZADOS = {
  disc: ['ID de envío', 'Fecha de envío', 'Nombre', 'Correo', 'Instrumento',
         'Dominancia (D)', 'Influencia (I)', 'Estabilidad (S)', 'Cumplimiento (C)',
         'Estilo dominante', 'Segundo estilo', 'Lectura', 'Escala',
         'Detalle por sección', 'Respuestas', 'Versión de la clave',
         'Fecha del cuestionario', 'Dispositivo'],
  foda: ['ID de envío', 'Primer envío', 'Último envío', 'Nombre', 'Correo',
         'Fortalezas', 'Debilidades', 'Oportunidades', 'Amenazas',
         'Siguiente paso', 'Estilo DISC dominante', 'Dispositivo'],
  // Una fila por persona: el tablero del orientador.
  expediente: ['ID de envío', 'Alta', 'Última actividad', 'Nombre', 'Correo', 'Edad',
               'Avance', 'Fases completas', 'Última fase guardada', 'Tutor', 'Correo del tutor',
               'Tutor autoriza', 'Dispositivo'],
  // Fase 1 del proceso Ágora.
  informacion: ['ID de envío', 'Primer envío', 'Último envío', 'Nombre', 'Correo', 'Teléfono',
                'Edad', 'Estado', 'Ciudad', 'Tutor', 'Correo del tutor', 'Parentesco', 'Tutor autoriza',
                'Nivel de estudios', 'Situación', 'Institución', 'Carrera', 'Semestre o año',
                'Año de egreso', 'Experiencia', 'Cursos y certificaciones', 'Idiomas',
                'Sectores de interés', 'Aspiración']
};

/* Nombres legibles de las fases del proceso Ágora, para la columna
   "Fases completas" del expediente. Deben coincidir con los id de agora.html. */
var FASES_AGORA = {
  informacion: 'Información inicial', disc: 'Perfil DISC', foda: 'Análisis FODA',
  estilo: 'Estilo de trabajo', relacion: 'Forma de relacionamiento', crecimiento: 'Crecimiento personal',
  escenarios: 'Escenarios de vida', ruta: 'Ruta profesional', plan: 'Plan de acción',
  resumen: 'Resumen ejecutivo'
};

var MAX_TEXTO = 4000;     // por celda; un FODA real cabe de sobra
var MAX_CUERPO = 60000;   // por petición
var NOMBRES = { D: 'Dominancia', I: 'Influencia', S: 'Estabilidad', C: 'Cumplimiento' };

// ─────────────────────────────── entrada ───────────────────────────────

function doPost(e) {
  try {
    var crudo = (e && e.postData && e.postData.contents) || '';
    if (crudo.length > MAX_CUERPO) return responder({ ok: false, error: 'demasiado grande' });
    var d = JSON.parse(crudo);
    if (!d || d.clave !== CLAVE) return responder({ ok: false, error: 'clave' });
    if (d.acepta !== true) return responder({ ok: false, error: 'sin consentimiento' });

    var nombre = limpiar(d.nombre, 120);
    var correo = limpiar(d.correo, 160).toLowerCase();
    if (!nombre) return responder({ ok: false, error: 'falta el nombre' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return responder({ ok: false, error: 'correo no válido' });
    var id = limpiar(d.id, 64);
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return responder({ ok: false, error: 'id' });

    if (d.tipo === 'disc') return responder(conCandado(function () { return guardarDisc(d, id, nombre, correo); }));
    if (d.tipo === 'foda') return responder(conCandado(function () { return guardarFoda(d, id, nombre, correo); }));
    if (d.tipo === 'agora') return responder(conCandado(function () { return guardarAgora(d, id, nombre, correo); }));
    return responder({ ok: false, error: 'tipo' });
  } catch (err) {
    return responder({ ok: false, error: 'petición no válida' });
  }
}

function doGet() {
  return responder({ ok: true, servicio: 'autoconocimiento', nota: 'Este URL solo recibe envíos.' });
}

// ─────────────────────────────── DISC ───────────────────────────────

function guardarDisc(d, id, nombre, correo) {
  var p = d.puntajes || {};
  var claves = ['D', 'I', 'S', 'C'];
  for (var i = 0; i < claves.length; i++) {
    var v = p[claves[i]] && p[claves[i]].neto;
    if (typeof v !== 'number' || !isFinite(v) || Math.abs(v) > 500) return { ok: false, error: 'puntajes' };
  }
  var instrumento = d.instrumento === 'agora' ? 'Ágora (5 secciones)'
                  : d.instrumento === 'bloques' ? 'Club (24 bloques)' : '';
  if (!instrumento) return { ok: false, error: 'instrumento' };

  var orden = claves.slice().sort(function (a, b) { return p[b].neto - p[a].neto; });
  var escala = d.escala || {};
  var detalle = '';
  if (d.instrumento === 'agora') {
    // Una línea por color: "C (Azul): a 16 · b 14 · c 28 · d 3 · e 16"
    var colores = { C: 'Azul', D: 'Rojo', I: 'Amarillo', S: 'Verde' };
    detalle = ['C', 'D', 'I', 'S'].map(function (k) {
      var s = p[k].secciones || {};
      return k + ' (' + colores[k] + '): ' + ['a', 'b', 'c', 'd', 'e'].map(function (x) {
        return x + ' ' + (typeof s[x] === 'number' ? s[x] : '—');
      }).join(' · ');
    }).join('\n');
  }

  // Cada cuestionario terminado tiene su propio id: volver a contestarlo
  // agrega una fila nueva, pero tocar "Enviar" dos veces sobre el mismo
  // resultado actualiza la misma fila en vez de duplicarla.
  // Las respuestas crudas se guardan a propósito: si Ágora corrige la clave de
  // colores de las secciones a, c o d, con esto se puede volver a puntuar a
  // todos sin pedirles que contesten otra vez.
  var respuestas = '';
  try { respuestas = d.respuestas ? JSON.stringify(d.respuestas) : ''; } catch (e) { respuestas = ''; }
  if (respuestas.length > 45000) respuestas = '';

  escribir(PESTANAS.disc, ENCABEZADOS.disc, id, {
    'ID de envío': id,
    'Fecha de envío': new Date(),
    'Nombre': textoSeguro(nombre),
    'Correo': textoSeguro(correo),
    'Instrumento': instrumento,
    'Dominancia (D)': p.D.neto,
    'Influencia (I)': p.I.neto,
    'Estabilidad (S)': p.S.neto,
    'Cumplimiento (C)': p.C.neto,
    'Estilo dominante': NOMBRES[orden[0]],
    'Segundo estilo': NOMBRES[orden[1]],
    'Lectura': limpiar(d.lectura, 40),
    'Escala': (typeof escala.min === 'number' && typeof escala.max === 'number') ? escala.min + ' a ' + escala.max : '',
    'Detalle por sección': detalle,
    'Respuestas': respuestas,
    'Versión de la clave': limpiar(d.versionClave, 40),
    'Fecha del cuestionario': limpiar(d.fecha, 10),
    'Dispositivo': limpiar(d.dispositivo, 64)
  }, true);
  return { ok: true };
}

// ─────────────────────────────── FODA ───────────────────────────────

function guardarFoda(d, id, nombre, correo) {
  var lista = function (t) {
    return limpiar(t, MAX_TEXTO).split('\n').map(function (s) { return s.trim(); })
      .filter(function (s) { return s; }).map(function (s) { return '• ' + s; }).join('\n');
  };
  var hay = ['F', 'D', 'O', 'A'].some(function (k) { return limpiar(d[k], MAX_TEXTO); });
  if (!hay) return { ok: false, error: 'FODA vacío' };

  // Un FODA se edita: la misma persona en el mismo dispositivo actualiza su
  // fila en vez de agregar una nueva cada vez que corrige una línea.
  escribir(PESTANAS.foda, ENCABEZADOS.foda, id, {
    'ID de envío': id,
    'Último envío': new Date(),
    'Nombre': textoSeguro(nombre),
    'Correo': textoSeguro(correo),
    'Fortalezas': textoSeguro(lista(d.F)),
    'Debilidades': textoSeguro(lista(d.D)),
    'Oportunidades': textoSeguro(lista(d.O)),
    'Amenazas': textoSeguro(lista(d.A)),
    'Siguiente paso': textoSeguro(limpiar(d.paso, MAX_TEXTO)),
    'Estilo DISC dominante': NOMBRES[d.estiloDisc] || '',
    'Dispositivo': limpiar(d.dispositivo, 64)
  }, true, 'Primer envío');
  return { ok: true };
}

// ─────────────────────────── PROCESO ÁGORA ───────────────────────────

/* Cada fase que la persona completa llega aquí. Se actualiza su fila del
   expediente (avance) y la pestaña de la fase. Una fase que todavía no tiene
   pestaña propia solo mueve el avance. */
function guardarAgora(d, id, nombre, correo) {
  var paso = limpiar(d.paso, 40);
  if (!FASES_AGORA[paso]) return { ok: false, error: 'paso' };
  var datos = d.datos || {};
  var completos = (Array.isArray(d.completos) ? d.completos : [])
    .filter(function (p) { return FASES_AGORA[p]; });
  var total = Math.min(Math.max(parseInt(d.total, 10) || 10, 1), 50);

  if (paso === 'informacion') {
    var edad = parseInt(datos.edad, 10);
    if (isNaN(edad) || edad < 12 || edad > 99) return { ok: false, error: 'edad' };
    // Un menor de edad necesita que su madre, padre o tutor esté de acuerdo.
    if (edad < 18 && datos.tutorAutoriza !== true) return { ok: false, error: 'falta autorización del tutor' };
    var lineas = function (arr, fn) {
      return (Array.isArray(arr) ? arr : []).slice(0, 30).map(fn)
        .filter(function (s) { return s; }).map(function (s) { return '• ' + s; }).join('\n');
    };
    var exp = datos.sinExperiencia ? 'Todavía no tiene experiencia' : lineas(datos.experiencia, function (x) {
      var cab = [limpiar(x.rol, 120), limpiar(x.organizacion, 120)].filter(String).join(' — ');
      if (!cab) return '';
      var per = [limpiar(x.desde, 7), limpiar(x.hasta, 7) || 'actual'].filter(String).join(' a ');
      return cab + (x.tipo ? ' (' + limpiar(x.tipo, 40) + ')' : '') + (per ? ', ' + per : '') +
             (x.descripcion ? ': ' + limpiar(x.descripcion, 600) : '');
    });
    var cert = datos.sinCertificaciones ? 'Todavía no tiene' : lineas(datos.certificaciones, function (x) {
      var n = limpiar(x.nombre, 160);
      return n ? n + (x.institucion ? ' — ' + limpiar(x.institucion, 120) : '') + (x.anio ? ' (' + limpiar(x.anio, 4) + ')' : '') : '';
    });
    var idi = lineas(datos.idiomas, function (x) {
      var n = limpiar(x.idioma, 60); return n ? n + (x.nivel ? ': ' + limpiar(x.nivel, 20) : '') : '';
    });
    var sectores = (Array.isArray(datos.sectores) ? datos.sectores : []).map(function (x) { return limpiar(x, 60); })
      .map(function (x) { return x === 'Otro' && datos.sectorOtro ? 'Otro: ' + limpiar(datos.sectorOtro, 80) : x; }).join(', ');

    escribir(PESTANAS.informacion, ENCABEZADOS.informacion, id, {
      'ID de envío': id, 'Último envío': new Date(),
      'Nombre': textoSeguro(nombre), 'Correo': textoSeguro(correo),
      'Teléfono': textoSeguro(limpiar(datos.telefono, 30)), 'Edad': edad,
      'Estado': textoSeguro(limpiar(datos.estado, 40)), 'Ciudad': textoSeguro(limpiar(datos.ciudad, 80)),
      'Tutor': textoSeguro(limpiar(datos.tutorNombre, 120)), 'Correo del tutor': textoSeguro(limpiar(datos.tutorCorreo, 160)),
      'Parentesco': textoSeguro(limpiar(datos.tutorParentesco, 30)),
      'Tutor autoriza': edad < 18 ? 'Sí' : 'No aplica',
      'Nivel de estudios': textoSeguro(limpiar(datos.nivel, 60)), 'Situación': textoSeguro(limpiar(datos.situacion, 30)),
      'Institución': textoSeguro(limpiar(datos.institucion, 160)), 'Carrera': textoSeguro(limpiar(datos.carrera, 160)),
      'Semestre o año': textoSeguro(limpiar(datos.grado, 40)), 'Año de egreso': textoSeguro(limpiar(datos.anioEgreso, 4)),
      'Experiencia': textoSeguro(exp), 'Cursos y certificaciones': textoSeguro(cert), 'Idiomas': textoSeguro(idi),
      'Sectores de interés': textoSeguro(sectores), 'Aspiración': textoSeguro(limpiar(datos.aspiracion, MAX_TEXTO))
    }, true, 'Primer envío');
  }

  var info = paso === 'informacion' ? datos : null;
  var expediente = {
    'ID de envío': id, 'Última actividad': new Date(),
    'Nombre': textoSeguro(nombre), 'Correo': textoSeguro(correo),
    'Avance': completos.length + ' de ' + total,
    'Fases completas': completos.map(function (p) { return FASES_AGORA[p]; }).join(', '),
    'Última fase guardada': FASES_AGORA[paso],
    'Dispositivo': limpiar(d.dispositivo, 64)
  };
  if (info) {
    var e = parseInt(info.edad, 10);
    expediente['Edad'] = e;
    expediente['Tutor'] = textoSeguro(limpiar(info.tutorNombre, 120));
    expediente['Correo del tutor'] = textoSeguro(limpiar(info.tutorCorreo, 160));
    expediente['Tutor autoriza'] = e < 18 ? 'Sí' : 'No aplica';
  }
  escribir(PESTANAS.expediente, ENCABEZADOS.expediente, id, expediente, true, 'Alta');
  return { ok: true };
}

// ─────────────────────────── infraestructura ───────────────────────────

/**
 * Escribe una fila buscando cada columna por su encabezado. Si `actualizar`
 * es verdadero y ya existe una fila con ese ID, la reemplaza (salvo la columna
 * `columnaPrimera`, que conserva). Si no, agrega una fila al final.
 */
function escribir(nombrePestana, encabezados, id, valores, actualizar, columnaPrimera) {
  var h = pestana(nombrePestana, encabezados);
  var cab = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0].map(String);
  var col = function (n) { return cab.indexOf(n); };
  if (col('ID de envío') < 0) throw new Error('falta la columna ID de envío en ' + nombrePestana);

  var fila = -1;
  if (actualizar && h.getLastRow() > 1) {
    var ids = h.getRange(2, col('ID de envío') + 1, h.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { fila = i + 2; break; }
  }

  var actual = fila > 0 ? h.getRange(fila, 1, 1, cab.length).getValues()[0] : cab.map(function () { return ''; });
  Object.keys(valores).forEach(function (k) { if (col(k) >= 0) actual[col(k)] = valores[k]; });
  if (columnaPrimera && col(columnaPrimera) >= 0 && !actual[col(columnaPrimera)]) actual[col(columnaPrimera)] = new Date();

  if (fila > 0) h.getRange(fila, 1, 1, cab.length).setValues([actual]);
  else h.appendRow(actual);
}

/** La pestaña, creándola con sus encabezados si no existe o está vacía. */
function pestana(nombre, encabezados) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var h = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  if (h.getLastRow() === 0) {
    h.appendRow(encabezados);
    h.getRange(1, 1, 1, encabezados.length).setFontWeight('bold');
    h.setFrozenRows(1);
  }
  return h;
}

/** Para correr a mano una vez: da permisos y deja las dos pestañas listas. */
function revisarPestanas() {
  pestana(PESTANAS.disc, ENCABEZADOS.disc);
  pestana(PESTANAS.foda, ENCABEZADOS.foda);
  pestana(PESTANAS.expediente, ENCABEZADOS.expediente);
  pestana(PESTANAS.informacion, ENCABEZADOS.informacion);
}

/* Dos envíos al mismo tiempo podrían buscar el mismo ID, no encontrarlo y
   agregar dos filas. El candado lo evita. */
function conCandado(fn) {
  var candado = LockService.getScriptLock();
  if (!candado.tryLock(10000)) return { ok: false, error: 'ocupado, intenta de nuevo' };
  try { return fn(); } finally { candado.releaseLock(); }
}

function limpiar(v, max) {
  if (v === null || v === undefined) return '';
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);
}

/* Un valor que empieza con = + - @ lo interpreta la hoja como fórmula: un
   teléfono "+52…" sale como #ERROR!, y un texto malicioso podría ejecutarse.
   El apóstrofo lo deja como texto. Las listas del FODA empiezan con "•", así
   que esto sobre todo protege nombre, correo y el siguiente paso. */
function textoSeguro(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
