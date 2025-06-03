
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

function BatchAddExercisesPageContent() {
  const { isAdmin } = useAuth();

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
            Selecciona un archivo .xlsx o .xls que contenga los ejercicios siguiendo el formato especificado.
            (Aquí iría el componente de subida de archivo y las instrucciones detalladas del formato.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Contenido de la subida de Excel en desarrollo...
          </p>
          {/* Placeholder for the Excel upload component */}
        </CardContent>
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
