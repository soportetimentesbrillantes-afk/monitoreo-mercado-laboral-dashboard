/**
 * Pruebas de la lectura de datos del CV.
 *
 *   node cuentas/pruebas/test_extraccion.mjs
 *
 * El código bajo prueba se saca de index.html, entre los comentarios
 * "INICIO EXTRACCION CV" y "FIN EXTRACCION CV", para que no haya una copia que
 * se desincronice. Si mueves o renombras esos marcadores, esta prueba falla a
 * propósito.
 *
 * Los casos son los formatos de CV con los que la versión anterior fallaba: la
 * heurística vieja tomaba la primera línea corta sin dígitos y la llamaba
 * nombre, así que devolvía "CURRICULUM VITAE" o "Datos personales".
 */
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const ini = html.indexOf('// === INICIO EXTRACCION CV ===');
const fin = html.indexOf('// === FIN EXTRACCION CV ===');
if (ini < 0 || fin < 0) {
  console.error('No encontré los marcadores de la extracción en index.html.');
  process.exit(2);
}
const fuente = html.slice(ini, fin);
const datosDeContacto = new Function(fuente + '\nreturn datosDeContacto;')();

let pasaron = 0, fallaron = 0;
function prueba(nombre, texto, esperado) {
  const d = datosDeContacto(texto);
  const malos = Object.entries(esperado).filter(([k, v]) => d[k] !== v);
  if (!malos.length) { pasaron++; console.log('  ok   ' + nombre); return; }
  fallaron++;
  console.log('  FALLA ' + nombre);
  for (const [k, v] of malos) console.log(`         ${k}: esperaba ${JSON.stringify(v)}, llegó ${JSON.stringify(d[k])}`);
}

console.log('\nNombre y apellidos');

prueba('ignora el encabezado CURRICULUM VITAE',
`CURRICULUM VITAE

María Fernanda López Hernández
maria.lopez.hernandez@gmail.com | 55 1234 5678`,
  { nombres:'María Fernanda', apellidoPaterno:'López', apellidoMaterno:'Hernández' });

prueba('saca el nombre aunque comparta renglón con el correo',
`Juan Carlos Pérez Ramírez · juanc.perez@outlook.com · 33 2211 4455
Licenciado en Administración`,
  { nombres:'Juan Carlos', apellidoPaterno:'Pérez', apellidoMaterno:'Ramírez' });

prueba('ignora "Datos personales" y usa la etiqueta Nombre:',
`Datos personales
Nombre: Luis Ángel Mendoza Cruz
Correo electrónico: luis.mendoza@yahoo.com.mx`,
  { nombres:'Luis Ángel', apellidoPaterno:'Mendoza', apellidoMaterno:'Cruz' });

prueba('encuentra el nombre aunque el contacto vaya primero',
`Correo: ana.torres@hotmail.com
Teléfono: +52 81 9988 7766
ANA SOFÍA TORRES GUTIÉRREZ`,
  { nombres:'ANA SOFÍA', apellidoPaterno:'TORRES', apellidoMaterno:'GUTIÉRREZ' });

prueba('la partícula se queda pegada al apellido',
`José de la Torre Mendoza
jose.delatorre@gmail.com`,
  { nombres:'José', apellidoPaterno:'de la Torre', apellidoMaterno:'Mendoza' });

prueba('con un solo apellido no inventa el segundo',
`Sofía Ramírez
sofia@example.com`,
  { nombres:'Sofía', apellidoPaterno:'Ramírez', apellidoMaterno:'' });

prueba('no confunde el puesto con el nombre',
`Ingeniero Industrial
Pedro Navarro Gómez
pedro.navarro@example.com`,
  { nombres:'Pedro', apellidoPaterno:'Navarro', apellidoMaterno:'Gómez' });

prueba('si no hay nada parecido a un nombre, lo deja vacío',
`Experiencia laboral
Ventas, atención a clientes, manejo de caja.`,
  { nombreCompleto:'', nombres:'', apellidoPaterno:'', apellidoMaterno:'' });

console.log('\nContacto');

prueba('el teléfono con lada país queda en 10 dígitos',
`Gael Ramírez Ávila
+52 55 1122 3344`,
  { telefono:'55 1122 3344' });

prueba('el teléfono pegado también',
`Ana Pérez López
Teléfono: 5544332211`,
  { telefono:'55 4433 2211' });

prueba('un año o un folio no son un teléfono',
`Ana Pérez López
Egresada 2023, matrícula 847261`,
  { telefono:'' });

prueba('prefiere el correo etiquetado',
`Contacto
Correo: personal@gmail.com
Referencia: jefe.anterior@empresa.com`,
  { correo:'personal@gmail.com' });

prueba('una matrícula como correo se respeta',
`GAEL RAMÍREZ ÁVILA
A01737725@tec.mx`,
  { correo:'A01737725@tec.mx' });

console.log('\nUbicación, escuela y perfil');

prueba('separa ciudad y estado',
`Luis Mendoza Cruz
luis@example.com
Ciudad: Zapopan, Jalisco`,
  { ciudad:'Zapopan', estado:'Jalisco' });

prueba('encuentra "Ciudad, Estado" suelto en el encabezado',
`María López Hernández
maria@example.com
Guadalajara, Jalisco`,
  { ciudad:'Guadalajara', estado:'Jalisco' });

prueba('la universidad no se lleva las fechas',
`Ana Torres Ruiz
ana@example.com
Universidad de Guadalajara  2019 - 2023`,
  { universidad:'Universidad de Guadalajara', anioEgreso:'2023' });

prueba('no saca la universidad del dominio del correo',
`Sofía Ramírez Vega
sofia.ramirez@uanl.edu.mx`,
  { universidad:'' });

prueba('lee la carrera',
`Pedro Navarro Gómez
pedro@example.com
Licenciatura en Administración de Empresas`,
  { carrera:'Licenciatura en Administración de Empresas' });

prueba('los años de experiencia solo si el CV los dice',
`Pedro Navarro Gómez
pedro@example.com
3 años de experiencia en manufactura`,
  { aniosExperiencia:'3' });

prueba('no infiere años de experiencia de las fechas',
`Pedro Navarro Gómez
pedro@example.com
Auxiliar en Bimbo, 2021 - 2024`,
  { aniosExperiencia:'' });

prueba('no inventa un año de egreso futuro',
`Pedro Navarro Gómez
pedro@example.com
Disponible a partir de 2099`,
  { anioEgreso:'' });

prueba('lee el nivel de inglés',
`Pedro Navarro Gómez
pedro@example.com
Idiomas: Inglés avanzado, español nativo`,
  { nivelIngles:'avanzado' });

prueba('un CV vacío no devuelve basura', '',
  { nombreCompleto:'', correo:'', telefono:'', ciudad:'', estado:'', carrera:'',
    universidad:'', anioEgreso:'', aniosExperiencia:'', puestoObjetivo:'', nivelIngles:'' });

console.log(`\n${pasaron} pasaron, ${fallaron} fallaron\n`);
process.exit(fallaron ? 1 : 0);
