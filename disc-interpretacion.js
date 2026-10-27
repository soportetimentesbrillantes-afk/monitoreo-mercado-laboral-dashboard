/* =====================================================================
   Interpretación DISC — material compartido
   =====================================================================

   Lo usan tres páginas: disc.html (cuestionario de 24 bloques),
   disc-agora.html (cuestionario de Ágora, 5 secciones) e informe.html.
   Por eso vive en un archivo aparte, aunque el resto del sitio sea de
   páginas autocontenidas: el texto de interpretación es largo y tenerlo
   tres veces garantiza que un día las tres versiones digan cosas distintas.

   El contenido viene del documento "Interpretación As de Diversidad basado
   en el modelo DISC de William Moulton Marston" de Ágora Internacional,
   con la redacción limpiada donde el original tenía errores de traducción.
   La sustancia no se cambió. Si cambias algo aquí, cámbialo contra el
   documento, no de memoria.

   Nada de lo que hay aquí es una conclusión sobre una persona concreta:
   son descripciones generales de cada estilo. La página solo elige cuál
   mostrar según el estilo que salió más alto.
   ===================================================================== */

const DISC = (function(){

const CLAVES = ['D', 'I', 'S', 'C'];

/* Nombres y colores de Ágora. Rojo, amarillo, verde y azul son los colores
   con los que se puntúa en su hoja; se conservan para que el resultado en
   pantalla coincida con el que la persona ve en papel. */
const FACTORES = {
  D: {nombre:'Dominancia',   color:'var(--d)', colorNombre:'Rojo',     corto:'D',
      resumen:'Vas al resultado. Decides rápido, te incomoda lo lento y no evades decir lo que piensas.'},
  I: {nombre:'Influencia',   color:'var(--i)', colorNombre:'Amarillo', corto:'I',
      resumen:'Trabajas con y a través de la gente. Convences hablando, contagias ánimo y te cuesta el trabajo aislado.'},
  S: {nombre:'Estabilidad',  color:'var(--s)', colorNombre:'Verde',    corto:'S',
      resumen:'Sostienes. Eres constante, escuchas, evitas el conflicto y prefieres el cambio avisado al repentino.'},
  C: {nombre:'Cumplimiento', color:'var(--c)', colorNombre:'Azul',     corto:'C',
      resumen:'Te importa que esté bien. Analizas, verificas y prefieres una instrucción clara a improvisar.'}
};

/* ---------------- Interpretación de Ágora, por estilo ---------------- */
const AGORA = {
  D: {
    estilo: ['Dominante', 'Enfocado a los resultados', 'Decisivo', 'Directo'],
    descripcion: [
      'Le gusta estar en posiciones de autoridad o donde puede hacer las cosas en sus propios términos.',
      'Tiende a tomar riesgos y a tener iniciativa; está muy orientado a los objetivos e incluso es competitivo.',
      'Es buen solucionador de problemas y piensa en la imagen grande; responde bien a la lógica, la razón y la información, no tanto a la emoción.',
      'Tiene alta fuerza del ego, que puede percibirse positivamente como confianza o negativamente como orgullo.'
    ],
    fortalezas: [
      'Rápido para tomar una decisión; muestra gran confianza.',
      'Líder natural, dispuesto a hablar.',
      'Organizador que da gran valor al tiempo.',
      'Muy orientado a objetivos.',
      'Desafía el status quo.',
      'Generalmente optimista.',
      'Pensador innovador: no teme tomar un riesgo o probar algo nuevo.',
      'Trabaja bien bajo presión, en crisis, con cargas pesadas o varios proyectos a la vez.'
    ],
    limitaciones: [
      'Puede ignorar otras opiniones.',
      'Quiere sacar el proyecto rápido y puede calcular mal cuánto tiempo toma lograrlo.',
      'Se impacienta fácilmente con los demás.',
      'No le gusta la rutina; puede irse a crear proyectos nuevos para evitar repetir lo mismo.',
      'Puede crear presión cuando no hace falta.',
      'Puede tomar decisiones precipitadas, sin reunir todos los datos ni sopesar pros y contras.',
      'Puede delegar más de lo que hace, y depender de otros para sacar el trabajo.'
    ],
    temor: 'Que se aproveche de él o ella alguien en quien confía. Por eso tiende a buscar posiciones de autoridad, donde controla las decisiones y el entorno.',
    motivadores: [
      'Nuevos retos.',
      'Cumplir objetivos.',
      'Competencia.',
      'Poder y autoridad para asumir riesgos y tomar decisiones.',
      'Libertad de tareas rutinarias y repetitivas.',
      'Agradecimiento y reconocimiento por parte de otros.',
      'Premios.'
    ],
    ambiente: [
      'Estructura que no sea de rutina; tareas y actividades nuevas.',
      'Posición de autoridad y capacidad para tomar decisiones.',
      'Libertad de control; moverse en nuevas direcciones.',
      'Enfoque innovador hacia el futuro.',
      'Proyectos que producen resultados tangibles y objetivos que cumplir.',
      'No tener que trabajar mucho con detalles o minucias; planificación general.',
      'Evaluaciones basadas en resultados, no en métodos.',
      'Flexibilidad de horario, actividades variadas, oportunidad de avanzar.',
      'Comunicación directa.'
    ],
    comoComunicarse: [
      'Sé breve, directo y al grano.',
      'Pregunta "qué", no "cómo".',
      'Sugiere maneras de lograr resultados y de resolver problemas.',
      'Destaca los beneficios lógicos de cada enfoque.'
    ],
    comoNo: [
      'Titubear o repetirte.',
      'Centrarte demasiado en detalles y procesos en vez de en metas y resultados.',
      'Ser demasiado sociable o emocional.',
      'Sugerir soluciones que no se centran en el problema, o solo dar razones para no hacer algo.',
      'Hacer generalizaciones o afirmaciones sin apoyo.'
    ],
    crecimiento: [
      'Esfuérzate por ser un oyente activo.',
      'Toma en cuenta las ideas de otros.',
      'Busca el consenso en los equipos.',
      'Sé menos controlador cuando trabajes con los demás.',
      'Aprecia las opiniones, sentimientos y deseos de los demás.',
      'Presta atención a tus relaciones personales.',
      'Muestra apoyo a otros miembros del equipo.',
      'Tómate el tiempo para explicar los "porqués" de tus declaraciones y propuestas.',
      'Mantén una actitud amable y accesible; cuida tu tono y tu lenguaje corporal.',
      'Practica la paciencia.'
    ]
  },

  I: {
    estilo: ['Influyente', 'Persuasivo', 'Impulsivo'],
    descripcion: [
      'Es muy locuaz, entusiasta y optimista.',
      'Crece al tener experiencias divertidas y al estar con otras personas.',
      'No tiene problema en hablar con un desconocido ni miedo a ser el centro de atención.',
      'Es a la vez confiado y optimista; puede poner a la gente de su lado muy rápido.',
      'Es persuasivo e influyente.',
      'Tiende a ser algo emocional y a veces muy espontáneo o impulsivo.'
    ],
    fortalezas: [
      'Creativo; genera lluvias de ideas y resuelve problemas.',
      'Anima a los demás: es capaz de motivar a otros a actuar.',
      'Puede ser un gran gerente.',
      'Muy persuasivo e influyente.',
      'Sentido del humor, positivo y con gran actitud.',
      'Trae vida y diversión a una situación aburrida.',
      'Acepta a los demás con facilidad.',
      'Negocia conflictos; es el pacificador.',
      'Espontáneo y agradable.'
    ],
    limitaciones: [
      'Falta de atención a los detalles.',
      'Puede manejar mal el tiempo y la organización si no se da una estrategia.',
      'Puede escuchar solo cuando le conviene.',
      'Puede dar la impresión de estar "esperando su turno para hablar".',
      'Puede abusar de los gestos y las expresiones faciales.',
      'Tiene mayor tendencia a prometer que a involucrarse.',
      'Puede preocuparse más por la popularidad que por los resultados tangibles.'
    ],
    temor: 'Ser rechazado por otros. Por eso se muestra divertido, extrovertido y simpático.',
    motivadores: [
      'Los elogios y el reconocimiento.',
      'Popularidad y aceptación.',
      'Un buen ambiente.',
      'Libertad de normas y reglamentos.',
      'Que otras personas manejen los detalles.',
      'Creatividad.'
    ],
    ambiente: [
      'Libertad para el tiempo social y la diversión.',
      'Procedimientos prácticos, sin muchas tareas repetitivas.',
      'Pocos conflictos y discusiones; un ambiente positivo y optimista.',
      'Libertad de controles y detalles.',
      'Un foro para expresar ideas; actividades de grupo.',
      'Estima social y aceptación; gente con quien hablar.',
      'Oportunidad de motivar e influir en los demás.',
      'Una estrategia clara para la organización y los detalles.',
      'Reconocimiento por sus habilidades y talentos.',
      'Flexibilidad en el horario; actividades variadas.'
    ],
    comoComunicarse: [
      'Construye un entorno favorable y amistoso.',
      'Deja tiempo para la conversación y lo social.',
      'Da oportunidad de verbalizar ideas, hablar de personas y de intuiciones.',
      'Comparte testimonios relacionados con lo que propones.',
      'Muestra entusiasmo.',
      'Ayuda a convertir las palabras en acciones; crea incentivos para dar seguimiento.',
      'Envía los detalles por escrito.',
      'Dile qué hacer, y déjale ser independiente y creativo.',
      'Desarrolla una relación participativa; cuida tu tono y tu lenguaje corporal.'
    ],
    comoNo: [
      'Eliminar el tiempo social.',
      'Hacerlo todo en lugar de hablarlo.',
      'Ignorar sus ideas o logros.',
      'Ser demasiado frío o reservado: teme el rechazo.'
    ],
    crecimiento: [
      'Sopesa los pros y los contras antes de decidir.',
      'Sé menos impulsivo y espontáneo: revisa primero la información.',
      'Oriéntate más a los resultados.',
      'Aplica tu creatividad y talento a cumplir las metas.',
      'Ejerce control sobre tus acciones, palabras y emociones.',
      'Céntrate en los detalles y en los hechos.',
      'Busca estrategias de organización y manejo del tiempo.',
      'Recuerda bajar el ritmo para los demás miembros del equipo.',
      'A veces tendrás que hablar menos y escuchar más; que los demás noten que prestas atención.',
      'Considera y evalúa las ideas de otros.',
      'No prometas de más: si dices que sí, cúmplelo con acciones.'
    ]
  },

  S: {
    estilo: ['Estable', 'Sincero', 'Simpático'],
    descripcion: [
      'Se describe como tranquilo y estable.',
      'Busca la rutina, la previsibilidad y la seguridad en su vida.',
      'Se esfuerza por relaciones personales cercanas y ambientes positivos, sin conflicto.',
      'Es pacífico, buen oyente, amigo leal y buen seguidor.',
      'Además de positivo, es amable, paciente y comprensivo.',
      'Puede ser posesivo con sus seres queridos y, a veces, pasivo-agresivo al evitar el conflicto o la negatividad.'
    ],
    fortalezas: [
      'Fiable y confiable.',
      'Miembro leal del equipo.',
      'Sincero y solidario.',
      'Sigue instrucciones muy bien.',
      'Paciente con los demás; sensible a las críticas.',
      'Buen oyente, paciente y empático: hace que los demás sientan que pertenecen.',
      'Bueno para conciliar conflictos; ecuánime.',
      'Encuentra maneras fáciles de hacer las cosas, llenas de sentido común.'
    ],
    limitaciones: [
      'Se resiste a los cambios o tarda mucho en adaptarse.',
      'Puede tener dificultades para establecer prioridades.',
      'Ralentiza la acción.',
      'Puede guardarse las preocupaciones o dudar en compartir información.',
      'Puede desatender sus propias necesidades por satisfacer las de los demás.',
      'Puede guardar rencor.',
      'Puede tener un comportamiento pasivo-agresivo.',
      'Puede preferir la manera fácil en vez de la correcta.'
    ],
    temor: 'Perder su seguridad. Por eso crea rutinas y se resiste al cambio.',
    motivadores: [
      'El reconocimiento a la lealtad y la fiabilidad.',
      'Protección y seguridad.',
      'Que no haya cambios bruscos de procedimiento o de estilo de vida.',
      'Actividades que se pueden iniciar y terminar.',
      'Tiempo de calidad con los demás; relaciones positivas y personales.',
      'Relaciones y entornos pacíficos y libres de conflicto; agradecimiento sincero.'
    ],
    ambiente: [
      'Procedimientos y sistemas prácticos.',
      'Patrones de trabajo repetidos.',
      'Instrucciones y expectativas claras.',
      'Estabilidad y previsibilidad; tiempo suficiente para ajustarse a los cambios.',
      'Tareas que se pueden completar antes de pasar a lo siguiente.',
      'Pocos conflictos o discusiones; un ambiente positivo.',
      'Un ambiente de equipo.',
      'Reconocimiento por el trabajo bien hecho.',
      'Consenso para tomar decisiones.',
      'Presión limitada.'
    ],
    comoComunicarse: [
      'Crea un entorno favorable, personal y agradable.',
      'Sé paciente y amable.',
      'Presenta las ideas o los cambios a la práctica actual de forma no amenazante.',
      'Da tiempo para adaptarse.',
      'Expresa interés sincero en la persona; haz preguntas personales.',
      'Aclara las tareas y responde al "cómo".',
      'Define con claridad los objetivos, los procedimientos y su papel en el plan general.'
    ],
    comoNo: [
      'Ser agresivo o demasiado exigente.',
      'Confrontar continuamente.',
      'Hablar sin ceder la palabra: que sea gran oyente no significa que no tenga nada que decir.',
      'Impacientarse con sus preguntas o dar respuestas vagas.'
    ],
    crecimiento: [
      'Ábrete más al cambio; incluso sé espontáneo a veces.',
      'Sé más directo en tus interacciones.',
      'Di lo que quieres decir; no siempre te reprimas.',
      'Presta atención a tus propias necesidades, no solo a las de los demás.',
      'Céntrate en los objetivos generales del equipo más que en los procedimientos.',
      'Acepta la confrontación constructiva; no la internalices. Sé flexible.',
      'Aumenta tu ritmo para lograr las metas; muestra iniciativa.',
      'Trabaja en expresar pensamientos, opiniones y sentimientos.'
    ]
  },

  C: {
    estilo: ['Consciente', 'Creativo', 'Cumplido', 'Correcto', 'Preciso'],
    descripcion: [
      'Es perfeccionista.',
      'Da gran valor a ser preciso y correcto, y a ir hasta el final.',
      'Se enorgullece de su trabajo.',
      'Piensa de manera lógica, analítica y sistemática.',
      'Tiende a ser excelente resolviendo problemas y en el pensamiento creativo.',
      'Se exige un nivel muy alto, a sí mismo y a los demás, lo que puede hacerlo un poco crítico.',
      'Es realista y cuidadoso; tiende a ser tranquilo y a veces solitario.'
    ],
    fortalezas: [
      'Perspectiva realista.',
      'Pensador creativo, capaz de resolver problemas.',
      'Señala las razones por las que algo no va a funcionar o no debería cambiar.',
      'Consciente, ecuánime y coherente.',
      'Completo y exacto; hace preguntas importantes.',
      'Necesita y pone límites claros para las acciones y las relaciones.',
      'Define la situación; reúne datos y hechos.',
      'Se asegura de que los demás tengan información precisa.',
      'Automotivado; diplomático, se esfuerza por lograr el consenso.'
    ],
    limitaciones: [
      'Puede ser percibido como negativo.',
      'Cede en lugar de argumentar.',
      'Se estanca en los detalles.',
      'Puede atarse a los procedimientos y al método.',
      'Puede preferir trabajar solo en vez de con los demás.',
      'Prefiere no verbalizar sentimientos.'
    ],
    temor: 'Ser criticado, sobre todo por su trabajo. Por eso dedica mucho tiempo y energía a ser preciso y correcto.',
    motivadores: [
      'Altos estándares de calidad.',
      'Tiempo y organización suficientes para hacer las cosas correctamente.',
      'Reconocimiento por el trabajo bien hecho y por el tiempo que toman ciertas cosas.',
      'Interacción social limitada.',
      'Tareas e instrucciones detalladas; parámetros y expectativas claras; información organizada con lógica.',
      'Entornos y relaciones pacíficos, sin confrontación.'
    ],
    ambiente: [
      'Un espacio tranquilo.',
      'Trabajo organizado.',
      'Autonomía e independencia.',
      'Tareas y proyectos que se pueden seguir hasta el final, con precisión.',
      'Tareas especializadas o técnicas.',
      'Procedimientos prácticos de trabajo; rutinas y sistemas.',
      'Pocos conflictos y discusiones.',
      'Instrucciones claras; expectativas y descripción del trabajo.',
      'La tranquilidad de estar haciendo lo que se espera.',
      'Cambio planificado.'
    ],
    comoComunicarse: [
      'Prepara tu caso con antelación.',
      'Conoce los pros y los contras; apoya tus ideas con datos precisos.',
      'Sé paciente, persistente y diplomático al explicar.',
      'Sé específico sobre los acuerdos.',
      'Si no estás de acuerdo, discute los hechos, no a la persona.',
      'Asegúrate de que un cambio esté bien pensado y de que haya tiempo para ajustarse.',
      'Escucha sus datos y detalles: se frustra cuando no puede presentarlos.'
    ],
    comoNo: [
      'Negarte a explicar los detalles.',
      'Argumentar con generalizaciones o datos inexactos.',
      'Usar un tono fuerte, lenguaje corporal agresivo o acciones de confrontación.',
      'Hacer que se sienta atacado: teme la crítica.',
      'No tener tiempo para la persona, o no tener un plan o una razón para una decisión.'
    ],
    crecimiento: [
      'Sé menos crítico contigo y con los demás.',
      'Sé más decisivo: a veces, sin toda la información, hay que ir con el instinto.',
      'Construye relaciones con los otros miembros del equipo.',
      'A veces conviene centrarse menos en los hechos y más en la gente.'
    ]
  }
};

/* Habilidades del catálogo del Club que suelen complementar cada estilo. No
   son carencias: son el lado que ese estilo ejercita menos por naturaleza. */
const CRECIMIENTO_HABILIDADES = {
  D: ['escucha', 'trabajo en equipo', 'comunicación', 'paciencia'],
  I: ['organización', 'análisis', 'planeación', 'atención al detalle'],
  S: ['toma de decisiones', 'negociación', 'liderazgo', 'comunicación'],
  C: ['comunicación', 'liderazgo', 'trabajo en equipo', 'adaptabilidad']
};

/* ---------------------------- Utilidades ---------------------------- */

function esc(v){
  return String(v == null ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* Fecha legible. Acepta AAAA-MM-DD o ISO completo; nunca la deja pasar
   tal cual porque ese formato no debe verse en pantalla. */
function fechaLegible(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  try{ return d.toLocaleDateString('es-MX', {day:'numeric', month:'long', year:'numeric'}); }
  catch(e){ return d.toDateString(); }
}

function leerGuardado(){
  try{
    const crudo = localStorage.getItem('cmb_disc');
    const g = crudo ? JSON.parse(crudo) : null;
    return (g && g.puntajes) ? g : null;
  }catch(e){ return null; }
}

/* Orden de mayor a menor, estilo dominante, segundo, y si hay empate o el
   perfil salió plano. Los umbrales se expresan como fracción de la escala
   para que valgan igual en el cuestionario de bloques (−48..+48) y en el de
   Ágora (0..~80). */
function analizar(p, escala){
  const ordenados = CLAVES.slice().sort((a,b) => (p[b].neto||0) - (p[a].neto||0));
  const amplitud = (escala.max - escala.min) || 96;
  const dom = ordenados[0], seg = ordenados[1];
  const empate = (p[dom].neto - p[seg].neto) <= amplitud * (4/96);
  const plano  = (p[ordenados[0]].neto - p[ordenados[3]].neto) <= amplitud * (8/96);
  return {ordenados, dom, seg, empate, plano};
}

function lista(items){
  return '<ul>' + items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
}

/* Barra por factor. Con escala bipolar (bloques) crece desde el centro;
   con escala positiva (Ágora) crece desde la izquierda. */
function barra(k, p, escala){
  const f = FACTORES[k];
  const v = p[k].neto || 0;
  let estilo;
  if(escala.min < 0){
    const ancho = Math.abs(v) / escala.max * 50;
    estilo = v >= 0
      ? 'left:50%;width:' + ancho + '%;background:' + f.color + ';'
      : 'right:50%;width:' + ancho + '%;background:' + f.color + ';opacity:.55;';
  }else{
    estilo = 'left:0;width:' + Math.max(0, Math.min(100, v / escala.max * 100)) + '%;background:' + f.color + ';';
  }
  return '<div class="perfil-barra">' +
    '<span class="nom" style="color:' + f.color + '">' + f.corto + ' · ' + f.nombre + '</span>' +
    '<span class="pista">' + (escala.min < 0 ? '<span class="centro"></span>' : '') +
      '<span class="valor" style="' + estilo + '"></span></span>' +
    '<span class="cifra">' + (escala.min < 0 && v > 0 ? '+' : '') + v + '</span>' +
    '</div>';
}

/* El "tablero" de Ágora: una recta numérica por color, un punto en cada
   puntuación y una línea que los une. La figura que sale es lo que se lee. */
function tablero(p, escala){
  const W = 520, H = 220, izq = 44, der = 30, arriba = 22, abajo = 34;
  const colX = i => izq + i * ((W - izq - der) / 3);
  const y = v => arriba + (1 - (v - escala.min) / (escala.max - escala.min)) * (H - arriba - abajo);
  const puntos = CLAVES.map((k, i) => ({k, x: colX(i), y: y(p[k].neto || 0)}));
  const marcas = [escala.min, (escala.min + escala.max) / 2, escala.max];
  return '<svg class="tablero" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Tablero de cuadrantes y tendencias">' +
    marcas.map(v => '<line x1="' + izq + '" x2="' + (W - der) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="guia"/>' +
      '<text x="' + (izq - 8) + '" y="' + (y(v) + 4) + '" class="marca" text-anchor="end">' + v + '</text>').join('') +
    puntos.map(pt => '<line x1="' + pt.x + '" x2="' + pt.x + '" y1="' + arriba + '" y2="' + (H - abajo) + '" class="eje-v"/>').join('') +
    '<polyline points="' + puntos.map(pt => pt.x + ',' + pt.y).join(' ') + '" class="trazo"/>' +
    puntos.map(pt => '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="6" style="fill:' + FACTORES[pt.k].color + '"/>' +
      '<text x="' + pt.x + '" y="' + (H - 12) + '" class="rotulo" text-anchor="middle" style="fill:' + FACTORES[pt.k].color + '">' +
      FACTORES[pt.k].corto + ' · ' + FACTORES[pt.k].colorNombre + '</text>').join('') +
    '</svg>';
}

/* --------------------------- El resultado ---------------------------
   Pinta el resultado completo dentro de `contenedor`. `opciones`:
     escala      {min, max}   cómo leer los netos
     instrumento 'bloques' | 'agora'
     notaEscala  texto que explica de dónde sale la cifra
     alRepetir   función para "Volver a contestar"
     alBorrar    función para "Borrar mi resultado"
*/
function pintarResultado(contenedor, p, opciones){
  const o = opciones || {};
  const escala = o.escala || {min:-48, max:48};
  const {ordenados, dom, seg, empate, plano} = analizar(p, escala);
  const a = AGORA[dom];

  let encabezado;
  if(plano){
    encabezado = '<p>Tus cuatro factores salieron muy parejos. Eso no es un error ni un resultado “malo”: significa que te mueves según lo que pida la situación, y que este cuestionario no encuentra un estilo que domine claramente. Léelo como cuatro descripciones que te quedan a ratos, no como una etiqueta.</p>';
  }else if(empate){
    encabezado = '<p>Tu estilo dominante es <strong style="color:' + FACTORES[dom].color + '">' +
      FACTORES[dom].nombre + '</strong>, muy seguido de <strong style="color:' + FACTORES[seg].color + '">' +
      FACTORES[seg].nombre + '</strong>. Están tan cerca que conviene leer las dos descripciones: probablemente cambies de una a otra según el contexto.</p>';
  }else{
    encabezado = '<p>Tu estilo dominante es <strong style="color:' + FACTORES[dom].color + '">' +
      FACTORES[dom].nombre + '</strong>, con <strong style="color:' + FACTORES[seg].color + '">' +
      FACTORES[seg].nombre + '</strong> como segundo.</p>';
  }

  const seccion = (titulo, cuerpo) => '<h3>' + titulo + '</h3>' + cuerpo;

  contenedor.innerHTML =
    '<div class="card">' +
      '<h2>Tu perfil</h2>' + encabezado +
      (escala.min < 0
        ? '<div class="eje"><span></span><span><span>menos tuyo</span><span>más tuyo</span></span><span></span></div>'
        : '') +
      CLAVES.map(k => barra(k, p, escala)).join('') +
      (o.notaEscala ? '<p class="note">' + o.notaEscala + '</p>' : '') +
      '<h3>Cuadrantes y tendencias</h3>' +
      '<p class="note" style="margin-top:0;">Cada columna es un color; el punto marca tu puntuación y la línea que los une dibuja tu tendencia. Es la misma figura que se traza a mano en la hoja de Ágora.</p>' +
      tablero(p, escala) +
      '<p class="note">En la práctica no hay estilos puros: hay una mezcla, y esa mezcla cambia según las circunstancias y el momento. Este resultado es una foto de hoy.</p>' +
      '<h3>Qué dice cada uno de ti</h3>' +
      CLAVES.map(k =>
        '<p style="margin:8px 0;"><strong style="color:' + FACTORES[k].color + '">' +
        FACTORES[k].nombre + '</strong> <span class="note" style="display:inline;">(' + FACTORES[k].colorNombre + ')</span> — ' + esc(FACTORES[k].resumen) + '</p>').join('') +
      '<div class="aviso limites"><strong>Recuerda qué es esto.</strong> Una herramienta de autoconocimiento, no una prueba psicométrica validada. Describe preferencias, no capacidades, y no predice tu desempeño en un trabajo. Si una empresa te pide un DISC como requisito, este resultado no lo sustituye.</div>' +
    '</div>' +

    '<div class="card" id="interpretacion">' +
      '<h2>Tu estilo: ' + FACTORES[dom].nombre + '</h2>' +
      '<p class="note" style="margin-top:0;">Interpretación de Ágora Internacional para el estilo que salió más alto. Son descripciones generales del estilo, no un diagnóstico de ti: quédate con lo que te reconozcas y descarta lo demás.</p>' +
      '<div>' + a.estilo.map(x => '<span class="pill" style="color:' + FACTORES[dom].color + '">' + esc(x) + '</span>').join('') + '</div>' +
      seccion('Descripción', lista(a.descripcion)) +
      seccion('Fortalezas', lista(a.fortalezas)) +
      seccion('Limitaciones potenciales', lista(a.limitaciones)) +
      seccion('Mayor temor', '<p>' + esc(a.temor) + '</p>') +
      seccion('Qué te motiva', lista(a.motivadores)) +
      seccion('Tu ambiente ideal', lista(a.ambiente)) +
      (empate && !plano
        ? '<details class="otro-estilo"><summary>Ver también ' + FACTORES[seg].nombre + ', tu segundo estilo</summary>' +
          '<div>' + AGORA[seg].estilo.map(x => '<span class="pill" style="color:' + FACTORES[seg].color + '">' + esc(x) + '</span>').join('') + '</div>' +
          seccion('Descripción', lista(AGORA[seg].descripcion)) +
          seccion('Fortalezas', lista(AGORA[seg].fortalezas)) +
          seccion('Limitaciones potenciales', lista(AGORA[seg].limitaciones)) +
          '</details>'
        : '') +
    '</div>' +

    '<div class="card">' +
      '<h2>Para tu plan de vida</h2>' +
      '<p>Esto te puede ayudar a comunicarte mejor, a ubicarte donde rindes más, a resolver conflictos, a adaptarte a los cambios y a construir equipos que funcionen. No es una lista de defectos: es por dónde empezar.</p>' +
      seccion('Áreas de crecimiento personal', lista(a.crecimiento)) +
      seccion('Cómo conviene que se comuniquen contigo', lista(a.comoComunicarse)) +
      seccion('Lo que no funciona contigo', lista(a.comoNo)) +
      '<h3>Para relacionarte con los otros estilos</h3>' +
      '<p class="note" style="margin-top:0;">Lo que a cada estilo le funciona y lo que no. Sirve para trabajar en equipo con gente distinta a ti.</p>' +
      CLAVES.filter(k => k !== dom).map(k =>
        '<details class="otro-estilo"><summary><span style="color:' + FACTORES[k].color + '">' + FACTORES[k].nombre + '</span></summary>' +
        '<p><strong>Cómo:</strong></p>' + lista(AGORA[k].comoComunicarse) +
        '<p><strong>Cómo no:</strong></p>' + lista(AGORA[k].comoNo) +
        '</details>').join('') +
    '</div>' +

    '<div class="card" id="cursosCard">' +
      '<h2>Qué te conviene reforzar</h2>' +
      '<p class="note">Estas no son carencias. Son el lado que tu estilo ejercita menos por costumbre, y dónde puedes fortalecerte más.</p>' +
      '<div>' + CRECIMIENTO_HABILIDADES[dom].map(h => '<span class="pill">' + esc(h) + '</span>').join('') + '</div>' +
      '<div id="cursosSugeridos"><p class="note">Buscando en el catálogo del Club…</p></div>' +
    '</div>' +

    '<div id="compartirDisc"></div>' +

    (window.AGORA_EMBEBIDO
      ? '<div class="card">' +
          '<h2>Y ahora</h2>' +
          '<p>Tu resultado quedó guardado y la fase 2 de tu proceso está completa. Sigue con la fase 3, tu Análisis FODA: ahí este resultado te da pistas para tus fortalezas y debilidades.</p>' +
          '<button class="primary" type="button" id="btnSeguirAgora">Seguir con mi FODA →</button> ' +
          '<button class="secondary" type="button" id="btnRepetir">Volver a contestar</button>' +
          '<button class="secondary" type="button" id="btnBorrarDisc">Borrar mi resultado</button>' +
        '</div>'
      : '<div class="card">' +
        '<h2>Y ahora</h2>' +
        '<p>Tu resultado quedó guardado en este dispositivo. El siguiente paso es tu <a href="foda.html">FODA</a>, y con los dos armas tu <a href="informe.html">informe</a>: ahí va tu plan de acción a 60–90 días y las secciones que trabajas con tu orientador. Si vuelves a <a href="index.html">Tu CV frente al mercado</a>, las vacantes te muestran qué tanto se parecen a tu estilo.</p>' +
        '<a class="secondary" href="informe.html">Armar mi informe →</a>' +
        '<a class="secondary" href="foda.html">Llevar esto a mi FODA →</a>' +
        '<a class="secondary" href="index.html">Ir a mi CV frente al mercado →</a>' +
        '<button class="secondary" type="button" id="btnRepetir">Volver a contestar</button>' +
        '<button class="secondary" type="button" id="btnBorrarDisc">Borrar mi resultado</button>' +
      '</div>');

  // Compartir con el Club: solo si la página cargó compartir-club.js y el
  // envío está activado. La lectura (dominante claro, empate o parejo) va
  // con los datos para que la hoja interna diga lo mismo que vio la persona.
  if(typeof COMPARTIR !== 'undefined' && o.compartir){
    const lectura = plano ? 'parejo' : (empate ? 'empate' : 'dominante claro');
    COMPARTIR.pintar(contenedor.querySelector('#compartirDisc'), {
      tipo: 'disc',
      id: o.compartir.id,
      datos: () => Object.assign({lectura}, o.compartir.datos())
    });
  }
  if(o.alRepetir) contenedor.querySelector('#btnRepetir').onclick = o.alRepetir;
  if(o.alBorrar)  contenedor.querySelector('#btnBorrarDisc').onclick = o.alBorrar;
  const seguir = contenedor.querySelector('#btnSeguirAgora');
  if(seguir && window.CMB_AGORA) seguir.onclick = () => CMB_AGORA.avisar('ir', {fase: 'foda'});
  sugerirCursos(dom);
}

/* ---- Cursos del catálogo propio ----
   Misma regla que el resto del sitio: SOLO cursos del catálogo del Club. Si
   ninguno coincide, se dice, no se rellena con plataformas externas. */
function normalizar(s){
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
}

async function sugerirCursos(dom){
  const cont = document.getElementById('cursosSugeridos');
  if(!cont) return;
  let catalogo;
  try{
    const r = await fetch('manifest.json', {cache:'no-store'});
    const m = await r.json();
    catalogo = (m.COURSES && m.COURSES.cursos) || {};
  }catch(err){
    cont.innerHTML = '<p class="note">No pudimos cargar el catálogo de cursos en este momento.</p>';
    return;
  }
  const buscadas = CRECIMIENTO_HABILIDADES[dom].map(normalizar);
  const vistos = new Set();
  const encontrados = [];
  for(const sector in catalogo){
    for(const c of (catalogo[sector] || [])){
      if(vistos.has(c.id)) continue;
      const suyas = (c.habilidades || []).map(normalizar);
      const cubre = buscadas.filter(b => suyas.some(s => s.includes(b) || b.includes(s)));
      if(cubre.length){
        vistos.add(c.id);
        encontrados.push({c, cubre, sector});
      }
    }
  }
  encontrados.sort((a,b) => b.cubre.length - a.cubre.length);
  if(!encontrados.length){
    cont.innerHTML = '<p class="note">Hoy el catálogo del Club no tiene un curso que trabaje estas habilidades. Preferimos decírtelo a recomendarte algo de otra parte.</p>';
    return;
  }
  cont.innerHTML = encontrados.slice(0,5).map(({c, cubre}) =>
    '<div class="curso-item"><strong>' + esc(c.nombre) + '</strong>' +
    '<div class="sub">' + esc([c.institucion, c.modalidad].filter(v => v && !/^no especificado$/i.test(v)).join(' · ')) +
    (cubre.length ? ' — trabaja ' + esc(cubre.join(', ')) : '') + '</div></div>').join('');
}

/* Estilos del resultado, inyectados una vez para que las dos páginas de
   cuestionario y el informe dibujen igual. */
const CSS = `
  .perfil-barra{display:grid;grid-template-columns:140px 1fr 52px;align-items:center;gap:10px;margin-bottom:9px;font-size:.9rem;}
  .perfil-barra .pista{position:relative;height:26px;background:var(--gris-bg);border-radius:7px;border:1px solid var(--gris-borde);overflow:hidden;}
  .perfil-barra .centro{position:absolute;left:50%;top:0;bottom:0;width:1px;background:var(--gris-borde);}
  .perfil-barra .valor{position:absolute;top:4px;bottom:4px;border-radius:5px;}
  .perfil-barra .nom{font-weight:700;}
  .perfil-barra .cifra{text-align:right;font-variant-numeric:tabular-nums;font-weight:700;color:var(--texto-suave);}
  .eje{display:grid;grid-template-columns:140px 1fr 52px;gap:10px;font-size:.72rem;color:var(--texto-suave);margin-bottom:14px;}
  .eje span:nth-child(2){display:flex;justify-content:space-between;}
  .tablero{width:100%;max-width:560px;height:auto;display:block;margin:6px auto 4px;}
  .tablero .guia{stroke:var(--gris-borde);stroke-width:1;stroke-dasharray:3 4;}
  .tablero .eje-v{stroke:var(--gris-borde);stroke-width:1.5;}
  .tablero .trazo{fill:none;stroke:var(--texto);stroke-width:2;stroke-opacity:.55;}
  .tablero .marca{font-size:11px;fill:var(--texto-suave);font-family:var(--font-sans);}
  .tablero .rotulo{font-size:12px;font-weight:700;font-family:var(--font-sans);}
  .pill{display:inline-block;padding:4px 12px;border-radius:999px;font-size:.78rem;font-weight:700;margin:0 6px 6px 0;background:var(--gris-bg);border:1px solid var(--gris-borde);color:var(--azul-osc);}
  .curso-item{border:1px solid var(--gris-borde);border-radius:10px;padding:11px 13px;margin-bottom:8px;background:var(--gris-bg);font-size:.9rem;}
  .curso-item .sub{font-size:.79rem;color:var(--texto-suave);margin-top:3px;}
  details.otro-estilo{border:1px solid var(--gris-borde);border-radius:10px;padding:10px 14px;margin:10px 0;background:var(--gris-bg);}
  details.otro-estilo summary{cursor:pointer;font-weight:700;}
  details.otro-estilo h3{margin-top:14px;}
  ul{line-height:1.65;padding-left:20px;}
  @media(max-width:600px){ .perfil-barra,.eje{grid-template-columns:96px 1fr 44px;font-size:.84rem;} }
`;
(function inyectar(){
  if(typeof document === 'undefined' || document.getElementById('disc-css')) return;
  const s = document.createElement('style');
  s.id = 'disc-css'; s.textContent = CSS;
  document.head.appendChild(s);
})();

return {CLAVES, FACTORES, AGORA, CRECIMIENTO_HABILIDADES, esc, fechaLegible, leerGuardado, analizar, pintarResultado, tablero, lista};
})();
