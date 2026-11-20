/**
 * Asistente de orientación vocacional con IA (agora/orientacion.js) en Ágora
 * y DIANA, la ruta del worker (worker-orientacion.js) y su pestaña en el
 * Apps Script.
 *
 *   node cuentas/pruebas/test_orientacion.mjs
 *
 * Lo que importa: el mapa de afinidades y el índice de coherencia salen de
 * reglas fijas con los resultados de la persona; a la IA solo le llega el
 * perfil sin nombre, correo ni tutor, y solo con la casilla; si la IA no está
 * activa la fase se completa igual; y el worker limpia lo que devuelve.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
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
const IA = 'https://cv-analisis.soportetimentesbrillantes.workers.dev/orientacion-vocacional';

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

const navegador = await chromium.launch();
const errores = [];
const vigilar = (p) => p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });

/* El resultado real del test vocacional (con sus afinidades por carrera), de
   una persona a la que le atraen los negocios y los números. */
const ctx0 = await navegador.newContext();
const p0 = await ctx0.newPage(); vigilar(p0);
await p0.route(/fonts\.g/, (r) => r.abort());
await p0.goto(BASE + '/test-vocacional.html', { waitUntil: 'domcontentloaded' });
await p0.evaluate(() => { const r = {}; VOCACIONAL.PREGUNTAS.forEach(q => { const [pa, g] = q.id.split('_'); r[q.id] = pa === 'i' ? ({ neg: 5, ing: 4, tec: 3 }[g] || 2) : pa === 'a' ? ({ numerica: 5, organizacion: 5, digital: 4 }[g] || 3) : ({ C: 5, I: 4, E: 4 }[g] || 2); });
  localStorage.setItem('cmb_vocacional', JSON.stringify({ v: 1, r, pagina: 7, fin: '2026-11-19T10:00:00Z', id: 'vvvvvvvvvvvvvvvvvvvvvvvv' })); });
await p0.reload({ waitUntil: 'domcontentloaded' });
await p0.waitForSelector('#vResultados:not([hidden])');
const VOC = await p0.evaluate(() => localStorage.getItem('cmb_vocacional'));
await ctx0.close();

const INFO = { nombres:'Ana', apellidoPaterno:'Pérez', apellidoMaterno:'Solís', correo:'ana@ejemplo.com', telefono:'222 123 4567', edad:'17', estado:'Puebla', ciudad:'Puebla',
  tutorNombre:'María Pérez', tutorCorreo:'maria@ejemplo.com', tutorParentesco:'Madre', tutorAutoriza:true,
  etapa:'Secundaria o bachillerato', nivel:'Preparatoria o bachillerato', situacion:'Estudiando', institucion:'Prepa 5', carrera:'', grado:'', anioEgreso:'',
  sinExperiencia:true, experiencia:[], sinCertificaciones:true, certificaciones:[], idiomas:[], sectores:['Finanzas'], sectorOtro:'', aspiracion:'Algo de finanzas; Ana quiere ahorrar para su casa' };
