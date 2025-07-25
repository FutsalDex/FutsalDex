
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, FileSpreadsheet, UploadCloud, Info, Loader2, CheckCircle, XCircle, Download } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState, type ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { addExerciseSchema, type AddExerciseFormValues } from '@/lib/schemas';
import { DURACION_EJERCICIO_OPCIONES_VALUES } from "@/lib/constants";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, getDocs, query, writeBatch, doc, serverTimestamp } from "firebase/firestore";


const EXPECTED_HEADERS: { [key in keyof Required<Omit<AddExerciseFormValues, 'isVisible'>>]: string } & { [key: string]: string } = {
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

async function getExistingExerciseNamesClient(): Promise<string[]> {
  const db = getFirebaseDb();
  const exercisesCollection = collection(db, "ejercicios_futsal");
  const q = query(exercisesCollection);
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    return [];
  }

  const names = snapshot.docs.map(doc => doc.data().ejercicio as string).filter(Boolean);
  return names;
}

async function addManyExercisesClient(exercises: AddExerciseFormValues[]): Promise<void> {
    const db = getFirebaseDb();
    const batch = writeBatch(db);
    const collectionRef = collection(db, 'ejercicios_futsal');

    exercises.forEach(exData => {
        const newDocRef = doc(collectionRef);
        batch.set(newDocRef, {
            ...exData,
            createdAt: serverTimestamp(),
            numero: exData.numero || null,
            variantes: exData.variantes || null,
            consejos_entrenador: exData.consejos_entrenador || null,
            isVisible: exData.isVisible === undefined ? true : exData.isVisible,
        });
    });

    await batch.commit();
}


