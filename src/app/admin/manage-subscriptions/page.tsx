
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Users, Construction } from "lucide-react";
import Link from "next/link";

function ManageSubscriptionsPageContent() {
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
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Gestionar Suscripciones</h1>
          <p className="text-lg text-foreground/80">
            Visualiza y administra las suscripciones de los usuarios de la plataforma.
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
            <Users className="mr-2 h-5 w-5 text-primary" />
            Listado de Suscripciones
          </CardTitle>
          <CardDescription>
            Aquí se mostrará la información de las suscripciones de los usuarios.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[200px] flex flex-col items-center justify-center">
            <Construction className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-semibold text-lg">Funcionalidad en Desarrollo</p>
            <p className="text-muted-foreground text-sm">
                Esta sección para gestionar las suscripciones de los usuarios está actualmente en construcción.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ManageSubscriptionsPage() {
  return (
    <AuthGuard>
      <ManageSubscriptionsPageContent />
    </AuthGuard>
  );
}
