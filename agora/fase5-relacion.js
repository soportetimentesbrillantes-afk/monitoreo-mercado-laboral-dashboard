/* =====================================================================
   Proceso Ágora — Fase 5: Forma de relacionamiento
   =====================================================================

   Hoja de Ágora: "Hace un análisis de formas de relacionamiento considerando
   la información colectada"; resultado: "identificación de formas de
   relacionamiento personalizadas".

   Se arma con las "Recomendaciones para relacionarte" de la interpretación
   DISC de Ágora: cómo conviene que se comuniquen con cada estilo y qué no
   funciona. La persona marca lo que le aplica a ella, elige el papel que de
   verdad toma en un equipo (el de su perfil se sugiere, no se impone) y
   piensa en el estilo con el que más le cuesta.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

// Papel en un equipo, en palabras de la presentación de Ágora (D tareas, I ideas, S procesos, C información).
const PAPEL = {
  D: 'Quien empuja a decidir y a llegar al resultado',
  I: 'Quien anima, conecta a la gente y propone ideas',
  S: 'Quien sostiene al equipo, escucha y concilia',
  C: 'Quien cuida la calidad, revisa y pone orden'
};
const NINGUNO = 'Con ninguno en especial';
const vacio = () => ({funciona:[], noFunciona:[], papel:'', cuesta:'', distinto:'', dom:null});

F.relacion = {
  PAPEL,
  pintar(cont, AG){
    const req = AG.requiere(['disc']);
    if(req){ cont.innerHTML = req; return; }
    const disc = AG.disc();
    const {dom, seg} = disc;
    const A = DISC.AGORA, NOM = DISC.FACTORES, CL = DISC.CLAVES;
    const d = Object.assign(vacio(), AG.datos('relacion') || {});
    const otros = CL.filter(k => k !== dom);
    const papeles = CL.map(k => PAPEL[k]);

    cont.innerHTML =
      (d.dom && d.dom !== dom ? '<div class="aviso limites">Tu Perfil DISC cambió desde que hiciste esta fase. Revisa lo que marcaste.</div>' : '') +
      '<div class="card">' +
        '<h3>Cómo te gusta que te traten</h3>' +
        '<p class="note" style="margin-top:0;">Lo que a tu estilo, ' + NOM[dom].nombre + ', le suele funcionar. Marca lo que sea cierto para ti: te sirve para pedirlo, en la escuela, en el trabajo o en casa.</p>' +
        AG.checks('funciona', A[dom].comoComunicarse.concat(A[seg].comoComunicarse.slice(0, 2).map(t => ({texto: t, nota: 'De tu segundo color, ' + NOM[seg].nombre}))), d.funciona) +
        '<h3>Lo que no te funciona</h3>' +
        AG.checks('noFunciona', A[dom].comoNo, d.noFunciona) +
      '</div>' +

      '<div class="card">' +
        '<h3>Tu papel en un equipo</h3>' +
        '<p class="note" style="margin-top:0;">Por tu perfil, lo más probable es que seas <strong>' + AG.esc(PAPEL[dom].toLowerCase()) + '</strong>. Elige el que de verdad tomas casi siempre.</p>' +
        AG.radios('papel', papeles, d.papel) +
      '</div>' +

      '<div class="card">' +
        '<h3>Con los demás estilos</h3>' +
        '<p class="note" style="margin-top:0;">La gente distinta a ti no está mal: funciona de otra manera. Esto es lo que a cada estilo le sirve.</p>' +
        otros.map(k =>
          '<details class="horizonte"><summary><span style="color:' + NOM[k].color + '">' + NOM[k].nombre + ' (' + NOM[k].colorNombre + ')</span><span class="sub">' + AG.esc(PAPEL[k]) + '</span></summary>' +
          '<p>' + AG.esc(NOM[k].resumen) + '</p>' +
          '<p style="margin-bottom:0;"><strong>Cómo tratarle:</strong></p>' + AG.lista(A[k].comoComunicarse) +
          '<p style="margin-bottom:0;"><strong>Evita:</strong></p>' + AG.lista(A[k].comoNo.slice(0, 3)) +
          '</details>').join('') +
        '<h3>¿Con cuál te cuesta más trabajar?</h3>' +
        AG.radios('cuesta', otros.map(k => NOM[k].nombre).concat([NINGUNO]), d.cuesta) +
        '<div class="campo" style="margin-top:10px;"><label for="f_rel_distinto">Piensa en alguien así, sin decir su nombre. ¿Qué podrías hacer distinto la próxima vez? (opcional)</label>' +
        '<textarea id="f_rel_distinto" rows="3">' + AG.esc(d.distinto) + '</textarea></div>' +
        AG.boton('relacion', AG.completa('relacion')) +
      '</div>';

    const leer = () => ({
      funciona: AG.marcados(cont, 'funciona'), noFunciona: AG.marcados(cont, 'noFunciona'),
      papel: AG.radio(cont, 'papel'), cuesta: AG.radio(cont, 'cuesta'),
      distinto: cont.querySelector('#f_rel_distinto').value, dom
    });
    const guardar = () => AG.guardadoTxt(AG.fijar('relacion', leer()));
    cont.addEventListener('change', guardar);
    cont.addEventListener('input', guardar);

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer(), f = [];
      if(x.funciona.length < 2) f.push('marcar al menos 2 cosas que te funcionan cuando se comunican contigo');
      if(!x.papel) f.push('elegir tu papel en un equipo');
      if(!x.cuesta) f.push('elegir con qué estilo te cuesta más trabajar (o "' + NINGUNO + '")');
      if(f.length){ AG.faltan(f); return; }
      AG.fijar('relacion', x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar('relacion', Object.assign({}, x, {
        hoja: {
          'Me funciona': AG.vinetas(x.funciona), 'No me funciona': AG.vinetas(x.noFunciona),
          'Mi papel en equipo': x.papel, 'Estilo con el que me cuesta': x.cuesta, 'Qué haré distinto': x.distinto.trim()
        }
      }));
    };
  }
};
})();
