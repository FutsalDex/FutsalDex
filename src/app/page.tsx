
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Lock, BookOpen, Users, Bot } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:py-24">
      <div className="flex flex-col items-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-6 text-primary">
          <path d="M12 1.6a10.4 10.4 0 1 0 0 20.8 10.4 10.4 0 0 0 0-20.8z"/>
          <path d="M12 1.6a10.4 10.4 0 0 0-7.35 3.05M12 1.6a10.4 10.4 0 0 1 7.35 3.05M1.6 12a10.4 10.4 0 0 0 3.05 7.35M1.6 12a10.4 10.4 0 0 1 3.05-7.35M22.4 12a10.4 10.4 0 0 0-3.05-7.35M22.4 12a10.4 10.4 0 0 1-3.05 7.35M12 22.4a10.4 10.4 0 0 0 7.35-3.05M12 22.4a10.4 10.4 0 0 1-7.35-3.05"/>
          <path d="M5.75 5.75l3.5 3.5M14.75 5.75l-3.5 3.5M5.75 14.75l-3.5-3.5M14.75 14.75l-3.5-3.5"/>
        </svg>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary md:text-5xl lg:text-6xl font-headline">
          ¡Bienvenido a FutsalDex!
        </h1>
        <p className="mb-8 max-w-3xl text-lg text-foreground/80 md:text-xl">
          Tu compañero definitivo para el entrenamiento de fútbol sala. Descubre cientos de ejercicios, diseña sesiones de entrenamientos, gestiona tu equipo y analiza su rendimiento.
        </p>

        {/* CTA Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-16">
            <Card className="bg-background shadow-xl border-accent border-2">
              <CardHeader>
                <CardTitle className="text-accent font-headline text-2xl">¡Potencia Tu Entrenamiento!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-md text-foreground/90">
                  Subscríbete a uno de los planes para acceder al catálogo completo de ejercicios y desbloquear las herramientas avanzadas de gestión de equipos.
                </p>
                <Button asChild size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/suscripcion">
                    Ver Planes <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-background shadow-xl border-blue-200 border-2">
              <CardHeader>
                <CardTitle className="text-primary font-headline text-2xl flex items-center gap-2">
                    <Lock className="text-primary/80"/>
                    Acceso de Invitado
                </CardTitle>
                <CardDescription>
                    ¿Quieres probar antes de registrarte?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                <p className="text-md text-foreground/90">
                  Como invitado, puedes:
                </p>
                <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                    <li>Explorar una selección de <strong>15 ejercicios</strong> de nuestra biblioteca.</li>
                    <li>Diseñar hasta <strong>2 sesiones de entrenamiento</strong> para ver cómo funciona.</li>
                </ul>
                 <p className="text-sm text-foreground/90 pt-2">
                    ¡Regístrate para desbloquear todo el contenido y guardar tu progreso!
                </p>
              </CardContent>
            </Card>
        </div>
        
        {/* Main Features Section */}
        <div className="w-full max-w-6xl mx-auto border-t pt-16">
            <h2 className="mb-12 text-3xl font-bold text-center text-primary font-headline">Todo lo que necesitas en un solo lugar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <FeatureCard
                    title="Planificación de Sesiones"
                    description="Navega por una biblioteca con más de 500 ejercicios o deja que nuestra IA diseñe entrenamientos personalizados. Guarda, gestiona y exporta tus sesiones en PDF."
                    icon={<BookOpen className="h-6 w-6"/>}
                />
                 <FeatureCard
                    title="Gestión Integral del Equipo"
                    description="Controla cada aspecto de tu plantilla. Registra jugadores, monitoriza la asistencia a los entrenamientos y lleva un seguimiento de las estadísticas de cada partido."
                    icon={<Users className="h-6 w-6"/>}
                />
                 <FeatureCard
                    title="Análisis y Soporte Inteligente"
                    description="Visualiza el progreso con un calendario y un panel de estadísticas. ¿Tienes dudas? Chatea con nuestro Entrenador IA para obtener respuestas al instante."
                    icon={<Bot className="h-6 w-6"/>}
                />
            </div>
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

function FeatureCard({ title, description, icon }: FeatureCardProps) {
    return (
        <div className="flex flex-col items-center text-center p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
            </div>
            <h3 className="mb-2 text-xl font-bold font-headline text-primary">{title}</h3>
            <p className="text-foreground/80">{description}</p>
        </div>
    );
}
