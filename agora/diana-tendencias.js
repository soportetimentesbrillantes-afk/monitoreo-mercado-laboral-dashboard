/* =====================================================================
   DIANA — Iniciar: Tendencias de la industria
   =====================================================================

   Hoja de DIANA: "Investigación automática de industria objetivo";
   resultado: "Identifica tendencias de industria objetivo".

   La investigación automática es el monitoreo semanal del Club: para la
   industria que la persona eligió en su Mapa de carrera muestra qué tantas
   vacantes hay y cómo se movieron, qué habilidades piden, cuánto pagan, qué
   empresas contratan y dónde. Con eso se arman frases de tendencia que la
   persona marca si le importan, y escribe qué va a hacer con ellas.
   Si su industria no está en el monitoreo, la herramienta le da preguntas
   guía y un área de captura para que investigue por su cuenta.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};
const pesos = n => '$' + Math.round(n || 0).toLocaleString('es-MX');
const vacio = () => ({tendencias:[], accion:'', propias:{crece:'', piden:'', fuentes:''}});

/* Frases de tendencia a partir de los datos del sector. Cada una dice el dato. */
function frases(s, estado){
  const out = [];
  const ev = s.evolucion_semanal || [];
  if(ev.length >= 2){
    const a = ev[ev.length - 2], b = ev[ev.length - 1];
    const cambio = b.vacantes - a.vacantes;
    out.push('Las vacantes de ' + s.nombre + ' ' + (cambio >= 0 ? 'subieron' : 'bajaron') + ' de ' + a.vacantes + ' a ' + b.vacantes + ' entre la semana del ' + a.semana + ' y la del ' + b.semana + '.');
  }
  const tec = (s.habilidades_tecnicas || []).slice(0, 3);
  if(tec.length) out.push('La habilidad técnica que más piden es ' + tec[0].skill + (tec[1] ? ', seguida de ' + tec.slice(1).map(x => x.skill).join(' y ') : '') + '.');
  const bla = (s.habilidades_blandas || []).slice(0, 2);
  if(bla.length) out.push('En habilidades blandas, lo que más piden es ' + bla.map(x => x.skill.toLowerCase()).join(' y ') + '.');
  if(s.salario && s.salario.mediana_mensual_mxn) out.push('El salario típico es de ' + pesos(s.salario.mediana_mensual_mxn) + ' al mes; la mitad de las vacantes paga entre ' + pesos(s.salario.p25_mensual_mxn) + ' y ' + pesos(s.salario.p75_mensual_mxn) + '.');
  const emp = (s.top_empresas || []).slice(0, 3);
  if(emp.length) out.push('Las empresas que más contratan son ' + emp.map(x => x.empresa).join(', ') + '.');
  const est = ((s.cobertura_geografica || {}).top_estados || []);
  if(est.length) out.push('La mayoría de las vacantes están en ' + est.slice(0, 3).map(x => x.estado).join(', ') + '.');
  const suyo = estado && est.find(x => x.estado === estado);
  if(estado) out.push(suyo ? 'En ' + estado + ', donde vives, hay ' + suyo.vacantes + ' vacantes de ' + s.nombre + '.' : 'En ' + estado + ', donde vives, hay pocas vacantes de ' + s.nombre + ' en el monitoreo: considera trabajo remoto o mudarte.');
  const cat = (s.categorias_puesto || []).filter(c => c.categoria !== 'Otro')[0];
  if(cat) out.push('El tipo de puesto con más vacantes es ' + cat.categoria + ' (' + cat.vacantes + ').');
  return out;
}

