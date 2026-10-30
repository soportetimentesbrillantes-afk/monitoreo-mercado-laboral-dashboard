/**
 * Pruebas de agora.html (proceso Ágora) y de su parte del Apps Script.
 *
 *   node cuentas/pruebas/test_proceso_agora.mjs
 *
 * Lo que importa: que la ruta muestre las 11 fases con su
 * estado; que solo se puedan abrir las herramientas listas; que el paso 1 no
 * se dé por completo con huecos y diga qué falta; que un menor necesite a su
 * tutor; que todo sobreviva a recargar; que el DISC y el FODA funcionen dentro
 * del proceso igual que solos, sin su encabezado ni su tarjeta de compartir;
 * y que NADA salga del navegador sin la casilla del expediente, ni antes de
 * completar la información inicial.
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
  await p.check('#chipsEtapa input[value="Universidad"]');
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

await prueba('la ruta muestra las 11 fases (las 10 de Ágora y el presupuesto) y todas se pueden abrir', async () => {
  const { p, ctx } = await abrir();
  const t = await p.textContent('#listaFases');
  for (const f of ['Perfil DISC', 'Análisis FODA', 'Crecimiento personal', 'Escenarios de vida', 'Ruta profesional', 'Plan de acción', 'Resumen ejecutivo'])
    cierto(t.includes(f), 'falta la fase ' + f);
  cierto(!t.includes('Descubrir') && !t.includes('Alinear'), 'no deben aparecer fases de DIANA');
  igual(await p.locator('#listaFases .paso').count(), 11);
  igual(await p.locator('#listaFases .paso:not([disabled])').count(), 11, 'las once fases');

  cierto(!t.includes('Alinear'), 'Alinear no se trabaja todavía');
  igual(await p.textContent('#avancePct'), '0%');
  await ctx.close();
});

await prueba('no se marca como completo con huecos, y dice qué falta', async () => {
  const { p, ctx, enviados } = await abrir();
  await p.fill('#f_nombres', 'Ana');
  await p.click('#btnCompletarInfo');
  const aviso = await p.textContent('#avisoInfo');
  cierto(aviso.includes('Te falta') && aviso.includes('correo') && aviso.includes('sector') && aviso.includes('etapa'), 'debe listar lo que falta');
  cierto(await p.$('[data-campo="correo"].falta'), 'debe marcar el campo');
  igual(await p.textContent('#avancePct'), '0%');
  igual(enviados.length, 0);
  await ctx.close();
});

await prueba('fase 1: pide la etapa, ofrece Negocios y "No lo sé aún", que no se combina con otros', async () => {
  const { p, ctx, enviados } = await abrir();
  for (const e of ['Secundaria o bachillerato', 'Universidad', 'Ya egresé']) cierto(await p.$(`#chipsEtapa input[value="${e}"]`), 'falta la etapa ' + e);
  cierto(await p.$('#chipsSectores input[value="Negocios"]') && await p.$('#chipsSectores input[value="No lo sé aún"]'));
  await p.check('#chipsSectores input[value="Finanzas"]');
  await p.check('#chipsSectores input[value="No lo sé aún"]');
  cierto(!(await p.isChecked('#chipsSectores input[value="Finanzas"]')), '"No lo sé aún" quita los demás');
  await p.check('#chipsSectores input[value="Negocios"]');
  cierto(!(await p.isChecked('#chipsSectores input[value="No lo sé aún"]')), 'elegir un sector quita "No lo sé aún"');
  await p.check('#consiente');
  await llenarAdulto(p);
  await p.click('#btnCompletarInfo');
  await p.waitForFunction(() => document.getElementById('avisoInfo').textContent.includes('Listo'));
  igual(enviados[0].datos.etapa, 'Universidad');
  cierto(enviados[0].datos.sectores.includes('Negocios'));
  await ctx.close();
});

await prueba('completo con datos válidos: avanza 1 de 11 y sobrevive a recargar', async () => {
  const { p, ctx } = await abrir();
  await llenarAdulto(p);
  await p.click('#btnCompletarInfo');
  await p.waitForFunction(() => document.getElementById('avisoInfo').textContent.includes('Listo'));
  igual(await p.textContent('#avanceTxt'), '1 de 11 fases completas');
  cierto((await p.textContent('#listaFases .paso[data-paso="informacion"] .estado')).includes('Completo'));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await marco(p, 'disc-agora.html');   // con la fase 1 lista, abre la siguiente
  await p.click('#listaFases .paso[data-paso="informacion"]');
  await p.waitForSelector('#formInfo');
  igual(await p.inputValue('#f_nombres'), 'Ana');
  igual(await p.inputValue('#f_cert_nombre_0'), 'Excel intermedio');
  cierto(await p.isChecked('#chipsSectores input[value="Finanzas"]'));
  igual(await p.textContent('#avancePct'), '9%');
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
  igual(e.datos.institucion, 'BUAP'); igual(e.total, 11);
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


/* ---------------- Fases 2 y 3: las herramientas dentro del marco ---------------- */

