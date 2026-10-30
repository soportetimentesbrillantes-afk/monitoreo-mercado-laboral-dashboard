/**
 * Pruebas de diana.html (proceso DIANA: Descubrir e Iniciar) y de su parte
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

/* Luis, 23, egresado de Contaduría, le interesa Finanzas. DISC: C (77) y D (52). */
const INFO = { nombres:'Luis', apellidoPaterno:'Ramos', apellidoMaterno:'', correo:'luis@ejemplo.com', telefono:'', edad:'23', estado:'Jalisco', ciudad:'Guadalajara',
  tutorNombre:'', tutorCorreo:'', tutorParentesco:'', tutorAutoriza:false, etapa:'Ya egresé', nivel:'Licenciatura o ingeniería', situacion:'Egresado',
  institucion:'UdeG', carrera:'Contaduría', grado:'', anioEgreso:'2025', sinExperiencia:false,
  experiencia:[{ tipo:'Prácticas profesionales', rol:'Auxiliar contable', organizacion:'Despacho Pérez', desde:'2024-01', hasta:'2024-12', descripcion:'Conciliaciones' }],
  sinCertificaciones:true, certificaciones:[], idiomas:[{ idioma:'Español', nivel:'Nativo' }], sectores:['Finanzas'], sectorOtro:'', aspiracion:'Finanzas corporativas' };
const DISC_R = { puntajes:{ D:{neto:52}, I:{neto:33}, S:{neto:14}, C:{neto:77} }, fecha:'2026-10-26', version:2, instrumento:'agora', escala:{min:0, max:82}, id:'r1' };
const FODA_R = { nombre:'Luis Ramos', F:'Analítico', D:'Hablar en público', O:'Demanda en finanzas', A:'Competencia', paso:'Actualizar mi CV', fecha:'2026-10-26', version:1 };
function estado({ consiente = true, extra = {} } = {}) {
  return { agora: { version:1, id:'bbbbbbbbbbbbbbbbbbbbbbbb', consentimiento:{ acepta: consiente, fecha: consiente ? '2026-10-29T10:00:00Z' : null },
    pasos: Object.assign({ informacion:{ completo:true, datos: INFO, enviadoEn:'2026-10-29T10:00:00Z' }, foda:{ completo:true, enviadoEn:'2026-10-29T10:00:00Z' } }, extra) },
    disc: DISC_R, foda: FODA_R };
}

