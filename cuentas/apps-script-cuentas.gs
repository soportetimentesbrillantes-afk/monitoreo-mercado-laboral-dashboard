/**
 * Hoja del Club — Apps Script
 * Club de Mentes Brillantes · monitoreo del mercado laboral
 *
 * Guarda los CV (como ya lo hacía) y ahora también las cuentas: usuarios,
 * historial de análisis, vacantes guardadas y cursos.
 *
 * COMPATIBLE HACIA ATRÁS. Una petición sin campo "accion" se trata como el
 * guardado de CV de siempre, validado con "clave". Publicar este script no
 * rompe lo que el sitio ya hace hoy.
 *
 * DOS PUERTAS, DOS SECRETOS, Y NO SON INTERCAMBIABLES
 *   CLAVE_CV  la usa el navegador y por lo tanto está a la vista en el HTML
 *             del sitio. No protege de nadie: sirve para filtrar ruido, no
 *             para autorizar. Solo abre el guardado de CV.
 *   SECRETO   lo usa únicamente el Worker de Cloudflare y vive como secreto
 *             ahí. Nunca se escribe en el sitio. Es lo único que abre las
 *             operaciones de cuentas.
 *
 * Si alguna vez te ves tentado a poner SECRETO en el HTML para "probar
 * rápido", no lo hagas: eso le da a cualquiera acceso a los datos de todas
 * las personas registradas.
 *
 * INSTALACIÓN
 *   Archivo → Configuración del proyecto → Propiedades del script:
 *     SECRETO   cadena larga y aleatoria, igual a HOJA_SECRETO del Worker
 *     CLAVE_CV  cmb-cv-2026 (la que ya usa el sitio)
 *     HOJA_ID   opcional; si el script está ligado a la hoja no hace falta
 *     CARPETA_CV  opcional; id de la carpeta de Drive donde guardar los CV
 *   Implementar → Nueva implementación → Aplicación web
 *     Ejecutar como: yo · Con acceso: cualquier usuario
 */

var PESTANAS = {
  // Nombre real de la pestaña que ya usa la hoja del Club. Si la renombras,
  // cámbialo aquí o el script escribirá en una pestaña nueva y los registros
  // viejos se quedarán aparte.
  cv: 'CVs recibidos',
  usuarios: 'usuarios',
  codigos: 'codigos',
  historial: 'cv_historial',
  vacantes: 'vacantes_guardadas',
  cursos: 'cursos_usuario'
};

var ENCABEZADOS = {
  usuarios:  ['id', 'correo', 'nombre', 'alta', 'ultimo_acceso', 'avisos'],
  codigos:   ['correo', 'nombre', 'hash', 'sal', 'expira', 'intentos', 'enviados_desde', 'enviados_num'],
  historial: ['uid', 'fecha', 'sector', 'cobertura', 'diagnostico', 'habilidades', 'faltantes', 'origen'],
  vacantes:  ['uid', 'fecha', 'id_vacante', 'titulo', 'empresa', 'ubicacion',
              'salario_min', 'salario_max', 'fuente', 'url', 'sector', 'vigente'],
  cursos:    ['uid', 'id_curso', 'estado', 'fecha']
};

// ───────────────────────────── infraestructura ─────────────────────────────

function prop(nombre) {
  return PropertiesService.getScriptProperties().getProperty(nombre) || '';
}

