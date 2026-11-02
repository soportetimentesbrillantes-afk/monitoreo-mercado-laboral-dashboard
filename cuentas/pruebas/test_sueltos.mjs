/**
 * DISC y FODA sueltos: hechos fuera de un proceso, cuentan en Ágora y DIANA.
 *
 *   node cuentas/pruebas/test_sueltos.mjs
 *
 * (Encabezado copiado de test_diana.mjs.) Pruebas de diana.html (proceso DIANA: Descubrir e Iniciar) y de su parte
 * del Apps Script.
 *
 *   node cuentas/pruebas/test_diana.mjs
 *
 * Lo que importa: que DIANA muestre sus 5 fases y 34 pasos con las mismas
 * herramientas que Ágora y sin repetir lo ya hecho; que Crecimiento personal
 * pida aquí valores, intereses y motivaciones; que los pasos con mentor queden
 * "Falta mentor" hasta anotar la revisión, y que esa revisión llegue a la
 * hoja; que las herramientas de Iniciar (mapa, tendencias, formación, marca)
 * se armen con lo anterior y con el monitoreo, y no se completen con huecos;
 * que los reportes por fase resuman lo que se hizo; y que nada salga sin la
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

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }


const INFO = { nombres:'Luis', apellidoPaterno:'Ramos', apellidoMaterno:'', correo:'luis@ejemplo.com', telefono:'', edad:'23', estado:'Jalisco', ciudad:'Guadalajara',
  tutorNombre:'', tutorCorreo:'', tutorParentesco:'', tutorAutoriza:false, etapa:'Ya egresé', nivel:'Licenciatura o ingeniería', situacion:'Egresado',
  institucion:'UdeG', carrera:'Contaduría', grado:'', anioEgreso:'2025', sinExperiencia:true, experiencia:[],
  sinCertificaciones:true, certificaciones:[], idiomas:[{ idioma:'Español', nivel:'Nativo' }], sectores:['Finanzas'], sectorOtro:'', aspiracion:'' };
const DISC_R = { puntajes:{ D:{neto:52}, I:{neto:33}, S:{neto:14}, C:{neto:77} }, fecha:'2026-11-01T10:00:00Z', version:2, instrumento:'agora', escala:{min:0, max:82}, id:'suelto1' };

const navegador = await chromium.launch();
const errores = [];
async function contexto(inicial) {
  const ctx = await navegador.newContext();
  const enviados = [];
  await ctx.addInitScript(([ini, u]) => {
    window.__CMB_ENDPOINT_PRUEBA = u;
    if (!sessionStorage.getItem('ini')) { sessionStorage.setItem('ini', '1'); for (const [k, v] of Object.entries(ini)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }
  }, [inicial, FALSO]);
  await ctx.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await ctx.route(/script\.google\.com/, async (r) => { enviados.push(JSON.parse(r.request().postData() || '{}')); await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  const p = await ctx.newPage();
  p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });
  return { ctx, p, enviados };
}
const estadoDe = (p, id) => p.textContent(`#listaFases .paso[data-paso="${id}"] .estado`);
const conInfo = (acepta) => ({ cmb_agora: { version:1, id:'cccccccccccccccccccccccc', consentimiento:{ acepta, fecha: acepta ? '2026-11-01T10:00:00Z' : null },
  pasos: { informacion: { completo: true, datos: INFO, enviadoEn: '2026-11-01T10:00:00Z' } } } });

console.log('\nDISC y FODA sueltos');

await prueba('FODA suelto: se completa en foda.html y cuenta en Ágora y en DIANA', async () => {
  const { ctx, p } = await contexto({});
  await p.goto(BASE + '/foda.html', { waitUntil: 'domcontentloaded' });
  cierto(await p.isVisible('#btnCompletarAgora'), 'el botón aparece también suelto');
  await p.fill('#F', 'Analítico'); await p.fill('#D', 'Hablar en público');
  await p.click('#btnCompletarAgora');
  cierto((await p.textContent('#avisoAgora')).includes('Cuadros') || (await p.textContent('#avisoAgora')).includes('Te falta'), 'pide los cuatro cuadros');
  await p.fill('#O', 'Demanda en finanzas'); await p.fill('#A', 'Competencia');
  await p.click('#btnCompletarAgora');
  const t = await p.textContent('#avisoAgora');
  cierto(t.includes('ya cuenta como hecho') && t.includes('DIANA'), t);
  for (const pag of ['agora.html', 'diana.html']) {
    await p.goto(BASE + '/' + pag, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('#listaFases .paso');
    cierto((await estadoDe(p, 'foda')).includes('Completo'), 'FODA completo en ' + pag);
  }
  await ctx.close();
});

await prueba('sin tocar "Completar", un FODA a medias sigue en curso', async () => {
  const { ctx, p } = await contexto({ cmb_foda: { F:'a', D:'b', O:'c', A:'d', paso:'', nombre:'', fecha:'2026-11-01', version:1 } });
  await p.goto(BASE + '/agora.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#listaFases .paso');
  cierto((await estadoDe(p, 'foda')).includes('En curso'));
  await ctx.close();
});

await prueba('DISC suelto: cuenta en DIANA y llega al expediente cuando hay casilla e información inicial', async () => {
  const { ctx, p, enviados } = await contexto(Object.assign({ cmb_disc: DISC_R }, conInfo(true)));
  await p.goto(BASE + '/diana.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#listaFases .paso');
  cierto((await estadoDe(p, 'disc')).includes('Completo'));
  await p.waitForTimeout(600);
  const e = enviados.find(x => x.paso === 'disc');
  cierto(e, 'se manda el DISC');
  igual(e.tipo, 'diana'); igual(e.datos.resultadoId, 'suelto1'); igual(e.datos.lectura, 'dominante claro');
  // Al volver a abrir no se manda otra vez.
  const antes = enviados.length;
  await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(600);
  igual(enviados.filter(x => x.paso === 'disc').length, 1, 'una sola vez');
  cierto(enviados.length === antes, 'nada nuevo');
  await ctx.close();
});

await prueba('sin la casilla del expediente, el DISC suelto cuenta pero no sale', async () => {
  const { ctx, p, enviados } = await contexto(Object.assign({ cmb_disc: DISC_R }, conInfo(false)));
  await p.goto(BASE + '/agora.html', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#listaFases .paso');
  cierto((await estadoDe(p, 'disc')).includes('Completo'));
  await p.waitForTimeout(500);
  igual(enviados.length, 0);
  await ctx.close();
});

await prueba('el DISC suelto ofrece seguir con Ágora o DIANA; dentro del proceso no', async () => {
  const { ctx, p } = await contexto({ cmb_disc: DISC_R });
  await p.goto(BASE + '/disc-agora.html', { waitUntil: 'domcontentloaded' });
  await p.click('#btnVerGuardado');
  await p.waitForSelector('#sigueProceso');
  cierto((await p.textContent('#sigueProceso')).includes('Proceso DIANA'));
  await p.goto(BASE + '/agora.html#disc', { waitUntil: 'domcontentloaded' });
  const fr = await (await p.waitForSelector('#marcoHerramienta')).contentFrame();
  await fr.waitForSelector('#btnVerGuardado'); await fr.click('#btnVerGuardado');
  await fr.waitForSelector('#resultado .card');
  igual(await fr.$('#sigueProceso'), null);
  await ctx.close();
});

await prueba('la página principal enlaza el DISC y el FODA', async () => {
  const html = await readFile(join(RAIZ, 'index.html'), 'utf8');
  cierto(html.includes('href="disc-agora.html">Perfil DISC') && html.includes('href="foda.html">Análisis FODA'));
});

await navegador.close();
servidor.close();
if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