const navegador = await chromium.launch();
const errores = [];
async function abrir(hash, opciones = {}, pagina = 'diana.html') {
  const ctx = await navegador.newContext();
  const enviados = [];
  const e = estado(opciones);
  await ctx.addInitScript(([e, u]) => {
    window.__CMB_ENDPOINT_PRUEBA = u;
    if (!localStorage.getItem('cmb_agora')) {
      localStorage.setItem('cmb_agora', JSON.stringify(e.agora));
      localStorage.setItem('cmb_disc', JSON.stringify(e.disc));
      localStorage.setItem('cmb_foda', JSON.stringify(e.foda));
    }
  }, [e, FALSO]);
  const p = await ctx.newPage();
  p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.route(/script\.google\.com/, async (r) => {
    enviados.push(JSON.parse(r.request().postData() || '{}'));
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  await p.goto(BASE + '/' + pagina + '#' + hash, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#cuerpoFase, #marcoHerramienta, #formInfo');
  return { p, ctx, enviados };
}
const ir = async (p, id) => { await p.evaluate((id) => abrir(id), id); await p.waitForTimeout(200); };
const marcar = async (p, grupo, n) => { const c = await p.$$(`#cuerpoFase input[data-grupo="${grupo}"]`); for (const x of c.slice(0, n)) await x.check(); };
const completar = async (p) => { await p.click('#btnCompletar'); await p.waitForTimeout(150); };
const aviso = (p) => p.textContent('#avisoFase');
const listo = (p) => p.waitForFunction(() => document.getElementById('avisoFase').textContent.includes('completo.'));
const estadoDe = (p, id) => p.textContent(`#listaFases .paso[data-paso="${id}"] .estado`);
const ultimo = (env, paso) => env.filter(x => x.paso === paso).pop();

async function llenarMapa(p){
  await ir(p, 'mapa');
  await p.waitForFunction(() => document.querySelectorAll('#f_map_rol option').length > 3);
  await p.selectOption('#f_map_rol', 'Analista Financiero');
  await p.fill('#f_map_brecha', 'Tengo la carrera y prácticas; me falta Excel avanzado y experiencia formal.');
  await completar(p); await listo(p);
}

console.log('\nProceso DIANA');

await prueba('cinco fases y 34 pasos, todos abiertos; lo hecho en Ágora cuenta', async () => {
  const { p, ctx } = await abrir('');
  const fases = await p.evaluate(() => [...document.querySelectorAll('#listaFases .fase')].map(f => [f.dataset.fase, f.querySelectorAll('.paso').length]));
  igual(JSON.stringify(fases), JSON.stringify([['descubrir', 8], ['iniciar', 6], ['alinear', 7], ['nutrir', 6], ['acompanar', 7]]));
  igual(await p.locator('#listaFases .paso:not([disabled])').count(), 34, 'los 34 pasos tienen herramienta');
  cierto((await estadoDe(p, 'informacion')).includes('Completo') && (await estadoDe(p, 'disc')).includes('Completo'), 'la información y el DISC de Ágora cuentan');
  igual(await p.textContent('#avanceTxt'), '3 de 34 pasos completos');
  cierto((await p.textContent('.cabecera-paso')).includes('DIANA · Descubrir · Paso 4 de 34'), 'abre el primer paso sin hacer');
  await ctx.close();
});

await prueba('Crecimiento personal: en DIANA pide valores, intereses y motivaciones aunque ya estuviera completo en Ágora', async () => {
  const cre = { completo: true, datos: { esperas: ['Tomar decisiones'], esperaOtra: '', areas: ['a', 'b'], prioridad: 'a', dom: 'C' } };
  const { p, ctx, enviados } = await abrir('crecimiento', { extra: { crecimiento: cre } });
  cierto((await estadoDe(p, 'crecimiento')).includes('En curso'), 'sin valores no está completo en DIANA');
  await completar(p);
  const a = await aviso(p);
  cierto(a.includes('valores') && a.includes('interesa') && a.includes('motiva'), a);
  await marcar(p, 'valores', 5);
  await p.locator('#cuerpoFase input[data-grupo="valores"]').nth(5).click({ force: true });
  igual(await p.locator('#cuerpoFase input[data-grupo="valores"]:checked').count(), 5, 'máximo 5 valores');
  for (const x of ['hacer', 'investigar', 'crear', 'ayudar', 'dirigir', 'organizar']) await p.check(`input[name="int_${x}"][value="${x === 'investigar' ? 5 : 2}"]`);
  for (const x of ['ingreso', 'estabilidad', 'crecer', 'aprender', 'impacto', 'autonomia', 'reconocimiento', 'flexibilidad', 'equipo', 'reto']) await p.check(`input[name="mot_${x}"][value="${x === 'crecer' ? 5 : 3}"]`);
  await marcar(p, 'areas', 2);
  await p.selectOption('#f_cre_prioridad', { index: 1 });
  await completar(p); await listo(p);
  cierto((await estadoDe(p, 'crecimiento')).includes('Completo'));
  const e = ultimo(enviados, 'crecimiento');
  igual(e.tipo, 'diana'); igual(e.total, 34);
  igual(e.datos.hoja['Valores'].split(', ').length, 5);
  cierto(e.datos.hoja['Intereses'].startsWith('Investigar, analizar y resolver problemas: 5'));
  cierto(!(await p.$('#cre_correo')), 'en DIANA no se ofrece el correo a la familia');
  await ctx.close();
});

await prueba('Escenarios con mentor: "Falta mentor" hasta anotar la revisión, que llega a la hoja', async () => {
  const { p, ctx, enviados } = await abrir('escenarios');
  for (const h of [5, 10, 15]) { await p.evaluate((h) => { document.querySelector('details[data-h="' + h + '"]').open = true; }, h); await p.click(`[data-usar="${h}_estudios"]`); await p.click(`[data-usar="${h}_trabajo"]`); }
  await completar(p); await listo(p);
  cierto((await aviso(p)).includes('Falta revisarlo con tu mentor'));
  cierto((await estadoDe(p, 'escenarios')).includes('Falta mentor'));
  igual(ultimo(enviados, 'escenarios').datos.hoja['Revisión del mentor'], undefined, 'sin revisión no manda columnas de mentor vacías');
  await p.check('#f_mentor_ok');
  await p.click('#btnMentor');
  cierto((await p.textContent('#avisoMentor')).includes('nombre de tu mentor'), 'pide nombre y fecha');
  await p.fill('#f_mentor_nombre', 'Sofía Gil'); await p.fill('#f_mentor_fecha', '2026-10-29'); await p.fill('#f_mentor_com', 'Aterrizar el de 10 años');
  await p.click('#btnMentor');
  await p.waitForFunction(() => document.getElementById('avisoMentor').textContent.includes('Revisión guardada'));
  cierto((await estadoDe(p, 'escenarios')).includes('Completo'));
  const e = ultimo(enviados, 'escenarios');
  igual(e.datos.hoja['Mentor'], 'Sofía Gil'); igual(e.datos.hoja['Revisión del mentor'], '2026-10-29'); igual(e.datos.hoja['Comentarios del mentor'], 'Aterrizar el de 10 años');
  await ctx.close();
});

await prueba('Mapa de carrera: roles del panel y del monitoreo con afinidad; pide rol y lo que falta', async () => {
  const { p, ctx, enviados } = await abrir('mapa');
  cierto((await p.textContent('#cuerpoFase')).includes('Auxiliar contable en Despacho Pérez'), 'muestra lo que ya trae');
  await p.waitForFunction(() => document.querySelector('#map_roles').textContent.includes('Analista Financiero'));
  const t = await p.textContent('#map_roles');
  cierto(t.includes('Tesorería, crédito y cobranza') && t.includes('Alta'), 'roles del monitoreo y afinidad');
  await completar(p);
  cierto((await aviso(p)).includes('rol objetivo'));
  await p.selectOption('#f_map_rol', 'Analista Financiero');
  await p.fill('#f_map_brecha', 'Tengo la carrera; me falta experiencia formal.');
  await completar(p); await listo(p);
  const e = ultimo(enviados, 'mapa');
  igual(e.datos.hoja['Industria objetivo'], 'Finanzas'); igual(e.datos.hoja['Rol objetivo'], 'Analista Financiero');
  await ctx.close();
});

await prueba('Tendencias, formación y marca se arman con el mapa y el monitoreo', async () => {
  const { p, ctx, enviados } = await abrir('estilo');
  await ir(p, 'tendencias');
  cierto((await p.textContent('#cuerpoFase')).includes('Mapa de carrera'), 'tendencias pide el mapa primero');
  await llenarMapa(p);
  await ir(p, 'tendencias');
  await p.waitForSelector('#cuerpoFase input[data-grupo="tendencias"]');
  cierto((await p.textContent('#ten_datos')).includes('Contabilidad general'), 'habilidades del monitoreo');
  await completar(p);
  cierto((await aviso(p)).includes('dos tendencias'));
  await marcar(p, 'tendencias', 2); await p.fill('#f_ten_accion', 'Tomar un curso de Excel y buscar en Jalisco');
  await completar(p); await listo(p);
  igual(ultimo(enviados, 'tendencias').datos.hoja['Tendencias que me importan'].split('\n').length, 2);

  await ir(p, 'formacion');
  await p.waitForSelector('#cuerpoFase input[data-grupo="tecnicas"]');
  await marcar(p, 'tecnicas', 2);
  await completar(p);
  cierto((await aviso(p)).includes('al menos 3'));
  await p.fill('#f_for_otros', 'Certificación en Excel');
  await completar(p); await listo(p);
  igual(ultimo(enviados, 'formacion').datos.hoja['Certificaciones y otros'], '• Certificación en Excel');

  await ir(p, 'marca');
  igual(await p.inputValue('#f_mar_soy'), 'Analista Financiero', 'la frase arranca con su rol');
  await p.fill('#f_mar_rec', 'La persona que explica los números claro');
  await marcar(p, 'personales', 3); await marcar(p, 'profesionales', 3);
  await p.fill('#f_mar_hago', 'convierte números en decisiones'); await p.fill('#f_mar_para', 'equipos de ventas');
  cierto((await p.textContent('#mar_frase')).includes('Soy Analista Financiero que convierte números en decisiones para equipos de ventas.'));
  await completar(p); await listo(p);
  igual(ultimo(enviados, 'marca').datos.hoja['Propuesta de valor'], 'Soy Analista Financiero que convierte números en decisiones para equipos de ventas.');
  await ctx.close();
});

await prueba('Plan en DIANA sugiere con el rol, la formación y la marca', async () => {
  const extra = {
    mapa: { completo: true, datos: { industria: 'finanzas', industriaNombre: 'Finanzas', rol: 'Analista Financiero', brecha: 'x', revisados: [] } },
    formacion: { completo: true, datos: { tecnicas: ['Contabilidad general'], blandas: [], cursos: [], otros: '' } },
    marca: { completo: true, datos: { soy: 'analista', hago: 'explica números', para: 'equipos', personales: [], profesionales: [] } }
  };
  const { p, ctx } = await abrir('plan', { extra });
  await p.waitForFunction(() => document.getElementById('pln_sug').textContent.includes('Analista Financiero'));
  const t = await p.textContent('#pln_sug');
  cierto(t.includes('LinkedIn') && t.includes('Contabilidad general') && t.includes('mentor'), t.slice(0, 300));
  cierto(!t.includes('proceso Ágora con tu orientador'), 'no habla de Ágora');
  await ctx.close();
});

/* ------------------------------ Alinear ------------------------------ */
const MAPA_OK = { mapa: { completo: true, datos: { industria: 'finanzas', industriaNombre: 'Finanzas', rol: 'Analista Financiero', brecha: 'x', revisados: [] } } };
const CV_OK = { sector: 'finanzas', puestoObjetivo: 'Analista Financiero', nombre: 'Luis Ramos', tel: '', email: 'luis@ejemplo.com', ciudad: 'Guadalajara', linkedin: '', portafolio: '',
  perfil: 'Contador egresado de la UdeG con prácticas en conciliaciones bancarias y gusto por el análisis de datos financieros para la toma de decisiones.',
  habExtra: '', exp: [{ puesto: 'Auxiliar contable', empresa: 'Despacho Pérez', lugar: '', desde: '2024', hasta: '2024', bullets: 'Conciliaciones bancarias\nContabilidad general' }],
  edu: [{ carrera: 'Contaduría', inst: 'UdeG', lugar: '', anio: '2025', estatus: '', extra: '' }], idiomas: [], cursos: [], certs: [],
  habTec: ['Contabilidad general', 'Excel', 'Conciliaciones'], habBlandas: ['Trabajo en equipo', 'Organización'] };

await prueba('Brechas frente a las vacantes: diez vacantes del monitoreo con lo que tiene y lo que le falta', async () => {
  const { p, ctx, enviados } = await abrir('brechas_ofertas', { extra: MAPA_OK });
  await p.waitForSelector('#bo_vacantes .vacante');
  igual(await p.locator('#bo_vacantes .vacante').count(), 10, 'diez vacantes');
  cierto((await p.textContent('#bo_vacantes')).includes('Te falta'));
  await completar(p);
  const a = await aviso(p);
  cierto(a.includes('★') && a.includes('conclusión'), a);
  await p.locator('#bo_vacantes input[data-grupo="bo_interesa"]').nth(0).check();
  await p.fill('#f_bo_concl', 'Me falta Excel avanzado y experiencia formal');
  await completar(p); await listo(p);
  cierto((await estadoDe(p, 'brechas_ofertas')).includes('Falta mentor'), 'se revisa con el mentor');
  const e = ultimo(enviados, 'brechas_ofertas');
  igual(e.datos.hoja['Rol e industria'], 'Analista Financiero · Finanzas');
  cierto(e.datos.hoja['Vacantes que me interesan'].startsWith('• '), e.datos.hoja['Vacantes que me interesan']);
  igual(e.datos.vacantes.length, 10);
  await ctx.close();
});

await prueba('Brechas de competencias: hasta cinco técnicas y cinco no técnicas del monitoreo', async () => {
  const { p, ctx, enviados } = await abrir('brechas_competencias', { extra: MAPA_OK });
  await p.waitForSelector('#cuerpoFase input[data-grupo="bc_tec"]');
  await marcar(p, 'bc_tec', 5);
  await p.locator('#cuerpoFase input[data-grupo="bc_tec"]').nth(5).click({ force: true });
  igual(await p.locator('#cuerpoFase input[data-grupo="bc_tec"]:checked').count(), 5, 'máximo 5 técnicas');
  await completar(p);
  cierto((await aviso(p)).includes('no técnicas'));
  await marcar(p, 'bc_bla', 3);
  await p.fill('#f_bc_plan', 'Curso de Excel y prácticas');
  await completar(p); await listo(p);
  const e = ultimo(enviados, 'brechas_competencias');
  igual(e.datos.hoja['Brechas técnicas'].split('\n').length, 5);
  igual(e.datos.hoja['Brechas no técnicas'].split('\n').length, 3);
  await ctx.close();
});

await prueba('Crea tu CV: lee el constructor del navegador, le pasa el rol y pide el PDF', async () => {
  const { p, ctx, enviados } = await abrir('cv', { extra: Object.assign({}, MAPA_OK, { marca: { completo: true, datos: { soy: 'analista', hago: 'explica números', para: 'equipos', personales: [], profesionales: [] } } }) });
  cierto((await p.textContent('#cv_estado')).includes('Todavía no hay un CV'));
  await p.click('#cv_abrir', { modifiers: [] }).catch(() => {});
  const puente = await p.evaluate(() => JSON.parse(localStorage.getItem('cmb_cv_desde_diana') || 'null'));
  igual(puente.puestoObjetivo, 'Analista Financiero'); igual(puente.sector, 'finanzas');
  cierto(puente.perfil.startsWith('Soy analista que explica números'), 'la propuesta de valor va al perfil');
  for (const pg of ctx.pages().slice(1)) await pg.close();
  await completar(p);
  cierto((await aviso(p)).includes('PDF'));
  await p.evaluate((cv) => localStorage.setItem('cmb_cv_builder_v1', JSON.stringify(cv)), CV_OK);
  await p.click('#cv_refrescar');
  igual(await p.locator('#cv_estado li.ok').count(), 5, 'los cinco apartados listos');
  await p.check('#f_cv_pdf'); await marcar(p, 'cv_alineado', 2);
  await completar(p); await listo(p);
  cierto((await estadoDe(p, 'cv')).includes('Completo'), 'Crea tu CV no pide mentor');
  const e = ultimo(enviados, 'cv');
  igual(e.datos.hoja['Puesto en el CV'], 'Analista Financiero'); igual(e.datos.hoja['Experiencias en el CV'], '1');
  await ctx.close();
});

await prueba('el constructor de CV recibe de DIANA solo en los campos vacíos', async () => {
  const ctx = await navegador.newContext();
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', '1'); localStorage.setItem('cmb_cv_desde_diana', JSON.stringify({ sector: 'finanzas', puestoObjetivo: 'Analista Financiero', perfil: 'Soy analista.' })); } });
  const p = await ctx.newPage();
  p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });
  await p.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic)/, (r) => r.abort());
  await p.goto(BASE + '/cv-builder.html?desde=diana', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('puestoObjetivo').value === 'Analista Financiero');
  igual(await p.inputValue('#sector'), 'finanzas'); igual(await p.inputValue('#perfil'), 'Soy analista.');
  cierto(await p.isVisible('#avisoDiana'));
  igual(await p.evaluate(() => localStorage.getItem('cmb_cv_desde_diana')), null, 'se lee una sola vez');
  await p.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  cierto(await p.evaluate(() => !!localStorage.getItem('cmb_cv_pdf')), 'marca la descarga');
  await ctx.close();
});

