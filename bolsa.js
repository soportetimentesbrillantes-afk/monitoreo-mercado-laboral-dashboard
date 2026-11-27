/* =====================================================================
   Bolsa de trabajo del Club — conexión con su Apps Script
   (cuentas/apps-script-bolsa.gs). La usan vacantes.html, empleador.html y
   el DISC cuando llega desde una postulación (postulacion-disc.js).

   URL_BOLSA se llena al publicar el Apps Script. Mientras esté vacía, las
   páginas lo dicen en vez de fallar en silencio. En una copia local
   (localhost) no se usa la URL real, salvo en pruebas.
   ===================================================================== */
const BOLSA = (function(){
// Aplicación web "Bolsa de trabajo del Club", publicada por la cuenta del Club (2026-11-27).
const URL_BOLSA = 'https://script.google.com/macros/s/AKfycbyQVoD87w5ZzJUYKxsKy0lbYZKFCBrtqML9-Rbp0yp26sa3qVro6uK-ob1vhYo8cqQ0Fg/exec';
const LOCAL = typeof location !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const ENDPOINT = (typeof window !== 'undefined' && window.__CMB_BOLSA_PRUEBA) || (LOCAL ? '' : URL_BOLSA);

async function api(accion, datos){
  if(!ENDPOINT) return {ok: false, error: 'sin servicio'};
  // Texto plano a propósito: así el navegador no hace la petición previa
  // (preflight), que Apps Script no sabe contestar.
  const r = await fetch(ENDPOINT, {method: 'POST', headers: {'content-type': 'text/plain;charset=utf-8'}, body: JSON.stringify(Object.assign({accion}, datos || {}))});
  try{ return await r.json(); }catch(e){ return {ok: false, error: 'respuesta'}; }
}
const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const MENSAJES = {
  'sin servicio': 'La bolsa de trabajo todavía no está conectada. Inténtalo más tarde.',
  ocupado: 'El servicio está ocupado. Intenta otra vez en unos segundos.',
  red: 'No hubo conexión. Revisa tu internet e intenta otra vez.',
  clave: 'Esa clave no es la de ninguna empresa registrada.',
  bloqueado: 'Demasiados intentos fallidos. Espera 10 minutos.',
  inactiva: 'La cuenta de esta empresa está desactivada. Escribe al Club.',
  consentimiento: 'Para postularte necesitas aceptar el aviso.',
  datos: 'Revisa tu nombre y tu correo.',
  cv: 'Tu CV tiene muy poco texto. Si es un PDF escaneado, pega el texto.',
  limite: 'Ya enviaste varias postulaciones en la última hora. Espera un poco.',
  cerrada: 'Esta vacante ya no recibe postulaciones.',
  token: 'Este enlace no corresponde a ninguna postulación. Revisa el correo que te llegó.'
};
const mensaje = e => MENSAJES[e] || ('No se pudo completar (' + e + ').');

/* Texto de un archivo de CV, en el navegador: PDF (pdf.js), Word (mammoth) o texto. */
async function textoDeArchivo(file){
  const leer = buf => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('no se pudo leer')); buf ? r.readAsArrayBuffer(file) : r.readAsText(file); });
  const n = file.name.toLowerCase();
  if(n.endsWith('.pdf')){
    if(!window.pdfjsLib) throw new Error('no cargó el lector de PDF; pega el texto');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const pdf = await pdfjsLib.getDocument({data: new Uint8Array(await leer(true))}).promise;
    let t = '';
    for(let i = 1; i <= pdf.numPages; i++){
      const c = await (await pdf.getPage(i)).getTextContent();
      let y = null;
      c.items.forEach(it => { const yy = it.transform ? Math.round(it.transform[5]) : null; if(y !== null && yy !== null && Math.abs(yy - y) > 2) t += '\n'; else if(t && !t.endsWith('\n')) t += ' '; t += it.str; y = yy; });
      t += '\n';
    }
    return t;
  }
  if(n.endsWith('.docx')){
    if(!window.mammoth) throw new Error('no cargó el lector de Word; pega el texto');
    return (await mammoth.extractRawText({arrayBuffer: await leer(true)})).value;
  }
  if(n.endsWith('.txt') || n.endsWith('.md')) return await leer(false);
  throw new Error('usa PDF, Word .docx o texto');
}

return {api, esc, mensaje, textoDeArchivo, activo: () => !!ENDPOINT};
})();
