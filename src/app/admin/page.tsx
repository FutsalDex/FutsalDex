
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, PlusCircle, ListChecks, UploadCloud, Users } from "lucide-react";
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Añadir Ejercicios</CardTitle>
            <CardDescription>Añade nuevos ejercicios a la biblioteca de forma individual o por lote.</CardDescription>
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
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Gestionar Ejercicios</CardTitle>
            <CardDescription>Visualiza, edita, elimina y gestiona la visibilidad de todos los ejercicios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
               <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/admin/manage-exercises">
                  <ListChecks className="mr-2 h-5 w-5" />
                  Gestionar Ejercicios
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Gestión de Suscripciones</CardTitle>
            <CardDescription>Visualiza y gestiona las suscripciones de los usuarios.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/admin/manage-subscriptions">
                  <Users className="mr-2 h-5 w-5" />
                  Gestionar Suscripciones
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