await prueba('Entrevista, presentación y expectativas: guía con sus datos y captura propia', async () => {
  const extra = Object.assign({}, MAPA_OK, { formacion: { completo: true, datos: { tecnicas: ['Contabilidad general'], blandas: [], cursos: [], otros: '' } },
    marca: { completo: true, datos: { soy: 'analista', hago: 'explica números', para: 'equipos', personales: [], profesionales: [] } } });
  const { p, ctx, enviados } = await abrir('entrevista', { extra });
  const g = await p.textContent('#cuerpoFase');
  cierto(g.includes('Contabilidad general') && g.includes('STAR') && g.includes('debilidad'), 'temas de su formación, STAR y su FODA');
  for (const [pref, n] of [['t', 3], ['n', 2]]) for (let i = 0; i < n; i++) { await p.fill(`#f_en_${pref}_p${i}`, 'Pregunta número ' + i); await p.fill(`#f_en_${pref}_r${i}`, 'Mi respuesta completa ' + i); }
  await p.fill('#f_en_mias', '¿Cómo es el equipo?\n¿Qué esperan en 90 días?');
  await completar(p);
  cierto((await aviso(p)).includes('no técnicas con tu respuesta (llevas 2)'));
  await p.fill('#f_en_n_p2', '¿Por qué aquí?'); await p.fill('#f_en_n_r2', 'Porque me gusta el análisis');
  await completar(p); await listo(p);
  igual(ultimo(enviados, 'entrevista').datos.hoja['Mis preguntas'].split('\n').length, 2);

  await ir(p, 'presentacion');
  cierto((await p.textContent('#cuerpoFase')).includes('Soy analista que explica números para equipos.'), 'pista con su propuesta de valor');
  await p.fill('#f_pr_intro', 'Soy Luis, contador por la UdeG.');
  await p.fill('#f_pr_elevator', 'Soy analista que convierte los números en decisiones claras para equipos que necesitan vender mejor.');
  await p.fill('#f_pr_experiencia', 'En el Despacho Pérez hice conciliaciones de 30 cuentas.');
  cierto((await p.textContent('[data-cuenta="elevator"]')).includes('palabras'), 'cuenta palabras');
  await completar(p);
  cierto((await aviso(p)).includes('por qué quieres este rol'));
  await p.fill('#f_pr_porque', 'Me gusta encontrar lo que dicen los números.');
  await completar(p); await listo(p);
  cierto(ultimo(enviados, 'presentacion').datos.hoja['Elevator speech'].startsWith('Soy analista'));

  await ir(p, 'expectativas');
  await p.waitForFunction(() => document.getElementById('ex_mercado').textContent.includes('salario típico'));
  await p.fill('#f_ex_sal', '90000');
  cierto((await p.textContent('#ex_mercado')).includes('arriba de lo que paga la mayoría'), 'compara con el monitoreo');
  await completar(p);
  cierto((await aviso(p)).includes('en cuánto tiempo'));
  await p.check('input[name="ex_plazo"][value="1 a 3 meses"]'); await p.check('input[name="ex_nivel"][value="Puesto de entrada o junior"]');
  await p.check('input[name="ex_mod"][value="Híbrido"]'); await p.check('input[name="ex_conf1"][value="3"]');
  await p.fill('#f_ex_preo', 'No tener experiencia formal');
  await completar(p); await listo(p);
  const e = ultimo(enviados, 'expectativas');
  igual(e.datos.hoja['Salario esperado'], '90000'); igual(e.datos.hoja['Dónde'], 'Guadalajara, Jalisco');
  await ctx.close();
});

