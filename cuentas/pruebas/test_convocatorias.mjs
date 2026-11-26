/**
 * Pruebas de convocatorias.html (rastreo interno de convocatorias de fondeo)
 * y de su Apps Script (cuentas/apps-script-convocatorias.gs).
 *
 *   node cuentas/pruebas/test_convocatorias.mjs
 *
 * El Apps Script corre de verdad, en una hoja falsa en memoria: la página le
 * habla por la misma ruta que en producción. Lo que importa: sin la clave del
 * equipo no se ve ni se escribe nada; lo registrado llega a la hoja con sus
 * columnas legibles; dos personas editando lo mismo no se pisan; nada entra a
 * la hoja como fórmula; y la clave nunca está en el HTML.
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
const TIPOS = { '.html':'text/html', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.js':'text/javascript' };
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
const CLAVE = 'clave-de-prueba-del-equipo';

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

/* ---------------- Apps Script en una hoja falsa ---------------- */
const codigo = await readFile(join(RAIZ, 'cuentas/apps-script-convocatorias.gs'), 'utf8');
function cargarScript(feeds = {}) {
  const pestanas = {};
  const crear = (nombre) => {
    let filas = [];
    const h = { nombre, get filas() { return filas; },
      getName: () => nombre, getLastRow: () => filas.length, getLastColumn: () => Math.max(0, ...filas.map(f => f.length)),
      appendRow: (f) => filas.push(f.slice()), clear: () => { filas = []; }, deleteRow: (n) => filas.splice(n - 1, 1), setFrozenRows: () => {},
      getRange: (r, c, nr = 1, nc = 1) => ({
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (filas[r - 1 + i] || [])[c - 1 + j] ?? '')),
        getValue: () => (filas[r - 1] || [])[c - 1] ?? '',
        setValues: (v) => v.forEach((fila, i) => { filas[r - 1 + i] = filas[r - 1 + i] || []; fila.forEach((x, j) => { filas[r - 1 + i][c - 1 + j] = x; }); }),
        setValue: (x) => { filas[r - 1] = filas[r - 1] || []; filas[r - 1][c - 1] = x; },
        setFontWeight: () => {} }) };
    pestanas[nombre] = h; return h;
  };
  const cache = {};
  const props = { CLAVE_EQUIPO: CLAVE };
  const pedidos = [];
  const ctx = {
    SpreadsheetApp: (() => { const libro = { getSheetByName: (n) => pestanas[n] || null, insertSheet: (n) => crear(n) }; return { getActiveSpreadsheet: () => libro, openById: () => libro }; })(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
    UrlFetchApp: { fetch: (u) => { pedidos.push(u); const f = feeds[u]; return { getResponseCode: () => f ? 200 : 404, getContentText: () => f || '' }; } },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => t, toString: () => t }) },
    Utilities: { formatDate: (d) => new Date(d).toISOString().slice(0, 10) },
    JSON, Date, String, Object, Math, Array, Number, isFinite, parseInt, isNaN
  };
  vm.createContext(ctx); vm.runInContext(codigo, ctx);
  ctx.instalar();
  return { ctx, pestanas, props, pedidos, post: (d) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(d) } })) };
}
const col = (h, n) => h.filas[0].indexOf(n);

/* ---------------- Página ---------------- */
const navegador = await chromium.launch();
const errores = [];
async function abrir(script, opciones = {}) {
  const ctx = await navegador.newContext();
  const enviados = [];
  await ctx.addInitScript(([u, ls]) => {
    window.__CMB_ENDPOINT_PRUEBA = u;
    if (ls && !sessionStorage.getItem('ini')) { sessionStorage.setItem('ini', '1'); for (const [k, v] of Object.entries(ls)) localStorage.setItem(k, v); }
  }, [FALSO, opciones.ls || null]);
  await ctx.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await ctx.route(/script\.google\.com/, async (r) => {
    const cuerpo = JSON.parse(r.request().postData() || '{}');
    enviados.push(cuerpo);
    await r.fulfill({ status: 200, contentType: 'application/json', body: script.ctx.doPost({ postData: { contents: JSON.stringify(cuerpo) } }) });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });
  await p.goto(BASE + '/convocatorias.html' + (opciones.hash || ''), { waitUntil: 'domcontentloaded' });
  return { p, ctx, enviados };
}
async function entrar(p, clave = CLAVE, nombre = 'Ana Coordinadora') {
  await p.waitForSelector('#formAcceso');
  await p.fill('#a_clave', clave); await p.fill('#a_autor', nombre);
  await p.click('#formAcceso button[type="submit"]');
}