const DISC_R = { puntajes:{ D:{neto:31}, I:{neto:35}, S:{neto:63}, C:{neto:51} }, fecha:'2026-10-26', version:2, instrumento:'agora', escala:{min:0, max:82}, id:'r1' };
const FODA_R = { nombre:'Ana Pérez', F:'Organizada\nBuena con los números', D:'Me cuesta hablar en público', O:'Mi tía es contadora', A:'Pocas becas', paso:'Pedir informes', fecha:'2026-10-26', version:1 };
const fecha = '2026-11-19T10:00:00Z';
function estadoAgora() {
  return { version:1, id:'aaaaaaaaaaaaaaaaaaaaaaaa', consentimiento:{ acepta:true, fecha },
    pasos:{ informacion:{ completo:true, datos: INFO, enviadoEn: fecha }, foda:{ completo:true, enviadoEn: fecha },
      presupuesto:{ completo:true, datos:{ montos:{ vivienda:'6000', comida:'4000', transporte:'1500' }, lugar:'Puebla', cuando:'A 5 años' } },
      ruta:{ completo:true, datos:{ consideradas:['Finanzas', 'Arquitectura'], principal:'Finanzas', segunda:'Contaduría pública', porque:'Me gustan los números' } } } };
}
async function abrir(pagina, hash, agora, ia = 'ok') {
  const ctx = await navegador.newContext();
  const enviados = [], pedidosIA = [];
  await ctx.addInitScript(([a, d, f, v, u, iaUrl]) => {
    window.__CMB_ENDPOINT_PRUEBA = u; window.__CMB_ORIENTACION_PRUEBA = iaUrl;
    if (!localStorage.getItem('cmb_agora')) { localStorage.setItem('cmb_agora', JSON.stringify(a)); localStorage.setItem('cmb_disc', JSON.stringify(d)); localStorage.setItem('cmb_foda', JSON.stringify(f)); if (v) localStorage.setItem('cmb_vocacional', v); }
  }, [agora, DISC_R, FODA_R, agora.__sinVoc ? null : VOC, FALSO, IA]);
  const p = await ctx.newPage(); vigilar(p);
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.route(/script\.google\.com/, async (r) => { enviados.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await p.route(/workers\.dev/, async (r) => {
    const d = JSON.parse(r.request().postData() || '{}'); pedidosIA.push(d);
    if (ia === '404') return r.fulfill({ status: 404, body: 'Not found' });
    const ops = d.perfil.opciones_escenario;
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true,
      narrativa: 'Eres una persona organizada.\n\nTu índice es ' + d.perfil.coherencia.indice + '.',
      escenarios: ops.map((o, i) => ({ titulo: 'Camino ' + (i + 1), ruta: o, a1: 'Año 1 en ' + o, a3: 'Año 3', a5: 'Año 5', que_necesita: 'Practicar', senal: 'Si te aburre' })),
      padres: 'Su hija descubrió que le gustan los números.', orientador: { resumen: 'Perfil analítico.', fortalezas: ['Orden'], tensiones: ['Presupuesto alto'], preguntas: ['¿Qué te atrae de Finanzas?'] } }) });
  });
  await p.goto(BASE + '/' + pagina + '#' + hash, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#cuerpoFase');
  return { p, ctx, enviados, pedidosIA };
}
const completar = async (p) => { await p.click('#btnCompletar'); await p.waitForTimeout(150); };

console.log('\nÁgora');

await prueba('mapa de afinidades e índice de coherencia salen de los resultados, con el presupuesto contra el salario del sector', async () => {
  const { p, ctx } = await abrir('agora.html', 'orientacion', estadoAgora());
  await p.waitForSelector('#ori_mapa');
  const filas = await p.$$eval('#ori_mapa tr', t => t.slice(1).map(r => r.cells[0].textContent));
  cierto(filas[0].startsWith('Finanzas') && filas[0].includes('Ruta principal'), filas[0]);
  cierto(filas.some(f => f.startsWith('Contaduría pública')) && filas.some(f => f.includes('Test vocacional')), filas.join(' | '));
  await p.waitForFunction(() => document.getElementById('ori_coh').textContent.includes('Tu presupuesto'));
  const t = await p.textContent('#ori_coh');
  cierto(t.includes('Tus intereses') && t.includes('Tu estilo de trabajo') && t.includes('Lo que te motiva') && t.includes('entre tu perfil y Finanzas'), t.slice(0, 300));
  const v = Number(await p.textContent('#ori_indice'));
  cierto(v > 0 && v <= 100, 'índice ' + v);
  await ctx.close();
});

await prueba('la IA solo recibe el perfil sin identidad, y solo con la casilla; pinta las cinco salidas', async () => {
  const { p, ctx, pedidosIA } = await abrir('agora.html', 'orientacion', estadoAgora());
  await p.waitForFunction(() => document.getElementById('ori_coh').textContent.includes('Tu presupuesto'));
  cierto(await p.isDisabled('#ori_generar'), 'sin casilla no se puede');
  await p.check('#ori_acepto');
  await p.click('#ori_generar');
  await p.waitForSelector('#ori_narrativa');
  igual(pedidosIA.length, 1);
  const crudo = JSON.stringify(pedidosIA[0]);
  for (const x of ['Ana', 'Pérez', 'Solís', 'ana@ejemplo.com', 'maria@ejemplo.com', '4567']) cierto(!crudo.includes(x), 'se escapó ' + x);
  cierto(crudo.includes('[nombre]'), 'el nombre dentro del texto libre se cambia por [nombre]');
  const pf = pedidosIA[0].perfil;
  igual(pf.proceso, 'agora'); igual(pf.opciones_escenario[0], 'Finanzas'); igual(pf.opciones_escenario[1], 'Contaduría pública');
  cierto(pf.mapa_afinidades.length >= 3 && pf.coherencia.indice > 0 && pf.presupuesto_mensual === 11500);
  igual(await p.locator('#ori_escenarios .esc').count(), 3);
  cierto((await p.textContent('#ori_padres')).includes('Su hija') && (await p.textContent('#ori_orientador')).includes('¿Qué te atrae de Finanzas?'));
  await completar(p);
  await ctx.close();
});