await prueba('Resumen de Alinear pide sus seis pasos y los resume', async () => {
  const { p, ctx } = await abrir('resumen_alinear', { extra: Object.assign({}, MAPA_OK, {
    brechas_competencias: { completo: true, datos: { tecnicas: ['Excel avanzado', 'SAP', 'Power BI'], tecnicasOtras: '', blandas: ['Negociación'], blandasOtras: 'Hablar en público\nLiderazgo', plan: 'Curso' } } }) });
  cierto(await p.isDisabled('#btnCompletar'), 'faltan pasos');
  const doc = await p.textContent('#documento');
  cierto(doc.includes('Resumen ejecutivo de la fase Alinear') && doc.includes('Excel avanzado'), 'resume lo hecho');
  cierto(doc.includes('Pendiente: completa el paso 15, Brechas frente a las vacantes'), 'marca lo pendiente');
  cierto(doc.includes('Revisiones con el mentor') && doc.includes('Mentoría de ajuste de expectativas'));
  await ctx.close();
});

/* ------------------------------ Nutrir ------------------------------ */
const BRECHAS_OK = { brechas_competencias: { completo: true, datos: { tecnicas: ['Excel avanzado', 'SAP', 'Power BI'], tecnicasOtras: '', blandas: ['Comunicación', 'Negociación'], blandasOtras: 'Hablar en público', plan: 'x' } } };
const filaN = (p, pref, k, i) => `#f_${pref}_${k}_${i}`;

