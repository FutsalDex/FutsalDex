
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LifeBuoy, Mail } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

function SoportePageContent() {
  const { user } = useAuth();
  const supportEmail = "soporte.top@futsaldex.com";
  const mailtoLink = `mailto:${supportEmail}?subject=Soporte Prioritario FutsalDex&body=Hola, necesito ayuda. Mi email de usuario es: ${user?.email || 'No disponible'}`;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
            <LifeBuoy className="mr-3 h-8 w-8"/>
            Soporte Técnico Prioritario
          </h1>
          <p className="text-lg text-foreground/80">
            Estamos aquí para ayudarte. Como suscriptor Top, tus consultas tienen la máxima prioridad.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Inicio
          </Link>
        </Button>
      </header>

      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">
            ¿Necesitas Ayuda?
          </CardTitle>
          <CardDescription>
            Contacta con nuestro equipo de soporte exclusivo para usuarios Top.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
            <p className="mb-4">
                Para cualquier duda, problema técnico o sugerencia, no dudes en escribirnos. Nos comprometemos a responderte en menos de 24 horas laborables.
            </p>
            <p className="mb-6">
                Asegúrate de escribir desde el email asociado a tu cuenta FutsalDex para una atención más rápida.
            </p>
            <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <a href={mailtoLink}>
                    <Mail className="mr-2 h-5 w-5"/>
                    Contactar por Email
                </a>
            </Button>
            <p className="mt-4 text-sm text-muted-foreground">
                O escribe directamente a: <strong className="text-primary">{supportEmail}</strong>
            </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SoportePage() {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <SoportePageContent />
      </SubscriptionGuard>
    </AuthGuard>
  );
}
