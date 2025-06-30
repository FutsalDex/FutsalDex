
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Star, CreditCard, Wallet, Landmark } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

const features = [
  "Acceso a +500 ejercicios (y creciendo)",
  "Creación de sesiones ilimitadas",
  "Generador de sesiones con IA (próximamente)",
  "Calendario para planificar entrenamientos",
  "Guardado de ejercicios favoritos",
  "Exportación de sesiones a PDF",
  "Soporte técnico prioritario",
];

export default function SuscripcionPage() {
  const { isRegisteredUser } = useAuth();

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <header className="text-center mb-12">
        <Star className="mx-auto h-16 w-16 text-accent mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">
          Desbloquea FutsalDex Pro
        </h1>
        <p className="mt-4 text-lg text-foreground/80 max-w-3xl mx-auto">
          Lleva tu planificación al siguiente nivel. Acceso ilimitado a todas las herramientas, ejercicios y futuras actualizaciones.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Columna Izquierda */}
        <div className="md:col-span-2 bg-primary text-primary-foreground rounded-lg p-8 flex flex-col justify-between shadow-2xl">
          <div>
            <h2 className="text-3xl font-bold font-headline mb-6">Tu Plan Incluye:</h2>
            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-6 w-6 mr-3 mt-0.5 text-green-300 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-8">
             <Image
                src="https://placehold.co/600x400.png"
                width={600}
                height={400}
                alt="Futsal action"
                className="rounded-lg object-cover"
                data-ai-hint="futsal game"
            />
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="md:col-span-3">
          <Card className="shadow-xl mb-6">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-accent">
                Oferta de Lanzamiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">
                19,99€ <span className="text-xl font-normal text-muted-foreground">/ primer año</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Incluye 9,99€ de cuota anual + 10€ de inscripción única.
              </p>
              <p className="mt-4 text-foreground/90">
                Con tu suscripción a FutsalDex Pro, tendrás acceso inmediato a todos los contenidos y herramientas de la plataforma, más todas las actualizaciones y nuevos ejercicios que se publiquen durante los 12 meses de tu suscripción.
              </p>
              {!isRegisteredUser && (
                <Button asChild size="lg" className="w-full mt-6 bg-accent hover:bg-accent/90 text-accent-foreground text-lg">
                  <Link href="/register">
                    ¡Empieza Ahora! <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-primary">
                Renovación Anual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-foreground">
                9,99€ <span className="text-xl font-normal text-muted-foreground">/ años sucesivos</span>
              </p>
               <p className="text-sm text-muted-foreground mt-1">
                Renueva y ahorra el coste de inscripción.
              </p>
              <p className="mt-4 text-foreground/90">
                A partir del segundo año, tu suscripción se renueva por solo 9,99€, manteniendo tu acceso completo a todas las herramientas y contenidos sin interrupciones.
              </p>
               {isRegisteredUser && (
                 <Button size="lg" className="w-full mt-6" disabled>
                    Gestionar Renovación (Próximamente)
                  </Button>
               )}
            </CardContent>
          </Card>

           <Card className="shadow-xl mt-6">
            <CardHeader>
                <CardTitle className="text-2xl font-headline text-primary">
                Formas de Pago
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="text-sm text-foreground/90">
                <p>Para tu comodidad, dispones de diferentes formas de pago.</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Las opciones de pago con Tarjeta y PayPal son <strong>inmediatas</strong>.</li>
                    <li>Con la opción de pago mediante transferencia bancaria recibirás el acceso en <strong>menos de 24 horas</strong>.</li>
                </ul>
                 <p className="mt-2">Cualquier duda o consulta, puedes escribirnos a <strong className="text-accent">suscripciones@futsaldex.com</strong></p>
                </div>
                <div className="space-y-3 pt-2">
                    <div className="flex items-center">
                        <CreditCard className="h-6 w-6 mr-3 text-primary" />
                        <span className="font-medium">Tarjeta de Crédito o Débito</span>
                    </div>
                     <div className="flex items-center">
                        <Wallet className="h-6 w-6 mr-3 text-primary" />
                        <span className="font-medium">PayPal</span>
                    </div>
                    <div className="flex items-center">
                        <Landmark className="h-6 w-6 mr-3 text-primary" />
                        <span className="font-medium">Transferencia Bancaria</span>
                    </div>
                </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
