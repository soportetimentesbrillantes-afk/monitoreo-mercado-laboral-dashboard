/**
 * Pruebas de la bolsa de trabajo: vacantes.html (postulante), empleador.html
 * (empresa), el DISC de una postulación y su Apps Script
 * (cuentas/apps-script-bolsa.gs).
 *
 *   node cuentas/pruebas/test_bolsa.mjs
 *
 * El Apps Script corre de verdad en una hoja falsa en memoria; las páginas le
 * hablan por la misma ruta que en producción. La IA es simulada. Lo que
 * importa: sin clave no se ve nada y cada empresa ve solo lo suyo; la
 * postulación pide consentimiento y manda el correo del DISC; el CV llega a
 * la empresa sin nombre ni contacto; el DISC se muestra y la IA lo comenta,
 * pero NO entra a los duelos ni cambia el ranking; y el contacto se pide
 * aparte y queda registrado.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
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
await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + servidor.address().port;
const BOLSA_URL = 'https://bolsa.prueba/exec';
const IA = 'https://cmb-ia.soportetimentesbrillantes.workers.dev/comparar-cvs';

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

/* ---------------- Apps Script en una hoja falsa ---------------- */
const codigo = await readFile(join(RAIZ, 'cuentas/apps-script-bolsa.gs'), 'utf8');
function cargarScript() {
  const pestanas = {}, correos = [], props = {}, cache = {};
  const crear = (nombre) => {
    let filas = [];
    const h = { get filas() { return filas; },
      getName: () => nombre, getLastRow: () => filas.length, getLastColumn: () => Math.max(0, ...filas.map(f => f.length)),
      appendRow: (f) => filas.push(f.slice()), clear: () => { filas = []; }, setFrozenRows: () => {},
      getRange: (r, c, nr = 1, nc = 1) => ({
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (filas[r - 1 + i] || [])[c - 1 + j] ?? '')),
        getValue: () => (filas[r - 1] || [])[c - 1] ?? '',
        setValues: (v) => v.forEach((fila, i) => { filas[r - 1 + i] = filas[r - 1 + i] || []; fila.forEach((x, j) => { filas[r - 1 + i][c - 1 + j] = x; }); }),
        setValue: (x) => { filas[r - 1] = filas[r - 1] || []; filas[r - 1][c - 1] = x; },
        setFontWeight: () => {} }) };
    pestanas[nombre] = h; return h;
  };
  const libro = { getSheetByName: (n) => pestanas[n] || null, insertSheet: (n) => crear(n) };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => libro, openById: () => libro },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] ?? null, put: (k, v) => { cache[k] = v; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => t }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: (o) => correos.push(o) },
    Utilities: {
      getUuid: () => randomUUID(), formatDate: (d) => new Date(d).toISOString().slice(0, 10),
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, s) => [...createHash('sha256').update(String(s), 'utf8').digest()].map(b => b > 127 ? b - 256 : b),
    },
    JSON, Date, String, Object, Math, Array, Number, isFinite, parseInt, isNaN, encodeURIComponent,
  };
  vm.createContext(ctx); vm.runInContext(codigo, ctx);
  ctx.instalar();
  const post = (d) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(d) } }));
  return { ctx, pestanas, correos, post, alta: (n) => ctx.crearEmpresa_(n, 'rh@' + n.toLowerCase().replace(/\W/g, '') + '.mx') };
}
const col = (h, n) => h.filas[0].indexOf(n);

