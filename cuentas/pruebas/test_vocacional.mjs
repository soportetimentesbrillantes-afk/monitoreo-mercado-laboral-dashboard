/**
 * Pruebas del test vocacional (test-vocacional.html) y de su pestaña en el
 * Apps Script de autoconocimiento.
 *
 *   node cuentas/pruebas/test_vocacional.mjs
 *
 * Lo que importa: las 78 preguntas se contestan por páginas y no se puede
 * avanzar con huecos; el avance sobrevive a recargar la página; el resultado
 * llena los campos del formato del orientador (Aplicación, Habilidades,
 * Aptitudes, Áreas de preferencia, Carreras derivadas, Sugerencias) y
 * recomienda carreras coherentes con las respuestas; nada se manda sin la
 * casilla de consentimiento; y en la hoja, reenviar actualiza la misma fila
 * sin borrar las Observaciones del orientador.
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
const ENDPOINT = 'https://hoja-de-prueba.example/exec';

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

const navegador = await chromium.launch();
const errores = [];
async function abrir({ endpoint = false } = {}) {
  const ctx = await navegador.newContext();
  const envios = [];
  if (endpoint) await ctx.addInitScript((u) => { window.__CMB_ENDPOINT_PRUEBA = u; }, ENDPOINT);
  await ctx.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await ctx.route(/hoja-de-prueba|script\.google/, async (r) => {
    envios.push({ url: r.request().url(), cuerpo: JSON.parse(r.request().postData() || '{}') });
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });
  await p.goto(BASE + '/test-vocacional.html', { waitUntil: 'domcontentloaded' });
  return { p, ctx, envios };
}

/* Un perfil "tecnológico": le encanta tecnología, le gusta ingeniería, lo
   demás le da igual o le desagrada; fuerte en lo digital y lo numérico;
   lo mueve investigar. */
function respuestaTec(id) {
  const [parte, grupo] = id.split('_');
  if (parte === 'i') return { tec: 5, ing: 4, art: 2, sal: 1, soc: 2, tur: 1 }[grupo] || 3;
  if (parte === 'a') return { digital: 5, numerica: 4, cientifica: 4, social: 2, artistica: 2 }[grupo] || 3;
  return { I: 5, C: 4, S: 2 }[grupo] || 3;
}
async function contestarPagina(p, fn) {
  const ids = await p.$$eval('#pagItems .item', (xs) => xs.map(x => x.dataset.q));
  for (const id of ids) await p.check(`input[name="${id}"][value="${fn(id)}"]`);
  return ids.length;
}

console.log('\nTest vocacional');

await prueba('78 preguntas en 8 páginas; no avanza con huecos', async () => {
  const { p, ctx } = await abrir();
  const n = await p.evaluate(() => [VOCACIONAL.PREGUNTAS.length, VOCACIONAL.PAGINAS.length, new Set(VOCACIONAL.PREGUNTAS.map(q => q.id)).size]);
  igual(n.join(','), '78,8,78');
  await p.click('#btnEmpezar');
  cierto(await p.isDisabled('#btnSiguiente'), 'sin respuestas no avanza');
  igual(await p.textContent('#faltan'), 'Faltan 10 respuestas en esta página');
  await p.check('input[name="i_ing_1"][value="4"]');
  igual(await p.textContent('#faltan'), 'Faltan 9 respuestas en esta página');
  await ctx.close();
});

await prueba('el avance se guarda y al volver retoma en la página pendiente', async () => {
  const { p, ctx } = await abrir();
  await p.click('#btnEmpezar');
  await contestarPagina(p, respuestaTec); await p.click('#btnSiguiente');
  await contestarPagina(p, respuestaTec); await p.click('#btnSiguiente');
  await p.check('input[name="' + (await p.$eval('#pagItems .item', x => x.dataset.q)) + '"][value="3"]');
  await p.reload({ waitUntil: 'domcontentloaded' });
  cierto((await p.textContent('#btnEmpezar')).includes('Seguir'), 'ofrece seguir');
  cierto((await p.textContent('#notaRetomar')).includes('21 de 78'), await p.textContent('#notaRetomar'));
  await p.click('#btnEmpezar');
  igual(await p.textContent('#avanceNum'), 'Página 3 de 8');
  cierto(await p.isChecked('#pagItems input[value="3"]'), 'conserva la respuesta de la página a medias');
  await ctx.close();
});

