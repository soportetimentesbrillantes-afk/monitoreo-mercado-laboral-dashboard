/**
 * Convierte el boletín a PDF con el motor de impresión del navegador y escribe
 * en la salida estándar el número de páginas que ocupó.
 *
 *   node a_pdf.mjs <entrada.html> <salida.pdf>
 *
 * Se usa el navegador y no weasyprint porque weasyprint necesita instalarse y
 * en algunos entornos no se puede. En tu máquina, si tienes weasyprint, el
 * resultado es equivalente y respeta mejor la tipografía local.
 *
 * El número de páginas se cuenta sobre el PDF ya renderizado, no sobre el HTML:
 * las hojas del boletín tienen alto fijo con overflow:hidden, así que un
 * desbordamiento no se ve como una página de más — se ve como contenido
 * cortado. Contarlo aquí es lo que delata el problema.
 */
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

const requerir = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = requerir('playwright')); }
catch {
  try { ({ chromium } = requerir(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), 'playwright'))); }
  catch { console.error('Falta Playwright: npm install -g playwright'); process.exit(2); }
}

const [entrada, salida] = process.argv.slice(2);
if (!entrada || !salida) { console.error('uso: node a_pdf.mjs <entrada.html> <salida.pdf>'); process.exit(2); }

const navegador = await chromium.launch();
const pagina = await navegador.newPage();

// Las tipografías de Google pueden no estar disponibles sin red. No es motivo
// para fallar: se deja que el navegador use su alternativa y el conteo de
// páginas sigue siendo válido, porque las hojas tienen alto fijo.
await pagina.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort().catch(() => {}));

await pagina.goto(pathToFileURL(resolve(entrada)).href, { waitUntil: 'load' });
await pagina.emulateMedia({ media: 'print' });
await pagina.pdf({ path: salida, printBackground: true, preferCSSPageSize: true });
await navegador.close();

// Contar páginas: en un PDF sin comprimir, cada página es un objeto /Type /Page.
const pdf = readFileSync(salida, 'latin1');
const porConteo = pdf.match(/\/Count\s+(\d+)/);
const porObjetos = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(porConteo ? Number(porConteo[1]) : porObjetos);