// Mismas respuestas que test_agora.mjs: azul (C) 77, rojo (D) 52, amarillo (I) 33, verde (S) 14.
const RESPUESTAS = {
  a: {2:4, 7:4, 9:4, 14:4, 3:3, 4:3, 12:3, 15:3, 5:2, 6:2, 10:2, 13:2, 1:1, 8:1, 11:1, 16:1},
  b: { marcados: [17, 20, 23, 27, 30, 18, 22], estrella: 17 },
  c: Object.fromEntries([41,42,43,44,45,46,47].map(n => [n, [4, 3, 2, 1]])),
  d: Object.fromEntries([48,49,50,51,52,53,54,55,56,57,58,59].map(n => [n, 'izq'])),
  e: Object.assign({},
    Object.fromEntries([61,65,67,73].map(n => [n, 'TA'])),
    Object.fromEntries([60,63,71,74].map(n => [n, 'DA'])),
    Object.fromEntries([64,66,69,75].map(n => [n, 'I'])),
    Object.fromEntries([62,68,70,72].map(n => [n, 'TD'])))
};

async function marco(p, archivo) {
  await p.waitForFunction((a) => { const f = document.getElementById('marcoHerramienta'); return f && f.getAttribute('src').startsWith(a); }, archivo);
  const f = await (await p.$('#marcoHerramienta')).contentFrame();
  await f.waitForLoadState('domcontentloaded');
  await f.waitForFunction(() => document.documentElement.classList.contains('embebido'));
  return f;
}
async function abrirFase(p, id, archivo) {
  await p.click(`#listaFases .paso[data-paso="${id}"]`);
  return marco(p, archivo);
}
async function contestarDisc(f, r) {
  await f.evaluate(() => empezar());
  await f.evaluate((r) => { R = r; SECCIONES.forEach(s => PINTAR[s]()); despues(); calcular(); }, r);
}
const estadoDe = (p, id) => p.textContent(`#listaFases .paso[data-paso="${id}"] .estado`);

await prueba('fase 2: el cuestionario de Ágora se abre dentro del proceso, sin su encabezado ni la versión corta', async () => {
  const { p, ctx } = await abrir();
  const f = await abrirFase(p, 'disc', 'disc-agora.html');
  cierto((await p.textContent('.cabecera-paso')).includes('Fase 2 de 11'));
  cierto(!(await f.isVisible('.topbar')) && !(await f.isVisible('body > header')), 'el encabezado de la página suelta no aparece');
  cierto(await f.isVisible('#intro'), 'se ve el inicio del cuestionario');
  cierto(!(await f.isVisible('#intro a[href="disc.html"]')), 'no ofrece la versión de 24 bloques');
  cierto(await f.isVisible('#intro .solo-agora'), 'trae el texto del proceso');
  await p.waitForFunction(() => parseInt(document.getElementById('marcoHerramienta').style.height, 10) > 300);
  const alto = await p.evaluate(() => parseInt(document.getElementById('marcoHerramienta').style.height, 10));
  const contenido = await f.evaluate(() => Math.ceil(document.querySelector('main').getBoundingClientRect().bottom));
  cierto(Math.abs(alto - contenido) <= 4, `el marco mide lo que su contenido (${alto} vs ${contenido})`);
  await ctx.close();
});

