
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, DatabaseZap, Loader2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { seedPremiumUsers } from "@/lib/actions/admin-actions";

interface SeedResult {
    success: boolean;
    message: string;
    details?: {
        created: number;
        updated: number;
        failed: string[];
    };
}

function SeedUsersPageContent() {
  const { isAdmin } = useAuth();
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<SeedResult | null>(null);
  const { toast } = useToast();

  const handleSeedUsers = async () => {
    setIsSeeding(true);
    setResult(null);
    try {
        const seedResult = await seedPremiumUsers();
        setResult(seedResult);
        toast({
            title: seedResult.success ? "Proceso Exitoso" : "Proceso con Errores",
            description: seedResult.message,
            variant: seedResult.success ? "default" : "destructive",
            duration: 15000,
        });
    } catch (error: any) {
        const errorMessage = error.message || "Un error desconocido ocurrió en el cliente.";
        setResult({ success: false, message: errorMessage });
        toast({
            title: "Error Inesperado del Cliente",
            description: errorMessage,
            variant: "destructive",
        });
    }
    setIsSeeding(false);
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
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Crear Usuarios de Prueba</h1>
          <p className="text-lg text-foreground/80">
            Crea 15 usuarios de prueba con suscripción Pro.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Panel
          </Link>
        </Button>
      </header>

      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <DatabaseZap className="mr-2 h-5 w-5 text-primary" />
            Poblar Base de Datos
          </CardTitle>
          <CardDescription>
            Haz clic en el botón para crear o actualizar 15 usuarios de prueba. Cada usuario tendrá una suscripción Pro de un año. Si un usuario ya existe, se actualizará su suscripción.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Advertencia</AlertTitle>
            <AlertDescription>
              Esta acción es irreversible y modificará los datos en Firebase Authentication y Firestore. No se puede deshacer. Esta función solo está disponible en entornos de desarrollo con las credenciales de administrador configuradas.
            </AlertDescription>
          </Alert>

          <Button onClick={handleSeedUsers} className="w-full" disabled={isSeeding}>
            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DatabaseZap className="mr-2 h-4 w-4" />}
            {isSeeding ? "Creando Usuarios..." : "Iniciar Creación de Usuarios"}
          </Button>

          {result && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? <CheckCircle className="h-4 w-4"/> : <XCircle className="h-4 w-4"/>}
              <AlertTitle>{result.success ? "Resultado del Proceso" : "Resultado con Errores"}</AlertTitle>
              <AlertDescription>
                <p className="font-semibold mb-2">{result.message}</p>
                {result.details && (
                  <div className="text-xs">
                    <p>Usuarios creados: {result.details.created}</p>
                    <p>Usuarios actualizados: {result.details.updated}</p>
                    {result.details.failed.length > 0 && (
                      <div>
                        <p className="mt-2 font-bold">Fallos ({result.details.failed.length}):</p>
                        <ul className="list-disc list-inside pl-2">
                          {result.details.failed.map((fail, index) => (
                            <li key={index}>{fail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

        </CardContent>
      </Card>
    </div>
  );
}


export default function SeedUsersPage() {
    return (
        <AuthGuard>
            <SeedUsersPageContent />
        </AuthGuard>
    )
}
