
import { z } from 'zod';
import { DURACION_EJERCICIO_OPCIONES_VALUES, POSICIONES_FUTSAL } from './constants';

export const loginSchema = z.object({
  email: z.string().email({ message: "Correo electrónico inválido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
});

export const registerSchema = z.object({
  email: z.string().email({ message: "Correo electrónico inválido." }),
  password: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string().min(6, { message: "La contraseña debe tener al menos 6 caracteres." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmPassword"], // path of error
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, { message: "La contraseña actual es requerida." }),
  newPassword: z.string().min(6, { message: "La nueva contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las nuevas contraseñas no coinciden.",
  path: ["confirmPassword"],
});


export const exerciseFilterSchema = z.object({
  nombre: z.string().optional(),
  edad: z.string().optional(),
  // Add other filter fields as needed, e.g. 'fase'
});

export const aiSessionSchema = z.object({
  teamDescription: z.string().min(10, "Describe tu equipo (mín. 10 caracteres)."),
  trainingGoals: z.string().min(10, "Define los objetivos (mín. 10 caracteres)."),
  sessionFocus: z.string().min(5, "Define el foco de la sesión (mín. 5 caracteres)."),
  preferredSessionLengthMinutes: z.coerce.number().min(15, "Mínimo 15 minutos.").max(180, "Máximo 180 minutos."),
  numero_sesion: z.string().optional(),
  fecha: z.string().optional(),
  temporada: z.string().optional(),
  club: z.string().optional(),
  equipo: z.string().optional(),
});

export const manualSessionSchema = z.object({
  warmUpExerciseId: z.string().min(1, "Debes seleccionar un ejercicio de calentamiento."),
  mainExerciseIds: z.array(z.string()).min(1, "Debes seleccionar al menos un ejercicio principal.").max(4, "Puedes seleccionar hasta 4 ejercicios principales."),
  coolDownExerciseId: z.string().min(1, "Debes seleccionar un ejercicio de vuelta a la calma."),
  numero_sesion: z.string().optional().or(z.literal("")),
  fecha: z.string().optional().or(z.literal("")),
  temporada: z.string().optional().or(z.literal("")),
  club: z.string().optional().or(z.literal("")),
  equipo: z.string().optional().or(z.literal("")),
});

export const addExerciseSchema = z.object({
  numero: z.string().optional(),
  ejercicio: z.string().min(1, "El nombre del ejercicio es requerido."),
  descripcion: z.string().min(1, "La descripción es requerida."),
  objetivos: z.string().min(1, "Los objetivos son requeridos."),
  espacio_materiales: z.string().min(1, "Espacio y materiales son requeridos."),
  jugadores: z.string().min(1, "El número de jugadores es requerido."),
  duracion: z.enum(DURACION_EJERCICIO_OPCIONES_VALUES, {
    required_error: "La duración es requerida.",
    invalid_type_error: "Selecciona una duración válida.",
  }),
  variantes: z.string().optional(),
  fase: z.string().min(1, "La fase es requerida."),
  categoria: z.string().min(1, "La categoría es requerida."),
  edad: z.array(z.string()).min(1, "Debes seleccionar al menos una categoría de edad."),
  consejos_entrenador: z.string().optional(),
  imagen: z.string().url({ message: "Debe ser una URL válida para la imagen." }).optional().or(z.literal('')),
  isVisible: z.boolean().optional().default(true),
});

export const RosterPlayerSchema = z.object({
  id: z.string(),
  dorsal: z.string(),
  nombre: z.string(),
  posicion: z.string(),
});

export const AttendanceDataSchema = z.record(z.enum(['presente', 'ausente', 'justificado', 'lesionado']));

const HalfStatsSchema = z.object({
  firstHalf: z.number(),
  secondHalf: z.number(),
});

export const TeamStatsSchema = z.object({
  shots: z.object({
    onTarget: HalfStatsSchema,
    offTarget: HalfStatsSchema,
    blocked: HalfStatsSchema,
  }),
  turnovers: HalfStatsSchema,
  steals: HalfStatsSchema,
  timeouts: HalfStatsSchema,
});

export const MatchStatsSchema = z.object({
  dorsal: z.string(),
  nombre: z.string(),
  goals: z.number(),
  yellowCards: z.number(),
  redCards: z.number(),
  faltas: z.number(),
  paradas: z.number(),
  golesRecibidos: z.number(),
  unoVsUno: z.number(),
});

export const OpponentPlayerSchema = z.object({
    dorsal: z.string(),
    nombre: z.string().optional(),
    goals: z.number(),
    yellowCards: z.number(),
    redCards: z.number(),
    faltas: z.number(),
    paradas: z.number(),
    golesRecibidos: z.number(),
    unoVsUno: z.number(),
});


export type AddExerciseFormValues = z.infer<typeof addExerciseSchema>;
export type ManualSessionFormValues = z.infer<typeof manualSessionSchema>;