/* Una vacante completa: 3 categorías que suman 100, con sus seis niveles. */
const NIV = ['Excepcional', 'Muy bien', 'Bien', 'Suficiente', 'Poco', 'Nada'];
const CONFIG = {
  vacante: { puesto: 'Auxiliar contable', contexto: 'Despacho en Querétaro.', fichaId: '', instrucciones: 'Lee cada CV.\nCalifica con los niveles.',
    categorias: [['c1', 'Contabilidad', 40], ['c2', 'Impuestos', 30], ['c3', 'Herramientas', 30]].map(([id, nombre, puntos]) => ({ id, nombre, puntos, porque: '', niveles: NIV.slice() })) },
  ats: { obligatorias: 'contab*', deseables: 'excel\nsat', umbral: 0, finalistas: 6 }
};
const CVS = [
  ['Laura Méndez Ruiz', 'Laura Méndez Ruiz\nlaura@correo.mx · 442 111 2233\nContadora pública. Jefa de contabilidad en despacho: cierres mensuales, declaraciones ante el SAT, Excel avanzado y CONTPAQi durante cuatro años.'],
  ['Pedro Gómez Salas', 'Pedro Gómez Salas\npedro@correo.mx\nAuxiliar contable en tienda de abarrotes. Registro de facturas, conciliaciones bancarias y Excel intermedio durante dos años.'],
  ['Rosa Díaz Luna', 'Rosa Díaz Luna\nrosa@correo.mx\nEstudiante de contabilidad. Prácticas en despacho: captura de pólizas y apoyo en declaraciones del SAT durante seis meses.'],
];
const CALIDAD = { 'Jefa de contabilidad': 90, 'Auxiliar contable en tienda': 60, 'Estudiante de contabilidad': 40 };
const calidad = (t) => Object.entries(CALIDAD).find(([k]) => t.includes(k))?.[1] ?? 10;
function duelo(d) {
  const qa = calidad(d.a), qb = calidad(d.b);
  const cats = d.categorias.map((c) => ({ id: c.id, a: Math.round(c.puntos * qa / 100), b: Math.round(c.puntos * qb / 100), evidencia_a: 'cita', evidencia_b: 'cita', comentario: '' }));
  const ta = cats.reduce((s, c) => s + c.a, 0), tb = cats.reduce((s, c) => s + c.b, 0);
  return { ok: true, categorias: cats, total_a: ta, total_b: tb, ganador: ta > tb ? 'A' : 'B', razon: 'Razón.', alertas: [] };
}
const DISC_ROSA = { puntajes: { D: { neto: 70 }, I: { neto: 30 }, S: { neto: 20 }, C: { neto: 25 } }, dominante: 'D', segundo: 'I', lectura: 'dominante claro', instrumento: 'agora', escala: { min: 0, max: 82 } };

/* Arma una empresa con una vacante abierta y tres postulaciones (Rosa con DISC). */
function escenario() {
  const s = cargarScript(), emp = s.alta('Despacho Ruiz');
  const v = s.post({ accion: 'empresa-vacante', clave: emp.clave, vacante: { puesto: 'Auxiliar contable', estado: 'abierta', publico: { ciudad: 'Querétaro', modalidad: 'Presencial', descripcion: 'Registro contable.' }, config: CONFIG } });
  const tokens = CVS.map(([nombre, cv]) => s.post({ accion: 'postular', vacanteId: v.id, nombre, correo: nombre.split(' ')[0].toLowerCase() + '@correo.mx', telefono: '442 000 0000', cv, acepta: true }).token);
  s.post({ accion: 'postulacion-disc', token: tokens[2], disc: DISC_ROSA });
  return { s, emp, vacanteId: v.id, tokens };
}

/* ---------------- Página ---------------- */
const navegador = await chromium.launch();
const errores = [];
async function abrir(s, ruta, { ls } = {}) {
  const ctx = await navegador.newContext();
  const pedidos = [], ia = [];
  await ctx.addInitScript(([u, ia, extra]) => {
    window.__CMB_BOLSA_PRUEBA = u; window.__CMB_COMPARAR_PRUEBA = ia;
    if (extra && !sessionStorage.getItem('ini')) { sessionStorage.setItem('ini', '1'); for (const [k, v] of Object.entries(extra)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }
  }, [BOLSA_URL, IA, ls || null]);
  await ctx.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic|script\.google|www\.clubmentesbrillantes)/, (r) => r.abort());
  await ctx.route(/bolsa\.prueba/, async (r) => {
    const d = JSON.parse(r.request().postData() || '{}'); pedidos.push(d);
    await r.fulfill({ status: 200, contentType: 'application/json', body: s.ctx.doPost({ postData: { contents: JSON.stringify(d) } }) });
  });
  await ctx.route(/workers\.dev/, async (r) => {
    const d = JSON.parse(r.request().postData() || '{}'); ia.push(d);
    if (d.tipo === 'reporte') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, resumen: 'CV-01 encabeza.', finalistas: [{ id: 'CV-03', fortalezas: ['Prácticas'], riesgos: [], validar: [], estilo: 'Su estilo directo encaja con cierres con fecha.' }], comparacion: '', nota_estilo: 'El estilo no predice el desempeño.', advertencias: [] }) });
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(duelo(d)) });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });
  await p.goto(BASE + '/' + ruta, { waitUntil: 'domcontentloaded' });
  return { p, ctx, pedidos, ia };
}

