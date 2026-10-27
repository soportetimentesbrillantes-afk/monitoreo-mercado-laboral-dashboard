/* =====================================================================
   Proceso Ágora — Fase 10: Resumen ejecutivo
   =====================================================================

   Hoja de Ágora: "Genera un reporte resumiendo todas las fases"; resultado:
   "reporte final personalizado / envío de resultados a padres por correo".

   Sigue la estructura del "Documento ejecutivo integral" de ejemplo de Ágora,
   pero solo con lo que se sostiene: lo que la persona contestó y eligió en
   las fases 1 a 9. Lo que en el ejemplo es juicio de un experto (el principal
   reto del perfil, las conclusiones) queda con renglones para el orientador.
   Lo que falta se imprime como pendiente; nada se inventa.

   La persona lo imprime o lo guarda como PDF, se lo manda a su familia desde
   su correo, y lo da por terminado cuando las nueve fases están completas.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

/* Lectura de cada color, como la tabla del informe de ejemplo. Los cortes
   son proporción de la escala (en el de Ágora, 0 a 82): 63 sale "Muy alto",
   51 "Alto", 35 y 31 "Medio", igual que en el ejemplo. */
function lecturaColor(v, escala){
  const r = (v - escala.min) / ((escala.max - escala.min) || 1);
  return r >= 0.70 ? 'Muy alto' : r >= 0.55 ? 'Alto' : r >= 0.30 ? 'Medio' : 'Bajo';
}