await prueba('fase 2: al terminar el DISC la fase queda completa, sin tarjeta de compartir suelta, y lleva al FODA', async () => {
  const { p, ctx, enviados } = await abrir();
  const f = await abrirFase(p, 'disc', 'disc-agora.html');
  await f.evaluate(() => empezar());
  await f.click('#filasA .op[data-n="1"][data-v="4"]');
  await p.waitForFunction(() => document.querySelector('#listaFases .paso[data-paso="disc"] .estado').textContent.includes('En curso'));
  await contestarDisc(f, RESPUESTAS);
  await p.waitForFunction(() => document.querySelector('#listaFases .paso[data-paso="disc"] .estado').textContent.includes('Completo'));
  igual(await p.textContent('#avanceTxt'), '1 de 11 fases completas');
  cierto((await p.textContent('#avisoFase')).includes('Análisis FODA'), 'dice cuál sigue');
  cierto(await f.isVisible('#resultado'), 'muestra el resultado');
  cierto(!(await f.isVisible('#compartirDisc .compartir')), 'la tarjeta suelta de compartir no aparece: el expediente es de Ágora');
  await f.waitForFunction(() => !document.getElementById('cursosSugeridos').textContent.includes('Buscando'));
  const reforzar = await f.textContent('#cursosCard');
  cierto(reforzar.includes('Puedes reforzar con algunos de los siguientes cursos que se encuentran en nuestro catálogo') || reforzar.includes('Hoy el catálogo del Club no tiene'), 'va directo a los cursos');
  cierto(!reforzar.includes('Estas no son carencias'));
  igual(enviados.length, 0, 'nada sale sin la casilla del expediente');
  await f.click('#btnSeguirAgora');
  await marco(p, 'foda.html');
  cierto(await p.evaluate(() => pasoActual === 'foda'));
  await p.reload({ waitUntil: 'domcontentloaded' });
  cierto((await estadoDe(p, 'disc')).includes('Completo'), 'sobrevive a recargar');
  await ctx.close();
});

await prueba('fase 2 y 3 con expediente: esperan a la fase 1 y se envían al completarla', async () => {
  const { p, ctx, enviados } = await abrir();
  await p.check('#consiente');
  const f = await abrirFase(p, 'disc', 'disc-agora.html');
  await contestarDisc(f, RESPUESTAS);
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('información inicial'));
  igual(enviados.length, 0, 'antes de la fase 1 no se manda el DISC');
  await p.click('#listaFases .paso[data-paso="informacion"]');
  await p.waitForSelector('#formInfo');
  await llenarAdulto(p);
  await p.click('#btnCompletarInfo');
  await p.waitForFunction(() => document.getElementById('avisoInfo').textContent.includes('expediente'));
  await p.waitForTimeout(200);
  igual(enviados.length, 2, 'la fase 1 y después el DISC pendiente');
  igual(enviados[0].paso, 'informacion');
  const e = enviados[1];
  igual(e.tipo, 'agora'); igual(e.paso, 'disc'); igual(e.id, enviados[0].id, 'mismo expediente');
  igual(e.datos.instrumento, 'agora'); igual(e.datos.puntajes.C.neto, 77); igual(e.datos.puntajes.S.neto, 14);
  igual(e.datos.lectura, 'dominante claro');
  cierto(e.datos.respuestas && e.datos.respuestas.b.estrella === 17, 'van las respuestas crudas');
  cierto(e.completos.includes('informacion') && e.completos.includes('disc'));
  // Con la fase 1 lista, el FODA se manda en cuanto se completa.
  const g = await abrirFase(p, 'foda', 'foda.html');
  igual(await g.inputValue('#nombre'), 'Ana Pérez', 'el nombre viene de la fase 1');
  for (const [k, t] of [['F', 'Excel intermedio'], ['D', 'Me pongo nervioso'], ['O', 'Logística contrata'], ['A', 'Piden experiencia']]) await g.fill('#' + k, t);
  await g.fill('#siguientePaso', 'Ponerle cifras a mi CV');
  await g.click('#btnCompletarAgora');
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('expediente'));
  igual(enviados.length, 3);
  igual(enviados[2].paso, 'foda'); igual(enviados[2].datos.F, 'Excel intermedio'); igual(enviados[2].datos.paso, 'Ponerle cifras a mi CV');
  igual(enviados[2].datos.estiloDisc, 'C');
  igual(await p.textContent('#avanceTxt'), '3 de 11 fases completas');
  await ctx.close();
});

await prueba('FODA: textos de Debilidades y Amenazas, botón Seguir y cuestionario para papás en bachillerato', async () => {
  const { p, ctx } = await abrir();
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('cmb_agora')) || {version:1, pasos:{}, consentimiento:{acepta:false}}; s.pasos.informacion = {datos: {etapa: 'Secundaria o bachillerato', tutorNombre: 'María', tutorCorreo: 'maria@ejemplo.com', nombres: 'Ana'}}; localStorage.setItem('cmb_agora', JSON.stringify(s)); });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#listaFases .paso');
  const g = await abrirFase(p, 'foda', 'foda.html');
  cierto((await g.textContent('#cuadD .que')).includes('prefieres que los demás lo hagan por ti'));
  cierto((await g.textContent('#cuadA .que')).includes('Aquello externo que puede afectar tu presente'));
  for (const [k, t] of [['F', 'Excel'], ['D', 'Hablar en público'], ['O', 'Cursos'], ['A', 'Competencia']]) await g.fill('#' + k, t);
  await g.click('#btnCompletarAgora');
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  cierto((await p.textContent('#avisoFase')).includes('OV1 4x4 papás'), 'ofrece el formulario 1 después del FODA');
  cierto(await p.$('#avisoFase a[href*="1FAIpQLSc-_mHyCq0BnKyetn36ACfCkKI4mUEyGKp9d7sCw_CEDr7DWw"]'));
  cierto((await p.getAttribute('#avisoFase [data-papas] a.secondary', 'href')).startsWith('mailto:maria@ejemplo.com?'));
  await g.click('#btnSeguirAgora');
  await p.waitForFunction(() => pasoActual === 'estilo');
  await ctx.close();
});

