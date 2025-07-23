
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, TrendingUp, Trophy, Goal, Shield, ShieldAlert, Handshake, TrendingDown, Info, Target, Repeat, Shuffle, Eye } from 'lucide-react';
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

interface GoalEvent {
  minute: number;
  second: number;
  half: 'firstHalf' | 'secondHalf';
  id: string;
}

interface MatchDataPlayer {
    dorsal: string;
    goals: GoalEvent[];
    yellowCards?: number;
    redCards?: number;
    faltas?: number;
}

interface HalfStats {
  firstHalf: number;
  secondHalf: number;
}

interface TeamStats {
  shots: {
    onTarget: HalfStats;
    offTarget: HalfStats;
    blocked: HalfStats;
  };
  turnovers: HalfStats;
  steals: HalfStats;
  timeouts: HalfStats;
  faltas: HalfStats;
}

interface PageViewData {
    [key: string]: number;
}

const guestDemoStats = {
    generalStats: {
        numPartidos: 4,
        partidosGanados: 2,
        partidosPerdidos: 1,
        partidosEmpatados: 1,
        golesFavor: 14,
        golesContra: 9,
        golesFavor1T: 8,
        golesFavor2T: 6,
        golesContra1T: 4,
        golesContra2T: 5,
        faltasCometidas: 28,
        tirosAPuerta: 45,
        tirosFuera: 20,
        tirosBloqueados: 13,
        perdidasTotales: 55,
        robosTotales: 42,
    },
    leaderStats: {
        goles: { name: 'C. Ruiz', value: 15 },
        amarillas: { name: 'M. Pérez', value: 2 },
        rojas: { name: 'N/A', value: 0 },
        faltas: { name: 'J. López', value: 5 },
    },
    topPages: [
        { name: 'Ver ejercicios', count: 25 },
        { name: 'Mi Equipo', count: 18 },
        { name: 'Crear Sesión', count: 12 },
    ]
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

// Map sanitized path keys back to user-friendly names
const mapPathToName = (pathKey: string): string => {
    const mappings: Record<string, string> = {
        'home': 'Página Principal',
        'ejercicios': 'Ver ejercicios',
        'crear-sesion': 'Crear Sesión Manual',
        'crear-sesion-ia': 'Crear Sesión con IA',
        'mi-equipo': 'Panel de Mi Equipo',
        'mi-equipo_plantilla': 'Mi Plantilla',
        'mi-equipo_asistencia': 'Control de Asistencia',
        'estadisticas_historial': 'Historial de Partidos',
        'mis-sesiones': 'Mis Sesiones',
        'favoritos': 'Favoritos',
        'suscripcion': 'Suscripción',
        'soporte': 'Soporte con IA',
        'perfil': 'Perfil de Usuario',
        'admin': 'Panel de Admin',
    };
    // Attempt to match more specific paths first, e.g., 'mi-equipo_plantilla' before 'mi-equipo'
    const sortedKeys = Object.keys(mappings).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (pathKey.startsWith(key)) {
            return mappings[key];
        }
    }
    return pathKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Default formatting
};


