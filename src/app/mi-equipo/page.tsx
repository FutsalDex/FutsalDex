
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, BarChart2, BookUser, CalendarDays, ArrowRight, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";

const featureCards = [
    {
        title: "Mi Plantilla",
        description: "Gestiona la plantilla de tu equipo, añade jugadores y consulta sus estadísticas de la temporada.",
        href: "/mi-equipo/plantilla",
        icon: Users,
    },
    {
        title: "Mis Estadísticas",
        description: "Registra las estadísticas de tus partidos en tiempo real para un análisis detallado del rendimiento.",
        href: "/estadisticas",
        icon: BarChart2,
    },
    {
        title: "Mis Sesiones",
        description: "Encuentra y organiza todas las sesiones de entrenamiento que has creado manualmente.",
        href: "/mis-sesiones",
        icon: BookUser,
    },
    {
        title: "Mi Calendario",
        description: "Visualiza todas tus sesiones de entrenamiento programadas en un calendario interactivo.",
        href: "/calendario",
        icon: CalendarDays,
    },
    {
        title: "Soporte Técnico",
        description: "Chatea con nuestro entrenador (AI) configurado para darte respuesta sobre cualquier duda sobre ejercicios, sesiones, etc.",
        href: "/soporte",
        icon: LifeBuoy,
    },
];

function MiEquipoDashboardContent() {
    const { user } = useAuth();
    
    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <header className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Panel de Mi Equipo</h1>
                <p className="text-lg text-foreground/80">
                    Bienvenido, {user?.email}. Aquí tienes el centro de mando para tu equipo.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {featureCards.map((card) => (
                    <Card key={card.href} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-headline text-2xl text-primary flex items-center">
                                <card.icon className="mr-3 h-6 w-6" />
                                {card.title}
                            </CardTitle>
                            <CardDescription>{card.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow" />
                        <CardFooter>
                            <Button asChild className="w-full">
                                <Link href={card.href}>
                                    Ir a {card.title}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default function MiEquipoPage() {
    return (
        <AuthGuard>
            <SubscriptionGuard>
                <MiEquipoDashboardContent />
            </SubscriptionGuard>
        </AuthGuard>
    );
}
