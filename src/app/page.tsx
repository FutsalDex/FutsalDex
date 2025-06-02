
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-12 md:px-6 md:py-16 lg:py-24">
      <div className="flex flex-col items-center text-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-6 text-primary">
          <path d="M12 1.6a10.4 10.4 0 1 0 0 20.8 10.4 10.4 0 0 0 0-20.8z"/>
          <path d="M12 1.6a10.4 10.4 0 0 0-7.35 3.05M12 1.6a10.4 10.4 0 0 1 7.35 3.05M1.6 12a10.4 10.4 0 0 0 3.05 7.35M1.6 12a10.4 10.4 0 0 1 3.05-7.35M22.4 12a10.4 10.4 0 0 0-3.05-7.35M22.4 12a10.4 10.4 0 0 1-3.05 7.35M12 22.4a10.4 10.4 0 0 0 7.35-3.05M12 22.4a10.4 10.4 0 0 1-7.35-3.05"/>
          <path d="M5.75 5.75l3.5 3.5M14.75 5.75l-3.5 3.5M5.75 14.75l3.5-3.5M14.75 14.75l-3.5-3.5"/>
        </svg>
        <h1 className="mb-4 text-4xl font-bold tracking-tight text-primary md:text-5xl lg:text-6xl font-headline">
          ¡Bienvenido a FutsalDex!
        </h1>
        <p className="mb-8 max-w-2xl text-lg text-foreground/80 md:text-xl">
          Tu compañero definitivo para el entrenamiento de fútbol sala. Descubre ejercicios, obtén planes de entrenamiento con IA y eleva tu juego al siguiente nivel.
        </p>
        
        <Card className="w-full max-w-lg bg-background shadow-xl border-accent border-2">
          <CardHeader>
            <CardTitle className="text-accent font-headline text-2xl">¡Potencia Tu Entrenamiento!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-md text-foreground/90">
              Regístrate para poder acceder a más de 500 ejercicios y crear tus sesiones de entrenamientos ilimitadas.
            </p>
            <Button asChild size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/register">
                Regístrate Ahora <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
             <Button asChild variant="outline" size="lg" className="w-full">
              <Link href="/ejercicios">
                Explorar Ejercicios
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Biblioteca Extensa"
            description="Accede a cientos de ejercicios detallados para todas las edades y niveles."
            imageUrl="https://placehold.co/600x400.png"
            imageHint="exercise library"
          />
          <FeatureCard
            title="IA Inteligente"
            description="Crea sesiones de entrenamiento personalizadas con nuestra avanzada IA."
            imageUrl="https://placehold.co/600x400.png"
            imageHint="artificial intelligence"
          />
          <FeatureCard
            title="Organiza Tus Sesiones"
            description="Guarda y gestiona todas tus sesiones de entrenamiento en un solo lugar."
            imageUrl="https://placehold.co/600x400.png"
            imageHint="training schedule"
          />
        </div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  imageUrl: string;
  imageHint: string;
}

function FeatureCard({ title, description, imageUrl, imageHint }: FeatureCardProps) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-xl">
      <img src={imageUrl} alt={title} data-ai-hint={imageHint} width={600} height={400} className="h-48 w-full object-cover"/>
      <CardHeader>
        <CardTitle className="font-headline text-xl text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground/70">{description}</p>
      </CardContent>
    </Card>
  );
}
