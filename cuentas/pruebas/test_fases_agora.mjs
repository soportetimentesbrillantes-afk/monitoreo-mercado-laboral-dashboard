/**
 * Pruebas de las fases 4 a 10 del proceso Ágora (agora/*.js) y de su parte
 * del Apps Script (pestañas por fase y el correo al tutor).
 *
 *   node cuentas/pruebas/test_fases_agora.mjs
 *
 * Lo que importa: que cada fase se arme con lo que la persona ya contestó y
 * diga de dónde sale; que no se dé por completa con huecos y diga qué falta;
 * que lo que se marca sobreviva a recargar; que al expediente llegue solo lo
 * que la persona eligió, y solo con la casilla; que el reporte final no
 * invente (lo que falta sale como pendiente) y se imprima solo el documento;
 * y que el correo al tutor lo mande una persona del Club, nunca la página.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import vm from 'node:vm';

const requerir = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = requerir('playwright')); }
catch {
  try { ({ chromium } = requerir(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
  catch { console.error('Falta Playwright. Instálalo con:  npm install -g playwright'); process.exit(2); }
}

const RAIZ = new URL('../../', import.meta.url).pathname;
const TIPOS = { '.html':'text/html', '.json':'application/json', '.svg':'image/svg+xml', '.js':'text/javascript' };
const servidor = createServer(async (req, res) => {
  try {
    const ruta = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const archivo = join(RAIZ, ruta === '/' ? 'index.html' : ruta);
    res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] || 'application/octet-stream' });
    res.end(await readFile(archivo));
  } catch { res.writeHead(404).end('no'); }
});
await new Promise((r) => servidor.listen(0, r));
const BASE = 'http://127.0.0.1:' + servidor.address().port;
const FALSO = 'https://script.google.com/macros/s/PRUEBA/exec';

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

/* Una persona que ya hizo las fases 1 a 3: Ana, 16 años, prepa, le interesan
   Finanzas y TI, quiere estudiar arquitectura o finanzas. DISC: Estabilidad
   (63) y Cumplimiento (51), los números del informe de ejemplo de Ágora. */
const INFO = { nombres:'Ana', apellidoPaterno:'Pérez', apellidoMaterno:'', correo:'ana@ejemplo.com', telefono:'', edad:'16', estado:'Puebla', ciudad:'',
  tutorNombre:'María Pérez', tutorCorreo:'maria@ejemplo.com', tutorParentesco:'Madre', tutorAutoriza:true,
  nivel:'Preparatoria o bachillerato', situacion:'Estudiando', institucion:'Prepa 5', carrera:'', grado:'', anioEgreso:'',
  sinExperiencia:true, experiencia:[], sinCertificaciones:true, certificaciones:[], idiomas:[{ idioma:'Español', nivel:'Nativo' }],
  sectores:['Finanzas', 'TI'], sectorOtro:'', aspiracion:'Me gustaría estudiar arquitectura o algo de finanzas' };
const DISC_R = { puntajes:{ D:{neto:31}, I:{neto:35}, S:{neto:63}, C:{neto:51} }, fecha:'2026-10-26', version:2, instrumento:'agora', escala:{min:0, max:82}, id:'r1' };
const FODA_R = { nombre:'Ana Pérez', F:'Objetiva\nCreativa', D:'Procrastinación\nPerfeccionismo', O:'Apoyo familiar', A:'Dependencia económica', paso:'Organizar mi semana', fecha:'2026-10-26', version:1 };
function estado({ consiente = true, conDisc = true } = {}) {
  return {
    agora: { version:1, id:'aaaaaaaaaaaaaaaaaaaaaaaa', consentimiento:{ acepta: consiente, fecha: consiente ? '2026-10-26T10:00:00Z' : null },
      pasos:{ informacion:{ completo:true, datos: INFO, enviadoEn:'2026-10-26T10:00:00Z' }, foda:{ completo:true, enviadoEn:'2026-10-26T10:00:00Z' } } },
    disc: conDisc ? DISC_R : null, foda: FODA_R
  };
}