await prueba('al completar va al expediente con las siete columnas, y entra al Resumen ejecutivo', async () => {
  const { p, ctx, enviados } = await abrir('agora.html', 'orientacion', estadoAgora());
  await p.waitForFunction(() => document.getElementById('ori_coh').textContent.includes('Tu presupuesto'));
  await p.check('#ori_acepto'); await p.click('#ori_generar'); await p.waitForSelector('#ori_narrativa');
  await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  const e = enviados.filter(x => x.paso === 'orientacion').pop();
  cierto(e && /^\d+ \((Alta|Media|Baja)\) · Finanzas$/.test(e.datos.hoja['Índice de coherencia']), e && e.datos.hoja['Índice de coherencia']);
  for (const k of ['Detalle del índice', 'Mapa de afinidades', 'Narrativa', 'Micro escenarios', 'Versión para padres', 'Versión para orientador']) cierto(e.datos.hoja[k], 'falta ' + k);
  // La sección del documento ejecutivo, en la fase Resumen.
  await p.goto(BASE + '/agora.html#resumen'); await p.reload(); await p.waitForSelector('#cuerpoFase');
  await p.waitForTimeout(400);
  const doc = await p.textContent('#cuerpoFase');
  cierto(doc.includes('Asistente de orientación vocacional') && doc.includes('Índice de coherencia') && doc.includes('Su hija') && doc.includes('Camino 1'), doc.slice(0, 600));
  await ctx.close();
});

await prueba('si la IA no está activa, avisa y la fase se completa con el mapa y el índice', async () => {
  const { p, ctx, enviados } = await abrir('agora.html', 'orientacion', estadoAgora(), '404');
  await p.waitForSelector('#ori_indice');
  await p.check('#ori_acepto'); await p.click('#ori_generar');
  await p.waitForFunction(() => document.getElementById('ori_estado').textContent.includes('todavía no está activa'));
  await completar(p);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  igual(enviados.filter(x => x.paso === 'orientacion').pop().datos.hoja['Narrativa'], 'Pendiente: sin texto de la IA');
  await ctx.close();
});

console.log('\nDIANA');
await prueba('en DIANA usa el rol objetivo; sin test vocacional el índice queda pendiente y lo dice', async () => {
  const a = estadoAgora(); a.__sinVoc = true;
  a.pasos = { informacion: { completo: true, datos: Object.assign({}, INFO, { etapa: 'Ya egresé', nivel: 'Licenciatura o ingeniería', situacion: 'Egresado', carrera: 'Contaduría pública' }), enviadoEn: fecha },
    foda: { completo: true, enviadoEn: fecha }, mapa: { completo: true, datos: { industria: 'finanzas', industriaNombre: 'Finanzas', rol: 'Analista Financiero', rol2: 'Auditor', brecha: 'x', revisados: [] } } };
  const { p, ctx, pedidosIA } = await abrir('diana.html', 'orientacion', a);
  await p.waitForSelector('#ori_mapa');
  cierto((await p.textContent('#cuerpoFase')).includes('test vocacional'), 'sugiere hacer el test');
  cierto((await p.textContent('#ori_coh')).includes('Pendiente'), 'con un solo componente no hay índice');
  await p.check('#ori_acepto'); await p.click('#ori_generar'); await p.waitForSelector('#ori_narrativa');
  const pf = pedidosIA[0].perfil;
  igual(pf.proceso, 'diana'); igual(pf.rol_objetivo.rol, 'Analista Financiero'); igual(pf.opciones_escenario[0], 'Analista Financiero en Finanzas');
  await ctx.close();
});

