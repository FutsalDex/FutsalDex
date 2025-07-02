"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, Edit3 } from "lucide-react";
import Link from "next/link";

export default function CrearSesionHubPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Elige cómo quieres crear tu sesión</h1>
        <p className="text-lg text-foreground/80 max-w-3xl mx-auto">
          Tienes dos opciones para planificar tu entrenamiento: constrúyelo tú mismo con nuestra biblioteca o deja que la inteligencia artificial lo haga por ti.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-primary flex items-center">
              <Edit3 className="mr-3 h-6 w-6" />
              Creación Manual
            </CardTitle>
            <CardDescription>
              Construye tu sesión paso a paso, seleccionando ejercicios de calentamiento, principales y de vuelta a la calma desde nuestra extensa biblioteca. Control total para el entrenador detallista.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow" />
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/crear-sesion-manual">
                Crear Manualmente
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow border-accent border-2">
          <CardHeader>
            <CardTitle className="font-headline text-2xl text-accent flex items-center">
              <Bot className="mr-3 h-6 w-6" />
              Creación con IA
            </CardTitle>
            <CardDescription>
              Ahorra tiempo y obtén nuevas ideas. Describe los objetivos de tu sesión, las características de tu equipo y deja que FutsalDex AI genere un plan de entrenamiento completo y coherente para ti.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow" />
          <CardFooter>
            <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/crear-sesion-ia">
                Crear con IA
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
