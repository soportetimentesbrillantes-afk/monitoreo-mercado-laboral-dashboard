/**
 * Pruebas de "Compartir con el Club" en disc.html, disc-agora.html y foda.html.
 *
 *   node cuentas/pruebas/test_compartir.mjs
 *
 * Lo que importa: que NADA salga del navegador sin la casilla marcada y el
 * botón; que sin endpoint configurado la opción ni aparezca; que lo que se
 * manda sea exactamente lo que dice la tarjeta; y que reenviar el mismo
 * resultado use el mismo id (actualiza la fila, no la duplica).
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
const FALSO = 'https://script.google.com/macros/s/PRUEBA/exec';

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

/* Abre una página. Con `conEndpoint`, la opción de compartir se activa contra
   un servidor falso que guarda todo lo que recibe en `enviados`. Cualquier
   otra petición a script.google.com también se registra: si aparece alguna
   que no debía, la prueba lo ve. */
async function abrir(archivo, conEndpoint = true) {
  const ctx = await navegador.newContext();
  const enviados = [];
  if (conEndpoint) await ctx.addInitScript((u) => { window.__CMB_ENDPOINT_PRUEBA = u; }, FALSO);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('         [error de página] ' + e.message));
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.route(/script\.google\.com/, async (r) => {
    try { enviados.push(JSON.parse(r.request().postData() || '{}')); } catch { enviados.push({ crudo: r.request().postData() }); }
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await p.goto(BASE + '/' + archivo, { waitUntil: 'domcontentloaded' });
  return { p, ctx, enviados };
}

async function terminarBloques(p) {
  await p.evaluate(() => {
    empezar();
    for (let b = 0; b < BLOQUES.length; b++) { fijarRango(b, 'C', 1); fijarRango(b, 'S', 2); fijarRango(b, 'I', 3); fijarRango(b, 'D', 4); }
    irA(BLOQUES.length - 1);
  });
  await p.click('#btnVer');
  await p.waitForSelector('#resultado:visible');
}

const RESPUESTAS_AGORA = {
  a: {2:4, 7:4, 9:4, 14:4, 3:3, 4:3, 12:3, 15:3, 5:2, 6:2, 10:2, 13:2, 1:1, 8:1, 11:1, 16:1},
  b: { marcados: [17, 20, 23, 27, 30, 18, 22], estrella: 17 },
  c: Object.fromEntries([41,42,43,44,45,46,47].map(n => [n, [4, 3, 2, 1]])),
  d: Object.fromEntries([48,49,50,51,52,53,54,55,56,57,58,59].map(n => [n, 'izq'])),
  e: Object.assign({},
    Object.fromEntries([61,65,67,73].map(n => [n, 'TA'])), Object.fromEntries([60,63,71,74].map(n => [n, 'DA'])),
    Object.fromEntries([64,66,69,75].map(n => [n, 'I'])), Object.fromEntries([62,68,70,72].map(n => [n, 'TD'])))
};

console.log('\nCompartir con el Club');

await prueba('en una copia local (127.0.0.1) no se usa la hoja real: no aparece la opción y no sale nada', async () => {
  const { p, ctx, enviados } = await abrir('disc.html', false);
  await terminarBloques(p);
  igual(await p.evaluate(() => document.querySelector('#compartirDisc').innerHTML.trim()), '', 'no debe pintar la tarjeta');
  igual(enviados.length, 0, 'no debe mandar nada');
  await ctx.close();
});

await prueba('el sitio publicado sí apunta a la aplicación web del Club', async () => {
  const js = await readFile(join(RAIZ, 'compartir-club.js'), 'utf8');
  cierto(/const URL_CLUB = 'https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec';/.test(js), 'falta la URL del Apps Script');
});

await prueba('DISC: terminar el cuestionario NO envía nada por sí solo; la casilla empieza sin marcar', async () => {
  const { p, ctx, enviados } = await abrir('disc.html');
  await terminarBloques(p);
  cierto(await p.isVisible('.compartir'), 'falta la tarjeta de compartir');
  cierto(!(await p.isChecked('.compartir input[type=checkbox]')), 'la casilla debe empezar sin marcar');
  cierto(await p.isDisabled('.compartir button'), 'el botón debe estar desactivado sin casilla');
  await p.waitForTimeout(300);
  igual(enviados.length, 0, 'terminar el cuestionario no debe enviar nada');
  await ctx.close();
});

await prueba('DISC: con datos pero sin casilla no se puede enviar; con casilla sí, y llega lo esperado', async () => {
  const { p, ctx, enviados } = await abrir('disc.html');
  await terminarBloques(p);
  await p.fill('.compartir input[type=text]', 'Ana Pérez');
  await p.fill('.compartir input[type=email]', 'ana@ejemplo.com');
  cierto(await p.isDisabled('.compartir button'), 'sin casilla el botón sigue desactivado');
  await p.check('.compartir input[type=checkbox]');
  cierto(!(await p.isDisabled('.compartir button')), 'con casilla y datos válidos se activa');
  await p.click('.compartir button');
  await p.waitForFunction(() => document.querySelector('.compartir').textContent.includes('Listo'));
  igual(enviados.length, 1);
  const e = enviados[0];
  igual(e.tipo, 'disc'); igual(e.acepta, true); igual(e.nombre, 'Ana Pérez'); igual(e.correo, 'ana@ejemplo.com');
  igual(e.instrumento, 'bloques');
  igual(e.puntajes.C.neto, 48, 'C en primer lugar en los 24 bloques');
  igual(e.puntajes.D.neto, -48);
  igual(e.lectura, 'dominante claro');
  cierto(Array.isArray(e.respuestas) && e.respuestas.length === 24, 'deben ir las respuestas crudas');
  cierto(/^[0-9a-f]{24}$/.test(e.id), 'id con formato válido');
  cierto(e.dispositivo && e.dispositivo.length >= 8, 'id de dispositivo');
  cierto(!(await p.isChecked('.compartir input[type=checkbox]')), 'la casilla se desmarca después de enviar');
  await ctx.close();
});

await prueba('DISC: reenviar el mismo resultado usa el mismo id; contestar de nuevo usa otro', async () => {
  const { p, ctx, enviados } = await abrir('disc.html');
  await terminarBloques(p);
  const enviar = async () => {
    await p.fill('.compartir input[type=text]', 'Ana Pérez');
    await p.fill('.compartir input[type=email]', 'ana@ejemplo.com');
    await p.check('.compartir input[type=checkbox]');
    await p.click('.compartir button');
    await p.waitForFunction((n) => document.querySelector('.compartir') && document.querySelector('.compartir').textContent.includes('Listo'), enviados.length);
  };
  await enviar();
  // Recargar y abrir el resultado guardado: mismo id
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.click('#btnVerGuardado');
  await p.waitForSelector('#resultado:visible');
  cierto((await p.textContent('.compartir')).includes('Ya compartiste'), 'debe recordar que ya se compartió');
  igual(await p.inputValue('.compartir input[type=email]'), 'ana@ejemplo.com', 'prellena el correo');
  await enviar();
  igual(enviados.length, 2);
  igual(enviados[1].id, enviados[0].id, 'el mismo resultado debe conservar su id');
  // Contestar otra vez: id distinto
  await terminarBloques(p);
  await enviar();
  igual(enviados.length, 3);
  cierto(enviados[2].id !== enviados[0].id, 'un cuestionario nuevo debe tener id nuevo');
  await ctx.close();
});

await prueba('DISC de Ágora: manda instrumento, detalle por sección y respuestas crudas para poder volver a puntuar', async () => {
  const { p, ctx, enviados } = await abrir('disc-agora.html');
  await p.evaluate((r) => { empezar(); R = r; SECCIONES.forEach(s => PINTAR[s]()); despues(); irA(4); }, RESPUESTAS_AGORA);
  await p.click('#btnVer');
  await p.waitForSelector('#resultado:visible');
  await p.fill('.compartir input[type=text]', 'Luis Gómez');
  await p.fill('.compartir input[type=email]', 'luis@ejemplo.mx');
  await p.check('.compartir input[type=checkbox]');
  await p.click('.compartir button');
  await p.waitForFunction(() => document.querySelector('.compartir').textContent.includes('Listo'));
  const e = enviados[0];
  igual(e.instrumento, 'agora');
  igual(e.puntajes.C.neto, 77);
  igual(e.puntajes.C.secciones.b, 14, 'detalle por sección');
  igual(e.escala.max, 82);
  igual(e.respuestas.b.estrella, 17, 'respuestas crudas incluidas');
  cierto(String(e.versionClave).includes('por confirmar'), 'la versión de la clave dice que hay supuestos');
  await ctx.close();
});

await prueba('FODA: nada se envía al escribir; al compartir llegan los cuatro cuadros y el estilo DISC', async () => {
  const { p, ctx, enviados } = await abrir('foda.html');
  await p.evaluate(() => localStorage.setItem('cmb_disc', JSON.stringify({ puntajes: { D:{neto:5}, I:{neto:2}, S:{neto:30}, C:{neto:9} }, fecha:'2026-10-15', version:2, instrumento:'bloques' })));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.fill('#F', 'Excel intermedio');
  await p.fill('#D', 'Sin experiencia formal');
  await p.fill('#O', 'Logística contrata');
  await p.fill('#A', 'Piden un año de experiencia');
  await p.fill('#siguientePaso', 'Poner cifras al CV');
  await p.waitForTimeout(500);
  igual(enviados.length, 0, 'escribir no debe enviar nada');
  await p.fill('.compartir input[type=text]', 'Ana Pérez');
  await p.fill('.compartir input[type=email]', 'ana@ejemplo.com');
  await p.check('.compartir input[type=checkbox]');
  await p.click('.compartir button');
  await p.waitForFunction(() => document.querySelector('.compartir').textContent.includes('Listo'));
  const e = enviados[0];
  igual(e.tipo, 'foda'); igual(e.F, 'Excel intermedio'); igual(e.A, 'Piden un año de experiencia');
  igual(e.paso, 'Poner cifras al CV'); igual(e.estiloDisc, 'S');
  await ctx.close();
});

await prueba('FODA: corregir y reenviar usa el mismo id; "Borrar todo" lo suelta', async () => {
  const { p, ctx, enviados } = await abrir('foda.html');
  const enviar = async (n) => {
    await p.fill('.compartir input[type=text]', 'Ana Pérez');
    await p.fill('.compartir input[type=email]', 'ana@ejemplo.com');
    await p.check('.compartir input[type=checkbox]');
    await p.click('.compartir button');
    await p.waitForFunction((n) => window.__n === undefined ? true : true, n);
    await p.waitForTimeout(150);
  };
  await p.fill('#F', 'Uno');
  await enviar(1);
  await p.fill('#F', 'Uno\nDos');
  await enviar(2);
  igual(enviados.length, 2);
  igual(enviados[1].id, enviados[0].id, 'el mismo FODA conserva su id');
  igual(enviados[1].F, 'Uno\nDos');
  await p.click('#btnBorrar'); await p.click('#btnBorrar');
  await p.fill('#F', 'Otro FODA');
  await enviar(3);
  cierto(enviados[2].id !== enviados[0].id, 'después de borrar es otro FODA');
  await ctx.close();
});

await prueba('correo inválido o nombre vacío mantienen el botón desactivado', async () => {
  const { p, ctx } = await abrir('foda.html');
  await p.fill('#F', 'Algo');
  await p.check('.compartir input[type=checkbox]');
  await p.fill('.compartir input[type=text]', 'Ana');
  await p.fill('.compartir input[type=email]', 'ana@');
  cierto(await p.isDisabled('.compartir button'), 'correo inválido');
  await p.fill('.compartir input[type=email]', 'ana@ejemplo.com');
  await p.fill('.compartir input[type=text]', '');
  cierto(await p.isDisabled('.compartir button'), 'nombre vacío');
  await ctx.close();
});

await prueba('la tarjeta dice qué se manda, para qué, y cómo pedir que se borre', async () => {
  const { p, ctx } = await abrir('foda.html');
  const t = await p.textContent('.compartir');
  cierto(t.includes('opcional'), 'debe decir que es opcional');
  cierto(t.includes('no se comparten con empresas'), 'debe decir que no se comparte con empresas');
  cierto(t.includes('te sirve igual'), 'debe decir que sin compartir funciona igual');
  cierto(t.includes('clubmentesbrillantesla@gmail.com'), 'debe decir a dónde pedir el borrado');
  cierto(await p.$('.compartir a[href="aviso-privacidad.html"]'), 'debe enlazar el aviso de privacidad');
  await ctx.close();
});

await prueba('el aviso de privacidad cubre las herramientas de autoconocimiento', async () => {
  const s = await readFile(join(RAIZ, 'aviso-privacidad.html'), 'utf8');
  cierto(s.includes('Herramientas de autoconocimiento'), 'falta la sección');
  cierto(s.includes('Enviar al Club'), 'debe nombrar el botón');
  cierto(s.includes('Octubre de 2026'), 'fecha de actualización');
});

await navegador.close();
servidor.close();
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