await prueba('perfil tecnológico: la ficha sale completa y las carreras son de TI', async () => {
  const { p, ctx, envios } = await abrir();
  await p.click('#btnEmpezar');
  for (let i = 0; i < 8; i++) { await contestarPagina(p, respuestaTec); await p.click('#btnSiguiente'); }
  await p.waitForSelector('#vResultados:not([hidden])');
  const ficha = await p.$$eval('#ficha tr', (t) => Object.fromEntries(t.map(r => [r.cells[0].textContent, r.cells[1].textContent])));
  igual(Object.keys(ficha).join('|'), 'Aplicación|Habilidades|Aptitudes|Áreas de preferencia|Carreras derivadas|Sugerencias|Observaciones');
  cierto(ficha['Aplicación'].includes('Test vocacional CMB v1') && /\d{4}/.test(ficha['Aplicación']), ficha['Aplicación']);
  cierto(ficha['Áreas de preferencia'].startsWith('Tecnología e informática (100%), Ingeniería y ciencias exactas (75%)'), ficha['Áreas de preferencia']);
  cierto(ficha['Aptitudes'].startsWith('Digital (100%)'), ficha['Aptitudes']);
  cierto(ficha['Habilidades'].startsWith('Aprendizaje digital, Herramientas digitales'), ficha['Habilidades']);
  const primeras = (await p.$$eval('#resCarreras h4', (h) => h.map(x => x.textContent))).slice(0, 3);
  const deTI = ['Ingeniería de software', 'Ciencia de datos e inteligencia artificial', 'Ciberseguridad', 'Ingeniería en sistemas computacionales', 'Técnico en programación', 'Tecnologías de la información y redes'];
  cierto(primeras.every(c => deTI.includes(c)), primeras.join(', '));
  cierto(ficha['Sugerencias'].includes('Explora primero') && ficha['Sugerencias'].includes('investigar y entender'), ficha['Sugerencias']);
  cierto(ficha['Observaciones'].includes('orientador'), 'Observaciones queda para el orientador');
  // En localhost no aparece la opción de compartir ni se manda nada.
  igual(await p.locator('#compartirVocacional .compartir').count(), 0);
  igual(envios.length, 0);
  // Recargar muestra el resultado, no el inicio.
  await p.reload({ waitUntil: 'domcontentloaded' });
  cierto(await p.isVisible('#vResultados'), 'al volver ve su resultado');
  await ctx.close();
});

await prueba('quien contesta todo igual recibe el aviso de que el resultado no distingue', async () => {
  const { p, ctx } = await abrir();
  const R = await p.evaluate(() => { const r = {}; VOCACIONAL.PREGUNTAS.forEach(q => r[q.id] = 3); return VOCACIONAL.calcular(r); });
  cierto(R.plano, 'marca respuestas planas');
  cierto(R.ficha.sugerencias.startsWith('• Contestaste casi todas las actividades igual'), R.ficha.sugerencias.slice(0, 80));
  cierto(R.ficha.habilidades.includes('ninguna la calificaste como fuerte'), R.ficha.habilidades);
  await ctx.close();
});

await prueba('otro perfil (salud y ayudar) da carreras de salud', async () => {
  const { p, ctx } = await abrir();
  const top = await p.evaluate(() => {
    const r = {};
    VOCACIONAL.PREGUNTAS.forEach(q => {
      const [parte, g] = q.id.split('_');
      r[q.id] = parte === 'i' ? (g === 'sal' ? 5 : g === 'soc' ? 4 : 2) : parte === 'a' ? (['social', 'cientifica'].includes(g) ? 5 : 3) : (g === 'S' ? 5 : g === 'I' ? 4 : 2);
    });
    return VOCACIONAL.calcular(r).carreras.slice(0, 3).map(x => x.c.a);
  });
  cierto(top.every(a => a === 'Salud'), top.join(', '));
  await ctx.close();
});

