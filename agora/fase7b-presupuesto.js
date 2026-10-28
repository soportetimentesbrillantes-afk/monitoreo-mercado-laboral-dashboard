/* =====================================================================
   Proceso Ágora — Fase 8: Tu presupuesto
   =====================================================================

   Pedida por el Club el 2026-10-28, entre Escenarios de vida y Ruta
   profesional (por eso el archivo es "7b": las demás conservan su número del
   documento de Ágora).

   La persona calcula cuánto le costaría al mes la vida que imaginó en sus
   escenarios, cuando viva por su cuenta. En la Ruta profesional ese costo se
   contrasta con lo que paga hoy el sector de la profesión que elige (salarios
   del monitoreo semanal del Club) y sale una estrategia de vida:
     - empleabilidad: un empleo en ese sector cubre su costo de vida;
     - empleabilidad con crecimiento: lo cubre el salario típico, no el de
       entrada;
     - emprendimiento en servicios mediante outsourcing: el salario típico no
       alcanza, y conviene ofrecer sus servicios por proyecto a varias
       empresas (además de un empleo al inicio) o ajustar el presupuesto.
   Los montos los pone la persona; la página no inventa precios.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

const RUBROS = [
  {id:'vivienda', nombre:'Vivienda', nota:'Renta, hipoteca o lo que aportarías en casa'},
  {id:'servicios', nombre:'Servicios', nota:'Luz, agua, gas, internet y celular'},
  {id:'comida', nombre:'Comida y despensa', nota:'Súper, mercado y comidas fuera'},
  {id:'transporte', nombre:'Transporte', nota:'Camión, metro, gasolina, apps de viaje'},
  {id:'salud', nombre:'Salud', nota:'Seguro, consultas y medicinas'},
  {id:'educacion', nombre:'Educación y cursos', nota:'Colegiatura, cursos, libros'},
  {id:'personal', nombre:'Ropa y cuidado personal', nota:''},
  {id:'diversion', nombre:'Entretenimiento y salidas', nota:'Salidas, plataformas, deporte'},
  {id:'deudas', nombre:'Deudas o pagos a plazos', nota:'Tarjeta, préstamos, celular a plazos'},
  {id:'familia', nombre:'Apoyo a tu familia', nota:'Si aportarás algo a tu casa o a alguien'},
  {id:'ahorro', nombre:'Ahorro', nota:'Lo que quieres guardar cada mes'},
  {id:'otros', nombre:'Otros', nota:''}
];
const pesos = n => '$' + Math.round(n || 0).toLocaleString('es-MX');
const num = v => { const n = parseFloat(String(v || '').replace(/[^0-9.]/g, '')); return isNaN(n) || n < 0 ? 0 : Math.min(n, 10000000); };
const total = d => RUBROS.reduce((s, r) => s + num((d.montos || {})[r.id]), 0);

/* La estrategia de vida: costo de vida mensual frente a los salarios del
   sector (p25 = sueldos de entrada, mediana = sueldo típico). */
function estrategia(costo, salario, sector){
  if(!costo) return null;
  if(!salario || !salario.mediana_mensual_mxn) return {tipo:'sin-dato', titulo:'Sin dato de salario para comparar',
    texto:'El monitoreo del Club no tiene salarios de este sector todavía. Revisa con tu orientador cuánto se gana al empezar en esta profesión y compáralo con tu presupuesto de ' + pesos(costo) + ' al mes.'};
  const p25 = salario.p25_mensual_mxn || salario.mediana_mensual_mxn, med = salario.mediana_mensual_mxn;
  const cubre = Math.round(100 * med / costo);
  const base = {costo, p25, mediana: med, p75: salario.p75_mensual_mxn || null, cubre, sector};
  if(p25 >= costo) return Object.assign(base, {tipo:'empleo', titulo:'Empleabilidad',
    texto:'Aun los sueldos de entrada de ' + sector + ' (' + pesos(p25) + ' al mes) cubren tu presupuesto de ' + pesos(costo) + '. Un empleo formal en el sector te permite sostener la vida que planeas desde el principio; enfócate en entrar pronto y en crecer dentro.'});
  if(med >= costo) return Object.assign(base, {tipo:'empleo-crecimiento', titulo:'Empleabilidad con crecimiento',
    texto:'El sueldo típico de ' + sector + ' (' + pesos(med) + ' al mes) cubre tu presupuesto de ' + pesos(costo) + ', pero los de entrada (' + pesos(p25) + ') no siempre. Un empleo formal es buena base: especialízate para subir rápido y, mientras, ajusta tu presupuesto o suma un ingreso extra.'});
  return Object.assign(base, {tipo:'outsourcing', titulo:'Emprendimiento en servicios mediante outsourcing',
    texto:'Con el sueldo típico de ' + sector + ' (' + pesos(med) + ' al mes) cubres alrededor del ' + cubre + '% de tu presupuesto de ' + pesos(costo) + '. Te conviene planear desde ahora ofrecer tus servicios profesionales por proyecto a varias empresas (outsourcing: como independiente o con un pequeño despacho), además de un empleo al inicio; o revisar tu presupuesto o tu segunda ruta.'});
}

