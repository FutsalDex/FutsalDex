
import { z } from 'zod';

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

export const exerciseFilterSchema = z.object({
  nombre: z.string().optional(),
  edad: z.string().optional(), // Anteriormente categoria_edad
  // Add other filter fields as needed, e.g. 'fase'
});

export const aiSessionSchema = z.object({
  teamDescription: z.string().min(10, "Describe tu equipo (mín. 10 caracteres)."),
  trainingGoals: z.string().min(10, "Define los objetivos (mín. 10 caracteres)."),
  sessionFocus: z.string().min(5, "Define el foco de la sesión (mín. 5 caracteres)."),
  preferredSessionLengthMinutes: z.coerce.number().min(15, "Mínimo 15 minutos.").max(180, "Máximo 180 minutos."),
  numero_sesion: z.string().optional(),
  fecha: z.string().optional(), // Consider using a date picker input for better UX
  temporada: z.string().optional(),
  club: z.string().optional(),
  equipo: z.string().optional(),
});

export const manualSessionSchema = z.object({
  warmUpExerciseId: z.string().min(1, "Debes seleccionar un ejercicio de calentamiento."),
  mainExerciseIds: z.array(z.string()).min(1, "Debes seleccionar al menos un ejercicio principal.").max(4, "Puedes seleccionar hasta 4 ejercicios principales."),
  coolDownExerciseId: z.string().min(1, "Debes seleccionar un ejercicio de vuelta a la calma."),
  numero_sesion: z.string().optional(),
  fecha: z.string().optional(),
  temporada: z.string().optional(),
  club: z.string().optional(),
  equipo: z.string().optional(),
  sessionTitle: z.string().min(3, "El título de la sesión es requerido.").optional(),
});

