/**
 * Pruebas de disc.html y de la afinidad de estilo en index.html.
 *
 *   node cuentas/pruebas/test_disc.mjs
 *
 * Sirve el sitio en local con un navegador de verdad. Lo que comprueba no es
 * que se vea bien, sino que el cuestionario no deje calcular con huecos, que
 * la misma frase no se pueda marcar como la que más y la que menos describe,
 * que la puntuación sea la de elección forzada, y —lo más importante— que la
 * afinidad de estilo NUNCA esconda una vacante.
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
const TIPOS = { '.html':'text/html', '.json':'application/json', '.svg':'image/svg+xml' };
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
const WORKER = 'https://cv-analisis.soportetimentesbrillantes.workers.dev';

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
const ctx = await navegador.newContext();

async function abrir(archivo) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('         [error de página] ' + e.message));
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.route(/script\.google\.com/, (r) => r.fulfill({ status: 200, body: '{"ok":true}' }));
  await p.route(WORKER + '/**', (r) => r.fulfill({ status: 502, contentType: 'application/json', body: '{}' }));
  await p.goto(BASE + '/' + archivo, { waitUntil: 'domcontentloaded' });
  return p;
}

/** Contesta todos los bloques eligiendo siempre el mismo factor como "más". */
async function contestarTodo(p, factorMas, factorMenos) {
  await p.evaluate(({ mas, menos }) => {
    for (let b = 0; b < BLOQUES.length; b++) {
      for (const r of document.getElementsByName('mas' + b)) {
        if (r.value === mas) { r.checked = true; marcar(b, 'mas', mas); }
      }
      for (const r of document.getElementsByName('menos' + b)) {
        if (r.value === menos) { r.checked = true; marcar(b, 'menos', menos); }
      }
    }
  }, { mas: factorMas, menos: factorMenos });
}

console.log('\nCuestionario DISC');

await prueba('son 24 bloques de 4 frases, una por factor', async () => {
  const p = await abrir('disc.html');
  const n = await p.evaluate(() => BLOQUES.length);
  igual(n, 24);
  const malos = await p.evaluate(() => BLOQUES.filter((b) => b.length !== 4).length);
  igual(malos, 0, 'hay bloques que no tienen 4 frases:');
  const vacias = await p.evaluate(() => BLOQUES.flat().filter((f) => !f || !f.trim()).length);
  igual(vacias, 0, 'hay frases vacías:');
  await p.close();
});

await prueba('no hay frases repetidas entre bloques', async () => {
  const p = await abrir('disc.html');
  const repetidas = await p.evaluate(() => {
    const todas = BLOQUES.flat().map((f) => f.toLowerCase().trim());
    return todas.filter((f, i) => todas.indexOf(f) !== i);
  });
  igual(repetidas.length, 0, 'frases duplicadas: ' + repetidas.join(' / '));
  await p.close();
});

await prueba('no calcula con bloques sin contestar', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  await p.click('#btnVer');
  await p.waitForSelector('#avisoFalta .aviso.malo');
  cierto(!(await p.isVisible('#resultado')), 'mostró resultado con el cuestionario incompleto');
  const marcados = await p.locator('.bloque.pendiente').count();
  igual(marcados, 24, 'debería marcar los 24 bloques pendientes; marcó');
  await p.close();
});

await prueba('la misma frase no puede ser la que más y la que menos describe', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  await p.evaluate(() => {
    const r1 = [...document.getElementsByName('mas0')].find((r) => r.value === 'D');
    r1.checked = true; marcar(0, 'mas', 'D');
    const r2 = [...document.getElementsByName('menos0')].find((r) => r.value === 'D');
    r2.checked = true; marcar(0, 'menos', 'D');
  });
  const r = await p.evaluate(() => respuestas[0]);
  cierto(!(r.mas === 'D' && r.menos === 'D'), 'quedó marcada como más y menos a la vez');
  await p.close();
});

await prueba('la puntuación es más menos menos', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  await contestarTodo(p, 'D', 'S');
  const punt = await p.evaluate(() => puntuar());
  igual(punt.D.mas, 24); igual(punt.D.menos, 0); igual(punt.D.neto, 24);
  igual(punt.S.mas, 0);  igual(punt.S.menos, 24); igual(punt.S.neto, -24);
  igual(punt.I.neto, 0); igual(punt.C.neto, 0);
  await p.close();
});

await prueba('el resultado nombra el estilo dominante y repite sus límites', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await contestarTodo(p, 'D', 'S');
  await p.click('#btnVer');
  await p.waitForSelector('#resultado:visible');
  const texto = await p.textContent('#resultado');
  cierto(texto.includes('Decisión'), 'no nombró el estilo dominante');
  cierto(/no es una prueba psicom[eé]trica validada|no una prueba psicom[eé]trica validada/i.test(texto),
    'el resultado no repite que no es una prueba validada');
  cierto(/no predice/i.test(texto), 'el resultado no aclara que no predice desempeño');
  await p.close();
});

await prueba('el resultado sobrevive a recargar', async () => {
  const p = await abrir('disc.html');
  const guardado = await p.evaluate(() => localStorage.getItem('cmb_disc'));
  cierto(guardado && JSON.parse(guardado).puntajes, 'no quedó guardado el resultado');
  await p.waitForSelector('#btnVerGuardado');
  await p.click('#btnVerGuardado');
  await p.waitForSelector('#resultado:visible');
  await p.close();
});

