import { db } from "@/db/firebase"; // Ajusta la ruta si tu archivo de inicialización de Firebase está en otro lugar
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Lock, BookOpen, Users, Bot } from "lucide-react";

// --- MEJORA 1: Datos de las características definidos en un array ---
const features = [
  {
    icon: <BookOpen className="h-6 w-6"/>,
    title: "Planificación de Sesiones",
    description: "Navega por una biblioteca con más de 500 ejercicios. Guarda, gestiona y exporta tus sesiones de entrenamiento en PDF."
  },
  {
    icon: <Users className="h-6 w-6"/>,
    title: "Gestión Integral del Equipo",
    description: "Controla cada aspecto de tu plantilla. Registra jugadores, monitoriza la asistencia a los entrenamientos y lleva un seguimiento de las estadísticas de cada partido."
  },
  {
    icon: <Bot className="h-6 w-6"/>,
    title: "Análisis y Soporte Inteligente",
    description: "Visualiza el progreso con un calendario y un panel de estadísticas. ¿Tienes dudas? Chatea con nuestro Entrenador IA para obtener respuestas al instante."
  }
];

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:py-24">
      <div className="flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-primary font-headline mb-4">
          FutsalDex
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
                  Suscríbete a uno de los planes para acceder al catálogo completo de ejercicios y desbloquear las herramientas avanzadas de gestión de equipos.
                </p>
                <Button asChild size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Link href="/suscripcion">
                    Ver Planes <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* --- MEJORA 2: Coherencia de estilos en el borde --- */}
            <Card className="bg-background shadow-xl border-primary/20 border-2">
              <CardHeader>
                <CardTitle className="text-primary font-headline text-2xl flex items-center gap-2">
                    <Lock className="text-primary/80"/>
                    Acceso de Invitado
                </CardTitle>
                <CardDescription>
                    ¿Quieres probar antes de suscribirte?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-left">
                <p className="text-md text-foreground/90">
                  Como invitado, puedes:
                </p>
                <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                    <li>Explorar una selección de <strong>15 ejercicios</strong> de nuestra biblioteca.</li>
                    <li>Navegar y visualizar todas las herramientas que te ofrecemos</li>
                    <li>Y si te registras disfruta de <strong>48 horas</strong> de todos los ejercicios y herramientas, antes de decidir tu suscripción</li>
                </ul>
              </CardContent>
            </Card>
        </div>
        
        {/* Main Features Section */}
        <div className="w-full max-w-6xl mx-auto border-t pt-16">
            <h2 className="mb-12 text-3xl font-bold text-center text-primary font-headline">Todo lo que necesitas en un solo lugar</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* --- MEJORA 1: Renderizado de características usando .map() --- */}
                {features.map((feature) => (
                    <FeatureCard
                        key={feature.title}
                        title={feature.title}
                        description={feature.description}
                        icon={feature.icon}
                    />
                ))}
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