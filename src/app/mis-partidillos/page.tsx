
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Minus, RotateCcw, RectangleVertical, Play, Pause, AlertTriangle, Info, Loader2, Settings } from "lucide-react";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { produce } from "immer";
import { useAuth } from "@/contexts/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { v4 as uuidv4 } from "uuid";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


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

const createGuestPlayers = (): Player[] => [
    { id: uuidv4(), dorsal: '1', nombre: 'A. García', posicion: 'Portero', goals: 0, yellowCards: 0, redCards: 0, faltas: 0 },
    { id: uuidv4(), dorsal: '4', nombre: 'J. López', posicion: 'Cierre', goals: 0, yellowCards: 0, redCards: 0, faltas: 0 },
    { id: uuidv4(), dorsal: '7', nombre: 'M. Pérez', posicion: 'Ala', goals: 0, yellowCards: 0, redCards: 0, faltas: 0 },
    { id: uuidv4(), dorsal: '10', nombre: 'C. Ruiz', posicion: 'Pívot', goals: 0, yellowCards: 0, redCards: 0, faltas: 0 },
    { id: uuidv4(), dorsal: '8', nombre: 'S. Torres', posicion: 'Ala-Cierre', goals: 0, yellowCards: 0, redCards: 0, faltas: 0 },
];


function MisPartidillosPageContent() {
  const { user, isRegisteredUser } = useAuth();
  const { toast } = useToast();

  const [players, setPlayers] = useState<Player[]>([]);
  const [localScore, setLocalScore] = useState(0);
  const [visitorScore, setVisitorScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // New state for team names and timer duration
  const [localTeamName, setLocalTeamName] = useState("Equipo Local");
  const [visitorTeamName, setVisitorTeamName] = useState("Equipo Visitante");
  const [timerDuration, setTimerDuration] = useState(25 * 60);

  // Timer State
  const [time, setTime] = useState(timerDuration);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const fetchRoster = useCallback(async () => {
    setIsLoading(true);
    if (!isRegisteredUser || !user) {
        setPlayers(createGuestPlayers());
        setIsLoading(false);
        return;
    }

    try {
        const db = getFirebaseDb();
        const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');
        const rosterSnap = await getDoc(rosterDocRef);

        if (rosterSnap.exists()) {
            const rosterData = rosterSnap.data();
            const activePlayers = (rosterData.players || [])
                .filter((p: any) => p.isActive)
                .map((p: any) => ({
                    ...p,
                    goals: 0,
                    yellowCards: 0,
                    redCards: 0,
                    faltas: 0
                }));
            setPlayers(activePlayers);
            if (rosterData.equipo) {
                setLocalTeamName(rosterData.equipo);
            }
        }
    } catch (error) {
        console.error("Error fetching roster:", error);
        toast({ title: "Error", description: "No se pudo cargar la plantilla.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [user, toast, isRegisteredUser]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);
  
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
        title: "Final del tiempo",
        description: `El tiempo del partidillo ha terminado.`,
      });
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerActive, time, toast]);

  const handlePlayerStatChange = (
    playerId: string,
    field: 'goals' | 'yellowCards' | 'redCards' | 'faltas',
    delta: number
  ) => {
    if (!isRegisteredUser) return;
    setPlayers(produce(draft => {
        const player = draft.find(p => p.id === playerId);
        if (player) {
            (player as any)[field] = Math.max(0, player[field] + delta);
        }
    }));
  };
  
  const resetAllStats = () => {
    if (!isRegisteredUser) return;
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
    if (!isTimerActive) {
      setTime(minutes * 60);
    }
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
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Marcador de Partidillos</h1>
        <p className="text-lg text-foreground/80">Gestiona un partido rápido en tiempo real.</p>
      </header>
      
       {!isRegisteredUser && (
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
            <Info className="h-4 w-4 text-blue-700" />
            <AlertTitle className="text-blue-800 font-semibold">Modo de Demostración</AlertTitle>
            <AlertDescription>
                Estás viendo el marcador con una plantilla de ejemplo. Para usarlo con tu equipo, por favor{" "}
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
                    <StatCounter value={localScore} onIncrement={() => setLocalScore(s => s + 1)} onDecrement={() => setLocalScore(s => s - 1)} disabled={!isRegisteredUser}/>
                </div>
                <div className="flex-1 text-4xl font-bold text-primary">
                   {localScore} - {visitorScore}
                </div>
                <div className="flex-1">
                    <p className="font-bold truncate text-lg">{visitorTeamName}</p>
                    <StatCounter value={visitorScore} onIncrement={() => setVisitorScore(s => s + 1)} onDecrement={() => setVisitorScore(s => s - 1)} disabled={!isRegisteredUser}/>
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
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" disabled={!isRegisteredUser}><Settings className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Ajustes del Partidillo</DialogTitle>
                            <DialogDescription>
                                Personaliza los nombres de los equipos y la duración del cronómetro.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="local-name">Nombre Equipo Local</Label>
                                <Input id="local-name" value={localTeamName} onChange={(e) => setLocalTeamName(e.target.value)} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="visitor-name">Nombre Equipo Visitante</Label>
                                <Input id="visitor-name" value={visitorTeamName} onChange={(e) => setVisitorTeamName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration-select">Minutos del partidillo</Label>
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
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button>Aceptar</Button></DialogClose>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader className="p-0">
              <div className="flex justify-between items-center p-2 rounded-t-lg bg-primary text-primary-foreground">
                <CardTitle className="text-base">JUGADORES - Mi Equipo</CardTitle>
                <Button variant="destructive" size="sm" onClick={resetAllStats} disabled={!isRegisteredUser}><RotateCcw className="mr-2 h-4 w-4"/>Reiniciar Todo</Button>
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
                          {players.length > 0 ? players.map((player) => (
                              <TableRow key={player.id}>
                                  <TableCell className="px-1 font-semibold text-center">{player.dorsal}</TableCell>
                                  <TableCell className="font-medium text-sm px-1">{player.nombre}</TableCell>
                                  <TableCell>
                                      <StatCounter value={player.goals} onIncrement={() => handlePlayerStatChange(player.id, 'goals', 1)} onDecrement={() => handlePlayerStatChange(player.id, 'goals', -1)} disabled={!isRegisteredUser} />
                                  </TableCell>
                                  <TableCell>
                                      <StatCounter value={player.yellowCards} onIncrement={() => handlePlayerStatChange(player.id, 'yellowCards', 1)} onDecrement={() => handlePlayerStatChange(player.id, 'yellowCards', -1)} disabled={!isRegisteredUser}/>
                                  </TableCell>
                                  <TableCell>
                                      <StatCounter value={player.redCards} onIncrement={() => handlePlayerStatChange(player.id, 'redCards', 1)} onDecrement={() => handlePlayerStatChange(player.id, 'redCards', -1)} disabled={!isRegisteredUser}/>
                                  </TableCell>
                                  <TableCell>
                                      <StatCounter value={player.faltas} onIncrement={() => handlePlayerStatChange(player.id, 'faltas', 1)} onDecrement={() => handlePlayerStatChange(player.id, 'faltas', -1)} disabled={!isRegisteredUser}/>
                                  </TableCell>
                              </TableRow>
                          )) : (
                             <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No tienes jugadores en tu plantilla. <Link href="/mi-equipo/plantilla" className="text-primary underline">Añade jugadores aquí</Link>.
                                </TableCell>
                             </TableRow>
                          )}
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