await prueba('el cuestionario para papás no se ofrece a quien está en la universidad', async () => {
  const { p, ctx } = await abrir();
  await llenarAdulto(p);
  const g = await abrirFase(p, 'foda', 'foda.html');
  for (const [k, t] of [['F', 'Excel'], ['D', 'Inglés'], ['O', 'Cursos'], ['A', 'Competencia']]) await g.fill('#' + k, t);
  await g.click('#btnCompletarAgora');
  await p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('Fase completa'));
  cierto(!(await p.$('#avisoFase [data-papas]')));
  await ctx.close();
});

await prueba('DISC: cada palabra de la sección c explica qué significa al pasar el mouse', async () => {
  const { p, ctx } = await abrir();
  const f = await abrirFase(p, 'disc', 'disc-agora.html');
  await f.evaluate(() => { empezar(); irA(2); });
  igual(await f.locator('#renglonesC .con-ayuda[data-ayuda]').count(), 28);
  const ayuda = f.locator('#renglonesC .con-ayuda').first();
  await ayuda.hover();
  await f.waitForTimeout(300);
  igual(await ayuda.evaluate(el => getComputedStyle(el, '::after').opacity), '1', 'se ve la explicación');
  cierto((await ayuda.getAttribute('data-ayuda')).length > 10);
  await ctx.close();
});

await prueba('fase 3: no se completa con cuadros vacíos, y borrar regresa la fase a pendiente', async () => {
  const { p, ctx } = await abrir();
  const g = await abrirFase(p, 'foda', 'foda.html');
  cierto(!(await g.isVisible('.topbar')), 'sin encabezado suelto');
  cierto(!(await g.isVisible('a.secondary[href="informe.html"]')), 'sin enlace al informe suelto');
  await g.fill('#F', 'Excel');
  await g.fill('#D', 'Inglés');
  await g.click('#btnCompletarAgora');
  const aviso = await g.textContent('#avisoAgora');
  cierto(aviso.includes('Oportunidades') && aviso.includes('Amenazas') && !aviso.includes('Fortalezas'), 'dice cuáles faltan');
  await p.waitForFunction(() => document.querySelector('#listaFases .paso[data-paso="foda"] .estado').textContent.includes('En curso'));
  await g.fill('#O', 'Cursos del Club');
  await g.fill('#A', 'Competencia');
  await g.click('#btnCompletarAgora');
  await p.waitForFunction(() => document.querySelector('#listaFases .paso[data-paso="foda"] .estado').textContent.includes('Completo'));
  await g.click('#btnBorrar'); await g.click('#btnBorrar');
  await p.waitForFunction(() => document.querySelector('#listaFases .paso[data-paso="foda"] .estado').textContent.includes('Pendiente'));
  await ctx.close();
});