await prueba('Nutrir: cursos priorizados por brecha, solo del catálogo del Club y lo que ella anotó', async () => {
  const extra = Object.assign({}, MAPA_OK, BRECHAS_OK, { formacion: { completo: true, datos: { tecnicas: [], blandas: [], cursos: [], otros: 'Excel avanzado para finanzas' } } });
  const { p, ctx, enviados } = await abrir('seleccion_cursos', { extra });
  await p.waitForSelector('#sc_lista .vacante');
  const t = await p.textContent('#sc_lista');
  cierto(t.includes('Excel avanzado para finanzas') && t.includes('cierra: Excel avanzado'), 'el que anotó, con la brecha que cierra');
  cierto(/Catálogo del Club/.test(t) && /cierra: Comunicación/.test(t), 'cursos del catálogo para brechas no técnicas');
  await completar(p);
  cierto((await aviso(p)).includes('prioridad a cada curso'));
  const n = await p.locator('#sc_lista .vacante').count();
  for (let i = 0; i < n; i++) await p.check(`input[name="sc_pri_${i}"][value="${i < 2 ? 'Alta' : 'No por ahora'}"]`);
  await completar(p); await listo(p);
  const e = ultimo(enviados, 'seleccion_cursos');
  igual(e.datos.hoja['Prioridad alta'].split('\n').length, 2);
  await ctx.close();
});

await prueba('Aprender a aprender: 10 preguntas, resultado y 10 recomendaciones', async () => {
  const { p, ctx, enviados } = await abrir('aprender');
  for (let i = 0; i < 9; i++) await p.check(`input[name="apr_${i}"][value="${i < 6 ? 'K' : 'V'}"]`);
  await completar(p);
  cierto((await aviso(p)).includes('llevas 9'));
  await p.check('input[name="apr_9"][value="K"]');
  await p.waitForSelector('#apr_res input[data-grupo="apr_aplicar"]');
  igual(await p.locator('#apr_res input[data-grupo="apr_aplicar"]').count(), 10, 'diez recomendaciones');
  cierto((await p.textContent('#apr_res')).includes('práctico'));
  await marcar(p, 'apr_aplicar', 2);
  await completar(p); await listo(p);
  const e = ultimo(enviados, 'aprender');
  igual(e.datos.hoja['Forma de aprender'], 'Práctico'); cierto(e.datos.hoja['Puntaje'].includes('Práctico: 7'));
  await ctx.close();
});

