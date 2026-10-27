/* =====================================================================
   Proceso Ágora — Fase 4: Estilo de trabajo
   =====================================================================

   Hoja de Ágora: "Aplica identificación de estilos de trabajo" con los datos
   que ya dio la persona; resultado: "estilo de trabajo personalizado".

   No hay cuestionario nuevo. Se arma con su Perfil DISC (fase 2) y su
   experiencia (fase 1):
   - la orientación frente a la tarea, con los cuadrantes de la presentación
     de Ágora (D tareas, I ideas, S procesos, C información);
   - las descripciones de Ágora de su estilo: cómo trabaja, dónde rinde más,
     qué lo mueve y qué lo puede frenar.
   Lo personalizado es que la persona marca solo lo que le describe y lo
   cuenta con un ejemplo suyo. Lo que no marca no aparece en su reporte.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

const HACIA = {D:'las tareas', I:'las ideas', S:'los procesos', C:'la información'};
// En el tablero de Ágora D-I, I-S, S-C y C-D son vecinos; D-S e I-C, opuestos.
const VECINOS = {D:['I','C'], I:['D','S'], S:['I','C'], C:['S','D']};

/* "Orientado a la información, con apoyo en las tareas" */
function orientacion(disc){
  if(!disc) return null;
  const {dom, seg, empate, plano} = disc;
  if(plano) return {titulo:'Te orientas según la situación', texto:'Tus cuatro colores salieron parejos: no hay una orientación que domine. Según lo que pida la tarea, te enfocas en las tareas, en las ideas, en los procesos o en la información.'};
  const opuesto = !VECINOS[dom].includes(seg);
  const titulo = empate
    ? 'Orientado a ' + HACIA[dom] + ' y a ' + HACIA[seg]
    : 'Orientado a ' + HACIA[dom] + ', con apoyo en ' + HACIA[seg];
  const texto = {
    D: 'Te enfocas en sacar las tareas y llegar al resultado.',
    I: 'Te enfocas en las ideas y en las personas que las hacen avanzar.',
    S: 'Te enfocas en los procesos: que el trabajo fluya, de forma constante y en equipo.',
    C: 'Te enfocas en la información: que las cosas estén bien hechas, con datos y con orden.'
  }[dom] + (opuesto ? ' Tu segundo color está del lado opuesto del tablero, así que combinas dos maneras de trabajar que no suelen ir juntas: aprovéchalo.' : '');
  return {titulo, texto};
}

const vacio = () => ({trabajo:[], ambiente:[], motiva:[], frena:[], palabras:'', dom:null});

F.estilo = {
  orientacion,
  pintar(cont, AG){
    const req = AG.requiere(['disc']);
    if(req){ cont.innerHTML = req; return; }
    const disc = AG.disc();
    const {dom, seg} = disc;
    const A = DISC.AGORA, NOM = DISC.FACTORES;
    const d = Object.assign(vacio(), AG.datos('estilo') || {});
    const ori = orientacion(disc);
    const info = AG.info();
    const exps = (info.experiencia || []).filter(x => (x.rol || '').trim());
    const deSeg = (arr, n) => arr.slice(0, n).map(t => ({texto: t, nota: 'De tu segundo color, ' + NOM[seg].nombre}));

    const pistaEjemplo = exps.length
      ? 'Piensa en lo que hiciste como ' + AG.esc(exps[0].rol.trim()) + (exps[0].organizacion ? ' en ' + AG.esc(exps[0].organizacion.trim()) : '') + ', o en un trabajo de la escuela.'
      : 'Piensa en un trabajo en equipo de la escuela, un proyecto o algo que organizaste.';

    cont.innerHTML =
      (d.dom && d.dom !== dom ? '<div class="aviso limites">Tu Perfil DISC cambió desde que hiciste esta fase. Revisa lo que marcaste.</div>' : '') +
      '<div class="card">' +
        '<h3>Tu orientación frente al trabajo</h3>' +
        '<p style="font-size:1.15rem;margin:4px 0;"><strong>' + AG.esc(ori.titulo) + '</strong></p>' +
        '<p style="margin-top:0;">' + AG.esc(ori.texto) + '</p>' +
        '<div>' + A[dom].estilo.map(x => '<span class="pill" style="color:' + NOM[dom].color + '">' + AG.esc(x) + '</span>').join('') + '</div>' +
        '<p class="note">Sale de tu Perfil DISC: ' + NOM[dom].nombre + ' es tu color más alto y ' + NOM[seg].nombre + ' el segundo. Abajo están las descripciones de Ágora para tu estilo. <strong>Marca solo las que sí te describan</strong>; las demás no entran en tu reporte.</p>' +
      '</div>' +

      '<div class="card">' +
        '<h3>Cómo trabajas</h3>' + AG.checks('trabajo', A[dom].descripcion.concat(A[dom].fortalezas).concat(deSeg(A[seg].fortalezas, 3)), d.trabajo) +
        '<h3>Dónde rindes más</h3>' + AG.checks('ambiente', A[dom].ambiente.concat(deSeg(A[seg].ambiente, 2)), d.ambiente) +
        '<h3>Qué te mueve</h3>' + AG.checks('motiva', A[dom].motivadores, d.motiva) +
        '<h3>Lo que te puede frenar</h3>' +
        '<p class="note" style="margin-top:0;">Todos los estilos tienen su lado difícil. Reconocerlo es lo que te deja trabajarlo.</p>' +
        AG.checks('frena', A[dom].limitaciones, d.frena) +
      '</div>' +

      '<div class="card">' +
        '<h3>En tus palabras</h3>' +
        '<p class="note" style="margin-top:0;">' + pistaEjemplo + ' ¿Cómo trabajaste? ¿Qué te salió bien? (Opcional, pero es lo que más le sirve a tu orientador.)</p>' +
        '<div class="campo"><textarea id="f_estilo_palabras" rows="4">' + AG.esc(d.palabras) + '</textarea></div>' +
        AG.boton('estilo', AG.completa('estilo')) +
      '</div>';

    const leer = () => ({
      trabajo: AG.marcados(cont, 'trabajo'), ambiente: AG.marcados(cont, 'ambiente'),
      motiva: AG.marcados(cont, 'motiva'), frena: AG.marcados(cont, 'frena'),
      palabras: cont.querySelector('#f_estilo_palabras').value, dom
    });
    const guardar = () => AG.guardadoTxt(AG.fijar('estilo', leer()));
    cont.addEventListener('change', guardar);
    cont.addEventListener('input', guardar);

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer();
      const n = x.trabajo.length + x.ambiente.length + x.motiva.length;
      if(n < 3){ AG.faltan(['marcar al menos 3 frases que te describan en "Cómo trabajas", "Dónde rindes más" o "Qué te mueve" (llevas ' + n + ')']); return; }
      AG.fijar('estilo', x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      AG.terminar('estilo', Object.assign({}, x, {
        orientacion: ori.titulo,
        hoja: {
          'Orientación': ori.titulo,
          'Estilo DISC': NOM[dom].nombre + ' con ' + NOM[seg].nombre,
          'Cómo trabajo': AG.vinetas(x.trabajo), 'Dónde rindo más': AG.vinetas(x.ambiente),
          'Qué me mueve': AG.vinetas(x.motiva), 'Lo que me puede frenar': AG.vinetas(x.frena),
          'En mis palabras': x.palabras.trim()
        }
      }));
    };
  }
};
})();
