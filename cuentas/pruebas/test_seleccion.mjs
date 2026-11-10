/**
 * Pruebas de seleccion.html (Selección Justa) y de la ruta del worker
 * /calificar-candidato (worker-calificar.js).
 *
 *   node cuentas/pruebas/test_seleccion.mjs
 *
 * Lo que importa: el ejemplo calcula bien el ranking y la regla de los 4/5;
 * al agregar un candidato se ocultan nombre, correo, teléfono, edad y estado
 * civil, sin borrar los años de experiencia; a la IA solo le llega el perfil
 * sin identidad y la rúbrica; si la ruta no está activa la página sigue
 * sirviendo a mano; y el worker limpia lo que devuelve la IA.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

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
const IA = 'https://cv-analisis.soportetimentesbrillantes.workers.dev/calificar-candidato';

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

const navegador = await chromium.launch();
const errores = [];
async function abrir(hash = '', ia = 'ok') {
  const ctx = await navegador.newContext();
  const pedidos = [];
  await ctx.addInitScript((u) => { window.__CMB_IA_PRUEBA = u; }, IA);
  await ctx.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await ctx.route(/workers\.dev/, async (r) => {
    const d = JSON.parse(r.request().postData() || '{}');
    pedidos.push(d);
    if (ia === '404') return r.fulfill({ status: 404, body: 'Not found' });
    const nombreA = /Nombre: María/.test(d.perfil);
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, calificaciones: d.competencias.map((k, i) => ({
      id: k.id, puntaje: i === 0 ? (nombreA ? 2 : 4) : 3, evidencia: i === 0 ? 'diagnosticaba fallas eléctricas' : (i === 1 ? 'frase que no está en el perfil' : ''), razon: 'Razón ' + i })) }) });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });
  await p.goto(BASE + '/seleccion.html' + hash, { waitUntil: 'domcontentloaded' });
  return { p, ctx, pedidos };
}

console.log('\nSelección Justa');

await prueba('el ejemplo: ranking ponderado y lista corta de 4', async () => {
  const { p, ctx } = await abrir('#decision');
  await p.waitForSelector('#v-decision tbody tr');
  const filas = await p.$$eval('#v-decision tbody tr', (t) => t.map(r => [r.cells[1].textContent.trim(), r.cells[2].textContent.trim()]));
  igual(filas.map(f => f[0]).join(','), 'C-08,C-02,C-04,C-06,C-03,C-01,C-07,C-05');
  igual(filas[0][1], '81'); igual(filas[7][1], '48');
  igual(await p.locator('#v-decision .pill.acc').count(), 4);
  await ctx.close();
});

await prueba('auditoría: la regla de los 4/5 marca a los de 18 a 24 años (0.25) y avisa de muestra chica', async () => {
  const { p, ctx } = await abrir('#auditoria');
  await p.waitForSelector('#v-auditoria .ratio');
  const t = await p.textContent('#v-auditoria');
  cierto(t.includes('0.25') && t.includes('0.75') && t.includes('Muestras chicas'), t.slice(0, 300));
  cierto(t.includes('1 sin dato'), 'cuenta a quien prefirió no decir');
  await ctx.close();
});

await prueba('agregar un candidato oculta su identidad pero no sus años de experiencia', async () => {
  const { p, ctx } = await abrir('#candidatos');
  await p.fill('#f_nombre', 'Rosa María Gutiérrez');
  await p.fill('#f_cv', 'Rosa María Gutiérrez\nrosa.gtz@correo.com · 442 123 4567 · Col. Centro, Querétaro\nTengo 23 años, soltera.\nExperiencia: 3 años de experiencia en ventas de autos; Rosa superó su meta 6 meses seguidos.');
  const prev = await p.textContent('#vistaPrevia');
  cierto(!prev.includes('Rosa') && !prev.includes('Gutiérrez') && !prev.includes('rosa.gtz') && !prev.includes('4567') && !prev.includes('23 años') && !/soltera/i.test(prev), prev);
  cierto(prev.includes('3 años de experiencia'), 'conserva la experiencia');
  await p.selectOption('#f_gen', 'Mujer'); await p.selectOption('#f_edad', '18 a 24');
  await p.click('#btnAgregarC');
  await p.waitForFunction(() => document.querySelectorAll('.cand').length === 9);
  const g = await p.evaluate(() => JSON.parse(localStorage.getItem('cmb_seleccion_justa_v1')).candidatos.at(-1));
  igual(g.id, 'C-09'); igual(g.grupo.genero, 'Mujer');
  cierto(!g.perfil.includes('Gutiérrez'), 'lo guardado tampoco trae el nombre');
  await ctx.close();
});

await prueba('la IA solo recibe rúbrica y perfil sin identidad; la página señala la cita que no aparece', async () => {
  const { p, ctx, pedidos } = await abrir('#calificacion');
  await p.waitForSelector('#btnIA');
  await p.click('#btnIA');
  await p.waitForFunction(() => document.querySelector('#v-calificacion').textContent.includes('Sugerencia lista'));
  igual(pedidos.length, 1);
  igual(Object.keys(pedidos[0]).sort().join(','), 'competencias,perfil,puesto');
  igual(pedidos[0].competencias.length, 5);
  const t = await p.textContent('#v-calificacion');
  cierto(t.includes('diagnosticaba fallas eléctricas'), 'muestra la evidencia');
  cierto(t.includes('cita no encontrada en el perfil'), 'avisa de la cita inventada');
  // C-01 ya estaba calificado: la sugerencia no pisa al evaluador; si difiere, pide la razón.
  cierto(await p.$('[data-razon]'), 'pide razón cuando la persona se aparta de la IA');
  await ctx.close();
});

await prueba('prueba de nombres cambiados: avisa cuando el puntaje cambia solo por el nombre', async () => {
  const { p, ctx, pedidos } = await abrir('#calificacion');
  await p.click('details summary');
  await p.click('#btnNombres');
  await p.waitForFunction(() => document.getElementById('resNombres').textContent.includes('Cambió en 1'));
  igual(pedidos.length, 2);
  cierto(pedidos.some(d => d.perfil.startsWith('Nombre: María')) && pedidos.some(d => d.perfil.startsWith('Nombre: José')));
  await ctx.close();
});

await prueba('si la ruta del worker no está activa, se califica a mano', async () => {
  const { p, ctx } = await abrir('#calificacion', '404');
  await p.click('#btnIA');
  await p.waitForFunction(() => document.querySelector('#v-calificacion').textContent.includes('todavía no está activa'));
  await p.click('[data-cal="k2"][data-v="4"]');
  cierto(await p.getAttribute('[data-cal="k2"][data-v="4"]', 'aria-pressed') === 'true');
  await ctx.close();
});

await navegador.close();
servidor.close();

/* ------------------------------ Worker ------------------------------ */
console.log('\nWorker /calificar-candidato');
const { manejarCalificar } = await import(pathToFileURL(join(RAIZ, 'worker-calificar.js')).href);
const env = { ANTHROPIC_API_KEY: 'llave-de-prueba' };
const pedir = (cuerpo, metodo = 'POST', ruta = '/calificar-candidato') => new Request('https://cv-analisis.example.workers.dev' + ruta,
  { method: metodo, headers: { 'content-type': 'application/json', Origin: 'https://soportetimentesbrillantes-afk.github.io' }, body: metodo === 'POST' ? JSON.stringify(cuerpo) : undefined });