const navegador = await chromium.launch();
const errores = [];
async function abrir(hash, opciones = {}) {
  const ctx = await navegador.newContext();
  const enviados = [];
  const e = estado(opciones);
  await ctx.addInitScript(([e, u]) => {
    window.__CMB_ENDPOINT_PRUEBA = u;
    if (!localStorage.getItem('cmb_agora')) {
      localStorage.setItem('cmb_agora', JSON.stringify(e.agora));
      if (e.disc) localStorage.setItem('cmb_disc', JSON.stringify(e.disc));
      localStorage.setItem('cmb_foda', JSON.stringify(e.foda));
    }
  }, [e, FALSO]);
  const p = await ctx.newPage();
  p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.route(/script\.google\.com/, async (r) => {
    enviados.push(JSON.parse(r.request().postData() || '{}'));
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await p.goto(BASE + '/agora.html#' + hash, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#cuerpoFase, #marcoHerramienta');
  return { p, ctx, enviados };
}
const marcar = async (p, grupo, n) => { const c = await p.$$(`#cuerpoFase input[data-grupo="${grupo}"]`); for (const x of c.slice(0, n)) await x.check(); };
const aviso = (p) => p.textContent('#avisoFase');
const completar = async (p) => { await p.click('#btnCompletar'); await p.waitForTimeout(150); };
const ultimo = (env, paso) => env.filter(x => x.paso === paso).pop();

console.log('\nFases 4 a 10 del proceso Ágora');

await prueba('todas las fases están disponibles, y las que dependen del DISC lo piden si falta', async () => {
  const { p, ctx } = await abrir('estilo', { conDisc: false });
  igual(await p.locator('#listaFases .paso:not([disabled])').count(), 10);
  cierto((await p.textContent('#cuerpoFase')).includes('Perfil DISC'), 'debe decir que falta el Perfil DISC');
  await p.click('#cuerpoFase [data-abrir="disc"]');
  await p.waitForSelector('#marcoHerramienta');
  cierto(await p.evaluate(() => pasoActual === 'disc'));
  await ctx.close();
});

await prueba('fase 4: sale de su DISC, pide al menos 3 frases y manda solo lo marcado', async () => {
  const { p, ctx, enviados } = await abrir('estilo');
  cierto((await p.textContent('#cuerpoFase')).includes('Orientado a los procesos, con apoyo en la información'), 'orientación S con C');
  await marcar(p, 'trabajo', 2);
  await completar(p);
  cierto((await aviso(p)).includes('al menos 3'), 'debe pedir 3');
  igual(ultimo(enviados, 'estilo'), undefined);
  await marcar(p, 'ambiente', 1);
  await p.fill('#f_estilo_palabras', 'Organicé la kermés de la prepa');
  await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  const e = ultimo(enviados, 'estilo');
  cierto(e, 'debe mandarse');
  igual(e.datos.hoja['Orientación'], 'Orientado a los procesos, con apoyo en la información');
  igual(e.datos.hoja['Estilo DISC'], 'Estabilidad con Cumplimiento');
  igual(e.datos.hoja['Cómo trabajo'].split('\n').length, 2);
  igual(e.datos.hoja['En mis palabras'], 'Organicé la kermés de la prepa');
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#cuerpoFase input[data-grupo="trabajo"]');
  igual(await p.locator('#cuerpoFase input[data-grupo="trabajo"]:checked').count(), 2, 'lo marcado sobrevive a recargar');
  await ctx.close();
});

await prueba('fase 5: pide lo que le funciona, su papel y el estilo que le cuesta', async () => {
  const { p, ctx, enviados } = await abrir('relacion');
  cierto((await p.textContent('#cuerpoFase')).includes('quien sostiene al equipo'), 'sugiere el papel de S');
  await completar(p);
  const a = await aviso(p);
  cierto(a.includes('2 cosas') && a.includes('papel') && a.includes('estilo'), 'lista los tres faltantes');
  await marcar(p, 'funciona', 2);
  await p.check('input[name="papel"] >> nth=2');
  await p.check('input[name="cuesta"] >> nth=0');
  await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  const e = ultimo(enviados, 'relacion');
  igual(e.datos.hoja['Mi papel en equipo'], 'Quien sostiene al equipo, escucha y concilia');
  igual(e.datos.hoja['Estilo con el que me cuesta'], 'Dominancia');
  await ctx.close();
});

await prueba('fase 6: cruza lo que espera con lo que sugiere su perfil, pide prioridad y arma el correo a la familia', async () => {
  const { p, ctx, enviados } = await abrir('crecimiento');
  cierto((await p.textContent('#cuerpoFase')).includes('Procrastinación'), 'trae las debilidades de su FODA');
  await p.check('#cuerpoFase input[data-grupo="esperas"][value="Expresar lo que pienso y siento"]');
  await p.check('#cuerpoFase input[data-grupo="areas"][value="Di lo que quieres decir; no siempre te reprimas."]');
  await p.check('#cuerpoFase input[data-grupo="areas"][value="Procrastinación"]');
  cierto((await p.textContent('#cre_cruce')).includes('Donde coinciden'), 'debe marcar la coincidencia');
  await completar(p);
  cierto((await aviso(p)).includes('prioridad'));
  await p.selectOption('#f_cre_prioridad', 'Procrastinación');
  await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  const e = ultimo(enviados, 'crecimiento');
  igual(e.datos.hoja['Primera prioridad'], 'Procrastinación');
  cierto(e.datos.hoja['Habilidades a reforzar'].includes('toma de decisiones'));
  const href = await p.evaluate(() => { const a = document.getElementById('cre_correo'); a.dispatchEvent(new MouseEvent('click', { cancelable: true })); return a.href; });
  cierto(href.startsWith('mailto:maria@ejemplo.com?'), 'va al correo de la mamá: ' + href.slice(0, 40));
  cierto(decodeURIComponent(href).includes('Mi primera prioridad: Procrastinación'), 'lleva sus resultados');
  igual(enviados.filter(x => x.tipo !== 'agora').length, 0, 'la página no manda correos');
  await ctx.close();
});

await prueba('fase 7: propone por horizonte con su edad, y pide dos áreas en cada uno', async () => {
  const { p, ctx, enviados } = await abrir('escenarios');
  cierto((await p.textContent('details[data-h="5"] summary')).includes('tendrás 21 años'));
  await p.click('[data-usar="5_estudios"]');
  cierto((await p.inputValue('#f_esc_5_estudios')).includes('carrera'), 'la propuesta entra al campo');
  await p.fill('#f_esc_5_trabajo', 'Prácticas en un despacho');
  await completar(p);
  const a = await aviso(p);
  cierto(a.includes('10 años') && a.includes('15 años') && !a.includes('a 5 años'), 'solo faltan 10 y 15');
  for (const h of [10, 15]) { await p.fill(`#f_esc_${h}_trabajo`, 'Trabajo ' + h); await p.fill(`#f_esc_${h}_dinero`, 'Dinero ' + h); }
  await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  const e = ultimo(enviados, 'escenarios');
  cierto(e.datos.hoja['A 5 años'].startsWith('Estudios: '));
  igual(e.datos.hoja['A 15 años'], 'Trabajo: Trabajo 15\nDinero e independencia: Dinero 15');
  await ctx.close();
});

await prueba('fase 8: propone lo que mencionó, mide afinidad y mercado, y pide ruta y porqué', async () => {
  const { p, ctx, enviados } = await abrir('ruta');
  await p.waitForFunction(() => document.querySelector('#rut_mapa').textContent.includes('vacantes'));
  const cons = await p.evaluate(() => [...document.querySelectorAll('[data-considerada]')].map(x => x.value).filter(Boolean));
  cierto(cons.includes('Arquitectura') && cons.includes('Finanzas'), 'prellena con lo que escribió: ' + cons);
  const mapa = await p.textContent('#rut_mapa');
  cierto(mapa.includes('Media'), 'Finanzas (C, D) con una persona S-C: afinidad media');
  cierto(mapa.includes('no cubre este sector'), 'Arquitectura no tiene dato de mercado y lo dice');
  cierto((await p.textContent('#rut_afines')).includes('Alta'), 'sugiere afines de afinidad alta');
  await p.selectOption('#f_rut_principal', 'Finanzas');
  await p.waitForFunction(() => document.querySelector('#rut_mercado').textContent.includes('583'));
  await completar(p);
  cierto((await aviso(p)).includes('por qué'));
  await p.fill('#f_rut_porque', 'Me gustan los números y planear');
  await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  const e = ultimo(enviados, 'ruta');
  igual(e.datos.hoja['Ruta principal'], 'Finanzas');
  cierto(e.datos.hoja['Compatibilidad'].includes('Finanzas — afinidad media, sector que le interesa'));
  await ctx.close();
});

await prueba('fase 9: sugiere desde las fases anteriores, se agregan o se escriben, y pide algo en cada plazo', async () => {
  const { p, ctx, enviados } = await abrir('plan');
  const sug = await p.textContent('#pln_sug');
  cierto(sug.includes('Organizar mi semana'), 'trae el siguiente paso de su FODA');
  await p.click('#pln_sug [data-sug*="Organizar mi semana"]');
  igual(await p.locator('[data-lista="30"] .accion').count(), 1);
  cierto(await p.isDisabled('#pln_sug [data-sug*="Organizar mi semana"]'), 'una sugerencia agregada no se repite');
  await p.fill('#f_pln_txt_60', 'Hablar con mi tío que es contador');
  await p.selectOption('#f_pln_tipo_60', 'Conexión');
  await p.press('#f_pln_txt_60', 'Enter');
  igual(await p.locator('[data-lista="60"] .accion').count(), 1);
  await completar(p);
  cierto((await aviso(p)).includes('90 días'));
  await p.fill('#f_pln_txt_90', 'Ir a la feria vocacional');
  await p.click('[data-propia="90"]');
  await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  const e = ultimo(enviados, 'plan');
  igual(e.datos.hoja['60 días'], '[Conexión] Hablar con mi tío que es contador');
  cierto(e.datos.hoja['30 días'].startsWith('[Experiencia] Tu siguiente paso del FODA'));
  await p.click('[data-lista="90"] .quitar');
  igual(await p.locator('[data-lista="90"] .accion').count(), 0, 'se puede quitar');
  await ctx.close();
});

await prueba('fase 10: con fases pendientes no deja terminar, y el reporte lo dice sin inventar', async () => {
  const { p, ctx } = await abrir('resumen');
  cierto(await p.isDisabled('#btnCompletar'));
  const doc = await p.textContent('#documento');
  cierto(doc.includes('Ana Pérez') && doc.includes('Estabilidad (S): 63') && doc.includes('Muy alto'), 'trae su perfil');
  cierto(doc.includes('Pendiente: completa la fase 4'), 'lo que falta sale como pendiente');
  cierto(doc.includes('Principal reto del perfil'), 'deja el espacio del orientador');
  cierto(await p.evaluate(() => document.body.classList.contains('con-documento')));
  await p.emulateMedia({ media: 'print' });
  igual(await p.evaluate(() => getComputedStyle(document.querySelector('.ruta')).display), 'none', 'al imprimir no sale la ruta');
  igual(await p.evaluate(() => getComputedStyle(document.querySelector('#cuerpoFase .no-imprimir')).display), 'none', 'ni los botones');
  igual(await p.evaluate(() => getComputedStyle(document.getElementById('documento')).display), 'block', 'sí el documento');
  await ctx.close();
});

await prueba('el proceso completo: las diez fases, el reporte y el cierre en el expediente', async () => {
  const { p, ctx, enviados } = await abrir('estilo');
  await marcar(p, 'trabajo', 3); await completar(p);
  await p.click('[data-paso="relacion"]'); await marcar(p, 'funciona', 2);
  await p.check('input[name="papel"] >> nth=2'); await p.check('input[name="cuesta"] >> nth=3'); await completar(p);
  await p.click('[data-paso="crecimiento"]'); await marcar(p, 'esperas', 1); await marcar(p, 'areas', 2);
  await p.selectOption('#f_cre_prioridad', { index: 1 }); await completar(p);
  await p.click('[data-paso="escenarios"]');
  for (const h of [5, 10, 15]) { await p.evaluate((h) => { document.querySelector('details[data-h="' + h + '"]').open = true; }, h); await p.click(`[data-usar="${h}_estudios"]`); await p.click(`[data-usar="${h}_dinero"]`); }
  await completar(p);
  await p.click('[data-paso="ruta"]'); await p.waitForTimeout(300);
  await p.selectOption('#f_rut_principal', 'Finanzas'); await p.fill('#f_rut_porque', 'Me gustan los números'); await completar(p);
  await p.click('[data-paso="plan"]');
  for (const pl of [30, 60, 90]) { await p.fill('#f_pln_txt_' + pl, 'Acción ' + pl); await p.click(`[data-propia="${pl}"]`); }
  await completar(p);
  await p.click('[data-paso="resumen"]');
  await p.waitForSelector('#documento');
  igual(await p.textContent('#avanceTxt'), '9 de 10 fases completas');
  const doc = await p.textContent('#documento');
  cierto(!doc.includes('Pendiente:'), 'nada pendiente');
  cierto(doc.includes('Finanzas') && doc.includes('Acción 60') && doc.includes('Orientado a los procesos'));
  await p.waitForFunction(() => document.getElementById('documento').textContent.includes('El mercado hoy en Finanzas'));
  cierto(!(await p.isDisabled('#btnCompletar')));
  await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  igual(await p.textContent('#avanceTxt'), '10 de 10 fases completas');
  const e = ultimo(enviados, 'resumen');
  cierto(/^\d{4}-\d{2}-\d{2}$/.test(e.datos.hoja['Proceso terminado']));
  igual(e.datos.hoja['Ruta principal'], 'Finanzas');
  igual(e.completos.length, 10);
  const href = await p.evaluate(() => { const a = document.getElementById('res_correo'); a.dispatchEvent(new MouseEvent('click', { cancelable: true })); return a.href; });
  cierto(href.startsWith('mailto:maria@ejemplo.com?') && decodeURIComponent(href).includes('Mi ruta profesional: Finanzas'));
  await ctx.close();
});

await prueba('sin la casilla del expediente, ninguna fase manda nada', async () => {
  const { p, ctx, enviados } = await abrir('estilo', { consiente: false });
  await marcar(p, 'trabajo', 3); await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  await p.click('[data-paso="plan"]');
  for (const pl of [30, 60, 90]) { await p.fill('#f_pln_txt_' + pl, 'Acción ' + pl); await p.click(`[data-propia="${pl}"]`); }
  await completar(p);
  await p.waitForTimeout(200);
  igual(enviados.length, 0);
  await ctx.close();
});

await prueba('los textos de la persona se escapan en el reporte', async () => {
  const { p, ctx } = await abrir('plan');
  await p.fill('#f_pln_txt_30', '<img src=x onerror=alert(1)>');
  await p.click('[data-propia="30"]');
  await p.click('[data-paso="resumen"]');
  await p.waitForSelector('#documento');
  igual(await p.evaluate(() => document.querySelectorAll('img[src="x"]').length), 0);
  await ctx.close();
});

await navegador.close();
servidor.close();

/* ------------------------------ Apps Script ------------------------------ */
console.log('\nApps Script — fases 4 a 10 y correo al tutor');
const codigo = await readFile(join(RAIZ, 'cuentas/apps-script-autoconocimiento.gs'), 'utf8');
function cargar() {
  const pestanas = {}; const correos = []; const alertas = []; let activa = null, filaActiva = 2, respuesta = 'YES';
  const crear = (nombre) => { const filas = []; const h = { filas, getName: () => nombre,
    getLastRow: () => filas.length, getLastColumn: () => Math.max(0, ...filas.map(f => f.length)),
    appendRow: (f) => filas.push(f.slice()),
    getActiveRange: () => ({ getRow: () => filaActiva }),
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (filas[r - 1 + i] || [])[c - 1 + j] ?? '')),
      setValues: (v) => v.forEach((fila, i) => { filas[r - 1 + i] = filas[r - 1 + i] || []; fila.forEach((x, j) => { filas[r - 1 + i][c - 1 + j] = x; }); }),
      setValue: (x) => { filas[r - 1] = filas[r - 1] || []; filas[r - 1][c - 1] = x; },
      setFontWeight: () => {} }),
    setFrozenRows: () => {} }; pestanas[nombre] = h; return h; };
  const ui = { alert: (...a) => { alertas.push(a.join(' | ')); return respuesta; }, ButtonSet: { YES_NO: 'YES_NO' }, Button: { YES: 'YES', NO: 'NO' },
    createMenu: () => ({ addItem() { return this; }, addToUi() {} }) };
  const ctx = { SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => pestanas[n] || null, insertSheet: crear, getActiveSheet: () => activa }), getUi: () => ui },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }) },
    MailApp: { sendEmail: (o) => correos.push(o) },
    JSON, Date, String, Object, Math, Array, isFinite, parseInt, isNaN };
  vm.createContext(ctx); vm.runInContext(codigo, ctx);
  return { post: (d) => ctx.doPost({ postData: { contents: JSON.stringify(d) } }), pestanas, correos, alertas, ctx,
    activar: (n, fila) => { activa = pestanas[n]; filaActiva = fila || 2; }, responder: (r) => { respuesta = r; } };
}
const B = { clave: 'cmb-autoconocimiento-2026', acepta: true, tipo: 'agora', id: 'aaaaaaaaaaaaaaaaaaaaaaaa', nombre: 'Ana Pérez', correo: 'ana@ejemplo.com', total: 10, dispositivo: 'disp12345678' };
const INFO_AS = Object.assign({}, B, { paso: 'informacion', completos: ['informacion'], datos: Object.assign({}, INFO, { tutorAutoriza: true }) });
const fase = (paso, hoja, completos) => Object.assign({}, B, { paso, completos: completos || ['informacion', paso], datos: { hoja } });
const col = (h, n) => h.filas[0].indexOf(n);