console.log('\nApps Script de la bolsa');

await prueba('sin la clave de la empresa no se ve ni se escribe nada; 20 fallos bloquean', async () => {
  const s = cargarScript(); s.alta('Hotel Centro');
  igual(s.post({ accion: 'empresa-entrar', clave: 'no-es-la-clave' }).error, 'clave');
  igual(s.post({ accion: 'empresa-vacante', clave: 'otra-cosa-x', vacante: { puesto: 'X' } }).error, 'clave');
  cierto(!JSON.stringify(s.pestanas['Empresas'].filas).includes(s.alta('Otra').clave), 'la clave no queda en la hoja');
  for (let i = 0; i < 20; i++) s.post({ accion: 'empresa-entrar', clave: 'mal-' + i + '-xxxxx' });
  const e = s.alta('Tercera');
  igual(s.post({ accion: 'empresa-entrar', clave: e.clave }).error, 'bloqueado');
});

await prueba('cada empresa ve y edita solo sus vacantes; al público solo llegan las abiertas, sin la rúbrica', async () => {
  const { s, emp, vacanteId } = escenario();
  const otra = s.alta('Agencia Norte');
  igual(s.post({ accion: 'empresa-entrar', clave: otra.clave }).vacantes.length, 0);
  igual(s.post({ accion: 'empresa-vacante', clave: otra.clave, vacante: { id: vacanteId, puesto: 'Pisada', config: {} } }).error, 'vacante');
  igual(s.post({ accion: 'empresa-postulaciones', clave: otra.clave, vacanteId }).error, 'vacante');
  const pub = s.post({ accion: 'vacantes' });
  igual(pub.vacantes.length, 1);
  cierto(!JSON.stringify(pub).includes('Contabilidad') && !JSON.stringify(pub).includes('contab*'), 'sin rúbrica ni filtro');
  s.post({ accion: 'empresa-vacante', clave: emp.clave, vacante: { id: vacanteId, puesto: 'Auxiliar contable', estado: 'pausada', publico: {}, config: CONFIG } });
  igual(s.post({ accion: 'vacantes' }).vacantes.length, 0, 'pausada no aparece');
  igual(s.post({ accion: 'postular', vacanteId, nombre: 'Ana Paz', correo: 'ana@x.mx', cv: 'x'.repeat(100), acepta: true }).error, 'cerrada');
});

await prueba('postularse pide consentimiento, manda el correo del DISC y no duplica a quien se postula dos veces', async () => {
  const { s, vacanteId } = escenario();
  igual(s.post({ accion: 'postular', vacanteId, nombre: 'Ana Paz', correo: 'ana@x.mx', cv: 'x'.repeat(100) }).error, 'consentimiento');
  const antes = s.correos.length;
  const r = s.post({ accion: 'postular', vacanteId, nombre: '=HYPERLINK("x")', correo: 'Ana@X.mx', cv: 'Contadora con experiencia '.repeat(5), acepta: true });
  igual(r.correoDisc, 'enviado'); igual(s.correos.length, antes + 1);
  cierto(s.correos.at(-1).body.includes('disc-agora.html?postulacion=' + r.token), 'enlace con el token');
  const h = s.pestanas['Postulaciones'];
  cierto(String(h.filas.at(-1)[col(h, 'Nombre')]).startsWith("'="), 'nada entra como fórmula');
  const r2 = s.post({ accion: 'postular', vacanteId, nombre: 'Ana Paz', correo: 'ana@x.mx', cv: 'CV corregido con más experiencia '.repeat(5), acepta: true });
  igual(r2.actualizada, true); igual(r2.token, r.token);
  igual(h.filas.length, 1 + 4, 'tres del escenario y una de Ana');
});

