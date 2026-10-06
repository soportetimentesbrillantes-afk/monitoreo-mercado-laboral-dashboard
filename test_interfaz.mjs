/**
 * Prueba de humo de la interfaz de cuentas, con un navegador de verdad.
 *
 *   node cuentas/pruebas/test_interfaz.mjs
 *
 * Sirve el sitio en local y sustituye las llamadas al Worker por respuestas
 * de mentira, así que no toca Cloudflare, ni Google, ni la hoja del Club.
 * Lo que comprueba es que la pantalla haga lo que dice: que la cuenta no se
 * cree sola, que los datos del CV se puedan corregir, que la sesión sobreviva
 * a recargar, y que un nombre con etiquetas HTML no se ejecute.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

// Playwright se resuelve con require para que sirva igual instalado en el
// proyecto o global (npm i -g playwright): import a secas solo encuentra el
// primero, y esta prueba se corre a mano, no en un CI con node_modules fijo.
const requerir = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = requerir('playwright'));
} catch {
  try {
    const global = execSync('npm root -g', { encoding: 'utf8' }).trim();
    ({ chromium } = requerir(join(global, 'playwright')));
  } catch {
    console.error('Falta Playwright. Instálalo con:  npm install -g playwright');
    process.exit(2);
  }
}

const RAIZ = new URL('../../', import.meta.url).pathname;
const TIPOS = { '.html':'text/html', '.json':'application/json', '.svg':'image/svg+xml', '.js':'text/javascript' };

const servidor = createServer(async (req, res) => {
  try {
    const ruta = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const archivo = join(RAIZ, ruta === '/' ? 'index.html' : ruta);
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'content-type': TIPOS[extname(archivo)] || 'application/octet-stream' });
    res.end(cuerpo);
  } catch {
    res.writeHead(404).end('no');
  }
});
await new Promise((r) => servidor.listen(0, r));
const BASE = 'http://127.0.0.1:' + servidor.address().port;

const WORKER = 'https://cv-analisis.soportetimentesbrillantes.workers.dev';
const CV_DE_PRUEBA = [
  'Ana Ruiz Delgado',
  'ana.ruiz@example.com · 55 1234 5678',
  'Licenciada en Administración. Practicante en control de inventarios,',
  'atención a clientes, Excel intermedio y trabajo en equipo.',
].join('\n');

let pasaron = 0, fallaron = 0;
const estadoFalso = { vacantes: [], cursos: [], historial: [], usuario: null, cvGuardados: 0 };

async function prueba(nombre, fn) {
  try { await fn(); pasaron++; console.log('  ok   ' + nombre); }
  catch (e) { fallaron++; console.log('  FALLA ' + nombre + '\n         ' + e.message); }
}
function cierto(v, msg) { if (!v) throw new Error(msg || 'esperaba verdadero'); }
function igual(a, b, msg) {
  if (a !== b) throw new Error((msg || 'esperaba') + ` ${JSON.stringify(b)}, llegó ${JSON.stringify(a)}`);
}

const navegador = await chromium.launch();

/** Página nueva con el Worker sustituido. `almacenamiento` conserva la sesión. */
async function abrirPagina(contexto) {
  const pagina = await contexto.newPage();
  pagina.on('pageerror', (e) => { console.log('         [error de página] ' + e.message); });

  // pdf.js, mammoth y Google Fonts se cortan de tajo: solo hacen falta para
  // leer un archivo subido, y la prueba escribe el texto del CV directamente.
  // Sin esto la página se queda esperando a unos CDN que aquí no se alcanzan.
  await pagina.route(
    /^https?:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com)\//,
    (r) => r.abort());

  await pagina.route(WORKER + '/**', async (ruta) => {
    const url = ruta.request().url().slice(WORKER.length);
    const cuerpo = ruta.request().postDataJSON?.() || {};
    const json = (o, status = 200) => ruta.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });

    if (url.startsWith('/auth/solicitar-codigo')) return json({ ok: true, vigenciaMin: 10 });
    if (url.startsWith('/auth/verificar-codigo')) {
      if (cuerpo.codigo !== '123456') return json({ ok: false, error: 'El código no es correcto o ya venció.' }, 401);
      estadoFalso.usuario = { id: 'uid-1', correo: cuerpo.correo, nombre: cuerpo.nombre || '', avisos: !!cuerpo.avisos };
      return json({ ok: true, token: 'token-de-prueba', usuario: estadoFalso.usuario });
    }
    if (url.startsWith('/auth/salir')) return json({ ok: true });
    if (url.startsWith('/cuenta/vacante')) {
      if (cuerpo.quitar) estadoFalso.vacantes = estadoFalso.vacantes.filter((v) => v.id !== cuerpo.vacante.id);
      else estadoFalso.vacantes.push({ ...cuerpo.vacante, vigente: true });
      return json({ ok: true });
    }
    if (url.startsWith('/cuenta/cv')) { estadoFalso.cvGuardados++; estadoFalso.historial.push({ sector: 'Gestión y Administración', cobertura: 12, fecha: '2026-09-29' }); return json({ ok: true }); }
    if (url.startsWith('/cuenta/curso')) { estadoFalso.cursos = [{ idCurso: cuerpo.idCurso, estado: cuerpo.estado }]; return json({ ok: true }); }
    if (url.startsWith('/cuenta/preferencias')) { estadoFalso.usuario.avisos = !!cuerpo.avisos; return json({ ok: true }); }
    if (url === '/cuenta' || url.startsWith('/cuenta?')) {
      return json({ ok: true, usuario: estadoFalso.usuario, historial: estadoFalso.historial,
        vacantes: estadoFalso.vacantes, cursos: estadoFalso.cursos });
    }
    // Análisis por IA: se deja fallar a propósito para que corra el respaldo local.
    return ruta.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"sin IA en pruebas"}' });
  });

  // La hoja de CV no existe en pruebas.
  await pagina.route('https://script.google.com/**', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));

  await pagina.goto(BASE + '/index.html', { waitUntil: 'domcontentloaded' });
  // CUENTA se declara con const, así que vive en el ámbito léxico global y no
  // cuelga de window. Los onclick en línea sí la ven; window.CUENTA no existe.
  await pagina.waitForFunction(() => typeof CUENTA !== 'undefined');
  return pagina;
}

