
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, PlusCircle, ListChecks, UploadCloud } from "lucide-react";
import Link from "next/link";

function AdminPageContent() {
  const { isAdmin, user } = useAuth();

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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 text-center">
        <ShieldCheck className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Panel de Administración</h1>
        <p className="text-lg text-foreground/80">
          Bienvenido, Administrador ({user?.email}).
        </p>
      </header>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Gestión de Ejercicios</CardTitle>
          <CardDescription>Añade, modifica o elimina ejercicios de la biblioteca, individualmente o por lote.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4">
            <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/admin/add-exercise">
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Nuevo Ejercicio
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/admin/batch-add-exercises">
                <UploadCloud className="mr-2 h-5 w-5" />
                Añadir Ejercicios por Lote
              </Link>
            </Button>
             <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/admin/manage-exercises">
                <ListChecks className="mr-2 h-5 w-5" />
                Ver/Gestionar Ejercicios
              </Link>
            </Button>
          </div>
          
          <div className="p-4 border rounded-md bg-muted/50">
            <h4 className="font-semibold text-lg mb-2 text-foreground/90">Funcionalidades Disponibles:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                **Añadir Nuevo Ejercicio:** Formulario completo para ingresar todos los detalles de un nuevo ejercicio.
              </li>
               <li>
                **Añadir Ejercicios por Lote:** Sube un archivo Excel para importar múltiples ejercicios a la vez.
              </li>
              <li>
                **Ver/Gestionar Ejercicios:** Listado de ejercicios con opciones para modificar, eliminar, filtrar y paginar los resultados.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Otras Funcionalidades (Futuras)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí se podrían añadir herramientas para gestionar usuarios, ver estadísticas de uso, configurar parámetros de la IA, etc.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminPageContent />
    </AuthGuard>
  );
}

