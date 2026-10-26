/**
 * Pruebas de agora.html (proceso Ágora) y de su parte del Apps Script.
 *
 *   node cuentas/pruebas/test_proceso_agora.mjs
 *
 * Lo que importa: que la ruta muestre las 10 fases con su
 * estado; que solo se puedan abrir las herramientas listas; que el paso 1 no
 * se dé por completo con huecos y diga qué falta; que un menor necesite a su
 * tutor; que todo sobreviva a recargar; y que NADA salga del navegador sin la
 * casilla del expediente.
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

const navegador = await chromium.launch();
const errores = [];
async function abrir(conEndpoint = true) {
  const ctx = await navegador.newContext();
  const enviados = [];
  if (conEndpoint) await ctx.addInitScript((u) => { window.__CMB_ENDPOINT_PRUEBA = u; }, FALSO);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { errores.push(e.message); console.log('         [error de página] ' + e.message); });
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.route(/script\.google\.com/, async (r) => {
    enviados.push(JSON.parse(r.request().postData() || '{}'));
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await p.goto(BASE + '/agora.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#formInfo');
  return { p, ctx, enviados };
}

/* Llena la fase 1 con datos válidos de un adulto. */
async function llenarAdulto(p) {
  await p.fill('#f_nombres', 'Ana');
  await p.fill('#f_apellidoPaterno', 'Pérez');
  await p.fill('#f_correo', 'ana@ejemplo.com');
  await p.fill('#f_edad', '21');
  await p.selectOption('#f_estado', 'Puebla');
  await p.selectOption('#f_nivel', 'Licenciatura o ingeniería');
  await p.selectOption('#f_situacion', 'Estudiando');
  await p.fill('#f_institucion', 'BUAP');
  await p.fill('#f_carrera', 'Administración');
  await p.check('#f_sinExperiencia');
  await p.click('#agregarCert');
  await p.fill('#f_cert_nombre_0', 'Excel intermedio');
  await p.check('#chipsSectores input[value="Finanzas"]');
}

console.log('\nProceso Ágora');

await prueba('la ruta muestra las 10 fases de Ágora; solo Información inicial está disponible', async () => {
  const { p, ctx } = await abrir();
  const t = await p.textContent('#listaFases');
  for (const f of ['Perfil DISC', 'Análisis FODA', 'Crecimiento personal', 'Escenarios de vida', 'Ruta profesional', 'Plan de acción', 'Resumen ejecutivo'])
    cierto(t.includes(f), 'falta la fase ' + f);
  cierto(!t.includes('Descubrir') && !t.includes('Alinear'), 'no deben aparecer fases de DIANA');
  igual(await p.locator('#listaFases .paso').count(), 10);
  igual(await p.locator('#listaFases .paso:not([disabled])').count(), 1, 'solo una herramienta abierta');
  cierto(!t.includes('Alinear'), 'Alinear no se trabaja todavía');
  igual(await p.textContent('#avancePct'), '0%');
  await ctx.close();
});

await prueba('no se marca como completo con huecos, y dice qué falta', async () => {
  const { p, ctx, enviados } = await abrir();
  await p.fill('#f_nombres', 'Ana');
  await p.click('#btnCompletarInfo');
  const aviso = await p.textContent('#avisoInfo');
  cierto(aviso.includes('Te falta') && aviso.includes('correo') && aviso.includes('sector'), 'debe listar lo que falta');
  cierto(await p.$('[data-campo="correo"].falta'), 'debe marcar el campo');
  igual(await p.textContent('#avancePct'), '0%');
  igual(enviados.length, 0);
  await ctx.close();
});

await prueba('completo con datos válidos: avanza 1 de 10 y sobrevive a recargar', async () => {
  const { p, ctx } = await abrir();
  await llenarAdulto(p);
  await p.click('#btnCompletarInfo');
  await p.waitForFunction(() => document.getElementById('avisoInfo').textContent.includes('Listo'));
  igual(await p.textContent('#avanceTxt'), '1 de 10 fases completas');
  cierto((await p.textContent('#listaFases .paso[data-paso="informacion"] .estado')).includes('Completo'));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#formInfo');
  igual(await p.inputValue('#f_nombres'), 'Ana');
  igual(await p.inputValue('#f_cert_nombre_0'), 'Excel intermedio');
  cierto(await p.isChecked('#chipsSectores input[value="Finanzas"]'));
  igual(await p.textContent('#avancePct'), '10%');
  await ctx.close();
});