/** Sube el CV de prueba y lo analiza. */
async function analizar(pagina) {
  await pagina.fill('#cvText', CV_DE_PRUEBA);
  await pagina.check('#aceptaLegales');
  await pagina.click('#btnAnalizarCV');
  await pagina.waitForSelector('#guardarCuentaCard:visible', { timeout: 15000 });
}

console.log('\nInterfaz de cuentas');

const ctx = await navegador.newContext();

await prueba('sin sesión, la barra ofrece entrar', async () => {
  const p = await abrirPagina(ctx);
  igual(await p.textContent('#btnSesion'), 'Entrar');
  await p.close();
});

await prueba('analizar un CV NO crea la cuenta solo', async () => {
  const p = await abrirPagina(ctx);
  await analizar(p);
  igual(estadoFalso.usuario, null, 'se creó una cuenta sin que la persona lo pidiera:');
  cierto((await p.textContent('#guardarCuentaTexto')).includes('Crea tu cuenta'),
    'debería ofrecer crear la cuenta, no darla por hecha');
  await p.close();
});

await prueba('los datos del CV se prellenan y se pueden corregir', async () => {
  const p = await abrirPagina(ctx);
  await analizar(p);
  await p.click('#guardarCuentaAcciones button');
  await p.waitForSelector('#cuentaModal:visible');
  igual(await p.inputValue('#cuentaCorreo'), 'ana.ruiz@example.com', 'no se prellenó el correo del CV:');
  igual(await p.inputValue('#cuentaNombre'), 'Ana Ruiz Delgado', 'no se prellenó el nombre del CV:');
  cierto(await p.isVisible('#cuentaPrellenadoNota'), 'falta el aviso de que los datos salieron del CV');
  igual(await p.getAttribute('#cuentaCorreo', 'readonly'), null, 'el correo no debería ser de solo lectura');
  await p.close();
});

await prueba('un código equivocado lo dice y no abre sesión', async () => {
  const p = await abrirPagina(ctx);
  await analizar(p);
  await p.click('#guardarCuentaAcciones button');
  await p.click('#btnPedirCodigo');
  await p.waitForSelector('#pasoCodigo:visible');
  await p.fill('#cuentaCodigo', '000000');
  await p.click('#btnVerificarCodigo');
  await p.waitForSelector('#cuentaAviso2 .aviso');
  cierto(await p.isVisible('#cuentaModal'), 'el modal no debería cerrarse con un código malo');
  igual(await p.textContent('#btnSesion'), 'Entrar');
  await p.close();
});

