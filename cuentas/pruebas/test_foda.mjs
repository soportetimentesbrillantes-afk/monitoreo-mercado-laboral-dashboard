/**
 * Pruebas de foda.html.
 *
 *   node cuentas/pruebas/test_foda.mjs
 *
 * Lo que importa aquí: que lo escrito sobreviva a recargar la página, que
 * nada se agregue sin que la persona lo toque, que borrar pida confirmación,
 * y que el lector nunca vea una fecha en formato AAAA-MM-DD.
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

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) {
  if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`);
}

const navegador = await chromium.launch();

async function abrir(ctx, archivo = 'foda.html') {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('         [error de página] ' + e.message));
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.goto(BASE + '/' + archivo, { waitUntil: 'domcontentloaded' });
  return p;
}

console.log('\nEl FODA');

await prueba('empieza vacío, sin contar ideas y sin pistas del estilo de trabajo', async () => {
  const ctx = await navegador.newContext();
  const p = await abrir(ctx);
  for (const k of ['F', 'D', 'O', 'A']) igual(await p.inputValue('#' + k), '', 'cuadro ' + k);
  igual(await p.textContent('#nF'), '');
  igual(await p.evaluate(() => getComputedStyle(document.getElementById('pistasDisc')).display), 'none');
  cierto((await p.textContent('#estado')).includes('Todavía no'), 'estado inicial');
  await ctx.close();
});

await prueba('lo escrito sobrevive a recargar la página', async () => {
  const ctx = await navegador.newContext();
  let p = await abrir(ctx);
  await p.fill('#nombre', 'Ana Pérez');
  await p.fill('#F', 'Excel intermedio\nPrácticas 6 meses');
  await p.fill('#A', 'Piden un año de experiencia');
  await p.fill('#siguientePaso', 'Poner cifras al CV');
  await p.waitForFunction(() => document.getElementById('estado').textContent.includes('Guardado'));
  await p.close();
  p = await abrir(ctx);
  igual(await p.inputValue('#nombre'), 'Ana Pérez');
  igual(await p.inputValue('#F'), 'Excel intermedio\nPrácticas 6 meses');
  igual(await p.inputValue('#A'), 'Piden un año de experiencia');
  igual(await p.inputValue('#siguientePaso'), 'Poner cifras al CV');
  cierto((await p.textContent('#estado')).includes('Recuperado'), 'avisa que recuperó');
  await ctx.close();
});

await prueba('cuenta ideas por renglón e ignora renglones vacíos', async () => {
  const ctx = await navegador.newContext();
  const p = await abrir(ctx);
  await p.fill('#D', 'Sin experiencia formal\n\n   \nNo sé Power BI\n');
  igual(await p.textContent('#nD'), '2 ideas');
  await p.fill('#D', 'Una sola');
  igual(await p.textContent('#nD'), '1 idea');
  await ctx.close();
});

await prueba('el texto exportado trae las cuatro secciones, el nombre y el paso', async () => {
  const ctx = await navegador.newContext();
  const p = await abrir(ctx);
  await p.fill('#nombre', 'Luis');
  await p.fill('#F', 'Inglés B1');
  await p.fill('#O', 'Logística contrata en mi ciudad');
  await p.fill('#siguientePaso', 'Aplicar a tres vacantes');
  const t = await p.evaluate(() => comoTexto());
  cierto(t.startsWith('FODA de Luis'), 'encabezado');
  for (const s of ['FORTALEZAS', 'DEBILIDADES', 'OPORTUNIDADES', 'AMENAZAS', 'MI SIGUIENTE PASO']) cierto(t.includes(s), 'falta ' + s);
  cierto(t.includes('- Inglés B1') && t.includes('- Logística contrata'), 'items');
  cierto(t.includes('(sin ideas todavía)'), 'cuadros vacíos se dicen, no se rellenan');
  cierto(!/\d{4}-\d{2}-\d{2}/.test(t), 'el texto no lleva fecha AAAA-MM-DD');
  await ctx.close();
});

await prueba('ni la página ni la versión impresa muestran fechas AAAA-MM-DD', async () => {
  const ctx = await navegador.newContext();
  const p = await abrir(ctx);
  await p.fill('#F', 'Algo');
  await p.evaluate(() => pintarImpresion());
  const visible = await p.evaluate(() => document.body.innerText);
  cierto(!/\d{4}-\d{2}-\d{2}/.test(visible), 'hay una fecha técnica a la vista');
  const impresa = await p.evaluate(() => document.getElementById('impresion').textContent);
  cierto(!/\d{4}-\d{2}-\d{2}/.test(impresa), 'la hoja impresa trae fecha técnica');
  cierto(/\bde (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de \d{4}/.test(impresa), 'fecha legible en la hoja');
  await ctx.close();
});

await prueba('la versión impresa refleja los renglones y escapa HTML', async () => {
  const ctx = await navegador.newContext();
  const p = await abrir(ctx);
  await p.fill('#F', 'Uno\n<b>dos</b>');
  const html = await p.evaluate(() => document.querySelector('#impF .cuerpo').innerHTML);
  cierto(html.includes('<li>Uno</li>'), 'primer renglón');
  cierto(html.includes('&lt;b&gt;dos&lt;/b&gt;') && !html.includes('<b>'), 'escapa etiquetas');
  igual(await p.evaluate(() => document.querySelectorAll('#impF li').length), 2);
  cierto((await p.evaluate(() => document.querySelector('#impA .cuerpo').textContent)).includes('Sin ideas'), 'cuadro vacío lo dice');
  await ctx.close();
});

await prueba('borrar pide un segundo toque; con uno solo no borra nada', async () => {
  const ctx = await navegador.newContext();
  const p = await abrir(ctx);
  await p.fill('#F', 'Algo que no quiero perder');
  await p.click('#btnBorrar');
  cierto((await p.textContent('#btnBorrar')).includes('Seguro'), 'pide confirmar');
  igual(await p.inputValue('#F'), 'Algo que no quiero perder', 'un toque no borra');
  await p.click('#btnBorrar');
  igual(await p.inputValue('#F'), '', 'dos toques sí borran');
  igual(await p.evaluate(() => localStorage.getItem('cmb_foda')), null, 'también borra lo guardado');
  await ctx.close();
});

await prueba('con el DISC contestado aparecen pistas del estilo dominante, y nada se agrega solo', async () => {
  const ctx = await navegador.newContext();
  let p = await abrir(ctx);
  await p.evaluate(() => localStorage.setItem('cmb_disc', JSON.stringify({
    puntajes: { D:{neto:-10}, I:{neto:4}, S:{neto:30}, C:{neto:-24} }, fecha:'2026-10-08', version:1 })));
  await p.close();
  p = await abrir(ctx);
  igual(await p.evaluate(() => getComputedStyle(document.getElementById('pistasDisc')).display), 'block');
  cierto((await p.textContent('#listaPistas')).includes('Estabilidad'), 'nombra el dominante');
  igual(await p.inputValue('#F'), '', 'no agregó nada por su cuenta');
  igual(await p.inputValue('#D'), '', 'no agregó nada por su cuenta');
  await ctx.close();
});

await prueba('"Agregar" pone la pista como renglón nuevo, sin duplicar, y luego dice "Ya está"', async () => {
  const ctx = await navegador.newContext();
  let p = await abrir(ctx);
  await p.evaluate(() => localStorage.setItem('cmb_disc', JSON.stringify({
    puntajes: { D:{neto:20}, I:{neto:4}, S:{neto:-10}, C:{neto:-14} }, fecha:'2026-10-08', version:1 })));
  await p.close();
  p = await abrir(ctx);
  await p.fill('#F', 'Lo mío');
  await p.click('#listaPistas button[data-cuadro="F"]');
  igual(await p.inputValue('#F'), 'Lo mío\nDecido rápido y voy al resultado');
  igual(await p.textContent('#listaPistas button[data-cuadro="F"]'), 'Ya está');
  cierto(await p.isDisabled('#listaPistas button[data-cuadro="F"]'), 'queda deshabilitado');
  await p.evaluate(() => agregarPista('F', 'Decido rápido y voy al resultado'));
  igual(await p.inputValue('#F'), 'Lo mío\nDecido rápido y voy al resultado', 'no duplica');
  igual(await p.textContent('#nF'), '2 ideas');
  await ctx.close();
});

await prueba('la página principal ya no enlaza las herramientas sueltas: lleva al proceso Ágora', async () => {
  const ctx = await navegador.newContext();
  const i = await abrir(ctx, 'index.html');
  cierto(await i.$('.topbar a[href="agora.html"]'), 'falta el enlace al proceso Ágora en index.html');
  cierto(!(await i.$('.topbar a[href="foda.html"]')), 'index.html ya no debe enlazar foda.html en la barra');
  const d = await readFile(join(RAIZ, 'disc.html'), 'utf8');
  cierto(d.includes('href="foda.html"'), 'falta el enlace en disc.html');
  await ctx.close();
});

await navegador.close();
servidor.close();
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