function libro() {
  var id = prop('HOJA_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Devuelve la pestaña, creándola si no existe.
 *
 * También pone los encabezados si la pestaña existe pero está vacía. Sin eso,
 * una pestaña creada a mano deja a filas() sin nombres de columna y todas las
 * búsquedas fallan en silencio, que es la peor forma de fallar.
 */
function pestana(nombre) {
  var ss = libro();
  var h = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  if (h.getLastRow() === 0) {
    var clave = Object.keys(PESTANAS).filter(function (k) { return PESTANAS[k] === nombre; })[0];
    if (ENCABEZADOS[clave]) h.appendRow(ENCABEZADOS[clave]);
  }
  return h;
}

function filas(nombre) {
  var datos = pestana(nombre).getDataRange().getValues();
  var enc = datos.shift() || [];
  return datos.map(function (fila, i) {
    var o = { _fila: i + 2 };
    enc.forEach(function (c, j) { o[c] = fila[j]; });
    return o;
  });
}

function buscar(nombre, campo, valor) {
  var todas = filas(nombre);
  for (var i = 0; i < todas.length; i++) {
    if (String(todas[i][campo]) === String(valor)) return todas[i];
  }
  return null;
}

function escribirCampo(nombre, fila, campo, valor) {
  var h = pestana(nombre);
  var enc = h.getRange(1, 1, 1, h.getLastColumn()).getValues()[0];
  var col = enc.indexOf(campo) + 1;
  if (col > 0) h.getRange(fila, col).setValue(valor);
}

/**
 * Corre fn con el candado del script tomado.
 *
 * Sin esto, dos personas guardando a la vez leen el mismo último renglón y una
 * sobrescribe a la otra. Con una hoja no hay transacciones: el candado es lo
 * único que hay.
 */
function conCandado(fn) {
  var candado = LockService.getScriptLock();
  if (!candado.tryLock(20000)) throw new Error('La hoja está ocupada; intenta de nuevo.');
  try { return fn(); } finally { candado.releaseLock(); }
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ──────────────────────────────── entrada ────────────────────────────────

function doPost(e) {
  var datos;
  try {
    datos = JSON.parse(e.postData.contents);
  } catch (err) {
    return respuesta({ ok: false, error: 'cuerpo ilegible' });
  }

  try {
    // Sin "accion" es el guardado de CV de siempre.
    if (!datos.accion) {
      if (String(datos.clave) !== prop('CLAVE_CV')) return respuesta({ ok: false, error: 'clave inválida' });
      return respuesta(conCandado(function () { return guardarCVSuelto(datos); }));
    }

    if (String(datos.secreto) !== prop('SECRETO') || !prop('SECRETO')) {
      return respuesta({ ok: false, error: 'no autorizado' });
    }

    switch (datos.accion) {
      case 'guardar-codigo':       return respuesta(conCandado(function () { return guardarCodigo(datos); }));
      case 'leer-codigo':          return respuesta(leerCodigo(datos));
      case 'fallar-intento':       return respuesta(conCandado(function () { return fallarIntento(datos); }));
      case 'confirmar-usuario':    return respuesta(conCandado(function () { return confirmarUsuario(datos); }));
      case 'leer-cuenta':          return respuesta(leerCuenta(datos));
      case 'guardar-cv':           return respuesta(conCandado(function () { return guardarCV(datos); }));
      case 'guardar-vacante':      return respuesta(conCandado(function () { return guardarVacante(datos); }));
      case 'guardar-curso':        return respuesta(conCandado(function () { return guardarCurso(datos); }));
      case 'guardar-preferencias': return respuesta(conCandado(function () { return guardarPreferencias(datos); }));
      default:                     return respuesta({ ok: false, error: 'acción desconocida' });
    }
  } catch (err) {
    return respuesta({ ok: false, error: String(err && err.message || err) });
  }
}

// ─────────────────────────── guardado de CV ───────────────────────────

/* Las 20 primeras columnas son EXACTAMENTE las que ya tenía la hoja, en su
   orden original: los registros viejos siguen cuadrando. Las nuevas van
   después. Si agregas más, agrégalas AL FINAL por la misma razón. */
var COLUMNAS_CV = [
  'Marca de tiempo', 'Página', 'Nombre', 'Correo', 'Teléfono', 'Ciudad',
  'Sector de interés', 'Puesto objetivo', 'Años de experiencia (aprox.)',
  'Habilidades detectadas', 'Habilidades que le faltan (top)',
  '% de cobertura del sector', 'Diagnóstico de formato (%)', 'Origen del análisis',
  'Aceptó aviso y términos', 'Quiere recibir avisos', 'Archivo del CV',
  'Nombre del archivo', 'Caracteres del CV', 'ID de envío',
  'Nombre(s)', 'Apellido paterno', 'Apellido materno', 'Estado', 'Carrera',
  'Universidad', 'Año de egreso', 'Nivel de inglés', 'Datos confirmados',
  'Última actualización'
];

/**
 * Evita el #ERROR! de Sheets.
 *
 * Un teléfono como "+52 55 1122 3344" empieza con +, así que Sheets lo toma por
 * una fórmula, no la puede evaluar y escribe #ERROR! en la celda. Pasó de
 * verdad: el primer registro real de la hoja tiene el teléfono así. El
 * apóstrofo inicial fuerza texto y no se muestra ni se devuelve al leer.
 */
function textoSeguro(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function filaCV(d, archivoUrl, archivoNombre) {
  return [
    new Date(),
    textoSeguro(d.pagina), textoSeguro(d.nombreCompleto || d.nombre),
    textoSeguro(d.correo), textoSeguro(d.telefono), textoSeguro(d.ciudad),
    textoSeguro(d.sector), textoSeguro(d.puestoObjetivo), textoSeguro(d.aniosExperiencia),
    (d.habilidadesDetectadas || []).join(', '), (d.habilidadesFaltantes || []).join(', '),
    d.cobertura === '' || d.cobertura === undefined ? '' : d.cobertura,
    d.diagnostico === '' || d.diagnostico === undefined ? '' : d.diagnostico,
    textoSeguro(d.origenAnalisis), d.acepta === true ? 'Sí' : 'No',
    d.avisos === true ? 'Sí' : 'No',
    archivoUrl, archivoNombre,
    d.caracteres || '', textoSeguro(d.idEnvio),
    textoSeguro(d.nombres), textoSeguro(d.apellidoPaterno), textoSeguro(d.apellidoMaterno),
    textoSeguro(d.estado), textoSeguro(d.carrera), textoSeguro(d.universidad),
    textoSeguro(d.anioEgreso), textoSeguro(d.nivelIngles),
    d.datosConfirmados === true ? 'Sí' : 'No',
    new Date()
  ];
}

/**
 * Escribe el registro del CV.
 *
 * Si ya hay un renglón con el mismo ID de envío, lo ACTUALIZA en vez de
 * agregar otro: el sitio guarda primero lo que leyó del CV y vuelve a escribir
 * cuando la persona corrige sus datos. Sin esto quedarían dos renglones por
 * persona, uno bueno y uno malo, sin forma de saber cuál es cuál.
 */
function guardarCVSuelto(d) {
  var h = pestana(PESTANAS.cv);
  if (h.getLastRow() === 0) h.appendRow(COLUMNAS_CV);

  var previo = d.idEnvio ? buscar(PESTANAS.cv, 'ID de envío', d.idEnvio) : null;

  // El archivo solo se sube en la primera escritura; en la confirmación se
  // conserva el que ya estaba para no duplicarlo en Drive.
  var archivoUrl = previo ? String(previo['Archivo del CV'] || '') : '';
  var archivoNombre = previo ? String(previo['Nombre del archivo'] || '') : '';
  if (d.archivo && !archivoUrl) {
    archivoUrl = guardarArchivo(d.archivo, d.idEnvio);
    archivoNombre = d.archivo.nombre || '';
  }

  var fila = filaCV(d, archivoUrl, archivoNombre);
  if (previo) {
    // La marca de tiempo original no se toca: dice cuándo llegó la persona.
    fila[0] = previo['Marca de tiempo'] || new Date();
    h.getRange(previo._fila, 1, 1, fila.length).setValues([fila]);
  } else {
    h.appendRow(fila);
  }
  return { ok: true, actualizado: !!previo };
}

function guardarArchivo(a, idEnvio) {
  try {
    var carpetaId = prop('CARPETA_CV');
    if (!carpetaId) return '';
    var fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
    var nombre = fecha + ' ' + (idEnvio || '') + ' ' + (a.nombre || 'cv');
    var blob = Utilities.newBlob(Utilities.base64Decode(a.contenido),
      a.tipo || 'application/octet-stream', nombre.replace(/\s+/g, ' ').trim());
    return DriveApp.getFolderById(carpetaId).createFile(blob).getUrl();
  } catch (err) {
    return 'error: ' + err.message;
  }
}

// ───────────────────────────── códigos de acceso ─────────────────────────────

/**
 * Guarda el hash del código y manda el correo.
 *
 * La hoja ve el código en claro un instante porque es quien envía el correo,
 * pero solo escribe el hash. Quien lea la hoja después no puede entrar.
 */
function guardarCodigo(d) {
  var correo = String(d.correo || '').toLowerCase();
  var fila = buscar(PESTANAS.codigos, 'correo', correo);
  var ahora = Date.now();
  var hora = 3600000;

  // Tope por correo: sin esto, cualquiera vacía la cuota diaria del Club
  // pidiendo códigos en bucle para un correo que no es suyo.
  var desde = fila ? Number(fila.enviados_desde) || 0 : 0;
  var num = fila ? Number(fila.enviados_num) || 0 : 0;
  if (ahora - desde > hora) { desde = ahora; num = 0; }
  if (num >= Number(d.codigosPorHora || 3)) {
    return { ok: true, limitado: true };
  }

  // Cuota real de Google, no una cuenta propia: una cuenta gmail.com tiene
  // 100 destinatarios al día, compartidos con todo lo que mande este script.
  if (MailApp.getRemainingDailyQuota() < 1) {
    return { ok: true, cuotaAgotada: true };
  }

  var valores = [correo, d.nombre || '', d.hash, d.sal, d.expira, d.intentos, desde, num + 1];
  if (fila) {
    pestana(PESTANAS.codigos).getRange(fila._fila, 1, 1, valores.length).setValues([valores]);
  } else {
    pestana(PESTANAS.codigos).appendRow(valores);
  }

  MailApp.sendEmail({
    to: correo,
    subject: 'Tu código de acceso — Club de Mentes Brillantes',
    body: 'Hola' + (d.nombre ? ' ' + d.nombre : '') + ':\n\n' +
      'Tu código para entrar a tu cuenta es:\n\n    ' + d.codigoParaCorreo + '\n\n' +
      'Vence en ' + (d.vigenciaMin || 10) + ' minutos.\n\n' +
      'Si no fuiste tú quien lo pidió, ignora este mensaje: sin el código nadie ' +
      'puede entrar, y tu correo no queda registrado por haberlo recibido.\n\n' +
      'Club de Mentes Brillantes'
  });

  return { ok: true };
}

function leerCodigo(d) {
  var fila = buscar(PESTANAS.codigos, 'correo', String(d.correo || '').toLowerCase());
  if (!fila) return { ok: true, pendiente: null };
  return {
    ok: true,
    pendiente: {
      hash: String(fila.hash),
      sal: String(fila.sal),
      expira: Number(fila.expira),
      intentos: Number(fila.intentos)
    }
  };
}

function fallarIntento(d) {
  var fila = buscar(PESTANAS.codigos, 'correo', String(d.correo || '').toLowerCase());
  if (fila) escribirCampo(PESTANAS.codigos, fila._fila, 'intentos', Math.max(0, Number(fila.intentos) - 1));
  return { ok: true };
}

// ─────────────────────────────── cuentas ───────────────────────────────

function confirmarUsuario(d) {
  var correo = String(d.correo || '').toLowerCase();
  var u = buscar(PESTANAS.usuarios, 'correo', correo);

  if (!u) {
    var id = Utilities.getUuid();
    pestana(PESTANAS.usuarios).appendRow([id, correo, d.nombre || '', new Date(), new Date(), d.avisos === true]);
    u = { id: id, correo: correo, nombre: d.nombre || '', avisos: d.avisos === true };
  } else {
    escribirCampo(PESTANAS.usuarios, u._fila, 'ultimo_acceso', new Date());
    // El nombre solo se rellena si estaba vacío: si la persona ya lo corrigió,
    // no se lo volvemos a pisar con lo que diga el CV.
    if (!String(u.nombre || '').trim() && d.nombre) {
      escribirCampo(PESTANAS.usuarios, u._fila, 'nombre', d.nombre);
      u.nombre = d.nombre;
    }
  }

  // El código ya se usó: se borra el renglón entero.
  var c = buscar(PESTANAS.codigos, 'correo', correo);
  if (c) pestana(PESTANAS.codigos).deleteRow(c._fila);

  return {
    ok: true,
    usuario: { id: String(u.id), correo: correo, nombre: String(u.nombre || ''), avisos: u.avisos === true }
  };
}

function mias(nombre, uid) {
  return filas(nombre).filter(function (f) { return String(f.uid) === String(uid); });
}

function leerCuenta(d) {
  var u = buscar(PESTANAS.usuarios, 'id', d.uid);
  if (!u) return { ok: true, usuario: null };
  return {
    ok: true,
    usuario: { id: String(u.id), correo: String(u.correo), nombre: String(u.nombre || ''), avisos: u.avisos === true },
    historial: mias(PESTANAS.historial, d.uid).map(function (f) {
      return {
        fecha: f.fecha, sector: f.sector, cobertura: f.cobertura,
        diagnostico: f.diagnostico, origen: f.origen,
        habilidades: String(f.habilidades || '').split('; ').filter(Boolean)
      };
    }),
    vacantes: mias(PESTANAS.vacantes, d.uid).map(function (f) {
      return {
        id: f.id_vacante, titulo: f.titulo, empresa: f.empresa, ubicacion: f.ubicacion,
        salarioMin: f.salario_min, salarioMax: f.salario_max, fuente: f.fuente,
        url: f.url, sector: f.sector, vigente: f.vigente !== false, fecha: f.fecha
      };
    }),
    cursos: mias(PESTANAS.cursos, d.uid).map(function (f) {
      return { idCurso: f.id_curso, estado: f.estado, fecha: f.fecha };
    })
  };
}

function guardarCV(d) {
  var a = d.analisis || {};
  pestana(PESTANAS.historial).appendRow([
    d.uid, new Date(), a.sector || '', a.cobertura || '', a.diagnostico || '',
    (a.habilidades || []).join('; '), (a.faltantes || []).join('; '), a.origen || ''
  ]);
  return { ok: true };
}

/**
 * Guarda o quita una vacante.
 *
 * Se guarda la instantánea completa, no solo el id. El pipeline retira las
 * vacantes por recencia cada semana; si solo tuviéramos la referencia, la
 * lista de la persona se llenaría de ligas muertas sin explicación. Lo que
 * expira se marca "vigente = false" y se dice, que es la regla del proyecto.
 */
function guardarVacante(d) {
  var v = d.vacante || {};
  var existente = null;
  mias(PESTANAS.vacantes, d.uid).forEach(function (f) {
    if (String(f.id_vacante) === String(v.id)) existente = f;
  });

  if (d.quitar) {
    if (existente) pestana(PESTANAS.vacantes).deleteRow(existente._fila);
    return { ok: true };
  }
  if (existente) return { ok: true, yaEstaba: true };

  pestana(PESTANAS.vacantes).appendRow([
    d.uid, new Date(), v.id || '', v.titulo || '', v.empresa || '', v.ubicacion || '',
    v.salarioMin || '', v.salarioMax || '', v.fuente || '', v.url || '', v.sector || '', true
  ]);
  return { ok: true };
}

function guardarCurso(d) {
  var existente = null;
  mias(PESTANAS.cursos, d.uid).forEach(function (f) {
    if (String(f.id_curso) === String(d.idCurso)) existente = f;
  });
  if (existente) {
    escribirCampo(PESTANAS.cursos, existente._fila, 'estado', d.estado);
    escribirCampo(PESTANAS.cursos, existente._fila, 'fecha', new Date());
  } else {
    pestana(PESTANAS.cursos).appendRow([d.uid, d.idCurso, d.estado, new Date()]);
  }
  return { ok: true };
}

function guardarPreferencias(d) {
  var u = buscar(PESTANAS.usuarios, 'id', d.uid);
  if (u) escribirCampo(PESTANAS.usuarios, u._fila, 'avisos', d.avisos === true);
  return { ok: true };
}

/**
 * Limpieza diaria. Conéctalo a un activador de tiempo (Activadores → Añadir).
 * Borra los códigos vencidos: son basura y además no queremos hashes de
 * códigos viejos acumulándose en la hoja.
 */
function limpiarCodigosVencidos() {
  conCandado(function () {
    var h = pestana(PESTANAS.codigos);
    var todas = filas(PESTANAS.codigos);
    // De abajo hacia arriba: borrar de arriba recorre los índices de abajo.
    for (var i = todas.length - 1; i >= 0; i--) {
      if (Number(todas[i].expira) < Date.now()) h.deleteRow(todas[i]._fila);
    }
    return { ok: true };
  });
}
