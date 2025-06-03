
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, FileSpreadsheet, UploadCloud, Info, Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState, type ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { db } from '@/lib/firebase';
import { collection, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { addExerciseSchema, type AddExerciseFormValues } from '@/lib/schemas'; // Asegúrate que addExerciseSchema esté aquí

// Definir los encabezados esperados del Excel para mapeo
const EXPECTED_HEADERS = {
  numero: "Numero",
  ejercicio: "Ejercicio",
  descripcion: "Descripcion",
  objetivos: "Objetivos",
  espacio_materiales: "Espacio_Materiales",
  jugadores: "Jugadores",
  duracion: "Duracion",
  variantes: "Variantes",
  fase: "Fase",
  categoria: "Categoria",
  edad: "Edad",
  consejos_entrenador: "Consejos_Entrenador",
  imagen: "Imagen",
};


function BatchAddExercisesPageContent() {
  const { isAdmin } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedStats, setProcessedStats] = useState<{ success: number, failed: number, total: number } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProcessedStats(null); // Reset stats when a new file is selected
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
        "text/csv" // .csv (SheetJS también lo soporta)
      ];
      if (validTypes.includes(file.type) || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv') ) {
        setSelectedFile(file);
      } else {
        toast({
          title: "Archivo no válido",
          description: "Por favor, selecciona un archivo .xlsx, .xls o .csv.",
          variant: "destructive",
        });
        setSelectedFile(null);
        event.target.value = ""; 
      }
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) {
      toast({
        title: "No hay archivo seleccionado",
        description: "Por favor, selecciona un archivo Excel o CSV para continuar.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);
    setProcessedStats(null);
    let successCount = 0;
    let failureCount = 0;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          if (!data) {
            throw new Error("No se pudo leer el archivo.");
          }
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonExercises = XLSX.utils.sheet_to_json(worksheet) as any[];

          if (jsonExercises.length === 0) {
            toast({ title: "Archivo Vacío", description: "El archivo no contiene ejercicios.", variant: "default" });
            setIsProcessing(false);
            return;
          }

          const exercisesToSave: AddExerciseFormValues[] = [];
          const validationErrors: string[] = [];

          jsonExercises.forEach((row, index) => {
            const exerciseData: Partial<AddExerciseFormValues> = {
              numero: row[EXPECTED_HEADERS.numero]?.toString() || "",
              ejercicio: row[EXPECTED_HEADERS.ejercicio]?.toString() || "",
              descripcion: row[EXPECTED_HEADERS.descripcion]?.toString() || "",
              objetivos: row[EXPECTED_HEADERS.objetivos]?.toString() || "",
              espacio_materiales: row[EXPECTED_HEADERS.espacio_materiales]?.toString() || "",
              jugadores: row[EXPECTED_HEADERS.jugadores]?.toString() || "",
              duracion: row[EXPECTED_HEADERS.duracion]?.toString() || "",
              variantes: row[EXPECTED_HEADERS.variantes]?.toString() || "",
              fase: row[EXPECTED_HEADERS.fase]?.toString() || "",
              categoria: row[EXPECTED_HEADERS.categoria]?.toString() || "",
              edad: row[EXPECTED_HEADERS.edad] ? (row[EXPECTED_HEADERS.edad] as string).split(',').map(e => e.trim()).filter(e => e) : [],
              consejos_entrenador: row[EXPECTED_HEADERS.consejos_entrenador]?.toString() || "",
              imagen: row[EXPECTED_HEADERS.imagen]?.toString() || "",
            };
            
            if (!exerciseData.imagen) {
                exerciseData.imagen = `https://placehold.co/400x300.png?text=${encodeURIComponent(exerciseData.ejercicio || 'Ejercicio')}`;
            }
            
            // Manejar campos opcionales que podrían ser null en la BD si están vacíos
            exerciseData.numero = exerciseData.numero || ""; // schema espera string, no null directamente
            exerciseData.variantes = exerciseData.variantes || "";
            exerciseData.consejos_entrenador = exerciseData.consejos_entrenador || "";


            const validation = addExerciseSchema.safeParse(exerciseData);

            if (validation.success) {
              exercisesToSave.push(validation.data);
            } else {
              failureCount++;
              const errors = validation.error.errors.map(err => `Fila ${index + 2}: Campo '${err.path.join('.')}' - ${err.message}`).join('; ');
              validationErrors.push(errors);
              console.warn(`Error de validación en fila ${index + 2}:`, validation.error.flatten());
            }
          });

          if (validationErrors.length > 0) {
            console.error("Errores de validación detallados:\n" + validationErrors.join('\n'));
             toast({
                title: `Errores de Validación (${failureCount})`,
                description: `Algunos ejercicios no pasaron la validación. Revisa la consola para detalles. Primer error: ${validationErrors[0].substring(0,100)}...`,
                variant: "destructive",
                duration: 7000,
             });
          }
          
          if (exercisesToSave.length > 0) {
            const MAX_BATCH_SIZE = 499; 
            for (let i = 0; i < exercisesToSave.length; i += MAX_BATCH_SIZE) {
                const batch = writeBatch(db);
                const chunk = exercisesToSave.slice(i, i + MAX_BATCH_SIZE);
                chunk.forEach(exData => {
                    const newExerciseRef = doc(collection(db, "ejercicios_futsal"));
                    batch.set(newExerciseRef, {
                        ...exData,
                        createdAt: serverTimestamp(),
                        // Asegurarse de que los campos opcionales se guardan como null si están vacíos en el schema.
                        // Esto se maneja con la lógica de '|| ""' y el schema que permite string.
                        // Si el schema exigiera `z.string().nullable()` el tratamiento sería diferente.
                        numero: exData.numero || null,
                        variantes: exData.variantes || null,
                        consejos_entrenador: exData.consejos_entrenador || null,
                    });
                });
                await batch.commit();
                successCount += chunk.length;
            }
          }
          
          setProcessedStats({ success: successCount, failed: failureCount, total: jsonExercises.length });

          if (successCount > 0) {
            toast({
              title: "Procesamiento Completado",
              description: `${successCount} de ${jsonExercises.length} ejercicios importados correctamente. ${failureCount > 0 ? `${failureCount} fallaron.` : ''}`,
            });
          } else if (failureCount > 0 && successCount === 0) {
             toast({
              title: "Procesamiento Fallido",
              description: `No se pudo importar ningún ejercicio. ${failureCount} ejercicios tuvieron errores.`,
              variant: "destructive",
            });
          }


        } catch (procError: any) {
          console.error("Error processing file content:", procError);
          toast({
            title: "Error al Procesar Archivo",
            description: procError.message || "Hubo un problema al leer o procesar el contenido del archivo.",
            variant: "destructive",
          });
          setProcessedStats({ success: 0, failed: 0, total: 0}); // Reset stats on error
        } finally {
          setIsProcessing(false);
          setSelectedFile(null); 
          const fileInput = document.getElementById('excel-file-input') as HTMLInputElement | null;
          if (fileInput) fileInput.value = "";
        }
      };
      reader.readAsArrayBuffer(selectedFile);
    } catch (readError: any) {
        console.error("Error reading file:", readError);
        toast({
            title: "Error al Leer Archivo",
            description: "No se pudo iniciar la lectura del archivo seleccionado.",
            variant: "destructive",
        });
        setIsProcessing(false);
    }
  };


  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-2xl font-headline text-destructive">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              No tienes permisos para acceder a esta página. Esta sección es solo para administradores.
            </CardDescription>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel de Admin
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Añadir Ejercicios por Lote</h1>
          <p className="text-lg text-foreground/80">
            Sube un archivo Excel (.xlsx, .xls) o CSV (.csv) para añadir múltiples ejercicios a la biblioteca.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Panel
          </Link>
        </Button>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <FileSpreadsheet className="mr-2 h-5 w-5 text-primary" />
            Subir Archivo
          </CardTitle>
          <CardDescription>
            Selecciona un archivo (.xlsx, .xls, .csv) que contenga los ejercicios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="excel-file-input" className="block text-sm font-medium text-foreground">
              Seleccionar archivo
            </label>
            <Input
              id="excel-file-input"
              type="file"
              accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
              onChange={handleFileChange}
              className="h-12 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {selectedFile && <p className="text-sm text-muted-foreground">Archivo seleccionado: {selectedFile.name}</p>}
          </div>
          
          {processedStats && (
            <Alert variant={processedStats.failed > 0 ? "destructive" : "default"} className={processedStats.failed > 0 ? "border-destructive/50" : "border-green-500/50"}>
              {processedStats.failed > 0 ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5 text-green-600"/>}
              <AlertTitle className={processedStats.failed > 0 ? "" : "text-green-700"}>Resultados del Procesamiento</AlertTitle>
              <AlertDescription className={processedStats.failed > 0 ? "" : "text-green-600"}>
                Total de filas procesadas: {processedStats.total}. <br/>
                Ejercicios importados con éxito: {processedStats.success}. <br/>
                Ejercicios con errores: {processedStats.failed}.
                {processedStats.failed > 0 && " Revisa la consola del navegador para más detalles sobre los errores."}
              </AlertDescription>
            </Alert>
          )}


          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Formato del Archivo (Encabezados de Columna)</AlertTitle>
            <AlertDescription>
              <p>Asegúrate de que tu archivo tenga las siguientes columnas en la primera hoja (los nombres deben coincidir exactamente):</p>
              <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                <li><strong>{EXPECTED_HEADERS.numero}</strong> (Opcional, ej: 001)</li>
                <li><strong>{EXPECTED_HEADERS.ejercicio}</strong> (Texto, ej: Pase y movimiento)</li>
                <li><strong>{EXPECTED_HEADERS.descripcion}</strong> (Texto largo)</li>
                <li><strong>{EXPECTED_HEADERS.objetivos}</strong> (Texto largo)</li>
                <li><strong>{EXPECTED_HEADERS.espacio_materiales}</strong> (Texto, ej: Media pista, 5 conos)</li>
                <li><strong>{EXPECTED_HEADERS.jugadores}</strong> (Texto, ej: 10-12)</li>
                <li><strong>{EXPECTED_HEADERS.duracion}</strong> (Texto, ej: 15 min)</li>
                <li><strong>{EXPECTED_HEADERS.variantes}</strong> (Opcional, texto largo)</li>
                <li><strong>{EXPECTED_HEADERS.fase}</strong> (Texto: Calentamiento, Principal, o Vuelta a la calma)</li>
                <li><strong>{EXPECTED_HEADERS.categoria}</strong> (ID de categoría, ej: pase-control)</li>
                <li><strong>{EXPECTED_HEADERS.edad}</strong> (Texto, ej: "Alevín (10-11 años)". Si son varias, separadas por coma: "Alevín (10-11 años),Infantil (12-13 años)")</li>
                <li><strong>{EXPECTED_HEADERS.consejos_entrenador}</strong> (Opcional, texto largo)</li>
                <li><strong>{EXPECTED_HEADERS.imagen}</strong> (Opcional, URL completa a una imagen. Si se deja vacío, se usará una imagen genérica)</li>
              </ul>
               <p className="mt-2 text-xs">Consulta la lista de IDs de categoría en la sección de añadir ejercicio individual. Para '{EXPECTED_HEADERS.edad}', si son varias, sepáralas por comas (ej: "Alevín (10-11 años),Infantil (12-13 años)").</p>
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button onClick={handleProcessFile} className="w-full" disabled={!selectedFile || isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isProcessing ? "Procesando Archivo..." : "Procesar y Guardar Ejercicios"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function BatchAddExercisesPage() {
  return (
    <AuthGuard>
      <BatchAddExercisesPageContent />
    </AuthGuard>
  );
}
