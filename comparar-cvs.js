/* =====================================================================
   Comparación de CVs · Club de Mentes Brillantes (comparar-cvs.html)

   1. Vacante y prompt: contexto, categorías con puntos y seis niveles con
      rangos (como "Outstanding 19–20 … Insufficient 0–5"), instrucciones.
      Se puede partir de una ficha de puesto (fichas-puestos.js) o en blanco.
      De ahí sale el prompt que recibe la IA, visible y copiable.
   2. CVs: PDF, Word o texto pegado. Antes de guardarlos se ocultan nombre,
      correo, teléfono, edad, domicilio, CURP, RFC, estado civil y género.
   3. Filtro ATS: palabras clave indispensables y deseables, sin IA. Pasan
      los que tienen todas las indispensables y el porcentaje mínimo de
      deseables; una persona puede pasar a alguien a mano, con razón escrita.
   4. Comparación: la IA compara a los finalistas de dos en dos con el prompt
      (ruta /comparar-cvs del worker, ver worker-comparar.js). Cada duelo se
      repite con el orden invertido; si las dos vueltas no coinciden, es
      empate. Gana el duelo quien suma más puntos de la rúbrica.
   5. Reporte: ranking por duelos ganados, tabla cara a cara, promedio por
      categoría y, con la IA, un reporte escrito. Los finalistas pueden pasar
      a Selección Justa.
   ===================================================================== */
(function(){
'use strict';

const LLAVE = 'cmb_comparar_cvs_v1';
const NIVELES = ['Sobresaliente', 'Excelente', 'Sólido', 'Competente', 'En desarrollo', 'Insuficiente'];
const CORTES = [.30, .55, .70, .85, .95];      // límites inferiores de En desarrollo … Sobresaliente
const MAX_FINALISTAS = 10, MIN_PTS = 6, EMPATE = 2;
const URL_COMPARAR = 'https://cv-analisis.soportetimentesbrillantes.workers.dev/comparar-cvs';
const LOCAL = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const IA_URL = window.__CMB_COMPARAR_PRUEBA || (LOCAL ? '' : URL_COMPARAR);
const FPZ = window.FICHAS_PUESTOS;

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const copia = o => JSON.parse(JSON.stringify(o));
const $ = s => document.querySelector(s);
const sum = a => a.reduce((s, x) => s + x, 0);
const prom = a => a.length ? sum(a) / a.length : null;
const r1 = x => x == null ? '—' : (Math.round(x * 10) / 10).toLocaleString('es-MX');

/* ======================= Rangos de nivel ======================= */
/* Con 20 puntos: 19–20, 17–18, 14–16, 11–13, 6–10, 0–5. */
function rangos(P){
  P = Math.max(MIN_PTS, Math.round(Number(P) || 0));
  const L = [0].concat(CORTES.map(f => Math.round(f * P)));
  for(let k = 1; k < 6; k++) L[k] = Math.max(L[k], L[k - 1] + 1);
  if(L[5] > P){ L[5] = P; for(let k = 4; k >= 1; k--) L[k] = Math.min(L[k], L[k + 1] - 1); }
  const out = [];
  for(let k = 5; k >= 0; k--) out.push([L[k], k === 5 ? P : L[k + 1] - 1]);
  return out;
}

/* ======================= Estado ======================= */
const INSTRUCCIONES = [
  'Lee cada CV completo con cuidado.',
  'Califica cada categoría con los niveles de arriba; los puntos deben caer dentro del rango del nivel.',
  'Dentro de un rango, da el puntaje alto con evidencia verificable o cuantificada y el bajo con afirmaciones sin respaldo.',
  'Ignora nombre, edad, género, foto, domicilio, estado civil y la escuela de procedencia: no son evidencia.',
  'Suma los puntos de todas las categorías para el total (0 a 100).'
].join('\n');
function catVacia(i){ return {id: 'c' + i, nombre: '', puntos: 20, porque: '', niveles: ['', '', '', '', '', '']}; }
function estadoNuevo(){
  return {version: 1, siguiente: 1,
    vacante: {puesto: '', contexto: '', fichaId: '', categorias: [1, 2, 3, 4, 5].map(catVacia), instrucciones: INSTRUCCIONES},
    ats: {obligatorias: '', deseables: '', umbral: 40, finalistas: 6},
    cvs: [], duelos: {}, config: {dobleVuelta: true, acepto: false}, reporte: null};
}
let S;
function cargar(){ try{ const g = JSON.parse(localStorage.getItem(LLAVE) || 'null'); if(g && g.vacante) return g; }catch(e){} return estadoNuevo(); }
function guardar(){ try{ localStorage.setItem(LLAVE, JSON.stringify(S)); }catch(e){ avisoGuardado = true; } }
let avisoGuardado = false;
S = cargar();

/* ======================= Prompt de la vacante ======================= */
function promptTexto(){
  const v = S.vacante, cats = v.categorias;
  const lineas = ['**CONTEXTO DE LA VACANTE:**', '', 'Puesto: ' + (v.puesto || '(sin nombre)')];
  if(v.contexto.trim()) lineas.push('', v.contexto.trim());
  lineas.push('', '**CATEGORÍAS DE LA RÚBRICA (' + sum(cats.map(c => Number(c.puntos) || 0)) + ' puntos en total):**');
  cats.forEach((c, i) => {
    lineas.push('', '**' + (i + 1) + ') ' + (c.nombre || '(sin nombre)') + ' — ' + c.puntos + ' pts** [id: ' + c.id + ']');
    if(c.porque.trim()) lineas.push('', 'Por qué importa aquí: ' + c.porque.trim());
    lineas.push('');
    rangos(c.puntos).forEach(([lo, hi], k) => lineas.push('- ' + NIVELES[k] + ' (' + lo + '–' + hi + '): ' + (c.niveles[k] || '').trim()));
  });
  lineas.push('', '**INSTRUCCIONES:**');
  v.instrucciones.split('\n').map(x => x.trim()).filter(Boolean).forEach((x, i) => lineas.push((i + 1) + '. ' + x.replace(/^\d+[.)]\s*/, '')));
  lineas.push('', '**NIVELES (aplican a todas las categorías):**', '');
  NIVELES.forEach((n, k) => lineas.push((6 - k) + '. ' + n + (k === 0 ? ' (solo el 8 a 10 % con la mejor evidencia)' : '')));
  return lineas.join('\n');
}
function problemasVacante(){
  const v = S.vacante, out = [], tot = sum(v.categorias.map(c => Number(c.puntos) || 0));
  if(!v.puesto.trim()) out.push('Falta el nombre del puesto.');
  if(v.categorias.length < 3) out.push('Pon al menos 3 categorías.');
  if(tot !== 100) out.push('Los puntos suman ' + tot + '; deben sumar 100.');
  v.categorias.forEach((c, i) => {
    if(!c.nombre.trim()) out.push('La categoría ' + (i + 1) + ' no tiene nombre.');
    if(Number(c.puntos) < MIN_PTS) out.push('La categoría ' + (i + 1) + ' necesita al menos ' + MIN_PTS + ' puntos para tener seis niveles.');
    if(c.niveles.filter(x => x.trim()).length < 6) out.push('A la categoría ' + (i + 1) + ' le faltan descripciones de nivel.');
  });
  return out;
}

/* Desde una ficha de puesto: las competencias son las categorías. Los seis
   niveles se arman con los descriptores 1, 3 y 5 de la ficha. */
function vacanteDeFicha(f){
  const minus = t => String(t || '').replace(/\.$/, '');
  const cats = f.competencias.map((c, i) => ({
    id: 'c' + (i + 1), nombre: c.nombre, puntos: c.peso,
    porque: 'Lo mínimo esperado: ' + minus(c.n3).toLowerCase() + '. Lo que distingue a los mejores: ' + minus(c.n5).toLowerCase() + '.',
    niveles: [minus(c.n5) + ', con evidencia reciente, cuantificada y de alcance mayor.', minus(c.n5) + '.', minus(c.n3) + ', con algunos resultados medibles.', minus(c.n3) + '.',
      'Evidencia indirecta o sin cifras de ' + c.nombre.charAt(0).toLowerCase() + c.nombre.slice(1) + '.', minus(c.n1) + '.']
  }));
  const r = FPZ.resumen(f).map(([a, b]) => '- ' + a + ': ' + b).join('\n');
  const lg = FPZ.legal(f);
  return {
    puesto: f.puesto, fichaId: f.id, categorias: cats, instrucciones: INSTRUCCIONES,
    contexto: f.panel.descripcion + '\nSector: ' + f.sector + '.\nLo que suele pedirse: ' + f.suele_pedir.escolaridad + ' ' + f.suele_pedir.experiencia +
      (lg ? '\nRequisito legal (se verifica aparte, no da puntos): ' + lg : '') + '\nLo que piden sus vacantes en el monitoreo del Club (referencia, no filtro):\n' + r,
    atsDeseables: f.panel.habilidades_tecnicas.replace(/\([^)]*\)/g, '').split(/[,;.]| y /).map(x => x.trim().toLowerCase()).filter(x => x.length > 2 && x.length < 50).slice(0, 8).join('\n')
  };
}

