
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, TrendingUp, BookOpen, Repeat, Trophy, Goal, Shield, Square, TrendingDown, ClipboardList, AlertTriangle, ShieldAlert, Info, Handshake } from 'lucide-react';
import Link from 'next/link';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface RosterPlayer {
  id: string;
  dorsal: string;
  nombre: string;
}

interface MatchDataPlayer {
    dorsal: string;
    goals?: number;
    yellowCards?: number;
    redCards?: number;
    faltas?: number;
}

interface FullStats {
  generalStats: {
    numEjerciciosUtilizados: number;
    ejercicioMasUtilizado: string;
    numSesiones: number;
    numPartidos: number;
    partidosGanados: number;
    partidosPerdidos: number;
    partidosEmpatados: number;
    golesFavor: number;
    golesContra: number;
  };
  leaderStats: {
    goles: { name: string; value: number };
    amarillas: { name: string; value: number };
    rojas: { name: string; value: number };
    faltas: { name: string; value: number };
  };
}


const guestDemoStats: FullStats = {
    generalStats: {
        numEjerciciosUtilizados: 23,
        ejercicioMasUtilizado: "Rondo 4 vs 2",
        numSesiones: 5,
        numPartidos: 4,
        partidosGanados: 2,
        partidosPerdidos: 1,
        partidosEmpatados: 1,
        golesFavor: 14,
        golesContra: 9,
    },
    leaderStats: {
        goles: { name: 'C. Ruiz', value: 15 },
        amarillas: { name: 'M. Pérez', value: 2 },
        rojas: { name: 'N/A', value: 0 },
        faltas: { name: 'J. López', value: 5 },
    }
};


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

const LeaderStatCard = ({ title, playerName, value, icon }: { title: string, playerName: string, value: number, icon: React.ReactNode }) => (
    <Card className="shadow-md text-center">
        <CardHeader className="pb-2">
            <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full mb-2">
                {icon}
            </div>
            <CardTitle className="text-sm font-headline">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-xl font-bold truncate" title={playerName}>{playerName}</p>
            <p className="text-lg font-semibold text-muted-foreground">{value}</p>
        </CardContent>
    </Card>
);