await prueba('Certificaciones y comunidades: guía (CONOCER) y captura propia con requisitos', async () => {
  const extra = Object.assign({}, MAPA_OK, { formacion: { completo: true, datos: { tecnicas: [], blandas: [], cursos: [], otros: 'Certificación en Excel' } } });
  const { p, ctx, enviados } = await abrir('certificaciones', { extra });
  cierto((await p.textContent('#cuerpoFase')).includes('CONOCER'));
  igual(await p.inputValue(filaN(p, 'cer', 'nombre', 0)), 'Certificación en Excel', 'arranca con lo que anotó');
  await p.click('#cer_filas [data-agregar-fila]');
  await p.fill(filaN(p, 'cer', 'nombre', 1), 'EC0000 Estándar de prueba');
  await completar(p);
  cierto((await aviso(p)).includes('quién otorga'));
  await p.fill(filaN(p, 'cer', 'otorga', 0), 'Microsoft'); await p.fill(filaN(p, 'cer', 'otorga', 1), 'CONOCER');
  await p.selectOption(filaN(p, 'cer', 'prioridad', 0), 'Alta');
  await completar(p); await listo(p);
  igual(ultimo(enviados, 'certificaciones').datos.hoja['Prioridad alta'], '• Certificación en Excel');

  await ir(p, 'comunidades');
  await p.fill(filaN(p, 'com', 'nombre', 0), 'Colegio de Contadores de Jalisco');
  await p.click('#com_filas [data-agregar-fila]');
  await p.fill(filaN(p, 'com', 'nombre', 1), 'Grupo de analistas financieros');
  await completar(p);
  cierto((await aviso(p)).includes('requisitos'));
  await p.fill(filaN(p, 'com', 'requisitos', 0), 'Título y cuota anual'); await p.fill(filaN(p, 'com', 'requisitos', 1), 'Abierta');
  await completar(p); await listo(p);
  cierto(ultimo(enviados, 'comunidades').datos.hoja['Requisitos'].includes('Colegio de Contadores de Jalisco: Título y cuota anual'));
  await ctx.close();
});

await prueba('Plan de entrenamiento: agrega lo elegido antes, con fecha y horas', async () => {
  const extra = {
    seleccion_cursos: { completo: true, datos: { cursos: [{ nombre: 'Excel avanzado', prioridad: 'Alta', cubre: ['Excel avanzado'] }, { nombre: 'Negociación', prioridad: 'Media', cubre: [] }] } },
    certificaciones: { completo: true, datos: { filas: [{ nombre: 'Certificación en Excel', otorga: 'Microsoft', prioridad: 'Alta' }] } },
    comunidades: { completo: true, datos: { filas: [{ nombre: 'Colegio de Contadores', requisitos: 'Cuota' }] } }
  };
  const { p, ctx, enviados } = await abrir('plan_entrenamiento', { extra });
  igual(await p.locator('#pe_sug [data-pe-sug]').count(), 4);
  for (let i = 0; i < 3; i++) await p.click(`#pe_sug [data-pe-sug="${i}"]`);
  igual(await p.locator('#pe_filas .fila-captura').count(), 3, 'reemplaza el renglón vacío');
  cierto(await p.isDisabled('#pe_sug [data-pe-sug="0"]'), 'la ya agregada se desactiva');
  await completar(p);
  cierto((await aviso(p)).includes('para cuándo'));
  for (let i = 0; i < 3; i++) { await p.fill(filaN(p, 'pe', 'cuando', i), ['2026-11', '2026-12', '2027-01'][i]); await p.fill(filaN(p, 'pe', 'horas', i), '3'); }
  cierto((await p.textContent('#pe_suma')).includes('9 horas'));
  await completar(p); await listo(p);
  const e = ultimo(enviados, 'plan_entrenamiento');
  igual(e.datos.hoja['Horas por semana'], '9'); cierto(e.datos.hoja['Plan'].startsWith('• 2026-11 · Excel avanzado'), e.datos.hoja['Plan']);
  await ctx.close();
});

/* ------------------------------ Acompañar ------------------------------ */
await prueba('Contacto con la industria: empresas y plataformas del monitoreo; pide una plataforma', async () => {
  const { p, ctx, enviados } = await abrir('contacto_industria', { extra: MAPA_OK });
  await p.waitForSelector('#ci_emp input[data-grupo="ci_emp"]');
  cierto((await p.textContent('#ci_emp')).includes('BBVA') && (await p.textContent('#ci_datos')).includes('Adzuna'));
  await marcar(p, 'ci_emp', 2);
  await p.fill(filaN(p, 'ci', 'nombre', 0), 'Feria de empleo UdeG'); await p.selectOption(filaN(p, 'ci', 'tipo', 0), 'Feria de empleo');
  for (const [i, n] of [[1, 'Congreso de finanzas'], [2, 'OCC']]) { await p.click('#ci_filas [data-agregar-fila]'); await p.fill(filaN(p, 'ci', 'nombre', i), n); }
  await completar(p);
  cierto((await aviso(p)).includes('plataforma de reclutamiento'));
  await p.selectOption(filaN(p, 'ci', 'tipo', 2), 'Plataforma de reclutamiento');
  await completar(p); await listo(p);
  const e = ultimo(enviados, 'contacto_industria');
  igual(e.datos.hoja['Plataformas'], '• OCC'); cierto(e.datos.hoja['Empresas objetivo'].startsWith('BBVA'));
  await ctx.close();
});