function EstadisticasGeneralesContent() {
    const { user, isRegisteredUser, isAdmin } = useAuth();
    const [stats, setStats] = useState<typeof guestDemoStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const calculateStats = useCallback(async () => {
        if (!isRegisteredUser || !user) {
            setStats(guestDemoStats);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);

        try {
            const db = getFirebaseDb();
            const today = new Date().toISOString().split('T')[0];
            const partidosQuery = query(
                collection(db, "partidos_estadisticas"), 
                where("userId", "==", user.uid),
                where("fecha", "<=", today)
            );
            const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');
            
            const promises = [
                getDocs(partidosQuery),
                getDoc(rosterDocRef)
            ];

            // Only fetch page views if the user is an admin
            if (isAdmin) {
                const pageViewsQuery = query(collection(db, "user_page_views"));
                promises.push(getDocs(pageViewsQuery));
            }

            const [partidosSnapshot, rosterSnap, pageViewsSnapshot] = await Promise.all(promises);
            
            const calculatedStats = {
                generalStats: {
                    numPartidos: partidosSnapshot.size,
                    partidosGanados: 0,
                    partidosPerdidos: 0,
                    partidosEmpatados: 0,
                    golesFavor: 0,
                    golesContra: 0,
                    golesFavor1T: 0,
                    golesFavor2T: 0,
                    golesContra1T: 0,
                    golesContra2T: 0,
                    faltasCometidas: 0,
                    tirosAPuerta: 0,
                    tirosFuera: 0,
                    tirosBloqueados: 0,
                    perdidasTotales: 0,
                    robosTotales: 0,
                },
                leaderStats: {
                    goles: { name: 'N/A', value: 0 },
                    amarillas: { name: 'N/A', value: 0 },
                    rojas: { name: 'N/A', value: 0 },
                    faltas: { name: 'N/A', value: 0 },
                },
                topPages: [] as { name: string, count: number }[]
            };

            const roster: RosterPlayer[] = rosterSnap.exists() ? (rosterSnap.data().players || []) : [];
            const playerStats: { [dorsal: string]: { goles: number, amarillas: number, rojas: number, faltas: number } } = {};
            roster.forEach(p => {
                playerStats[p.dorsal] = { goles: 0, amarillas: 0, rojas: 0, faltas: 0 };
            });

            partidosSnapshot.forEach(doc => {
                const data = doc.data();
                
                const myGoalsEvents = data.myTeamPlayers?.flatMap((p: MatchDataPlayer) => p.goals || []) || [];
                const opponentGoalsEvents = data.opponentPlayers?.flatMap((p: MatchDataPlayer) => p.goals || []) || [];

                const myGoals = myGoalsEvents.length;
                const opponentGoals = opponentGoalsEvents.length;

                calculatedStats.generalStats.golesFavor += myGoals;
                calculatedStats.generalStats.golesContra += opponentGoals;
                
                myGoalsEvents.forEach((goal: GoalEvent) => {
                    if (goal.half === 'firstHalf') calculatedStats.generalStats.golesFavor1T++;
                    else calculatedStats.generalStats.golesFavor2T++;
                });

                opponentGoalsEvents.forEach((goal: GoalEvent) => {
                    if (goal.half === 'firstHalf') calculatedStats.generalStats.golesContra1T++;
                    else calculatedStats.generalStats.golesContra2T++;
                });
                
                if (myGoals > opponentGoals) calculatedStats.generalStats.partidosGanados++;
                else if (myGoals < opponentGoals) calculatedStats.generalStats.partidosPerdidos++;
                else calculatedStats.generalStats.partidosEmpatados++;
                
                data.myTeamPlayers?.forEach((p: MatchDataPlayer) => {
                    if (playerStats[p.dorsal]) {
                        playerStats[p.dorsal].goles += p.goals?.length || 0;
                        playerStats[p.dorsal].amarillas += p.yellowCards || 0;
                        playerStats[p.dorsal].rojas += p.redCards || 0;
                        playerStats[p.dorsal].faltas += p.faltas || 0;
                    }
                });

                const myTeamStats = data.myTeamStats as TeamStats | undefined;
                if (myTeamStats) {
                    calculatedStats.generalStats.faltasCometidas += (myTeamStats.faltas?.firstHalf || 0) + (myTeamStats.faltas?.secondHalf || 0);
                    calculatedStats.generalStats.tirosAPuerta += (myTeamStats.shots?.onTarget.firstHalf || 0) + (myTeamStats.shots?.onTarget.secondHalf || 0);
                    calculatedStats.generalStats.tirosFuera += (myTeamStats.shots?.offTarget.firstHalf || 0) + (myTeamStats.shots?.offTarget.secondHalf || 0);
                    calculatedStats.generalStats.tirosBloqueados += (myTeamStats.shots?.blocked.firstHalf || 0) + (myTeamStats.shots?.blocked.secondHalf || 0);
                    calculatedStats.generalStats.perdidasTotales += (myTeamStats.turnovers?.firstHalf || 0) + (myTeamStats.turnovers?.secondHalf || 0);
                    calculatedStats.generalStats.robosTotales += (myTeamStats.steals?.firstHalf || 0) + (myTeamStats.steals?.secondHalf || 0);
                }
            });

            // Process page views only if the snapshot exists (i.e., user is admin)
            if (pageViewsSnapshot) {
                const pageCounts: { [key: string]: number } = {};
                pageViewsSnapshot.forEach(doc => {
                    const data = doc.data() as PageViewData;
                    for (const key in data) {
                        if (key !== 'lastVisitedPath' && key !== 'updatedAt') {
                            const pageName = mapPathToName(key);
                            pageCounts[pageName] = (pageCounts[pageName] || 0) + data[key];
                        }
                    }
                });

                calculatedStats.topPages = Object.entries(pageCounts)
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5); // Get top 5
            }

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
    }, [user, isRegisteredUser, isAdmin]);

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

            {isAdmin && (
                 <Card className="mb-8">
                    <CardHeader>
                        <CardTitle className="text-xl font-headline flex items-center">
                            <Eye className="mr-2 h-5 w-5"/>Páginas Más Visitadas (Admin)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats.topPages.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {stats.topPages.map((page, index) => (
                                    <StatCard key={index} title={page.name} value={page.count} icon={<div className="font-bold text-lg">{index + 1}</div>} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">No hay datos de visitas de páginas para mostrar.</p>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-xl font-headline">Resumen General de Partidos</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                    <StatCard title="Partidos Jugados" value={stats.generalStats.numPartidos} icon={<Trophy className="h-6 w-6"/>} />
                    <StatCard title="Ganados" value={stats.generalStats.partidosGanados} icon={<TrendingUp className="h-6 w-6"/>} />
                    <StatCard title="Empatados" value={stats.generalStats.partidosEmpatados} icon={<Handshake className="h-6 w-6"/>} />
                    <StatCard title="Perdidos" value={stats.generalStats.partidosPerdidos} icon={<TrendingDown className="h-6 w-6"/>} />
                    <StatCard title="Faltas Cometidas" value={stats.generalStats.faltasCometidas} icon={<ShieldAlert className="h-6 w-6"/>} />
                </CardContent>
            </Card>

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-xl font-headline">Rendimiento del Equipo</CardTitle>
                </CardHeader>
                 <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-6">
                    <StatCard title="Tiros a Puerta" value={stats.generalStats.tirosAPuerta} icon={<Target className="h-6 w-6"/>} />
                    <StatCard title="Tiros Fuera" value={stats.generalStats.tirosFuera} icon={<Target className="h-6 w-6"/>} />
                    <StatCard title="Tiros Bloqueados" value={stats.generalStats.tirosBloqueados} icon={<Target className="h-6 w-6"/>} />
                    <StatCard title="Pérdidas de Balón" value={stats.generalStats.perdidasTotales} icon={<Repeat className="h-6 w-6"/>} />
                    <StatCard title="Robos de Balón" value={stats.generalStats.robosTotales} icon={<Shuffle className="h-6 w-6"/>} />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-headline">Goles a Favor</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard title="Totales" value={stats.generalStats.golesFavor} icon={<Goal className="h-6 w-6"/>} />
                        <StatCard title="1ª Parte" value={stats.generalStats.golesFavor1T} icon={<Goal className="h-6 w-6"/>} />
                        <StatCard title="2ª Parte" value={stats.generalStats.golesFavor2T} icon={<Goal className="h-6 w-6"/>} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl font-headline">Goles en Contra</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <StatCard title="Totales" value={stats.generalStats.golesContra} icon={<Shield className="h-6 w-6"/>} />
                        <StatCard title="1ª Parte" value={stats.generalStats.golesContra1T} icon={<Shield className="h-6 w-6"/>} />
                        <StatCard title="2ª Parte" value={stats.generalStats.golesContra2T} icon={<Shield className="h-6 w-6"/>} />
                    </CardContent>
                </Card>
            </div>


            <Card className="mb-8">
                <CardHeader>
                    <CardTitle className="text-xl font-headline">Jugadores Destacados</CardTitle>
                    <CardDescription>Resumen de los líderes estadísticos de la temporada.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <LeaderStatCard title="Máximo Goleador" playerName={stats.leaderStats.goles.name} value={stats.leaderStats.goles.value} icon={<Trophy className="h-6 w-6"/>} />
                    <LeaderStatCard title="Más Tarjetas Amarillas" playerName={stats.leaderStats.amarillas.name} value={stats.leaderStats.amarillas.value} icon={<div className="h-6 w-6 bg-yellow-400 border-2 border-yellow-600 rounded-sm" />} />
                    <LeaderStatCard title="Más Tarjetas Rojas" playerName={stats.leaderStats.rojas.name} value={stats.leaderStats.rojas.value} icon={<div className="h-6 w-6 bg-red-500 border-2 border-red-700 rounded-sm" />} />
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