await prueba('lo que se escribe se guarda aunque no se complete (queda "En curso")', async () => {
  const { p, ctx } = await abrir();
  await p.fill('#f_nombres', 'Luis');
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#formInfo');
  igual(await p.inputValue('#f_nombres'), 'Luis');
  cierto((await p.textContent('#listaFases .paso[data-paso="informacion"] .estado')).includes('En curso'));
  await ctx.close();
});

await prueba('un menor de edad necesita el nombre y correo de su tutor', async () => {
  const { p, ctx } = await abrir();
  await llenarAdulto(p);
  cierto(!(await p.isVisible('#bloqueTutor')), 'el bloque del tutor no aparece para un adulto');
  await p.fill('#f_edad', '16');
  cierto(await p.isVisible('#bloqueTutor'), 'debe aparecer el bloque del tutor');
  await p.click('#btnCompletarInfo');
  cierto((await p.textContent('#avisoInfo')).includes('tutor'), 'debe pedir al tutor');
  await p.fill('#f_tutorNombre', 'María Pérez');
  await p.fill('#f_tutorCorreo', 'maria@ejemplo.com');
  await p.click('#btnCompletarInfo');
  await p.waitForFunction(() => document.getElementById('avisoInfo').textContent.includes('Listo'));
  await ctx.close();
});

await prueba('sin la casilla del expediente no se envía nada; con ella se envía al completar', async () => {
  let { p, ctx, enviados } = await abrir();
  await llenarAdulto(p);
  await p.click('#btnCompletarInfo');
  await p.waitForFunction(() => document.getElementById('avisoInfo').textContent.includes('Listo'));
  await p.waitForTimeout(200);
  igual(enviados.length, 0, 'sin casilla no debe salir nada');
  await p.check('#consiente');
  await p.click('#btnCompletarInfo');
  await p.waitForFunction(() => document.getElementById('avisoInfo').textContent.includes('expediente'));
  igual(enviados.length, 1);
  const e = enviados[0];
  igual(e.tipo, 'agora'); igual(e.paso, 'informacion'); igual(e.acepta, true);
  igual(e.nombre, 'Ana Pérez'); igual(e.correo, 'ana@ejemplo.com');
  igual(e.datos.institucion, 'BUAP'); igual(e.total, 10);
  cierto(e.completos.includes('informacion'));
  cierto(/^[0-9a-f]{24}$/.test(e.id));
  await ctx.close();
});

await prueba('un menor con la casilla del expediente necesita que el tutor esté de acuerdo', async () => {
  const { p, ctx, enviados } = await abrir();
  await p.check('#consiente');
  await llenarAdulto(p);
  await p.fill('#f_edad', '15');
  await p.fill('#f_tutorNombre', 'María Pérez');
  await p.fill('#f_tutorCorreo', 'maria@ejemplo.com');
  await p.click('#btnCompletarInfo');
  cierto((await p.textContent('#avisoInfo')).includes('esté de acuerdo'), 'debe pedir la autorización del tutor');
  igual(enviados.length, 0);
  await p.check('#f_tutorAutoriza');
  await p.click('#btnCompletarInfo');
  await p.waitForFunction(() => document.getElementById('avisoInfo').textContent.includes('Listo'));
  igual(enviados.length, 1);
  igual(enviados[0].datos.tutorAutoriza, true);
  await ctx.close();
});

await prueba('sin endpoint configurado funciona igual y no envía', async () => {
  const { p, ctx, enviados } = await abrir(false);
  await p.check('#consiente');
  await llenarAdulto(p);
  await p.click('#btnCompletarInfo');
  await p.waitForFunction(() => document.getElementById('avisoInfo').textContent.includes('Listo'));
  igual(enviados.length, 0);
  await ctx.close();
});

