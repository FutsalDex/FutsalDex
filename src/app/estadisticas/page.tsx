
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Plus, Minus, RotateCcw, RectangleHorizontal, RectangleVertical, Save, Loader2, History } from "lucide-react";
import React, { useState } from "react";
import { produce } from "immer";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


// --- Helper Components ---

interface StatCounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

const StatCounter: React.FC<StatCounterProps> = ({ value, onIncrement, onDecrement }) => (
  <div className="flex items-center justify-center gap-1">
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDecrement} disabled={value <= 0}>
      <Minus className="h-4 w-4" />
    </Button>
    <span className="w-6 text-center font-mono text-lg">{value}</span>
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onIncrement}>
      <Plus className="h-4 w-4" />
    </Button>
  </div>
);

// --- State and Types ---

interface Player {
  dorsal: string;
  goals: number;
  yellowCards: number;
  redCards: number;
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

const initialHalfStats: HalfStats = { firstHalf: 0, secondHalf: 0 };

const createInitialTeamStats = (): TeamStats => ({
  shots: {
    onTarget: { ...initialHalfStats },
    offTarget: { ...initialHalfStats },
    blocked: { ...initialHalfStats },
    goals: { ...initialHalfStats },
  },
  turnovers: { ...initialHalfStats },
  steals: { ...initialHalfStats },
});

const createInitialPlayers = (count: number): Player[] =>
  Array.from({ length: count }, () => ({
    dorsal: '',
    goals: 0,
    yellowCards: 0,
    redCards: 0,
  }));


function EstadisticasPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Match Info
  const [myTeamName, setMyTeamName] = useState("Mi Equipo");
  const [opponentTeamName, setOpponentTeamName] = useState("Equipo Contrario");
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [campeonato, setCampeonato] = useState("");
  const [jornada, setJornada] = useState("");
  
  // Stats State
  const [myTeamStats, setMyTeamStats] = useState<TeamStats>(createInitialTeamStats());
  const [opponentTeamStats, setOpponentTeamStats] = useState<TeamStats>(createInitialTeamStats());
  const [myTeamPlayers, setMyTeamPlayers] = useState<Player[]>(createInitialPlayers(12));
  const [opponentPlayers, setOpponentPlayers] = useState<Player[]>(createInitialPlayers(12));
  
  // Control State
  const [isSaving, setIsSaving] = useState(false);

  const handleStatChange = (
    team: 'myTeam' | 'opponentTeam',
    statPath: (string | number)[],
    delta: number
  ) => {
    const setter = team === 'myTeam' ? setMyTeamStats : setOpponentTeamStats;
    setter(
      produce(draft => {
        let current = draft as any;
        for (let i = 0; i < statPath.length - 1; i++) {
          current = current[statPath[i]];
        }
        const finalKey = statPath[statPath.length - 1];
        current[finalKey] = Math.max(0, current[finalKey] + delta);
      })
    );
  };
  
  const handlePlayerChange = (
    team: 'myTeam' | 'opponentTeam',
    index: number,
    field: 'dorsal',
    value: string
  ) => {
      const setter = team === 'myTeam' ? setMyTeamPlayers : setOpponentPlayers;
      setter(produce(draft => {
          draft[index][field] = value;
      }));
  };

  const handlePlayerStatChange = (
    team: 'myTeam' | 'opponentTeam',
    index: number,
    field: 'goals' | 'yellowCards' | 'redCards',
    delta: number
  ) => {
      const setter = team === 'myTeam' ? setMyTeamPlayers : setOpponentPlayers;
      setter(produce(draft => {
          draft[index][field] = Math.max(0, draft[index][field] + delta);
      }));
  }

  const resetAllStats = () => {
      setMyTeamStats(createInitialTeamStats());
      setOpponentTeamStats(createInitialTeamStats());
      setMyTeamPlayers(createInitialPlayers(12));
      setOpponentPlayers(createInitialPlayers(12));
      setMyTeamName("Mi Equipo");
      setOpponentTeamName("Equipo Contrario");
      setFecha(new Date().toISOString().split('T')[0]);
      setCampeonato("");
      setJornada("");
  };