function EstadisticasGeneralesContent() {
    const { user, isRegisteredUser } = useAuth();
    const [stats, setStats] = useState<FullStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const calculateStats = useCallback(async () => {
        if (!user) {
            setStats(guestDemoStats);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            const db = getFirebaseDb();
            // --- Parallel fetching ---
            const sesionesQuery = query(collection(db, "mis_sesiones"), where("userId", "==", user.uid));
            const partidosQuery = query(collection(db, "partidos_estadisticas"), where("userId", "==", user.uid));
            const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');

            const [sesionesSnapshot, partidosSnapshot, rosterSnap] = await Promise.all([
                getDocs(sesionesQuery),
                getDocs(partidosQuery),
                getDoc(rosterDocRef)
            ]);
            
            // --- Initialize Stats Object ---
            const calculatedStats: FullStats = {
                generalStats: {
                    numEjerciciosUtilizados: 0,
                    ejercicioMasUtilizado: "N/A",
                    numSesiones: sesionesSnapshot.size,
                    numPartidos: partidosSnapshot.size,
                    partidosGanados: 0,
                    partidosPerdidos: 0,
                    partidosEmpatados: 0,
                    golesFavor: 0,
                    golesContra: 0,
                },
                leaderStats: {
                    goles: { name: 'N/A', value: 0 },
                    amarillas: { name: 'N/A', value: 0 },
                    rojas: { name: 'N/A', value: 0 },
                    faltas: { name: 'N/A', value: 0 },
                }
            };
            
            // --- Calculate General Session Stats ---
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
            
            calculatedStats.generalStats.numEjerciciosUtilizados = new Set(totalEjerciciosIds).size;
            totalEjerciciosIds.forEach(id => {
                ejercicioCounts[id] = (ejercicioCounts[id] || 0) + 1;
            });
            if (Object.keys(ejercicioCounts).length > 0) {
                const masUtilizadoId = Object.keys(ejercicioCounts).reduce((a, b) => ejercicioCounts[a] > ejercicioCounts[b] ? a : b);
                const ejercicioDoc = await getDoc(doc(db, "ejercicios_futsal", masUtilizadoId));
                if (ejercicioDoc.exists()) {
                    calculatedStats.generalStats.ejercicioMasUtilizado = ejercicioDoc.data().ejercicio || "N/A";
                }
            }

            // --- Calculate General Match Stats ---
            const roster: RosterPlayer[] = rosterSnap.exists() ? (rosterSnap.data().players || []) : [];
            const playerStats: { [dorsal: string]: { goles: number, amarillas: number, rojas: number, faltas: number } } = {};
            roster.forEach(p => {
                playerStats[p.dorsal] = { goles: 0, amarillas: 0, rojas: 0, faltas: 0 };
            });

            partidosSnapshot.forEach(doc => {
                const data = doc.data();
                const myGoals = data.myTeamPlayers?.reduce((sum: number, p: any) => sum + (p.goals || 0), 0) || 0;
                const opponentGoals = data.opponentPlayers?.reduce((sum: number, p: any) => sum + (p.goals || 0), 0) || 0;

                calculatedStats.generalStats.golesFavor += myGoals;
                calculatedStats.generalStats.golesContra += opponentGoals;
                
                if (myGoals > opponentGoals) calculatedStats.generalStats.partidosGanados++;
                else if (myGoals < opponentGoals) calculatedStats.generalStats.partidosPerdidos++;
                else calculatedStats.generalStats.partidosEmpatados++;
                
                data.myTeamPlayers?.forEach((p: MatchDataPlayer) => {
                    if (playerStats[p.dorsal]) {
                        playerStats[p.dorsal].goles += p.goals || 0;
                        playerStats[p.dorsal].amarillas += p.yellowCards || 0;
                        playerStats[p.dorsal].rojas += p.redCards || 0;
                        playerStats[p.dorsal].faltas += p.faltas || 0;
                    }
                });
            });

            // --- Calculate Leader Stats ---
            const findLeader = (stat: keyof typeof playerStats['dorsal']) => {
                let maxVal = 0;
                let leaderDorsal = '';
                for (const dorsal in playerStats) {
                    if (playerStats[dorsal][stat] > maxVal) {
                        maxVal = playerStats[dorsal][stat];
                        leaderDorsal = dorsal;
                    }
                }
                const leader = roster.find(p => p.dorsal === leaderDorsal);
                return { name: maxVal > 0 ? (leader?.nombre || `Dorsal ${leaderDorsal}`) : 'N/A', value: maxVal };
            };
            
            calculatedStats.leaderStats.goles = findLeader('goles');
            calculatedStats.leaderStats.amarillas = findLeader('amarillas');
            calculatedStats.leaderStats.rojas = findLeader('rojas');
            calculatedStats.leaderStats.faltas = findLeader('faltas');

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
    
    if (!stats) {
        return (
            <div className="text-center py-12">
                <p>No se pudieron cargar las estadísticas.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

            {!isRegisteredUser && (
                <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
                    <Info className="h-4 w-4 text-blue-700" />
                    <AlertTitle className="text-blue-800 font-semibold">Modo de Demostración</AlertTitle>
                    <AlertDescription>
                        Estás viendo estadísticas de ejemplo. Para ver las de tu propio equipo, por favor{" "}
                        <Link href="/register" className="font-bold underline">regístrate</Link> o{" "}
                        <Link href="/login" className="font-bold underline">inicia sesión</Link>.
                    </AlertDescription>
                </Alert>
            )}

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-xl font-headline">Resumen General</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <StatCard title="Ejercicios Utilizados" value={stats.generalStats.numEjerciciosUtilizados} icon={<BookOpen className="h-6 w-6"/>} />
                    <StatCard title="Ejercicio Más Utilizado" value={stats.generalStats.ejercicioMasUtilizado} icon={<Repeat className="h-6 w-6"/>} isText />
                    <StatCard title="Sesiones Creadas" value={stats.generalStats.numSesiones} icon={<ClipboardList className="h-6 w-6"/>} />
                    <StatCard title="Partidos Jugados" value={stats.generalStats.numPartidos} icon={<Trophy className="h-6 w-6"/>} />
                    <StatCard title="Partidos Ganados" value={stats.generalStats.partidosGanados} icon={<TrendingUp className="h-6 w-6"/>} />
                    <StatCard title="Partidos Empatados" value={stats.generalStats.partidosEmpatados} icon={<Handshake className="h-6 w-6"/>} />
                    <StatCard title="Partidos Perdidos" value={stats.generalStats.partidosPerdidos} icon={<TrendingDown className="h-6 w-6"/>} />
                    <StatCard title="Goles a Favor" value={stats.generalStats.golesFavor} icon={<Goal className="h-6 w-6"/>} />
                    <StatCard title="Goles en Contra" value={stats.generalStats.golesContra} icon={<Shield className="h-6 w-6"/>} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-headline">Jugadores Destacados</CardTitle>
                    <CardDescription>Resumen de los líderes estadísticos de la temporada.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <LeaderStatCard title="Máximo Goleador" playerName={stats.leaderStats.goles.name} value={stats.leaderStats.goles.value} icon={<Trophy className="h-6 w-6"/>} />
                    <LeaderStatCard title="Más Tarjetas Amarillas" playerName={stats.leaderStats.amarillas.name} value={stats.leaderStats.amarillas.value} icon={<Square className="h-6 w-6 text-yellow-500 fill-yellow-400"/>} />
                    <LeaderStatCard title="Más Tarjetas Rojas" playerName={stats.leaderStats.rojas.name} value={stats.leaderStats.rojas.value} icon={<Square className="h-6 w-6 text-red-600 fill-red-500"/>} />
                    <LeaderStatCard title="Más Faltas Cometidas" playerName={stats.leaderStats.faltas.name} value={stats.leaderStats.faltas.value} icon={<ShieldAlert className="h-6 w-6"/>} />
                </CardContent>
            </Card>

        </div>
    );
}


export default function EstadisticasGeneralesPage() {
    return (
        <EstadisticasGeneralesContent />
    );
}
