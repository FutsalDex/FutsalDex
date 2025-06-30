
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Eye, History } from "lucide-react";

interface SavedMatch {
    id: string;
    myTeamName: string;
    opponentTeamName: string;
    fecha: string;
    myTeamPlayers?: { goals: number; }[];
    opponentPlayers: { goals: number; }[];
     // For backwards compatibility
    myTeamStats?: {
        shots: {
            goals: { firstHalf: number; secondHalf: number };
        };
    };
    createdAt: Timestamp;
}

function HistorialPageContent() {
    const { user } = useAuth();
    const [matches, setMatches] = useState<SavedMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchMatches = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const q = query(
                collection(db, "partidos_estadisticas"),
                where("userId", "==", user.uid),
                orderBy("fecha", "desc")
            );
            const querySnapshot = await getDocs(q);
            const fetchedMatches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedMatch));
            setMatches(fetchedMatches);
        } catch (error) {
            console.error("Error fetching match history:", error);
        }
        setIsLoading(false);
    }, [user]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);

    const calculateScore = (match: SavedMatch) => {
        // New data structure with player stats for myTeam
        const myGoalsFromPlayers = match.myTeamPlayers?.reduce((total, player) => total + (player.goals || 0), 0);
        // Old data structure for backwards compatibility
        const myGoalsFromStats = (match.myTeamStats?.shots?.goals?.firstHalf || 0) + (match.myTeamStats?.shots?.goals?.secondHalf || 0);
        // Use player goals if available, otherwise fallback to team stats
        const myGoals = myGoalsFromPlayers !== undefined ? myGoalsFromPlayers : myGoalsFromStats;

        const opponentGoals = match.opponentPlayers?.reduce((total, player) => total + (player.goals || 0), 0) || 0;
        return `${myGoals} - ${opponentGoals}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "Fecha no disponible";
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                        <History className="mr-3 h-8 w-8"/>
                        Historial de Partidos
                    </h1>
                    <p className="text-lg text-foreground/80">
                        Consulta las estadísticas de tus partidos guardados.
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/estadisticas">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Link>
                </Button>
            </header>

            {matches.length === 0 ? (
                <Card className="text-center py-12">
                    <CardHeader>
                        <CardTitle>No hay partidos guardados</CardTitle>
                        <CardDescription>Aún no has guardado ninguna estadística. ¡Empieza registrando tu primer partido!</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matches.map(match => (
                        <Card key={match.id} className="flex flex-col">
                            <CardHeader>
                                <CardTitle className="text-xl font-headline truncate">{match.myTeamName} vs {match.opponentTeamName}</CardTitle>
                                <CardDescription>{formatDate(match.fecha)}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-4xl font-bold text-center text-primary">{calculateScore(match)}</p>
                            </CardContent>
                            <CardFooter>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/estadisticas/historial/${match.id}`}>
                                        <Eye className="mr-2 h-4 w-4" />
                                        Ver Detalles
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function HistorialEstadisticasPage() {
    return (
        <AuthGuard>
            <SubscriptionGuard>
                <HistorialPageContent />
            </SubscriptionGuard>
        </AuthGuard>
    );
}
