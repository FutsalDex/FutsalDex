
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
import { addExerciseSchema, type AddExerciseFormValues } from '@/lib/schemas'; 

const EXPECTED_HEADERS = {
  numero: "Número",
  ejercicio: "Ejercicio",
  descripcion: "Descripción de la tarea",
  objetivos: "Objetivos",
  espacio_materiales: "Espacio y materiales necesarios",
  jugadores: "Número de jugadores",
  duracion: "Duración estimada",
  variantes: "Variantes",
  fase: "Fase",
  categoria: "Categoría",
  edad: "Edad",
  consejos_entrenador: "Consejos para el entrenador",
  imagen: "Imagen",
};


function BatchAddExercisesPageContent() {
  const { isAdmin } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedStats, setProcessedStats] = useState<{ success: number, failed: number, total: number } | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setProcessedStats(null); 
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
        "application/vnd.ms-excel", 
        "text/csv" 
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
        if (event.target) event.target.value = ""; 
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
    let totalRows = 0;

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
          const jsonExercises = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];
          totalRows = jsonExercises.length;

          if (totalRows === 0) {
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
            
            exerciseData.numero = exerciseData.numero || ""; 
            exerciseData.variantes = exerciseData.variantes || "";
            exerciseData.consejos_entrenador = exerciseData.consejos_entrenador || "";


            const validation = addExerciseSchema.safeParse(exerciseData);

            if (validation.success) {
              exercisesToSave.push(validation.data);
            } else {
              failureCount++;
              const errors = validation.error.errors.map(err => `Fila ${index + 2}: Campo '${err.path.join('.')}' ('${EXPECTED_HEADERS[err.path[0] as keyof typeof EXPECTED_HEADERS] || err.path[0]}') - ${err.message}`).join('; ');
              validationErrors.push(errors);
              console.warn(`Error de validación en fila ${index + 2}:`, validation.error.flatten());
            }
          });

          if (validationErrors.length > 0) {
            console.error("Errores de validación detallados:\n" + validationErrors.join('\n'));
            
            const errorGuidance = (
              <div className="text-sm">
                <p className="font-semibold mb-1">Se encontraron {failureCount} fila(s) con errores de validación.</p>
                <p className="mb-1">Por favor, revisa tu archivo Excel y asegúrate de que:</p>
                <ul className="list-disc list-inside pl-4 space-y-0.5 text-xs">
                  <li>Los nombres de las columnas coinciden <strong>EXACTAMENTE</strong> con los especificados en la sección "Formato del Archivo". ¡Cuidado con espacios extra o diferencias en mayúsculas/minúsculas/tildes!</li>
                  <li>Todos los campos marcados como <strong>requeridos</strong> en el schema (Ejercicio, Descripción de la tarea, Objetivos, Fase, Categoría, Edad, Espacio y materiales necesarios, Número de jugadores, Duración estimada) están <strong>completos y no son cadenas vacías</strong>.</li>
                  <li>El campo '{EXPECTED_HEADERS.categoria}' usa el <strong>ID de la categoría</strong> (ej: 'pase-control', 'finalizacion'), no el nombre completo. Consulta los IDs en la sección de "Añadir ejercicio".</li>
                  <li>El campo '{EXPECTED_HEADERS.edad}' no está vacío y contiene categorías de edad válidas. Si son varias, sepáralas por comas (ej: "Alevín (10-11 años),Infantil (12-13 años)").</li>
                </ul>
                <p className="mt-2">Consulta la consola del navegador (presiona F12 y ve a la pestaña "Consola") para ver los errores detallados por cada fila.</p>
              </div>
            );

             toast({
                title: `Errores de Validación (${failureCount})`,
                description: errorGuidance,
                variant: "destructive",
                duration: 30000, 
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
                        numero: exData.numero || null,
                        variantes: exData.variantes || null,
                        consejos_entrenador: exData.consejos_entrenador || null,
                    });
                });
                await batch.commit();
                successCount += chunk.length;
            }
          }
          
          setProcessedStats({ success: successCount, failed: failureCount, total: totalRows });

          if (successCount > 0 && failureCount === 0) {
            toast({
              title: "Procesamiento Completado",
              description: `${successCount} ejercicios importados correctamente.`,
            });
          } else if (successCount > 0 && failureCount > 0) {
             toast({
              title: "Procesamiento Parcial",
              description: `${successCount} de ${totalRows} ejercicios importados. ${failureCount} fallaron. Revisa los errores.`,
              variant: "default", 
              duration: 10000,
            });
          } else if (failureCount > 0 && successCount === 0 && totalRows > 0){
            // El toast de error de validación ya es suficiente.
          } else if (totalRows === 0 && successCount === 0 && failureCount === 0){
            // Ya manejado por "Archivo Vacío"
          }


        } catch (procError: any) {
          console.error("Error processing file content:", procError);
          toast({
            title: "Error al Procesar Archivo",
            description: procError.message || "Hubo un problema al leer o procesar el contenido del archivo. Verifica que el formato sea correcto.",
            variant: "destructive",
          });
          setProcessedStats({ success: 0, failed: totalRows > 0 ? totalRows : 0, total: totalRows > 0 ? totalRows : 0 });
        } finally {
          setIsProcessing(false);
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
              className="h-14 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {selectedFile && <p className="text-sm text-muted-foreground">Archivo seleccionado: {selectedFile.name}</p>}
          </div>
          
          {processedStats && (
            <Alert variant={processedStats.failed > 0 && processedStats.success === 0 ? "destructive" : (processedStats.failed > 0 ? "default" : "default")} 
                   className={processedStats.failed > 0 && processedStats.success === 0 ? "border-destructive/50" : (processedStats.failed > 0 ? "border-yellow-500/50" : "border-green-500/50")}>
              {processedStats.failed > 0 && processedStats.success === 0 ? <XCircle className="h-5 w-5 text-destructive" /> : (processedStats.failed > 0 ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> : <CheckCircle className="h-5 w-5 text-green-600"/>)}
              <AlertTitle className={processedStats.failed > 0 && processedStats.success === 0 ? "text-destructive" : (processedStats.failed > 0 ? "text-yellow-700" : "text-green-700")}>Resultados del Procesamiento</AlertTitle>
              <AlertDescription className={processedStats.failed > 0 && processedStats.success === 0 ? "text-destructive-foreground/90" : (processedStats.failed > 0 ? "text-yellow-600" : "text-green-600")}>
                Total de filas procesadas: {processedStats.total}. <br/>
                Ejercicios importados con éxito: {processedStats.success}. <br/>
                Ejercicios con errores: {processedStats.failed}.
                {processedStats.failed > 0 && " Revisa la consola del navegador (F12) y las notificaciones para más detalles sobre los errores."}
              </AlertDescription>
            </Alert>
          )}


          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Formato del Archivo (Encabezados de Columna)</AlertTitle>
            <AlertDescription>
              <p className="font-semibold">Asegúrate de que tu archivo Excel/CSV tenga las siguientes columnas en la primera hoja. Los nombres deben coincidir <strong>EXACTAMENTE</strong> (mayúsculas, minúsculas, espacios, tildes y guiones bajos):</p>
              <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                <li><strong>{EXPECTED_HEADERS.numero}</strong> (Opcional. Ej: 001)</li>
                <li><strong>{EXPECTED_HEADERS.ejercicio}</strong> (Requerido. Ej: Pase y movimiento)</li>
                <li><strong>{EXPECTED_HEADERS.descripcion}</strong> (Requerido)</li>
                <li><strong>{EXPECTED_HEADERS.objetivos}</strong> (Requerido)</li>
                <li><strong>{EXPECTED_HEADERS.espacio_materiales}</strong> (Requerido. Ej: Media pista, 5 conos)</li>
                <li><strong>{EXPECTED_HEADERS.jugadores}</strong> (Requerido. Ej: 10-12)</li>
                <li><strong>{EXPECTED_HEADERS.duracion}</strong> (Requerido. Ej: 15 min)</li>
                <li><strong>{EXPECTED_HEADERS.variantes}</strong> (Opcional)</li>
                <li><strong>{EXPECTED_HEADERS.fase}</strong> (Requerido. Debe ser uno de: Calentamiento, Principal, Vuelta a la calma)</li>
                <li><strong>{EXPECTED_HEADERS.categoria}</strong> (Requerido. Debe ser el <strong>ID de la categoría</strong>, ej: 'pase-control', 'finalizacion'. Consulta los IDs en la sección de añadir ejercicio individual, no el nombre completo de la categoría)</li>
                <li><strong>{EXPECTED_HEADERS.edad}</strong> (Requerido. Ej: "Alevín (10-11 años)". Si son varias, separadas por coma: "Alevín (10-11 años),Infantil (12-13 años)"). La celda no puede estar vacía.</li>
                <li><strong>{EXPECTED_HEADERS.consejos_entrenador}</strong> (Opcional)</li>
                <li><strong>{EXPECTED_HEADERS.imagen}</strong> (Opcional, URL completa. Si se deja vacío, se usará una imagen genérica)</li>
              </ul>
               <p className="mt-2 text-xs"><strong className="text-destructive">Importante:</strong> Todos los campos marcados como "Requerido" deben tener contenido válido y no ser cadenas vacías. Las celdas vacías en campos requeridos causarán errores de validación.</p>
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

      