  const handleSaveStats = async () => {
    if (!user) {
        toast({ title: "Error", description: "Debes iniciar sesión para guardar.", variant: "destructive" });
        return;
    }
    if (!myTeamName || !opponentTeamName || !fecha) {
        toast({ title: "Faltan datos", description: "Completa el nombre de los equipos y la fecha.", variant: "destructive" });
        return;
    }

    const filterPlayers = (players: Player[]) => players.filter(p => p.dorsal.trim() !== '' || p.goals > 0 || p.redCards > 0 || p.yellowCards > 0);

    setIsSaving(true);
    try {
        await addDoc(collection(db, "partidos_estadisticas"), {
            userId: user.uid,
            myTeamName,
            opponentTeamName,
            fecha,
            campeonato,
            jornada,
            myTeamStats,
            opponentTeamStats,
            myTeamPlayers: filterPlayers(myTeamPlayers),
            opponentPlayers: filterPlayers(opponentPlayers),
            createdAt: serverTimestamp(),
        });
        toast({ title: "Estadísticas Guardadas", description: "El partido se ha guardado en tu historial." });
        resetAllStats();
    } catch (error) {
        console.error("Error saving stats: ", error);
        toast({ title: "Error al guardar", description: "No se pudieron guardar las estadísticas.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  const renderPlayerTable = (team: 'myTeam' | 'opponentTeam') => {
    const players = team === 'myTeam' ? myTeamPlayers : opponentPlayers;
    const teamName = team === 'myTeam' ? myTeamName : opponentTeamName;
    const cardTitleColor = team === 'myTeam' ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";

    return (
        <Card>
            <CardHeader className="p-0">
                <CardTitle className={`${cardTitleColor} p-3 rounded-t-lg text-lg`}>ESTADÍSTICAS JUGADORES - {teamName || (team === 'myTeam' ? "Local" : "Visitante")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
                <div className="max-h-96 overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Dorsal</TableHead>
                                <TableHead className="text-center w-[110px]">Goles</TableHead>
                                <TableHead title="Tarjeta Amarilla" className="text-center w-[60px]"><RectangleHorizontal className="h-4 w-4 inline-block text-yellow-500"/></TableHead>
                                <TableHead title="Tarjeta Roja" className="text-center w-[60px]"><RectangleVertical className="h-4 w-4 inline-block text-red-600"/></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map((player, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                      <Input 
                                        className="h-8 text-sm w-16" 
                                        placeholder="Nº" 
                                        value={player.dorsal} 
                                        onChange={(e) => handlePlayerChange(team, index, 'dorsal', e.target.value)}
                                        type="number" 
                                      />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter value={player.goals} onIncrement={() => handlePlayerStatChange(team, index, 'goals', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'goals', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter value={player.yellowCards} onIncrement={() => handlePlayerStatChange(team, index, 'yellowCards', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'yellowCards', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter value={player.redCards} onIncrement={() => handlePlayerStatChange(team, index, 'redCards', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'redCards', -1)} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
  }

  const renderTeamStats = (team: 'myTeam' | 'opponentTeam') => {
    const stats = team === 'myTeam' ? myTeamStats : opponentTeamStats;
    const teamName = team === 'myTeam' ? myTeamName : opponentTeamName;
    const cardTitleColor = team === 'myTeam' ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="p-0">
                    <CardTitle className={`${cardTitleColor} p-3 rounded-t-lg text-lg`}>TIROS A PUERTA - {teamName || (team === 'myTeam' ? "Local" : "Visitante")}</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-center w-[120px]">1º Tiempo</TableHead>
                                <TableHead className="text-center w-[120px]">2º Tiempo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableHead className="font-semibold">Portería</TableHead>
                                <TableCell><StatCounter value={stats.shots.onTarget.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'onTarget', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'onTarget', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.onTarget.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'onTarget', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'onTarget', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableHead className="font-semibold">Fuera</TableHead>
                                <TableCell><StatCounter value={stats.shots.offTarget.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'offTarget', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'offTarget', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.offTarget.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'offTarget', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'offTarget', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                            <TableRow>
                                <TableHead className="font-semibold">Bloqueados</TableHead>
                                <TableCell><StatCounter value={stats.shots.blocked.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'blocked', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'blocked', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.blocked.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'blocked', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'blocked', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                             <TableRow>
                                <TableHead className="font-semibold">Goles (Equipo)</TableHead>
                                <TableCell><StatCounter value={stats.shots.goals.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'goals', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'goals', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.goals.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'goals', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'goals', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle className="text-base font-semibold">PÉRDIDAS</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div><p className="text-sm font-medium text-muted-foreground mb-1">1º Tiempo</p><StatCounter value={stats.turnovers.firstHalf} onIncrement={() => handleStatChange(team, ['turnovers', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['turnovers', 'firstHalf'], -1)} /></div>
                        <div><p className="text-sm font-medium text-muted-foreground mb-1">2º Tiempo</p><StatCounter value={stats.turnovers.secondHalf} onIncrement={() => handleStatChange(team, ['turnovers', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['turnovers', 'secondHalf'], -1)} /></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-base font-semibold">ROBOS</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        <div><p className="text-sm font-medium text-muted-foreground mb-1">1º Tiempo</p><StatCounter value={stats.steals.firstHalf} onIncrement={() => handleStatChange(team, ['steals', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['steals', 'firstHalf'], -1)} /></div>
                        <div><p className="text-sm font-medium text-muted-foreground mb-1">2º Tiempo</p><StatCounter value={stats.steals.secondHalf} onIncrement={() => handleStatChange(team, ['steals', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['steals', 'secondHalf'], -1)} /></div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                <BarChart2 className="mr-3 h-8 w-8"/>
                Estadísticas de Partido
            </h1>
            <p className="text-lg text-foreground/80">
                Registra las estadísticas de tu equipo durante un partido en tiempo real.
            </p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button onClick={resetAllStats} variant="outline">
                <RotateCcw className="mr-2 h-4 w-4"/>
                Reiniciar
            </Button>
            <Button onClick={handleSaveStats} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
            </Button>
            <Button asChild variant="secondary" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/estadisticas/historial">
                    <History className="mr-2 h-4 w-4" />
                    Ver Historial
                </Link>
            </Button>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-1">
              <Label htmlFor="campeonato">Campeonato</Label>
              <Input id="campeonato" value={campeonato} onChange={(e) => setCampeonato(e.target.value)} placeholder="Ej: Liga Local" />
          </div>
          <div className="space-y-1">
              <Label htmlFor="jornada">Jornada</Label>
              <Input id="jornada" value={jornada} onChange={(e) => setJornada(e.target.value)} placeholder="Ej: Jornada 5" />
          </div>
      </div>

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input value={myTeamName} onChange={(e) => setMyTeamName(e.target.value)} placeholder="Nombre equipo local" className="text-lg font-bold" />
        <Input value={opponentTeamName} onChange={(e) => setOpponentTeamName(e.target.value)} placeholder="Nombre equipo visitante" className="text-lg font-bold" />
      </div>

      <Tabs defaultValue="myTeam" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="myTeam">{myTeamName || "Equipo Local"}</TabsTrigger>
            <TabsTrigger value="opponentTeam">{opponentTeamName || "Equipo Visitante"}</TabsTrigger>
        </TabsList>
        <TabsContent value="myTeam">
            <div className="space-y-6 pt-6">
                {renderPlayerTable('myTeam')}
                {renderTeamStats('myTeam')}
            </div>
        </TabsContent>
        <TabsContent value="opponentTeam">
             <div className="space-y-6 pt-6">
                {renderPlayerTable('opponentTeam')}
                {renderTeamStats('opponentTeam')}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EstadisticasPage() {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <EstadisticasPageContent />
      </SubscriptionGuard>
    </AuthGuard>
  );
}
