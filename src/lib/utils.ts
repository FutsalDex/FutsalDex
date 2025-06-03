import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseDurationToMinutes(durationStr: string | undefined | null): number {
  if (!durationStr) return 0;

  // Eliminar "minutos" o "min" y espacios extra, convertir a minúsculas.
  const cleanedStr = durationStr.toLowerCase().replace(/minutos|min/g, '').trim();
  
  // Extraer todos los números de la cadena
  const numbers = cleanedStr.match(/\d+/g);

  if (numbers && numbers.length > 0) {
    if (numbers.length === 1) {
      // Si solo hay un número, ej: "20"
      return parseInt(numbers[0], 10);
    }
    if (numbers.length >= 2) {
      // Si hay dos o más números, ej: "10-15" o "10 y 15", tomar el promedio de los dos primeros
      const num1 = parseInt(numbers[0], 10);
      const num2 = parseInt(numbers[1], 10);
      return Math.round((num1 + num2) / 2);
    }
  }
  return 0; // Si no se pueden extraer números o el formato no es reconocido
}