await prueba('borrar el resultado lo quita del dispositivo', async () => {
  const p = await abrir('disc.html');
  await p.click('#btnVerGuardado');
  await p.waitForSelector('#resultado:visible');
  await p.click('#resultado button:has-text("Borrar mi resultado")');
  await p.waitForSelector('#intro:visible');
  igual(await p.evaluate(() => localStorage.getItem('cmb_disc')), null);
  await p.close();
});

await prueba('funciona con el almacenamiento bloqueado', async () => {
  const ctx2 = await navegador.newContext();
  await ctx2.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('bloqueado'); } });
  });
  const p = await ctx2.newPage();
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.goto(BASE + '/disc.html', { waitUntil: 'domcontentloaded' });
  await p.click('#intro button.primary');
  await contestarTodo(p, 'I', 'C');
  await p.click('#btnVer');
  await p.waitForSelector('#resultado:visible');
  cierto((await p.textContent('#resultado')).includes('Influencia'), 'no calculó sin localStorage');
  await p.close(); await ctx2.close();
});

console.log('\nAfinidad de estilo en las vacantes');

const CV = 'Ana Ruiz Delgado\nana.ruiz@example.com\n55 1234 5678\nLicenciatura en Administración\nExcel, inventarios, atención a clientes.';

async function analizar(p) {
  await p.fill('#cvText', CV);
  await p.check('#aceptaLegales');
  await p.click('#btnAnalizarCV');
  await p.waitForSelector('.job-card', { timeout: 20000 });
}

await prueba('sin perfil DISC invita a contestarlo y no pone etiquetas', async () => {
  const ctx3 = await navegador.newContext();
  const p = await ctx3.newPage();
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.route(/script\.google\.com/, (r) => r.fulfill({ status: 200, body: '{"ok":true}' }));
  await p.route(WORKER + '/**', (r) => r.fulfill({ status: 502, contentType: 'application/json', body: '{}' }));
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await analizar(p);
  igual(await p.locator('.job-badge:has-text("Afinidad")').count(), 0, 'puso etiquetas sin perfil');
  cierto((await p.textContent('#empleosContenido')).includes('Tu estilo de trabajo'), 'no invita a contestarlo');
  await p.close(); await ctx3.close();
});

/** El caso que importa: la afinidad etiqueta, nunca filtra. */
await prueba('con perfil DISC etiqueta pero NO esconde ninguna vacante', async () => {
  const ctx4 = await navegador.newContext();
  await ctx4.addInitScript(() => {
    localStorage.setItem('cmb_disc', JSON.stringify({
      puntajes: { D:{mas:20,menos:0,neto:20}, I:{mas:4,menos:2,neto:2},
                  S:{mas:0,menos:12,neto:-12}, C:{mas:0,menos:10,neto:-10} },
      fecha: '2026-10-02', version: 1 }));
  });
  const p = await ctx4.newPage();
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.route(/script\.google\.com/, (r) => r.fulfill({ status: 200, body: '{"ok":true}' }));
  await p.route(WORKER + '/**', (r) => r.fulfill({ status: 502, contentType: 'application/json', body: '{}' }));
  await p.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  await analizar(p);

  const sinOrdenar = await p.locator('.job-card').count();
  cierto(sinOrdenar > 0, 'no se mostró ninguna vacante');
  cierto(await p.locator('.job-badge:has-text("Afinidad")').count() > 0, 'no puso ninguna etiqueta de afinidad');

  // Activar el orden por afinidad no debe cambiar CUÁNTAS vacantes hay.
  const antes = await p.locator('.job-title').allTextContents();
  await p.check('#ordenarPorAfinidad');
  await p.waitForTimeout(600);
  const despues = await p.locator('.job-title').allTextContents();
  igual(despues.length, antes.length, 'ordenar por afinidad cambió el número de vacantes:');
  igual([...despues].sort().join('|'), [...antes].sort().join('|'),
    'ordenar por afinidad cambió el CONJUNTO de vacantes, no solo el orden');
  await p.close(); await ctx4.close();
});

await prueba('un puesto de ventas pide estilo I y uno de calidad pide C', async () => {
  const p = await abrir('index.html');
  const r = await p.evaluate(() => ({
    ventas: estiloEsperado({ titulo: 'Ejecutivo de ventas telefónicas' }),
    calidad: estiloEsperado({ titulo: 'Analista de calidad y cumplimiento' }),
    almacen: estiloEsperado({ titulo: 'Auxiliar de almacén y CEDIS' }),
    raro: estiloEsperado({ titulo: 'Puesto sin categoría conocida xyz' })
  }));
  cierto(r.ventas && r.ventas.I >= r.ventas.C, 'ventas debería inclinarse a Influencia');
  cierto(r.calidad && r.calidad.C > r.calidad.I, 'calidad debería inclinarse a Cuidado');
  cierto(r.almacen && r.almacen.S > r.almacen.D, 'almacén debería inclinarse a Estabilidad');
  igual(r.raro, null, 'un puesto desconocido no debe inventarse un estilo; devolvió');
  await p.close();
});

await prueba('sin estilo conocido, la vacante no muestra etiqueta', async () => {
  const p = await abrir('index.html');
  const vacio = await p.evaluate(() => etiquetaAfinidad(null));
  igual(vacio, '');
  await p.close();
});

await navegador.close();
servidor.close();
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
