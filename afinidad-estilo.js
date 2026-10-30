/* =====================================================================
   Afinidad de estilo (DISC) con un tipo de puesto
   =====================================================================

   Lo usan index.html (etiqueta en cada vacante) y el Mapa de carrera del
   proceso DIANA (agora/diana-mapa.js). Antes vivía dentro de index.html.

   Tres reglas que NO se rompen:
   1. Nunca esconde puestos ni vacantes. Es una etiqueta, no un filtro.
   2. Es orientación: un perfil no descalifica a nadie de un puesto.
   3. La correspondencia entre puesto y estilo es nuestra, hecha a mano sobre
      las categorías del pipeline. No sale de ningún estudio. Por eso se
      muestra como "afinidad de estilo" y nunca como una probabilidad.
   ===================================================================== */
window.AFINIDAD = (function(){

const ESTILO_PUESTO = [
  {re:/venta|comercial|asesor|ejecutiv|telemarketing|call center|comisionista|mostrador|retail|promotor/i, perfil:{D:2, I:3, S:0, C:0}},
  {re:/gerenc|gerente|direcci[oó]n|director|jefatura|jefe|supervisi[oó]n|supervisor|coordinaci[oó]n|coordinador/i, perfil:{D:3, I:1, S:1, C:1}},
  {re:/contabilidad|contador|fiscal|auditor|cumplimiento|compliance|calidad|an[aá]lisis|analista|anal[ií]tica|datos|business intelligence|financier|tesorer[ií]a|cr[eé]dito/i, perfil:{D:0, I:0, S:1, C:3}},
  {re:/legal|abogad|jur[ií]dic|notar|cobranza judicial|paralegal/i, perfil:{D:1, I:0, S:0, C:3}},
  {re:/ingenier|manufactura|procesos|dise[nñ]o|desarrollo de software|desarrollador|programador|infraestructura|soporte t[eé]cnico|inteligencia artificial|automatizaci[oó]n|sistemas/i, perfil:{D:0, I:0, S:1, C:3}},
  {re:/almac[eé]n|cedis|log[ií]stica|inventario|transporte|reparto|distribuci[oó]n|flota|producci[oó]n|operaci[oó]n|operador|mantenimiento|soldadura|maquinado|mec[aá]nic|t[eé]cnico/i, perfil:{D:0, I:0, S:3, C:2}},
  {re:/hoteler|recepci[oó]n|recepcionista|atenci[oó]n a clientes|alimentos y bebidas|banquete|reservacion|turismo|gu[ií]a|educaci[oó]n|capacitaci[oó]n|recursos humanos|reclut|eventos|concierge/i, perfil:{D:0, I:3, S:3, C:0}},
  {re:/administraci[oó]n|administrativo|asistente|auxiliar|secretar|archivo|control administrativo/i, perfil:{D:0, I:1, S:2, C:2}},
  {re:/compras|comprador|comercio exterior|aduana|importaci[oó]n|exportaci[oó]n/i, perfil:{D:1, I:1, S:1, C:2}}
];

/* Lleva los netos a pesos comparables de 0 a 1. Funciona igual con la escala
   bipolar del cuestionario de bloques (−48..+48) y con la positiva del de
   Ágora (0..82), porque solo mira la distancia entre los cuatro. */
function perfilNormalizado(p){
  const claves = ['D','I','S','C'];
  const vals = claves.map(k => (p[k] && typeof p[k].neto === 'number') ? p[k].neto : 0);
  const min = Math.min(...vals), rango = Math.max(...vals) - min;
  const out = {};
  claves.forEach((k, i) => { out[k] = rango ? (vals[i] - min) / rango : 0.5; });
  return out;
}

/* El estilo que suele pedir un puesto, a partir de su texto (título,
   categoría, sector). null si no lo sabemos. */
function estiloDeTexto(texto){
  for(const regla of ESTILO_PUESTO){ if(regla.re.test(texto || '')) return regla.perfil; }
  return null;
}

/* Afinidad 0..1 entre el estilo de la persona y el que pide el puesto. */
function afinidad(texto, perfilNorm){
  const esperado = estiloDeTexto(texto);
  if(!esperado || !perfilNorm) return null;
  const claves = ['D','I','S','C'];
  const total = claves.reduce((s,k) => s + esperado[k], 0);
  if(!total) return null;
  const puntos = claves.reduce((s,k) => s + (esperado[k] / total) * perfilNorm[k], 0);
  return Math.max(0, Math.min(1, puntos));
}

const nivel = a => a === null ? null : (a >= 0.62 ? 'alta' : a >= 0.38 ? 'media' : 'baja');

return {ESTILO_PUESTO, perfilNormalizado, estiloDeTexto, afinidad, nivel};
})();