await prueba('agora.html#disc abre directo la fase 2; las páginas sueltas siguen igual', async () => {
  const ctx = await navegador.newContext();
  const p = await ctx.newPage();
  p.on('pageerror', (e) => { errores.push(e.message); console.log('         [error de página] ' + e.message); });
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.goto(BASE + '/agora.html#disc', { waitUntil: 'domcontentloaded' });
  await marco(p, 'disc-agora.html');
  const q = await ctx.newPage();
  await q.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await q.goto(BASE + '/disc-agora.html', { waitUntil: 'domcontentloaded' });
  cierto(await q.isVisible('.topbar') && await q.isVisible('#intro a[href="disc.html"]'), 'sola conserva su encabezado y la versión corta');
  cierto(!(await q.isVisible('#intro .solo-agora')), 'sola no muestra el texto del proceso');
  await q.goto(BASE + '/foda.html', { waitUntil: 'domcontentloaded' });
  cierto(!(await q.isVisible('#terminarAgora')), 'sola no tiene el botón de completar fase');
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
  nombre: 'Ana Pérez', correo: 'ana@ejemplo.com', completos: ['informacion'], total: 11, dispositivo: 'disp12345678',
  datos: { edad: '21', estado: 'Puebla', nivel: 'Licenciatura o ingeniería', situacion: 'Estudiando', institucion: 'BUAP', carrera: 'Administración',
    sinExperiencia: false, experiencia: [{ tipo: 'Prácticas profesionales', rol: 'Auxiliar contable', organizacion: 'Despacho X', desde: '2025-01', hasta: '', descripcion: 'Conciliaciones' }],
    certificaciones: [{ nombre: 'Excel intermedio', institucion: 'Club', anio: '2026' }], idiomas: [{ idioma: 'Español', nivel: 'Nativo' }],
    sectores: ['Finanzas', 'Otro'], sectorOtro: 'Energía', telefono: '+52 222 000 0000' } };
const col = (h, n) => h.filas[0].indexOf(n);

await prueba('escribe la fila de la fase y la del expediente, con avance y listas legibles', async () => {
  const { post, pestanas } = cargar();
  igual(post(BASE_D).ok, true);
  const inf = pestanas['Información inicial'], ex = pestanas['Expediente Ágora'];
  const f = inf.filas[1];
  cierto(String(f[col(inf, 'Experiencia')]).includes('Auxiliar contable — Despacho X (Prácticas profesionales), 2025-01 a actual: Conciliaciones'));
  igual(f[col(inf, 'Sectores de interés')], 'Finanzas, Otro: Energía');
  igual(f[col(inf, 'Teléfono')], "'+52 222 000 0000", 'el teléfono no debe volverse fórmula');
  igual(ex.filas[1][col(ex, 'Avance')], '1 de 11');
  igual(ex.filas[1][col(ex, 'Fases completas')], 'Información inicial');
});

await prueba('reenviar actualiza las mismas filas', async () => {
  const { post, pestanas } = cargar();
  post(BASE_D); post(Object.assign({}, BASE_D, { nombre: 'Ana P. Ruiz' }));
  igual(pestanas['Expediente Ágora'].filas.length, 2);
  igual(pestanas['Información inicial'].filas.length, 2);
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


const DISC_D = { puntajes: { D: { neto: 52 }, I: { neto: 33 }, S: { neto: 14 }, C: { neto: 77 } }, instrumento: 'agora',
  escala: { min: 0, max: 82 }, respuestas: { b: { estrella: 17 } }, versionClave: 'agora-prueba', fecha: '2026-10-26', lectura: 'dominante claro' };

await prueba('Perfil DISC y FODA: solo con expediente, en sus pestañas de siempre y con el mismo ID', async () => {
  const { post, pestanas } = cargar();
  const disc = Object.assign({}, BASE_D, { paso: 'disc', completos: ['informacion', 'disc'], datos: DISC_D });
  igual(post(disc).error, 'falta información inicial', 'sin fase 1 no se acepta');
  cierto(!pestanas['DISC'], 'no escribe nada');
  post(BASE_D);
  igual(post(disc).ok, true);
  const h = pestanas['DISC'];
  igual(h.filas.length, 2);
  igual(h.filas[1][col(h, 'ID de envío')], BASE_D.id);
  igual(h.filas[1][col(h, 'Instrumento')], 'Ágora (5 secciones)');
  igual(h.filas[1][col(h, 'Estilo dominante')], 'Cumplimiento');
  const ex = pestanas['Expediente Ágora'];
  igual(ex.filas[1][col(ex, 'Avance')], '2 de 11');
  igual(ex.filas[1][col(ex, 'Fases completas')], 'Información inicial, Perfil DISC');
  post(disc);
  igual(h.filas.length, 2, 'rehacerlo actualiza la misma fila');
  const foda = Object.assign({}, BASE_D, { paso: 'foda', completos: ['informacion', 'disc', 'foda'],
    datos: { F: 'Excel\nInglés B1', D: 'Nervios', O: 'Cursos', A: '=Competencia', paso: 'Ponerle cifras a mi CV', estiloDisc: 'C' } });
  igual(post(foda).ok, true);
  const fo = pestanas['FODA'];
  igual(fo.filas[1][col(fo, 'Fortalezas')], '• Excel\n• Inglés B1');
  igual(fo.filas[1][col(fo, 'Siguiente paso')], 'Ponerle cifras a mi CV');
  igual(ex.filas[1][col(ex, 'Última fase guardada')], 'Análisis FODA');
  igual(post(Object.assign({}, disc, { datos: Object.assign({}, DISC_D, { puntajes: { D: { neto: 'x' } } }) })).error, 'puntajes', 'valida los puntajes');
});

if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
