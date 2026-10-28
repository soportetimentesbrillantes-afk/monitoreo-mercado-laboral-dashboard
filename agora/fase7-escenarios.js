/* =====================================================================
   Proceso Ágora — Fase 7: Escenarios de vida
   =====================================================================

   Hoja de Ágora: "Propone escenarios de vida a 5, 10 y 15 años. Se
   complementa con información personal en área de captura"; resultado:
   "escenario de vida personalizado".

   Tres horizontes con los nombres del informe ejecutivo de ejemplo de Ágora
   (Construcción, Consolidación, Expansión) y cuatro áreas cada uno. Para cada
   área hay una propuesta armada con lo que la persona ya dijo (estudios,
   sectores que le interesan, su estilo DISC, su prioridad de crecimiento, su
   ruta si ya la eligió) y un espacio para escribir el suyo. La propuesta es
   un punto de partida: no se guarda nada que la persona no haya escrito o
   aceptado.
   ===================================================================== */
(function(){
const F = window.FASES_AGORA = window.FASES_AGORA || {};

const HORIZONTES = [
  {n:5, etapa:'Construcción'}, {n:10, etapa:'Consolidación'}, {n:15, etapa:'Expansión'}
];
const AREAS = [
  {id:'estudios', nombre:'Estudios'}, {id:'trabajo', nombre:'Trabajo'},
  {id:'dinero', nombre:'Dinero e independencia'}, {id:'personal', nombre:'Vida personal y familia'}
];

function contexto(AG){
  const info = AG.info();
  const disc = AG.disc();
  const cre = AG.datos('crecimiento') || {};
  const ruta = AG.datos('ruta') || {};
  const sectores = (info.sectores || []).filter(s => s !== 'Otro' && s !== 'No lo sé aún');
  return {
    nivel: info.nivel, situacion: info.situacion, carrera: (info.carrera || '').trim(),
    sector: sectores[0] || (info.sectorOtro || '').trim(), edad: AG.edad(),
    dom: disc ? disc.dom : null, prioridad: cre.prioridad || '', ruta: ruta.principal || ''
  };
}

/* La propuesta para un horizonte y un área. */
function propuesta(h, area, c){
  const en = c.sector ? ' en ' + c.sector : '';
  const carrera = c.ruta || c.carrera;
  const estudiando = c.situacion === 'Estudiando';
  const P = {
    estudios: {
      5: c.nivel === 'Secundaria' ? 'Terminar la preparatoria y estar estudiando ' + (carrera || 'la carrera que elijas') + '.'
        : c.nivel === 'Preparatoria o bachillerato' ? (estudiando ? 'Estar a la mitad o al final de ' + (carrera ? 'la carrera de ' + carrera : 'tu carrera') + ', con inglés avanzado.' : 'Haber retomado tus estudios: una carrera técnica o licenciatura.')
        : c.nivel === 'Posgrado' ? 'Terminar tu posgrado y ponerlo en práctica.'
        : (estudiando ? 'Haber terminado ' + (carrera || 'tu carrera') + ' y tener tu título; inglés avanzado y alguna certificación.' : 'Una especialización o certificaciones en tu área.'),
      10: 'Una especialización, posgrado o certificación avanzada' + (carrera ? ' relacionada con ' + carrera : '') + '.',
      15: 'Seguir actualizándote; quizá enseñar o formar a otros en lo que sabes.'
    },
    trabajo: {
      5: estudiando || c.nivel === 'Secundaria' ? 'Prácticas profesionales y tu primer empleo' + en + '.' : 'Un empleo formal' + en + ' donde ganes experiencia y resultados que contar.',
      10: 'Un puesto con más responsabilidad' + en + ({D:', dirigiendo proyectos o personas', I:', trabajando con clientes y equipos', S:', como la persona de confianza de tu equipo', C:', como especialista en tu área'}[c.dom] || '') + '.',
      15: {D:'Dirigir un área o tu propio negocio.', I:'Liderar equipos, clientes o tu propio proyecto.', S:'Formar y sostener a un equipo, o tener un negocio propio estable.', C:'Ser especialista reconocido, dar consultoría o tener tu propio despacho.'}[c.dom] || 'Liderazgo profesional o un negocio propio.'
    },
    dinero: {
      5: (c.edad !== null && c.edad < 20) ? 'Tus primeros ingresos propios y empezar a depender menos de tu familia.' : 'Cubrir tus gastos con tu ingreso y empezar un ahorro.',
      10: 'Independencia económica: cubrir tus gastos, tener un fondo de emergencia y empezar a invertir.',
      15: 'Patrimonio propio: ahorro, inversiones o una vivienda.'
    },
    personal: {
      5: c.prioridad ? 'Haber avanzado en tu prioridad de crecimiento: ' + c.prioridad.replace(/\.$/, '') + '.' : 'Algo de ti que quieras haber cuidado o cambiado.',
      10: 'Dónde quieres vivir, con quién, y qué tiempo para ti y los tuyos.',
      15: 'Qué vida quieres: familia, lugar, salud y lo que más te importa.'
    }
  };
  return P[area][h];
}

const vacio = () => ({5:{}, 10:{}, 15:{}});
const lleno = t => String(t || '').trim().length >= 3;

F.escenarios = {
  HORIZONTES, AREAS,
  pintar(cont, AG){
    const d = Object.assign(vacio(), AG.datos('escenarios') || {});
    const c = contexto(AG);
    const anio = new Date().getFullYear();

    cont.innerHTML =
      (AG.infoCompleta() ? '' : '<div class="aviso limites">Las propuestas salen de tu información inicial, tu Perfil DISC y tu crecimiento personal. Si completas esas fases primero, son más tuyas.</div>') +
      '<div class="card">' +
        '<p style="margin-top:0;">Imagina tu vida en tres momentos. En cada área hay una propuesta armada con lo que ya contestaste: úsala como punto de partida, cámbiala o escribe la tuya. Lo que cuenta es lo que tú escribes.</p>' +
        HORIZONTES.map((h, i) =>
          '<details class="horizonte" data-h="' + h.n + '"' + (i === 0 ? ' open' : '') + '>' +
          '<summary><span>A ' + h.n + ' años · ' + h.etapa + '</span><span class="sub">' + (anio + h.n) + (c.edad !== null ? ' · tendrás ' + (c.edad + h.n) + ' años' : '') + ' · <span data-cuenta="' + h.n + '"></span></span></summary>' +
          AREAS.map(a =>
            '<div class="campo" style="margin-top:12px;"><label for="f_esc_' + h.n + '_' + a.id + '">' + a.nombre + '</label>' +
            '<div class="sugerencia"><span>' + AG.esc(propuesta(h.n, a.id, c)) + '</span><button type="button" class="secondary mini" data-usar="' + h.n + '_' + a.id + '">Usar</button></div>' +
            '<textarea id="f_esc_' + h.n + '_' + a.id + '" data-h="' + h.n + '" data-a="' + a.id + '" rows="2">' + AG.esc(d[h.n][a.id] || '') + '</textarea></div>').join('') +
          '</details>').join('') +
        '<p class="note">Escribe al menos dos áreas en cada horizonte. Revísalo con tu orientador: los escenarios cambian, y está bien.</p>' +
        AG.boton('escenarios', AG.completa('escenarios')) +
      '</div>';

    const leer = () => {
      const x = vacio();
      cont.querySelectorAll('textarea[data-h]').forEach(t => { if(t.value.trim()) x[t.dataset.h][t.dataset.a] = t.value; });
      return x;
    };
    const contar = () => HORIZONTES.forEach(h => {
      const n = AREAS.filter(a => lleno(cont.querySelector('#f_esc_' + h.n + '_' + a.id).value)).length;
      cont.querySelector('[data-cuenta="' + h.n + '"]').textContent = n + ' de ' + AREAS.length;
    });
    const guardar = () => { contar(); AG.guardadoTxt(AG.fijar('escenarios', leer())); };
    cont.addEventListener('input', guardar);
    contar();

    cont.querySelectorAll('[data-usar]').forEach(b => {
      b.onclick = () => {
        const [h, a] = b.dataset.usar.split('_');
        const t = cont.querySelector('#f_esc_' + h + '_' + a);
        const txt = propuesta(Number(h), a, c);
        t.value = t.value.trim() ? t.value.trim() + '\n' + txt : txt;
        t.focus(); guardar();
      };
    });

    cont.querySelector('#btnCompletar').onclick = () => {
      const x = leer();
      const cortos = HORIZONTES.filter(h => AREAS.filter(a => lleno(x[h.n][a.id])).length < 2);
      if(cortos.length){
        AG.faltan(cortos.map(h => 'escribir al menos 2 áreas a ' + h.n + ' años'));
        cortos.forEach(h => { cont.querySelector('details[data-h="' + h.n + '"]').open = true; });
        return;
      }
      AG.fijar('escenarios', x);
      cont.querySelector('#btnCompletar').textContent = 'Guardar cambios';
      const texto = h => AREAS.filter(a => lleno(x[h][a.id])).map(a => a.nombre + ': ' + x[h][a.id].trim()).join('\n');
      AG.terminar('escenarios', Object.assign({}, x, {hoja: {'A 5 años': texto(5), 'A 10 años': texto(10), 'A 15 años': texto(15)}}));
    };
  }
};
})();