await prueba('cada fase escribe su pestaña con el ID del expediente, solo con las columnas conocidas', async () => {
  const { post, pestanas } = cargar();
  igual(post(fase('estilo', { 'Orientación': 'Orientado a los procesos' })).error, 'falta información inicial');
  post(INFO_AS);
  igual(post(fase('estilo', { 'Orientación': 'Orientado a los procesos', 'Cómo trabajo': '• Estable', 'Columna inventada': 'x', 'En mis palabras': '=HYPERLINK("x")' })).ok, true);
  const h = pestanas['Ágora · Estilo de trabajo'];
  igual(h.filas[1][col(h, 'ID de envío')], B.id);
  igual(h.filas[1][col(h, 'Cómo trabajo')], '• Estable');
  igual(col(h, 'Columna inventada'), -1, 'no se crean columnas que manda la página');
  igual(h.filas[1][col(h, 'En mis palabras')], "'=HYPERLINK(\"x\")", 'una fórmula entra como texto');
  igual(post(fase('estilo', {})).error, 'sin datos');
  post(fase('estilo', { 'Orientación': 'Otra' }));
  igual(h.filas.length, 2, 'rehacerla actualiza la fila');
  const ex = pestanas['Expediente Ágora'];
  igual(ex.filas[1][col(ex, 'Última fase guardada')], 'Estilo de trabajo');
});

