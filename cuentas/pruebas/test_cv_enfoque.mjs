/**
 * Prueba del Paso 1 de "Arma tu CV": industria obligatoria, puesto opcional
 * (toda la industria / un perfil de puesto / una posición concreta).
 *
 *   node cuentas/pruebas/test_cv_enfoque.mjs
 *
 * Sirve el sitio en local y corta toda llamada externa (CDN, Workers).
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';

const requerir = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = requerir('playwright')); }
catch { ({ chromium } = requerir(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }

const RAIZ = new URL('../../', import.meta.url).pathname;
const TIPOS = { '.html':'text/html', '.json':'application/json', '.svg':'image/svg+xml', '.js':'text/javascript', '.css':'text/css' };
const servidor = createServer(async (req, res) => {
  try {
    const ruta = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    const cuerpo = await readFile(join(RAIZ, ruta));
    res.writeHead(200, { 'content-type': TIPOS[extname(ruta)] || 'application/octet-stream' });
    res.end(cuerpo);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => servidor.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + servidor.address().port;

let fallas = 0, n = 0;
const ok = (cond, txt) => { n++; if (cond) console.log('  ✓ ' + txt); else { fallas++; console.log('  ✗ ' + txt); } };

const nav = await chromium.launch();
const pag = await nav.newPage();
await pag.route(u => !String(u).startsWith(BASE), r => r.abort());
const errores = [];
pag.on('pageerror', e => errores.push(e.message));

await pag.goto(BASE + '/cv-builder.html');
await pag.waitForFunction(() => document.querySelectorAll('#sector option').length > 2);

// 1. Por omisión: toda la industria, sin puesto, y no se marca como falla.
ok(await pag.isChecked('input[name=enfoque][value=sector]'), 'Por omisión el CV queda abierto a toda la industria');
await pag.selectOption('#sector', 'turismo');
await pag.waitForTimeout(300);
const check1 = await pag.textContent('#checklist');
ok(/abierto a toda la industria/.test(check1), 'La revisión acepta CV solo por industria');
ok(!/Falta el puesto/.test(check1), 'Ya no pide puesto obligatorio');
ok(!(await pag.$('.cvtitle')), 'Sin puesto, el CV no lleva título de puesto');

// 2. Perfil de puesto: lista los perfiles de la industria y pone su título.
await pag.check('input[name=enfoque][value=perfil]');
await pag.waitForFunction(() => document.querySelectorAll('#fichaPuesto option').length > 1);
const opciones = await pag.$$eval('#fichaPuesto option', os => os.map(o => o.textContent));
ok(opciones.includes('Agente de Viajes'), 'Muestra los perfiles de Turismo');
await pag.selectOption('#fichaPuesto', 'agente-de-viajes');
await pag.waitForTimeout(200);
ok((await pag.textContent('.cvtitle')) === 'Agente de Viajes', 'El perfil elegido sale como título del CV');
ok(/Sistemas de reservación/.test(await pag.textContent('#fichaDetalle')), 'Muestra lo que pide el perfil');

// 3. Se recuerda al recargar.
await pag.waitForTimeout(800);
await pag.reload();
await pag.waitForFunction(() => document.querySelector('#fichaPuesto').value === 'agente-de-viajes', null, { timeout: 5000 }).catch(() => {});
ok(await pag.isChecked('input[name=enfoque][value=perfil]'), 'Al recargar sigue en perfil');
ok((await pag.$eval('#fichaPuesto', s => s.value)) === 'agente-de-viajes', 'Al recargar conserva el perfil elegido');

// 4. Posición concreta vacía sí se avisa; escrita sale de título.
await pag.check('input[name=enfoque][value=posicion]');
await pag.waitForTimeout(200);
ok(/falta escribirla/.test(await pag.textContent('#checklist')), 'Posición elegida pero vacía: avisa');
await pag.fill('#puestoObjetivo', 'Recepcionista bilingüe');
await pag.waitForTimeout(200);
ok((await pag.textContent('.cvtitle')) === 'Recepcionista bilingüe', 'La posición escrita sale como título');

// 5. Borrador viejo (sin enfoque) con puesto: abre como posición.
await pag.evaluate(() => localStorage.setItem('cmb_cv_builder_v1', JSON.stringify({ sector: 'ventas', puestoObjetivo: 'Ejecutivo de ventas', exp: [], edu: [], idiomas: [] })));
await pag.reload();
await pag.waitForFunction(() => document.querySelectorAll('#sector option').length > 2);
await pag.waitForTimeout(300);
ok(await pag.isChecked('input[name=enfoque][value=posicion]') && (await pag.inputValue('#puestoObjetivo')) === 'Ejecutivo de ventas', 'Un borrador de antes conserva su puesto como posición');

ok(errores.length === 0, 'Sin errores de JavaScript' + (errores.length ? ': ' + errores.join(' | ') : ''));
await nav.close(); servidor.close();
console.log(`\n${n - fallas} de ${n} pasaron.`);
process.exit(fallas ? 1 : 0);