console.log('\nRastreo de convocatorias');

await prueba('sin clave no se ve nada; con la clave equivocada tampoco', async () => {
  const s = cargarScript();
  const { p, ctx, enviados } = await abrir(s);
  cierto(await p.isVisible('#formAcceso'), 'pide la clave');
  cierto(await p.isHidden('nav.tabs'), 'sin pestañas antes de entrar');
  igual(enviados.length, 0, 'no pide datos sin clave');
  await entrar(p, 'otra cosa');
  await p.waitForFunction(() => document.getElementById('a_msg').textContent.includes('no es la del equipo'));
  igual(s.post({ accion: 'leer', clave: 'mal' }).error, 'clave');
  await ctx.close();
});

await prueba('con la clave entra, ve las 25 fuentes y los 6 canales precargados', async () => {
  const s = cargarScript();
  const { p, ctx } = await abrir(s);
  await entrar(p);
  await p.waitForSelector('.cifras');
  await p.evaluate(() => { location.hash = 'fuentes'; });
  await p.waitForSelector('.fuente');
  igual(await p.locator('.fuente').count(), 25);
  cierto((await p.textContent('#v-fuentes')).includes('INADEM'), 'nota del INADEM');
  await p.evaluate(() => { location.hash = 'canales'; });
  igual(await p.locator('#v-canales .banda:not(#bandaAuto) tbody tr').count(), 6);
  igual(await p.locator('#bandaAuto tbody tr').count(), 5, 'cinco fuentes automáticas precargadas');
  await ctx.close();
});

await prueba('registrar una convocatoria la deja en la hoja, legible y con la ficha completa', async () => {
  const s = cargarScript();
  const { p, ctx } = await abrir(s);
  await entrar(p);
  await p.waitForSelector('.cifras');
  await p.click('#btnNueva');
  await p.fill('#c_nombre', '=HYPERLINK("http://x","Jóvenes Innovadores 2026")');
  await p.selectOption('#c_fuenteId', 'secihti');
  await p.fill('#c_cierre', '2027-01-20'); await p.dispatchEvent('#c_cierre', 'change');
  await p.fill('#c_monto', '800000'); await p.dispatchEvent('#c_monto', 'change');
  await p.selectOption('#c_area', 'Emprendimiento y PYMES');
  await p.click('#btnGuardar');
  await p.waitForFunction(() => !document.querySelector('.panel'));
  const h = s.pestanas['Convocatorias'];
  igual(h.filas.length, 2, 'una fila');
  igual(h.filas[1][col(h, 'Fuente')], 'SECIHTI (antes CONAHCYT)');
  igual(h.filas[1][col(h, 'Estatus')], 'Detectada');
  cierto(h.filas[1][col(h, 'Nombre')].startsWith("'="), 'el nombre no entra como fórmula');
  igual(h.filas[1][col(h, 'Actualizado por')], 'Ana Coordinadora');
  const datos = JSON.parse(h.filas[1][col(h, 'Datos')]);
  igual(datos.monto, 800000); igual(datos.historia[0].por, 'Ana Coordinadora');
  await p.waitForFunction(() => document.querySelector('.flujo') && document.querySelector('.flujo').textContent.includes('Jóvenes Innovadores'));
  await ctx.close();
});

await prueba('dos personas editan la misma: la segunda no pisa a la primera', async () => {
  const s = cargarScript();
  igual(s.post({ accion: 'guardar', clave: CLAVE, autor: 'X', conv: { id: 'c1', nombre: 'Becas BBVA', fuenteId: 'bbva', estatus: 'Detectada', historia: [] } }).ok, true);
  const a = await abrir(s), b = await abrir(s);
  await entrar(a.p, CLAVE, 'Ana'); await entrar(b.p, CLAVE, 'Beto');
  for (const x of [a, b]) { await x.p.waitForSelector('[data-abrir="c1"]'); await x.p.click('.flujo [data-abrir="c1"]'); await x.p.waitForSelector('#c_notas'); }
  await a.p.fill('#c_notas', 'Nota de Ana'); await a.p.click('#btnGuardar');
  await a.p.waitForFunction(() => document.getElementById('msgFicha').textContent.includes('Guardado'));
  await b.p.fill('#c_notas', 'Nota de Beto'); await b.p.click('#btnGuardar');
  await b.p.waitForFunction(() => document.getElementById('msgFicha').textContent.includes('Alguien más cambió'));
  igual(JSON.parse(s.pestanas['Convocatorias'].filas[1][col(s.pestanas['Convocatorias'], 'Datos')]).notas, 'Nota de Ana');
  await a.ctx.close(); await b.ctx.close();
});

