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

/** Ordena los cuatro factores igual en todos los bloques: el primero de la
    lista queda en posición 1 y el último en la 4. */
async function contestarTodo(p, ordenFactores) {
  await p.evaluate((lista) => {
    for (let b = 0; b < BLOQUES.length; b++) {
      lista.forEach((f, i) => fijarRango(b, f, i + 1));
    }
    // El botón de resultado solo existe en el último bloque.
    irA(BLOQUES.length - 1);
  }, ordenFactores);
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
  await p.evaluate(() => irA(BLOQUES.length - 1));
  await p.click('#btnVer');
  await p.waitForSelector('#avisoFalta .aviso.malo');
  cierto(!(await p.isVisible('#resultado')), 'mostró resultado con el cuestionario incompleto');
  const marcados = await p.locator('.bloque.pendiente').count();
  igual(marcados, 24, 'debería marcar los 24 bloques pendientes; marcó');
  await p.close();
});

/* Estas tres salieron de un reporte de Gael: "no me deja seleccionar bien las
   respuestas". Eran dos cosas — el área sensible medía 18x18 px, así que un
   clic al lado del círculo no hacía nada; y marcar la misma frase como Menos
   borraba el Más en silencio, que se siente como que la página falla. */
await prueba('el área para seleccionar es del tamaño de un dedo', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  const caja = await p.locator('#bloque0 .rango').first().boundingBox();
  cierto(caja.height >= 40 && caja.width >= 40,
    `el botón mide ${Math.round(caja.width)}x${Math.round(caja.height)} px; en un teléfono eso se falla más de lo que se acierta`);
  await p.close();
});

await prueba('cada frase se ordena del 1 al 4', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  igual(await p.locator('#bloque0 .rango').count(), 16, 'cuatro botones por frase, dieciséis por bloque:');
  const factores = await p.evaluate(() => orden[0].map((i) => CLAVES[i]));
  for (let i = 0; i < 4; i++) {
    await p.locator(`#bloque0 .rango[data-f="${factores[i]}"][data-r="${i + 1}"]`).click();
  }
  const r = await p.evaluate(() => respuestas[0]);
  igual(Object.values(r).filter(Boolean).length, 4, 'posiciones ocupadas:');
  igual(new Set(Object.values(r)).size, 4, 'posiciones distintas:');
  cierto(await p.locator('#bloque0.listo').count() === 1, 'el bloque completo debería verse terminado');
  await p.close();
});

/* Esta es la que cubre lo que reportó Gael: antes, poner una marca podía hacer
   desaparecer otra sin explicación. Ahora las dos se intercambian. */
await prueba('dar una posición ocupada intercambia, nunca borra', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  const f = await p.evaluate(() => orden[0].map((i) => CLAVES[i]));
  for (let i = 0; i < 4; i++) {
    await p.locator(`#bloque0 .rango[data-f="${f[i]}"][data-r="${i + 1}"]`).click();
  }
  await p.locator(`#bloque0 .rango[data-f="${f[2]}"][data-r="1"]`).click();
  const r = await p.evaluate(() => respuestas[0]);
  igual(r[f[2]], 1, 'la frase nueva debería tomar el 1:');
  igual(r[f[0]], 3, 'y la anterior quedarse con el 3 de la otra:');
  igual(Object.values(r).filter(Boolean).length, 4, 'no debe perderse ninguna posición:');
  await p.close();
});

await prueba('volver a tocar la misma posición la quita', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  const f = await p.evaluate(() => orden[0].map((i) => CLAVES[i]));
  await p.locator(`#bloque0 .rango[data-f="${f[0]}"][data-r="1"]`).click();
  await p.locator(`#bloque0 .rango[data-f="${f[0]}"][data-r="1"]`).click();
  igual((await p.evaluate(() => respuestas[0]))[f[0]], null);
  await p.close();
});


await prueba('solo se ve un bloque a la vez', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  igual(await p.locator('.bloque:visible').count(), 1, 'bloques visibles:');
  cierto(await p.locator('#bloque0').isVisible(), 'debería empezar en el primero');
  cierto(!(await p.locator('#btnVer').isVisible()), 'el botón de resultado no debe verse antes del último bloque');
  await p.close();
});

