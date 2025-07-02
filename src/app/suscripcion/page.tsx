
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Star, CreditCard, Wallet, Landmark, Percent } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { Badge } from "@/components/ui/badge";

const basicFeatures = [
  "Acceso completo a la biblioteca de +500 ejercicios",
  "Filtros avanzados para búsqueda de ejercicios",
  "Exportación de ejercicios individuales a PDF",
  "Guardado de ejercicios 'Favoritos'",
  "Guardado y gestión de 'Mis Sesiones'",
  "Calendario de Equipo integrado",
];

const topFeatures = [
  ...basicFeatures,
  "Gestión de Plantilla y Estadísticas de Jugadores",
  "Control de Asistencia a entrenamientos",
  "Registro y gestión de Partidos y Estadísticas",
  "Dashboard con Estadísticas Generales del equipo",
  "Soporte técnico con Entrenador IA",
];

export default function SuscripcionPage() {
  const { isRegisteredUser } = useAuth();

  return (
    <div className="container mx-auto max-w-6xl py-12 px-4">
      <header className="text-center mb-12">
        <Star className="mx-auto h-16 w-16 text-accent mb-4" />
        <h1 className="text-4xl md:text-5xl font-bold text-primary font-headline">
          Elige tu Plan FutsalDex
        </h1>
        <p className="mt-4 text-lg text-foreground/80 max-w-3xl mx-auto">
          Acceso anual a todas las herramientas que necesitas para llevar tu equipo al siguiente nivel. Escoge el plan que mejor se adapte a ti.
        </p>
      </header>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Basic Plan */}
        <Card className="flex flex-col shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-headline text-primary">
              Suscripción Básica
            </CardTitle>
            <CardDescription>Perfecto para explorar y utilizar nuestra extensa biblioteca de ejercicios.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-foreground">
                0,99€
                <span className="text-xl font-normal text-muted-foreground">/mes</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Facturado anualmente (11,88€/año)
              </p>
            </div>
            <ul className="space-y-3 text-sm">
              {basicFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 text-green-500 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg">
              <Link href={isRegisteredUser ? "#" : "/register"}>
                {isRegisteredUser ? "Seleccionar Plan" : "Empezar con Básica"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Top Plan */}
        <Card className="flex flex-col shadow-xl border-accent border-2 relative">
           <Badge variant="default" className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">
            Más Popular
          </Badge>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-headline text-accent">
              Suscripción Top
            </CardTitle>
            <CardDescription>La experiencia completa con herramientas de planificación y análisis de equipo.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow space-y-6">
             <div className="text-center">
              <p className="text-4xl font-bold text-foreground">
                1,99€
                <span className="text-xl font-normal text-muted-foreground">/mes</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Facturado anualmente (23,88€/año)
              </p>
            </div>
             <ul className="space-y-3 text-sm">
              {topFeatures.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 mt-0.5 text-green-500 shrink-0" />
                  <span className={!basicFeatures.includes(feature) ? 'font-bold text-accent' : ''}>{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <Button asChild size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg">
              <Link href={isRegisteredUser ? "#" : "/register"}>
                {isRegisteredUser ? "Seleccionar Plan Top" : "Empezar con Top"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Discount Section */}
       <Card className="shadow-lg mt-12 bg-primary/5 border-primary/20">
        <CardHeader className="text-center">
            <Percent className="mx-auto h-10 w-10 text-primary mb-2" />
            <CardTitle className="text-2xl font-headline text-primary">
            ¡Oferta Especial 2025!
            </CardTitle>
        </CardHeader>
        <CardContent className="text-center max-w-2xl mx-auto">
            <p className="text-foreground/90">
                Durante todo el 2025, disfruta de un <strong className="text-primary">descuento del 50%</strong> en tu primer año de suscripción, tanto en el plan Básico como en el Top.
            </p>
             <p className="mt-4">
                Usa el código <code className="font-bold bg-primary/20 text-primary p-1 rounded-md">futsaldex25</code> al momento de pagar para aplicar la bonificación.
            </p>
            <div className="mt-4 text-sm text-muted-foreground">
                <p>Plan Básico por solo <strong>5,94€/año</strong>. Plan Top por solo <strong>11,94€/año</strong>.</p>
            </div>
        </CardContent>
      </Card>


      {/* Payment methods - kept from before */}
      <Card className="shadow-xl mt-12">
        <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">
            Formas de Pago
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="text-sm text-foreground/90">
            <p>Elige el método de pago que prefieras. Ofrecemos varias opciones para tu comodidad.</p>
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
  );
}
