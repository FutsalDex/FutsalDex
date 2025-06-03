
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, PlusCircle, Edit, Trash2, ListChecks } from "lucide-react";
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
          <CardDescription>Añade, modifica o elimina ejercicios de la biblioteca.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link href="/admin/add-exercise">
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Nuevo Ejercicio
              </Link>
            </Button>
             <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href="/admin/manage-exercises">
                <ListChecks className="mr-2 h-5 w-5" />
                Ver/Gestionar Ejercicios Existentes
              </Link>
            </Button>
          </div>
          
          <div className="p-4 border rounded-md bg-muted/50">
            <h4 className="font-semibold text-lg mb-2 text-foreground/90">Funcionalidad Detallada (En Desarrollo):</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>
                **Añadir Nuevo Ejercicio:** Un formulario permitirá ingresar todos los detalles de un nuevo ejercicio (nombre, descripción, objetivos, fase, categoría, edad, materiales, duración, variantes, consejos, imagen).
              </li>
              <li>
                **Ver/Gestionar Ejercicios Existentes:** Se mostrará una tabla o lista de todos los ejercicios. Cada ejercicio tendrá opciones para:
                <ul className="list-circle list-inside ml-4 mt-1 space-y-0.5">
                  <li><Edit className="inline h-4 w-4 mr-1 text-blue-500"/>Modificar: Abrir el formulario con los datos del ejercicio para editarlos.</li>
                  <li><Trash2 className="inline h-4 w-4 mr-1 text-red-500"/>Eliminar: Borrar el ejercicio de la base de datos (con confirmación).</li>
                </ul>
              </li>
              <li>
                Se incluirán filtros y paginación para facilitar la búsqueda y gestión de un gran número de ejercicios.
              </li>
            </ul>
          </div>
           <p className="mt-4 text-sm font-semibold text-accent text-center">
            (Nota: La funcionalidad completa de gestión de ejercicios está en desarrollo).
          </p>
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
  // AuthGuard ensures user is logged in. Further checks for admin role are done in AdminPageContent.
  return (
    <AuthGuard>
      <AdminPageContent />
    </AuthGuard>
  );
}