await prueba('Investiga, inscripción, resiliencia, plan del nuevo trabajo y mentoría final', async () => {
  const extra = Object.assign({}, MAPA_OK, { comunidades: { completo: true, datos: { filas: [{ nombre: 'Colegio de Contadores', requisitos: 'Cuota anual' }, { nombre: 'Grupo de analistas', requisitos: 'Abierta' }] } } });
  const { p, ctx, enviados } = await abrir('investiga_industria', { extra });
  cierto((await p.textContent('.prompts')).includes('Analista Financiero'), 'preguntas para IA con su rol');
  for (const k of ['cultura', 'valores', 'desarrollo']) await p.fill('#f_ii_' + k, 'Lo que encontré sobre este punto en mi investigación');
  await p.fill('#f_ii_concl', 'Sí, me gusta');
  await marcar(p, 'ii_fuentes', 1);
  await completar(p);
  cierto((await aviso(p)).includes('llevas 3'));
  await p.fill('#f_ii_casos', 'Una directora de finanzas que empezó como analista');
  await completar(p); await listo(p);
  igual(ultimo(enviados, 'investiga_industria').datos.hoja['Retos y cambios'], '');

  await ir(p, 'inscripcion_comunidades');
  igual(await p.inputValue(filaN(p, 'ins', 'nombre', 1)), 'Grupo de analistas', 'trae las comunidades de Nutrir');
  igual(await p.inputValue(filaN(p, 'ins', 'requisitos', 0)), 'Cuota anual');
  await p.selectOption(filaN(p, 'ins', 'estado', 0), 'Ya me inscribí'); await p.selectOption(filaN(p, 'ins', 'estado', 1), 'Pendiente');
  await completar(p);
  cierto((await aviso(p)).includes('qué vas a aportar'));
  await p.fill(filaN(p, 'ins', 'aporte', 0), 'Compartir lo que aprendo de Excel');
  await completar(p); await listo(p);

  await ir(p, 'resiliencia');
  const radios = await p.$$eval('#cuerpoFase .radios', (r) => r.map(x => x.querySelector('input').name));
  igual(radios.length, 12);
  for (const [i, n] of radios.entries()) await p.check(`input[name="${n}"][value="${n.includes('apoyo') ? 'Pocas veces' : 'Casi siempre'}"]`);
  await p.waitForSelector('#res_res input[data-grupo="res_aplicar"]');
  const r = await p.textContent('#res_res');
  cierto(r.includes('red de apoyo') && r.includes('mentor o alguien de confianza'), r.slice(0, 300));
  await marcar(p, 'res_aplicar', 2);
  await completar(p); await listo(p);
  cierto(ultimo(enviados, 'resiliencia').datos.hoja['Nivel'].startsWith('Medio'));

  await ir(p, 'plan_nuevo_trabajo');
  igual(await p.inputValue('#f_nt_puesto'), 'Analista Financiero');
  for (const k of ['30_0', '30_1', '60_0', '60_1', '90_0']) await p.click(`[data-nt="${k}"]`);
  await completar(p);
  cierto((await aviso(p)).includes('primeros 90 días'));
  await p.fill('#f_nt_90', (await p.inputValue('#f_nt_90')) + '\nPresentar mis resultados');
  await completar(p); await listo(p);
  igual(ultimo(enviados, 'plan_nuevo_trabajo').datos.hoja['60 días'].split('\n').length, 2);

  await ir(p, 'mentoria_final');
  cierto((await p.textContent('#cuerpoFase')).includes('todavía esperan al mentor'), 'avisa de los pasos sin revisión');
  for (const k of ['fortalezas', 'oportunidad', 'recomendaciones']) await p.fill('#f_mf_' + k, 'Comentario del mentor sobre esto');
  await completar(p);
  cierto((await aviso(p)).includes('siguiente paso'));
  await p.fill('#f_mf_siguiente', 'Postularme a 5 vacantes esta semana');
  await completar(p); await listo(p);
  igual(ultimo(enviados, 'mentoria_final').datos.hoja['Siguiente paso'], 'Postularme a 5 vacantes esta semana');

  await ir(p, 'reporte_final');
  const doc = await p.textContent('#documento');
  cierto(doc.includes('Reporte final del proceso DIANA') && doc.includes('Postularme a 5 vacantes') && doc.includes('Evaluación de resiliencia'), doc.slice(doc.indexOf('Mentoría final') - 300, doc.indexOf('Mentoría final') + 300));
  cierto(doc.includes('Brechas frente a las vacantes'), 'el reporte final lista todas las revisiones del mentor');
  cierto(await p.isDisabled('#btnCompletar'), 'faltan los reportes de fase');
  await ctx.close();
});

await prueba('Reportes por fase: Descubrir pide sus 7 pasos; Iniciar resume mapa, tendencias, formación, marca y plan', async () => {
  const { p, ctx, enviados } = await abrir('reporte_descubrir');
  cierto(await p.isDisabled('#btnCompletar'), 'faltan pasos');
  const doc = await p.textContent('#documento');
  cierto(doc.includes('Reporte de la fase Descubrir') && doc.includes('Pendiente: completa el paso 4, Estilo de trabajo'), doc.slice(0, 200));
  cierto(doc.includes('Revisiones con el mentor') && doc.includes('Orientador/Mentor DIANA') && doc.includes('proceso DIANA'));
  cierto(!doc.includes('Presupuesto'), 'no trae secciones de Ágora');
  await llenarMapa(p);
  await ir(p, 'resumen_iniciar');
  const d2 = await p.textContent('#documento');
  cierto(d2.includes('Mapa de carrera') && d2.includes('Analista Financiero') && d2.includes('Tendencias de la industria'), d2.slice(0, 300));
  igual(ultimo(enviados, 'mapa').tipo, 'diana');
  await ctx.close();
});