F.tendencias = {
  titulo: 'Tendencias de la industria',
  seccion(AG, d){
    const e = AG.esc;
    return (d.industria ? '<p><strong>Industria:</strong> ' + e(d.industria) + '</p>' : '') +
      ((d.tendencias || []).length ? '<h3>Tendencias que le importan</h3>' + AG.lista(d.tendencias) : '') +
      (d.propias && (d.propias.crece || d.propias.piden) ? '<h3>Lo que investigó</h3>' + AG.lista([d.propias.crece, d.propias.piden, d.propias.fuentes].filter(Boolean)) : '') +
      (d.accion ? '<h3>Qué va a hacer con esto</h3><p>' + e(d.accion) + '</p>' : '');
  },
  pintar(cont, AG, paso){
    const req = AG.requiere(['mapa']);
    if(req){ cont.innerHTML = req; return; }
    const mapa = AG.datos('mapa') || {};
    const info = AG.info();
    const d = Object.assign(vacio(), AG.datos(paso.id) || {});
    const monitoreada = mapa.industria && mapa.industria !== 'otra';
    const nombre = mapa.industriaNombre || mapa.industriaOtra || 'tu industria';
    cont.innerHTML = '<div class="card" id="ten_datos"><p class="note">Cargando el monitoreo del Club…</p></div>' +
      '<div class="card"><h3>¿Qué vas a hacer con esto?</h3>' +
        '<p class="note" style="margin-top:0;">Una o dos cosas concretas: qué vas a aprender, a dónde vas a buscar, qué vas a ajustar de tu plan.</p>' +
        '<div class="campo"><textarea id="f_ten_accion" rows="3">' + AG.esc(d.accion) + '</textarea></div>' +
        AG.boton(paso.id, AG.completa(paso.id)) + '</div>';

    const caja = cont.querySelector('#ten_datos');
    const leer = () => ({
      industria: nombre, tendencias: AG.marcados(cont, 'tendencias'), accion: cont.querySelector('#f_ten_accion').value,
      propias: {crece: (cont.querySelector('#f_ten_crece') || {}).value || '', piden: (cont.querySelector('#f_ten_piden') || {}).value || '', fuentes: (cont.querySelector('#f_ten_fuentes') || {}).value || ''}
    });
    const guardar = () => AG.guardadoTxt(AG.fijar(paso.id, leer()));
    const guia = '<h3>Investígalo tú</h3><p class="note" style="margin-top:0;">Busca en bolsas de trabajo (OCC, LinkedIn, Indeed), en noticias del sector y en los sitios de las cámaras o asociaciones de la industria.</p>' +
      '<div class="campo"><label for="f_ten_crece">¿Qué está creciendo o cambiando en ' + AG.esc(nombre) + '?</label><textarea id="f_ten_crece" rows="2">' + AG.esc(d.propias.crece) + '</textarea></div>' +
      '<div class="campo"><label for="f_ten_piden">¿Qué piden las vacantes que te interesan?</label><textarea id="f_ten_piden" rows="2">' + AG.esc(d.propias.piden) + '</textarea></div>' +
      '<div class="campo"><label for="f_ten_fuentes">¿Dónde lo investigaste?</label><input id="f_ten_fuentes" value="' + AG.esc(d.propias.fuentes) + '"></div>';

    (monitoreada ? Promise.all([AG.sector(mapa.industria), AG.manifest(), fetch('boletines.json', {cache: 'no-store'}).then(r => r.ok ? r.json() : null).catch(() => null)]) : Promise.resolve([null, null, null]))
      .then(([s, m, bol]) => {
        if(!s){ caja.innerHTML = '<p style="margin-top:0;">' + AG.esc(nombre) + ' no está en el monitoreo semanal del Club.</p>' + guia; return; }
        const top = (arr, n) => (arr || []).slice(0, n);
        const ultimo = bol && bol.ediciones && bol.ediciones[0];
        caja.innerHTML = '<h3>Lo que ve hoy el monitoreo en ' + AG.esc(s.nombre) + '</h3>' +
          '<p class="note" style="margin-top:0;">Monitoreo semanal del Club' + (m && m.meta && m.meta.corrida ? ', corrida del ' + AG.esc(AG.fechaLegible(m.meta.corrida + 'T12:00:00')) : '') + '. Las cifras salen de vacantes publicadas y verificadas; no se comparan con ediciones de antes de octubre.' +
          (ultimo ? ' <a href="' + AG.esc(ultimo.html) + '" target="_blank" rel="noopener">Ver el boletín más reciente</a>.' : '') + '</p>' +
          '<div class="mercado"><div class="cifras"><div><b>' + (s.vacantes_verificadas || 0).toLocaleString('es-MX') + '</b>vacantes verificadas</div>' +
            (s.salario && s.salario.mediana_mensual_mxn ? '<div><b>' + pesos(s.salario.mediana_mensual_mxn) + '</b>salario típico al mes</div>' : '') +
            '<div><b>' + (s.total_empresas_unicas || 0) + '</b>empresas distintas</div></div></div>' +
          '<div class="grid dos" style="margin-top:10px;">' +
            '<div><strong>Habilidades técnicas</strong>' + AG.lista(top(s.habilidades_tecnicas, 5).map(x => x.skill + ' (' + x.menciones + ')')) + '</div>' +
            '<div><strong>Habilidades blandas</strong>' + AG.lista(top(s.habilidades_blandas, 5).map(x => x.skill + ' (' + x.menciones + ')')) + '</div>' +
            '<div><strong>Empresas que más contratan</strong>' + AG.lista(top(s.top_empresas, 5).map(x => x.empresa + ' (' + x.vacantes + ')')) + '</div>' +
            '<div><strong>Dónde están las vacantes</strong>' + AG.lista(top((s.cobertura_geografica || {}).top_estados, 5).map(x => x.estado + ' (' + x.vacantes + ')')) + '</div>' +
          '</div>' +
          '<h3>¿Cuáles de estas tendencias te importan?</h3><p class="note" style="margin-top:0;">Marca al menos dos.</p>' +
          AG.checks('tendencias', frases(s, info.estado), d.tendencias);
      });
    cont.addEventListener('change', guardar);
    cont.addEventListener('input', guardar);

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      if(cont.querySelector('[data-grupo="tendencias"]')){ if(x.tendencias.length < 2) f.push('marcar al menos dos tendencias que te importan'); }
      else if([x.propias.crece, x.propias.piden].filter(t => t.trim().length >= 5).length < 2) f.push('escribir qué está cambiando y qué piden las vacantes');
      if(x.accion.trim().length < 10) f.push('escribir qué vas a hacer con esto');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar(paso.id, x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar(paso.id, Object.assign({}, x, {hoja: {
        'Industria': x.industria, 'Tendencias que me importan': AG.vinetas(x.tendencias.length ? x.tendencias : [x.propias.crece, x.propias.piden].filter(Boolean)),
        'Qué haré': x.accion.trim()
      }}));
    };
  }
};
})();