const RUB = { puesto: 'Asesor', competencias: [{ id: 'k1', nombre: 'Atención', n1: 'a', n3: 'b', n5: 'c' }, { id: 'k2', nombre: 'Cierre', n1: 'a', n3: 'b', n5: 'c' }], perfil: 'Experiencia: 2 años atendiendo clientes en mostrador.' };

await prueba('otras rutas siguen su camino; OPTIONS responde sin cuerpo', async () => {
  igual(await manejarCalificar(pedir({}, 'POST', '/revisar-cv'), env), null);
  const r = await manejarCalificar(pedir(null, 'OPTIONS'), env);
  igual(r.status, 204);
  igual(r.headers.get('access-control-allow-origin'), 'https://soportetimentesbrillantes-afk.github.io');
});

await prueba('limpia la respuesta de la IA: solo competencias conocidas, puntaje de 1 a 5', async () => {
  let enviado = null;
  globalThis.fetch = async (url, op) => { enviado = JSON.parse(op.body); return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Aquí va: {"calificaciones":[{"id":"k1","puntaje":9,"evidencia":"atendiendo clientes","razon":"ok"},{"id":"k9","puntaje":3},{"id":"k2","puntaje":0}]}' }] }), { status: 200 }); };
  const r = await manejarCalificar(pedir(RUB), env);
  const d = await r.json();
  igual(d.ok, true);
  igual(JSON.stringify(d.calificaciones.map(x => [x.id, x.puntaje])), '[["k1",5],["k2",1]]');
  igual(enviado.temperature, 0);
  cierto(enviado.system.includes('no adivines ni uses género'), 'instrucciones contra sesgo');
});

await prueba('rechaza peticiones sin rúbrica o sin perfil', async () => {
  const r = await manejarCalificar(pedir({ puesto: 'x', competencias: [], perfil: '' }), env);
  igual(r.status, 400);
});

if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