await prueba('"Revisado hoy" anota la fecha y quién en la pestaña Canales', async () => {
  const s = cargarScript();
  const { p, ctx } = await abrir(s, { hash: '#canales' });
  await entrar(p, CLAVE, 'Dirección');
  await p.waitForSelector('#v-canales [data-revisado="cemefi"]');
  await p.click('#v-canales [data-revisado="cemefi"]');
  const k = s.pestanas['Canales'];
  await p.waitForFunction(() => document.querySelector('#v-canales').textContent.includes('Al día'));
  const fila = k.filas.find(f => f[0] === 'cemefi');
  cierto(String(fila[col(k, 'Última revisión')]).length >= 10, 'fecha');
  igual(fila[col(k, 'Revisado por')], 'Dirección');
  await ctx.close();
});

await prueba('"Recordarme" guarda la clave; sin marcarlo se olvida al cerrar; Salir la borra', async () => {
  const s = cargarScript();
  const { p, ctx } = await abrir(s);
  await p.waitForSelector('#formAcceso');
  await p.fill('#a_clave', CLAVE); await p.fill('#a_autor', 'Ana'); await p.check('#a_rec');
  await p.click('#formAcceso button[type="submit"]');
  await p.waitForSelector('.cifras');
  igual(await p.evaluate(() => localStorage.getItem('cmb_conv_clave')), CLAVE);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.cifras');
  await p.click('#btnSalir');
  await p.waitForSelector('#formAcceso');
  igual(await p.evaluate(() => localStorage.getItem('cmb_conv_clave')), null);
  await ctx.close();
});

await prueba('20 intentos fallidos bloquean 10 minutos, aun con la clave buena', async () => {
  const s = cargarScript();
  for (let i = 0; i < 20; i++) s.post({ accion: 'leer', clave: 'mal' + i });
  igual(s.post({ accion: 'leer', clave: CLAVE }).error, 'bloqueado');
});

