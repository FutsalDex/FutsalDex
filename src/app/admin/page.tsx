
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle } from "lucide-react";

function AdminPageContent() {
  const { isAdmin, user } = useAuth();

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center">
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
      <Card>
        <CardHeader>
          <CardTitle>Funcionalidades del Administrador</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Aquí se mostrarían las herramientas para gestionar el contenido de la aplicación (ejercicios, usuarios, etc.).
          </p>
          <p className="mt-4 text-sm font-semibold text-accent">
            (Nota: La funcionalidad completa de administración está en desarrollo y no se incluye en esta actualización).
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