function documento(AG){
  const e = AG.esc, L = AG.lista;
  const info = AG.info(), disc = AG.disc(), foda = AG.foda();
  const D = id => AG.completa(id) ? (AG.datos(id) || {}) : null;
  const est = D('estilo'), rel = D('relacion'), cre = D('crecimiento'), esc = D('escenarios'), ruta = D('ruta'), plan = D('plan');
  const NOM = DISC.FACTORES;
  const nombre = AG.nombre();
  const pend = (id, txt) => '<div class="pendiente">Pendiente: completa la fase ' + (AG.PASOS.findIndex(p => p.id === id) + 1) + ', ' + e(AG.paso(id).nombre) + (txt ? '. ' + txt : '') + '.</div>';
  // Renglones con borde, no con fondo: los fondos no se imprimen por omisión.
  const lineas = alto => '<div class="lineas">' + '<div></div>'.repeat(Math.max(1, Math.round((alto || 84) / 28))) + '</div>';
  const ori = disc && F.estilo ? F.estilo.orientacion(disc) : null;
  const programa = [info.nivel, (info.carrera || '').trim(), (info.institucion || '').trim()].filter(Boolean).join(' · ');

  let resumen = pend('disc'), perfil = pend('disc');
  if(disc){
    const {p, escala, ordenados, dom, seg, plano} = disc;
    resumen =
      '<p>Este documento integra los resultados de ' + (nombre ? e(nombre) : 'la persona') + ' en las diez fases del proceso Ágora: su información inicial, su perfil conductual DISC, su análisis FODA, su estilo de trabajo y de relación, sus áreas de crecimiento, sus escenarios de vida, su ruta profesional y su plan de acción.</p>' +
      '<p>Los resultados muestran un perfil con predominancia:</p>' +
      '<ul>' + ordenados.map(k => '<li><strong style="color:' + NOM[k].color + '">' + NOM[k].nombre + ' (' + k + ')</strong>: ' + p[k].neto + '</li>').join('') + '</ul>' +
      (plano ? '<p>Los cuatro colores salieron parejos: no hay un estilo que domine claramente.</p>'
        : '<p>Lo anterior configura un perfil <strong>' + NOM[dom].nombre + ' – ' + NOM[seg].nombre + '</strong>' + (ori ? ', ' + e(ori.titulo.charAt(0).toLowerCase() + ori.titulo.slice(1)) : '') + '.</p>') +
      (ruta && ruta.principal ? '<p>Ruta profesional elegida: <strong>' + e(ruta.principal) + '</strong>' + (ruta.segunda ? ', y como segunda ruta, ' + e(ruta.segunda) : '') + '.</p>' : '') +
      (cre && cre.prioridad ? '<p>Primera prioridad de crecimiento: <strong>' + e(cre.prioridad) + '</strong></p>' : '');
    perfil =
      '<h3>Distribución conductual</h3>' +
      '<div style="overflow-x:auto;"><table class="tabla"><tr><th>Factor</th><th>Puntuación</th><th>Interpretación</th></tr>' +
      ordenados.map(k => '<tr><td><strong style="color:' + NOM[k].color + '">' + NOM[k].colorNombre + ' (' + k + ') · ' + NOM[k].nombre + '</strong></td><td>' + p[k].neto + '</td><td>' + lecturaColor(p[k].neto, escala) + '</td></tr>').join('') +
      '</table></div><p class="note" style="margin:0 0 8px;">Suma de las cinco secciones del cuestionario de Ágora Internacional; cada color puede juntar hasta ' + escala.max + ' puntos. La interpretación es la proporción de ese máximo.</p>' +
      '<div class="dos-col"><div class="bloque">' + DISC.tablero(p, escala) + '</div>' +
      '<div class="bloque"><h3>Principales características</h3>' +
      ordenados.slice(0, 2).map(k => '<p style="margin:6px 0 0;"><strong style="color:' + NOM[k].color + '">' + NOM[k].colorNombre + ' ' + lecturaColor(p[k].neto, escala).toLowerCase() + '</strong></p>' + L(DISC.AGORA[k].estilo)).join('') +
      '</div></div>';
  }

  const cuadro = (k, t, c) => '<div class="q" style="--qc:' + c + '"><h3>' + t + '</h3>' + (foda ? (L(AG.lineas(foda[k])) || '<p class="vacio">Sin ideas.</p>') : '<p class="vacio">Pendiente.</p>') + '</div>';

  const tablaEsc = esc
    ? '<div style="overflow-x:auto;"><table class="tabla"><tr><th style="width:18%">Horizonte</th>' + F.escenarios.AREAS.map(a => '<th>' + a.nombre + '</th>').join('') + '</tr>' +
      F.escenarios.HORIZONTES.map(h => '<tr><td><strong>' + h.n + ' años</strong><br><span class="note" style="margin:0;">' + h.etapa + '</span></td>' +
        F.escenarios.AREAS.map(a => '<td>' + e((esc[h.n] || {})[a.id] || '—') + '</td>').join('') + '</tr>').join('') + '</table></div>'
    : pend('escenarios');

  let rutaHtml = pend('ruta');
  if(ruta){
    const car = n => (window.CARRERAS_AGORA || []).find(c => c.n === n);
    const ETQ = {alta:'Alta', media:'Media', baja:'Baja'};
    rutaHtml =
      '<h3>Carreras consideradas</h3><div style="overflow-x:auto;"><table class="tabla"><tr><th>Carrera</th><th>Área</th><th>Afinidad con su estilo</th></tr>' +
      ruta.consideradas.map(n => { const c = car(n); const af = c && disc ? F.ruta.afinidad(c, disc) : null;
        return '<tr><td>' + e(n) + '</td><td>' + (c ? e(c.a) : '—') + '</td><td>' + (af ? ETQ[af] : 'Fuera de la lista del Club') + '</td></tr>'; }).join('') + '</table></div>' +
      '<h3>Ruta con mayor compatibilidad, según su elección</h3><p><strong>' + e(ruta.principal) + '</strong></p>' +
      '<p style="margin-top:0;">' + e(ruta.porque) + '</p>' +
      (ruta.segunda ? '<h3>Segunda ruta</h3><p>' + e(ruta.segunda) + '</p>' : '') +
      '<div id="doc_mercado"></div>';
  }

  const planHtml = plan
    ? '<table class="tabla"><tr><th style="width:16%">Plazo</th><th>Acciones</th></tr>' +
      F.plan.PLAZOS.map(p => '<tr><td><strong>' + p + ' días</strong></td><td>' +
        L(plan.acciones.filter(a => a.plazo === p).map(a => a.tipo + ': ' + a.texto)) + '</td></tr>').join('') + '</table>'
    : pend('plan');

  return '<p class="lema">“Creamos porque creemos”</p>' +
    '<h1 class="titulo">Documento ejecutivo integral</h1>' +
    '<p class="subtitulo">Proceso Ágora · Perfil, proyección profesional y plan de vida</p>' +
    '<div class="ficha">' +
      '<div><b>Alumno(a)</b>' + (nombre ? e(nombre) : '<span class="vacio">Sin nombre</span>') + '</div>' +
      '<div><b>Edad</b>' + (AG.edad() !== null ? AG.edad() + ' años' : '—') + '</div>' +
      '<div><b>Fecha</b>' + e(AG.fechaLegible()) + '</div>' +
      '<div style="grid-column:span 2;"><b>Programa</b>' + (programa ? e(programa) : '—') + '</div>' +
      '<div><b>Estado</b>' + (info.estado ? e(info.estado) : '—') + '</div>' +
    '</div>' +
    '<h2>1. Resumen ejecutivo</h2>' + resumen +
    '<h2>2. Perfil DISC</h2>' + perfil +
    '<h2>3. Análisis FODA</h2>' + (foda ? '' : pend('foda')) +
    '<div class="cuadros">' + cuadro('F', 'Fortalezas', 'var(--f)') + cuadro('O', 'Oportunidades', 'var(--o)') + cuadro('D', 'Debilidades', 'var(--de)') + cuadro('A', 'Amenazas', 'var(--a)') + '</div>' +
    (foda && AG.lineas(foda.paso).length ? '<p><strong>Siguiente paso declarado:</strong> ' + e(foda.paso.trim()) + '</p>' : '') +
    '<h2>4. Estilo de trabajo</h2>' + (est
      ? (est.orientacion || ori ? '<p><strong>' + e(ori ? ori.titulo : '') + '</strong></p>' : '') +
        '<div class="dos-col"><div class="bloque"><h3>Cómo trabaja</h3>' + (L(est.trabajo) || '<p class="vacio">—</p>') + '</div>' +
        '<div class="bloque"><h3>Dónde rinde más</h3>' + (L(est.ambiente) || '<p class="vacio">—</p>') + '</div>' +
        '<div class="bloque"><h3>Qué lo mueve</h3>' + (L(est.motiva) || '<p class="vacio">—</p>') + '</div>' +
        '<div class="bloque"><h3>Lo que lo puede frenar</h3>' + (L(est.frena) || '<p class="vacio">—</p>') + '</div></div>' +
        (est.palabras && est.palabras.trim() ? '<h3>En sus palabras</h3><p>' + e(est.palabras.trim()) + '</p>' : '')
      : pend('estilo')) +
    '<h2>5. Forma de relacionamiento</h2>' + (rel
      ? '<div class="dos-col"><div class="bloque"><h3>Cómo conviene comunicarse con esta persona</h3>' + L(rel.funciona) + '</div>' +
        '<div class="bloque"><h3>Lo que no le funciona</h3>' + (L(rel.noFunciona) || '<p class="vacio">—</p>') + '</div></div>' +
        '<p><strong>Su papel en un equipo:</strong> ' + e(rel.papel) + '.</p>' +
        '<p><strong>Estilo con el que le cuesta más trabajar:</strong> ' + e(rel.cuesta) + '.' + (rel.distinto && rel.distinto.trim() ? ' Lo que hará distinto: ' + e(rel.distinto.trim()) : '') + '</p>'
      : pend('relacion')) +
    '<h2>6. Crecimiento personal</h2>' + (cre
      ? '<div class="dos-col"><div class="bloque"><h3>Lo que espera desarrollar</h3>' + L(cre.esperas.concat(cre.esperaOtra && cre.esperaOtra.trim() ? [cre.esperaOtra.trim()] : [])) + '</div>' +
        '<div class="bloque"><h3>Áreas de crecimiento que eligió</h3>' + L(cre.areas) + '</div></div>' +
        '<p><strong>Primera prioridad:</strong> ' + e(cre.prioridad) + '</p>' +
        (disc ? '<p><strong>Habilidades que le conviene reforzar:</strong> ' + e(DISC.CRECIMIENTO_HABILIDADES[disc.dom].join(', ')) + '.</p>' : '')
      : pend('crecimiento')) +
    '<h2>7. Escenarios de vida</h2>' + tablaEsc +
    '<h2>8. Ruta profesional</h2>' + rutaHtml +
    '<h2>9. Plan de acción a 30, 60 y 90 días</h2>' + planHtml +
    '<h2 class="salto">10. Para el orientador</h2>' +
    '<p class="note" style="margin:0 0 8px;">Esta sección la llena el orientador con la persona. La página no la calcula.</p>' +
    '<h3>Principal reto del perfil</h3>' + lineas(84) +
    '<h3>Conclusiones y recomendaciones</h3>' + lineas(112) +
    '<h3>Firma del orientador y fecha</h3>' + lineas(56) +
    '<div class="pie">' +
      '<p><strong>Qué es y qué no es este documento.</strong> El perfil DISC es una herramienta de autoconocimiento, no una prueba psicométrica validada: describe preferencias, no capacidades, y no predice el desempeño en un trabajo. El FODA, los escenarios, la ruta y el plan los escribió o eligió la persona; la afinidad con cada carrera es una referencia, no un requisito. Los datos de mercado son del monitoreo semanal del Club para el sector relacionado. Nada de este documento debe usarse para descartar a una persona de una escuela o de un proceso de selección.</p>' +
      '<p>Hecho con las herramientas del proceso Ágora del Club de Mentes Brillantes, con la interpretación DISC de Ágora Internacional.</p>' +
    '</div>';
}

