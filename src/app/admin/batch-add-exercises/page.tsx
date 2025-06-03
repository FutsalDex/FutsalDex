
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, FileSpreadsheet, UploadCloud, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState, type ChangeEvent } from "react";
import { useToast } from "@/hooks/use-toast";

function BatchAddExercisesPageContent() {
  const { isAdmin } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || file.type === "application/vnd.ms-excel") {
        setSelectedFile(file);
      } else {
        toast({
          title: "Archivo no válido",
          description: "Por favor, selecciona un archivo .xlsx o .xls.",
          variant: "destructive",
        });
        setSelectedFile(null);
        event.target.value = ""; // Reset file input
      }
    }
  };

  const handleProcessFile = async () => {
    if (!selectedFile) {
      toast({
        title: "No hay archivo",
        description: "Por favor, selecciona un archivo Excel para procesar.",
        variant: "destructive",
      });
      return;
    }
    setIsProcessing(true);
    // Placeholder for actual file processing logic
    // In a real scenario, you'd read the file, parse it, validate data, and batch-write to Firestore.
    // This would likely involve a server action or a backend function.
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

    toast({
      title: "Procesamiento Simulado",
      description: `El archivo "${selectedFile.name}" ha sido "procesado". La lógica real de carga no está implementada en esta demo.`,
    });
    setSelectedFile(null);
    // Reset file input if possible (difficult to do directly for security reasons)
    // A common workaround is to reset the form or the key of the input component.
    const fileInput = document.getElementById('excel-file-input') as HTMLInputElement | null;
    if (fileInput) {
      fileInput.value = "";
    }
    setIsProcessing(false);
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
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Añadir Ejercicios por Lote desde Excel</h1>
          <p className="text-lg text-foreground/80">
            Sube un archivo Excel para añadir múltiples ejercicios a la biblioteca de forma masiva.
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
            Subir Archivo Excel
          </CardTitle>
          <CardDescription>
            Selecciona un archivo .xlsx o .xls que contenga los ejercicios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="excel-file-input" className="block text-sm font-medium text-foreground">
              Seleccionar archivo Excel (.xlsx, .xls)
            </label>
            <Input
              id="excel-file-input"
              type="file"
              accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              onChange={handleFileChange}
              className="h-12 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {selectedFile && <p className="text-sm text-muted-foreground">Archivo seleccionado: {selectedFile.name}</p>}
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Formato del Archivo Excel</AlertTitle>
            <AlertDescription>
              <p>Asegúrate de que tu archivo Excel tenga las siguientes columnas en la primera hoja:</p>
              <ul className="list-disc list-inside text-xs mt-2 space-y-1">
                <li><strong>Numero</strong> (Opcional, ej: 001)</li>
                <li><strong>Ejercicio</strong> (Texto, ej: Pase y movimiento)</li>
                <li><strong>Descripcion</strong> (Texto largo)</li>
                <li><strong>Objetivos</strong> (Texto largo)</li>
                <li><strong>Espacio_Materiales</strong> (Texto, ej: Media pista, 5 conos)</li>
                <li><strong>Jugadores</strong> (Texto, ej: 10-12)</li>
                <li><strong>Duracion</strong> (Texto, ej: 15 min)</li>
                <li><strong>Variantes</strong> (Opcional, texto largo)</li>
                <li><strong>Fase</strong> (Texto: Calentamiento, Principal, o Vuelta a la calma)</li>
                <li><strong>Categoria</strong> (ID de categoría, ej: pase-control)</li>
                <li><strong>Edad</strong> (Texto, ej: Alevín (10-11 años))</li>
                <li><strong>Consejos_Entrenador</strong> (Opcional, texto largo)</li>
                <li><strong>Imagen</strong> (Opcional, URL completa a una imagen)</li>
              </ul>
               <p className="mt-2 text-xs">Consulta la lista de IDs de categoría en la sección de añadir ejercicio individual.</p>
            </AlertDescription>
          </Alert>
           <p className="text-sm text-center text-amber-600 font-semibold">
              Importante: La funcionalidad de procesamiento y carga real de datos desde Excel está en desarrollo y no se implementará en esta fase. Este es un marcador de posición.
            </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleProcessFile} className="w-full" disabled={!selectedFile || isProcessing}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
            {isProcessing ? "Procesando..." : "Procesar Archivo (Simulación)"}
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
