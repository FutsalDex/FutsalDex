
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Plus, Minus, RotateCcw, RectangleVertical, Save, Loader2, History, FileText, Users, ArrowLeft, Edit } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { produce } from "immer";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParams, useRouter } from 'next/navigation';

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
    <span className="w-6 text-center font-mono text-base">{value}</span>
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
    nombre?: string;
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
  };
  turnovers: HalfStats;
  steals: HalfStats;
  timeouts: HalfStats;
}

function EditMatchPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  // Match Info
  const [rosterInfo, setRosterInfo] = useState({ name: '', campeonato: '' });
  const [localTeamName, setLocalTeamName] = useState("");
  const [visitorTeamName, setVisitorTeamName] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [campeonato, setCampeonato] = useState("");
  const [jornada, setJornada] = useState("");
  const [tipoPartido, setTipoPartido] = useState("");
  
  // Stats State
  const [myTeamStats, setMyTeamStats] = useState<TeamStats | null>(null);
  const [opponentTeamStats, setOpponentTeamStats] = useState<TeamStats | null>(null);
  const [myTeamPlayers, setMyTeamPlayers] = useState<Player[]>([]);
  const [opponentPlayers, setOpponentPlayers] = useState<OpponentPlayer[]>([]);
  
  // Control State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Derived state to determine which side our roster is on
  const rosterSide = localTeamName === rosterInfo.name && rosterInfo.name ? 'local' : (visitorTeamName === rosterInfo.name && rosterInfo.name ? 'visitante' : null);

  useEffect(() => {
    const fetchMatchAndRoster = async () => {
      if (!user || !matchId) return;
      setIsLoading(true);

      try {
        const matchDocRef = doc(db, "partidos_estadisticas", matchId);
        const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');

        const [matchSnap, rosterSnap] = await Promise.all([
          getDoc(matchDocRef),
          getDoc(rosterDocRef)
        ]);

        if (!matchSnap.exists() || matchSnap.data().userId !== user.uid) {
            setNotFound(true);
            setIsLoading(false);
            return;
        }

        const matchData = matchSnap.data();
        const rosterData = rosterSnap.exists() ? rosterSnap.data() : { players: [], equipo: '', campeonato: '' };
        
        setRosterInfo({ name: rosterData.equipo || '', campeonato: rosterData.campeonato || '' });

        if (matchData.myTeamWasHome) {
            setLocalTeamName(matchData.myTeamName);
            setVisitorTeamName(matchData.opponentTeamName);
        } else {
            setLocalTeamName(matchData.opponentTeamName);
            setVisitorTeamName(matchData.myTeamName);
        }
        
        // Populate match info
        setFecha(matchData.fecha || "");
        setHora(matchData.hora || "");
        setCampeonato(matchData.campeonato || "");
        setJornada(matchData.jornada || "");
        setTipoPartido(matchData.tipoPartido || "");
        setMyTeamStats(matchData.myTeamStats);
        setOpponentTeamStats(matchData.opponentTeamStats);

        // Fetch roster
        const roster: Player[] = rosterData.players || [];

        // Merge roster with match player stats
        const enrichedMyTeamPlayers = roster.map(rosterPlayer => {
            const matchPlayer = matchData.myTeamPlayers?.find((p: Player) => p.dorsal === rosterPlayer.dorsal);
            return {
                ...rosterPlayer,
                goals: matchPlayer?.goals || 0,
                yellowCards: matchPlayer?.yellowCards || 0,
                redCards: matchPlayer?.redCards || 0,
                faltas: matchPlayer?.faltas || 0,
                paradas: matchPlayer?.paradas || 0,
                golesRecibidos: matchPlayer?.golesRecibidos || 0,
                unoVsUno: matchPlayer?.unoVsUno || 0,
            };
        });
        setMyTeamPlayers(enrichedMyTeamPlayers);

        // Populate opponent players, padding with empty rows up to 12
        const savedOpponents = matchData.opponentPlayers || [];
        const emptyOpponents = Array.from({ length: Math.max(0, 12 - savedOpponents.length) }, () => ({ dorsal: '', nombre: '', goals: 0, yellowCards: 0, redCards: 0, faltas: 0, paradas: 0, golesRecibidos: 0, unoVsUno: 0 }));
        setOpponentPlayers([...savedOpponents, ...emptyOpponents]);

      } catch (error) {
        console.error("Error fetching data for edit:", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos del partido.", variant: "destructive" });
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatchAndRoster();
  }, [user, matchId, toast]);

  const handleUpdateStats = async () => {
     if (!user || !matchId) return;

     if (!rosterSide) {
      toast({ title: "Asignación de equipo requerida", description: "Por favor, usa el botón 'Usar mi equipo' o escribe el nombre exacto de tu equipo en uno de los campos para asignar tu plantilla antes de guardar.", variant: "destructive", duration: 7000 });
      return;
    }

     setIsSaving(true);
     
     const filterOpponentPlayers = (players: OpponentPlayer[]) => players.filter(p => p.dorsal.trim() !== '' || p.nombre?.trim() !== '' || p.goals > 0 || p.redCards > 0 || p.yellowCards > 0 || p.faltas > 0 || p.paradas > 0 || p.golesRecibidos > 0 || p.unoVsUno > 0);
     const filterMyTeamPlayersForSaving = (players: Player[]) => players
      .filter(p => p.dorsal.trim() !== '' && (p.goals > 0 || p.redCards > 0 || p.yellowCards > 0 || p.faltas > 0 || p.paradas > 0 || p.golesRecibidos > 0 || p.unoVsUno > 0))
      .map(({posicion, ...rest}) => rest);

    const myTeamWasHome = rosterSide === 'local';
    const finalMyTeamName = myTeamWasHome ? localTeamName : visitorTeamName;
    const finalOpponentTeamName = myTeamWasHome ? visitorTeamName : localTeamName;

     const updatedData = {
        myTeamName: finalMyTeamName,
        opponentTeamName: finalOpponentTeamName,
        myTeamWasHome,
        fecha,
        hora,
        campeonato,
        jornada,
        tipoPartido,
        myTeamStats,
        opponentTeamStats,
        myTeamPlayers: filterMyTeamPlayersForSaving(myTeamPlayers),
        opponentPlayers: filterOpponentPlayers(opponentPlayers),
        updatedAt: serverTimestamp(),
     };

     try {
        const matchDocRef = doc(db, "partidos_estadisticas", matchId);
        await updateDoc(matchDocRef, updatedData);
        toast({ title: "Partido Actualizado", description: "Los cambios se han guardado correctamente." });
        router.push(`/estadisticas/historial/${matchId}`);
     } catch (error) {
        console.error("Error updating match:", error);
        toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
     } finally {
        setIsSaving(false);
     }
  };


  // Re-use stat change handlers from the main stats page
   const handleStatChange = (
    team: 'myTeam' | 'opponentTeam',
    statPath: (string | number)[],
    delta: number
  ) => {
    const setter = team === 'myTeam' ? setMyTeamStats : setOpponentTeamStats;
    const state = team === 'myTeam' ? myTeamStats : opponentTeamStats;

    if (!state) return;

    setter(
      produce(state, draft => {
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
  const handleOpponentNameChange = (index: number, value: string) => {
      setOpponentPlayers(produce(draft => {
          if(draft[index]) {
            draft[index].nombre = value;
          }
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

  const handleSetMyTeam = (side: 'local' | 'visitor') => {
    if (side === 'local') {
      if (visitorTeamName === rosterInfo.name) {
        setVisitorTeamName('');
      }
      setLocalTeamName(rosterInfo.name);
    } else { // visitor
      if (localTeamName === rosterInfo.name) {
        setLocalTeamName('');
      }
      setVisitorTeamName(rosterInfo.name);
    }
  };

  // --- Render logic ---
  if (isLoading) {
    return (
        <div className="flex justify-center items-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (notFound) {
      return (
            <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
                <Card className="w-full max-w-md text-center">
                    <CardHeader><CardTitle className="text-2xl font-headline text-destructive">Partido No Encontrado</CardTitle></CardHeader>
                    <CardContent>
                        <CardDescription>El partido que buscas no existe o no tienes permiso para editarlo.</CardDescription>
                        <Button asChild variant="outline" className="mt-4">
                            <Link href="/estadisticas/historial"><ArrowLeft className="mr-2 h-4 w-4" /> Volver al Historial</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
      );
  }
  
    const renderPlayerTable = (team: 'myTeam' | 'opponentTeam') => {
    const isMyRosterTeam = team === 'myTeam';
    
    let headerTeamName: string;
    if (isMyRosterTeam) {
        headerTeamName = rosterSide === 'local' ? localTeamName : visitorTeamName;
    } else {
        headerTeamName = rosterSide === 'local' ? visitorTeamName : localTeamName;
    }

    const cardTitleColor = isMyRosterTeam ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";

    const players = team === 'myTeam' ? myTeamPlayers : opponentPlayers;

    return (
        <Card>
            <CardHeader className="p-0">
                <CardTitle className={`${cardTitleColor} p-2 rounded-t-lg text-base`}>JUGADORES - {headerTeamName || (isMyRosterTeam ? "Mi Equipo" : "Equipo Contrario")}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 overflow-x-auto">
                <div className="min-w-[800px]">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[3.25rem] text-xs px-1">Dorsal</TableHead>
                                <TableHead className="text-xs">Nombre</TableHead>
                                <TableHead className="text-center w-[110px] text-xs">Goles</TableHead>
                                <TableHead title="T.A." className="text-center w-[60px] text-xs"><RectangleVertical className="h-4 w-4 inline-block text-yellow-500"/></TableHead>
                                <TableHead title="T.R." className="text-center w-[60px] text-xs"><RectangleVertical className="h-4 w-4 inline-block text-red-600"/></TableHead>
                                <TableHead className="text-center w-[110px] text-xs">Faltas</TableHead>
                                <TableHead className="text-center w-[110px] text-xs">Paradas</TableHead>
                                <TableHead className="text-center w-[110px] text-xs">G.C.</TableHead>
                                <TableHead className="text-center w-[110px] text-xs">1vs1</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {players.map((player, index) => (
                                <TableRow key={index}>
                                    <TableCell className="px-1">
                                      <Input 
                                        className="h-8 text-xs w-full" 
                                        placeholder="Nº" 
                                        value={player.dorsal} 
                                        onChange={(e) => team === 'opponentTeam' && handleOpponentDorsalChange(index, e.target.value)}
                                        readOnly={team === 'myTeam'}
                                        type="text" 
                                      />
                                    </TableCell>
                                    <TableCell className="font-medium text-xs px-1">
                                        {team === 'myTeam' ? 
                                            (player as Player).nombre : 
                                            <Input 
                                                className="h-8 text-xs w-full" 
                                                placeholder="Nombre" 
                                                value={(player as OpponentPlayer).nombre || ''}
                                                onChange={(e) => team === 'opponentTeam' && handleOpponentNameChange(index, e.target.value)}
                                            />
                                        }
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
    const isMyRosterTeam = team === 'myTeam';
    const stats = isMyRosterTeam ? myTeamStats : opponentTeamStats;
    if (!stats) return null;

    let headerTeamName: string;
    if (isMyRosterTeam) {
        headerTeamName = rosterSide === 'local' ? localTeamName : visitorTeamName;
    } else {
        headerTeamName = rosterSide === 'local' ? visitorTeamName : localTeamName;
    }
    const cardTitleColor = isMyRosterTeam ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader className="p-0">
                    <CardTitle className={`${cardTitleColor} p-2 rounded-t-lg text-base`}>TIROS A PUERTA - {headerTeamName || (isMyRosterTeam ? "Mi Equipo" : "Equipo Contrario")}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Tipo</TableHead>
                                <TableHead className="text-center text-xs">1º Tiempo</TableHead>
                                <TableHead className="text-center text-xs">2º Tiempo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Portería</TableHead>
                                <TableCell><StatCounter value={stats.shots.onTarget.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'onTarget', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'onTarget', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.onTarget.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'onTarget', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'onTarget', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Fuera</TableHead>
                                <TableCell><StatCounter value={stats.shots.offTarget.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'offTarget', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'offTarget', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.offTarget.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'offTarget', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'offTarget', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Bloqueados</TableHead>
                                <TableCell><StatCounter value={stats.shots.blocked.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'blocked', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'blocked', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.blocked.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'blocked', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'blocked', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="p-0">
                    <CardTitle className={`${cardTitleColor} p-2 rounded-t-lg text-base`}>EVENTOS DEL PARTIDO - {headerTeamName || (isMyRosterTeam ? "Mi Equipo" : "Equipo Contrario")}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs">Tipo</TableHead>
                                <TableHead className="text-center text-xs">1º Tiempo</TableHead>
                                <TableHead className="text-center text-xs">2º Tiempo</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Tiempos Muertos</TableHead>
                                <TableCell><StatCounter value={stats.timeouts.firstHalf} onIncrement={() => handleStatChange(team, ['timeouts', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['timeouts', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.timeouts.secondHalf} onIncrement={() => handleStatChange(team, ['timeouts', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['timeouts', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                             <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Pérdidas</TableHead>
                                <TableCell><StatCounter value={stats.turnovers.firstHalf} onIncrement={() => handleStatChange(team, ['turnovers', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['turnovers', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.turnovers.secondHalf} onIncrement={() => handleStatChange(team, ['turnovers', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['turnovers', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Robos</TableHead>
                                <TableCell><StatCounter value={stats.steals.firstHalf} onIncrement={() => handleStatChange(team, ['steals', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['steals', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter value={stats.steals.secondHalf} onIncrement={() => handleStatChange(team, ['steals', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['steals', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                <Edit className="mr-3 h-8 w-8"/>
                Editar Estadísticas de Partido
            </h1>
            <p className="text-lg text-foreground/80">
                Modifica las estadísticas guardadas de este partido.
            </p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
                <Link href={`/estadisticas/historial/${matchId}`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancelar
                </Link>
            </Button>
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
                    Modifica la información general del encuentro.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fecha" className="text-right">Fecha</Label>
                    <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="hora" className="text-right">Hora</Label>
                    <Input id="hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tipoPartido" className="text-right">Tipo</Label>
                    <Select value={tipoPartido} onValueChange={setTipoPartido}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Amistoso">Amistoso</SelectItem>
                        <SelectItem value="Liga">Liga</SelectItem>
                        <SelectItem value="Torneo">Torneo</SelectItem>
                        <SelectItem value="Copa">Copa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="campeonato" className="text-right">Campeonato</Label>
                    <Input id="campeonato" value={campeonato} onChange={(e) => setCampeonato(e.target.value)} placeholder="Ej: Liga Local" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="jornada" className="text-right">Jornada</Label>
                    <Input id="jornada" value={jornada} onChange={(e) => setJornada(e.target.value)} placeholder="Ej: Jornada 5" className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button">Aceptar</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button onClick={handleUpdateStats} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Actualizar Partido
            </Button>
        </div>
      </header>

      <Card className="mb-6">
        <CardHeader>
            <CardTitle>Información del Partido</CardTitle>
            <CardDescription>
                Edita los nombres de los equipos. Usa el botón para asignar rápidamente el nombre de tu equipo guardado en tu plantilla.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="localTeamName">Equipo Local</Label>
                    <div className="flex gap-2 items-center">
                        <Input id="localTeamName" value={localTeamName} onChange={(e) => setLocalTeamName(e.target.value)} placeholder="Nombre del equipo local" />
                         <Button type="button" variant="outline" size="sm" onClick={() => handleSetMyTeam('local')} className="px-3 text-xs shrink-0">Usar mi equipo</Button>
                    </div>
                </div>
                <div>
                    <Label htmlFor="visitorTeamName">Equipo Visitante</Label>
                    <div className="flex gap-2 items-center">
                        <Input id="visitorTeamName" value={visitorTeamName} onChange={(e) => setVisitorTeamName(e.target.value)} placeholder="Nombre del equipo visitante" />
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSetMyTeam('visitor')} className="px-3 text-xs shrink-0">Usar mi equipo</Button>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>


      <Tabs defaultValue="local" className="w-full" value={rosterSide === 'local' ? 'local' : (rosterSide === 'visitante' ? 'visitante' : 'local')}>
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">{localTeamName || 'Equipo Local'}</TabsTrigger>
            <TabsTrigger value="visitante">{visitorTeamName || 'Equipo Contrario'}</TabsTrigger>
        </TabsList>
        <TabsContent value="local">
            <div className="space-y-6 pt-6">
                {renderPlayerTable(rosterSide === 'local' ? 'myTeam' : 'opponentTeam')}
                {renderTeamStats(rosterSide === 'local' ? 'myTeam' : 'opponentTeam')}
            </div>
        </TabsContent>
        <TabsContent value="visitante">
             <div className="space-y-6 pt-6">
                {renderPlayerTable(rosterSide === 'visitante' ? 'myTeam' : 'opponentTeam')}
                {renderTeamStats(rosterSide === 'visitante' ? 'myTeam' : 'opponentTeam')}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EditMatchPage() {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <EditMatchPageContent />
      </SubscriptionGuard>
    </AuthGuard>
  );
}
