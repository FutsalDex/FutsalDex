

export const FASES_SESION = ["Inicial", "Principal", "Final"];

export const CATEGORIAS_TEMATICAS_EJERCICIOS = [
  { id: "balon-parado-remates", label: "Balón parado y remates" },
  { id: "calentamiento-activacion", label: "Calentamiento y activación" },
  { id: "conduccion-regate", label: "Conducción y regate" },
  { id: "contraataques-ataque-rapido", label: "Contraataques y ataque rápido" },
  { id: "coordinacion-agilidad-velocidad", label: "Coordinación, agilidad y velocidad" },
  { id: "defensa", label: "Defensa (individual, colectiva y táctica)" },
  { id: "desmarques-movilidad", label: "Desmarques y movilidad" },
  { id: "finalizacion", label: "Finalización" },
  { id: "juego-reducido-condicionado", label: "Juego reducido y condicionado" },
  { id: "pase-control", label: "Pase y control" },
  { id: "portero-trabajo-especifico", label: "Portero y trabajo específico" },
  { id: "posesion-circulacion", label: "Posesión y circulación del balón" },
  { id: "sistema-tactico-ofensivo", label: "Sistema táctico ofensivo" },
  { id: "superioridades-inferioridades", label: "Superioridades e inferioridades numéricas" },
  { id: "tecnica-individual-combinada", label: "Técnica individual y combinada" },
  { id: "toma-decisiones-vision", label: "Toma de decisiones y visión de juego" },
  { id: "transiciones", label: "Transiciones (ofensivas y defensivas)" },
].sort((a, b) => a.label.localeCompare(b.label));

export const CATEGORIAS_EDAD_EJERCICIOS = [
  "Benjamín (8-9 años)",
  "Alevín (10-11 años)",
  "Infantil (12-13 años)",
  "Cadete (14-15 años)",
  "Juvenil (16-18 años)",
  "Senior (+18 años)"
];

// Para mapear ID a Label fácilmente en la tabla de admin
export const CATEGORIAS_TEMATICAS_MAP: { [key: string]: string } = 
  CATEGORIAS_TEMATICAS_EJERCICIOS.reduce((acc, curr) => {
    acc[curr.id] = curr.label;
    return acc;
  }, {} as { [key: string]: string });

export const DURACION_EJERCICIO_OPCIONES = [
  { value: "5", label: "5" },
  { value: "10", label: "10" },
  { value: "15", label: "15" },
  { value: "20", label: "20" },
  { value: "25", label: "25" },
  { value: "30", label: "30" },
];

export const DURACION_EJERCICIO_OPCIONES_VALUES = DURACION_EJERCICIO_OPCIONES.map(opt => opt.value) as [string, ...string[]];

export const POSICIONES_FUTSAL = ["Portero", "Cierre", "Ala", "Pívot", "Ala-Cierre", "Ala-Pívot", "Universal"];

export const EXPECTED_HEADERS: { [key: string]: string } = {
  numero: "Número",
  ejercicio: "Ejercicio",
  descripcion: "Descripción de la tarea",
  objetivos: "Objetivos",
  espacio_materiales: "Espacio y materiales necesarios",
  jugadores: "Número de jugadores",
  duracion: "Duración (min)",
  variantes: "Variantes",
  fase: "Fase",
  categoria: "Categoría",
  edad: "Edad",
  consejos_entrenador: "Consejos para el entrenador",
  imagen: "Imagen",
};
