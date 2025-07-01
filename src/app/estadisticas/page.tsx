
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Plus, Minus, RotateCcw, RectangleHorizontal, RectangleVertical, Save, Loader2, History, FileText, Users } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { produce } from "immer";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore";
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";


// --- Helper Components ---

interface StatCounterProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

const StatCounter: React.FC<StatCounterProps> = ({ value, onIncrement, onDecrement, disabled = false }) => (
  <div className="flex items-center justify-center gap-1">
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onDecrement} disabled={disabled || value <= 0}>
      <Minus className="h-4 w-4" />
    </Button>
    <span className="w-6 text-center font-mono text-lg">{value}</span>
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onIncrement} disabled={disabled}>
      <Plus className="h-4 w-4" />
    </Button>
  </div>
);

// --- State and Types ---

interface Player {
  dorsal: string;
  nombre: string;
  posicion: string;
  goals: number;
  yellowCards: number;
  redCards: number;
  faltas: number;
  paradas: number;
  golesRecibidos: number;
  unoVsUno: number;
}

interface OpponentPlayer {
    dorsal: string;
    goals: number;
    yellowCards: number;
    redCards: number;
    faltas: number;
    paradas: number;
    golesRecibidos: number;
    unoVsUno: number;
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

const createInitialOpponentPlayers = (count: number): OpponentPlayer[] =>
  Array.from({ length: count }, () => ({
    dorsal: '',
    goals: 0,
    yellowCards: 0,
    redCards: 0,
    faltas: 0,
    paradas: 0,
    golesRecibidos: 0,
    unoVsUno: 0,
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
  const [myTeamPlayers, setMyTeamPlayers] = useState<Player[]>([]);
  const [opponentPlayers, setOpponentPlayers] = useState<OpponentPlayer[]>(createInitialOpponentPlayers(12));
  
  // Control State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);

  const getTeamDocRef = useCallback(() => {
      if (!user) return null;
      return doc(db, 'usuarios', user.uid, 'team', 'roster');
  }, [user]);

  useEffect(() => {
    const fetchTeamRoster = async () => {
      const docRef = getTeamDocRef();
      if (!docRef) {
        setIsLoadingRoster(false);
        return;
      }
      setIsLoadingRoster(true);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().players?.length > 0) {
            const roster = docSnap.data().players;
            setMyTeamPlayers(roster.map((p: any) => ({
                dorsal: p.dorsal || '',
                nombre: p.nombre || 'Sin nombre',
                posicion: p.posicion || '',
                goals: 0,
                yellowCards: 0,
                redCards: 0,
                faltas: 0,
                paradas: 0,
                golesRecibidos: 0,
                unoVsUno: 0,
            })));
        }
      } catch (error) {
        console.error("Error fetching team roster for stats:", error);
        toast({ title: "Error", description: "No se pudo cargar la plantilla de tu equipo.", variant: "destructive" });
      } finally {
        setIsLoadingRoster(false);
      }
    };
    fetchTeamRoster();
  }, [getTeamDocRef, toast]);


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
  
  const handleOpponentDorsalChange = (index: number, value: string) => {
      setOpponentPlayers(produce(draft => {
          draft[index].dorsal = value;
      }));
  };

  const handlePlayerStatChange = (
    team: 'myTeam' | 'opponentTeam',
    index: number,
    field: 'goals' | 'yellowCards' | 'redCards' | 'faltas' | 'paradas' | 'golesRecibidos' | 'unoVsUno',
    delta: number
  ) => {
      const setter = team === 'myTeam' ? setMyTeamPlayers : setOpponentPlayers;
      setter(produce(draft => {
          (draft[index] as any)[field] = Math.max(0, (draft[index] as any)[field] + delta);
      }));
  }

  const resetAllStats = () => {
      setMyTeamStats(createInitialTeamStats());
      setOpponentTeamStats(createInitialTeamStats());
      setOpponentPlayers(createInitialOpponentPlayers(12));
      // Reset myTeamPlayers stats to 0 but keep roster info
      setMyTeamPlayers(produce(draft => {
        draft.forEach(p => {
            p.goals = 0;
            p.yellowCards = 0;
            p.redCards = 0;
            p.faltas = 0;
            p.paradas = 0;
            p.golesRecibidos = 0;
            p.unoVsUno = 0;
        })
      }));
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

    const filterOpponentPlayers = (players: OpponentPlayer[]) => players.filter(p => p.dorsal.trim() !== '' || p.goals > 0 || p.redCards > 0 || p.yellowCards > 0 || p.faltas > 0 || p.paradas > 0 || p.golesRecibidos > 0 || p.unoVsUno > 0);
    const filterMyTeamPlayersForSaving = (players: Player[]) => players
      .filter(p => p.dorsal.trim() !== '' && (p.goals > 0 || p.redCards > 0 || p.yellowCards > 0 || p.faltas > 0 || p.paradas > 0 || p.golesRecibidos > 0 || p.unoVsUno > 0))
      .map(({nombre, posicion, ...rest}) => rest); // Remove name and position before saving


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
            myTeamPlayers: filterMyTeamPlayersForSaving(myTeamPlayers),
            opponentPlayers: filterOpponentPlayers(opponentPlayers),
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
    const teamName = team === 'myTeam' ? myTeamName : opponentTeamName;
    const cardTitleColor = team === 'myTeam' ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";

    if (team === 'myTeam' && isLoadingRoster) {
      return (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Cargando plantilla...</p>
        </div>
      );
    }
    
    if (team === 'myTeam' && !isLoadingRoster && myTeamPlayers.length === 0) {
        return (
            <Card>
                 <CardHeader className="p-0">
                    <CardTitle className={`${cardTitleColor} p-3 rounded-t-lg text-lg`}>ESTADÍSTICAS JUGADORES - {teamName}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-center">
                    <p className="text-muted-foreground mb-4">No tienes jugadores en tu equipo. Ve a "Mi Equipo" para añadir tu plantilla.</p>
                    <Button asChild>
                        <Link href="/mi-equipo">
                            <Users className="mr-2 h-4 w-4" />
                            Ir a Mi Equipo
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const players = team === 'myTeam' ? myTeamPlayers : opponentPlayers;

    return (
        <Card>
            <CardHeader className="p-0">
                <CardTitle className={`${cardTitleColor} p-3 rounded-t-lg text-lg`}>ESTADÍSTICAS JUGADORES - {teamName}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
                <div className="min-w-[800px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[80px]">Dorsal</TableHead>
                                {team === 'myTeam' && <TableHead>Nombre</TableHead>}
                                <TableHead className="text-center w-[110px]">Goles</TableHead>
                                <TableHead title="Tarjeta Amarilla" className="text-center w-[60px]"><RectangleHorizontal className="h-4 w-4 inline-block text-yellow-500"/></TableHead>
                                <TableHead title="Tarjeta Roja" className="text-center w-[60px]"><RectangleVertical className="h-4 w-4 inline-block text-red-600"/></TableHead>
                                <TableHead className="text-center w-[110px]">Faltas</TableHead>
                                <TableHead className="text-center w-[110px]">Paradas</TableHead>
                                <TableHead className="text-center w-[110px]">G. Recibidos</TableHead>
                                <TableHead className="text-center w-[110px]">1 vs 1</TableHead>
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
                                        onChange={(e) => team === 'opponentTeam' && handleOpponentDorsalChange(index, e.target.value)}
                                        readOnly={team === 'myTeam'}
                                        type="number" 
                                      />
                                    </TableCell>
                                    {team === 'myTeam' && <TableCell className="font-medium">{(player as Player).nombre}</TableCell>}
                                    <TableCell>
                                        <StatCounter value={player.goals} onIncrement={() => handlePlayerStatChange(team, index, 'goals', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'goals', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter value={player.yellowCards} onIncrement={() => handlePlayerStatChange(team, index, 'yellowCards', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'yellowCards', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter value={player.redCards} onIncrement={() => handlePlayerStatChange(team, index, 'redCards', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'redCards', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter value={player.faltas} onIncrement={() => handlePlayerStatChange(team, index, 'faltas', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'faltas', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter value={player.paradas} onIncrement={() => handlePlayerStatChange(team, index, 'paradas', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'paradas', -1)} disabled={team === 'myTeam' && (player as Player).posicion !== 'Portero'} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter value={player.golesRecibidos} onIncrement={() => handlePlayerStatChange(team, index, 'golesRecibidos', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'golesRecibidos', -1)} disabled={team === 'myTeam' && (player as Player).posicion !== 'Portero'} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter value={player.unoVsUno} onIncrement={() => handlePlayerStatChange(team, index, 'unoVsUno', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'unoVsUno', -1)} disabled={team === 'myTeam' && (player as Player).posicion !== 'Portero'} />
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
                    <CardTitle className={`${cardTitleColor} p-3 rounded-t-lg text-lg`}>TIROS A PUERTA - {teamName}</CardTitle>
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
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4"/>
                  Datos del Partido
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Datos del Partido</DialogTitle>
                  <DialogDescription>
                    Introduce la información general del encuentro.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fecha" className="text-right">Fecha</Label>
                    <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="campeonato" className="text-right">Campeonato</Label>
                    <Input id="campeonato" value={campeonato} onChange={(e) => setCampeonato(e.target.value)} placeholder="Ej: Liga Local" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="jornada" className="text-right">Jornada</Label>
                    <Input id="jornada" value={jornada} onChange={(e) => setJornada(e.target.value)} placeholder="Ej: Jornada 5" className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="myTeamName" className="text-right">Mi Equipo</Label>
                    <Input id="myTeamName" value={myTeamName} onChange={(e) => setMyTeamName(e.target.value)} placeholder="Nombre equipo local" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="opponentTeamName" className="text-right">Visitante</Label>
                    <Input id="opponentTeamName" value={opponentTeamName} onChange={(e) => setOpponentTeamName(e.target.value)} placeholder="Nombre equipo visitante" className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button">Aceptar</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

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

      <Tabs defaultValue="myTeam" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="myTeam">{myTeamName || "Mi Equipo"}</TabsTrigger>
            <TabsTrigger value="opponentTeam">{opponentTeamName || "Equipo Contrario"}</TabsTrigger>
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
