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
function cargarScript() {
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
  const ctx = {
    SpreadsheetApp: (() => { const libro = { getSheetByName: (n) => pestanas[n] || null, insertSheet: (n) => crear(n) }; return { getActiveSpreadsheet: () => libro, openById: () => libro }; })(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => k === 'CLAVE_EQUIPO' ? CLAVE : null }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => t, toString: () => t }) },
    Utilities: { formatDate: (d) => d.toISOString().slice(0, 10) },
    JSON, Date, String, Object, Math, Array, Number, isFinite, parseInt, isNaN
  };
  vm.createContext(ctx); vm.runInContext(codigo, ctx);
  ctx.instalar();
  return { ctx, pestanas, post: (d) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(d) } })) };
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
  igual(await p.locator('#v-canales tbody tr').count(), 6);
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

await navegador.close();
servidor.close();
if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
