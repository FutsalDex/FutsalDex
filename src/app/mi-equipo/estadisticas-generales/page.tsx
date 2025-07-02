
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, TrendingUp, BookOpen, Repeat, Trophy, Goal, Shield, Square, TrendingDown, ClipboardList, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface Stats {
  numEjerciciosUtilizados: number;
  ejercicioMasUtilizado: string;
  numSesiones: number;
  numPartidos: number;
  partidosGanados: number;
  partidosPerdidos: number;
  golesFavor: number;
  golesContra: number;
  faltasCometidas: number;
  faltasRecibidas: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
}

const StatCard = ({ title, value, icon, isText = false }: { title: string, value: string | number, icon: React.ReactNode, isText?: boolean }) => (
    <Card className="shadow-md text-center">
        <CardHeader className="pb-2">
            <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full mb-2">
                {icon}
            </div>
            <CardTitle className="text-lg font-headline">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className={cn(isText ? "text-xl truncate" : "text-3xl", "font-bold")} title={isText ? String(value) : undefined}>
                {value}
            </p>
        </CardContent>
    </Card>
);


function EstadisticasGeneralesContent() {
    const { user, isRegisteredUser } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const calculateStats = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            const sesionesQuery = query(collection(db, "mis_sesiones"), where("userId", "==", user.uid));
            const partidosQuery = query(collection(db, "partidos_estadisticas"), where("userId", "==", user.uid));
            
            const [sesionesSnapshot, partidosSnapshot] = await Promise.all([
                getDocs(sesionesQuery),
                getDocs(partidosQuery)
            ]);
            
            const calculatedStats: Stats = {
                numEjerciciosUtilizados: 0,
                ejercicioMasUtilizado: "N/A",
                numSesiones: sesionesSnapshot.size,
                numPartidos: partidosSnapshot.size,
                partidosGanados: 0,
                partidosPerdidos: 0,
                golesFavor: 0,
                golesContra: 0,
                faltasCometidas: 0,
                faltasRecibidas: 0,
                tarjetasAmarillas: 0,
                tarjetasRojas: 0,
            };

            // Calculate session stats
            const ejercicioCounts: { [key: string]: number } = {};
            let totalEjerciciosIds: string[] = [];

            sesionesSnapshot.forEach(doc => {
                const data = doc.data();
                if (data.type === "Manual") {
                    if (data.warmUp?.id) totalEjerciciosIds.push(data.warmUp.id);
                    if (data.coolDown?.id) totalEjerciciosIds.push(data.coolDown.id);
                    if (Array.isArray(data.mainExercises)) {
                        data.mainExercises.forEach((ex: any) => {
                            if (ex?.id) totalEjerciciosIds.push(ex.id);
                        });
                    }
                }
            });
            
            calculatedStats.numEjerciciosUtilizados = new Set(totalEjerciciosIds).size;

            totalEjerciciosIds.forEach(id => {
                ejercicioCounts[id] = (ejercicioCounts[id] || 0) + 1;
            });

            if (Object.keys(ejercicioCounts).length > 0) {
                const masUtilizadoId = Object.keys(ejercicioCounts).reduce((a, b) => ejercicioCounts[a] > ejercicioCounts[b] ? a : b);
                const ejercicioDoc = await getDoc(doc(db, "ejercicios_futsal", masUtilizadoId));
                if (ejercicioDoc.exists()) {
                    calculatedStats.ejercicioMasUtilizado = ejercicioDoc.data().ejercicio || "N/A";
                }
            }
            
            // Calculate match stats
            partidosSnapshot.forEach(doc => {
                const data = doc.data();
                const myGoals = data.myTeamPlayers?.reduce((sum: number, p: any) => sum + (p.goals || 0), 0) || 0;
                const opponentGoals = data.opponentPlayers?.reduce((sum: number, p: any) => sum + (p.goals || 0), 0) || 0;

                calculatedStats.golesFavor += myGoals;
                calculatedStats.golesContra += opponentGoals;
                
                if (myGoals > opponentGoals) calculatedStats.partidosGanados++;
                if (myGoals < opponentGoals) calculatedStats.partidosPerdidos++;
                
                calculatedStats.faltasCometidas += data.myTeamPlayers?.reduce((sum: number, p: any) => sum + (p.faltas || 0), 0) || 0;
                calculatedStats.faltasRecibidas += data.opponentPlayers?.reduce((sum: number, p: any) => sum + (p.faltas || 0), 0) || 0;
                
                calculatedStats.tarjetasAmarillas += data.myTeamPlayers?.reduce((sum: number, p: any) => sum + (p.yellowCards || 0), 0) || 0;
                calculatedStats.tarjetasRojas += data.myTeamPlayers?.reduce((sum: number, p: any) => sum + (p.redCards || 0), 0) || 0;
            });

            setStats(calculatedStats);
        } catch (error) {
            console.error("Error calculating stats:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        calculateStats();
    }, [calculateStats]);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!isRegisteredUser) {
        return (
            <div className="container mx-auto px-4 py-8 md:px-6">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                            <TrendingUp className="mr-3 h-8 w-8" />
                            Mis Estadísticas Generales
                        </h1>
                        <p className="text-lg text-foreground/80">
                            Un resumen de tu actividad y el rendimiento de tu equipo.
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/mi-equipo">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Panel
                        </Link>
                    </Button>
                </header>
                <Alert variant="default" className="bg-accent/10 border-accent">
                    <Info className="h-5 w-5 text-accent" />
                    <AlertTitle className="font-headline text-accent">Función para Usuarios Registrados</AlertTitle>
                    <AlertDescription className="text-accent/90">
                        Para ver tus estadísticas, necesitas una cuenta. Las estadísticas se calculan a partir de tus sesiones y partidos guardados.{" "}
                        <Link href="/register" className="font-bold underline hover:text-accent/70">
                            Regístrate
                        </Link> para empezar.
                    </AlertDescription>
                </Alert>
            </div>
        )
    }

    if (!stats) {
        return (
            <div className="text-center py-12">
                <p>No se pudieron cargar las estadísticas.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                        <TrendingUp className="mr-3 h-8 w-8" />
                        Mis Estadísticas Generales
                    </h1>
                    <p className="text-lg text-foreground/80">
                        Un resumen de tu actividad y el rendimiento de tu equipo.
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/mi-equipo">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel
                    </Link>
                </Button>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                <StatCard title="Ejercicios Utilizados" value={stats.numEjerciciosUtilizados} icon={<BookOpen className="h-6 w-6"/>} />
                <StatCard title="Ejercicio Más Utilizado" value={stats.ejercicioMasUtilizado} icon={<Repeat className="h-6 w-6"/>} isText />
                <StatCard title="Sesiones Creadas" value={stats.numSesiones} icon={<ClipboardList className="h-6 w-6"/>} />
                <StatCard title="Partidos Jugados" value={stats.numPartidos} icon={<Trophy className="h-6 w-6"/>} />
                <StatCard title="Partidos Ganados" value={stats.partidosGanados} icon={<TrendingUp className="h-6 w-6"/>} />
                <StatCard title="Partidos Perdidos" value={stats.partidosPerdidos} icon={<TrendingDown className="h-6 w-6"/>} />
                <StatCard title="Goles a Favor" value={stats.golesFavor} icon={<Goal className="h-6 w-6"/>} />
                <StatCard title="Goles en Contra" value={stats.golesContra} icon={<Shield className="h-6 w-6"/>} />
                <StatCard title="Faltas Cometidas" value={stats.faltasCometidas} icon={<AlertTriangle className="h-6 w-6"/>} />
                <StatCard title="Faltas Recibidas" value={stats.faltasRecibidas} icon={<ShieldAlert className="h-6 w-6"/>} />
                <StatCard title="Tarjetas Amarillas" value={stats.tarjetasAmarillas} icon={<Square className="h-6 w-6 text-yellow-500 fill-yellow-400"/>} />
                <StatCard title="Tarjetas Rojas" value={stats.tarjetasRojas} icon={<Square className="h-6 w-6 text-red-600 fill-red-500"/>} />
            </div>
        </div>
    );
}


export default function EstadisticasGeneralesPage() {
    return (
        <EstadisticasGeneralesContent />
    );
}
