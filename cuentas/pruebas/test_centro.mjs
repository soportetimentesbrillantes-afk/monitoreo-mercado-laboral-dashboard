/**
 * Pruebas de "Guardar en mi cuenta" (DISC y FODA) y del centro de control.
 *
 *   node cuentas/pruebas/test_centro.mjs
 *
 * Corre la cadena completa sin tocar Google ni Cloudflare: la página habla con
 * el Worker de cuentas de verdad (worker-cuentas.js), y el Worker con el Apps
 * Script de verdad (apps-script-cuentas.gs) corriendo en una hoja falsa en
 * memoria. Lo que importa: nada se guarda sin tocar el botón; lo guardado
 * aparece en el centro de control; el mismo FODA se actualiza en vez de
 * duplicarse; nadie lee ni borra registros de otra persona; y un texto con
 * etiquetas no se ejecuta.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import vm from 'node:vm';
import { manejarCuentas } from '../worker-cuentas.js';

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
const WORKER = 'https://worker.prueba';

let pasaron = 0, fallaron = 0;
async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) { if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`); }

/* ---------------- Apps Script de cuentas en una hoja falsa ---------------- */
const codigo = await readFile(join(RAIZ, 'cuentas/apps-script-cuentas.gs'), 'utf8');
const SECRETO = 'secreto-de-la-hoja';
function cargarHoja() {
  const pestanas = {}, correos = [];
  const crear = (nombre) => {
    let filas = [];
    const ancho = () => Math.max(0, ...filas.map(f => f.length));
    const h = {
      get filas() { return filas; },
      getName: () => nombre, getLastRow: () => filas.length, getLastColumn: ancho,
      appendRow: (f) => filas.push(f.slice()), deleteRow: (n) => filas.splice(n - 1, 1),
      getDataRange: () => ({ getValues: () => filas.map(f => Array.from({ length: ancho() }, (_, j) => f[j] ?? '')) }),
      getRange: (r, c, nr = 1, nc = 1) => ({
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (filas[r - 1 + i] || [])[c - 1 + j] ?? '')),
        getValue: () => (filas[r - 1] || [])[c - 1] ?? '',
        setValues: (v) => v.forEach((fila, i) => { filas[r - 1 + i] = filas[r - 1 + i] || []; fila.forEach((x, j) => { filas[r - 1 + i][c - 1 + j] = x; }); }),
        setValue: (x) => { filas[r - 1] = filas[r - 1] || []; filas[r - 1][c - 1] = x; },
      }),
    };
    pestanas[nombre] = h; return h;
  };
  let n = 0;
  const ctx = {
    SpreadsheetApp: (() => { const libro = { getSheetByName: (x) => pestanas[x] || null, insertSheet: (x) => crear(x) }; return { getActiveSpreadsheet: () => libro, openById: () => libro }; })(),
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => ({ SECRETO, CLAVE_CV: 'cmb-cv-2026' })[k] ?? null }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ setMimeType: () => t }) },
    MailApp: { getRemainingDailyQuota: () => 100, sendEmail: (o) => correos.push(o) },
    Utilities: { getUuid: () => 'uid-' + (++n), formatDate: (d) => new Date(d).toISOString() },
    JSON, Date, String, Object, Math, Array, Number, isFinite, parseInt, isNaN,
  };
  vm.createContext(ctx); vm.runInContext(codigo, ctx);
  return { ctx, pestanas, correos };
}

/* El Worker de verdad, con fetch apuntando a la hoja falsa. */
let HOJA;
const env = { SESION_SECRETO: 'secreto-de-sesion-para-pruebas-largo', HOJA_SECRETO: SECRETO, HOJA_URL: 'https://hoja.prueba/exec', ORIGENES: BASE };
globalThis.fetch = async (url, o) => {
  if (String(url) !== env.HOJA_URL) throw new Error('fetch inesperado a ' + url);
  return new Response(HOJA.ctx.doPost({ postData: { contents: o.body } }), { status: 200 });
};
const llamar = (metodo, ruta, { cuerpo, token } = {}) => manejarCuentas(new Request(WORKER + ruta, {
  method: metodo, headers: Object.assign({ origin: BASE }, cuerpo ? { 'content-type': 'application/json' } : {}, token ? { authorization: 'Bearer ' + token } : {}),
  body: cuerpo ? JSON.stringify(cuerpo) : undefined,
}), env);

