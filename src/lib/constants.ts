
export const FASES_SESION = ["Inicial", "Principal", "Final"];

export const CATEGORIAS_TEMATICAS_EJERCICIOS = [
  { id: "finalizacion", label: "Finalización" },
  { id: "tecnica-individual-combinada", label: "Técnica individual y combinada" },
  { id: "pase-control", label: "Pase y control" },
  { id: "transiciones", label: "Transiciones (ofensivas y defensivas)" },
  { id: "coordinacion-agilidad-velocidad", label: "Coordinación, agilidad y velocidad" },
  { id: "defensa", label: "Defensa (individual, colectiva y táctica)" },
  { id: "conduccion-regate", label: "Conducción y regate" },
  { id: "toma-decisiones-vision", label: "Toma de decisiones y visión de juego" },
  { id: "posesion-circulacion", label: "Posesión y circulación del balón" },
  { id: "superioridades-inferioridades", label: "Superioridades e inferioridades numéricas" },
  { id: "portero-trabajo-especifico", label: "Portero y trabajo específico" },
  { id: "balon-parado-remates", label: "Balón parado y remates" },
  { id: "contraataques-ataque-rapido", label: "Contraataques y ataque rápido" },
  { id: "desmarques-movilidad", label: "Desmarques y movilidad" },
  { id: "juego-reducido-condicionado", label: "Juego reducido y condicionado" },
  { id: "calentamiento-activacion", label: "Calentamiento y activación" },
];

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

export const POSICIONES_FUTSAL = ["Portero", "Cierre", "Ala", "Pívot", "Ala-Cierre", "Ala-Pívot"];