await prueba('la clave no está en el HTML ni en el Apps Script', async () => {
  const html = await readFile(join(RAIZ, 'convocatorias.html'), 'utf8');
  cierto(!/CLAVE_EQUIPO\s*=|clave\s*:\s*'[^']+'/.test(html), 'sin clave en el HTML');
  cierto(html.includes('noindex'), 'no se indexa');
  cierto(!/CLAVE_EQUIPO\s*=\s*'/.test(codigo), 'sin clave en el script');
});


/* ---------------- Automatización (Apps Script versión 2) ---------------- */
console.log('\nRastreo automático');
const hoyMx = () => new Date().toISOString().slice(0, 10);
const enDias = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const enPalabras = (iso) => { const [a, m, d] = iso.split('-').map(Number); return d + ' de ' + MESES[m - 1] + ' de ' + a; };
const FEED = 'https://www.google.com/alerts/feeds/123/456';
const atom = (entradas) => '<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Google Alert</title>' +
  entradas.map(([t, u, c]) => '<entry><id>x</id><title type="html">' + t + '</title><link href="https://www.google.com/url?rct=j&amp;sa=t&amp;url=' + encodeURIComponent(u) + '&amp;ct=ga"/><published>' + new Date().toISOString() + '</published><content type="html">' + c + '</content></entry>').join('') + '</feed>';
const conAlerta = (s) => { const h = s.pestanas['Alertas']; h.filas[1][col(h, 'Feed (RSS o Atom)')] = FEED; return s; };

await prueba('lee el texto: área, cierre y monto en pesos (y no inventa)', async () => {
  const { ctx } = cargarScript();
  igual(ctx.areaAuto_('Convocatoria para guías de turistas en Querétaro'), 'Turismo');
  igual(ctx.areaAuto_('Programa de certificación CONOCER para emprendedores'), 'Formación y certificación laboral', 'alta va antes');
  igual(ctx.areaAuto_('Algo sin tema'), '');
  igual(ctx.cierreAuto_('El registro cierra el 15 de marzo de 2027.', '2026-11-26'), '2027-03-15');
  igual(ctx.cierreAuto_('Fecha límite: 20/01/2027', '2026-11-26'), '2027-01-20');
  igual(ctx.cierreAuto_('Postula hasta el 10 de febrero', '2026-11-26'), '2027-02-10', 'sin año: el siguiente');
  igual(ctx.cierreAuto_('Publicada el 3 de diciembre de 2026', '2026-11-26'), '', 'una fecha sin "cierre" no es cierre');
  igual(ctx.montoAuto_('Apoyos de hasta $500,000 por proyecto'), 500000);
  igual(ctx.montoAuto_('Bolsa de 2.5 millones de pesos'), 2500000);
  igual(ctx.montoAuto_('Becas para 5 mil jóvenes'), null, '"5 mil jóvenes" no es dinero');
  igual(ctx.montoAuto_('Grants of USD $50,000'), null, 'en dólares no adivina');
});

await prueba('lee un feed de Google Alerts y registra lo nuevo como Detectada, una sola vez', async () => {
  const xml = atom([
    ['Abre &lt;b&gt;convocatoria&lt;/b&gt; Jóvenes Innovadores 2026', 'https://secihti.mx/convocatorias/jovenes', 'Apoyos de hasta $800,000. La convocatoria cierra el ' + enPalabras(enDias(60)) + '.'],
    ['Inauguran museo en Monterrey', 'https://noticias.mx/museo', 'Nota sin relación'],
    ['Convocatoria de capacitación para hoteles', 'https://ejemplo.mx/hoteles', 'Fecha límite: ' + enPalabras(enDias(5)) + '.']
  ]);
  const s = conAlerta(cargarScript({ [FEED]: xml }));
  const r = s.ctx.rastrear_(s.ctx.libro_(), 'Rastreo automático');
  igual(r.nuevas, 2, 'dos parecen convocatoria');
  const h = s.pestanas['Convocatorias'];
  const datos = h.filas.slice(1).map(f => JSON.parse(f[col(h, 'Datos')]));
  const j = datos.find(c => /Jóvenes/.test(c.nombre));
  igual(j.nombre, 'Abre convocatoria Jóvenes Innovadores 2026', 'sin etiquetas HTML');
  igual(j.link, 'https://secihti.mx/convocatorias/jovenes', 'enlace real, no el de Google');
  igual(j.fuenteId, 'secihti', 'reconoce la fuente por el dominio');
  igual(j.estatus, 'Detectada'); igual(j.origen, 'automatico'); igual(j.monto, 800000); igual(j.cierre, enDias(60));
  const hot = datos.find(c => /hoteles/.test(c.nombre));
  igual(hot.estatus, 'Descartada', 'cierra en menos de 15 días');
  cierto(/menos|mínimo es 15/.test(hot.motivo), 'con motivo');
  igual(hot.area, 'Formación y certificación laboral');
  const al = s.pestanas['Alertas'];
  igual(al.filas[1][col(al, 'Nuevas')], 2);
  igual(s.ctx.rastrear_(s.ctx.libro_(), 'Rastreo automático').nuevas, 0, 'la segunda vez no duplica');
  cierto(String(s.props.ULTIMO_RASTREO_RESUMEN).startsWith('0 nuevas'), 'deja resumen');
});

await prueba('un feed caído queda anotado con su error; los demás siguen', async () => {
  const s = conAlerta(cargarScript({}));
  const r = s.ctx.rastrear_(s.ctx.libro_(), 'Rastreo automático');
  igual(r.errores.length, 1);
  const al = s.pestanas['Alertas'];
  cierto(String(al.filas[1][col(al, 'Último error')]).includes('404'));
  igual(s.pedidos.length, 1, 'las alertas sin URL o apagadas no se piden');
});

await prueba('descarta sola la que cerró sin pasar a Aplicando, y respeta las que se aplicaron', async () => {
  const s = cargarScript();
  s.post({ accion: 'guardar', clave: CLAVE, autor: 'Ana', conv: { id: 'v1', nombre: 'Vencida', fuenteId: 'bbva', estatus: 'En evaluación', cierre: enDias(-2), historia: [] } });
  s.post({ accion: 'guardar', clave: CLAVE, autor: 'Ana', conv: { id: 'v2', nombre: 'Enviada', fuenteId: 'bbva', estatus: 'Aplicada', cierre: enDias(-2), historia: [] } });
  igual(s.ctx.rastrear_(s.ctx.libro_(), 'Rastreo automático').descartadas, 1);
  const h = s.pestanas['Convocatorias'];
  igual(h.filas.find(f => f[0] === 'v1')[col(h, 'Estatus')], 'Descartada');
  igual(h.filas.find(f => f[0] === 'v2')[col(h, 'Estatus')], 'Aplicada');
});

await prueba('el resumen diario junta nuevas, plazos vencidos y canales por revisar', async () => {
  const s = cargarScript();
  s.post({ accion: 'guardar', clave: CLAVE, autor: 'Ana', conv: { id: 'd1', nombre: 'Olvidada', fuenteId: 'sep', estatus: 'Detectada', deteccion: enDias(-4), desde: enDias(-4), historia: [] } });
  s.post({ accion: 'guardar', clave: CLAVE, autor: 'X', conv: { id: 'd2', nombre: 'Nueva sola', origen: 'automatico', estatus: 'Detectada', deteccion: hoyMx(), desde: hoyMx(), historia: [] } });
  const r = s.ctx.resumenDiario_(s.ctx.libro_(), hoyMx());
  cierto(r.hayAlgo);
  igual(r.nuevas, 1);
  cierto(r.texto.includes('Filtro de elegibilidad vencido') && r.texto.includes('Olvidada'), 'plazo vencido');
  cierto(r.texto.includes('CEMEFI'), 'canales sin revisión');
  cierto(/convocatorias\.html/.test(r.html), 'liga al tablero');
});

await prueba('en la página: los filtros mueven el estatus solos y "Buscar ahora" corre el rastreo', async () => {
  const xml = atom([['Convocatoria POSiBLE 2026', 'https://posible.org.mx/2026', 'Cierra el ' + enPalabras(enDias(40)) + '.']]);
  const s = conAlerta(cargarScript({ [FEED]: xml }));
  const { p, ctx, enviados } = await abrir(s);
  await entrar(p);
  await p.waitForSelector('[data-rastrear]');
  await p.click('.vista:not([hidden]) [data-rastrear]');
  await p.waitForSelector('.flujo [data-abrir]');
  cierto(enviados.some(x => x.accion === 'rastrear'), 'pidió el rastreo');
  cierto((await p.textContent('.flujo')).includes('Auto'), 'marca de automática');
  await p.click('.flujo [data-abrir]');
  await p.waitForSelector('#c_nombre');
  cierto((await p.textContent('.panel')).includes('Entró sola'), 'avisa que entró sola');
  for (const k of ['org', 'geo', 'contra']) await p.click(`[data-filtro="${k}"][data-v="true"]`);
  cierto(await p.locator('[data-estatus="En evaluación"][aria-pressed="true"]').count() === 1, 'pasa los filtros → En evaluación');
  await p.click('[data-filtro="geo"][data-v="false"]');
  cierto(await p.locator('[data-estatus="Descartada"][aria-pressed="true"]').count() === 1, 'falla uno → Descartada');
  cierto((await p.inputValue('#c_motivo')).includes('cobertura'), 'con el motivo escrito');
  await p.click('[data-filtro="geo"][data-v="true"]');
  cierto(await p.locator('[data-estatus="En evaluación"][aria-pressed="true"]').count() === 1, 'al corregir, vuelve');
  await p.click('#btnGuardar');
  await p.waitForFunction(() => document.getElementById('msgFicha').textContent.includes('Guardado'));
  const h = s.pestanas['Convocatorias'];
  const d = JSON.parse(h.filas[1][col(h, 'Datos')]);
  igual(d.estatus, 'En evaluación');
  igual(d.historia.map(x => x.estatus).join('>'), 'Detectada>En evaluación', 'sin rastro del ida y vuelta');
  await ctx.close();
});

await navegador.close();
servidor.close();
if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