await prueba('el resumen marca el proceso como terminado en el expediente', async () => {
  const { post, pestanas, ctx } = cargar();
  post(INFO_AS);
  igual(post(fase('resumen', { 'Proceso terminado': '2026-10-26', 'Ruta principal': 'Finanzas' }, ['informacion', 'disc', 'foda', 'estilo', 'relacion', 'crecimiento', 'escenarios', 'ruta', 'plan', 'resumen'])).ok, true);
  const ex = pestanas['Expediente Ágora'];
  igual(ex.filas[1][col(ex, 'Proceso terminado')], '2026-10-26');
  igual(ex.filas[1][col(ex, 'Avance')], '10 de 10');
  ctx.revisarPestanas();
  for (const t of ['Ágora · Relacionamiento', 'Ágora · Crecimiento personal', 'Ágora · Escenarios de vida', 'Ágora · Ruta profesional', 'Ágora · Plan de acción']) cierto(pestanas[t], 'revisarPestanas crea ' + t);
});

await prueba('el orientador manda los resultados al tutor desde la hoja, con confirmación', async () => {
  const { post, pestanas, correos, alertas, ctx, activar, responder } = cargar();
  post(INFO_AS);
  post(fase('crecimiento', { 'Lo que espero desarrollar': '• Tomar decisiones', 'Áreas de crecimiento': '• Sé más directo', 'Primera prioridad': 'Sé más directo', 'Habilidades a reforzar': 'liderazgo' }));
  post(fase('ruta', { 'Ruta principal': 'Finanzas', 'Por qué': 'Números' }));
  activar('Ágora · Crecimiento personal'); ctx.enviarResultadosAlTutor();
  igual(correos.length, 0, 'fuera del expediente no manda'); cierto(alertas.pop().includes('Expediente Ágora'));
  activar('Expediente Ágora', 2); responder('NO'); ctx.enviarResultadosAlTutor();
  igual(correos.length, 0, 'si dice que no, no manda');
  responder('YES'); ctx.enviarResultadosAlTutor();
  igual(correos.length, 1);
  igual(correos[0].to, 'maria@ejemplo.com');
  igual(correos[0].replyTo, 'clubmentesbrillantesla@gmail.com');
  cierto(correos[0].body.includes('Primera prioridad: Sé más directo') && correos[0].body.includes('Ruta principal: Finanzas'));
  const ex = pestanas['Expediente Ágora'];
  cierto(ex.filas[1][col(ex, 'Resultados enviados al tutor')] instanceof Date, 'anota cuándo se mandó');
});

await prueba('sin correo de tutor, o un menor sin su autorización, no se manda nada', async () => {
  const { post, pestanas, correos, alertas, ctx, activar } = cargar();
  post(Object.assign({}, INFO_AS, { datos: Object.assign({}, INFO, { edad: '21', tutorCorreo: '', tutorNombre: '' }) }));
  activar('Expediente Ágora', 2); ctx.enviarResultadosAlTutor();
  igual(correos.length, 0); cierto(alertas.pop().includes('no tiene correo'));
  const ex = pestanas['Expediente Ágora'];
  ex.filas[1][col(ex, 'Correo del tutor')] = 'maria@ejemplo.com';
  ex.filas[1][col(ex, 'Edad')] = 16; ex.filas[1][col(ex, 'Tutor autoriza')] = 'No aplica';
  ctx.enviarResultadosAlTutor();
  igual(correos.length, 0); cierto(alertas.pop().includes('no ha autorizado'));
});

if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