/* ======================= Ocultar identidad ======================= */
/* Los mismos patrones que Selección Justa, más enlaces a perfiles. */
const PATRONES = [
  [/https?:\/\/\S+|\b(?:www\.)?linkedin\.com\/\S+/gi, 'enlace'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, 'correo'],
  [/(\+?52[\s-]?)?(\(?\d{2,3}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}\b/g, 'teléfono'],
  [/\b[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d\b/g, 'CURP'],
  [/\b[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}\b/g, 'RFC'],
  [/\b\d{1,2}\s*años(\s+de\s+edad)?(?!\s+(de\s+(experiencia|trabajo|servicio)|como|en|trabajando|laborando|vendiendo))/gi, 'edad'],
  [/\b(fecha de nacimiento|nacid[oa] el|f\.?\s?nac\.?)\s*:?\s*[^\n,;]+/gi, 'nacimiento'],
  [/\b(c\.?\s?p\.?|código postal)\s*:?\s*\d{5}\b/gi, 'código postal'],
  [/\b(col\.|colonia|calle|av\.|avenida|domicilio|dirección)\s*:?[^\n]+/gi, 'domicilio'],
  [/\b(casad[oa]|solter[oa]|divorciad[oa]|viud[oa]|unión libre|estado civil\s*:?\s*\w+)\b/gi, 'estado civil'],
  [/\b(sexo|género)\s*:?\s*(masculino|femenino|hombre|mujer)\b/gi, 'género'],
  [/\b(religión|nacionalidad|discapacidad)\s*:?\s*[^\n,;]+/gi, 'dato protegido'],
  [/\b(foto|fotografía)\b[^\n]*/gi, 'foto']
];
const NO_NOMBRE = /curr[ií]culum|vitae|\bcv\b|perfil|experiencia|objetivo|resumen|datos|contacto|formaci[oó]n|licenciad|ingenier|contador|t[eé]cnico|asesor|gerente/i;
/* Nombre probable: la primera línea si parece nombre, el nombre que se
   escribió, y las palabras del nombre del archivo que también aparecen al
   principio del CV (así "CV_Juan_Perez.pdf" oculta a Juan Pérez, pero
   "cv_contador.pdf" no borra "contador"). */
function nombresProbables(texto, nombre, archivo){
  const partes = String(nombre || '').trim().split(/\s+/).filter(p => p.length > 2);
  const primera = (String(texto).split('\n').map(x => x.trim()).find(Boolean) || '');
  if(/^[A-Za-zÁÉÍÓÚÑÜáéíóúñü.' -]{5,60}$/.test(primera) && !NO_NOMBRE.test(primera)){
    const w = primera.split(/\s+/).filter(Boolean);
    if(w.length >= 2 && w.length <= 5) partes.push(...w.filter(p => p.replace(/\./g, '').length > 2));
  }
  if(archivo){
    // Solo dos palabras seguidas del archivo que también van seguidas en el CV
    // ("Pedro_Ruiz" y "Pedro Ruiz"): una sola palabra suele ser el oficio.
    const inicio = norm(String(texto).slice(0, 400)), q = x => norm(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const w = String(archivo).replace(/\.[a-z0-9]+$/i, '').split(/[_\-\s.]+/).filter(p => p.length > 2 && !/^\d+$/.test(p) && !/^(cv|curriculum|vitae|resume|final|actualizado|nuevo)$/i.test(p));
    for(let i = 0; i + 1 < w.length; i++) if(new RegExp('\\b' + q(w[i]) + '\\s+' + q(w[i + 1]) + '\\b').test(inicio)) partes.push(w[i], w[i + 1]);
  }
  return [...new Set(partes)];
}
function ocultar(texto, nombres){
  let t = String(texto || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), n = 0;
  // Primero correos, enlaces y teléfonos: si se ocultara antes el nombre,
  // "fer.castillo@mail.com" quedaría como "fer.⟦nombre⟧@mail.com" y el correo ya no se reconocería.
  PATRONES.forEach(([re, etq]) => { t = t.replace(re, () => { n++; return '⟦' + etq + '⟧'; }); });
  if(nombres.length){
    const sinAc = p => p.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const alts = [...new Set(nombres.flatMap(p => [p, sinAc(p)]))].map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    t = t.replace(new RegExp('(^|[^\\p{L}])(' + alts.join('|') + ')(?=$|[^\\p{L}])', 'giu'), (m, a) => { n++; return a + '⟦nombre⟧'; });
  }
  return {texto: t, ocultos: n};
}
const conMarcas = t => esc(t).replace(/⟦([^⟧]+)⟧/g, '<span class="oculto">$1 oculto</span>');

/* ======================= Lectura de archivos ======================= */
if(window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const leer = (file, buf) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('no se pudo leer')); buf ? r.readAsArrayBuffer(file) : r.readAsText(file); });
async function textoDeArchivo(file){
  const n = file.name.toLowerCase();
  if(n.endsWith('.pdf')){
    if(!window.pdfjsLib) throw new Error('no cargó el lector de PDF; pega el texto');
    const pdf = await pdfjsLib.getDocument({data: new Uint8Array(await leer(file, true))}).promise;
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
    return (await mammoth.extractRawText({arrayBuffer: await leer(file, true)})).value;
  }
  if(n.endsWith('.txt') || n.endsWith('.md')) return await leer(file, false);
  throw new Error('formato no soportado (usa PDF, Word .docx o texto)');
}
function agregarCV(texto, nombre, archivo){
  const t = String(texto || '').trim();
  if(t.length < 80) return {error: 'tiene muy poco texto (¿es un PDF escaneado?)'};
  const o = ocultar(t, nombresProbables(t, nombre, archivo));
  const id = 'CV-' + String(S.siguiente++).padStart(2, '0');
  S.cvs.push({id, texto: o.texto.slice(0, 10000), ocultos: o.ocultos, recortado: o.texto.length > 10000, incluir: null, forzado: null});
  return {id};
}

/* ======================= Filtro ATS ======================= */
/* Una línea por palabra clave. "a|b" = cualquiera de las dos. Termina en *
   para aceptar variantes: "contab*" cubre contable y contabilidad. */
const lineas = t => String(t || '').split('\n').map(x => x.trim()).filter(Boolean);
function busca(clave, textoNorm){
  return clave.split('|').map(x => x.trim()).filter(Boolean).some(alt => {
    const pref = alt.endsWith('*'), a = norm(pref ? alt.slice(0, -1) : alt).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    return a && new RegExp('(^|[^a-z0-9])' + a + (pref ? '' : '(?![a-z0-9])')).test(textoNorm);
  });
}
function ats(cv){
  const t = norm(cv.texto), obl = lineas(S.ats.obligatorias).map(k => ({k, si: busca(k, t)})), des = lineas(S.ats.deseables).map(k => ({k, si: busca(k, t)}));
  const pct = des.length ? Math.round(des.filter(x => x.si).length / des.length * 100) : 100;
  const pasa = obl.every(x => x.si) && pct >= (Number(S.ats.umbral) || 0);
  return {obl, des, pct, pasa, entra: pasa || !!(cv.forzado && cv.forzado.razon && cv.forzado.razon.trim())};
}
function finalistas(){
  const res = S.cvs.map(c => ({c, a: ats(c)})).filter(x => x.a.entra).sort((x, y) => y.a.pct - x.a.pct);
  const n = Math.max(2, Math.min(MAX_FINALISTAS, Number(S.ats.finalistas) || 6));
  const auto = new Set(res.slice(0, n).map(x => x.c.id));
  return res.filter(x => x.c.incluir === true || (x.c.incluir == null && auto.has(x.c.id))).map(x => x.c);
}

/* ======================= Duelos ======================= */
function firma(s){ let h = 5381; for(let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
const categoriasIA = () => S.vacante.categorias.map(c => ({id: c.id, nombre: c.nombre, puntos: Number(c.puntos)}));
function corridas(){
  const F = finalistas(), out = [];
  for(let i = 0; i < F.length; i++) for(let j = i + 1; j < F.length; j++){
    const [x, y] = (i + j) % 2 ? [F[j], F[i]] : [F[i], F[j]];
    out.push([x, y]); if(S.config.dobleVuelta) out.push([y, x]);
  }
  const p = promptTexto();
  return out.map(([a, b]) => ({a, b, clave: a.id + '>' + b.id, firma: firma(p + '\u0001' + a.texto + '\u0001' + b.texto)}));
}
const vigente = r => { const d = S.duelos[r.clave]; return d && d.firma === r.firma && d.ok ? d : null; };

let corriendo = false, detener = false, msgIA = '', msgTipo = '';
async function pedir(cuerpo){
  for(let intento = 0; intento < 4; intento++){
    const r = await fetch(IA_URL, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(cuerpo)});
    if(r.status === 404) throw {code: 'no_activa'};
    if(r.status === 429){ await new Promise(z => setTimeout(z, window.__CMB_ESPERA_429 != null ? window.__CMB_ESPERA_429 : 15000)); continue; }
    const d = await r.json().catch(() => null);
    if(!r.ok || !d || !d.ok) throw {code: 'error', msg: d && d.error};
    return d;
  }
  throw {code: 'rate_limited'};
}
async function correrDuelos(){
  if(corriendo) return;
  if(!IA_URL){ msgIA = 'En una copia local no se llama a la IA del Club.'; msgTipo = 'warn'; pComparacion(); return; }
  corriendo = true; detener = false; msgIA = ''; pComparacion();
  const rubrica = promptTexto(), categorias = categoriasIA();
  const cola = corridas().filter(r => !vigente(r));
  let fallas = 0, parar = false;
  async function trabajador(){
    while(cola.length && !detener && !parar){
      const r = cola.shift();
      try{
        const d = await pedir({tipo: 'duelo', rubrica, categorias, a: r.a.texto, b: r.b.texto});
        S.duelos[r.clave] = {ok: true, firma: r.firma, res: d};
      }catch(e){
        if(e.code === 'no_activa'){ parar = true; msgIA = 'La comparación con IA todavía no está activa en el servidor del Club. El filtro ATS sí funciona, y los finalistas pueden pasar a Selección Justa.'; msgTipo = 'warn'; }
        else { fallas++; S.duelos[r.clave] = {ok: false, firma: r.firma, error: (e && e.msg) || 'sin respuesta'}; }
      }
      guardar(); pProgreso();
    }
  }
  await Promise.all([trabajador(), trabajador()]);
  corriendo = false;
  if(!msgIA) { msgIA = detener ? 'Se detuvo. Lo que ya se comparó se conserva.' : (fallas ? fallas + ' duelos fallaron; puedes reintentarlos.' : 'Listo: se compararon todos los pares.'); msgTipo = fallas || detener ? 'warn' : 'ok'; }
  pComparacion();
}

/* Resultado por par y ranking. Gana el duelo quien suma más puntos (con
   diferencia de al menos EMPATE puntos). Con doble vuelta, si cada orden da
   un ganador distinto, el duelo es empate y se marca. */
function resultados(){
  const F = finalistas(), est = {}, pares = [];
  F.forEach(c => { est[c.id] = {id: c.id, g: 0, e: 0, p: 0, puntos: 0, totales: [], cat: {}}; });
  const porPar = {};
  corridas().forEach(r => {
    const d = vigente(r), [x, y] = [r.a.id, r.b.id].sort(), k = x + '|' + y;
    porPar[k] = porPar[k] || {x, y, vueltas: [], esperadas: 0};
    porPar[k].esperadas++;
    if(!d) return;
    const res = d.res, deX = r.a.id === x;
    porPar[k].vueltas.push({
      tx: deX ? res.total_a : res.total_b, ty: deX ? res.total_b : res.total_a,
      cats: res.categorias.map(c => ({id: c.id, x: deX ? c.a : c.b, y: deX ? c.b : c.a, ex: deX ? c.evidencia_a : c.evidencia_b, ey: deX ? c.evidencia_b : c.evidencia_a, com: c.comentario})),
      ia: res.ganador === 'empate' ? 'empate' : ((res.ganador === 'A') === deX ? x : y), razon: res.razon, alertas: res.alertas || [], orden: r.a.id + ' como A'
    });
  });
  Object.values(porPar).forEach(p => {
    const v = p.vueltas;
    if(!v.length){ pares.push(Object.assign(p, {estado: 'pendiente'})); return; }
    const gan = q => q.tx - q.ty >= EMPATE ? p.x : q.ty - q.tx >= EMPATE ? p.y : 'empate';
    const tx = prom(v.map(q => q.tx)), ty = prom(v.map(q => q.ty));
    const g = v.map(gan), inconsistente = v.length === 2 && g[0] !== g[1] && g[0] !== 'empate' && g[1] !== 'empate';
    const ganador = inconsistente ? 'empate' : (tx - ty >= EMPATE ? p.x : ty - tx >= EMPATE ? p.y : 'empate');
    const iaDistinta = v.some(q => q.ia !== gan(q));
    pares.push(Object.assign(p, {estado: v.length < p.esperadas ? 'parcial' : 'listo', tx, ty, ganador, inconsistente, iaDistinta}));
    [[p.x, tx, 'x'], [p.y, ty, 'y']].forEach(([id, t, lado]) => {
      const s = est[id]; if(!s) return;
      s.totales.push(t);
      v.forEach(q => q.cats.forEach(c => { (s.cat[c.id] = s.cat[c.id] || []).push(c[lado]); }));
    });
    if(ganador === 'empate'){ est[p.x].e++; est[p.y].e++; est[p.x].puntos += .5; est[p.y].puntos += .5; }
    else { const perd = ganador === p.x ? p.y : p.x; est[ganador].g++; est[perd].p++; est[ganador].puntos += 1; }
  });
  const ranking = Object.values(est).map(s => Object.assign(s, {promedio: prom(s.totales), catProm: Object.fromEntries(Object.entries(s.cat).map(([k, a]) => [k, prom(a)]))}))
    .sort((a, b) => b.puntos - a.puntos || (b.promedio || 0) - (a.promedio || 0));
  return {F, pares, ranking, completos: pares.length > 0 && pares.every(p => p.estado === 'listo')};
}

/* ======================= Vistas ======================= */
const VISTAS = ['vacante', 'cvs', 'ats', 'comparacion', 'reporte'];
const vista = () => { const h = location.hash.slice(1); return VISTAS.includes(h) ? h : 'vacante'; };
function pintar(){
  const v = vista();
  VISTAS.forEach(x => { document.getElementById('v-' + x).hidden = x !== v; });
  document.querySelectorAll('nav.pasos a').forEach(a => a.setAttribute('aria-current', a.dataset.v === v ? 'page' : 'false'));
  ({vacante: pVacante, cvs: pCVs, ats: pATS, comparacion: pComparacion, reporte: pReporte})[v]();
}
window.addEventListener('hashchange', () => { pintar(); window.scrollTo(0, 0); });

/* ---------- 1. Vacante y prompt ---------- */
let FP = null, fpError = '', fichaSel = '', confirmaFicha = false;
function pVacante(){
  const el = $('#v-vacante'), v = S.vacante, tot = sum(v.categorias.map(c => Number(c.puntos) || 0)), probs = problemasVacante();
  if(!fichaSel) fichaSel = new URLSearchParams(location.search).get('ficha') || v.fichaId || '';
  el.innerHTML =
    '<div class="banda" id="bandaFicha">' + htmlFicha() + '</div>' +
    '<div class="banda"><div><h2>Contexto de la vacante</h2><p class="muted small">Lo que la IA necesita saber del puesto para comparar: qué hace, cómo se mide el éxito y qué se valora en tu empresa.</p></div>' +
      '<div class="campo"><label for="f_puesto">Puesto</label><input id="f_puesto" value="' + esc(v.puesto) + '"></div>' +
      '<div class="campo"><label for="f_contexto">Contexto</label><textarea id="f_contexto" rows="7">' + esc(v.contexto) + '</textarea></div></div>' +
    '<div class="banda"><div><h2>Categorías, puntos y niveles</h2><p class="muted small">Entre 3 y 8 categorías que sumen 100 puntos. Cada una tiene seis niveles; los rangos de puntos se calculan solos con los puntos de la categoría.</p></div>' +
      '<div id="cats" style="display:grid;gap:12px">' + v.categorias.map(htmlCat).join('') + '</div>' +
      '<div class="acciones"><button class="btn" type="button" id="btnAgregarCat"' + (v.categorias.length >= 8 ? ' disabled' : '') + '>+ Categoría</button><span class="small" id="sumaPts">' + htmlSuma(tot) + '</span></div></div>' +
    '<div class="banda"><div><h2>Instrucciones para la IA</h2><p class="muted small">Una por renglón. Se numeran solas en el prompt.</p></div>' +
      '<div class="campo"><label for="f_instr">Instrucciones</label><textarea id="f_instr" rows="6">' + esc(v.instrucciones) + '</textarea></div></div>' +
    '<div class="banda"><div><h2>Prompt que recibirá la IA</h2><p class="muted small">Se arma con lo de arriba. En cada duelo la IA lo recibe junto con dos CVs anónimos.</p></div>' +
      '<div id="probsVacante">' + htmlProbs(probs) + '</div>' +
      '<pre class="prompt" id="promptFinal">' + esc(promptTexto()) + '</pre>' +
      '<div class="acciones"><button class="btn" type="button" id="btnCopiar">Copiar el prompt</button><a class="btn pri" href="#cvs">Siguiente: CVs →</a></div></div>';
  const refrescar = () => { $('#promptFinal').textContent = promptTexto(); $('#probsVacante').innerHTML = htmlProbs(problemasVacante()); $('#sumaPts').innerHTML = htmlSuma(sum(v.categorias.map(c => Number(c.puntos) || 0))); };
  $('#f_puesto').oninput = e => { v.puesto = e.target.value; guardar(); refrescar(); };
  $('#f_contexto').oninput = e => { v.contexto = e.target.value; guardar(); refrescar(); };
  $('#f_instr').oninput = e => { v.instrucciones = e.target.value; guardar(); refrescar(); };
  el.querySelectorAll('[data-cat]').forEach(x => x.oninput = () => {
    const c = v.categorias[Number(x.dataset.i)], k = x.dataset.cat;
    if(k === 'puntos'){ c.puntos = Math.max(0, Math.min(60, Math.round(Number(x.value) || 0))); const rg = rangos(c.puntos); el.querySelectorAll('[data-rango="' + x.dataset.i + '"]').forEach((s, n) => { s.textContent = rg[n][0] + '–' + rg[n][1]; }); }
    else if(k === 'nivel') c.niveles[Number(x.dataset.n)] = x.value;
    else c[k] = x.value;
    guardar(); refrescar();
  });
  el.querySelectorAll('[data-quitar]').forEach(b => b.onclick = () => { v.categorias.splice(Number(b.dataset.quitar), 1); guardar(); pVacante(); });
  $('#btnAgregarCat').onclick = () => { const n = Math.max(0, ...v.categorias.map(c => Number(c.id.slice(1)) || 0)) + 1; v.categorias.push(catVacia(n)); guardar(); pVacante(); };
  $('#btnCopiar').onclick = async () => { try{ await navigator.clipboard.writeText(promptTexto()); $('#btnCopiar').textContent = 'Copiado'; }catch(e){ $('#btnCopiar').textContent = 'Selecciona el texto y cópialo'; } };
  conectarFicha();
  if(!FP && !fpError && FPZ) FPZ.cargar().then(d => { FP = d; repintarFicha(); }).catch(e => { fpError = e.message || 'sin conexión'; repintarFicha(); });
}
const htmlSuma = t => t === 100 ? 'Los puntos suman 100.' : '<span class="pill warn">Los puntos suman ' + t + '; deben sumar 100.</span>';
const htmlProbs = p => p.length ? '<p class="aviso warn">' + p.map(esc).join(' ') + '</p>' : '<p class="aviso ok">El prompt está completo.</p>';
function htmlCat(c, i){
  const rg = rangos(c.puntos);
  return '<div class="cat"><div class="cat-cab"><span class="n">' + (i + 1) + ')</span>' +
    '<div class="campo"><label for="cn_' + i + '">Categoría</label><input id="cn_' + i + '" data-cat="nombre" data-i="' + i + '" value="' + esc(c.nombre) + '"></div>' +
    '<div class="campo pts"><label for="cp_' + i + '">Puntos</label><input id="cp_' + i + '" type="number" min="' + MIN_PTS + '" max="60" data-cat="puntos" data-i="' + i + '" value="' + esc(c.puntos) + '"></div>' +
    '<button class="btn mini quitar" type="button" data-quitar="' + i + '"' + (S.vacante.categorias.length <= 3 ? ' disabled' : '') + '>Quitar</button></div>' +
    '<div class="campo"><label for="cq_' + i + '">Por qué importa en esta vacante</label><input id="cq_' + i + '" data-cat="porque" data-i="' + i + '" value="' + esc(c.porque) + '"></div>' +
    '<div class="niveles">' + NIVELES.map((n, k) => '<label for="cv_' + i + '_' + k + '">' + n + ' <span class="num" data-rango="' + i + '">' + rg[k][0] + '–' + rg[k][1] + '</span></label><input id="cv_' + i + '_' + k + '" data-cat="nivel" data-n="' + k + '" data-i="' + i + '" value="' + esc(c.niveles[k]) + '">').join('') + '</div></div>';
}
function fichaActual(){ return FP ? (FP.fichas.find(f => f.id === fichaSel) || FP.fichas[0]) : null; }
function htmlFicha(){
  const head = '<div><h2>¿De dónde partes?</h2><p class="muted small">Rellena la vacante con la ficha de un puesto (sus competencias se vuelven las categorías y sus habilidades las palabras del filtro ATS) o empieza en blanco. Todo queda editable.</p></div>';
  if(!FP) return head + (fpError ? '<p class="aviso warn">No se pudieron cargar las fichas de puesto (' + esc(fpError) + '). Puedes llenar la vacante a mano.</p>' : '<p class="muted small">Cargando las fichas de puesto…</p>') + '<div class="acciones"><button class="btn" type="button" id="fp_blanco">Empezar en blanco</button></div>';
  const f = fichaActual(), secs = FPZ.sectores(FP); fichaSel = f.id;
  return head + '<div class="grid2"><div class="campo"><label for="fp_sector">Sector</label><select id="fp_sector">' + secs.map(([s]) => '<option' + (s === f.sector ? ' selected' : '') + '>' + esc(s) + '</option>').join('') + '</select></div>' +
    '<div class="campo"><label for="fp_puesto">Puesto</label><select id="fp_puesto">' + secs.find(x => x[0] === f.sector)[1].map(x => '<option value="' + esc(x.id) + '"' + (x.id === f.id ? ' selected' : '') + '>' + esc(x.puesto) + '</option>').join('') + '</select></div></div>' +
    '<p class="small"><strong>' + esc(f.puesto) + '.</strong> ' + esc(f.panel.descripcion) + ' <a href="fichas-puestos.html#' + esc(f.id) + '" target="_blank" rel="noopener">Ver la ficha</a></p>' +
    (confirmaFicha ? '<p class="aviso warn">Esto reemplaza el puesto, el contexto, las categorías y las palabras deseables del filtro ATS. Las comparaciones hechas con el prompt anterior ya no contarán.</p><div class="acciones"><button class="btn pri" type="button" id="fp_si">Sí, reemplazar</button><button class="btn" type="button" id="fp_no">Cancelar</button></div>'
      : '<div class="acciones"><button class="btn pri" type="button" id="fp_usar">Rellenar con esta ficha</button><button class="btn" type="button" id="fp_blanco">Empezar en blanco</button></div>');
}
function vacanteVacia(){ const v = S.vacante; return !v.puesto.trim() && !v.contexto.trim() && v.categorias.every(c => !c.nombre.trim()); }
function usarFicha(){
  const f = fichaActual(), d = vacanteDeFicha(f);
  Object.assign(S.vacante, {puesto: d.puesto, contexto: d.contexto, fichaId: d.fichaId, categorias: d.categorias, instrucciones: d.instrucciones});
  S.ats.deseables = d.atsDeseables; S.reporte = null; confirmaFicha = false; guardar(); pVacante();
}
function conectarFicha(){
  const b = $('#bandaFicha'), q = s => b.querySelector(s);
  if(q('#fp_sector')) q('#fp_sector').onchange = e => { fichaSel = FPZ.sectores(FP).find(x => x[0] === e.target.value)[1][0].id; confirmaFicha = false; repintarFicha(); };
  if(q('#fp_puesto')) q('#fp_puesto').onchange = e => { fichaSel = e.target.value; confirmaFicha = false; repintarFicha(); };
  if(q('#fp_usar')) q('#fp_usar').onclick = () => { if(vacanteVacia()) usarFicha(); else { confirmaFicha = true; repintarFicha(); } };
  if(q('#fp_si')) q('#fp_si').onclick = usarFicha;
  if(q('#fp_no')) q('#fp_no').onclick = () => { confirmaFicha = false; repintarFicha(); };
  if(q('#fp_blanco')) q('#fp_blanco').onclick = () => { const n = estadoNuevo(); S.vacante = n.vacante; S.reporte = null; guardar(); pVacante(); };
}
function repintarFicha(){ const b = $('#bandaFicha'); if(!b) return; b.innerHTML = htmlFicha(); conectarFicha(); }

/* ---------- 2. CVs ---------- */
let msgCarga = '';
function pCVs(){
  const el = $('#v-cvs');
  el.innerHTML = '<div class="banda"><div><h2>Agrega los CVs</h2><p class="muted small">PDF (con texto, no escaneado), Word .docx o texto. Se leen en tu navegador. Antes de guardarlos se ocultan nombre, correo, teléfono, enlaces, edad, fecha de nacimiento, domicilio, CURP, RFC, estado civil y género. Revisa cada uno: el filtro automático puede dejar pasar algo.</p></div>' +
      '<div class="grid2"><div class="campo"><label for="f_archivos">Archivos</label><input id="f_archivos" type="file" multiple accept=".pdf,.docx,.txt,.md"></div>' +
      '<div class="campo"><label for="f_nombre">Nombre de la persona del CV pegado (solo para ocultarlo; no se guarda)</label><input id="f_nombre" autocomplete="off"></div></div>' +
      '<div class="campo"><label for="f_pegar">O pega el texto de un CV</label><textarea id="f_pegar" rows="5"></textarea></div>' +
      '<div class="acciones"><button class="btn pri" type="button" id="btnPegar">Agregar CV pegado</button><button class="btn" type="button" id="btnEjemplo">Cargar 6 CVs de ejemplo (ficticios)</button>' + (S.cvs.length ? '<button class="btn" type="button" id="btnBorrarCVs">Quitar todos</button>' : '') + '</div>' +
      '<div id="msgCarga">' + msgCarga + '</div></div>' +
    '<div class="banda"><div class="acciones" style="justify-content:space-between"><h2>' + S.cvs.length + ' CVs</h2>' + (S.cvs.length ? '<a class="btn pri" href="#ats">Siguiente: filtro ATS →</a>' : '') + '</div>' +
      (S.cvs.length ? S.cvs.map((c, i) => '<div class="cv"><div class="cab"><strong>' + esc(c.id) + '</strong><span class="acciones"><span class="pill' + (c.ocultos ? ' acc' : '') + '">' + c.ocultos + ' datos ocultos</span>' + (c.recortado ? '<span class="pill warn">Recortado a 10,000 caracteres</span>' : '') +
        '<button class="btn mini" type="button" data-ver="' + i + '">Ver y corregir</button><button class="btn mini" type="button" data-borrar="' + i + '">Quitar</button></span></div>' +
        '<div class="small muted">' + conMarcas(c.texto.slice(0, 220)) + (c.texto.length > 220 ? '…' : '') + '</div>' +
        '<div id="ed_' + i + '" hidden><textarea data-edita="' + i + '" rows="10" aria-label="Texto del ' + esc(c.id) + '">' + esc(c.texto) + '</textarea><p class="small muted">Borra a mano lo que todavía identifique a la persona. Los cambios se guardan solos.</p></div></div>').join('')
      : '<p class="muted">Todavía no hay CVs.</p>') + '</div>';
  $('#f_archivos').onchange = async e => {
    const fs = [...e.target.files]; if(!fs.length) return;
    const out = [];
    for(const f of fs){
      try{ const r = agregarCV(await textoDeArchivo(f), '', f.name); out.push(r.error ? '<li>' + esc(f.name) + ': ' + esc(r.error) + '</li>' : '<li>' + esc(f.name) + ' → ' + esc(r.id) + '</li>'); }
      catch(er){ out.push('<li>' + esc(f.name) + ': ' + esc(er.message || 'no se pudo leer') + '</li>'); }
    }
    guardar(); msgCarga = '<div class="aviso"><ul style="margin:0;padding-left:18px">' + out.join('') + '</ul></div>'; pCVs();
  };
  $('#btnPegar').onclick = () => {
    const r = agregarCV($('#f_pegar').value, $('#f_nombre').value, '');
    msgCarga = r.error ? '<p class="aviso warn">El CV ' + esc(r.error) + '.</p>' : '<p class="aviso ok">Se agregó ' + esc(r.id) + '.</p>';
    guardar(); pCVs();
  };
  $('#btnEjemplo').onclick = () => { EJEMPLOS.forEach(([n, t]) => agregarCV(t, n, '')); msgCarga = '<p class="aviso">Se agregaron 6 CVs ficticios para una vacante de contador. Para probarlos, en el paso 1 elige la ficha Finanzas → Contador.</p>'; guardar(); pCVs(); };
  if($('#btnBorrarCVs')) $('#btnBorrarCVs').onclick = function(){ if(this.dataset.ok){ S.cvs = []; S.duelos = {}; S.reporte = null; guardar(); msgCarga = ''; pCVs(); } else { this.dataset.ok = '1'; this.textContent = 'Confirmar: quitar todos'; } };
  el.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => { const d = $('#ed_' + b.dataset.ver); d.hidden = !d.hidden; });
  el.querySelectorAll('[data-borrar]').forEach(b => b.onclick = () => { S.cvs.splice(Number(b.dataset.borrar), 1); guardar(); pCVs(); });
  el.querySelectorAll('[data-edita]').forEach(t => t.oninput = () => { S.cvs[Number(t.dataset.edita)].texto = t.value; guardar(); });
}

/* ---------- 3. Filtro ATS ---------- */
function pATS(){
  const el = $('#v-ats'), res = S.cvs.map(c => ({c, a: ats(c)})), F = new Set(finalistas().map(c => c.id)), pasan = res.filter(x => x.a.entra).length;
  el.innerHTML = '<div class="banda"><div><h2>Filtro ATS</h2><p class="muted small">Sin IA: busca palabras en el texto del CV. Una por renglón; «a|b» acepta cualquiera de las dos y un * al final acepta variantes («contab*» cubre contable y contabilidad). Un ATS deja fuera a gente buena que escribe distinto: pide solo lo indispensable y revisa a los que no pasan.</p></div>' +
      '<div class="grid2"><div class="campo"><label for="a_obl">Indispensables (si falta una, no pasa)</label><textarea id="a_obl" rows="5" placeholder="contab*|contador">' + esc(S.ats.obligatorias) + '</textarea></div>' +
      '<div class="campo"><label for="a_des">Deseables (cuentan para el porcentaje)</label><textarea id="a_des" rows="5">' + esc(S.ats.deseables) + '</textarea></div></div>' +
      '<div class="grid2"><div class="campo"><label for="a_umbral">Porcentaje mínimo de deseables</label><input id="a_umbral" type="number" min="0" max="100" value="' + esc(S.ats.umbral) + '"></div>' +
      '<div class="campo"><label for="a_fin">Finalistas que pasan a la comparación (2 a ' + MAX_FINALISTAS + ')</label><input id="a_fin" type="number" min="2" max="' + MAX_FINALISTAS + '" value="' + esc(S.ats.finalistas) + '"></div></div>' +
      '<p class="small muted">Con ' + F.size + ' finalistas hay ' + (F.size * (F.size - 1) / 2) + ' pares' + (S.config.dobleVuelta ? ' y ' + F.size * (F.size - 1) + ' llamadas a la IA (cada par en los dos órdenes)' : '') + '.</p></div>' +
    '<div class="banda"><div class="acciones" style="justify-content:space-between"><h2>' + pasan + ' de ' + S.cvs.length + ' pasan · ' + F.size + ' a la comparación</h2>' + (F.size >= 2 ? '<a class="btn pri" href="#comparacion">Siguiente: comparación →</a>' : '') + '</div>' +
      (S.cvs.length ? '<div class="tabla-c"><table><thead><tr><th>CV</th><th>Indispensables</th><th>Deseables</th><th style="min-width:140px">Coincidencia</th><th>Resultado</th><th class="c">Compara</th></tr></thead><tbody>' +
        res.map(({c, a}, i) => '<tr><td><strong>' + esc(c.id) + '</strong></td><td>' + (a.obl.length ? a.obl.map(x => '<span class="kw ' + (x.si ? 'si' : 'no') + '">' + esc(x.k) + '</span>').join('') : '<span class="muted small">—</span>') + '</td>' +
          '<td>' + (a.des.length ? a.des.map(x => '<span class="kw ' + (x.si ? 'si' : '') + '">' + esc(x.k) + '</span>').join('') : '<span class="muted small">—</span>') + '</td>' +
          '<td><div class="barra"><i style="width:' + a.pct + '%"></i></div><span class="num small">' + a.pct + ' %</span></td>' +
          '<td>' + (a.pasa ? '<span class="pill ok">Pasa</span>' : (a.entra ? '<span class="pill acc">Pasa a mano</span>' : '<span class="pill bad">No pasa</span>')) +
            (!a.pasa ? '<div class="campo" style="margin-top:6px"><label for="fz_' + i + '">Pasar a mano: razón</label><input id="fz_' + i + '" data-forzar="' + i + '" value="' + esc(c.forzado ? c.forzado.razon : '') + '" placeholder="Ej. dice «registros contables» en vez de contabilidad"></div>' : '') + '</td>' +
          '<td class="c">' + (a.entra ? '<input type="checkbox" data-incluir="' + i + '"' + (F.has(c.id) ? ' checked' : '') + ' aria-label="Comparar ' + esc(c.id) + '">' : '') + '</td></tr>').join('') + '</tbody></table></div>'
        : '<p class="muted">Agrega CVs en el paso 2.</p>') +
      (F.size > MAX_FINALISTAS ? '<p class="aviso warn">Máximo ' + MAX_FINALISTAS + ' finalistas.</p>' : '') + '</div>';
  const cambio = () => { guardar(); pATS(); };
  $('#a_obl').onchange = e => { S.ats.obligatorias = e.target.value; cambio(); };
  $('#a_des').onchange = e => { S.ats.deseables = e.target.value; cambio(); };
  $('#a_umbral').onchange = e => { S.ats.umbral = Math.max(0, Math.min(100, Number(e.target.value) || 0)); cambio(); };
  $('#a_fin').onchange = e => { S.ats.finalistas = Math.max(2, Math.min(MAX_FINALISTAS, Number(e.target.value) || 6)); S.cvs.forEach(c => { c.incluir = null; }); cambio(); };
  el.querySelectorAll('[data-forzar]').forEach(x => x.onchange = () => { const c = S.cvs[Number(x.dataset.forzar)]; c.forzado = x.value.trim() ? {razon: x.value.trim(), fecha: new Date().toISOString().slice(0, 10)} : null; cambio(); });
  el.querySelectorAll('[data-incluir]').forEach(x => x.onchange = () => {
    const c = S.cvs[Number(x.dataset.incluir)];
    if(x.checked && finalistas().length >= MAX_FINALISTAS){ x.checked = false; return; }
    c.incluir = x.checked; cambio();
  });
}

/* ---------- 4. Comparación ---------- */
function pProgreso(){
  const p = $('#progreso'); if(!p) return;
  const rs = corridas(), hechos = rs.filter(vigente).length, fallas = rs.filter(r => { const d = S.duelos[r.clave]; return d && d.firma === r.firma && !d.ok; }).length;
  p.innerHTML = '<div class="barra"><i style="width:' + (rs.length ? Math.round(hechos / rs.length * 100) : 0) + '%"></i></div><span class="small"><span class="num">' + hechos + '</span> de <span class="num">' + rs.length + '</span> comparaciones' + (fallas ? ' · ' + fallas + ' con error' : '') + (corriendo ? ' · comparando…' : '') + '</span>';
}
function pComparacion(){
  const el = $('#v-comparacion'), F = finalistas(), probs = problemasVacante(), rs = corridas(), faltan = rs.filter(r => !vigente(r)).length;
  const listo = !probs.length && F.length >= 2 && F.length <= MAX_FINALISTAS;
  el.innerHTML = '<div class="banda"><div><h2>Comparación por pares con IA</h2><p class="muted small">La IA recibe el prompt de la vacante y dos CVs anónimos a la vez, califica a los dos en cada categoría con una cita de cada CV y dice cuál se adecua mejor. Gana el duelo quien suma más puntos (con ' + EMPATE + ' o más de diferencia; si no, empate). El ranking es por duelos ganados.</p></div>' +
      '<p><strong>Finalistas:</strong> ' + (F.length ? F.map(c => esc(c.id)).join(', ') : 'ninguno todavía (paso 3)') + '</p>' +
      (probs.length ? '<p class="aviso warn">Antes de comparar, completa el prompt en el paso 1: ' + probs.map(esc).join(' ') + '</p>' : '') +
      '<label class="small"><input type="checkbox" id="c_doble"' + (S.config.dobleVuelta ? ' checked' : '') + '> Repetir cada duelo con el orden invertido (más confiable: si las dos vueltas no coinciden, cuenta como empate; el doble de llamadas)</label>' +
      '<label class="small"><input type="checkbox" id="c_acepto"' + (S.config.acepto ? ' checked' : '') + '> Revisé los CVs y ya no se ven nombres, contactos ni otros datos personales. Acepto que su texto se envíe a la IA del Club (Claude) para compararlos; el servidor no lo guarda.</label>' +
      '<div id="progreso" style="display:grid;gap:6px"></div>' +
      '<div class="acciones">' + (corriendo ? '<button class="btn" type="button" id="btnDetener">Detener</button>'
        : '<button class="btn pri" type="button" id="btnComparar"' + (listo && S.config.acepto && faltan ? '' : ' disabled') + '>' + (!faltan && rs.length ? 'Todo comparado' : faltan === rs.length ? 'Comparar los ' + rs.length + ' duelos' : 'Comparar los ' + faltan + ' que faltan') + '</button>') +
        (rs.length && !faltan ? '<a class="btn pri" href="#reporte">Ver el reporte →</a>' : '') + '</div>' +
      (msgIA ? '<p class="aviso ' + msgTipo + '" id="msgIA">' + esc(msgIA) + '</p>' : '') + '</div>' + htmlMatriz(resultados());
  pProgreso();
  $('#c_doble').onchange = e => { S.config.dobleVuelta = e.target.checked; guardar(); pComparacion(); };
  $('#c_acepto').onchange = e => { S.config.acepto = e.target.checked; guardar(); pComparacion(); };
  if($('#btnComparar')) $('#btnComparar').onclick = correrDuelos;
  if($('#btnDetener')) $('#btnDetener').onclick = () => { detener = true; };
}
function htmlMatriz(R){
  if(R.F.length < 2 || !R.pares.some(p => p.estado !== 'pendiente')) return '';
  const par = (a, b) => R.pares.find(p => (p.x === a && p.y === b) || (p.x === b && p.y === a));
  return '<div class="banda"><div><h2>Cara a cara</h2><p class="muted small">Cada celda es el resultado del CV de la fila contra el de la columna, con el promedio de puntos de cada uno. <span class="g">G</span> ganó, <span class="p">P</span> perdió, <span class="e">E</span> empate; ⚠ las dos vueltas no coincidieron.</p></div>' +
    '<div class="tabla-c"><table class="matriz"><thead><tr><th></th>' + R.ranking.map(s => '<th>' + esc(s.id) + '</th>').join('') + '<th>Puntos</th></tr></thead><tbody>' +
    R.ranking.map(s => '<tr><th>' + esc(s.id) + '</th>' + R.ranking.map(o => {
      if(o.id === s.id) return '<td class="yo"></td>';
      const p = par(s.id, o.id);
      if(!p || p.estado === 'pendiente') return '<td class="muted">…</td>';
      const mio = p.x === s.id ? p.tx : p.ty, suyo = p.x === s.id ? p.ty : p.tx;
      const r = p.ganador === 'empate' ? '<span class="e">E</span>' : p.ganador === s.id ? '<span class="g">G</span>' : '<span class="p">P</span>';
      return '<td>' + r + ' <span class="num small">' + Math.round(mio) + '–' + Math.round(suyo) + '</span>' + (p.inconsistente ? ' ⚠' : '') + '</td>';
    }).join('') + '<td class="num">' + r1(s.puntos) + '</td></tr>').join('') + '</tbody></table></div></div>';
}

/* ---------- 5. Reporte ---------- */
let msgRep = '', generando = false, confirmaSJ = false;
function resumenParaIA(R){
  const cats = S.vacante.categorias, out = [];
  out.push('Puesto: ' + S.vacante.puesto, 'Finalistas comparados: ' + R.F.length + '; duelos con ' + (S.config.dobleVuelta ? 'doble vuelta' : 'una vuelta') + '.', '', 'RANKING (por duelos ganados; empate vale medio punto):');
  R.ranking.forEach((s, i) => out.push((i + 1) + '. ' + s.id + ' — ' + s.g + ' ganados, ' + s.e + ' empates, ' + s.p + ' perdidos; promedio ' + r1(s.promedio) + ' de 100. Por categoría: ' + cats.map(c => c.nombre + ' ' + r1(s.catProm[c.id]) + '/' + c.puntos).join('; ') + '.'));
  out.push('', 'DUELOS (razón de la IA y evidencia citada):');
  R.pares.filter(p => p.estado !== 'pendiente').forEach(p => {
    out.push('- ' + p.x + ' vs ' + p.y + ': ' + (p.ganador === 'empate' ? 'empate' : 'gana ' + p.ganador) + ' (' + Math.round(p.tx) + '–' + Math.round(p.ty) + ')' + (p.inconsistente ? ', las dos vueltas no coincidieron' : '') + '. ' + (p.vueltas[0].razon || ''));
    p.vueltas[0].cats.forEach(c => { const n = (cats.find(k => k.id === c.id) || {}).nombre || c.id; if(c.ex || c.ey) out.push('  · ' + n + ': ' + p.x + ' «' + c.ex + '»; ' + p.y + ' «' + c.ey + '»'); });
  });
  return out.join('\n').slice(0, 29000);
}
async function generarReporte(){
  const R = resultados();
  if(!IA_URL){ msgRep = 'En una copia local no se llama a la IA del Club.'; pReporte(); return; }
  generando = true; msgRep = ''; pReporte();
  try{
    const d = await pedir({tipo: 'reporte', rubrica: promptTexto(), categorias: categoriasIA(), resumen: resumenParaIA(R)});
    S.reporte = {fecha: new Date().toISOString().slice(0, 10), firma: firma(resumenParaIA(R)), ia: d}; guardar();
  }catch(e){ msgRep = e.code === 'no_activa' ? 'El reporte con IA todavía no está activo en el servidor del Club. Las tablas de abajo sí valen.' : 'No se pudo generar el reporte. Intenta de nuevo en un momento.'; }
  generando = false; pReporte();
}
function aSeleccion(R){
  const v = S.vacante, ids = v.categorias.map((c, i) => 'k' + (i + 1));
  const f = FP && v.fichaId ? FP.fichas.find(x => x.id === v.fichaId) : null;
  const metodos = {};
  [['cv', 20], ['prueba', 25], ['muestra', 30], ['entrevista', 25]].forEach(([m, p]) => { metodos[m] = {peso: f ? f.metodos.pesos[m] : p, comps: ids.slice(), guia: m === 'cv' || !f ? '' : f.metodos[m]}; });
  const porId = Object.fromEntries(S.cvs.map(c => [c.id, c]));
  return {
    vacante: {puesto: v.puesto, listaCorta: Math.min(4, R.ranking.length), evaluadores: 2, origen: 'comparar-cvs',
      competencias: v.categorias.map((c, i) => ({id: ids[i], nombre: c.nombre, peso: Number(c.puntos), n1: c.niveles[5], n3: c.niveles[3], n5: c.niveles[0]})), metodos},
    candidatos: R.ranking.map(s => ({id: s.id, perfil: porId[s.id].texto, grupo: {}, cal: {}})),
    decisiones: {}
  };
}
function pReporte(){
  const el = $('#v-reporte'), R = resultados(), cats = S.vacante.categorias, rep = S.reporte && S.reporte.ia;
  if(!R.pares.some(p => p.estado !== 'pendiente')){
    el.innerHTML = '<div class="banda"><h2>Reporte</h2><p class="muted">Todavía no hay comparaciones. Haz el paso 4.</p></div>'; return;
  }
  const viejo = S.reporte && S.reporte.firma !== firma(resumenParaIA(R));
  const top = R.ranking[0];
  el.innerHTML = '<div class="banda"><div class="acciones" style="justify-content:space-between"><div><h2>Reporte de la comparación</h2><p class="muted small">' + esc(S.vacante.puesto) + ' · ' + R.F.length + ' finalistas de ' + S.cvs.length + ' CVs · ' + new Date().toLocaleDateString('es-MX') + '</p></div>' +
      '<div class="acciones no-imprimir"><button class="btn" type="button" id="btnImprimir">Imprimir</button></div></div>' +
      (!R.completos ? '<p class="aviso warn">Faltan duelos por comparar; el ranking puede cambiar.</p>' : '') +
      '<div class="k"><div class="cifra"><span class="lbl">CVs recibidos</span><b>' + S.cvs.length + '</b></div><div class="cifra"><span class="lbl">Pasaron el ATS</span><b>' + S.cvs.filter(c => ats(c).entra).length + '</b></div><div class="cifra"><span class="lbl">Finalistas</span><b>' + R.F.length + '</b></div><div class="cifra"><span class="lbl">Primer lugar</span><b>' + esc(top.id) + '</b></div></div></div>' +
    '<div class="banda"><div><h2>Ranking</h2><p class="muted small">Por duelos ganados (empate = medio punto); si empatan, por el promedio de puntos de la rúbrica en sus duelos.</p></div><div class="tabla-c"><table id="tablaRanking"><thead><tr><th>#</th><th>CV</th><th class="c">Ganados</th><th class="c">Empates</th><th class="c">Perdidos</th><th class="c">Promedio /100</th>' + cats.map(c => '<th class="c">' + esc(c.nombre) + ' /' + c.puntos + '</th>').join('') + '</tr></thead><tbody>' +
      R.ranking.map((s, i) => '<tr><td class="num">' + (i + 1) + '</td><td style="white-space:nowrap"><strong>' + esc(s.id) + '</strong></td><td class="c num">' + s.g + '</td><td class="c num">' + s.e + '</td><td class="c num">' + s.p + '</td><td class="c num">' + r1(s.promedio) + '</td>' + cats.map(c => '<td class="c num">' + r1(s.catProm[c.id]) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div></div>' +
    htmlMatriz(R) +
    '<div class="banda"><div><h2>Reporte escrito por la IA</h2><p class="muted small">La IA explica el ranking con la evidencia de los duelos; no lo cambia. Es una lectura para decidir a quién entrevistar, no una decisión de contratación.</p></div>' +
      (rep ? htmlReporteIA(rep) + (viejo ? '<p class="aviso warn">Los resultados cambiaron después de este reporte; vuelve a generarlo.</p>' : '') : '') +
      '<div class="acciones no-imprimir"><button class="btn pri" type="button" id="btnReporte"' + (generando || !S.config.acepto ? ' disabled' : '') + '>' + (generando ? 'Escribiendo…' : rep ? 'Volver a generar' : 'Generar el reporte con IA') + '</button>' + (!S.config.acepto ? '<span class="small muted">Marca la casilla del paso 4.</span>' : '') + '</div>' +
      (msgRep ? '<p class="aviso warn" id="msgRep">' + esc(msgRep) + '</p>' : '') + '</div>' +
    '<div class="banda"><div><h2>Detalle de cada duelo</h2></div>' + R.pares.filter(p => p.estado !== 'pendiente').map(p => {
      const v = p.vueltas[0];
      return '<details class="duelo"><summary>' + esc(p.x) + ' vs ' + esc(p.y) + ': ' + (p.ganador === 'empate' ? 'empate' : 'gana ' + esc(p.ganador)) + ' <span class="num small">' + Math.round(p.tx) + '–' + Math.round(p.ty) + '</span>' + (p.inconsistente ? ' ⚠ las vueltas no coincidieron' : '') + (p.iaDistinta ? ' · la IA opinó distinto en alguna vuelta' : '') + '</summary>' +
        p.vueltas.map(q => '<p class="small" style="margin-top:8px"><strong>' + esc(q.orden) + ':</strong> ' + esc(q.razon) + '</p>' + (q.alertas.length ? '<p class="aviso warn small">' + q.alertas.map(esc).join(' ') + '</p>' : '')).join('') +
        '<div class="tabla-c"><table><thead><tr><th>Categoría</th><th class="c">' + esc(p.x) + '</th><th class="c">' + esc(p.y) + '</th><th>Evidencia de ' + esc(p.x) + '</th><th>Evidencia de ' + esc(p.y) + '</th><th>Diferencia</th></tr></thead><tbody>' +
        v.cats.map(c => '<tr><td>' + esc((cats.find(k => k.id === c.id) || {}).nombre || c.id) + '</td><td class="c num">' + c.x + '</td><td class="c num">' + c.y + '</td><td class="small">' + (c.ex ? '«' + esc(c.ex) + '»' : '—') + '</td><td class="small">' + (c.ey ? '«' + esc(c.ey) + '»' : '—') + '</td><td class="small">' + esc(c.com) + '</td></tr>').join('') + '</tbody></table></div></details>';
    }).join('') + '</div>' +
    '<div class="banda no-imprimir"><div><h2>Siguiente paso: Selección Justa</h2><p class="muted small">Lleva a los finalistas, con la vacante convertida en rúbrica, a Selección Justa para la prueba de competencias, la muestra de trabajo y la entrevista estructurada. La comparación de CVs no sustituye esos métodos.</p></div>' +
      (confirmaSJ ? '<p class="aviso warn">Esto reemplaza la vacante y los candidatos que tengas en Selección Justa en este navegador.</p><div class="acciones"><button class="btn pri" type="button" id="sj_si">Sí, llevar a Selección Justa</button><button class="btn" type="button" id="sj_no">Cancelar</button></div>'
        : '<div class="acciones"><button class="btn pri" type="button" id="btnSJ">Llevar los ' + R.ranking.length + ' finalistas a Selección Justa</button></div>') + '</div>';
  $('#btnImprimir').onclick = () => window.print();
  $('#btnReporte').onclick = generarReporte;
  const llevar = () => { try{ localStorage.setItem('cmb_seleccion_justa_v2', JSON.stringify(aSeleccion(R))); }catch(e){} location.href = 'seleccion.html#cv'; };
  if($('#btnSJ')) $('#btnSJ').onclick = () => { let hay = false; try{ hay = !!localStorage.getItem('cmb_seleccion_justa_v2'); }catch(e){} if(hay){ confirmaSJ = true; pReporte(); } else llevar(); };
  if($('#sj_si')) $('#sj_si').onclick = llevar;
  if($('#sj_no')) $('#sj_no').onclick = () => { confirmaSJ = false; pReporte(); };
}
function htmlReporteIA(r){
  const par = t => String(t || '').split(/\n+/).map(x => x.trim()).filter(Boolean).map(x => '<p>' + esc(x) + '</p>').join('');
  const ul = (t, a) => a && a.length ? '<div><span class="lbl">' + t + '</span><ul>' + a.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '';
  return '<div class="texto" id="repTexto">' + par(r.resumen) + '</div>' +
    (r.finalistas || []).map(f => '<div class="fin"><h3>' + esc(f.id) + '</h3>' + ul('Fortalezas', f.fortalezas) + ul('Riesgos', f.riesgos) + ul('Qué validar en la entrevista', f.validar) + '</div>').join('') +
    (r.comparacion ? '<div class="texto"><h3>En qué se distinguen</h3>' + par(r.comparacion) + '</div>' : '') +
    ((r.advertencias || []).length ? '<div class="aviso"><strong>Límites del análisis:</strong> ' + r.advertencias.map(esc).join(' ') + '</div>' : '');
}

/* ======================= CVs de ejemplo (ficticios) ======================= */
const EJEMPLOS = [
  ['Mariana López Ortega', 'Mariana López Ortega\nmariana.lopez@correo.com · 55 1234 5678 · 29 años · Casada\nContadora Pública (UNAM, 2019), cédula profesional.\nExperiencia\nContadora general, distribuidora de abarrotes (2021–2026): cierres mensuales en 5 días hábiles; bajé de 14 a 3 los ajustes de auditoría externa en dos años. Pagos provisionales de ISR e IVA y declaración anual sin multas. Concilio 12 cuentas bancarias al mes.\nAuxiliar contable, despacho (2019–2021): registro de pólizas, conciliaciones, CFDI.\nHerramientas: CONTPAQi, SAP Business One, Excel avanzado (tablas dinámicas, Power Query).\nCursos: Actualización fiscal 2026 (IMCP).'],
  ['José Ramírez Díaz', 'José Ramírez Díaz\nCel. 33 2222 1111 · Guadalajara, Jal.\nLicenciado en Contaduría (UdG, 2022).\nAuxiliar contable en agencia de autos (2022–2026). Registro de facturas, cuentas por pagar y apoyo en cierres. Conciliaciones bancarias de 3 cuentas.\nManejo de Excel intermedio y Aspel COI.\nMe considero responsable, puntual y con ganas de crecer.'],
  ['Fernanda Castillo Ruiz', 'Fernanda Castillo Ruiz\nfer.castillo@mail.com\nContadora pública con 8 años de experiencia.\nJefa de contabilidad en manufacturera (2020–2026): equipo de 4 auxiliares; implementé SAP S/4HANA en el módulo FI; reduje el cierre de 10 a 6 días. Dictamen fiscal con despacho externo sin observaciones 3 años seguidos. Estados financieros bajo NIF para el consejo.\nContadora en despacho (2018–2020): contabilidad de 25 clientes personas morales, declaraciones mensuales y anuales.\nInglés avanzado. Maestría en Impuestos (en curso).'],
  ['Luis Hernández Mora', 'Luis Hernández Mora\nluis.hm@correo.com · 81 3333 4444\nIngeniero industrial.\nSupervisor de producción (2019–2026): control de turnos, indicadores de productividad, inventarios de materia prima.\nExcel avanzado, Power BI.\nInterés en cambiar al área financiera.'],
  ['Ana Torres Vega', 'Ana Torres Vega\nana.torres@mail.com\nTécnica en contabilidad (CONALEP, 2020); estudiante de Contaduría (7.º semestre).\nAuxiliar de cuentas por cobrar (2021–2026): cartera de 180 clientes; bajé la cartera vencida de 22 % a 9 % en un año con llamadas y conciliación semanal. Registro de ingresos y facturación CFDI 4.0.\nExcel intermedio, CONTPAQi Contabilidad.'],
  ['Ricardo Gómez Salas', 'Ricardo Gómez Salas\nricardo.gs@correo.com · 55 9876 5432\nContador público (IPN, 2016), cédula.\nContador sr. en empresa de logística (2018–2026): contabilidad de 3 razones sociales, impuestos federales y locales, atención a revisiones del SAT (2 revisiones electrónicas cerradas sin crédito fiscal). Elaboro flujo de efectivo semanal para tesorería.\nAuxiliar contable (2016–2018).\nSAP, CONTPAQi, Excel avanzado.']
];

pintar();
window.__CMB_COMPARAR = {rangos, ocultar, nombresProbables, busca, resultados: () => resultados(), promptTexto};
})();