await prueba('el mismo dato no se repite: el estilo hecho en DIANA aparece completo en Ágora', async () => {
  const { p, ctx } = await abrir('estilo');
  await marcar(p, 'trabajo', 3); await completar(p); await listo(p);
  await p.goto(BASE + '/agora.html#estilo', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#listaFases .paso');
  cierto((await estadoDe(p, 'estilo')).includes('Completo'));
  await ctx.close();
});

await prueba('sin la casilla del expediente no sale nada', async () => {
  const { p, ctx, enviados } = await abrir('estilo', { consiente: false });
  await marcar(p, 'trabajo', 3); await completar(p); await listo(p);
  await p.waitForTimeout(200);
  igual(enviados.length, 0);
  await ctx.close();
});

await navegador.close();
servidor.close();

/* ------------------------------ Apps Script ------------------------------ */
console.log('\nApps Script — DIANA');
const codigo = await readFile(join(RAIZ, 'cuentas/apps-script-autoconocimiento.gs'), 'utf8');
function cargar() {
  const pestanas = {};
  const crear = (nombre) => { const filas = []; const h = { filas, nombre, getName: () => h.nombre, setName: (n) => { delete pestanas[h.nombre]; h.nombre = n; pestanas[n] = h; },
    getLastRow: () => filas.length, getLastColumn: () => Math.max(0, ...filas.map(f => f.length)),
    appendRow: (f) => filas.push(f.slice()),
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (filas[r - 1 + i] || [])[c - 1 + j] ?? '')),
      setValues: (v) => v.forEach((fila, i) => { filas[r - 1 + i] = filas[r - 1 + i] || []; fila.forEach((x, j) => { filas[r - 1 + i][c - 1 + j] = x; }); }),
      setValue: (x) => { filas[r - 1] = filas[r - 1] || []; filas[r - 1][c - 1] = x; },
      setFontWeight: () => {} }),
    setFrozenRows: () => {} }; pestanas[nombre] = h; return h; };
  const ctx = { SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => pestanas[n] || null, insertSheet: crear }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => JSON.parse(t) }) },
    JSON, Date, String, Object, Math, Array, isFinite, parseInt, isNaN };
  vm.createContext(ctx); vm.runInContext(codigo, ctx);
  return { post: (d) => ctx.doPost({ postData: { contents: JSON.stringify(d) } }), pestanas, ctx, crear };
}
const B = { clave: 'cmb-autoconocimiento-2026', acepta: true, id: 'bbbbbbbbbbbbbbbbbbbbbbbb', nombre: 'Luis Ramos', correo: 'luis@ejemplo.com', dispositivo: 'disp12345678' };
const col = (h, n) => h.filas[0].indexOf(n);

await prueba('un paso de DIANA va a su expediente y a la pestaña compartida, con la información que vino de Ágora', async () => {
  const { post, pestanas } = cargar();
  igual(post(Object.assign({}, B, { tipo: 'diana', paso: 'mapa', completos: ['mapa'], datos: { hoja: { 'Rol objetivo': 'Analista' } } })).error, 'falta información inicial');
  post(Object.assign({}, B, { tipo: 'agora', paso: 'informacion', completos: ['informacion'], total: 11, datos: INFO }));
  igual(post(Object.assign({}, B, { tipo: 'diana', paso: 'mapa', completos: ['informacion', 'disc', 'mapa'], total: 34,
    pendientesMentor: ['escenarios'], datos: { hoja: { 'Industria objetivo': 'Finanzas', 'Rol objetivo': 'Analista Financiero' } } })).ok, true);
  const m = pestanas['Mapa de carrera'];
  igual(m.filas[1][col(m, 'Rol objetivo')], 'Analista Financiero');
  const ex = pestanas['Expediente DIANA'];
  igual(ex.filas[1][col(ex, 'Avance')], '3 de 34');
  igual(ex.filas[1][col(ex, 'Última fase guardada')], 'Mapa de carrera');
  igual(ex.filas[1][col(ex, 'Pendientes de mentor')], 'Escenarios de vida');
  igual(ex.filas[1][col(ex, 'Etapa')], 'Ya egresé', 'copia la etapa de la Información inicial');
  igual(pestanas['Expediente Ágora'].filas.length, 2, 'el de Ágora no se toca');
  igual(post(Object.assign({}, B, { tipo: 'diana', paso: 'ruta', datos: { hoja: { 'Ruta principal': 'x' } } })).error, 'paso', 'la Ruta de Ágora no es un paso de DIANA');
});

await prueba('las columnas del mentor llegan a la pestaña del paso', async () => {
  const { post, pestanas } = cargar();
  post(Object.assign({}, B, { tipo: 'diana', paso: 'informacion', completos: ['informacion'], datos: INFO }));
  igual(post(Object.assign({}, B, { tipo: 'diana', paso: 'escenarios', completos: ['informacion', 'escenarios'],
    datos: { hoja: { 'A 5 años': 'Trabajo: analista', 'Mentor': 'Sofía Gil', 'Revisión del mentor': '2026-10-29', 'Comentarios del mentor': 'Bien' } } })).ok, true);
  const h = pestanas['Escenarios de vida'];
  igual(h.filas[1][col(h, 'Mentor')], 'Sofía Gil'); igual(h.filas[1][col(h, 'Revisión del mentor')], '2026-10-29');
});

await prueba('revisarPestanas renombra las pestañas "Ágora · …" de antes y crea las de DIANA', async () => {
  const { pestanas, ctx, crear } = cargar();
  const vieja = crear('Ágora · Estilo de trabajo'); vieja.appendRow(['ID de envío', 'Orientación']); vieja.appendRow(['x', 'y']);
  crear('Ágora · Información inicial').appendRow(['ID de envío']);
  ctx.revisarPestanas();
  cierto(!pestanas['Ágora · Estilo de trabajo'] && pestanas['Estilo de trabajo'], 'renombrada');
  igual(pestanas['Estilo de trabajo'].filas[1][0], 'x', 'con sus datos');
  cierto(pestanas['Información inicial'] && pestanas['Expediente DIANA'] && pestanas['Mapa de carrera'] && pestanas['Marca personal']);
  cierto(pestanas['Brechas frente a vacantes'] && pestanas['Guía de entrevista'] && pestanas['Ajuste de expectativas'] && pestanas['DIANA · Resumen Alinear'], 'pestañas de Alinear');
  cierto(pestanas['Selección de cursos'] && pestanas['Plan de entrenamiento'] && pestanas['Resiliencia'] && pestanas['Mentoría final'] && pestanas['DIANA · Reporte final'], 'pestañas de Nutrir y Acompañar');
  cierto(pestanas['Estilo de trabajo'].filas[0].includes('Mentor'), 'agrega las columnas del mentor');
});

if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