const vacio = () => ({montos:{}, lugar:'', cuando:'A 5 años, cuando viva por mi cuenta'});

F.presupuesto = {
  RUBROS, estrategia, total, pesos,
  /* Lo que usan otras fases: el costo mensual, si la fase está completa. */
  costo(AG){ return AG.completa('presupuesto') ? total(AG.datos('presupuesto') || {}) : 0; },
  pintar(cont, AG){
    const info = AG.info();
    const guardado = AG.datos('presupuesto');
    const d = Object.assign(vacio(), guardado || {});
    if(!guardado) d.lugar = [info.ciudad, info.estado].map(x => (x || '').trim()).filter(Boolean).join(', ');
    const esc5 = (AG.datos('escenarios') || {})[5] || {};

    cont.innerHTML =
      '<div class="card">' +
        '<p style="margin-top:0;">¿Cuánto cuesta vivir como imaginaste? Calcula <strong>un mes</strong> de tu vida cuando vivas por tu cuenta. Si no sabes cuánto cuesta algo, pregunta en casa o busca precios donde piensas vivir: lo importante es que el número sea tuyo, no perfecto.</p>' +
        (esc5.dinero || esc5.personal ? '<div class="aviso limites"><strong>En tu escenario a 5 años escribiste:</strong> ' + AG.esc([esc5.dinero, esc5.personal].filter(Boolean).join(' · ')) + '</div>' : '') +
        '<div class="grid dos">' +
          '<div class="campo"><label for="f_pre_cuando">¿Para cuándo es este presupuesto?</label><input id="f_pre_cuando" value="' + AG.esc(d.cuando) + '"></div>' +
          '<div class="campo"><label for="f_pre_lugar">¿Dónde piensas vivir?</label><input id="f_pre_lugar" value="' + AG.esc(d.lugar) + '" placeholder="Ciudad o municipio"></div>' +
        '</div>' +
        '<h3>Tus gastos de un mes (en pesos)</h3>' +
        '<div class="grid dos">' + RUBROS.map(r =>
          '<div class="campo"><label for="f_pre_' + r.id + '">' + r.nombre + (r.nota ? ' <span style="font-weight:400;">· ' + AG.esc(r.nota) + '</span>' : '') + '</label>' +
          '<input id="f_pre_' + r.id + '" data-rubro="' + r.id + '" inputmode="numeric" placeholder="0" value="' + AG.esc((d.montos || {})[r.id] || '') + '"></div>').join('') +
        '</div>' +
        '<div class="mercado" style="margin-top:14px;"><div class="cifras"><div><b id="pre_total">' + pesos(total(d)) + '</b>al mes</div><div><b id="pre_anual">' + pesos(total(d) * 12) + '</b>al año</div></div>' +
          '<p style="margin:4px 0 0;">Es el ingreso que necesitas para sostener esta vida. En la siguiente fase, <strong>Ruta profesional</strong>, lo comparamos con lo que paga hoy el sector de la profesión que elijas.</p></div>' +
        AG.boton('presupuesto', AG.completa('presupuesto')) +
      '</div>';

    const leer = () => {
      const montos = {};
      cont.querySelectorAll('[data-rubro]').forEach(i => { if(i.value.trim()) montos[i.dataset.rubro] = i.value.trim(); });
      return {montos, lugar: cont.querySelector('#f_pre_lugar').value, cuando: cont.querySelector('#f_pre_cuando').value};
    };
    const refrescar = () => {
      const x = leer();
      cont.querySelector('#pre_total').textContent = pesos(total(x));
      cont.querySelector('#pre_anual').textContent = pesos(total(x) * 12);
      AG.guardadoTxt(AG.fijar('presupuesto', x));
    };
    cont.addEventListener('input', refrescar);

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      const llenos = RUBROS.filter(r => num(x.montos[r.id]) > 0);
      if(llenos.length < 3) f.push('poner un monto en al menos 3 rubros (llevas ' + llenos.length + ')');
      if(!num(x.montos.vivienda) && !num(x.montos.comida)) f.push('incluir vivienda o comida: son lo básico de cualquier presupuesto');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar('presupuesto', x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      const t = total(x);
      AG.terminar('presupuesto', Object.assign({}, x, {total: t, hoja: {
        'Total mensual': String(Math.round(t)),
        'Detalle': llenos.map(r => r.nombre + ': ' + pesos(num(x.montos[r.id]))).join('\n'),
        'Para cuándo': x.cuando.trim(), 'Dónde piensa vivir': x.lugar.trim()
      }}));
    };
  }
};
})();
