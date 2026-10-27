/* =====================================================================
   Carreras para la fase 8 (Ruta profesional) del proceso Ágora
   =====================================================================

   Lista de trabajo del Club, POR REVISAR CON ÁGORA. No es la oferta de una
   universidad: son carreras comunes en México, agrupadas por área, para que
   la persona pueda compararse con las que está considerando y con otras
   afines.

   Cada carrera dice:
     n  nombre
     a  área
     e  estilos DISC con los que suele encajar el día a día de esa carrera,
        el primero es el más cercano. Es una referencia para orientar, no un
        requisito: hay buenos profesionistas de todos los estilos en todas
        las carreras.
     s  sectores del monitoreo del Club donde suelen trabajar quienes la
        estudian (claves de manifest.json). Vacío si el monitoreo todavía no
        cubre su sector; entonces no se muestra dato de mercado.
     d  en una línea, qué se hace

   Si cambias esta lista, anota el cambio en BITACORA.md: las personas que ya
   hicieron la fase guardaron el nombre de la carrera tal como estaba.
   ===================================================================== */

window.CARRERAS_AGORA = [
  // Administración, negocios y economía
  {n:'Administración de empresas', a:'Administración y negocios', e:['D','S'], s:['gestion','ventas'], d:'Planear, organizar y dirigir los recursos de una organización.'},
  {n:'Contaduría pública', a:'Administración y negocios', e:['C','S'], s:['finanzas','gestion'], d:'Registrar, revisar y reportar la información financiera y fiscal.'},
  {n:'Finanzas', a:'Administración y negocios', e:['C','D'], s:['finanzas'], d:'Analizar inversiones, riesgos y el dinero de personas y empresas.'},
  {n:'Economía', a:'Administración y negocios', e:['C','D'], s:['finanzas','gestion'], d:'Entender cómo se producen y reparten los recursos, y analizar mercados.'},
  {n:'Actuaría', a:'Ciencias exactas', e:['C'], s:['finanzas','ti'], d:'Medir riesgos con matemáticas y estadística: seguros, pensiones, finanzas.'},
  {n:'Negocios internacionales', a:'Administración y negocios', e:['D','I'], s:['logistica','ventas','gestion'], d:'Comprar, vender y operar entre países.'},
  {n:'Comercio exterior y aduanas', a:'Administración y negocios', e:['C','D'], s:['logistica','legal'], d:'Importar y exportar cumpliendo trámites, normas y tiempos.'},
  {n:'Mercadotecnia', a:'Administración y negocios', e:['I','D'], s:['ventas'], d:'Entender al cliente y diseñar cómo se da a conocer y se vende un producto.'},
  {n:'Ventas y desarrollo comercial', a:'Administración y negocios', e:['I','D'], s:['ventas'], d:'Buscar clientes, negociar y cerrar ventas.'},
  {n:'Recursos humanos', a:'Administración y negocios', e:['S','I'], s:['gestion'], d:'Reclutar, capacitar y cuidar a las personas de una organización.'},
  {n:'Logística y cadena de suministro', a:'Administración y negocios', e:['C','D'], s:['logistica'], d:'Que lo que se compra, produce y vende llegue a tiempo y al menor costo.'},
  {n:'Administración hotelera', a:'Turismo y servicios', e:['S','I'], s:['turismo','gestion'], d:'Operar hoteles y servicios de hospedaje.'},
  {n:'Turismo', a:'Turismo y servicios', e:['I','S'], s:['turismo'], d:'Diseñar, vender y operar viajes y experiencias.'},
  {n:'Gastronomía', a:'Turismo y servicios', e:['I','S'], s:['turismo'], d:'Cocina profesional y administración de restaurantes.'},

  // Derecho y ciencias sociales
  {n:'Derecho', a:'Derecho y ciencias sociales', e:['D','C'], s:['legal'], d:'Interpretar y aplicar las leyes; defender, asesorar y negociar.'},
  {n:'Criminología', a:'Derecho y ciencias sociales', e:['C','D'], s:['legal'], d:'Estudiar el delito, sus causas y su prevención.'},
  {n:'Relaciones internacionales', a:'Derecho y ciencias sociales', e:['I','D'], s:[], d:'Entender y gestionar las relaciones entre países y organismos.'},
  {n:'Ciencias políticas y administración pública', a:'Derecho y ciencias sociales', e:['D','I'], s:[], d:'Analizar el poder y diseñar o gestionar políticas públicas.'},
  {n:'Comunicación', a:'Derecho y ciencias sociales', e:['I','S'], s:['ventas'], d:'Crear y transmitir mensajes en medios, empresas e instituciones.'},
  {n:'Publicidad y relaciones públicas', a:'Derecho y ciencias sociales', e:['I','D'], s:['ventas'], d:'Campañas y la imagen de marcas, personas e instituciones.'},
  {n:'Trabajo social', a:'Derecho y ciencias sociales', e:['S','I'], s:[], d:'Acompañar a personas y comunidades para mejorar sus condiciones de vida.'},

  // Ingeniería, manufactura y construcción
  {n:'Ingeniería industrial', a:'Ingeniería y manufactura', e:['D','C'], s:['automotriz','metalmecanica','logistica'], d:'Mejorar procesos de producción: calidad, costos y tiempos.'},
  {n:'Ingeniería mecánica', a:'Ingeniería y manufactura', e:['C','D'], s:['metalmecanica','automotriz'], d:'Diseñar y mantener máquinas y sistemas mecánicos.'},
  {n:'Ingeniería mecatrónica', a:'Ingeniería y manufactura', e:['C','D'], s:['automotriz','metalmecanica'], d:'Unir mecánica, electrónica y programación: robots y automatización.'},
  {n:'Ingeniería automotriz', a:'Ingeniería y manufactura', e:['C','D'], s:['automotriz'], d:'Diseñar, fabricar y probar vehículos y sus componentes.'},
  {n:'Ingeniería eléctrica y electrónica', a:'Ingeniería y manufactura', e:['C'], s:['automotriz','metalmecanica'], d:'Circuitos, energía y sistemas electrónicos.'},
  {n:'Ingeniería química', a:'Ingeniería y manufactura', e:['C'], s:[], d:'Transformar materias primas en productos a escala industrial.'},
  {n:'Ingeniería ambiental', a:'Ingeniería y manufactura', e:['C','S'], s:[], d:'Prevenir y resolver problemas de contaminación y uso de recursos.'},
  {n:'Ingeniería civil', a:'Ingeniería y manufactura', e:['C','D'], s:[], d:'Diseñar y construir obras: edificios, carreteras, puentes.'},
  {n:'Arquitectura', a:'Arquitectura y diseño', e:['C','I'], s:[], d:'Diseñar espacios y edificios funcionales y bellos.'},
  {n:'Diseño industrial', a:'Arquitectura y diseño', e:['I','C'], s:['automotriz'], d:'Diseñar objetos y productos que se fabrican en serie.'},
  {n:'Diseño gráfico y digital', a:'Arquitectura y diseño', e:['I','C'], s:['ventas'], d:'Comunicar con imágenes: identidad, publicaciones, interfaces.'},

  // Tecnologías de la información
  {n:'Ingeniería en sistemas computacionales', a:'Tecnologías de la información', e:['C','D'], s:['ti'], d:'Diseñar e implementar sistemas de software y su infraestructura.'},
  {n:'Ingeniería de software', a:'Tecnologías de la información', e:['C'], s:['ti'], d:'Construir y mantener aplicaciones y programas.'},
  {n:'Ciencia de datos e inteligencia artificial', a:'Tecnologías de la información', e:['C','D'], s:['ti','finanzas'], d:'Analizar datos y construir modelos que ayudan a decidir.'},
  {n:'Ciberseguridad', a:'Tecnologías de la información', e:['C'], s:['ti'], d:'Proteger sistemas e información de ataques.'},
  {n:'Tecnologías de la información y redes', a:'Tecnologías de la información', e:['C','S'], s:['ti'], d:'Instalar, operar y dar soporte a equipos, redes y servicios.'},

  // Salud
  {n:'Medicina', a:'Salud', e:['C','S'], s:[], d:'Prevenir, diagnosticar y tratar enfermedades.'},
  {n:'Enfermería', a:'Salud', e:['S','C'], s:[], d:'Cuidar a pacientes y acompañar su recuperación.'},
  {n:'Psicología', a:'Salud', e:['S','I'], s:[], d:'Entender la conducta y acompañar procesos emocionales y de aprendizaje.'},
  {n:'Nutrición', a:'Salud', e:['S','C'], s:[], d:'Alimentación para la salud de personas y comunidades.'},
  {n:'Odontología', a:'Salud', e:['C','S'], s:[], d:'Prevenir y tratar problemas de dientes y boca.'},
  {n:'Fisioterapia', a:'Salud', e:['S','I'], s:[], d:'Recuperar el movimiento y prevenir lesiones.'},
  {n:'Químico farmacéutico biólogo', a:'Salud', e:['C'], s:[], d:'Análisis clínicos, medicamentos y control de calidad.'},
  {n:'Medicina veterinaria', a:'Salud', e:['S','C'], s:[], d:'Cuidar la salud de los animales.'},

  // Ciencias, educación, artes y humanidades
  {n:'Biología y biotecnología', a:'Ciencias exactas y naturales', e:['C'], s:[], d:'Estudiar los seres vivos y aprovecharlos en salud, alimentos o ambiente.'},
  {n:'Matemáticas o física', a:'Ciencias exactas y naturales', e:['C'], s:[], d:'Investigar y modelar con rigor; base para ciencia, tecnología y finanzas.'},
  {n:'Pedagogía y ciencias de la educación', a:'Educación', e:['S','I'], s:[], d:'Enseñar y diseñar cómo se aprende.'},
  {n:'Artes (música, artes visuales o escénicas)', a:'Artes y humanidades', e:['I'], s:[], d:'Crear, interpretar y producir obra artística.'},
  {n:'Cine y producción audiovisual', a:'Artes y humanidades', e:['I','D'], s:[], d:'Contar historias en video: guion, producción, edición.'},
  {n:'Letras, historia o filosofía', a:'Artes y humanidades', e:['C','S'], s:[], d:'Leer, investigar y escribir sobre la cultura y las ideas.'},

  // Carreras técnicas
  {n:'Técnico en mantenimiento industrial', a:'Carreras técnicas', e:['S','C'], s:['metalmecanica','automotriz'], d:'Mantener funcionando máquinas y equipos de planta.'},
  {n:'Técnico en contabilidad', a:'Carreras técnicas', e:['C','S'], s:['finanzas'], d:'Registros contables, nómina e impuestos básicos.'},
  {n:'Técnico en programación', a:'Carreras técnicas', e:['C'], s:['ti'], d:'Programar aplicaciones y sitios web.'},
  {n:'Técnico en logística', a:'Carreras técnicas', e:['S','C'], s:['logistica'], d:'Almacén, inventarios y distribución.'}
];
