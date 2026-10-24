// Genera los JSON de ejemplo de /data y valida su coherencia.
// Uso: node tools/genera-datos.mjs
// TODOS los datos son de ejemplo (un sábado de Antroxu imaginado) y se marcan con ejemplo: true.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirDatos = join(raiz, 'data');
mkdirSync(dirDatos, { recursive: true });
const guarda = (nombre, obj) => writeFileSync(join(dirDatos, nombre), JSON.stringify(obj, null, 2) + '\n', 'utf8');

// ---------------------------------------------------------------------------
// Utilidades de tiempo: minutos desde las 16:00
// ---------------------------------------------------------------------------
const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return (h - 16) * 60 + m; };
const aHora = (min) => { const t = 16 * 60 + min; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
const PASO = 15;
const HORAS = Array.from({ length: 360 / PASO + 1 }, (_, i) => aHora(i * PASO));

// Umbrales técnicos (personas/m²). Vigilancia ≥ 2 y Crítico ≥ 3,5 vienen del encargo.
const UMBRALES = [
  { nivel: 'critico', min: 3.5 },
  { nivel: 'vigilancia', min: 2.0 },
  { nivel: 'alta', min: 1.2 },
  { nivel: 'media', min: 0.5 },
  { nivel: 'baja', min: 0 },
];
const nivelDe = (d) => UMBRALES.find((u) => d >= u.min).nivel;
const PUBLICO = { baja: 'tranquilo', media: 'animado', alta: 'animado', vigilancia: 'lleno', critico: 'lleno' };

// ---------------------------------------------------------------------------
// Zonas de la maqueta y puntos clave de densidad (personas/m²)
// Los puntos de las 6 primeras zonas siguen la tabla 6.3 del encargo.
// ---------------------------------------------------------------------------
const ZONAS = {
  'galiana': {
    nombre: 'Calle Galiana', superficie_m2: 4600,
    claves: { '16:00': 0.9, '17:00': 1.5, '17:30': 1.75, '18:00': 2.1, '18:30': 2.9, '19:00': 2.2, '19:30': 1.7, '20:30': 0.9, '22:00': 0.3 },
    medido_desde: '18:00', fuente_medida: 'Observación de la Policía Local',
  },
  'plaza-espana': {
    nombre: 'Plaza de España', superficie_m2: 5100,
    claves: { '16:00': 0.8, '17:00': 1.0, '18:00': 1.5, '18:30': 1.7, '19:30': 1.6, '20:00': 1.8, '20:30': 1.9, '21:30': 1.5, '22:00': 0.8 },
  },
  'niemeyer': {
    nombre: 'Centro Niemeyer', superficie_m2: 9000,
    claves: { '16:00': 0.15, '17:00': 0.15, '18:00': 0.2, '18:30': 0.25, '19:30': 0.7, '20:00': 0.75, '20:30': 0.6, '21:30': 0.7, '22:00': 0.3 },
    medido_desde: '16:00', fuente_medida: 'Taquilla del Centro Niemeyer',
  },
  'muelle': {
    nombre: 'Parque del Muelle', superficie_m2: 14000,
    claves: { '16:00': 0.6, '17:00': 0.7, '18:00': 0.6, '18:30': 0.4, '19:30': 0.3, '20:30': 0.2, '22:00': 0.15 },
  },
  'ferrera': {
    nombre: 'Parque de Ferrera', superficie_m2: 52000,
    claves: { '16:00': 0.6, '17:00': 0.7, '18:00': 0.4, '18:30': 0.3, '19:30': 0.2, '20:30': 0.15, '22:00': 0.1 },
  },
  'orbon': {
    nombre: 'Plaza Hermanos Orbón', superficie_m2: 4200,
    claves: { '16:00': 0.3, '17:00': 0.7, '18:00': 0.8, '18:30': 0.9, '19:30': 1.4, '20:30': 1.6, '21:00': 1.9, '21:30': 1.7, '22:00': 1.0 },
  },
  'teatro': {
    nombre: 'Entorno del Teatro Palacio Valdés', superficie_m2: 1200,
    claves: { '16:00': 0.3, '16:45': 1.1, '17:15': 0.5, '18:45': 0.5, '19:00': 1.2, '19:30': 0.4, '22:00': 0.2 },
    medido_desde: '16:00', fuente_medida: 'Taquilla del Teatro Palacio Valdés',
  },
  'rivero': {
    nombre: 'Calle Rivero', superficie_m2: 3800,
    claves: { '16:00': 0.4, '17:00': 0.6, '18:00': 1.0, '18:30': 1.2, '19:30': 0.9, '20:30': 0.7, '22:00': 0.4 },
  },
  'paseo-ria': {
    nombre: 'Paseo de la ría', superficie_m2: 7000,
    claves: { '16:00': 0.4, '17:00': 0.5, '18:00': 0.4, '18:30': 0.3, '19:30': 0.55, '20:00': 0.5, '20:30': 0.3, '22:00': 0.2 },
  },
};

// Interpolación lineal entre puntos clave
function interpola(claves, min) {
  const pts = Object.entries(claves).map(([h, v]) => [aMin(h), v]).sort((a, b) => a[0] - b[0]);
  if (min <= pts[0][0]) return pts[0][1];
  for (let i = 0; i < pts.length - 1; i++) {
    const [m0, v0] = pts[i]; const [m1, v1] = pts[i + 1];
    if (min >= m0 && min <= m1) return v0 + (v1 - v0) * ((min - m0) / (m1 - m0));
  }
  return pts[pts.length - 1][1];
}
const r2 = (v) => Math.round(v * 100) / 100;

const zonas = {};
for (const [id, z] of Object.entries(ZONAS)) {
  const serie = HORAS.map((h) => {
    const min = aMin(h);
    const densidad = r2(interpola(z.claves, min));
    const medido = z.medido_desde !== undefined && min >= aMin(z.medido_desde);
    const nivel = nivelDe(densidad);
    return {
      hora: h,
      densidad,
      personas: Math.round(densidad * z.superficie_m2 / 10) * 10,
      nivel,
      publico: PUBLICO[nivel],
      fuente: medido ? 'medido' : 'estimado',
    };
  });
  zonas[id] = { nombre: z.nombre, superficie_m2: z.superficie_m2, fuente_medida: z.fuente_medida ?? null, serie };
}

// Curva de previsión de Galiana (la que el modelo habría calculado por la mañana)
// Sigue la real con un pequeño adelanto y una banda de incertidumbre.
const prevGaliana = HORAS.map((h) => {
  const min = aMin(h);
  const p = r2(interpola(ZONAS.galiana.claves, min + 5) * 0.96 + 0.05);
  return { hora: h, prevista: p, banda_baja: r2(p * 0.82), banda_alta: r2(p * 1.15) };
});
const pico = prevGaliana.reduce((a, b) => (b.prevista > a.prevista ? b : a));

guarda('afluencia.json', {
  ejemplo: true,
  aviso: 'Datos de ejemplo de un sábado de Antroxu. No son mediciones reales.',
  unidad: 'personas/m²',
  inicio: '16:00', fin: '22:00', paso_min: PASO,
  horas: HORAS,
  umbrales: {
    baja: '< 0,5', media: '0,5 – 1,2', alta: '1,2 – 2', vigilancia: '≥ 2', critico: '≥ 3,5',
  },
  equivalencia_publica: { baja: 'Tranquilo', media: 'Animado', alta: 'Animado', vigilancia: 'Lleno', critico: 'Lleno' },
  zonas,
  prevision: {
    galiana: {
      modelo: 'Histórico de Antroxu + agenda + previsión meteorológica (ejemplo)',
      calculada: '10:00',
      pico: { hora: pico.hora, densidad: pico.prevista, nivel: nivelDe(pico.prevista) },
      serie: prevGaliana,
    },
  },
  pesos_senales: [
    { senal: 'Observación de la Policía Local', peso: 0.9 },
    { senal: 'Taquilla', peso: 0.8 },
    { senal: 'Recuento wifi (fase 2)', peso: 0.6 },
    { senal: 'Usuarios de la app (anónimo)', peso: 0.5 },
    { senal: 'Modelo sobre histórico', peso: 0.3 },
  ],
});

// ---------------------------------------------------------------------------
// Lugares (posiciones en metros sobre la maqueta: x este, z sur)
// ---------------------------------------------------------------------------
const AYTO = 'Ayuntamiento de Avilés';
const lugares = [
  { id: 'teatro', nombre: 'Teatro Palacio Valdés', categoria: 'cultura', posicion: [130, -25], zona: 'teatro',
    abierto: true, horario: 'Taquilla 11:00–14:00 y desde 2 h antes de cada función', aforo: 'Unas 800 butacas (ejemplo)', requiere_reserva: true, bajo_techo: true,
    gestor: AYTO, nivel: 'gestiona',
    historia: 'Teatro de principios del siglo XX que lleva el nombre del novelista Armando Palacio Valdés, que pasó su infancia en Avilés. Tras años cerrado se rehabilitó y hoy es uno de los escenarios de referencia de Asturias.' },
  { id: 'casa-cultura', nombre: 'Casa de Cultura', categoria: 'cultura', posicion: [-85, -45], zona: 'plaza-espana',
    abierto: true, horario: '09:00–21:00 (ejemplo)', aforo: 'Salón de actos de 300 plazas (ejemplo)', requiere_reserva: false, bajo_techo: true,
    gestor: AYTO, nivel: 'gestiona',
    historia: 'Centro cultural municipal con biblioteca, salas de exposiciones y salón de actos. Un punto de encuentro tranquilo en pleno centro, también los días de fiesta.' },
  { id: 'museo', nombre: 'Museo de la Historia Urbana', categoria: 'cultura', posicion: [-165, -35], zona: null,
    abierto: true, horario: '11:00–14:00 y 17:00–20:00 (ejemplo)', aforo: '60 personas (ejemplo)', requiere_reserva: false, bajo_techo: true,
    gestor: AYTO, nivel: 'gestiona',
    historia: 'Museo municipal que cuenta cómo ha cambiado Avilés: de villa medieval y puerto pesquero a ciudad industrial y cultural. Ideal para entender la ciudad antes de pasearla.' },
  { id: 'plaza-espana', nombre: 'Plaza de España', categoria: 'ocio', posicion: [0, 0], zona: 'plaza-espana',
    abierto: true, horario: 'Espacio público, siempre abierto', aforo: 'Unas 5.000 personas de pie (ejemplo)', requiere_reserva: false, bajo_techo: false,
    gestor: AYTO, nivel: 'gestiona',
    historia: 'Conocida como «El Parche», es el corazón de la villa. En ella se levanta el Ayuntamiento, con sus soportales, y aquí terminan muchas de las celebraciones del Antroxu.' },
  { id: 'galiana', nombre: 'Calle Galiana', categoria: 'ocio', posicion: [-110, 180], zona: 'galiana',
    abierto: true, horario: 'Espacio público, siempre abierto', aforo: 'Recorrido de unos 300 m (ejemplo)', requiere_reserva: false, bajo_techo: false,
    gestor: AYTO, nivel: 'gestiona',
    historia: 'Calle en cuesta con largos soportales a ambos lados, de las más reconocibles de Asturias. Cada Antroxu acoge el Descenso de Galiana, en el que la calle se baja a bordo de artefactos disfrazados.' },
  { id: 'orbon', nombre: 'Plaza Hermanos Orbón', categoria: 'comercio', posicion: [130, 115], zona: 'orbon',
    abierto: true, horario: 'Mercado 08:00–14:00; plaza siempre abierta', aforo: 'Unas 3.000 personas de pie (ejemplo)', requiere_reserva: false, bajo_techo: false,
    gestor: AYTO, nivel: 'gestiona',
    historia: 'Plaza porticada en torno al mercado de abastos. Es uno de los escenarios del tradicional mercado de los lunes y, en Antroxu, de la fiesta de la noche.' },
  { id: 'ferrera', nombre: 'Parque de Ferrera', categoria: 'deporte', posicion: [-285, 170], zona: 'ferrera',
    abierto: true, horario: '08:00–22:00 (ejemplo)', aforo: 'Sin aforo fijo', requiere_reserva: false, bajo_techo: false,
    gestor: AYTO, nivel: 'gestiona',
    historia: 'Gran parque urbano junto al casco histórico, que ocupa los antiguos jardines del palacio de los marqueses de Ferrera. Zona de juegos, paseo y deporte para todas las edades.' },
  { id: 'muelle', nombre: 'Parque del Muelle', categoria: 'ocio', posicion: [-90, -100], zona: 'muelle',
    abierto: true, horario: 'Siempre abierto', aforo: 'Sin aforo fijo', requiere_reserva: false, bajo_techo: false,
    gestor: AYTO, nivel: 'gestiona',
    historia: 'Zona verde junto a la ría, en el lugar donde la villa se asomaba a su antiguo muelle. Lugar de paseo de varias generaciones de avilesinos.' },
  { id: 'niemeyer', nombre: 'Centro Niemeyer', categoria: 'cultura', posicion: [200, -295], zona: 'niemeyer',
    abierto: true, horario: 'Concierto hoy a las 20:00 (ejemplo)', aforo: 'Concierto al 40 % del aforo (ejemplo)', requiere_reserva: true, bajo_techo: true,
    gestor: 'Fundación Centro Niemeyer (Principado de Asturias)', nivel: 'coordina',
    historia: 'Centro cultural internacional diseñado por el arquitecto brasileño Oscar Niemeyer e inaugurado en 2011 en la margen de la ría. Su cúpula, su torre mirador y su auditorio son ya una imagen de Avilés.' },
  { id: 'paseo-ria', nombre: 'Paseo de la ría', categoria: 'deporte', posicion: [260, -122], zona: 'paseo-ria',
    abierto: true, horario: 'Siempre abierto', aforo: 'Sin aforo fijo', requiere_reserva: false, bajo_techo: false,
    gestor: 'Autoridad Portuaria de Avilés', nivel: 'coordina',
    historia: 'Recorrido peatonal a la orilla de la ría, en terrenos del puerto. La ría ha sido el motor del Avilés marinero primero e industrial después.' },
  { id: 'camposagrado', nombre: 'Palacio de Camposagrado · Escuela Superior de Arte', categoria: 'cultura', posicion: [65, -58], zona: 'plaza-espana',
    abierto: false, horario: 'Cerrado en fin de semana (ejemplo)', aforo: 'Exposiciones: 80 personas (ejemplo)', requiere_reserva: false, bajo_techo: true,
    gestor: 'Principado de Asturias', nivel: 'coordina',
    historia: 'Palacio barroco junto a la Plaza de España que hoy acoge la Escuela Superior de Arte del Principado de Asturias.' },
  { id: 'hospital', nombre: 'Hospital San Agustín', categoria: 'servicios', posicion: [340, 250], zona: null,
    abierto: true, horario: 'Urgencias 24 h', aforo: 'No aplica', requiere_reserva: false, bajo_techo: true,
    gestor: 'Servicio de Salud del Principado de Asturias', nivel: 'observa',
    historia: 'Hospital de referencia del área sanitaria de Avilés. Mapa Vivo solo muestra la afluencia anónima de la calle que lo rodea; nunca datos del interior. (Posición ilustrativa en la maqueta.)' },
  { id: 'iglesia', nombre: 'Iglesia de San Nicolás de Bari', categoria: 'cultura', posicion: [-55, 160], zona: null,
    abierto: true, horario: 'Horario de culto (ejemplo)', aforo: 'No aplica', requiere_reserva: false, bajo_techo: true,
    gestor: 'Titular privado (parroquia)', nivel: 'observa',
    historia: 'Templo de origen medieval en el casco histórico, ligado durante siglos a la comunidad franciscana. Uno de los edificios más antiguos de la villa.' },
  { id: 'centro-comercial', nombre: 'Centro comercial de ejemplo', categoria: 'comercio', posicion: [330, 40], zona: null,
    abierto: true, horario: '10:00–22:00 (ejemplo)', aforo: 'No publicado', requiere_reserva: false, bajo_techo: true,
    gestor: 'Titular privado', nivel: 'observa',
    historia: 'Comercio de ejemplo. Los espacios privados solo aparecen con la afluencia anónima de la calle de alrededor, salvo que se adhieran al programa de comercio local.' },
  { id: 'cafeteria', nombre: 'Cafetería de ejemplo', categoria: 'comercio', posicion: [-91, 230], zona: 'galiana',
    abierto: true, horario: '08:00–23:00 (ejemplo)', aforo: '40 personas (ejemplo)', requiere_reserva: false, bajo_techo: true,
    gestor: 'Titular privado · adherido al QR de beneficios', nivel: 'observa',
    historia: 'Negocio de ejemplo adherido al QR de beneficios: enseña tu QR personal y obtén un descuento. No es un negocio real.' },
  { id: 'panaderia', nombre: 'Panadería de ejemplo', categoria: 'comercio', posicion: [190, 165], zona: 'orbon',
    abierto: true, horario: '07:30–14:00 y 17:00–20:30 (ejemplo)', aforo: '12 personas (ejemplo)', requiere_reserva: false, bajo_techo: true,
    gestor: 'Titular privado · adherido al QR de beneficios', nivel: 'observa',
    historia: 'Negocio de ejemplo adherido al QR de beneficios. Los comercios adheridos ayudan a sostener la plataforma. No es un negocio real.' },
].map((l) => ({ ...l, ejemplo: true }));
guarda('lugares.json', { ejemplo: true, aviso: 'Lugares reales de Avilés con datos de ejemplo. Posiciones en una maqueta ilustrativa, no a escala.', lugares });

// ---------------------------------------------------------------------------
// Eventos de un sábado de Antroxu de ejemplo
// ---------------------------------------------------------------------------
const eventos = [
  { id: 'talleres', nombre: 'Talleres infantiles de disfraces', lugar: 'ferrera', organizador: 'Ayuntamiento de Avilés · Juventud (ejemplo)', inicio: '16:00', fin: '18:00', asistencia_estimada: 400, categoria: 'ocio' },
  { id: 'pasacalles', nombre: 'Pasacalles infantil', recorrido: ['muelle', 'plaza-espana'], organizador: 'Ayuntamiento de Avilés (ejemplo)', inicio: '16:30', fin: '17:30', asistencia_estimada: 600, categoria: 'ocio' },
  { id: 'charangas', nombre: 'Concurso de charangas', lugar: 'teatro', organizador: 'Ayuntamiento de Avilés · Cultura (ejemplo)', inicio: '17:00', fin: '19:00', aforo: 800, asistencia_estimada: 650, categoria: 'cultura' },
  { id: 'mercadillo', nombre: 'Mercadillo de Antroxu', lugar: 'orbon', organizador: 'Asociación de comerciantes (ejemplo)', inicio: '17:00', fin: '21:00', asistencia_estimada: 1500, categoria: 'comercio' },
  { id: 'descenso', nombre: 'Descenso de Galiana', recorrido: ['galiana', 'rivero', 'plaza-espana'], organizador: 'Ayuntamiento de Avilés (ejemplo)', inicio: '18:00', fin: '19:00', asistencia_estimada: 9000, categoria: 'ocio' },
  { id: 'premios', nombre: 'Entrega de premios del Descenso', lugar: 'plaza-espana', organizador: 'Ayuntamiento de Avilés (ejemplo)', inicio: '19:15', fin: '19:45', asistencia_estimada: 3000, categoria: 'ocio' },
  { id: 'concierto-plaza', nombre: 'Concierto gratuito', lugar: 'plaza-espana', organizador: 'Ayuntamiento de Avilés · Juventud (ejemplo)', inicio: '20:00', fin: '21:30', asistencia_estimada: 4000, categoria: 'ocio' },
  { id: 'concierto-niemeyer', nombre: 'Concierto en el Centro Niemeyer', lugar: 'niemeyer', organizador: 'Fundación Centro Niemeyer (ejemplo)', inicio: '20:00', fin: '21:30', aforo: 1000, ocupacion: 0.4, asistencia_estimada: 400, categoria: 'cultura' },
  { id: 'fiesta', nombre: 'Fiesta nocturna de Antroxu', lugar: 'orbon', organizador: 'Ayuntamiento de Avilés (ejemplo)', inicio: '21:00', fin: '02:00', asistencia_estimada: 3500, categoria: 'ocio' },
].map((e) => ({ ...e, ejemplo: true }));
guarda('eventos.json', { ejemplo: true, aviso: 'Programa de ejemplo de un sábado de Antroxu. No es la programación oficial.', dia: 'Sábado de Antroxu (ejemplo)', eventos });

// ---------------------------------------------------------------------------
// Alertas del panel municipal
// ---------------------------------------------------------------------------
const alertas = [
  { id: 'a1', hora: '17:30', zona: 'galiana', tipo: 'Preaviso de aglomeración', nivel: 'alta',
    texto: 'El modelo prevé que Galiana pase a Vigilancia hacia las 18:00, con el inicio del Descenso.', destinatario: 'Policía Local',
    fuentes: [{ f: 'Modelo sobre histórico', p: 0.55 }, { f: 'Agenda municipal', p: 0.3 }, { f: 'Usuarios de la app', p: 0.15 }] },
  { id: 'a2', hora: '18:00', zona: 'galiana', tipo: 'Aglomeración', nivel: 'vigilancia',
    texto: 'Galiana pasa a Vigilancia (≥ 2 personas/m²).', destinatario: 'Policía Local',
    fuentes: [{ f: 'Observación de la Policía Local', p: 0.5 }, { f: 'Usuarios de la app', p: 0.3 }, { f: 'Modelo sobre histórico', p: 0.2 }] },
  { id: 'a3', hora: '18:40', zona: 'rivero', tipo: 'Desperfecto', nivel: 'baja',
    texto: 'Farola apagada en calle Rivero.', destinatario: 'Cuida Avilés',
    fuentes: [{ f: 'Aviso ciudadano en la app', p: 1 }] },
  { id: 'a4', hora: '18:50', zona: 'galiana', tipo: 'Urgencia sanitaria', nivel: 'critico',
    texto: 'Persona indispuesta a mitad de Galiana. Se muestra el botón de llamada al 112.', destinatario: '112',
    fuentes: [{ f: 'Aviso ciudadano en la app', p: 0.7 }, { f: 'Observación de la Policía Local', p: 0.3 }] },
  { id: 'a5', hora: '19:35', zona: 'paseo-ria', tipo: 'Incidencia en la ría', nivel: 'media',
    texto: 'Objeto flotando en el agua junto al paseo de la ría.', destinatario: 'Autoridad Portuaria',
    fuentes: [{ f: 'Aviso ciudadano en la app', p: 1 }] },
  { id: 'a6', hora: '19:50', zona: 'niemeyer', tipo: 'Acceso a recinto', nivel: 'media',
    texto: 'Cola en la pasarela de acceso al Niemeyer antes del concierto.', destinatario: 'Centro Niemeyer (gestor del espacio)',
    fuentes: [{ f: 'Taquilla', p: 0.6 }, { f: 'Usuarios de la app', p: 0.4 }] },
  { id: 'a7', hora: '20:15', zona: 'orbon', tipo: 'Preaviso de aglomeración', nivel: 'alta',
    texto: 'Pico previsto en la Plaza Hermanos Orbón a las 21:00, cerca de Vigilancia.', destinatario: 'Policía Local',
    fuentes: [{ f: 'Modelo sobre histórico', p: 0.6 }, { f: 'Agenda municipal', p: 0.25 }, { f: 'Usuarios de la app', p: 0.15 }] },
  { id: 'a8', hora: '21:30', zona: 'plaza-espana', tipo: 'Fin de evento', nivel: 'alta',
    texto: 'Termina el concierto: se recomienda salida escalonada hacia Rivero y el Muelle.', destinatario: 'Policía Local',
    fuentes: [{ f: 'Agenda municipal', p: 0.5 }, { f: 'Usuarios de la app', p: 0.3 }, { f: 'Modelo sobre histórico', p: 0.2 }] },
].map((a) => ({ ...a, ejemplo: true }));
guarda('alertas.json', { ejemplo: true, aviso: 'Alertas de ejemplo para la demo del panel municipal.', alertas });

// ---------------------------------------------------------------------------
// Validación de coherencia
// ---------------------------------------------------------------------------
const errores = [];
const serie = (z, h) => zonas[z].serie.find((s) => s.hora === h);
const ok = (cond, msg) => { if (!cond) errores.push(msg); };

// Tabla 6.3: niveles esperados
const esperado = {
  'galiana': ['media', 'alta', 'vigilancia', 'vigilancia', 'alta', 'media', 'baja'],
  'plaza-espana': ['media', 'media', 'alta', 'alta', 'alta', 'alta', 'media'],
  'niemeyer': ['baja', 'baja', 'baja', 'baja', 'media', 'media', 'baja'],
  'muelle': ['media', 'media', 'media', 'baja', 'baja', 'baja', 'baja'],
  'ferrera': ['media', 'media', 'baja', 'baja', 'baja', 'baja', 'baja'],
  'orbon': ['baja', 'media', 'media', 'media', 'alta', 'alta', 'media'],
};
const cols = ['16:00', '17:00', '18:00', '18:30', '19:30', '20:30', '22:00'];
for (const [z, niveles] of Object.entries(esperado)) {
  cols.forEach((h, i) => ok(serie(z, h).nivel === niveles[i], `${z} ${h}: ${serie(z, h).nivel} ≠ ${niveles[i]}`));
}
// Pico de Galiana a las 18:30
const picoReal = zonas.galiana.serie.reduce((a, b) => (b.densidad > a.densidad ? b : a));
ok(picoReal.hora === '18:30', `El pico de Galiana es a las ${picoReal.hora}`);
ok(Math.abs(aMin(pico.hora) - aMin('18:30')) <= 15, `La previsión sitúa el pico a las ${pico.hora}`);
// Medido solo en Niemeyer, Teatro y Galiana ≥ 18:00
for (const [id, z] of Object.entries(zonas)) {
  for (const s of z.serie) {
    const debe = id === 'niemeyer' || id === 'teatro' || (id === 'galiana' && aMin(s.hora) >= aMin('18:00'));
    ok((s.fuente === 'medido') === debe, `${id} ${s.hora}: fuente ${s.fuente}`);
  }
}
// Las alertas de aglomeración coinciden con el nivel de su zona
ok(serie('galiana', '18:00').nivel === 'vigilancia', 'Galiana no está en Vigilancia a las 18:00');
ok(serie('galiana', '17:45').nivel !== 'vigilancia', 'Galiana ya estaba en Vigilancia a las 17:45 (el preaviso llegaría tarde)');
ok(serie('orbon', '21:00').nivel === 'alta' && serie('orbon', '21:00').densidad >= serie('orbon', '20:30').densidad, 'Orbón no tiene su pico a las 21:00');
// Los lugares y eventos apuntan a zonas/lugares existentes
const idsLugar = new Set(lugares.map((l) => l.id));
for (const l of lugares) ok(l.zona === null || zonas[l.zona], `Lugar ${l.id}: zona ${l.zona} inexistente`);
for (const e of eventos) {
  for (const ref of e.lugar ? [e.lugar] : e.recorrido) ok(idsLugar.has(ref) || zonas[ref], `Evento ${e.id}: ${ref} inexistente`);
}
for (const a of alertas) ok(zonas[a.zona], `Alerta ${a.id}: zona ${a.zona} inexistente`);
// Niveles de titularidad pedidos
const niveles = (n) => lugares.filter((l) => l.nivel === n).length;
ok(niveles('gestiona') === 8 && niveles('coordina') === 3 && niveles('observa') === 5, 'Reparto de titularidad incorrecto');
// Los eventos explican los picos
ok(eventos.find((e) => e.id === 'descenso').inicio === '18:00', 'El Descenso no empieza a las 18:00');

if (errores.length) {
  console.error('✗ Incoherencias:\n  ' + errores.join('\n  '));
  process.exit(1);
}
console.log(`✓ Datos generados y coherentes: ${Object.keys(zonas).length} zonas × ${HORAS.length} franjas, ${lugares.length} lugares, ${eventos.length} eventos, ${alertas.length} alertas. Pico de Galiana: ${picoReal.hora} (${picoReal.densidad} p/m²), previsto ${pico.hora}.`);
