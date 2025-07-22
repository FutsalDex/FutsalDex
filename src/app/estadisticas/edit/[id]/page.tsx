
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Plus, Minus, RotateCcw, RectangleVertical, Save, Loader2, History, FileText, ArrowLeft, Edit, Info, Play, Pause, ShieldAlert, CheckCircle, Settings } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { produce } from "immer";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { getFirebaseDb } from "@/lib/firebase";
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
  faltas: HalfStats;
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
  faltas: { ...initialHalfStats },
});

// Demo data creators
const createGuestPlayerRosterWithStats = (): Player[] => [
    { id: 'guest1', dorsal: '1', nombre: 'A. García', posicion: 'Portero', isActive: true, goals: [], yellowCards: 0, redCards: 0, faltas: 1, paradas: 8, golesRecibidos: 2, unoVsUno: 3 },
    { id: 'guest2', dorsal: '4', nombre: 'J. López', posicion: 'Cierre', isActive: true, goals: [{ id: 'g1', minute: 12, second: 30, half: 'firstHalf' }], yellowCards: 1, redCards: 0, faltas: 3, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
    { id: 'guest3', dorsal: '7', nombre: 'M. Pérez', posicion: 'Ala', isActive: true, goals: [{ id: 'g2', minute: 28, second: 15, half: 'secondHalf' }, { id: 'g3', minute: 35, second: 0, half: 'secondHalf' }], yellowCards: 0, redCards: 0, faltas: 2, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
    { id: 'guest4', dorsal: '10', nombre: 'C. Ruiz', posicion: 'Pívot', isActive: true, goals: [{ id: 'g4', minute: 18, second: 45, half: 'firstHalf' }], yellowCards: 0, redCards: 0, faltas: 1, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
    { id: 'guest5', dorsal: '8', nombre: 'S. Torres', posicion: 'Ala-Cierre', isActive: false, goals: [], yellowCards: 0, redCards: 0, faltas: 0, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
];

const createGuestOpponentPlayersWithStats = (): OpponentPlayer[] => {
    const players = [
        { dorsal: '9', nombre: 'Delantero Estrella', goals: [{ id: 'g5', minute: 8, second: 0, half: 'firstHalf' }], yellowCards: 0, redCards: 0, faltas: 4, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
        { dorsal: '6', nombre: 'Medio Creativo', goals: [{ id: 'g6', minute: 31, second: 22, half: 'secondHalf' }], yellowCards: 1, redCards: 0, faltas: 2, paradas: 0, golesRecibidos: 0, unoVsUno: 0 },
    ];
    const emptyOpponents = Array.from({ length: Math.max(0, 12 - players.length) }, () => ({ dorsal: '', nombre: '', goals: [], yellowCards: 0, redCards: 0, faltas: 0, paradas: 0, golesRecibidos: 0, unoVsUno: 0 }));
    return [...players, ...emptyOpponents];
};

const createGuestTeamStats = (isMyTeam: boolean): TeamStats => {
    if (isMyTeam) {
        return {
            shots: { onTarget: { firstHalf: 5, secondHalf: 7 }, offTarget: { firstHalf: 3, secondHalf: 4 }, blocked: { firstHalf: 1, secondHalf: 2 } },
            turnovers: { firstHalf: 6, secondHalf: 8 },
            steals: { firstHalf: 9, secondHalf: 11 },
            timeouts: { firstHalf: 1, secondHalf: 0 },
            faltas: { firstHalf: 4, secondHalf: 3 },
        };
    }
    return {
        shots: { onTarget: { firstHalf: 4, secondHalf: 6 }, offTarget: { firstHalf: 2, secondHalf: 3 }, blocked: { firstHalf: 3, secondHalf: 1 } },
        turnovers: { firstHalf: 10, secondHalf: 9 },
        steals: { firstHalf: 5, secondHalf: 7 },
        timeouts: { firstHalf: 0, secondHalf: 1 },
        faltas: { firstHalf: 2, secondHalf: 5 },
    };
};

type AutoSaveStatus = "unsaved" | "saving" | "saved";


function EditMatchPageContent() {
  const { user, isRegisteredUser, isSubscribed, isAdmin } = useAuth();
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
  const [myTeamSide, setMyTeamSide] = useState<'local' | 'visitante' | null>(null);
  
  // Stats State
  const [myTeamStats, setMyTeamStats] = useState<TeamStats | null>(null);
  const [opponentTeamStats, setOpponentTeamStats] = useState<TeamStats | null>(null);
  const [myTeamPlayers, setMyTeamPlayers] = useState<Player[]>([]);
  const [opponentPlayers, setOpponentPlayers] = useState<OpponentPlayer[]>([]);
  
  // Control State
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'local' | 'visitante'>('local');

  // Timer State
  const [timerDuration, setTimerDuration] = useState(25 * 60); // Default 25 minutes in seconds
  const [time, setTime] = useState(timerDuration);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [activeHalf, setActiveHalf] = useState<'firstHalf' | 'secondHalf'>('firstHalf');

  // Autosave State
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("saved");
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fullMatchState = useMemo(() => {
    return {
      localTeamName, visitorTeamName, fecha, hora, campeonato, jornada, tipoPartido, myTeamSide,
      myTeamStats, opponentTeamStats, myTeamPlayers, opponentPlayers, timerDuration,
    };
  }, [localTeamName, visitorTeamName, fecha, hora, campeonato, jornada, tipoPartido, myTeamSide,
      myTeamStats, opponentTeamStats, myTeamPlayers, opponentPlayers, timerDuration]);

  const handleUpdateStats = useCallback(async (isAutoSave = false) => {
    if (!isRegisteredUser || !isSubscribed && !isAdmin) {
      if (!isAutoSave) toast({ title: "Suscripción Requerida", description: "Necesitas una suscripción Pro para guardar partidos.", action: <ToastAction altText="Suscribirse" onClick={() => router.push('/suscripcion')}>Suscribirse</ToastAction> });
      return false;
    }
    if (!user || !matchId) return false;
    if (!myTeamSide) {
      if (!isAutoSave) toast({ title: "Asignación de equipo requerida", description: "Por favor, usa el botón 'Usar mi equipo' para asignar tu plantilla antes de guardar.", variant: "destructive", duration: 7000 });
      return false;
    }

    if (!isAutoSave) setIsSaving(true);
    setAutoSaveStatus("saving");

    const filterOpponentPlayers = (players: OpponentPlayer[]) => players.filter(p => p.dorsal.trim() !== '' || p.nombre?.trim() !== '' || p.goals.length > 0 || p.redCards > 0 || p.yellowCards > 0 || p.faltas > 0 || p.paradas > 0 || p.golesRecibidos > 0 || p.unoVsUno > 0);
    
    // Create a clean representation of my team's players for saving.
    const filterMyTeamPlayersForSaving = (players: Player[]) => players
      .filter(p => p.dorsal.trim() !== '' && (p.goals.length > 0 || p.yellowCards > 0 || p.redCards > 0 || p.faltas > 0 || p.paradas > 0 || p.golesRecibidos > 0 || p.unoVsUno > 0))
      .map(({posicion, isActive, id, nombre, ...rest}) => ({
          dorsal: rest.dorsal,
          goals: rest.goals,
          yellowCards: rest.yellowCards,
          redCards: rest.redCards,
          faltas: rest.faltas,
          paradas: rest.paradas,
          golesRecibidos: rest.golesRecibidos,
          unoVsUno: rest.unoVsUno,
      }));


    const myTeamWasHome = myTeamSide === 'local';
    const finalMyTeamName = myTeamSide === 'local' ? localTeamName : visitorTeamName;
    const finalOpponentTeamName = myTeamSide === 'local' ? visitorTeamName : localTeamName;

    const updatedData = {
       myTeamName: finalMyTeamName,
       opponentTeamName: finalOpponentTeamName,
       myTeamWasHome,
       fecha, hora, campeonato, jornada, tipoPartido,
       myTeamStats, opponentTeamStats,
       myTeamPlayers: filterMyTeamPlayersForSaving(myTeamPlayers),
       opponentPlayers: filterOpponentPlayers(opponentPlayers),
       timer: { duration: timerDuration },
       updatedAt: serverTimestamp(),
    };

    try {
       const db = getFirebaseDb();
       const matchDocRef = doc(db, "partidos_estadisticas", matchId);
       await updateDoc(matchDocRef, updatedData);
       if (!isAutoSave) {
          toast({ title: "Partido Guardado", description: "Los cambios se han guardado correctamente." });
          router.push(`/estadisticas/historial`);
       } else {
          setAutoSaveStatus("saved");
       }
       return true;
    } catch (error) {
       console.error("Error updating match:", error);
       if (!isAutoSave) toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
       setAutoSaveStatus("unsaved");
       return false;
    } finally {
       if (!isAutoSave) setIsSaving(false);
    }
  }, [isRegisteredUser, isSubscribed, isAdmin, user, matchId, myTeamSide, localTeamName, visitorTeamName, fecha, hora, campeonato, jornada, tipoPartido, myTeamStats, opponentTeamStats, myTeamPlayers, opponentPlayers, timerDuration, toast, router]);


  useEffect(() => {
    // This effect triggers the autosave
    if (isLoading) return; // Don't save while initial data is loading
    
    setAutoSaveStatus("unsaved");
    if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
        handleUpdateStats(true); // Call the save function as an autosave
    }, 3000); // 3-second debounce time

    return () => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullMatchState, isLoading]); // Depend on the memoized full state

  const myTeamTotalFouls = useMemo(() => {
    if (!myTeamStats) return 0;
    return myTeamStats.faltas[activeHalf]
  }, [myTeamStats, activeHalf]);

  const opponentTeamTotalFouls = useMemo(() => {
    if (!opponentTeamStats) return 0;
    return opponentTeamStats.faltas[activeHalf]
  }, [opponentTeamStats, activeHalf]);

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerActive && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isTimerActive && time === 0) {
      setIsTimerActive(false);
      toast({
        title: "Final de la parte",
        description: `El tiempo para la ${activeHalf === 'firstHalf' ? 'primera' : 'segunda'} parte ha terminado.`,
      });
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, time, activeHalf, toast]);
  
  const formatTime = useMemo(() => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [time]);
  
  const handleResetTimer = () => {
    setIsTimerActive(false);
    setTime(timerDuration);
  };
  
  const handleDurationChange = (minutes: number) => {
    setTimerDuration(minutes * 60);
    setTime(minutes * 60);
  }

  useEffect(() => {
    const setupDemoMode = () => {
        setIsLoading(true);
        setLocalTeamName("FutsalDex Demo");
        setVisitorTeamName("Rivales Legendarios");
        setFecha("2024-05-20");
        setHora("20:00");
        setCampeonato("Liga de Exhibición");
        setJornada("Jornada 5");
        setTipoPartido("Liga");
        setMyTeamSide('local');
        setActiveTab('local');
        setNotFound(false);
        
        setMyTeamPlayers(createGuestPlayerRosterWithStats());
        setOpponentPlayers(createGuestOpponentPlayersWithStats());
        setMyTeamStats(createGuestTeamStats(true));
        setOpponentTeamStats(createGuestTeamStats(false));

        setIsLoading(false);
        setAutoSaveStatus("saved");
    };

    const fetchMatchAndRoster = async () => {
      if (!user || !matchId) {
        setIsLoading(false); 
        return;
      }
      setIsLoading(true);

      try {
        const db = getFirebaseDb();
        const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');
        const matchDocRef = doc(db, "partidos_estadisticas", matchId);
        
        const [rosterSnap, matchSnap] = await Promise.all([
          getDoc(rosterDocRef),
          getDoc(matchDocRef)
        ]);
        
        if (!matchSnap.exists() || matchSnap.data().userId !== user.uid) {
            setNotFound(true);
            setIsLoading(false);
            return;
        }

        const matchData = matchSnap.data();
        const rosterData = rosterSnap.exists() ? rosterSnap.data() : { players: [], equipo: '', campeonato: '' };
        
        const currentRosterPlayers = (rosterData.players || []).filter((p: any) => p.isActive) as Player[];
        const savedMatchPlayers = (matchData.myTeamPlayers || []) as { dorsal: string; goals: GoalEvent[]; yellowCards: number; redCards: number; faltas: number; paradas: number; golesRecibidos: number; unoVsUno: number }[];

        // Merge roster with saved match data
        const mergedMyTeamPlayers = currentRosterPlayers.map(rosterPlayer => {
            const savedPlayerData = savedMatchPlayers.find(p => p.dorsal === rosterPlayer.dorsal);
            return {
                ...rosterPlayer,
                goals: savedPlayerData?.goals || [],
                yellowCards: savedPlayerData?.yellowCards || 0,
                redCards: savedPlayerData?.redCards || 0,
                faltas: savedPlayerData?.faltas || 0,
                paradas: savedPlayerData?.paradas || 0,
                golesRecibidos: savedPlayerData?.golesRecibidos || 0,
                unoVsUno: savedPlayerData?.unoVsUno || 0,
            };
        });

        setMyTeamPlayers(mergedMyTeamPlayers);
        setRosterInfo({ name: rosterData.equipo || '', campeonato: rosterData.campeonato || '' });

        if (matchData.myTeamWasHome) {
            setLocalTeamName(matchData.myTeamName || rosterData.equipo || "Mi Equipo");
            setVisitorTeamName(matchData.opponentTeamName || "Oponente");
            setMyTeamSide('local');
            setActiveTab('local');
        } else {
            setLocalTeamName(matchData.opponentTeamName || "Oponente");
            setVisitorTeamName(matchData.myTeamName || rosterData.equipo || "Mi Equipo");
            setMyTeamSide('visitante');
            setActiveTab('visitante');
        }
        
        const mergeWithDefaults = (data?: Partial<TeamStats>): TeamStats => {
            const defaults = createInitialTeamStats();
            if (!data) return defaults;
            return {
                ...defaults,
                ...data,
                shots: {
                    onTarget: { ...defaults.shots.onTarget, ...data.shots?.onTarget },
                    offTarget: { ...defaults.shots.offTarget, ...data.shots?.offTarget },
                    blocked: { ...defaults.shots.blocked, ...data.shots?.blocked },
                },
                turnovers: { ...defaults.turnovers, ...data.turnovers },
                steals: { ...defaults.steals, ...data.steals },
                timeouts: { ...defaults.timeouts, ...data.timeouts },
                faltas: { ...defaults.faltas, ...data.faltas },
            };
        };
        
        setFecha(matchData.fecha || "");
        setHora(matchData.hora || "");
        setCampeonato(matchData.campeonato || "");
        setJornada(matchData.jornada || "");
        setTipoPartido(matchData.tipoPartido || "");
        setMyTeamStats(mergeWithDefaults(matchData.myTeamStats));
        setOpponentTeamStats(mergeWithDefaults(matchData.opponentTeamStats));
        setTime(matchData.timer?.duration || 25 * 60);
        setTimerDuration(matchData.timer?.duration || 25 * 60);
        
        const savedOpponents = (matchData.opponentPlayers || []).map((p: any) => ({
            ...p,
            goals: (p.goals && Array.isArray(p.goals)) ? p.goals : [],
        }));
        const emptyOpponents = Array.from({ length: Math.max(0, 12 - savedOpponents.length) }, () => ({ dorsal: '', nombre: '', goals: [], yellowCards: 0, redCards: 0, faltas: 0, paradas: 0, golesRecibidos: 0, unoVsUno: 0 }));
        setOpponentPlayers([...savedOpponents, ...emptyOpponents]);

      } catch (error) {
        console.error("Error fetching data for edit:", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos del partido.", variant: "destructive" });
        setNotFound(true);
      } finally {
        setIsLoading(false);
        setAutoSaveStatus("saved");
      }
    };
    
    if (isRegisteredUser) {
        fetchMatchAndRoster();
    } else {
        setupDemoMode();
    }
  }, [isRegisteredUser, user, matchId, toast]);

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

      if(field === 'faltas') {
        const teamSetter = team === 'myTeam' ? setMyTeamStats : setOpponentTeamStats;
        teamSetter(produce(draft => {
            if(draft) {
                draft.faltas[activeHalf] = Math.max(0, draft.faltas[activeHalf] + delta);
            }
        }));
      }
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
          // Ensure goals is an array before pushing
          if (!Array.isArray(player.goals)) {
            player.goals = [];
          }

          if (action === 'add') {
              let totalSeconds = timerDuration - time;
              let currentMinute = Math.floor(totalSeconds / 60);

              if (activeHalf === 'secondHalf') {
                  currentMinute += Math.floor(timerDuration / 60); 
              }

              const newGoal: GoalEvent = {
                  minute: currentMinute,
                  second: totalSeconds % 60,
                  half: activeHalf,
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
      setLocalTeamName(rosterInfo.name);
    } else { // visitor
      setVisitorTeamName(rosterInfo.name);
    }
    setMyTeamSide(side);
  };

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
  
    const renderPlayerTable = (isLocalTab: boolean) => {
        const isMyTeamInThisTab = (isLocalTab && myTeamSide === 'local') || (!isLocalTab && myTeamSide === 'visitante');
        const players = isMyTeamInThisTab ? myTeamPlayers : opponentPlayers;
        const headerTeamName = isLocalTab ? localTeamName : visitorTeamName;
        const cardTitleColor = isMyTeamInThisTab ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";
        const teamType = isMyTeamInThisTab ? 'myTeam' : 'opponentTeam';

        return (
            <Card>
                <CardHeader className="p-0">
                    <CardTitle className={`${cardTitleColor} p-2 rounded-t-lg text-base`}>JUGADORES - {headerTeamName || (isMyTeamInThisTab ? "Mi Equipo" : "Equipo Contrario")}</CardTitle>
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
                                    <TableRow key={(player as Player).id || index}>
                                        <TableCell className="px-1">
                                          <Input 
                                            className="h-8 text-xs w-full" 
                                            placeholder="Nº" 
                                            value={player.dorsal} 
                                            onChange={(e) => teamType === 'opponentTeam' && handleOpponentDorsalChange(index, e.target.value)}
                                            readOnly={teamType === 'myTeam'}
                                            type="text" 
                                            disabled={!isRegisteredUser}
                                          />
                                        </TableCell>
                                        <TableCell className="font-medium text-xs px-1">
                                            {teamType === 'myTeam' ? 
                                                (player as Player).nombre : 
                                                <Input 
                                                    className="h-8 text-xs w-full" 
                                                    placeholder="Nombre" 
                                                    value={(player as OpponentPlayer).nombre || ''}
                                                    onChange={(e) => teamType === 'opponentTeam' && handleOpponentNameChange(index, e.target.value)}
                                                    disabled={!isRegisteredUser}
                                                />
                                            }
                                        </TableCell>
                                        <TableCell>
                                           <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGoalChange(teamType, index, 'remove')} disabled={!isRegisteredUser || (player.goals?.length || 0) <= 0}>
                                                    <Minus className="h-4 w-4" />
                                                </Button>
                                                <span className="w-6 text-center font-mono text-base">{player.goals?.length || 0}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleGoalChange(teamType, index, 'add')} disabled={!isRegisteredUser}>
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatCounter value={player.yellowCards} onIncrement={() => handlePlayerStatChange(teamType, index, 'yellowCards', 1)} onDecrement={() => handlePlayerStatChange(teamType, index, 'yellowCards', -1)} disabled={!isRegisteredUser}/>
                                        </TableCell>
                                        <TableCell>
                                            <StatCounter value={player.redCards} onIncrement={() => handlePlayerStatChange(teamType, index, 'redCards', 1)} onDecrement={() => handlePlayerStatChange(teamType, index, 'redCards', -1)} disabled={!isRegisteredUser}/>
                                        </TableCell>
                                        <TableCell>
                                            <StatCounter value={player.faltas} onIncrement={() => handlePlayerStatChange(teamType, index, 'faltas', 1)} onDecrement={() => handlePlayerStatChange(teamType, index, 'faltas', -1)} disabled={!isRegisteredUser}/>
                                        </TableCell>
                                        <TableCell>
                                            <StatCounter value={player.paradas} onIncrement={() => handlePlayerStatChange(teamType, index, 'paradas', 1)} onDecrement={() => handlePlayerStatChange(teamType, index, 'paradas', -1)} disabled={!isRegisteredUser || (teamType === 'myTeam' && (player as Player).posicion !== 'Portero')} />
                                        </TableCell>
                                        <TableCell>
                                            <StatCounter value={player.golesRecibidos} onIncrement={() => handlePlayerStatChange(teamType, index, 'golesRecibidos', 1)} onDecrement={() => handlePlayerStatChange(teamType, index, 'golesRecibidos', -1)} disabled={!isRegisteredUser || (teamType === 'myTeam' && (player as Player).posicion !== 'Portero')} />
                                        </TableCell>
                                        <TableCell>
                                            <StatCounter value={player.unoVsUno} onIncrement={() => handlePlayerStatChange(teamType, index, 'unoVsUno', 1)} onDecrement={() => handlePlayerStatChange(teamType, index, 'unoVsUno', -1)} disabled={!isRegisteredUser || (teamType === 'myTeam' && (player as Player).posicion !== 'Portero')} />
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

  const renderTeamStats = (isLocalTab: boolean) => {
    const isMyTeamInThisTab = (isLocalTab && myTeamSide === 'local') || (!isLocalTab && myTeamSide === 'visitante');
    const stats = isMyTeamInThisTab ? myTeamStats : opponentTeamStats;
    if (!stats) return null;

    const headerTeamName = isLocalTab ? localTeamName : visitorTeamName;
    const cardTitleColor = isMyTeamInThisTab ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";
    const teamType = isMyTeamInThisTab ? 'myTeam' : 'opponentTeam';

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader className="p-0">
                    <CardTitle className={`${cardTitleColor} p-2 rounded-t-lg text-base`}>TIROS A PUERTA - {headerTeamName || (isMyTeamInThisTab ? "Mi Equipo" : "Equipo Contrario")}</CardTitle>
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
                                <TableCell><StatCounter value={stats.shots.onTarget.firstHalf} onIncrement={() => handleStatChange(teamType, ['shots', 'onTarget', 'firstHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['shots', 'onTarget', 'firstHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.onTarget.secondHalf} onIncrement={() => handleStatChange(teamType, ['shots', 'onTarget', 'secondHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['shots', 'onTarget', 'secondHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                            </TableRow>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Fuera</TableHead>
                                <TableCell><StatCounter value={stats.shots.offTarget.firstHalf} onIncrement={() => handleStatChange(teamType, ['shots', 'offTarget', 'firstHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['shots', 'offTarget', 'firstHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.offTarget.secondHalf} onIncrement={() => handleStatChange(teamType, ['shots', 'offTarget', 'secondHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['shots', 'offTarget', 'secondHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                            </TableRow>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Bloqueados</TableHead>
                                <TableCell><StatCounter value={stats.shots.blocked.firstHalf} onIncrement={() => handleStatChange(teamType, ['shots', 'blocked', 'firstHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['shots', 'blocked', 'firstHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                                <TableCell><StatCounter value={stats.shots.blocked.secondHalf} onIncrement={() => handleStatChange(teamType, ['shots', 'blocked', 'secondHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['shots', 'blocked', 'secondHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="p-0">
                    <CardTitle className={`${cardTitleColor} p-2 rounded-t-lg text-base`}>EVENTOS DEL PARTIDO - {headerTeamName || (isMyTeamInThisTab ? "Mi Equipo" : "Equipo Contrario")}</CardTitle>
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
                                <TableCell><StatCounter value={stats.timeouts.firstHalf} onIncrement={() => handleStatChange(teamType, ['timeouts', 'firstHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['timeouts', 'firstHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                                <TableCell><StatCounter value={stats.timeouts.secondHalf} onIncrement={() => handleStatChange(teamType, ['timeouts', 'secondHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['timeouts', 'secondHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                            </TableRow>
                             <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Pérdidas</TableHead>
                                <TableCell><StatCounter value={stats.turnovers.firstHalf} onIncrement={() => handleStatChange(teamType, ['turnovers', 'firstHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['turnovers', 'firstHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                                <TableCell><StatCounter value={stats.turnovers.secondHalf} onIncrement={() => handleStatChange(teamType, ['turnovers', 'secondHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['turnovers', 'secondHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                            </TableRow>
                            <TableRow className="text-sm">
                                <TableHead className="font-semibold text-xs">Robos</TableHead>
                                <TableCell><StatCounter value={stats.steals.firstHalf} onIncrement={() => handleStatChange(teamType, ['steals', 'firstHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['steals', 'firstHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                                <TableCell><StatCounter value={stats.steals.secondHalf} onIncrement={() => handleStatChange(teamType, ['steals', 'secondHalf'], 1)} onDecrement={() => handleStatChange(teamType, ['steals', 'secondHalf'], -1)} disabled={!isRegisteredUser}/></TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
  }
  
  const AutoSaveIndicator = () => {
    let content;
    switch (autoSaveStatus) {
      case "saving":
        content = <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>;
        break;
      case "saved":
        content = <><CheckCircle className="h-4 w-4 text-green-500" /> Guardado</>;
        break;
      case "unsaved":
        content = <>Cambios sin guardar</>;
        break;
      default:
        content = null;
    }
    return <div className="flex items-center gap-2 text-sm text-muted-foreground">{content}</div>;
  }

  const myTeamScore = myTeamPlayers.reduce((acc, p) => acc + (p.goals?.length || 0), 0);
  const opponentTeamScore = opponentPlayers.reduce((acc, p) => acc + (p.goals?.length || 0), 0);
  
  const localScore = myTeamSide === 'local' ? myTeamScore : opponentTeamScore;
  const visitorScore = myTeamSide === 'visitante' ? myTeamScore : opponentTeamScore;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                <BarChart2 className="mr-3 h-8 w-8"/>
                Marcador y Estadísticas en Vivo
            </h1>
            <p className="text-lg text-foreground/80">
                Gestiona el partido en tiempo real.
            </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <AutoSaveIndicator />
            <Button asChild variant="outline">
                <Link href={`/estadisticas/historial`}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Cancelar
                </Link>
            </Button>
            <Button onClick={() => handleUpdateStats(false)} disabled={isSaving || !isRegisteredUser}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar y Salir
            </Button>
        </div>
      </header>
       
       {!isRegisteredUser && (
            <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
                <Info className="h-4 w-4 text-blue-700" />
                <AlertTitle className="text-blue-800 font-semibold">Modo de Demostración</AlertTitle>
                <AlertDescription>
                    Estás viendo la interfaz de edición con un partido de ejemplo. Las acciones de guardar, editar y los contadores están desactivados. Para usar esta función con tu equipo, por favor{" "}
                    <Link href="/register" className="font-bold underline">regístrate</Link> o{" "}
                    <Link href="/login" className="font-bold underline">inicia sesión</Link>.
                </AlertDescription>
            </Alert>
        )}

      <Card className="mb-6 text-center">
        <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-around w-full">
                <div className="flex-1">
                    <p className="font-bold truncate text-lg">{localTeamName}</p>
                     {myTeamSide === 'local' && myTeamTotalFouls >= 5 && <ShieldAlert className="mx-auto mt-1 h-5 w-5 text-destructive" />}
                </div>
                <div className="flex-1 text-4xl font-bold text-primary">
                   {localScore} - {visitorScore}
                </div>
                <div className="flex-1">
                    <p className="font-bold truncate text-lg">{visitorTeamName}</p>
                    {myTeamSide === 'visitante' && myTeamTotalFouls >= 5 && <ShieldAlert className="mx-auto mt-1 h-5 w-5 text-destructive" />}
                    {myTeamSide !== 'visitante' && opponentTeamTotalFouls >= 5 && <ShieldAlert className="mx-auto mt-1 h-5 w-5 text-destructive" />}
                </div>
            </div>
             <div className="bg-primary text-primary-foreground rounded-lg px-6 py-2 my-2 inline-block">
                <h1 className="text-5xl font-bold tracking-widest font-mono">{formatTime}</h1>
            </div>
            <div className="flex justify-center items-center gap-2 flex-wrap">
                <Button onClick={() => setIsTimerActive(!isTimerActive)} className="w-28" variant={isTimerActive ? 'destructive' : 'default'} disabled={!isRegisteredUser}>
                    {isTimerActive ? <Pause className="mr-2" /> : <Play className="mr-2" />}
                    {isTimerActive ? 'Pausar' : 'Iniciar'}
                </Button>
                <Button onClick={handleResetTimer} variant="outline" disabled={!isRegisteredUser}>
                    <RotateCcw className="mr-2"/>
                    Reiniciar
                </Button>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setActiveHalf('firstHalf')} variant={activeHalf === 'firstHalf' ? 'secondary' : 'outline'} size="sm" disabled={!isRegisteredUser}>1ª Parte</Button>
                    <Button onClick={() => setActiveHalf('secondHalf')} variant={activeHalf === 'secondHalf' ? 'secondary' : 'outline'} size="sm" disabled={!isRegisteredUser}>2ª Parte</Button>
                </div>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" disabled={!isRegisteredUser}><Settings className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-xs">
                        <DialogHeader>
                            <DialogTitle>Ajustes del Crono</DialogTitle>
                            <DialogDescription>
                                Selecciona la duración de cada parte del partido. Esto reiniciará el temporizador.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Label htmlFor="duration-select">Minutos por parte</Label>
                            <Select
                                value={(timerDuration / 60).toString()}
                                onValueChange={(val) => handleDurationChange(parseInt(val, 10))}
                            >
                                <SelectTrigger id="duration-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15">15 minutos</SelectItem>
                                    <SelectItem value="20">20 minutos</SelectItem>
                                    <SelectItem value="25">25 minutos</SelectItem>
                                    <SelectItem value="30">30 minutos</SelectItem>
                                    <SelectItem value="40">40 minutos</SelectItem>
                                    <SelectItem value="45">45 minutos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button>Aceptar</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
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
                {renderPlayerTable(true)}
                {renderTeamStats(true)}
            </div>
        </TabsContent>
        <TabsContent value="visitante">
             <div className="space-y-6 pt-6">
                {renderPlayerTable(false)}
                {renderTeamStats(false)}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EditMatchPage() {
  return (
    <EditMatchPageContent />
  );
}
