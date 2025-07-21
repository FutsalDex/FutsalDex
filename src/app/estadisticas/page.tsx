
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Plus, Minus, RotateCcw, RectangleVertical, Save, Loader2, History, FileText, Users, ArrowLeft, Info, Play, Pause } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { produce } from "immer";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import Link from 'next/link';
import { useRouter } from "next/navigation";
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
import { ToastAction } from "@/components/ui/toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


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
interface GoalEvent {
    minute: number;
    second: number;
    half: 'firstHalf' | 'secondHalf';
    id: string; // To uniquely identify each goal for deletion
}

interface Player {
  id: string;
  dorsal: string;
  nombre: string;
  posicion: string;
  isActive: boolean;
  goals: GoalEvent[];
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
    goals: GoalEvent[];
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

const initialHalfStats: HalfStats = { firstHalf: 0, secondHalf: 0 };

const createInitialTeamStats = (): TeamStats => ({
  shots: {
    onTarget: { ...initialHalfStats },
    offTarget: { ...initialHalfStats },
    blocked: { ...initialHalfStats },
  },
  turnovers: { ...initialHalfStats },
  steals: { ...initialHalfStats },
  timeouts: { ...initialHalfStats },
});

const createInitialOpponentPlayers = (count: number): OpponentPlayer[] =>
  Array.from({ length: count }, () => ({
    dorsal: '',
    nombre: '',
    goals: [],
    yellowCards: 0,
    redCards: 0,
    faltas: 0,
    paradas: 0,
    golesRecibidos: 0,
    unoVsUno: 0,
  }));

const createGuestPlayerRoster = (): Player[] => [
    { id: 'guest1', dorsal: '1', nombre: 'A. García', posicion: 'Portero', isActive: true, goals: [], yellowCards: 0, redCards: 0, faltas: 0, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
    { id: 'guest2', dorsal: '4', nombre: 'J. López', posicion: 'Cierre', isActive: true, goals: [], yellowCards: 0, redCards: 0, faltas: 0, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
    { id: 'guest3', dorsal: '7', nombre: 'M. Pérez', posicion: 'Ala', isActive: true, goals: [], yellowCards: 0, redCards: 0, faltas: 0, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
    { id: 'guest4', dorsal: '10', nombre: 'C. Ruiz', posicion: 'Pívot', isActive: true, goals: [], yellowCards: 0, redCards: 0, faltas: 0, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
    { id: 'guest5', dorsal: '8', nombre: 'S. Torres', posicion: 'Universal', isActive: false, goals: [], yellowCards: 0, redCards: 0, faltas: 0, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
];


function EstadisticasPageContent() {
  const { user, isRegisteredUser, isSubscribed, isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Roster & Match Info
  const [rosterInfo, setRosterInfo] = useState({ name: 'FutsalDex Demo', campeonato: 'Liga de Exhibición' });
  const [localTeamName, setLocalTeamName] = useState("");
  const [visitorTeamName, setVisitorTeamName] = useState("");
  
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora] = useState("");
  const [campeonato, setCampeonato] = useState("");
  const [jornada, setJornada] = useState("");
  const [tipoPartido, setTipoPartido] = useState("");
  
  // Stats State
  const [myTeamStats, setMyTeamStats] = useState<TeamStats>(createInitialTeamStats());
  const [opponentTeamStats, setOpponentTeamStats] = useState<TeamStats>(createInitialTeamStats());
  const [myTeamPlayers, setMyTeamPlayers] = useState<Player[]>([]);
  const [opponentPlayers, setOpponentPlayers] = useState<OpponentPlayer[]>(createInitialOpponentPlayers(12));
  
  // Control State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);
  const [activeTab, setActiveTab] = useState<'local' | 'visitante'>('local');

  // Derived state to determine which side our roster is on
  const rosterSide = localTeamName === rosterInfo.name && rosterInfo.name ? 'local' : (visitorTeamName === rosterInfo.name && rosterInfo.name ? 'visitante' : null);

  const getTeamDocRef = useCallback(() => {
      if (!user) return null;
      return doc(getFirebaseDb(), 'usuarios', user.uid, 'team', 'roster');
  }, [user]);

  useEffect(() => {
    const fetchTeamRoster = async () => {
      const docRef = getTeamDocRef();
      if (!docRef) {
        setMyTeamPlayers(createGuestPlayerRoster());
        setLocalTeamName('FutsalDex Demo');
        setIsLoadingRoster(false);
        return;
      }
      setIsLoadingRoster(true);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            const rosterName = data.equipo || "";
            const teamInfo = { name: rosterName, campeonato: data.campeonato || "" };
            setRosterInfo(teamInfo);
            
            // Pre-fill match info from team data
            setLocalTeamName(rosterName); // My team starts as local
            setVisitorTeamName(""); // Opponent starts blank
            setCampeonato(data.campeonato || "");

            if (data.players?.length > 0) {
              const roster: Player[] = data.players;
              setMyTeamPlayers(roster.filter(p => p.isActive).map((p: any) => ({
                  id: p.id,
                  dorsal: p.dorsal || '',
                  nombre: p.nombre || 'Sin nombre',
                  posicion: p.posicion || '',
                  isActive: p.isActive !== false,
                  goals: [],
                  yellowCards: 0,
                  redCards: 0,
                  faltas: 0,
                  paradas: 0,
                  golesRecibidos: 0,
                  unoVsUno: 0,
              })));
            }
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
    field: 'yellowCards' | 'redCards' | 'faltas' | 'paradas' | 'golesRecibidos' | 'unoVsUno',
    delta: number
  ) => {
      const setter = team === 'myTeam' ? setMyTeamPlayers : setOpponentPlayers;
      setter(produce(draft => {
          (draft[index] as any)[field] = Math.max(0, (draft[index] as any)[field] + delta);
      }));
  }

  const handleGoalChange = (
    team: 'myTeam' | 'opponentTeam',
    index: number,
    action: 'add' | 'remove'
  ) => {
      if (!isRegisteredUser) return;
      const setter = team === 'myTeam' ? setMyTeamPlayers : setOpponentPlayers;
      
      setter(produce(draft => {
          const player = draft[index] as Player | OpponentPlayer;
          if (action === 'add') {
              const newGoal: GoalEvent = {
                  minute: 0, // No timer on this page, so default to 0
                  second: 0,
                  half: 'firstHalf',
                  id: new Date().toISOString() // Simple unique ID
              };
              player.goals.push(newGoal);
          } else {
              player.goals.pop(); // Remove the last goal
          }
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

  const resetAllStats = () => {
      setMyTeamStats(createInitialTeamStats());
      setOpponentTeamStats(createInitialTeamStats());
      setOpponentPlayers(createInitialOpponentPlayers(12));
      // Reset myTeamPlayers stats to 0 but keep roster info
      setMyTeamPlayers(produce(draft => {
        draft.forEach(p => {
            p.goals = [];
            p.yellowCards = 0;
            p.redCards = 0;
            p.faltas = 0;
            p.paradas = 0;
            p.golesRecibidos = 0;
            p.unoVsUno = 0;
        })
      }));
      setLocalTeamName(rosterInfo.name);
      setVisitorTeamName("");
      setFecha(new Date().toISOString().split('T')[0]);
      setHora("");
      setCampeonato(rosterInfo.campeonato);
      setJornada("");
      setTipoPartido("");
  };

  const handleSaveStats = async () => {
    if (!isRegisteredUser) {
        toast({ title: "Acción Requerida", description: "Debes iniciar sesión para guardar estadísticas.", action: <ToastAction altText="Iniciar Sesión" onClick={() => router.push('/login')}>Iniciar Sesión</ToastAction> });
        return;
    }
    if (!isSubscribed && !isAdmin) {
        toast({ title: "Suscripción Requerida", description: "Necesitas una suscripción Pro para guardar estadísticas.", action: <ToastAction altText="Suscribirse" onClick={() => router.push('/suscripcion')}>Suscribirse</ToastAction> });
        return;
    }
    if (!user) return;

    if (!localTeamName || !visitorTeamName || !fecha) {
        toast({ title: "Faltan datos", description: "Completa el nombre de los equipos y la fecha.", variant: "destructive" });
        return;
    }

    if (!rosterSide) {
      toast({ title: "Asignación de equipo requerida", description: "Por favor, usa el botón 'Usar mi equipo' o escribe el nombre exacto de tu equipo en uno de los campos para asignar tu plantilla antes de guardar.", variant: "destructive", duration: 7000 });
      return;
    }

    const myTeamWasHome = rosterSide === 'local';

    const filterOpponentPlayers = (players: OpponentPlayer[]) => players.filter(p => p.dorsal.trim() !== '' || p.nombre?.trim() !== '' || p.goals.length > 0 || p.redCards > 0 || p.yellowCards > 0 || p.faltas > 0 || p.paradas > 0 || p.golesRecibidos > 0 || p.unoVsUno > 0);
    const filterMyTeamPlayersForSaving = (players: Player[]) => players
      .filter(p => p.dorsal.trim() !== '' && (p.goals.length > 0 || p.redCards > 0 || p.yellowCards > 0 || p.faltas > 0 || p.paradas > 0 || p.golesRecibidos > 0 || p.unoVsUno > 0))
      .map(({posicion, id, isActive, ...rest}) => rest);

    setIsSaving(true);
    
    const matchData = {
        userId: user.uid,
        myTeamName: myTeamWasHome ? localTeamName : visitorTeamName,
        opponentTeamName: myTeamWasHome ? visitorTeamName : localTeamName,
        myTeamWasHome,
        fecha,
        hora: hora || null,
        campeonato,
        jornada,
        tipoPartido: tipoPartido || null,
        myTeamStats: { ...myTeamStats },
        opponentTeamStats: { ...opponentTeamStats },
        myTeamPlayers: filterMyTeamPlayersForSaving(myTeamPlayers),
        opponentPlayers: filterOpponentPlayers(opponentPlayers),
    };

    try {
        const clientDb = getFirebaseDb();
        const collectionRef = collection(clientDb, "partidos_estadisticas");
        await addDoc(collectionRef, {
          ...matchData,
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
    const isMyRosterTeam = team === 'myTeam';
    
    let headerTeamName: string;
    if (isMyRosterTeam) {
        headerTeamName = rosterSide === 'local' ? localTeamName : visitorTeamName;
    } else {
        headerTeamName = rosterSide === 'local' ? visitorTeamName : localTeamName;
    }
      
    const cardTitleColor = isMyRosterTeam ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";

    if (team === 'myTeam' && isLoadingRoster) {
      return (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-muted-foreground">Cargando plantilla...</p>
        </div>
      );
    }
    
    if (team === 'myTeam' && !isLoadingRoster && myTeamPlayers.length === 0 && isRegisteredUser) {
        return (
            <Card>
                 <CardHeader className="p-0">
                    <CardTitle className={`${cardTitleColor} p-2 rounded-t-lg text-base`}>JUGADORES - {headerTeamName || 'Mi Equipo'}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-center">
                    <p className="text-muted-foreground mb-4">No tienes jugadores activos en tu equipo. Ve a "Mi Plantilla" para añadir o activar jugadores.</p>
                    <Button asChild>
                        <Link href="/mi-equipo/plantilla">
                            <Users className="mr-2 h-4 w-4" />
                            Ir a Mi Plantilla
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
                                        disabled={!isRegisteredUser}
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
                                                disabled={!isRegisteredUser}
                                            />
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGoalChange(team, index, 'remove')} disabled={!isRegisteredUser || player.goals.length <= 0}>
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                            <span className="w-6 text-center font-mono text-base">{player.goals.length}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGoalChange(team, index, 'add')} disabled={!isRegisteredUser}>
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter disabled={!isRegisteredUser} value={player.yellowCards} onIncrement={() => handlePlayerStatChange(team, index, 'yellowCards', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'yellowCards', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter disabled={!isRegisteredUser} value={player.redCards} onIncrement={() => handlePlayerStatChange(team, index, 'redCards', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'redCards', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter disabled={!isRegisteredUser} value={player.faltas} onIncrement={() => handlePlayerStatChange(team, index, 'faltas', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'faltas', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter disabled={!isRegisteredUser || (team === 'myTeam' && (player as Player).posicion !== 'Portero')} value={player.paradas} onIncrement={() => handlePlayerStatChange(team, index, 'paradas', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'paradas', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter disabled={!isRegisteredUser || (team === 'myTeam' && (player as Player).posicion !== 'Portero')} value={player.golesRecibidos} onIncrement={() => handlePlayerStatChange(team, index, 'golesRecibidos', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'golesRecibidos', -1)} />
                                    </TableCell>
                                    <TableCell>
                                        <StatCounter disabled={!isRegisteredUser || (team === 'myTeam' && (player as Player).posicion !== 'Portero')} value={player.unoVsUno} onIncrement={() => handlePlayerStatChange(team, index, 'unoVsUno', 1)} onDecrement={() => handlePlayerStatChange(team, index, 'unoVsUno', -1)} />
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
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.shots.onTarget.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'onTarget', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'onTarget', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.shots.onTarget.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'onTarget', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'onTarget', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Fuera</TableHead>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.shots.offTarget.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'offTarget', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'offTarget', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.shots.offTarget.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'offTarget', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'offTarget', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Bloqueados</TableHead>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.shots.blocked.firstHalf} onIncrement={() => handleStatChange(team, ['shots', 'blocked', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'blocked', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.shots.blocked.secondHalf} onIncrement={() => handleStatChange(team, ['shots', 'blocked', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['shots', 'blocked', 'secondHalf'], -1)}/></TableCell>
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
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.timeouts.firstHalf} onIncrement={() => handleStatChange(team, ['timeouts', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['timeouts', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.timeouts.secondHalf} onIncrement={() => handleStatChange(team, ['timeouts', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['timeouts', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                             <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Pérdidas</TableHead>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.turnovers.firstHalf} onIncrement={() => handleStatChange(team, ['turnovers', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['turnovers', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.turnovers.secondHalf} onIncrement={() => handleStatChange(team, ['turnovers', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['turnovers', 'secondHalf'], -1)}/></TableCell>
                            </TableRow>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Robos</TableHead>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.steals.firstHalf} onIncrement={() => handleStatChange(team, ['steals', 'firstHalf'], 1)} onDecrement={() => handleStatChange(team, ['steals', 'firstHalf'], -1)}/></TableCell>
                                <TableCell><StatCounter disabled={!isRegisteredUser} value={stats.steals.secondHalf} onIncrement={() => handleStatChange(team, ['steals', 'secondHalf'], 1)} onDecrement={() => handleStatChange(team, ['steals', 'secondHalf'], -1)}/></TableCell>
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
                <BarChart2 className="mr-3 h-8 w-8"/>
                Registrar Estadísticas de Partido
            </h1>
            <p className="text-lg text-foreground/80">
                Introduce los datos y estadísticas del partido en tiempo real.
            </p>
        </div>
        <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
                <Link href="/estadisticas/historial">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Historial
                </Link>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!isRegisteredUser}>
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

            <Button onClick={resetAllStats} variant="outline" disabled={!isRegisteredUser}>
                <RotateCcw className="mr-2 h-4 w-4"/>
                Reiniciar
            </Button>
            <Button onClick={handleSaveStats} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
            </Button>
        </div>
      </header>

       {!isRegisteredUser && (
            <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
                <Info className="h-4 w-4 text-blue-700" />
                <AlertTitle className="text-blue-800 font-semibold">Modo de Demostración</AlertTitle>
                <AlertDescription>
                    Estás viendo la interfaz de registro de estadísticas con un equipo de ejemplo. Las acciones de guardar, reiniciar y editar están desactivadas. Para usar esta función con tu equipo, por favor{" "}
                    <Link href="/register" className="font-bold underline">regístrate</Link> o{" "}
                    <Link href="/login" className="font-bold underline">inicia sesión</Link>.
                </AlertDescription>
            </Alert>
        )}
      
      <Card className="mb-6">
        <CardHeader>
            <CardTitle>Información del Partido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Label htmlFor="localTeamName">Equipo Local</Label>
                    <div className="flex gap-2 items-center">
                        <Input id="localTeamName" value={localTeamName} onChange={(e) => setLocalTeamName(e.target.value)} placeholder="Nombre del equipo local" disabled={!isRegisteredUser} />
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSetMyTeam('local')} className="px-3 text-xs shrink-0" disabled={!isRegisteredUser}>Usar mi equipo</Button>
                    </div>
                </div>
                <div>
                    <Label htmlFor="visitorTeamName">Equipo Visitante</Label>
                     <div className="flex gap-2 items-center">
                        <Input id="visitorTeamName" value={visitorTeamName} onChange={(e) => setVisitorTeamName(e.target.value)} placeholder="Nombre del equipo visitante" disabled={!isRegisteredUser} />
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSetMyTeam('visitante')} className="px-3 text-xs shrink-0" disabled={!isRegisteredUser}>Usar mi equipo</Button>
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>


      <Tabs defaultValue="local" className="w-full" onValueChange={(val) => val && setActiveTab(val as 'local' | 'visitante')} value={activeTab}>
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local">{localTeamName || 'Equipo Local'}</TabsTrigger>
            <TabsTrigger value="visitante">{visitorTeamName || 'Equipo Visitante'}</TabsTrigger>
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

export default function EstadisticasPage() {
  return (
    <EstadisticasPageContent />
  );
}