await prueba('la empresa recibe el CV y el DISC, pero no el correo ni el teléfono; el contacto se pide aparte y queda registrado', async () => {
  const { s, emp, vacanteId } = escenario();
  igual(s.post({ accion: 'postulacion-disc', token: 'f'.repeat(40), disc: DISC_ROSA }).error, 'token');
  const r = s.post({ accion: 'empresa-postulaciones', clave: emp.clave, vacanteId });
  igual(r.postulaciones.length, 3);
  const crudo = JSON.stringify(r.postulaciones.map(p => Object.assign({}, p, { cv: '' })));
  cierto(!crudo.includes('@correo.mx') && !crudo.includes('442 000'), 'sin contacto');
  const rosa = r.postulaciones.find(p => p.nombre.startsWith('Rosa'));
  igual(rosa.disc.dominante, 'D'); igual(r.postulaciones.filter(p => p.disc).length, 1);
  const otra = s.alta('Ajena');
  igual(s.post({ accion: 'empresa-contacto', clave: otra.clave, postId: rosa.id }).error, 'postulacion');
  const c = s.post({ accion: 'empresa-contacto', clave: emp.clave, postId: rosa.id });
  igual(c.correo, 'rosa@correo.mx');
  const h = s.pestanas['Postulaciones'];
  cierto(String(h.filas.find(f => f[0] === rosa.id)[col(h, 'Contacto visto')]).length > 5, 'queda registrado');
});

console.log('\nPáginas');

await prueba('vacantes.html: lista, detalle y postulación con consentimiento', async () => {
  const { s } = escenario();
  const { p, ctx, pedidos } = await abrir(s, 'vacantes.html');
  await p.waitForSelector('.vacante');
  cierto((await p.textContent('.vacante')).includes('Auxiliar contable'));
  await p.click('.vacante');
  await p.waitForSelector('#formPost');
  await p.fill('#p_nombre', 'Mario Soto Vega'); await p.fill('#p_correo', 'mario@correo.mx');
  await p.fill('#p_pegar', 'Mario Soto Vega\nContador con cinco años en despacho: cierres, IVA e ISR ante el SAT, Excel avanzado y CONTPAQi.');
  await p.click('#p_enviar');
  await p.waitForFunction(() => document.getElementById('p_msg').textContent.includes('aceptar'));
  igual(pedidos.filter(d => d.accion === 'postular').length, 0, 'sin la casilla no se manda');
  await p.check('#p_acepto'); await p.click('#p_enviar');
  await p.waitForSelector('#listo');
  cierto((await p.textContent('#listo')).includes('mario@correo.mx'));
  const href = await p.getAttribute('#listo a.btn.pri', 'href');
  cierto(/^disc-agora\.html\?postulacion=[a-f0-9]{40}$/.test(href), href);
  igual(s.correos.at(-1).to, 'mario@correo.mx');
  await ctx.close();
});

await prueba('el DISC desde el correo dice para qué vacante es y se manda a la postulación al tocar el botón', async () => {
  const { s, tokens } = escenario();
  const DISC_LOCAL = { puntajes: { D: { neto: 20 }, I: { neto: 66 }, S: { neto: 40 }, C: { neto: 30 } }, fecha: '2026-11-27', version: 2, instrumento: 'agora', escala: { min: 0, max: 82 }, id: 'd1', versionClave: 'x', respuestas: { a: {}, b: { marcados: [] }, c: {}, d: {}, e: {} } };
  const { p, ctx, pedidos } = await abrir(s, 'disc-agora.html?postulacion=' + tokens[0], { ls: { cmb_disc: DISC_LOCAL } });
  await p.waitForFunction(() => (document.getElementById('avisoPostulacion') || {}).textContent?.includes('Auxiliar contable'));
  await p.click('#btnVerGuardado');
  await p.waitForSelector('#btnEnviarPost');
  igual(pedidos.filter(d => d.accion === 'postulacion-disc').length, 0, 'mostrar no manda');
  await p.click('#btnEnviarPost');
  await p.waitForFunction(() => document.getElementById('msgEnviarPost').textContent.includes('Listo'));
  const h = s.pestanas['Postulaciones'], f = h.filas.find(x => x[col(h, 'Token DISC')] === tokens[0]);
  igual(f[col(h, 'DISC')], 'hecho');
  igual(JSON.parse(f[col(h, 'DISC resultado')]).dominante, 'I');
  await ctx.close();
});