await prueba('con el código correcto entra y guarda el análisis', async () => {
  const p = await abrirPagina(ctx);
  await analizar(p);
  const antes = estadoFalso.cvGuardados;
  await p.click('#guardarCuentaAcciones button');
  await p.fill('#cuentaCorreo', 'ana.corregido@example.com');
  await p.click('#btnPedirCodigo');
  await p.waitForSelector('#pasoCodigo:visible');
  await p.fill('#cuentaCodigo', '123456');
  await p.click('#btnVerificarCodigo');
  await p.waitForSelector('#cuentaModal', { state: 'hidden' });
  igual(await p.textContent('#btnSesion'), 'Mi cuenta');
  igual(estadoFalso.usuario.correo, 'ana.corregido@example.com', 'se usó el correo del CV en vez del corregido:');
  cierto(estadoFalso.cvGuardados > antes, 'el análisis no se guardó al entrar');
  cierto((await p.textContent('#guardarCuentaTexto')).includes('quedó guardado'), 'la tarjeta no confirmó el guardado');
  await p.close();
});

await prueba('la sesión sobrevive a recargar la página', async () => {
  const p = await abrirPagina(ctx);
  igual(await p.textContent('#btnSesion'), 'Mi cuenta', 'se perdió la sesión al recargar:');
  await p.close();
});

await prueba('guardar y quitar una vacante', async () => {
  const p = await abrirPagina(ctx);
  await analizar(p);
  const btn = p.locator('[data-vacante]').first();
  await btn.waitFor({ timeout: 15000 });
  await btn.click();
  await p.waitForFunction(() => document.querySelector('[data-vacante].guardada') !== null);
  igual(estadoFalso.vacantes.length, 1, 'no se guardó la vacante:');
  cierto((await btn.textContent()).includes('Guardada'));
  await btn.click();
  await p.waitForFunction(() => document.querySelector('[data-vacante].guardada') === null);
  igual(estadoFalso.vacantes.length, 0, 'no se quitó la vacante:');
  await p.close();
});

await prueba('una vacante que ya no está vigente se dice, no se esconde', async () => {
  estadoFalso.vacantes = [{ id: 'https://ejemplo.test/v1', titulo: 'Auxiliar administrativo',
    empresa: 'Empresa X', ubicacion: 'CDMX', url: 'https://ejemplo.test/v1', vigente: false }];
  const p = await abrirPagina(ctx);
  await p.click('#btnSesion');
  await p.waitForSelector('#panelModal:visible');
  await p.waitForSelector('.cuenta-item.expirada');
  const texto = await p.textContent('.cuenta-item.expirada');
  cierto(texto.includes('Auxiliar administrativo'), 'la vacante expirada desapareció de la lista');
  cierto(texto.includes('ya no aparece'), 'no se explica por qué está atenuada');
  await p.close();
  estadoFalso.vacantes = [];
});

await prueba('un nombre con etiquetas HTML no se ejecuta', async () => {
  estadoFalso.usuario = { id: 'uid-1', correo: 'ana@example.com',
    nombre: '<img src=x onerror="window.__colado=1">', avisos: false };
  const p = await abrirPagina(ctx);
  await p.click('#btnSesion');
  await p.waitForSelector('#panelModal:visible');
  await p.waitForTimeout(400);
  igual(await p.evaluate(() => window.__colado), undefined, 'se ejecutó HTML inyectado desde el nombre:');
  cierto((await p.textContent('#panelQuien')).includes('<img'), 'el nombre debería verse como texto literal');
  await p.close();
  estadoFalso.usuario = { id: 'uid-1', correo: 'ana@example.com', nombre: 'Ana', avisos: false };
});

await prueba('cerrar sesión limpia la barra y el almacenamiento', async () => {
  const p = await abrirPagina(ctx);
  await p.click('#btnSesion');
  await p.waitForSelector('#panelModal:visible');
  await p.click('#panelModal .cuenta-seccion .secondary');
  await p.waitForFunction(() => document.getElementById('btnSesion').textContent === 'Entrar');
  igual(await p.evaluate(() => localStorage.getItem('cmb_sesion')), null, 'quedó sesión en localStorage:');
  await p.close();
});

await prueba('la página funciona con el almacenamiento bloqueado', async () => {
  const ctx2 = await navegador.newContext();
  await ctx2.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new Error('almacenamiento bloqueado'); },
    });
  });
  const p = await abrirPagina(ctx2);
  igual(await p.textContent('#btnSesion'), 'Entrar', 'la barra no se pintó sin localStorage:');
  await analizar(p);
  cierto(await p.isVisible('#guardarCuentaCard'), 'el análisis dejó de funcionar sin localStorage');
  await p.close();
  await ctx2.close();
});

await navegador.close();
servidor.close();
console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
