
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, RectangleVertical, History } from "lucide-react";

// --- Type Definitions ---
interface Player {
  dorsal: string;
  yellowCards: number;
  redCards: number;
  goals: number;
  faltas?: number;
  paradas?: number;
  golesRecibidos?: number;
  unoVsUno?: number;
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
    goals: HalfStats;
  };
  turnovers: HalfStats;
  steals: HalfStats;
}

interface MatchData {
    id: string;
    myTeamName: string;
    opponentTeamName: string;
    fecha: string;
    hora?: string;
    campeonato?: string;
    jornada?: string;
    myTeamStats: TeamStats;
    opponentTeamStats: TeamStats;
    myTeamPlayers: Player[];
    opponentPlayers: Player[];
    userId: string;
    createdAt: Timestamp;
}

// --- Helper Components & Functions ---

const StatDisplayTable: React.FC<{ title: string, stats: TeamStats['shots'] | TeamStats['turnovers'] | TeamStats['steals'], type: 'shots' | 'events' }> = ({ title, stats, type }) => {
    const renderRow = (label: string, data: HalfStats) => (
        <TableRow key={label} className="text-sm">
            <TableCell className="font-medium">{label}</TableCell>
            <TableCell className="text-center">{data.firstHalf || 0}</TableCell>
            <TableCell className="text-center">{data.secondHalf || 0}</TableCell>
            <TableCell className="text-center font-semibold">{(data.firstHalf || 0) + (data.secondHalf || 0)}</TableCell>
        </TableRow>
    );

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-sm">Tipo</TableHead>
                            <TableHead className="text-center text-sm">1ºT</TableHead>
                            <TableHead className="text-center text-sm">2ºT</TableHead>
                            <TableHead className="text-center text-sm">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {type === 'shots' && renderRow("Portería", (stats as TeamStats['shots']).onTarget)}
                        {type === 'shots' && renderRow("Fuera", (stats as TeamStats['shots']).offTarget)}
                        {type === 'shots' && renderRow("Bloqueados", (stats as TeamStats['shots']).blocked)}
                        {type === 'shots' && renderRow("Goles", (stats as TeamStats['shots']).goals)}
                        {type === 'events' && renderRow("Eventos", stats as HalfStats)}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

const PlayerStatTable: React.FC<{ players: Player[] }> = ({ players }) => {
    if (!players || players.length === 0) return <p className="text-sm text-muted-foreground p-4">No hay datos de jugadores.</p>;
    return (
        <Card>
            <CardHeader><CardTitle className="text-base">Estadísticas de Jugadores</CardTitle></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60px] text-sm">Dorsal</TableHead>
                            <TableHead className="text-center w-[80px] text-sm">Goles</TableHead>
                            <TableHead className="text-center w-[40px] text-sm"><RectangleVertical className="h-4 w-4 inline-block text-yellow-500"/></TableHead>
                            <TableHead className="text-center w-[40px] text-sm"><RectangleVertical className="h-4 w-4 inline-block text-red-600"/></TableHead>
                            <TableHead className="text-center text-sm">Faltas</TableHead>
                            <TableHead className="text-center text-sm">Paradas</TableHead>
                            <TableHead className="text-center text-sm">G.C.</TableHead>
                            <TableHead className="text-center text-sm">1 vs 1</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {players.map((player, index) => (
                            <TableRow key={index} className="text-sm">
                                <TableCell className="font-semibold">{player.dorsal}</TableCell>
                                <TableCell className="text-center font-bold">{player.goals || 0}</TableCell>
                                <TableCell className="text-center">{player.yellowCards || 0}</TableCell>
                                <TableCell className="text-center">{player.redCards || 0}</TableCell>
                                <TableCell className="text-center">{player.faltas || 0}</TableCell>
                                <TableCell className="text-center">{player.paradas || 0}</TableCell>
                                <TableCell className="text-center">{player.golesRecibidos || 0}</TableCell>
                                <TableCell className="text-center">{player.unoVsUno || 0}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};


function HistorialDetallePageContent() {
    const { user } = useAuth();
    const params = useParams();
    const matchId = params.id as string;
    const [match, setMatch] = useState<MatchData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const fetchMatch = useCallback(async () => {
        if (!user || !matchId) return;
        setIsLoading(true);
        try {
            const docRef = doc(db, "partidos_estadisticas", matchId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists() && docSnap.data().userId === user.uid) {
                setMatch({ id: docSnap.id, ...docSnap.data() } as MatchData);
            } else {
                setNotFound(true);
            }
        } catch (error) {
            console.error("Error fetching match:", error);
            setNotFound(true);
        }
        setIsLoading(false);
    }, [user, matchId]);

    useEffect(() => {
        fetchMatch();
    }, [fetchMatch]);
    
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "Fecha no disponible";
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }
    
    const calculateScore = (matchData: MatchData) => {
        const myGoals = matchData.myTeamPlayers?.reduce((total, player) => total + (player.goals || 0), 0) || 0;
        const opponentGoals = matchData.opponentPlayers?.reduce((total, player) => total + (player.goals || 0), 0) || 0;
        return `${myGoals} - ${opponentGoals}`;
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (notFound || !match) {
        return (
            <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-2xl font-headline text-destructive">Partido No Encontrado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CardDescription>El partido que buscas no existe o no tienes permiso para verlo.</CardDescription>
                        <Button asChild variant="outline" className="mt-4">
                            <Link href="/estadisticas/historial"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Historial</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                        <History className="mr-3 h-8 w-8"/>
                        Detalles del Partido
                    </h1>
                     <div className="text-lg text-foreground/80 flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>{formatDate(match.fecha)}</span>
                        {match.hora && <span className="font-medium">{match.hora}</span>}
                        {match.campeonato && <span className="font-medium">{match.campeonato}</span>}
                        {match.jornada && <span className="text-sm text-muted-foreground">{match.jornada}</span>}
                    </div>
                </div>
                <Button asChild variant="outline">
                    <Link href="/estadisticas/historial">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Historial
                    </Link>
                </Button>
            </header>

            <Card className="mb-8 text-center">
                <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl font-headline">{match.myTeamName} vs {match.opponentTeamName}</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-5xl md:text-6xl font-bold text-primary">{calculateScore(match)}</p>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* My Team Column */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold font-headline text-center text-primary">{match.myTeamName}</h2>
                    <PlayerStatTable players={match.myTeamPlayers} />
                    <StatDisplayTable title="Tiros a Puerta" stats={match.myTeamStats.shots} type="shots" />
                    <StatDisplayTable title="Pérdidas" stats={match.myTeamStats.turnovers} type="events" />
                    <StatDisplayTable title="Robos" stats={match.myTeamStats.steals} type="events" />
                </div>
                {/* Opponent Team Column */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold font-headline text-center text-accent">{match.opponentTeamName}</h2>
                    <PlayerStatTable players={match.opponentPlayers} />
                    <StatDisplayTable title="Tiros a Puerta" stats={match.opponentTeamStats.shots} type="shots" />
                    <StatDisplayTable title="Pérdidas" stats={match.opponentTeamStats.turnovers} type="events" />
                    <StatDisplayTable title="Robos" stats={match.opponentTeamStats.steals} type="events" />
                </div>
            </div>
        </div>
    );
}


export default function HistorialDetallePage() {
    return (
        <AuthGuard>
            <SubscriptionGuard>
                <HistorialDetallePageContent />
            </SubscriptionGuard>
        </AuthGuard>
    );
}