await navegador.close();
servidor.close();

/* ------------------------------ Worker ------------------------------ */
console.log('\nWorker /orientacion-vocacional');
const { manejarOrientacion } = await import(pathToFileURL(join(RAIZ, 'worker-orientacion.js')).href);
const env = { ANTHROPIC_API_KEY: 'llave-de-prueba' };
const pedir = (cuerpo, metodo = 'POST', ruta = '/orientacion-vocacional') => new Request('https://cv-analisis.example.workers.dev' + ruta,
  { method: metodo, headers: { 'content-type': 'application/json', Origin: 'https://soportetimentesbrillantes-afk.github.io' }, body: metodo === 'POST' ? JSON.stringify(cuerpo) : undefined });
const PERFIL = { proceso: 'agora', nombre: 'Ana Pérez', etapa: 'Bachillerato', aspiracion: 'Finanzas', opciones_escenario: ['Finanzas', 'Contaduría pública', 'Economía'], coherencia: { indice: 70 } };

await prueba('otras rutas siguen su camino; OPTIONS responde sin cuerpo', async () => {
  igual(await manejarOrientacion(pedir({}, 'POST', '/calificar-candidato'), env), null);
  igual((await manejarOrientacion(pedir(null, 'OPTIONS'), env)).status, 204);
});
await prueba('quita la identidad antes de llamar a la IA y limpia lo que devuelve', async () => {
  let enviado = null;
  globalThis.fetch = async (url, op) => { enviado = JSON.parse(op.body); return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Listo: {"narrativa":"Hola","escenarios":[{"titulo":"A","a1":"x","a3":"y","a5":"z"},{"titulo":"B","a1":"x"},{"titulo":"C","a1":"x"},{"titulo":"D","a1":"x"}],"padres":"P","orientador":{"resumen":"R","fortalezas":["f"],"tensiones":[],"preguntas":["q"],"extra":"no"}}' }] }), { status: 200 }); };
  const r = await manejarOrientacion(pedir({ perfil: PERFIL }), env);
  const d = await r.json();
  igual(d.ok, true);
  cierto(!enviado.messages[0].content.includes('Ana Pérez'), 'el nombre no llega a la IA');
  cierto(enviado.system.includes('No calcules ni cambies números'), 'instrucciones');
  igual(d.escenarios.length, 3); igual(d.escenarios[1].ruta, 'Contaduría pública', 'si la IA no dice la ruta, se usa la opción');
  igual(Object.keys(d.orientador).sort().join(','), 'fortalezas,preguntas,resumen,tensiones');
});
await prueba('rechaza peticiones sin perfil', async () => {
  igual((await manejarOrientacion(pedir({ perfil: null }), env)).status, 400);
});

/* ------------------------------ Apps Script ------------------------------ */
console.log('\nApps Script · pestaña Orientación vocacional');
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
await prueba('Ágora y DIANA escriben en la pestaña Orientación vocacional', async () => {
  const { post, pestanas } = cargar();
  for (const [tipo, total] of [['agora', 13], ['diana', 35]]) {
    const B = { clave: 'cmb-autoconocimiento-2026', acepta: true, tipo, id: (tipo === 'agora' ? 'a' : 'd').repeat(24), nombre: 'Ana Pérez', correo: 'ana@ejemplo.com', total, dispositivo: 'disp12345678' };
    igual(post(Object.assign({}, B, { paso: 'informacion', completos: ['informacion'], datos: { edad: '20' } })).ok, true);
    igual(post(Object.assign({}, B, { paso: 'orientacion', completos: ['informacion', 'orientacion'], datos: { hoja: { 'Índice de coherencia': '72 (Media) · Finanzas', 'Narrativa': 'Texto' } } })).ok, true);
  }
  const h = pestanas['Orientación vocacional'];
  igual(h.filas.length, 3);
  cierto(h.filas[0].includes('Versión para orientador'));
  igual(pestanas['Expediente DIANA'].filas[1][pestanas['Expediente DIANA'].filas[0].indexOf('Avance')], '2 de 35');
});

if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