function textoCorreo(AG){
  const disc = AG.disc(), NOM = DISC.FACTORES;
  const ruta = AG.datos('ruta') || {}, cre = AG.datos('crecimiento') || {}, plan = AG.datos('plan') || {acciones: []};
  const ori = disc && F.estilo ? F.estilo.orientacion(disc) : null;
  return 'Te comparto el resumen de mi proceso Ágora, del Club de Mentes Brillantes.\n\n' +
    (disc ? 'Mi perfil DISC: ' + NOM[disc.dom].nombre + ' con ' + NOM[disc.seg].nombre + (ori ? ' (' + ori.titulo.toLowerCase() + ')' : '') + '.\n' : '') +
    (ruta.principal ? 'Mi ruta profesional: ' + ruta.principal + (ruta.segunda ? ' (segunda opción: ' + ruta.segunda + ')' : '') + '.\n' : '') +
    (cre.prioridad ? 'Mi primera prioridad de crecimiento: ' + cre.prioridad + '\n' : '') +
    (plan.acciones.length ? '\nLo que voy a hacer en los próximos 30 días:\n' + AG.vinetas(plan.acciones.filter(a => a.plazo === 30).map(a => a.texto)) + '\n' : '') +
    '\nTe adjunto el reporte completo en PDF.\n— ' + (AG.nombre() || '');
}