await prueba('compartir: sin casilla no se manda; con casilla llegan los campos del formato', async () => {
  const { p, ctx, envios } = await abrir({ endpoint: true });
  await p.evaluate(() => {
    const r = {}; VOCACIONAL.PREGUNTAS.forEach(q => r[q.id] = 4); r.i_art_1 = 5; r.i_art_2 = 5; r.i_ind_1 = 1;
    localStorage.setItem('cmb_vocacional', JSON.stringify({ v: 1, r, pagina: 7, inicio: '2026-11-10T16:00:00Z', fin: '2026-11-10T16:20:00Z', id: 'abcdef0123456789abcdef01' }));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#compartirVocacional .compartir');
  const card = '#compartirVocacional';
  await p.fill(card + ' input[type=text]', 'Luis Ramírez');
  await p.fill(card + ' input[type=email]', 'luis@ejemplo.com');
  cierto(await p.isDisabled(card + ' button'), 'sin la casilla, el botón está apagado');
  igual(envios.length, 0);
  await p.check(card + ' input[type=checkbox]');
  await p.click(card + ' button');
  await p.waitForFunction(() => document.querySelector('#compartirVocacional').textContent.includes('Listo'));
  igual(envios.length, 1);
  const d = envios[0].cuerpo;
  igual(d.tipo, 'vocacional'); igual(d.acepta, true); igual(d.id, 'abcdef0123456789abcdef01');
  cierto(d.areas.startsWith('Artes, diseño y comunicación'), d.areas);
  for (const k of ['aplicacion', 'habilidades', 'aptitudes', 'carreras', 'sugerencias', 'motiva', 'puntajes', 'version']) cierto(d[k], 'falta ' + k);
  igual(d.respuestas.split(',').length, 78);
  cierto(!('observaciones' in d), 'las observaciones no las manda la página');
  await ctx.close();
});

await navegador.close();
servidor.close();

/* ------------------------------ Apps Script ------------------------------ */
console.log('\nApps Script · pestaña Test vocacional');
const codigo = await readFile(join(RAIZ, 'cuentas/apps-script-autoconocimiento.gs'), 'utf8');
function cargar() {
  const pestanas = {};
  const crear = (nombre) => { const filas = []; const h = { filas,
    getLastRow: () => filas.length, getLastColumn: () => Math.max(0, ...filas.map(f => f.length)),
    appendRow: (f) => filas.push(f.slice()),
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (filas[r - 1 + i] || [])[c - 1 + j] ?? '')),
      setValues: (v) => v.forEach((fila, i) => { filas[r - 1 + i] = filas[r - 1 + i] || []; fila.forEach((x, j) => { filas[r - 1 + i][c - 1 + j] = x; }); }),
      setFontWeight: () => {} }),
    setFrozenRows: () => {} }; pestanas[nombre] = h; return h; };
  const ctx = { SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => pestanas[n] || null, insertSheet: crear }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }) },
    JSON, Date, String, Object, Math, Array, isFinite, parseInt, isNaN };
  vm.createContext(ctx); vm.runInContext(codigo, ctx);
  return { ctx, post: (d) => ctx.doPost({ postData: { contents: JSON.stringify(d) } }), pestanas };
}
const RESP = Array.from({ length: 78 }, (_, i) => 'i_ing_' + (i % 5 + 1) + '=' + (i % 5 + 1)).join(',');
const V = { clave: 'cmb-autoconocimiento-2026', acepta: true, tipo: 'vocacional', id: 'vvvvvvvvvvvvvvvvvvvvvvvv', nombre: 'Luis Ramírez', correo: 'Luis@Ejemplo.com',
  version: 'Test vocacional CMB v1', aplicacion: '10 de noviembre de 2026 · Test vocacional CMB v1', habilidades: 'Creatividad, Sentido estético',
  aptitudes: 'Artística (88%)', areas: 'Artes, diseño y comunicación (100%)', carreras: 'Diseño gráfico y digital (84%)',
  sugerencias: '• Explora primero…', motiva: '=HYPERLINK("x")', puntajes: 'Intereses: …', respuestas: RESP, dispositivo: 'disp12345678' };
const col = (h, n) => h.filas[0].indexOf(n);

await prueba('crea la pestaña con las columnas del formato y escribe la fila', async () => {
  const { post, pestanas } = cargar();
  igual(post(V).ok, true);
  const h = pestanas['Test vocacional'];
  cierto(h, 'existe la pestaña');
  for (const c of ['Aplicación', 'Habilidades', 'Aptitudes', 'Áreas de preferencia', 'Carreras derivadas', 'Sugerencias', 'Observaciones']) cierto(col(h, c) >= 0, 'falta ' + c);
  const f = h.filas[1];
  igual(f[col(h, 'Correo')], 'luis@ejemplo.com');
  igual(f[col(h, 'Áreas de preferencia')], 'Artes, diseño y comunicación (100%)');
  igual(f[col(h, 'Lo que te motiva')], '\'=HYPERLINK("x")', 'no deja pasar fórmulas');
  igual(f[col(h, 'Observaciones')], '');
});

await prueba('reenviar actualiza la fila y conserva las Observaciones del orientador', async () => {
  const { post, pestanas } = cargar();
  post(V);
  const h = pestanas['Test vocacional'];
  h.filas[1][col(h, 'Observaciones')] = 'Platicar con su mamá sobre Diseño';
  const primero = h.filas[1][col(h, 'Primer envío')];
  igual(post(Object.assign({}, V, { carreras: 'Arquitectura (80%)' })).ok, true);
  igual(h.filas.length, 2, 'no duplica');
  igual(h.filas[1][col(h, 'Carreras derivadas')], 'Arquitectura (80%)');
  igual(h.filas[1][col(h, 'Observaciones')], 'Platicar con su mamá sobre Diseño');
  igual(h.filas[1][col(h, 'Primer envío')], primero);
});

await prueba('rechaza sin consentimiento, test incompleto o respuestas con otro formato', async () => {
  const { post, pestanas } = cargar();
  igual(post(Object.assign({}, V, { acepta: false })).error, 'sin consentimiento');
  igual(post(Object.assign({}, V, { areas: '' })).error, 'test incompleto');
  igual(post(Object.assign({}, V, { respuestas: '=IMPORTXML("http://x")' })).error, 'respuestas');
  cierto(!pestanas['Test vocacional'] || pestanas['Test vocacional'].filas.length <= 1, 'no escribió nada');
});

await prueba('revisarPestanas sigue siendo la primera función y crea la pestaña', async () => {
  const { ctx, pestanas } = cargar();
  const primera = codigo.match(/^function (\w+)/m)[1];
  igual(primera, 'revisarPestanas');
  ctx.revisarPestanas();
  cierto(pestanas['Test vocacional'] && pestanas['Test vocacional'].filas[0].includes('Observaciones'));
});

if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
