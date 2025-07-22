
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Minus, RotateCcw, RectangleVertical, Play, Pause, AlertTriangle } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { produce } from "immer";
import { useAuth } from "@/contexts/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";

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
  id: string;
  dorsal: string;
  nombre: string;
  posicion: string;
  goals: number;
  yellowCards: number;
  redCards: number;
  faltas: number;
}

function MisPartidillosPageContent() {
  const { user, isRegisteredUser } = useAuth();
  const { toast } = useToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [localScore, setLocalScore] = useState(0);
  const [visitorScore, setVisitorScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Timer State
  const [time, setTime] = useState(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [activeHalf, setActiveHalf] = useState<'firstHalf' | 'secondHalf'>('firstHalf');

  const fetchRoster = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const db = getFirebaseDb();
        const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');
        const rosterSnap = await getDoc(rosterDocRef);

        if (rosterSnap.exists()) {
            const rosterData = rosterSnap.data().players || [];
            const activePlayers = rosterData
                .filter((p: any) => p.isActive)
                .map((p: any) => ({
                    ...p,
                    goals: 0,
                    yellowCards: 0,
                    redCards: 0,
                    faltas: 0
                }));
            setPlayers(activePlayers);
        }
    } catch (error) {
        console.error("Error fetching roster:", error);
        toast({ title: "Error", description: "No se pudo cargar la plantilla.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (isRegisteredUser) {
        fetchRoster();
    } else {
        setIsLoading(false);
    }
  }, [isRegisteredUser, fetchRoster]);

  const handlePlayerStatChange = (
    playerId: string,
    field: 'goals' | 'yellowCards' | 'redCards' | 'faltas',
    delta: number
  ) => {
    setPlayers(produce(draft => {
        const player = draft.find(p => p.id === playerId);
        if (player) {
            (player as any)[field] = Math.max(0, player[field] + delta);
        }
    }));
  };
  
  const resetAllStats = () => {
    setLocalScore(0);
    setVisitorScore(0);
    setPlayers(produce(draft => {
        draft.forEach(p => {
            p.goals = 0;
            p.yellowCards = 0;
            p.redCards = 0;
            p.faltas = 0;
        })
    }));
    handleResetTimer();
    toast({ title: "Estadísticas Reiniciadas", description: "El marcador y las estadísticas de los jugadores se han restablecido." });
  }

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
    setTime(25 * 60);
  };
  
  if (!isRegisteredUser && !isLoading) {
    return (
        <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
                    <CardTitle className="text-2xl font-headline text-destructive">Acceso Restringido</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription>
                        Necesitas iniciar sesión y tener una suscripción activa para usar esta funcionalidad.
                    </CardDescription>
                    <Button asChild variant="default" className="mt-4">
                        <Link href="/login">Iniciar Sesión</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Marcador de Partidillos</h1>
        <p className="text-lg text-foreground/80">Gestiona un partido rápido en tiempo real.</p>
      </header>
       
      <Card className="mb-6 text-center">
        <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-around w-full">
                <div className="flex-1">
                    <p className="font-bold truncate text-lg">Equipo Local</p>
                    <StatCounter value={localScore} onIncrement={() => setLocalScore(s => s + 1)} onDecrement={() => setLocalScore(s => s - 1)} />
                </div>
                <div className="flex-1 text-4xl font-bold text-primary">
                   {localScore} - {visitorScore}
                </div>
                <div className="flex-1">
                    <p className="font-bold truncate text-lg">Equipo Visitante</p>
                    <StatCounter value={visitorScore} onIncrement={() => setVisitorScore(s => s + 1)} onDecrement={() => setVisitorScore(s => s - 1)} />
                </div>
            </div>
             <div className="bg-primary text-primary-foreground rounded-lg px-6 py-2 my-2 inline-block">
                <h1 className="text-5xl font-bold tracking-widest font-mono">{formatTime}</h1>
            </div>
            <div className="flex justify-center items-center gap-2 flex-wrap">
                <Button onClick={() => setIsTimerActive(!isTimerActive)} className="w-28" variant={isTimerActive ? 'destructive' : 'default'}>
                    {isTimerActive ? <Pause className="mr-2" /> : <Play className="mr-2" />}
                    {isTimerActive ? 'Pausar' : 'Iniciar'}
                </Button>
                <Button onClick={handleResetTimer} variant="outline">
                    <RotateCcw className="mr-2"/>
                    Reiniciar
                </Button>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setActiveHalf('firstHalf')} variant={activeHalf === 'firstHalf' ? 'secondary' : 'outline'} size="sm">1ª Parte</Button>
                    <Button onClick={() => setActiveHalf('secondHalf')} variant={activeHalf === 'secondHalf' ? 'secondary' : 'outline'} size="sm">2ª Parte</Button>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader className="p-0">
              <div className="flex justify-between items-center p-2 rounded-t-lg bg-primary text-primary-foreground">
                <CardTitle className="text-base">JUGADORES - Mi Equipo</CardTitle>
                <Button variant="destructive" size="sm" onClick={resetAllStats}><RotateCcw className="mr-2 h-4 w-4"/>Reiniciar Todo</Button>
              </div>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
              <div className="min-w-[800px]">
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead className="w-[80px] text-xs px-1">Dorsal</TableHead>
                              <TableHead className="text-xs">Nombre</TableHead>
                              <TableHead className="text-center w-[110px] text-xs">Goles</TableHead>
                              <TableHead title="T.A." className="text-center w-[60px] text-xs"><RectangleVertical className="h-4 w-4 inline-block text-yellow-500"/></TableHead>
                              <TableHead title="T.R." className="text-center w-[60px] text-xs"><RectangleVertical className="h-4 w-4 inline-block text-red-600"/></TableHead>
                              <TableHead className="text-center w-[110px] text-xs">Faltas</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {players.map((player) => (
                              <TableRow key={player.id}>
                                  <TableCell className="px-1 font-semibold text-center">{player.dorsal}</TableCell>
                                  <TableCell className="font-medium text-sm px-1">{player.nombre}</TableCell>
                                  <TableCell>
                                      <StatCounter value={player.goals} onIncrement={() => handlePlayerStatChange(player.id, 'goals', 1)} onDecrement={() => handlePlayerStatChange(player.id, 'goals', -1)} />
                                  </TableCell>
                                  <TableCell>
                                      <StatCounter value={player.yellowCards} onIncrement={() => handlePlayerStatChange(player.id, 'yellowCards', 1)} onDecrement={() => handlePlayerStatChange(player.id, 'yellowCards', -1)} />
                                  </TableCell>
                                  <TableCell>
                                      <StatCounter value={player.redCards} onIncrement={() => handlePlayerStatChange(player.id, 'redCards', 1)} onDecrement={() => handlePlayerStatChange(player.id, 'redCards', -1)} />
                                  </TableCell>
                                  <TableCell>
                                      <StatCounter value={player.faltas} onIncrement={() => handlePlayerStatChange(player.id, 'faltas', 1)} onDecrement={() => handlePlayerStatChange(player.id, 'faltas', -1)} />
                                  </TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>
          </CardContent>
      </Card>

    </div>
  );
}

export default function MisPartidillosPage() {
    return (
        <MisPartidillosPageContent />
    )
}
