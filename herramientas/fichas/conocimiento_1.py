"""Fichas de puesto · parte 1: Turismo y Automotriz.

Lo que NO sale de la corrida: el patrón para reconocer el puesto en los
títulos de las vacantes, lo que se suele pedir cuando la vacante no lo dice,
las competencias con su rúbrica (1, 3 y 5), qué método mide cada una y las
guías de la prueba, la muestra de trabajo y la entrevista. Lo escribió Claude
a partir del panel del Excel y de conocimiento general del mercado mexicano;
es un punto de partida que la empresa ajusta, no una norma.

Formato de cada competencia:
    (nombre, peso, métodos, nivel 1, nivel 3, nivel 5)
    métodos: letras de los métodos que la miden además del CV anónimo
             p = prueba de competencias, m = muestra de trabajo,
             e = entrevista estructurada.
"""

FICHAS = {

# ------------------------------------------------------------------ Turismo
'agente-de-viajes': dict(
    patron=r'agente de viajes|asesor de viajes|ejecutiv[oa] de viajes|travel (agent|advisor|consultant)|consultor de viajes|reservacion(es)? (de )?viajes',
    escolaridad='Bachillerato; carrera técnica o licenciatura en Turismo deseable.',
    experiencia='0 a 2 años en ventas o atención a clientes.',
    comps=[
        ('Armado de itinerarios y cotizaciones', 25, 'pm', 'Cotiza un solo servicio y olvida conexiones, horarios o costos adicionales', 'Arma un itinerario completo con vuelos, hospedaje y traslados, con algún detalle por corregir', 'Itinerarios completos y viables, con alternativas por presupuesto y todas las condiciones explicadas'),
        ('Sistemas de reservación (GDS) y plataformas', 20, 'p', 'No ha usado sistemas de reservación', 'Usa un GDS o portales de proveedores para consultar y reservar', 'Reserva, modifica y emite en GDS (Sabre, Amadeus) con soltura'),
        ('Atención y asesoría al cliente', 25, 'me', 'Responde lo que se le pregunta sin indagar qué necesita el viajero', 'Pregunta por fechas, presupuesto y gustos y propone en consecuencia', 'Detecta necesidades no dichas y convierte consultas en ventas con clientes satisfechos'),
        ('Conocimiento de destinos y tarifas', 15, 'pe', 'Conoce pocos destinos y no distingue tarifas', 'Conoce los destinos principales y las reglas básicas de tarifas', 'Recomienda destinos por temporada y explica condiciones de tarifas y cambios'),
        ('Seguimiento y solución de imprevistos', 15, 'me', 'No da seguimiento después de vender', 'Confirma reservas y avisa cambios al cliente', 'Resuelve cancelaciones y cambios con alternativas, sin que el cliente lo pida'),
    ],
    prueba='Ejercicio de 20 minutos: buscar y comparar tres opciones de vuelo y hotel para un viaje dado en el sistema o portal que use la agencia, con las condiciones de cada tarifa.',
    muestra='Un cliente (actor) quiere viajar en familia con un presupuesto fijo. Arma la cotización completa y explícala en 10 minutos; se califica la propuesta y cómo indaga y presenta.',
    entrevista='1. Cuéntame de un cliente que no sabía a dónde ir. ¿Cómo le ayudaste a decidir?\n2. Un vuelo se cancela un día antes del viaje. ¿Qué haces paso por paso?\n3. ¿Cómo llevas el seguimiento de varias cotizaciones abiertas?\n4. ¿Qué haces cuando el presupuesto del cliente no alcanza para lo que pide?',
),
'guia-turistico': dict(
    patron=r'\bguia (de )?turist|\bguia (bilingue|certificad|acreditad)|tour guide|\bguia de (grupo|recorrido|museo|naturaleza)',
    escolaridad='Bachillerato y la credencial de guía de la SECTUR; licenciatura en Turismo o Historia deseable.',
    experiencia='Sin requisito fijo; práctica guiando grupos.',
    comps=[
        ('Conocimiento del patrimonio y los sitios', 25, 'pe', 'Repite datos sueltos y sin contexto', 'Explica con precisión la historia y el valor de los sitios del recorrido', 'Domina varios sitios y adapta la explicación a cada tipo de público'),
        ('Comunicación y manejo de grupos', 25, 'me', 'Le cuesta que el grupo lo siga o lo escuche', 'Mantiene al grupo atento, unido y en tiempo', 'Grupos grandes o diversos bien llevados, con buena retroalimentación de los visitantes'),
        ('Idioma adicional', 20, 'pm', 'Solo español', 'Guía en otro idioma con algunos errores que no impiden entender', 'Guía con fluidez en otro idioma, incluidas las preguntas del grupo'),
        ('Seguridad y primeros auxilios', 15, 'pe', 'No sabe qué hacer ante una emergencia', 'Conoce el protocolo básico y tiene curso de primeros auxilios', 'Ha manejado incidentes reales con calma y conforme al protocolo'),
        ('Solución de imprevistos', 15, 'me', 'Se bloquea ante cambios', 'Ajusta el recorrido ante clima, cierres o retrasos', 'Resuelve imprevistos sin afectar la experiencia y con alternativas preparadas'),
    ],
    prueba='Cuestionario corto sobre los sitios del recorrido y un caso de primeros auxilios; si la vacante pide otro idioma, conversación de 5 minutos en ese idioma.',
    muestra='Guiar 10 minutos un tramo del recorrido real o simulado ante evaluadores que hacen de turistas con preguntas; si aplica, una parte en el otro idioma.',
    entrevista='1. Cuéntame de un grupo difícil. ¿Qué hiciste?\n2. Un turista se siente mal a mitad del recorrido. ¿Qué haces?\n3. ¿Cómo adaptas la explicación para niños o para especialistas?\n4. Llueve y el sitio principal cierra. ¿Qué ofreces al grupo?',
),
'gerente-de-hotel-restaurante': dict(
    patron=r'gerente (general )?(de )?(hotel|restaurant|alimentos y bebidas|a ?& ?b|operaciones hoteler|hospedaje|division cuartos)|hotel (general )?manager|restaurant manager|gerente de sucursal restaurant',
    escolaridad='Licenciatura en Turismo, Gastronomía, Hotelería o Administración.',
    experiencia='3 a 5 años, al menos 2 coordinando personal.',
    comps=[
        ('Gestión de la operación y la calidad del servicio', 25, 'me', 'Atiende lo urgente sin estándares claros', 'Mantiene estándares de servicio y limpieza con supervisión regular', 'Opera con procedimientos, indicadores de satisfacción y mejoras comprobables'),
        ('Liderazgo y gestión de personal', 25, 'me', 'Sin experiencia dirigiendo equipos', 'Dirige un equipo, asigna turnos y da retroalimentación', 'Equipos estables y capacitados, con baja rotación demostrada'),
        ('Control de costos y rentabilidad', 20, 'pm', 'No lleva indicadores de costo', 'Controla costo de alimentos o de cuartos y un presupuesto', 'Mejora márgenes con revenue management, control de mermas y presupuestos cumplidos'),
        ('Orientación al huésped y manejo de quejas', 15, 'me', 'Evita las quejas o las pasa a otros', 'Atiende quejas y compensa según la política', 'Convierte quejas en recomendaciones y mejora las calificaciones en plataformas'),
        ('Normatividad sanitaria y de seguridad', 15, 'p', 'Desconoce las normas aplicables', 'Conoce la norma de higiene y de protección civil', 'Ha pasado inspecciones y certificaciones (Distintivo H, EC0081)'),
    ],
    prueba='Caso con números de un mes de operación (ocupación, ADR, costo de alimentos, nómina): identificar tres problemas y proponer acciones; preguntas sobre manejo higiénico y protección civil.',
    muestra='Plan de 30 minutos para una semana de alta ocupación con dos bajas de personal: turnos, prioridades y comunicación al equipo. Se presenta en 10 minutos.',
    entrevista='1. Cuéntame de una vez que bajaste costos sin afectar el servicio.\n2. ¿Cómo manejas a un colaborador con buen desempeño que llega tarde seguido?\n3. Un huésped publica una mala reseña. ¿Qué haces?\n4. ¿Qué indicadores revisas cada semana y por qué?',
),
'especialista-en-hoteleria-y-turismo': dict(
    patron=r'especialista (en )?(hoteler|turis)|consultor(a)? (en )?turis|planeacion turistic|desarrollo turistic|analista de turismo|coordinador(a)? de turismo|promocion turistic',
    escolaridad='Licenciatura en Turismo, Hotelería o Mercadotecnia.',
    experiencia='2 a 4 años en planeación, promoción o consultoría turística.',
    comps=[
        ('Análisis de mercado turístico', 25, 'pm', 'Opina sin datos', 'Usa estadísticas de ocupación y llegada de visitantes para sustentar ideas', 'Diagnósticos con fuentes oficiales (DataTur, INEGI) y segmentación clara'),
        ('Planeación y desarrollo de producto turístico', 25, 'me', 'Ideas sueltas sin plan', 'Diseña un producto o ruta con público, costos y calendario', 'Productos lanzados con resultados medibles'),
        ('Mercadotecnia de destinos', 20, 'pm', 'No ha hecho promoción', 'Plan de promoción con canales y mensajes', 'Campañas con métricas de alcance y conversión'),
        ('Comunicación y presentación de propuestas', 15, 'me', 'Le cuesta explicar sus propuestas', 'Presenta con orden y responde preguntas', 'Convence a clientes o autoridades con propuestas claras y sustentadas'),
        ('Adaptabilidad y trabajo con actores locales', 15, 'e', 'Trabaja aislado', 'Coordina con prestadores o autoridades locales', 'Proyectos con varios actores que llegaron a acuerdos'),
    ],
    prueba='Con una tabla de ocupación y llegada de visitantes de un destino, responder cinco preguntas de análisis y proponer el segmento con más potencial.',
    muestra='Propuesta de una página para un producto turístico de un destino dado: público, oferta, precio, canales y cómo medir. Presentación de 10 minutos.',
    entrevista='1. Cuéntame de un proyecto turístico que diseñaste. ¿Qué resultado tuvo?\n2. ¿Qué datos revisarías antes de recomendar un destino a un inversionista?\n3. ¿Cómo convences a prestadores locales que no quieren participar?\n4. ¿Qué harías si a mitad de una campaña los datos no responden?',
),
'camarista-ama-de-llaves': dict(
    patron=r'camarist|ama de llaves|housekeep|recamarer|supervisor(a)? de (pisos|habitaciones)|limpieza de habitaciones|valet de cuartos',
    escolaridad='Secundaria o bachillerato.',
    experiencia='Sin experiencia para camarista; 2 años o más para ama de llaves.',
    comps=[
        ('Limpieza y arreglo con estándar hotelero', 30, 'pm', 'Limpia sin orden ni estándar', 'Sigue la lista de verificación de la habitación', 'Habitaciones que pasan inspección a la primera de forma constante'),
        ('Atención al detalle', 20, 'pm', 'Se le pasan detalles visibles', 'Revisa amenidades, blancos y faltantes', 'Detecta y reporta fallas de mantenimiento y objetos olvidados'),
        ('Manejo seguro de químicos e insumos', 20, 'p', 'No distingue productos ni riesgos', 'Usa los productos con la dilución y el equipo indicados', 'Cuida insumos y enseña el manejo seguro a otros'),
        ('Organización y tiempos', 15, 'me', 'No termina las habitaciones asignadas', 'Cumple las habitaciones del turno', 'Termina a tiempo con calidad y apoya a compañeros'),
        ('Trato con huéspedes', 15, 'e', 'Evita el contacto o es descortés', 'Saluda y atiende solicitudes con amabilidad', 'Recibe reconocimientos de huéspedes'),
    ],
    prueba='Identificar en fotos o en una habitación preparada 10 fallas de limpieza y montaje; preguntas sobre el uso seguro de tres productos de limpieza.',
    muestra='Arreglar una habitación de salida en el tiempo estándar del hotel; se califica con la lista de inspección del hotel.',
    entrevista='1. Encuentras una cartera olvidada en una habitación. ¿Qué haces?\n2. Tienes más habitaciones de las que alcanzas a terminar. ¿Qué haces?\n3. Un huésped te pide algo que no te toca. ¿Cómo respondes?\n4. ¿Cómo revisas que una habitación quedó bien?',
),

# --------------------------------------------------------------- Automotriz
'mecanico-automotriz': dict(
    patron=r'mecanic[oa]|maestro mecanico|ayudante de mecanic|mecanic[oa] (automotriz|diesel|general)',
    excluir=r'ingenier|disenador|dibujante|electromecanic|metalmecan|mecanica de (suelos|materiales)|analista|montacarga|maquinaria|industrial|mantenimiento',
    escolaridad='Secundaria o bachillerato; técnico en mecánica automotriz deseable.',
    experiencia='1 a 3 años en taller.',
    comps=[
        ('Diagnóstico de fallas mecánicas', 30, 'pm', 'Cambia piezas sin diagnosticar', 'Diagnostica fallas comunes con escáner y pruebas básicas', 'Diagnostica fallas difíciles e intermitentes a la primera'),
        ('Mantenimiento preventivo y correctivo', 25, 'pm', 'Hace servicios básicos con ayuda', 'Hace servicios y reparaciones de frenos, suspensión y motor', 'Reparaciones mayores con calidad y sin regresos'),
        ('Uso de herramientas y equipo de diagnóstico', 15, 'p', 'Usa solo herramienta manual', 'Usa escáner OBD y equipo de medición', 'Domina equipo especializado y manuales de servicio'),
        ('Seguridad y orden en el taller', 15, 'me', 'Trabaja sin cuidar seguridad ni orden', 'Sigue las reglas de seguridad y limpieza', 'Promueve el orden y no tiene incidentes'),
        ('Responsabilidad y explicación al cliente', 15, 'e', 'No reporta lo que hizo', 'Reporta trabajo hecho y hallazgos al asesor', 'Explica con claridad fallas y presupuestos y genera confianza'),
    ],
    prueba='Cuestionario de 10 preguntas de mecánica y lectura de códigos de falla con un escáner.',
    muestra='Diagnóstico en un vehículo con una falla preparada (30 minutos): encontrarla, explicar la causa y proponer la reparación.',
    entrevista='1. Cuéntame de la falla más difícil que has resuelto.\n2. Un cliente regresa porque la falla volvió. ¿Qué haces?\n3. ¿Cómo explicas una reparación cara a un cliente?\n4. ¿Qué haces si no sabes cómo reparar algo?',
),
'tecnico-automotriz': dict(
    patron=r'tecnic[oa] (automotriz|en diagnostico|electrico automotriz|de servicio automotriz|electronico automotriz|de agencia|de piso)|automotive technician|electrico automotriz|diagnostico automotriz',
    escolaridad='Técnico en mecatrónica, electrónica o mantenimiento automotriz.',
    experiencia='2 a 4 años, de preferencia en agencia.',
    comps=[
        ('Diagnóstico electrónico', 30, 'pm', 'Solo lee códigos de falla', 'Interpreta datos en vivo y diagramas eléctricos', 'Resuelve fallas electrónicas complejas e intermitentes'),
        ('Sistemas electrónicos del vehículo', 25, 'pe', 'Conoce lo básico', 'Conoce módulos, sensores y redes CAN', 'Domina sistemas de varias marcas, incluidos híbridos'),
        ('Uso de equipo y software de diagnóstico', 15, 'p', 'Escáner genérico', 'Software de diagnóstico de marca', 'Programación y configuración de módulos'),
        ('Precisión y apego a procedimientos', 15, 'pm', 'Se salta pasos', 'Sigue el manual de servicio', 'Documenta cada diagnóstico y no tiene regresos'),
        ('Actualización técnica', 15, 'e', 'Sin cursos recientes', 'Cursos de la marca o técnicos recientes', 'Se actualiza por su cuenta y enseña a otros'),
    ],
    prueba='Lectura de un diagrama eléctrico y preguntas sobre sensores y redes; interpretación de datos en vivo de un escáner.',
    muestra='Diagnosticar en 40 minutos una falla eléctrica preparada usando el equipo de la agencia y documentar la causa.',
    entrevista='1. Cuéntame de una falla electrónica que resolviste. ¿Cómo la encontraste?\n2. ¿Qué haces cuando el código de falla no explica el problema?\n3. ¿Cómo te mantienes al día con los modelos nuevos?\n4. ¿Cómo documentas un diagnóstico?',
),
'ejecutivo-asesor-de-ventas-automotriz': dict(
    patron=r'(asesor|ejecutiv[oa]|vendedor|consultor)(a)? (de )?(ventas )?(de )?(autos|automo|vehiculos|seminuevos|agencia automotriz|unidades)|ventas automotri|asesor(a)? de (piso|ventas) (automotriz|de autos)',
    excluir=r'gerente|refacciones|seguros',
    escolaridad='Bachillerato; licenciatura deseable.',
    experiencia='0 a 2 años en ventas.',
    comps=[
        ('Atención y comunicación con clientes', 25, 'me', 'Responde lo que se le pregunta, sin indagar necesidades', 'Escucha, pregunta y explica con claridad', 'Clientes atendidos con resultados medibles (satisfacción, recompra)'),
        ('Negociación y cierre', 25, 'me', 'Sin experiencia de vender o negociar', 'Ha vendido o negociado con un resultado concreto', 'Metas de venta cumplidas o superadas con cifras'),
        ('Conocimiento de producto y financiamiento', 20, 'pe', 'Sin conocimiento de autos ni crédito', 'Explica versiones, equipamiento y planes de crédito básicos', 'Compara con la competencia y arma esquemas de financiamiento'),
        ('Herramientas digitales y CRM', 15, 'p', 'Uso básico de correo y mensajería', 'Hojas de cálculo o algún CRM en uso real', 'Lleva su cartera en un CRM con reportes'),
        ('Organización y seguimiento', 15, 'me', 'Sin evidencia de seguimiento', 'Lleva agenda de prospectos', 'Seguimiento sistemático con resultados'),
    ],
    prueba='Cuestionario sobre los modelos de la agencia y planes de financiamiento; registrar un prospecto y su seguimiento en un CRM de prueba.',
    muestra='Simulación de 15 minutos: un cliente (actor) duda entre dos modelos. Se califica cómo indaga, presenta y cierra, y el mensaje de seguimiento.',
    entrevista='1. Cuéntame de un cliente que no quería comprar. ¿Qué hiciste?\n2. Un cliente pregunta por algo que no sabes. ¿Qué le dices?\n3. ¿Cómo das seguimiento a varios prospectos?\n4. ¿Qué haces si piden un descuento que no puedes dar?',
),
'ingeniero-industrial-mejora-continua': dict(
    patron=r'ingenier[oa] (industrial|de (mejora|procesos|manufactura))|mejora continua|lean (manufacturing|engineer|specialist)|six sigma|process engineer|industrial engineer',
    escolaridad='Licenciatura en Ingeniería Industrial (con cédula).',
    experiencia='1 a 3 años en manufactura.',
    comps=[
        ('Metodologías de mejora continua', 25, 'pm', 'Conoce los conceptos de oídas', 'Ha aplicado herramientas lean (5S, VSM, kaizen) en planta', 'Proyectos de mejora con ahorros o reducción de desperdicio medidos'),
        ('Análisis de datos y control estadístico', 25, 'pm', 'Sin análisis estadístico', 'Usa gráficas de control, Pareto y capacidad de proceso', 'Proyectos DMAIC con análisis estadístico sólido'),
        ('Solución de problemas', 20, 'me', 'Propone soluciones sin causa raíz', 'Usa 5 porqués o Ishikawa', 'Resuelve problemas recurrentes y evita que vuelvan'),
        ('Normas y sistemas de calidad automotriz', 15, 'pe', 'No conoce IATF ni core tools', 'Conoce IATF 16949 y las core tools', 'Ha participado en auditorías o PPAP'),
        ('Trabajo con equipos de piso', 15, 'e', 'Trabaja desde la oficina', 'Coordina con operadores y supervisores', 'Logra que el piso adopte y sostenga los cambios'),
    ],
    prueba='Con datos de un proceso: gráfica de control, Pareto de defectos y cálculo de capacidad (Cp, Cpk) en una hoja de cálculo; preguntas sobre core tools.',
    muestra='Caso de una línea con desperdicio alto: análisis de causa raíz y plan de mejora en una página, presentado en 10 minutos.',
    entrevista='1. Cuéntame de un proyecto de mejora. ¿Cuánto ahorró y cómo lo mediste?\n2. Los operadores no siguen el nuevo estándar. ¿Qué haces?\n3. ¿Cómo eliges qué problema atacar primero?\n4. ¿Qué haces si los datos contradicen lo que cree tu jefe?',
),
'gerente-de-ventas-automotriz': dict(
    patron=r'gerente (comercial|de ventas|de piso|de seminuevos)( de)? (automotriz|autos|agencia|seminuevos)|gerente de agencia automotriz|gerente de (piso|seminuevos)',
    escolaridad='Licenciatura en Administración, Mercadotecnia o afín.',
    experiencia='3 a 5 años en ventas automotrices, 2 dirigiendo equipo.',
    comps=[
        ('Gestión comercial e indicadores', 25, 'pm', 'No da seguimiento a indicadores', 'Lleva metas, conversión y mezcla de ventas', 'Mejora indicadores de venta y financiamiento con cifras'),
        ('Liderazgo de equipo de ventas', 25, 'me', 'Sin experiencia dirigiendo', 'Dirige asesores con juntas y metas individuales', 'Equipos que cumplen metas con baja rotación'),
        ('Negociación con clientes y armadora', 20, 'me', 'Negocia sin preparación', 'Negocia descuentos y asignación de unidades', 'Acuerdos favorables y cumplimiento de objetivos de la marca'),
        ('Planeación de inventario y promociones', 15, 'p', 'No planea inventario', 'Planea pedidos según la venta', 'Rotación de inventario y promociones con resultados'),
        ('Experiencia del cliente y postventa', 15, 'e', 'Se enfoca solo en la venta', 'Da seguimiento a quejas y satisfacción', 'Mejora la satisfacción y la recompra'),
    ],
    prueba='Caso con el tablero de un mes de una agencia: diagnosticar conversión, mezcla e inventario y fijar metas del mes siguiente.',
    muestra='Plan de 90 días para una agencia que no llega a su meta, presentado en 15 minutos.',
    entrevista='1. Cuéntame de un mes en que tu equipo no llegó a la meta. ¿Qué hiciste?\n2. ¿Cómo manejas a un asesor que vende mucho pero maltrata a sus compañeros?\n3. La armadora te asigna unidades que no se venden. ¿Qué haces?\n4. ¿Qué indicadores revisas cada día?',
),
}
