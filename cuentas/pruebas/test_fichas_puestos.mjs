/**
 * Fichas de puesto: data/fichas_puestos.json, fichas-puestos.html y el
 * relleno de la vacante en Selección Justa (seleccion.html, paso 1).
 *
 *   node cuentas/pruebas/test_fichas_puestos.mjs
 *
 * Lo que importa: las 60 fichas del panel traen una rúbrica válida (4 a 6
 * competencias, pesos que suman 100, cada competencia medida por el CV y al
 * menos otro método); rellenar la vacante pide confirmar si ya hay
 * calificaciones y entonces las borra; llenar a mano deja la vacante en
 * blanco; el requisito legal se muestra aparte y no se califica; y las
 * páginas no se desbordan en el teléfono.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

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

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

const D = JSON.parse(await readFile(join(RAIZ, 'data/fichas_puestos.json'), 'utf8'));
const PANEL = JSON.parse(await readFile(join(RAIZ, 'herramientas/fichas/panel.json'), 'utf8'));

console.log('\nDatos');
await prueba('las 60 fichas del panel, cada una con una rúbrica válida', async () => {
  igual(D.fichas.length, 60);
  igual(D.fichas.map(f => f.id).join(), PANEL.map(p => p.id).join(), 'mismos puestos y orden que el panel');
  for (const f of D.fichas) {
    cierto(f.competencias.length >= 4 && f.competencias.length <= 6, f.id + ': número de competencias');
    igual(f.competencias.reduce((s, c) => s + c.peso, 0), 100, f.id + ': pesos de competencias');
    igual(Object.values(f.metodos.pesos).reduce((s, x) => s + x, 0), 100, f.id + ': pesos de métodos');
    for (const c of f.competencias) {
      cierto(c.metodos[0] === 'cv' && c.metodos.length >= 2, f.id + ': ' + c.nombre + ' debe medirse con el CV y otro método');
      cierto(c.n1 && c.n3 && c.n5, f.id + ': ' + c.nombre + ' sin descriptores');
    }
    for (const k of ['prueba', 'muestra', 'entrevista']) cierto(f.metodos[k].length > 40, f.id + ': guía de ' + k);
    cierto(typeof f.mercado.vacantes === 'number', f.id + ': mercado');
    if (f.mercado.salario && f.mercado.salario.mediana) cierto(f.mercado.salario.p25 <= f.mercado.salario.mediana && f.mercado.salario.mediana <= f.mercado.salario.p75, f.id + ': cuartiles');
  }
  cierto(D.fichas.filter(f => f.mercado.vacantes >= 20).length >= 45, 'la mayoría de los puestos tiene vacantes en la corrida');
});

const navegador = await chromium.launch();
const errores = [];
async function abrir(ruta, opciones = {}) {
  const ctx = await navegador.newContext(opciones);
  await ctx.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await ctx.route(/workers\.dev|script\.google/, (r) => r.abort());
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { errores.push(e.message); console.log('         [error de página] ' + e.message); });
  await p.goto(BASE + '/' + ruta, { waitUntil: 'domcontentloaded' });
  return { p, ctx };
}
const estado = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('cmb_seleccion_justa_v2')));

console.log('\nSelección Justa · paso 1');
await prueba('la ficha se elige por sector y puesto y muestra lo que piden sus vacantes', async () => {
  const { p, ctx } = await abrir('seleccion.html#vacante');
  await p.waitForSelector('#fp_sector');
  await p.selectOption('#fp_sector', 'Finanzas');
  await p.selectOption('#fp_puesto', 'contador');
  const t = await p.textContent('#fp_vista');
  cierto(t.includes('Contador.') && t.includes('Sueldo mensual') && t.includes('Escolaridad que piden') && t.includes('Requisito legal'), t.slice(0, 300));
  igual(await p.getAttribute('#fp_ver', 'href'), 'fichas-puestos.html#contador');
  await ctx.close();
});

await prueba('con calificaciones pide confirmar; al cancelar no cambia nada', async () => {
  const { p, ctx } = await abrir('seleccion.html#vacante');
  await p.waitForSelector('#fp_sector');
  await p.selectOption('#fp_sector', 'Finanzas'); await p.selectOption('#fp_puesto', 'contador');
  await p.click('#fp_rellenar');
  cierto((await p.textContent('#bandaFicha')).includes('se borran las calificaciones'), 'avisa que se borran');
  await p.click('#fp_no');
  cierto(!(await p.$('#fp_si')), 'se cierra la confirmación');
  igual((await estado(p)) ? (await estado(p)).vacante.puesto : 'Asesor(a) de ventas junior · agencia automotriz, Querétaro', 'Asesor(a) de ventas junior · agencia automotriz, Querétaro');
  await ctx.close();
});

await prueba('rellenar con la ficha deja rúbrica, matriz, guías y el requisito legal aparte; borra calificaciones', async () => {
  const { p, ctx } = await abrir('seleccion.html#vacante');
  await p.waitForSelector('#fp_sector');
  await p.selectOption('#fp_sector', 'Finanzas'); await p.selectOption('#fp_puesto', 'contador');
  await p.click('#fp_rellenar'); await p.click('#fp_si');
  await p.waitForSelector('#fp_msg');
  igual(await p.inputValue('#f_puesto'), 'Contador');
  const ficha = D.fichas.find(f => f.id === 'contador');
  const nombres = await p.$$eval('[data-k="nombre"]', xs => xs.map(x => x.value));
  igual(nombres.join('|'), ficha.competencias.map(c => c.nombre).join('|'));
  cierto((await p.inputValue('#g_muestra')).startsWith(ficha.metodos.muestra.slice(0, 30)), 'guía de la muestra');
  cierto((await p.textContent('#avisoLegal')).includes('Cédula'), 'requisito legal');
  cierto((await p.textContent('#fp_estado')).includes('Contador'), 'estado de la vacante');
  const S = await estado(p);
  igual(S.vacante.ficha.id, 'contador');
  igual(S.vacante.metodos.cv.comps.length, ficha.competencias.length, 'el CV mide todas');
  igual(S.vacante.metodos.prueba.comps.join(), ficha.competencias.map((c, i) => c.metodos.includes('prueba') ? 'k' + (i + 1) : '').filter(Boolean).join(), 'la prueba mide las de la ficha');
  igual(S.vacante.metodos.muestra.peso, ficha.metodos.pesos.muestra);
  cierto(S.candidatos.length === 8 && S.candidatos.every(c => !Object.keys(c.cal).length && !Object.keys(c.ev.prueba).length && !c.ev.entrevista.some(e => Object.keys(e).length)), 'calificaciones borradas, perfiles conservados');
  igual(Object.keys(S.decisiones).length, 0);
  // al recargar sigue igual
  await p.reload(); await p.waitForSelector('#fp_estado');
  cierto((await p.textContent('#fp_estado')).includes('Contador'));
  await ctx.close();
});

await prueba('llenar a mano deja la vacante en blanco (sin confirmar si no hay calificaciones)', async () => {
  const { p, ctx } = await abrir('seleccion.html#vacante');
  await p.waitForSelector('#fp_sector');
  await p.click('#fp_rellenar'); await p.click('#fp_si'); await p.waitForSelector('#fp_msg');
  await p.click('#fp_manual');
  await p.waitForFunction(() => document.getElementById('fp_estado') && document.getElementById('fp_estado').textContent.includes('a mano'));
  igual(await p.inputValue('#f_puesto'), '');
  const nombres = await p.$$eval('[data-k="nombre"]', xs => xs.map(x => x.value));
  igual(nombres.length, 4); cierto(nombres.every(x => x === ''));
  cierto(!(await p.$('#avisoLegal')), 'sin requisito legal');
  igual((await estado(p)).vacante.ficha, null);
  await ctx.close();
});

await prueba('?ficha= en la dirección preselecciona el puesto', async () => {
  const { p, ctx } = await abrir('seleccion.html?ficha=operador-de-montacargas#vacante');
  await p.waitForSelector('#fp_puesto');
  igual(await p.inputValue('#fp_puesto'), 'operador-de-montacargas');
  igual(await p.inputValue('#fp_sector'), 'Logística');
  await ctx.close();
});

await prueba('si no cargan las fichas, se puede llenar a mano', async () => {
  const ctx = await navegador.newContext();
  await ctx.route(/fichas_puestos\.json/, (r) => r.fulfill({ status: 500, body: 'x' }));
  await ctx.route(/fonts\.g/, (r) => r.abort());
  const p = await ctx.newPage();
  await p.goto(BASE + '/seleccion.html#vacante');
  await p.waitForFunction(() => document.getElementById('bandaFicha').textContent.includes('No se pudieron cargar'));
  cierto(await p.$('#fp_manual'));
  await ctx.close();
});

console.log('\nfichas-puestos.html y fichas.html');
await prueba('lista por sector, búsqueda y ficha completa con enlace a Selección Justa', async () => {
  const { p, ctx } = await abrir('fichas-puestos.html');
  await p.waitForSelector('.tarjeta');
  igual(await p.locator('.tarjeta').count(), 60);
  await p.fill('#buscar', 'montacargas');
  igual(await p.locator('.tarjeta').count(), 1);
  await p.click('.tarjeta');
  await p.waitForSelector('#vFicha h1');
  igual(await p.textContent('#vFicha h1'), 'Operador de Montacargas');
  igual(await p.locator('#vFicha tbody tr').count(), D.fichas.find(f => f.id === 'operador-de-montacargas').competencias.length + 1);
  igual(await p.getAttribute('#usar', 'href'), 'seleccion.html?ficha=operador-de-montacargas#vacante');
  await p.goto(BASE + '/fichas-puestos.html#guia-turistico'); await p.reload();
  await p.waitForSelector('#vFicha h1');
  cierto((await p.textContent('#vFicha')).includes('Requisito legal') && (await p.textContent('#vFicha')).includes('SECTUR'));
  await ctx.close();
});

await prueba('cada puesto de fichas.html enlaza a su ficha', async () => {
  const html = await readFile(join(RAIZ, 'fichas.html'), 'utf8');
  const ids = [...html.matchAll(/href="fichas-puestos\.html#([a-z0-9-]+)"/g)].map(m => m[1]);
  igual(new Set(ids).size, 60);
  cierto(ids.every(id => D.fichas.some(f => f.id === id)));
});

await prueba('en el teléfono no hay desplazamiento horizontal', async () => {
  for (const [ruta, sel] of [['fichas-puestos.html', '.tarjeta'], ['fichas-puestos.html#contador', '#vFicha h1'], ['seleccion.html#vacante', '#fp_vista']]) {
    const { p, ctx } = await abrir(ruta, { viewport: { width: 375, height: 800 } });
    if (ruta.includes('#contador')) await p.reload();
    await p.waitForSelector(sel);
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth);
    cierto(ancho <= 376, ruta + ' mide ' + ancho);
    await ctx.close();
  }
});

await navegador.close();
servidor.close();
if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
