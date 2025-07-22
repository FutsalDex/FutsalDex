
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Minus, RotateCcw, RectangleVertical, Play, Pause, AlertTriangle, Info, Loader2, Settings, Goal, ShieldAlert } from "lucide-react";
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
interface TeamGeneralStats {
  goals: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
}

const initialGeneralStats = (): TeamGeneralStats => ({
    goals: 0,
    fouls: 0,
    yellowCards: 0,
    redCards: 0
});

function MisPartidillosPageContent() {
  const { isRegisteredUser } = useAuth();
  const { toast } = useToast();

  const [localStats, setLocalStats] = useState<TeamGeneralStats>(initialGeneralStats());
  const [visitorStats, setVisitorStats] = useState<TeamGeneralStats>(initialGeneralStats());

  // New state for team names and timer duration
  const [localTeamName, setLocalTeamName] = useState("Equipo Local");
  const [visitorTeamName, setVisitorTeamName] = useState("Equipo Visitante");
  const [timerDuration, setTimerDuration] = useState(25 * 60);

  // Timer State
  const [time, setTime] = useState(timerDuration);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
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
  
  const handleStatChange = (
    team: 'local' | 'visitor',
    field: keyof TeamGeneralStats,
    delta: number
  ) => {
    const setter = team === 'local' ? setLocalStats : setVisitorStats;
    setter(produce(draft => {
        draft[field] = Math.max(0, draft[field] + delta);
    }));
  };
  
  const resetAllStats = () => {
    setLocalStats(initialGeneralStats());
    setVisitorStats(initialGeneralStats());
    handleResetTimer();
    toast({ title: "Estadísticas Reiniciadas", description: "El marcador y las estadísticas se han restablecido." });
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

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Marcador</h1>
        <p className="text-lg text-foreground/80">Gestiona un partido rápido en tiempo real.</p>
      </header>
       
      <Card className="mb-6 text-center">
        <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-around w-full">
                <div className="flex-1">
                    <p className="font-bold truncate text-lg">{localTeamName}</p>
                </div>
                <div className="flex-1 text-4xl font-bold text-primary">
                   {localStats.goals} - {visitorStats.goals}
                </div>
                <div className="flex-1">
                    <p className="font-bold truncate text-lg">{visitorTeamName}</p>
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
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Ajustes del Marcador</DialogTitle>
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
                                <Label htmlFor="duration-select">Minutos del partido</Label>
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
                <CardTitle className="text-base">Estadísticas Generales</CardTitle>
                <Button variant="destructive" size="sm" onClick={resetAllStats}><RotateCcw className="mr-2 h-4 w-4"/>Reiniciar Todo</Button>
              </div>
          </CardHeader>
          <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-x-4">
                {/* Local Team Stats */}
                <div className="space-y-2">
                    <h3 className="text-center font-bold text-lg">{localTeamName}</h3>
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <Label className="flex items-center gap-2 font-semibold"><Goal className="h-5 w-5"/>Goles</Label>
                        <StatCounter value={localStats.goals} onIncrement={() => handleStatChange('local', 'goals', 1)} onDecrement={() => handleStatChange('local', 'goals', -1)}/>
                    </div>
                     <div className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <Label className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-5 w-5"/>Faltas</Label>
                        <StatCounter value={localStats.fouls} onIncrement={() => handleStatChange('local', 'fouls', 1)} onDecrement={() => handleStatChange('local', 'fouls', -1)}/>
                    </div>
                     <div className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <Label className="flex items-center gap-2 font-semibold"><RectangleVertical className="h-5 w-5 text-yellow-500"/>T. Amarillas</Label>
                        <StatCounter value={localStats.yellowCards} onIncrement={() => handleStatChange('local', 'yellowCards', 1)} onDecrement={() => handleStatChange('local', 'yellowCards', -1)}/>
                    </div>
                     <div className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <Label className="flex items-center gap-2 font-semibold"><RectangleVertical className="h-5 w-5 text-red-600"/>T. Rojas</Label>
                        <StatCounter value={localStats.redCards} onIncrement={() => handleStatChange('local', 'redCards', 1)} onDecrement={() => handleStatChange('local', 'redCards', -1)}/>
                    </div>
                </div>

                {/* Visitor Team Stats */}
                <div className="space-y-2">
                    <h3 className="text-center font-bold text-lg">{visitorTeamName}</h3>
                     <div className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <Label className="flex items-center gap-2 font-semibold"><Goal className="h-5 w-5"/>Goles</Label>
                        <StatCounter value={visitorStats.goals} onIncrement={() => handleStatChange('visitor', 'goals', 1)} onDecrement={() => handleStatChange('visitor', 'goals', -1)}/>
                    </div>
                     <div className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <Label className="flex items-center gap-2 font-semibold"><ShieldAlert className="h-5 w-5"/>Faltas</Label>
                        <StatCounter value={visitorStats.fouls} onIncrement={() => handleStatChange('visitor', 'fouls', 1)} onDecrement={() => handleStatChange('visitor', 'fouls', -1)}/>
                    </div>
                     <div className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <Label className="flex items-center gap-2 font-semibold"><RectangleVertical className="h-5 w-5 text-yellow-500"/>T. Amarillas</Label>
                        <StatCounter value={visitorStats.yellowCards} onIncrement={() => handleStatChange('visitor', 'yellowCards', 1)} onDecrement={() => handleStatChange('visitor', 'yellowCards', -1)}/>
                    </div>
                     <div className="flex items-center justify-between p-2 rounded-md bg-muted">
                        <Label className="flex items-center gap-2 font-semibold"><RectangleVertical className="h-5 w-5 text-red-600"/>T. Rojas</Label>
                        <StatCounter value={visitorStats.redCards} onIncrement={() => handleStatChange('visitor', 'redCards', 1)} onDecrement={() => handleStatChange('visitor', 'redCards', -1)}/>
                    </div>
                </div>
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
