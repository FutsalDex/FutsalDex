
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction, LineChart } from "lucide-react";
import Link from "next/link";

function EstadisticasPageContent() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
            <LineChart className="mr-3 h-8 w-8"/>
            Estadísticas Avanzadas
          </h1>
          <p className="text-lg text-foreground/80">
            Analiza el rendimiento de tu equipo y el progreso de tus sesiones.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Inicio
          </Link>
        </Button>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <Construction className="mr-2 h-5 w-5 text-accent" />
            Funcionalidad en Desarrollo
          </CardTitle>
          <CardDescription>
            Estamos construyendo una potente herramienta de análisis.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-h-[300px] flex flex-col items-center justify-center text-center">
            <Construction className="h-24 w-24 text-muted-foreground mb-6" />
            <p className="text-muted-foreground font-semibold text-xl mb-2">¡Próximamente!</p>
            <p className="text-muted-foreground max-w-md">
                Esta sección está actualmente en construcción. Pronto podrás visualizar gráficos y estadísticas detalladas sobre el uso de ejercicios, la planificación de tus temporadas y el rendimiento general de tu equipo.
            </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EstadisticasPage() {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <EstadisticasPageContent />
      </SubscriptionGuard>
    </AuthGuard>
  );
}
