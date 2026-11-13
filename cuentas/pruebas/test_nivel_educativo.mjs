/**
 * Nivel educativo de las vacantes: Etapa 4 (etapa4_sector_json.py) y su
 * tarjeta en comparativo.html.
 *
 *   node cuentas/pruebas/test_nivel_educativo.mjs
 *
 * Lo que importa: cada vacante con descripción cae en el nivel MÁS BAJO que
 * menciona; el salario por nivel solo sale con 5 o más datos; sin
 * descripciones el campo es null; y en el dashboard el filtro de nivel cambia
 * idiomas y carreras, y no aparece mientras ningún sector tenga el dato.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync, execFileSync } from 'node:child_process';
import { extname, join } from 'node:path';
import { tmpdir } from 'node:os';

const requerir = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = requerir('playwright')); }
catch {
  try { ({ chromium } = requerir(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
  catch { console.error('Falta Playwright. Instálalo con:  npm install -g playwright'); process.exit(2); }
}
const RAIZ = new URL('../../', import.meta.url).pathname;
let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

/* ------------------------------ Etapa 4 ------------------------------ */
console.log('\nEtapa 4 · nivel educativo');
const dir = await mkdtemp(join(tmpdir(), 'nivel-'));
const VAC = [
  ['Ayudante general', 'Escolaridad secundaria terminada. Disponibilidad de horario.', 9000],
  ['Almacenista', 'Bachillerato concluido, deseable licenciatura. Manejo de montacargas.', 11000],
  ['Cajero', 'Preparatoria terminada, buena actitud y servicio al cliente.', 10000],
  ['Técnico de mantenimiento', 'Carrera técnica en electricidad o TSU en mantenimiento industrial. Inglés básico.', 15000],
  ['Analista de datos', 'Licenciatura en Actuaría, Economía o Ingeniería en Sistemas. Inglés avanzado.', 28000],
  ['Ingeniero de procesos', 'Ingeniero Industrial titulado, inglés intermedio. Deseable maestría.', 32000],
  ['Gerente de finanzas', 'Maestría en Finanzas o MBA indispensable. Inglés avanzado.', 60000],
  ['Recepcionista', 'Atención a clientes, manejo de conmutador y agenda de citas.', 9500],
];
const filas = [];
for (let r = 0; r < 3; r++) VAC.forEach(([t, d, s], i) => filas.push([String(r * 10 + i), t, 'E' + i, 'Querétaro', '', '', s, s, '2026-11-09', 'adzuna', 'x', 'u', 'h' + String(r * 10 + i).padStart(16, '0'), d]));
const csv = (conDesc) => 'id_interno,titulo_puesto,empresa,ubicacion,habilidades_tecnicas,habilidades_blandas,salario_min,salario_max,fecha_publicacion,fuente,sector,url_original,hash_contenido' + (conDesc ? ',descripcion' : '') + '\n' +
  filas.map(f => (conDesc ? f : f.slice(0, -1)).map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n') + '\n';
function correr(conDesc) {
  const ent = join(dir, conDesc ? 'con.csv' : 'sin.csv'), sal = join(dir, conDesc ? 'con.json' : 'sin.json');
  return writeFile(ent, csv(conDesc)).then(() => {
    execFileSync('python3', [join(RAIZ, 'herramientas/etapa4_sector_json.py'), '--verified', ent, '--sector', 'Ventas', '--key', 'ventas',
      '--categorias', join(RAIZ, 'herramientas/categorias_ventas.json'), '--habilidades', join(RAIZ, 'herramientas/habilidades_ventas.json'),
      '--hoy', '2026-11-10', '--out', sal], { stdio: 'pipe' });
    return readFile(sal, 'utf8').then(JSON.parse);
  });
}
const CON = await correr(true);
const nivel = (clave) => CON.nivel_educativo.niveles.find(n => n.clave === clave);

await prueba('cuenta el nivel más bajo mencionado y deja "no lo especifica" aparte', async () => {
  igual(CON.nivel_educativo.niveles.map(n => n.clave + ':' + n.vacantes).join(' '),
    'secundaria:3 bachillerato:6 tecnico:3 licenciatura:6 posgrado:3 no_especifica:3');
  igual(nivel('bachillerato').pct, 25);
});
await prueba('salario mediano solo con 5 o más salarios', async () => {
  igual(nivel('secundaria').salario_mediano_mensual_mxn, null);
  igual(nivel('bachillerato').salario_mediano_mensual_mxn, 10500);
  igual(nivel('licenciatura').salario_mediano_mensual_mxn, 30000);
});
await prueba('idiomas y carreras por nivel, con % sobre las vacantes de ese nivel', async () => {
  igual(nivel('posgrado').idiomas[0].idioma, 'Inglés'); igual(nivel('posgrado').idiomas[0].pct, 100);
  igual(nivel('tecnico').carreras[0].carrera, 'Carrera técnica');
  igual(nivel('secundaria').idiomas.length, 0);
});
await prueba('sin la columna descripcion, nivel_educativo es null', async () => {
  igual((await correr(false)).nivel_educativo, null);
});
await prueba('herramientas/ y la copia de la raíz son el mismo archivo', async () => {
  igual(await readFile(join(RAIZ, 'etapa4_sector_json.py'), 'utf8'), await readFile(join(RAIZ, 'herramientas/etapa4_sector_json.py'), 'utf8'));
});

/* ------------------------------ Dashboard ------------------------------ */
console.log('\ncomparativo.html · nivel educativo');
const TIPOS = { '.html': 'text/html', '.json': 'application/json', '.svg': 'image/svg+xml', '.js': 'text/javascript' };
let inyectar = false;
const servidor = createServer(async (req, res) => {
  try {
    const u = req.url.split('?')[0];
    if (inyectar && /sector_ventas\.json$/.test(u)) {
      const d = JSON.parse(await readFile(join(RAIZ, u), 'utf8'));
      for (const k of ['vacantes_con_descripcion', 'idiomas', 'carreras', 'nivel_educativo']) d[k] = CON[k];
      res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify(d));
    }
    const f = join(RAIZ, u);
    res.writeHead(200, { 'content-type': TIPOS[extname(f)] || 'text/plain' }); res.end(await readFile(f));
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => servidor.listen(0, r));
const BASE = 'http://127.0.0.1:' + servidor.address().port;
const navegador = await chromium.launch();
const errores = [];
async function abrir() {
  const ctx = await navegador.newContext();
  await ctx.route(/fonts\.g/, (r) => r.abort());
  await ctx.route(/cdnjs/, (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.Chart=function(){this.destroy=function(){}};' }));
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { errores.push(e.message); console.log('         [error de página] ' + e.message); });
  await p.goto(BASE + '/comparativo.html');
  await p.waitForSelector('#loadingOverlay.hidden', { state: 'attached', timeout: 20000 });
  return { p, ctx };
}

await prueba('sin corridas con descripción: un solo aviso y sin filtro', async () => {
  inyectar = false;
  const { p, ctx } = await abrir();
  cierto((await p.textContent('#tablaNivel')).startsWith('Dato pendiente'), 'aviso de dato pendiente');
  igual(await p.$eval('.filtro-nivel', e => e.hidden), true);
  await ctx.close();
});

await prueba('con dato: tabla por nivel, salarios y filtro que cambia idiomas y carreras', async () => {
  inyectar = true;
  const { p, ctx } = await abrir();
  const fila = await p.$$eval('#tablaNivel tbody tr', t => t.map(r => r.textContent).find(x => x.includes('Ventas')));
  cierto(fila.includes('24') && fila.includes('25 %'), fila);
  const sal = await p.$$eval('#tablaNivelSalario tbody tr', t => t.map(r => r.textContent).find(x => x.includes('Ventas')));
  cierto(sal.includes('$10,500') && sal.includes('$30,000'), sal);
  igual(await p.$eval('.filtro-nivel', e => e.hidden), false);
  await p.selectOption('#filtroNivel', 'posgrado');
  const idi = await p.$$eval('#tablaIdiomas tbody tr', t => t.map(r => r.textContent).find(x => x.includes('Ventas')));
  cierto(idi.includes('3') && idi.includes('100 %'), idi);
  cierto((await p.textContent('#notaFiltroNivel')).includes('Posgrado'));
  await p.selectOption('#filtroNivel', '');
  const todos = await p.$$eval('#tablaIdiomas tbody tr', t => t.map(r => r.textContent).find(x => x.includes('Ventas')));
  cierto(todos.includes('24'), todos);
  await ctx.close();
});

await navegador.close();
servidor.close();
if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