await prueba('los textos se escapan: un nombre con etiquetas no se vuelve HTML', async () => {
  const { p, ctx } = await abrir();
  await p.fill('#f_nombres', '<img src=x onerror=alert(1)>');
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#formInfo');
  igual(await p.inputValue('#f_nombres'), '<img src=x onerror=alert(1)>');
  igual(await p.evaluate(() => document.querySelectorAll('img[src="x"]').length), 0);
  await ctx.close();
});

await navegador.close();
servidor.close();

console.log('\nApps Script — expediente Ágora');
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
  return { post: (d) => ctx.doPost({ postData: { contents: JSON.stringify(d) } }), pestanas };
}
const BASE_D = { clave: 'cmb-autoconocimiento-2026', acepta: true, tipo: 'agora', paso: 'informacion', id: 'aaaaaaaaaaaaaaaaaaaaaaaa',
  nombre: 'Ana Pérez', correo: 'ana@ejemplo.com', completos: ['informacion'], total: 10, dispositivo: 'disp12345678',
  datos: { edad: '21', estado: 'Puebla', nivel: 'Licenciatura o ingeniería', situacion: 'Estudiando', institucion: 'BUAP', carrera: 'Administración',
    sinExperiencia: false, experiencia: [{ tipo: 'Prácticas profesionales', rol: 'Auxiliar contable', organizacion: 'Despacho X', desde: '2025-01', hasta: '', descripcion: 'Conciliaciones' }],
    certificaciones: [{ nombre: 'Excel intermedio', institucion: 'Club', anio: '2026' }], idiomas: [{ idioma: 'Español', nivel: 'Nativo' }],
    sectores: ['Finanzas', 'Otro'], sectorOtro: 'Energía', telefono: '+52 222 000 0000' } };
const col = (h, n) => h.filas[0].indexOf(n);

await prueba('escribe la fila de la fase y la del expediente, con avance y listas legibles', async () => {
  const { post, pestanas } = cargar();
  igual(post(BASE_D).ok, true);
  const inf = pestanas['Ágora · Información inicial'], ex = pestanas['Expediente Ágora'];
  const f = inf.filas[1];
  cierto(String(f[col(inf, 'Experiencia')]).includes('Auxiliar contable — Despacho X (Prácticas profesionales), 2025-01 a actual: Conciliaciones'));
  igual(f[col(inf, 'Sectores de interés')], 'Finanzas, Otro: Energía');
  igual(f[col(inf, 'Teléfono')], "'+52 222 000 0000", 'el teléfono no debe volverse fórmula');
  igual(ex.filas[1][col(ex, 'Avance')], '1 de 10');
  igual(ex.filas[1][col(ex, 'Fases completas')], 'Información inicial');
});

await prueba('reenviar actualiza las mismas filas', async () => {
  const { post, pestanas } = cargar();
  post(BASE_D); post(Object.assign({}, BASE_D, { nombre: 'Ana P. Ruiz' }));
  igual(pestanas['Expediente Ágora'].filas.length, 2);
  igual(pestanas['Ágora · Información inicial'].filas.length, 2);
});

await prueba('rechaza una fase desconocida, una edad inválida y a un menor sin autorización del tutor', async () => {
  const { post, pestanas } = cargar();
  igual(post(Object.assign({}, BASE_D, { paso: 'otro' })).error, 'paso');
  igual(post(Object.assign({}, BASE_D, { datos: Object.assign({}, BASE_D.datos, { edad: '7' }) })).error, 'edad');
  igual(post(Object.assign({}, BASE_D, { datos: Object.assign({}, BASE_D.datos, { edad: '16' }) })).error, 'falta autorización del tutor');
  igual(post(Object.assign({}, BASE_D, { datos: Object.assign({}, BASE_D.datos, { edad: '16', tutorAutoriza: true, tutorNombre: 'María' }) })).ok, true);
  igual(post(Object.assign({}, BASE_D, { acepta: false })).error, 'sin consentimiento');
  igual(pestanas['Expediente Ágora'].filas.length, 2, 'solo el envío válido escribe');
});

if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