function BatchAddExercisesPageContent() {
  const { isAdmin } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedStats, setProcessedStats] = useState<{ success: number, failed: number, skipped: number, total: number } | null>(null);
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
  
  const handleDownloadTemplate = () => {
    const headers = Object.values(EXPECTED_HEADERS);
    const sampleData = [
      {
        "Número": "001",
        "Ejercicio": "Rondo 4 vs 1",
        "Descripción de la tarea": "Cuatro jugadores en círculo pasan el balón a un toque, mientras un jugador en el centro intenta interceptarlo.",
        "Objetivos": "Mejorar la velocidad del pase, el control orientado y la presión tras pérdida.",
        "Espacio y materiales necesarios": "Círculo de 8m de diámetro, 1 balón, 5 conos.",
        "Número de jugadores": "5",
        "Duración (min)": "10",
        "Variantes": "Limitar a dos toques, añadir un segundo defensor.",
        "Fase": "Inicial",
        "Categoría": "Pase y control",
        "Edad": "Alevín (10-11 años), Infantil (12-13 años)",
        "Consejos para el entrenador": "Fomentar la comunicación y el movimiento sin balón.",
        "Imagen": "https://i.ibb.co/your-image-url.png"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "PlantillaEjercicios");

    // Auto-ajustar ancho de columnas
    const max_width = sampleData.reduce((w, r) => Math.max(w, ...Object.values(r).map(v => String(v).length)), 10);
    worksheet["!cols"] = headers.map(() => ({ wch: max_width }));

    XLSX.writeFile(workbook, "FutsalDex_Plantilla_Ejercicios.xlsx");
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
    let skippedCount = 0;
    let totalRows = 0;

    try {
      const existingExerciseNames = await getExistingExerciseNamesClient();
      const existingNamesSet = new Set(existingExerciseNames.map(name => name.toLowerCase()));
      
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
          const jsonExercises = XLSX.utils.sheet_to_json(worksheet, { defval: "", raw: false, cellText: true }) as any[];
          totalRows = jsonExercises.length;

          if (totalRows === 0) {
            toast({ title: "Archivo Vacío", description: "El archivo no contiene ejercicios.", variant: "default" });
            setIsProcessing(false);
            return;
          }

          const exercisesToSave: AddExerciseFormValues[] = [];
          const validationErrors: string[] = [];

          jsonExercises.forEach((row, index) => {
            const mappedData: { [key: string]: any } = {};
            for (const key in EXPECTED_HEADERS) {
                const headerName = EXPECTED_HEADERS[key as keyof typeof EXPECTED_HEADERS];
                mappedData[key] = row[headerName] ?? "";
            }
            
            const exerciseName = String(mappedData.ejercicio || "").trim();
            if (exerciseName && existingNamesSet.has(exerciseName.toLowerCase())) {
                skippedCount++;
                return; // Skip this exercise as it already exists
            }

            const rawDuracion = mappedData.duracion;
            let duracionValue = "";
            if (rawDuracion !== null && rawDuracion !== undefined) {
              const duracionStr = String(rawDuracion).trim();
              if (DURACION_EJERCICIO_OPCIONES_VALUES.includes(duracionStr)) {
                duracionValue = duracionStr;
              }
            }

            const exerciseData: Partial<AddExerciseFormValues> = {
              numero: String(mappedData.numero || ""),
              ejercicio: exerciseName,
              descripcion: String(mappedData.descripcion || ""),
              objetivos: String(mappedData.objetivos || ""),
              espacio_materiales: String(mappedData.espacio_materiales || ""),
              jugadores: String(mappedData.jugadores || ""),
              duracion: duracionValue,
              variantes: String(mappedData.variantes || ""),
              fase: String(mappedData.fase || ""),
              categoria: String(mappedData.categoria || ""),
              edad: mappedData.edad ? String(mappedData.edad).split(',').map((item: string) => item.trim()).filter(Boolean) : [],
              consejos_entrenador: String(mappedData.consejos_entrenador || ""),
              imagen: String(mappedData.imagen || ""),
              isVisible: true,
            };

            if (!exerciseData.imagen) {
                exerciseData.imagen = `https://placehold.co/400x300.png?text=${encodeURIComponent(exerciseData.ejercicio || 'Ejercicio')}`;
            }

            const validation = addExerciseSchema.safeParse(exerciseData);

            if (validation.success) {
              exercisesToSave.push(validation.data);
            } else {
              failureCount++;
              const errors = validation.error.errors.map(err => {
                const fieldName = EXPECTED_HEADERS[err.path[0] as keyof typeof EXPECTED_HEADERS] || err.path[0];
                let message = err.message;
                 if (err.code === 'invalid_enum_value' && err.path[0] === 'duracion') {
                   message = `Valor inválido. Debe ser uno de: ${DURACION_EJERCICIO_OPCIONES_VALUES.join(', ')}.`;
                 }
                if (err.code === 'too_small' && err.path[0] === 'edad') {
                  message = `El campo 'Edad' es requerido y no puede estar vacío.`;
                }
                return `Fila ${index + 2}: Campo '${fieldName}' - ${message}`;
              }).join('; ');
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
                  <li>Los nombres de las columnas coinciden <strong>EXACTAMENTE</strong> con los especificados en la sección "Formato del Archivo".</li>
                  <li>Todos los campos marcados como <strong>requeridos</strong> están <strong>completos y no son cadenas vacías</strong>.</li>
                  <li>El campo '{EXPECTED_HEADERS.duracion}' contiene uno de los valores permitidos: {DURACION_EJERCICIO_OPCIONES_VALUES.join(', ')}.</li>
                  <li>El campo '{EXPECTED_HEADERS.categoria}' usa el <strong>nombre completo de la categoría</strong>.</li>
                  <li>El campo '{EXPECTED_HEADERS.edad}' no está vacío y contiene categorías de edad válidas separadas por comas.</li>
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
             await addManyExercisesClient(exercisesToSave);
             successCount = exercisesToSave.length;
          }

          setProcessedStats({ success: successCount, failed: failureCount, skipped: skippedCount, total: totalRows });

          if (successCount > 0 && failureCount === 0) {
            toast({
              title: "Procesamiento Completado",
              description: `${successCount} ejercicios importados correctamente. ${skippedCount > 0 ? `${skippedCount} omitidos por ser duplicados.` : ''}`,
            });
          } else if (successCount > 0 && failureCount > 0) {
             toast({
              title: "Procesamiento Parcial",
              description: `${successCount} de ${totalRows} ejercicios importados. ${failureCount} fallaron. ${skippedCount} omitidos. Revisa los errores.`,
              variant: "default",
              duration: 10000,
            });
          } else if (failureCount > 0 && successCount === 0 && totalRows > 0){
            // El toast de error de validación ya es suficiente.
          } else if (skippedCount > 0 && successCount === 0 && failureCount === 0) {
            toast({
              title: "No se añadieron nuevos ejercicios",
              description: `${skippedCount} ejercicios fueron omitidos por ser duplicados.`,
              variant: "default",
            });
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
          setProcessedStats({ success: 0, failed: totalRows > 0 ? totalRows : 0, skipped: 0, total: totalRows > 0 ? totalRows : 0 });
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
            Selecciona un archivo (.xlsx, .xls, .csv) que contenga los ejercicios. Para asegurar el formato correcto, puedes descargar nuestra plantilla.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
             <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                Descargar plantilla
                </label>
                <Button onClick={handleDownloadTemplate} variant="outline" className="w-full h-14">
                    <Download className="mr-2 h-5 w-5" />
                    Descargar Plantilla Excel
                </Button>
            </div>
          </div>

          {processedStats && (
            <Alert variant={processedStats.failed > 0 && processedStats.success === 0 ? "destructive" : (processedStats.failed > 0 ? "default" : "default")}
                   className={processedStats.failed > 0 && processedStats.success === 0 ? "border-destructive/50" : (processedStats.failed > 0 ? "border-yellow-500/50" : "border-green-500/50")}>
              {processedStats.failed > 0 && processedStats.success === 0 ? <XCircle className="h-5 w-5 text-destructive" /> : (processedStats.failed > 0 ? <AlertTriangle className="h-5 w-5 text-yellow-600" /> : <CheckCircle className="h-5 w-5 text-green-600"/>)}
              <AlertTitle className={processedStats.failed > 0 && processedStats.success === 0 ? "text-destructive" : (processedStats.failed > 0 ? "text-yellow-700" : "text-green-700")}>Resultados del Procesamiento</AlertTitle>
              <AlertDescription className={processedStats.failed > 0 && processedStats.success === 0 ? "text-destructive-foreground/90" : (processedStats.failed > 0 ? "text-yellow-600" : "text-green-600")}>
                Total de filas procesadas: {processedStats.total}. <br/>
                Ejercicios importados con éxito: {processedStats.success}. <br/>
                Ejercicios con errores: {processedStats.failed}. <br/>
                Ejercicios omitidos (duplicados): {processedStats.skipped}.
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
                {Object.values(EXPECTED_HEADERS).map(header => (
                  <li key={header}><strong>{header}</strong></li>
                ))}
              </ul>
               <p className="mt-2 text-xs"><strong className="text-destructive">Importante:</strong> Todos los campos marcados como "Requerido" deben tener contenido válido y no ser cadenas vacías. Las celdas vacías en campos requeridos causarán errores de validación. Las categorías de edad múltiples deben ir separadas por comas.</p>
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