await prueba('al completar un bloque pasa solo al siguiente', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  const f = await p.evaluate(() => orden[0].map((i) => CLAVES[i]));
  for (let i = 0; i < 4; i++) {
    await p.locator(`#bloque0 .rango[data-f="${f[i]}"][data-r="${i + 1}"]`).click();
  }
  await p.waitForSelector('#bloque1.actual', { timeout: 3000 });
  cierto(!(await p.locator('#bloque0').isVisible()), 'el bloque anterior debería ocultarse');
  igual(await p.textContent('#pistaNav'), 'Bloque 2 de 24');
  await p.close();
});

await prueba('"Anterior" regresa y conserva lo contestado', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  const f = await p.evaluate(() => orden[0].map((i) => CLAVES[i]));
  for (let i = 0; i < 4; i++) {
    await p.locator(`#bloque0 .rango[data-f="${f[i]}"][data-r="${i + 1}"]`).click();
  }
  await p.waitForSelector('#bloque1.actual', { timeout: 3000 });
  await p.click('#btnAnterior');
  cierto(await p.locator('#bloque0').isVisible(), 'debería volver al primero');
  igual(await p.locator('#bloque0 .rango.activo').count(), 4, 'las cuatro posiciones deben seguir marcadas:');
  await p.close();
});

await prueba('en el último bloque aparece el botón de resultado y no avanza más', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  await p.evaluate(() => irA(BLOQUES.length - 1));
  cierto(await p.locator('#btnVer').isVisible(), 'falta el botón de resultado en el último bloque');
  cierto(!(await p.locator('#btnSiguiente').isVisible()), '"Siguiente" no debe verse en el último');
  await p.close();
});

await prueba('al pedir el resultado con huecos, lleva al primer bloque incompleto', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  // contestar todos menos el 5
  await p.evaluate(() => {
    for (let b = 0; b < BLOQUES.length; b++) {
      if (b === 4) continue;
      CLAVES.forEach((f, i) => fijarRango(b, f, i + 1));
    }
    irA(BLOQUES.length - 1);
  });
  await p.click('#btnVer');
  await p.waitForSelector('#bloque4.actual');
  cierto((await p.textContent('#avisoFalta')).includes('Te faltan 1 bloque'), 'debería decir cuántos faltan');
  await p.close();
});

await prueba('la puntuación pesa las cuatro posiciones y suma cero', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await p.waitForSelector('#cuestionario:visible');
  await contestarTodo(p, ['D', 'I', 'S', 'C']);
  const punt = await p.evaluate(() => puntuar());
  igual(punt.D.neto, 48, 'primera posición en los 24 bloques:');
  igual(punt.I.neto, 24, 'segunda posición:');
  igual(punt.S.neto, -24, 'tercera posición:');
  igual(punt.C.neto, -48, 'cuarta posición:');
  // Esta es la propiedad que hace que el perfil signifique algo: nadie puede
  // salir alto en todo. Es lo que se pierde con una escala del 1 al 5.
  igual(punt.D.neto + punt.I.neto + punt.S.neto + punt.C.neto, 0,
    'los cuatro factores deben sumar cero; si no, el perfil deja de ser relativo:');
  await p.close();
});

await prueba('el resultado nombra el estilo dominante y repite sus límites', async () => {
  const p = await abrir('disc.html');
  await p.click('#intro button.primary');
  await contestarTodo(p, ['D', 'I', 'S', 'C']);
  await p.click('#btnVer');
  await p.waitForSelector('#resultado:visible');
  const texto = await p.textContent('#resultado');
  cierto(texto.includes('Dominancia'), 'no nombró el estilo dominante');
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
  await contestarTodo(p, ['I', 'D', 'S', 'C']);
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
  cierto((await p.textContent('#empleosContenido')).includes('Perfil DISC'), 'no invita a contestarlo');
  cierto(await p.$('#empleosContenido a[href="agora.html#disc"]'), 'debe llevar a la fase 2 del proceso Ágora');
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
  cierto(r.calidad && r.calidad.C > r.calidad.I, 'calidad debería inclinarse a Cumplimiento');
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