await prueba('empleador.html: entra con su clave, recibe los CVs sin nombre con su DISC, y el DISC no llega a los duelos', async () => {
  const { s, emp } = escenario();
  const { p, ctx, ia } = await abrir(s, 'empleador.html');
  await p.waitForSelector('#formClave');
  igual(await p.isHidden('nav.pasos a[data-v="cvs"]'), true, 'sin vacante abierta no hay pasos');
  await p.fill('#e_clave', emp.clave); await p.click('#formClave button[type="submit"]');
  await p.waitForSelector('[data-abrir-vac]');
  cierto((await p.textContent('#v-empresa')).includes('Despacho Ruiz'));
  await p.click('[data-abrir-vac]');
  await p.waitForSelector('#bandaPublicar');
  igual(await p.inputValue('#f_puesto'), 'Auxiliar contable', 'la rúbrica viene de la hoja');
  await p.reload({ waitUntil: 'domcontentloaded' });   // la clave de la sesión entra sola
  await p.waitForSelector('[data-abrir-vac]'); await p.click('[data-abrir-vac]');
  await p.evaluate(() => { location.hash = '#cvs'; });
  await p.waitForFunction(() => document.querySelectorAll('#v-cvs .cv').length === 3);
  const cvs = await p.textContent('#v-cvs');
  cierto(!cvs.includes('Laura') && !cvs.includes('laura@correo'), 'sin nombre ni correo');
  cierto(cvs.includes('Dominancia'), 'DISC de Rosa');
  cierto((await p.textContent('#cvsModo')).includes('1 con Perfil DISC') || (await p.textContent('#cvsModo')).includes('1</strong> con Perfil DISC'), await p.textContent('#cvsModo'));
  await p.evaluate(() => { location.hash = '#ats'; });
  await p.waitForSelector('#v-ats table');
  cierto((await p.textContent('#v-ats thead')).includes('Estilo (informativo)'));
  await p.evaluate(() => { location.hash = '#comparacion'; });
  await p.check('#c_acepto'); await p.click('#btnComparar');
  await p.waitForFunction(() => (document.getElementById('msgIA') || {}).textContent?.includes('Listo'), null, { timeout: 20000 });
  const duelos = ia.filter(d => d.tipo === 'duelo');
  igual(duelos.length, 6, 'tres pares en los dos órdenes');
  cierto(!JSON.stringify(duelos).match(/Dominancia|DISC|Rosa|Laura/), 'ni DISC ni nombres en los duelos');
  await p.evaluate(() => { location.hash = '#reporte'; });
  await p.waitForSelector('#tablaRanking');
  igual(await p.textContent('#tablaRanking tbody tr td:nth-child(2)'), 'CV-01', 'el ranking lo deciden los duelos');
  cierto((await p.textContent('#tablaRanking thead')).includes('Estilo DISC (informativo)'));
  await p.click('#btnReporte');
  await p.waitForSelector('#repTexto');
  const rep = ia.find(d => d.tipo === 'reporte');
  cierto(rep.resumen.includes('ESTILO DE TRABAJO') && rep.resumen.includes('SOLO INFORMATIVO') && rep.resumen.includes('CV-03: estilo Dominancia'), rep.resumen.slice(-400));
  cierto((await p.textContent('#v-reporte')).includes('Su estilo directo encaja'), 'el comentario de estilo se ve');
  await p.click('[data-contacto]');
  await p.waitForFunction(() => document.getElementById('v-reporte').textContent.includes('@correo.mx'));
  await ctx.close();
});

await prueba('empleador.html: una vacante nueva se publica y aparece en la bolsa', async () => {
  const s = cargarScript(), emp = s.alta('Hotel Centro');
  const { p, ctx } = await abrir(s, 'empleador.html');
  await p.waitForSelector('#formClave');
  await p.fill('#e_clave', emp.clave); await p.click('#formClave button[type="submit"]');
  await p.waitForSelector('#btnNuevaVac'); await p.click('#btnNuevaVac');
  await p.waitForSelector('#bandaPublicar');
  await p.fill('#f_puesto', 'Recepcionista'); await p.fill('#p_ciudad', 'León');
  await p.fill('#p_req', 'Mujer de 20 a 30 años, buena presentación');
  await p.click('#btnPublicar');
  await p.waitForFunction(() => document.getElementById('msgPub').textContent.includes('Publicada'));
  const pub = s.post({ accion: 'vacantes' }).vacantes;
  igual(pub.length, 1); igual(pub[0].puesto, 'Recepcionista'); igual(pub[0].ciudad, 'León');
  cierto((await p.textContent('#bandaPublicar')).includes('art. 133'), 'avisa de requisitos discriminatorios');
  const id = pub[0].id;
  cierto(await p.evaluate((id) => !!localStorage.getItem('cmb_empleador_' + id), id), 'el estado pasó a la llave de la vacante');
  await ctx.close();
});

await navegador.close();
servidor.close();
if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
