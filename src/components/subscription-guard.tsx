
"use client";

import { useAuth } from "@/contexts/auth-context";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";

export function SubscriptionGuard({ children }: { children: ReactNode }) {
  const { isSubscribed, isAdmin } = useAuth(); // AuthGuard already handles loading and user states

  if (isAdmin || isSubscribed) {
    return <>{children}</>;
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-12rem)]">
      <Card className="w-full max-w-lg text-center shadow-lg bg-accent/10 border-accent">
        <CardHeader>
          <Star className="mx-auto h-12 w-12 text-accent mb-4" />
          <CardTitle className="text-2xl font-headline text-accent">Acceso Pro Requerido</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-foreground/90 text-base mb-6">
            Esta funcionalidad es exclusiva para usuarios con una suscripción activa.
            <br />
            ¡Desbloquea todo el potencial de FutsalDex y lleva tu entrenamiento al siguiente nivel!
          </CardDescription>
          <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Link href="/suscripcion">
              Ver Planes de Suscripción <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