F.resumen = {
  lecturaColor, documento,
  pintar(cont, AG){
    document.body.classList.add('con-documento');
    const previas = AG.PASOS.filter(p => p.id !== 'resumen');
    const faltan = previas.filter(p => !AG.completa(p.id));
    const tutor = AG.tutor();

    cont.innerHTML =
      '<div class="card no-imprimir">' +
        (faltan.length
          ? '<h3>Tu reporte va tomando forma</h3><p style="margin-top:0;">Abajo está tu reporte con lo que llevas. Para darlo por terminado te falta completar: ' + faltan.map(p => '<strong>' + AG.esc(p.nombre) + '</strong>').join(', ') + '.</p>' +
            '<div class="acciones">' + faltan.slice(0, 3).map(p => '<button type="button" class="secondary" data-abrir="' + p.id + '">Ir a ' + AG.esc(p.nombre) + '</button>').join('') + '</div>'
          : '<h3>Tu reporte está completo</h3><p style="margin-top:0;">Revísalo, guárdalo como PDF y compártelo. Cuando estés de acuerdo con él, da por terminado tu proceso.</p>') +
        '<div class="acciones" style="margin-top:12px;">' +
          '<button type="button" class="secondary" id="res_imprimir">Imprimir o guardar como PDF</button>' +
          '<a class="secondary" id="res_correo" href="#">' + (tutor.correo ? 'Mandar a ' + AG.esc(tutor.nombre || tutor.correo) : 'Mandar por correo a mi familia') + '</a>' +
        '</div>' +
        '<p class="note">Para mandarlo a tu familia: guarda primero el PDF y adjúntalo en el correo que se abre. Si aceptaste guardar tu expediente, tu orientador también puede mandárselo desde el Club.</p>' +
        '<div id="avisoFase" aria-live="polite"></div>' +
        '<div class="acciones" style="margin-top:6px;"><button type="button" class="primary" id="btnCompletar"' + (faltan.length ? ' disabled' : '') + '>' + (AG.completa('resumen') ? 'Guardar cambios' : 'Terminar mi proceso') + '</button></div>' +
      '</div>' +
      '<div class="card" id="documento">' + documento(AG) + '</div>';

    // Datos de mercado de la ruta principal, si el monitoreo la cubre.
    const ruta = AG.completa('ruta') ? AG.datos('ruta') : null;
    const car = ruta && (window.CARRERAS_AGORA || []).find(c => c.n === ruta.principal);
    if(car && car.s.length){
      AG.sector(car.s[0]).then(s => {
        const caja = cont.querySelector('#doc_mercado'); if(!caja || !s) return;
        const top = (s.habilidades_tecnicas || []).slice(0, 5).map(x => x.skill);
        caja.innerHTML = '<h3>El mercado hoy en ' + AG.esc(s.nombre) + '</h3><p style="margin-top:0;">' +
          (s.vacantes_verificadas || 0).toLocaleString('es-MX') + ' vacantes verificadas en la última corrida del monitoreo del Club' +
          (s.salario && s.salario.mediana_mensual_mxn ? ', con salario mediano de $' + Math.round(s.salario.mediana_mensual_mxn).toLocaleString('es-MX') + ' al mes' : '') + '.' +
          (top.length ? ' Las habilidades técnicas que más piden: ' + top.map(AG.esc).join(', ') + '.' : '') + '</p>';
      });
    }

    cont.querySelector('#res_imprimir').onclick = () => window.print();
    cont.querySelector('#res_correo').onclick = ev => {
      ev.currentTarget.href = AG.mailto(tutor.correo, 'Mi reporte del proceso Ágora', textoCorreo(AG));
    };
    cont.querySelector('#btnCompletar').onclick = () => {
      const f = AG.PASOS.filter(p => p.id !== 'resumen' && !AG.completa(p.id));
      if(f.length){ AG.faltan(f.map(p => 'completar ' + p.nombre)); return; }
      const disc = AG.disc(), ruta2 = AG.datos('ruta') || {}, cre = AG.datos('crecimiento') || {};
      const hoy = new Date().toISOString().slice(0, 10);
      AG.fijar('resumen', {terminado: hoy});
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar('resumen', {terminado: hoy, hoja: {
        'Proceso terminado': hoy, 'Estilo dominante': disc ? DISC.FACTORES[disc.dom].nombre + ' con ' + DISC.FACTORES[disc.seg].nombre : '',
        'Ruta principal': ruta2.principal || '', 'Segunda ruta': ruta2.segunda || '', 'Primera prioridad de crecimiento': cre.prioridad || ''
      }});
    };
  }
};
})();