async function entrar(correo, nombre) {
  await llamar('POST', '/auth/solicitar-codigo', { cuerpo: { correo, nombre } });
  const cuerpoCorreo = HOJA.correos.at(-1);
  const cod = String(cuerpoCorreo.body || cuerpoCorreo.htmlBody || '').match(/\b\d{6}\b/)[0];
  const r = await (await llamar('POST', '/auth/verificar-codigo', { cuerpo: { correo, codigo: cod, nombre } })).json();
  return { token: r.token, usuario: r.usuario };
}
const registros = () => { const h = HOJA.pestanas['autoconocimiento_usuario']; return h ? h.filas.slice(1) : []; };
const col = (n) => HOJA.pestanas['autoconocimiento_usuario'].filas[0].indexOf(n);

/* ---------------- Página ---------------- */
const navegador = await chromium.launch();
const errores = [];
async function abrir(pagina, { sesion, ls } = {}) {
  const ctx = await navegador.newContext();
  const pedidos = [];
  await ctx.addInitScript(([w, s, extra]) => {
    window.__CMB_CUENTA_PRUEBA = w;
    if (!sessionStorage.getItem('ini')) {
      sessionStorage.setItem('ini', '1');
      if (s) localStorage.setItem('cmb_sesion', JSON.stringify(s));
      for (const [k, v] of Object.entries(extra || {})) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, [WORKER, sesion || null, ls || null]);
  await ctx.route(/^https?:\/\/(cdnjs|cdn\.jsdelivr|fonts\.google|fonts\.gstatic|script\.google|www\.clubmentesbrillantes)/, (r) => r.abort());
  await ctx.route(/worker\.prueba|cv-analisis\.soportetimentesbrillantes\.workers\.dev/, async (r) => {
    const q = r.request();
    const ruta = new URL(q.url()).pathname;
    if (q.method() !== 'OPTIONS') pedidos.push({ metodo: q.method(), ruta, cuerpo: q.postData() ? JSON.parse(q.postData()) : null });
    const resp = await manejarCuentas(new Request(q.url(), { method: q.method(), headers: Object.assign({ origin: BASE }, q.headers()), body: q.postData() || undefined }), env);
    await r.fulfill({ status: resp.status, headers: Object.fromEntries(resp.headers), body: await resp.text() });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (er) => { errores.push(er.message); console.log('         [error de página] ' + er.message); });
  await p.goto(BASE + '/' + pagina, { waitUntil: 'domcontentloaded' });
  return { p, ctx, pedidos };
}

const DISC_GUARDADO = {
  puntajes: { D: { neto: 30 }, I: { neto: 52 }, S: { neto: 41 }, C: { neto: 22 } }, fecha: '2026-11-20', version: 2,
  instrumento: 'agora', escala: { min: 0, max: 82 }, id: 'disc0001', versionClave: 'prueba', respuestas: { a: {}, b: { marcados: [] }, c: {}, d: {}, e: {} },
};

console.log('\nGuardar en mi cuenta');

await prueba('sin sesión, el DISC invita a entrar y no manda nada', async () => {
  HOJA = cargarHoja();
  const { p, ctx, pedidos } = await abrir('disc-agora.html', { ls: { cmb_disc: DISC_GUARDADO } });
  await p.click('#btnVerGuardado');
  await p.waitForSelector('#cuentaDisc .cuenta-reg');
  cierto((await p.textContent('#cuentaDisc')).includes('Entrar o crear mi cuenta'));
  igual(await p.getAttribute('#cuentaDisc a.secondary', 'href'), 'index.html?entrar=1');
  igual(pedidos.length, 0, 'no habla con el Worker');
  await ctx.close();
});

await prueba('con sesión, el DISC se guarda solo al tocar el botón y llega a la hoja con sus puntajes', async () => {
  HOJA = cargarHoja();
  const s = await entrar('ana@example.com', 'Ana Ruiz');
  const { p, ctx, pedidos } = await abrir('disc-agora.html', { sesion: s, ls: { cmb_disc: DISC_GUARDADO } });
  await p.click('#btnVerGuardado');
  await p.waitForSelector('#cuentaDisc button.primary');
  cierto((await p.textContent('#cuentaDisc')).includes('Ana Ruiz'), 'saluda por su nombre');
  igual(pedidos.length, 0, 'mostrar el resultado no guarda nada');
  await p.click('#cuentaDisc button.primary');
  await p.waitForFunction(() => document.querySelector('#cuentaDisc').textContent.includes('Guardado en tu cuenta'));
  igual(registros().length, 1);
  const f = registros()[0];
  igual(f[col('tipo')], 'disc'); igual(f[col('id')], 'disc0001'); igual(f[col('uid')], s.usuario.id);
  cierto(String(f[col('resumen')]).includes('Influencia'), 'resumen con el dominante');
  igual(JSON.parse(f[col('datos')]).puntajes.I.neto, 52, 'puntajes completos');
  await ctx.close();
});

await prueba('el FODA guardado otra vez se actualiza, no se duplica', async () => {
  HOJA = cargarHoja();
  const s = await entrar('beto@example.com', 'Beto');
  const { p, ctx } = await abrir('foda.html', { sesion: s });
  await p.waitForSelector('#cuentaFoda button.primary');
  for (const [k, t] of [['F', 'Constancia'], ['D', 'Poco inglés'], ['O', 'Vacantes en Querétaro'], ['A', 'Piden experiencia']]) await p.fill('#' + k, t);
  await p.click('#cuentaFoda button.primary');
  await p.waitForFunction(() => document.querySelector('#cuentaFoda').textContent.includes('Guardado en tu cuenta'));
  await p.fill('#F', 'Constancia\nTrabajo en equipo');
  await p.click('#cuentaFoda button.primary');
  await p.waitForFunction(() => document.querySelector('#cuentaFoda').textContent.includes('Actualizado en tu cuenta'));
  igual(registros().length, 1, 'una sola fila');
  cierto(JSON.parse(registros()[0][col('datos')]).F.includes('Trabajo en equipo'), 'con la versión nueva');
  cierto(String(registros()[0][col('resumen')]).startsWith('2 fortalezas'));
  await ctx.close();
});

console.log('\nCentro de control');

await prueba('sin sesión pide entrar', async () => {
  HOJA = cargarHoja();
  const { p, ctx } = await abrir('mi-centro.html');
  await p.waitForFunction(() => document.getElementById('contenido').textContent.includes('Entra a tu cuenta'));
  await ctx.close();
});

await prueba('muestra los DISC y FODA guardados, con su detalle y la evolución del perfil', async () => {
  HOJA = cargarHoja();
  const s = await entrar('carla@example.com', 'Carla');
  const guardar = (registro) => llamar('POST', '/cuenta/registro', { token: s.token, cuerpo: { registro } });
  await guardar({ id: 'd1', tipo: 'disc', titulo: 'Perfil DISC (Ágora)', resumen: 'Dominante: Estabilidad', datos: { instrumento: 'agora', escala: { min: 0, max: 82 }, puntajes: { D: { neto: 20 }, I: { neto: 30 }, S: { neto: 60 }, C: { neto: 40 } } } });
  await guardar({ id: 'd2', tipo: 'disc', titulo: 'Perfil DISC (Ágora)', resumen: 'Dominante: Influencia', datos: { instrumento: 'agora', escala: { min: 0, max: 82 }, puntajes: { D: { neto: 25 }, I: { neto: 62 }, S: { neto: 44 }, C: { neto: 30 } } } });
  await guardar({ id: 'f1', tipo: 'foda', titulo: 'Análisis FODA', resumen: '1 fortalezas', datos: { F: 'Puntualidad', D: '', O: 'Turismo crece', A: '', paso: 'Inscribirme al curso' } });
  const { p, ctx } = await abrir('mi-centro.html', { sesion: s });
  await p.waitForSelector('#disc .registro');
  igual(await p.locator('#disc .registro').count(), 2);
  igual(await p.locator('#foda .registro').count(), 1);
  cierto((await p.textContent('.cifras')).replace(/\s+/g, ' ').includes('2Perfiles DISC'), 'cifra de DISC');
  cierto((await p.textContent('#disc .registro')).includes('Influencia'), 'el más nuevo primero');
  cierto((await p.textContent('#disc')).includes('Cómo ha cambiado tu perfil'), 'tabla de evolución');
  await p.click('#foda [data-ver="f1"]');
  await p.waitForSelector('#foda .detalle');
  cierto((await p.textContent('#foda .detalle')).includes('Puntualidad') && (await p.textContent('#foda .detalle')).includes('Inscribirme al curso'));
  await p.click('#disc [data-ver="d2"]');
  await p.waitForSelector('#disc .detalle svg.tablero');
  await ctx.close();
});

await prueba('borrar pide dos toques y quita el registro de la hoja', async () => {
  HOJA = cargarHoja();
  const s = await entrar('dani@example.com', 'Dani');
  await llamar('POST', '/cuenta/registro', { token: s.token, cuerpo: { registro: { id: 'f9', tipo: 'foda', titulo: 'Análisis FODA', datos: { F: 'x' } } } });
  const { p, ctx } = await abrir('mi-centro.html', { sesion: s });
  await p.waitForSelector('[data-borrar="f9"]');
  await p.click('[data-borrar="f9"]');
  igual(registros().length, 1, 'el primer toque no borra');
  await p.click('[data-borrar="f9"]');
  await p.waitForFunction(() => document.querySelector('#foda').textContent.includes('Todavía no has guardado un FODA'));
  igual(registros().length, 0);
  await ctx.close();
});

await prueba('nadie lee ni borra los registros de otra persona', async () => {
  HOJA = cargarHoja();
  const a = await entrar('eva@example.com', 'Eva'), b = await entrar('fer@example.com', 'Fer');
  await llamar('POST', '/cuenta/registro', { token: a.token, cuerpo: { registro: { id: 'mio', tipo: 'disc', titulo: 'DISC de Eva', datos: {} } } });
  const deB = await (await llamar('GET', '/cuenta', { token: b.token })).json();
  igual(deB.registros.length, 0, 'Fer no ve el de Eva');
  await llamar('POST', '/cuenta/registro/borrar', { token: b.token, cuerpo: { id: 'mio' } });
  await llamar('POST', '/cuenta/registro', { token: b.token, cuerpo: { registro: { id: 'mio', tipo: 'disc', titulo: 'Intento de pisar', datos: {} } } });
  const deA = await (await llamar('GET', '/cuenta', { token: a.token })).json();
  igual(deA.registros.length, 1); igual(deA.registros[0].titulo, 'DISC de Eva', 'el mismo id de otra persona no lo pisa');
  igual((await llamar('POST', '/cuenta/registro', { cuerpo: { registro: { id: 'x', tipo: 'disc' } } })).status, 401, 'sin sesión, 401');
});

await prueba('el Worker rechaza tipos raros, ids raros y registros enormes', async () => {
  HOJA = cargarHoja();
  const s = await entrar('gil@example.com', 'Gil');
  const r = (registro) => llamar('POST', '/cuenta/registro', { token: s.token, cuerpo: { registro } });
  igual((await r({ id: 'a1', tipo: 'cv', datos: {} })).status, 400);
  igual((await r({ id: '../x', tipo: 'disc', datos: {} })).status, 400);
  igual((await r({ id: 'a2', tipo: 'foda', datos: { F: 'x'.repeat(41000) } })).status, 400);
  igual(registros().length, 0);
});

await prueba('un título con etiquetas se muestra como texto, no se ejecuta', async () => {
  HOJA = cargarHoja();
  const s = await entrar('hugo@example.com', 'Hugo');
  await llamar('POST', '/cuenta/registro', { token: s.token, cuerpo: { registro: { id: 'h1', tipo: 'foda', titulo: '<img src=x onerror="window.__malo=1">', resumen: '<b>x</b>', datos: { F: '<script>window.__malo=2</script>' } } } });
  const { p, ctx } = await abrir('mi-centro.html', { sesion: s });
  await p.waitForSelector('[data-ver="h1"]');
  await p.click('[data-ver="h1"]');
  await p.waitForSelector('#foda .detalle');
  igual(await p.evaluate(() => window.__malo), undefined);
  cierto((await p.textContent('#foda')).includes('<img src=x'), 'se ve como texto');
  await ctx.close();
});

await prueba('index.html?entrar=1 abre el acceso, y el panel enlaza al centro de control', async () => {
  HOJA = cargarHoja();
  const sin = await abrir('index.html?entrar=1');
  await sin.p.waitForSelector('#cuentaModal:not([hidden])', { timeout: 8000 }).catch(() => {});
  cierto(await sin.p.isVisible('#pasoCorreo'), 'abre el paso del correo');
  await sin.ctx.close();
  const s = await entrar('ines@example.com', 'Inés');
  await llamar('POST', '/cuenta/registro', { token: s.token, cuerpo: { registro: { id: 'q1', tipo: 'disc', titulo: 'Perfil DISC', datos: {} } } });
  const con = await abrir('index.html?entrar=1', { sesion: s });
  await con.p.waitForSelector('#panelModal:not([hidden]) #panelCentro');
  await con.p.waitForFunction(() => document.getElementById('panelContenido').textContent.includes('1 perfil DISC'));
  await con.ctx.close();
});

await navegador.close();
servidor.close();
if (errores.length) fallaron += errores.length;
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
