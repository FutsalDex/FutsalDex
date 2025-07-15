
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Pause, RotateCw, Settings, Plus, Minus, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { produce } from 'immer';

type Half = 'firstHalf' | 'secondHalf';

interface Score {
  local: number;
  visitante: number;
}

interface TeamStatsPerHalf {
  faltas: number;
  tiempoMuertoUsado: boolean;
}

interface StatsState {
  firstHalf: {
    local: TeamStatsPerHalf;
    visitante: TeamStatsPerHalf;
  };
  secondHalf: {
    local: TeamStatsPerHalf;
    visitante: TeamStatsPerHalf;
  };
}

const createInitialStats = (): StatsState => ({
  firstHalf: {
    local: { faltas: 0, tiempoMuertoUsado: false },
    visitante: { faltas: 0, tiempoMuertoUsado: false },
  },
  secondHalf: {
    local: { faltas: 0, tiempoMuertoUsado: false },
    visitante: { faltas: 0, tiempoMuertoUsado: false },
  },
});

export default function MarcadorPage() {
  const { toast } = useToast();

  // State
  const [duration, setDuration] = useState(25); // minutes
  const [time, setTime] = useState(duration * 60); // seconds
  const [isActive, setIsActive] = useState(false);
  const [activeHalf, setActiveHalf] = useState<Half>('firstHalf');

  const [teamNames, setTeamNames] = useState({ local: 'Local', visitante: 'Visitante' });
  const [score, setScore] = useState<Score>({ local: 0, visitante: 0 });
  const [stats, setStats] = useState<StatsState>(createInitialStats());

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempSettings, setTempSettings] = useState({ duration, localName: 'Local', visitorName: 'Visitante' });
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (isActive && time === 0) {
        setIsActive(false);
        toast({
            title: "Final de la parte",
            description: `El tiempo para la ${activeHalf === 'firstHalf' ? 'primera' : 'segunda'} parte ha terminado.`,
        });
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, time, activeHalf, toast]);
  
  // Update timer when duration or active half changes
  useEffect(() => {
    if (!isActive) {
        setTime(duration * 60);
    }
  }, [duration, isActive]);

  const handleSelectHalf = (half: Half) => {
    setActiveHalf(half);
    setIsActive(false); // Pause timer when changing halves
    setTime(duration * 60); // Reset timer for the selected half
  };


  const formatTime = useMemo(() => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [time]);

  const toggleTimer = () => setIsActive(!isActive);

  const handleScoreChange = (team: keyof Score, delta: number) => {
    setScore(
      produce((draft) => {
        draft[team] = Math.max(0, draft[team] + delta);
      })
    );
  };
  
  const handleFoulChange = (half: Half, team: keyof Score, delta: number) => {
    setStats(
        produce((draft) => {
            const currentFouls = draft[half][team].faltas;
            draft[half][team].faltas = Math.max(0, Math.min(10, currentFouls + delta));
        })
    );
  };
  
  const handleTimeoutToggle = (half: Half, team: keyof Score) => {
    setStats(
        produce((draft) => {
            draft[half][team].tiempoMuertoUsado = !draft[half][team].tiempoMuertoUsado;
        })
    );
  };

  const handleFullReset = () => {
    setIsActive(false);
    setActiveHalf('firstHalf');
    setTime(duration * 60);
    setScore({ local: 0, visitante: 0 });
    setStats(createInitialStats());
    setTeamNames({ local: 'Local', visitante: 'Visitante' });
    setTempSettings({ duration, localName: 'Local', visitorName: 'Visitante' });
    toast({
      title: "Marcador Reiniciado",
      description: "Todos los valores han sido restaurados.",
    });
  };
  
  const handleSaveSettings = () => {
    if (tempSettings.duration <= 0) {
        toast({
            title: "Duración inválida",
            description: "La duración debe ser un número positivo.",
            variant: "destructive"
        });
        return;
    }
    setDuration(tempSettings.duration);
    setTeamNames({ local: tempSettings.localName || 'Local', visitante: tempSettings.visitorName || 'Visitante' });
    setIsActive(false);
    setTime(tempSettings.duration * 60);
    toast({ title: "Ajustes Guardados", description: "Los cambios se han aplicado." });
    setIsSettingsOpen(false);
  };
  
  const renderStatHalfCard = (half: Half) => {
    const halfData = stats[half];
    const halfTitle = half === 'firstHalf' ? 'Primera Parte' : 'Segunda Parte';

    return (
        <Card className="border-primary">
            <CardHeader className="p-0">
                <Button 
                    variant="default" 
                    className="w-full rounded-b-none"
                    onClick={() => handleSelectHalf(half)}
                >
                    {halfTitle}
                </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-center">
                {/* Local Stats */}
                <div>
                    <p className="font-bold text-lg">{teamNames.local}</p>
                    <div className="mt-2">
                        <Label className="text-sm font-bold text-foreground">Faltas</Label>
                        <div className="flex items-center justify-center gap-2">
                           <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleFoulChange(half, 'local', -1)}><Minus/></Button>
                           <span className="text-2xl font-bold w-8">{halfData.local.faltas}</span>
                           <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleFoulChange(half, 'local', 1)}><Plus/></Button>
                        </div>
                    </div>
                     <div className="mt-4">
                        <Label className="text-sm font-bold text-foreground">Tiempo Muerto</Label>
                        <p className={cn("text-lg font-semibold", halfData.local.tiempoMuertoUsado ? 'text-destructive' : 'text-primary')}>
                            {halfData.local.tiempoMuertoUsado ? 'Usado' : 'Disponible'}
                        </p>
                        <Button size="sm" variant="outline" className="mt-1" onClick={() => handleTimeoutToggle(half, 'local')}>Usar T.M.</Button>
                    </div>
                </div>
                 {/* Visitante Stats */}
                <div className="mt-4">
                    <p className="font-bold text-lg">{teamNames.visitante}</p>
                     <div className="mt-2">
                        <div className="flex items-center justify-center gap-2">
                           <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleFoulChange(half, 'visitante', -1)}><Minus/></Button>
                           <span className="text-2xl font-bold w-8">{halfData.visitante.faltas}</span>
                           <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleFoulChange(half, 'visitante', 1)}><Plus/></Button>
                        </div>
                    </div>
                     <div className="mt-4">
                        <p className={cn("text-lg font-semibold", halfData.visitante.tiempoMuertoUsado ? 'text-destructive' : 'text-primary')}>
                            {halfData.visitante.tiempoMuertoUsado ? 'Usado' : 'Disponible'}
                        </p>
                        <Button size="sm" variant="outline" className="mt-1" onClick={() => handleTimeoutToggle(half, 'visitante')}>Usar T.M.</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
  };


  return (
    <div className="flex flex-col h-screen bg-background p-4 font-sans text-foreground">
        {/* Top Section: Timer and Scoreboard */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center text-center max-h-[40vh]">
            <div className="bg-primary text-primary-foreground rounded-lg px-6 py-2 mb-4">
                <h1 className="text-6xl font-bold tracking-widest font-mono">{formatTime}</h1>
            </div>

            <div className="flex items-center justify-around w-full max-w-md mb-4">
                {/* Local Score */}
                <div className="flex flex-col items-center">
                    <h2 className="text-2xl font-bold flex items-center">
                        {teamNames.local}
                        {stats[activeHalf].local.faltas >= 5 && <ShieldAlert className="ml-2 h-5 w-5 text-destructive" />}
                    </h2>
                    <p className="text-5xl font-bold text-primary">{score.local}</p>
                    <div className="flex gap-2 mt-2">
                        <Button size="icon" variant="outline" onClick={() => handleScoreChange('local', -1)}><Minus /></Button>
                        <Button size="icon" variant="outline" onClick={() => handleScoreChange('local', 1)}><Plus /></Button>
                    </div>
                </div>

                <span className="text-2xl text-muted-foreground">vs</span>

                {/* Visitor Score */}
                <div className="flex flex-col items-center">
                     <h2 className="text-2xl font-bold flex items-center">
                        {teamNames.visitante}
                        {stats[activeHalf].visitante.faltas >= 5 && <ShieldAlert className="ml-2 h-5 w-5 text-destructive" />}
                    </h2>
                    <p className="text-5xl font-bold text-primary">{score.visitante}</p>
                    <div className="flex gap-2 mt-2">
                        <Button size="icon" variant="outline" onClick={() => handleScoreChange('visitante', -1)}><Minus /></Button>
                        <Button size="icon" variant="outline" onClick={() => handleScoreChange('visitante', 1)}><Plus /></Button>
                    </div>
                </div>
            </div>

            <Button onClick={toggleTimer} className="w-48 text-lg" variant={isActive ? 'destructive' : 'default'}>
                {isActive ? <Pause className="mr-2" /> : <Play className="mr-2" />}
                {isActive ? 'Pausar' : 'Iniciar'}
            </Button>
        </div>

        {/* Middle Section: Stats Cards */}
        <div className="flex-grow my-4 grid grid-cols-2 gap-4">
            {renderStatHalfCard('firstHalf')}
            {renderStatHalfCard('secondHalf')}
        </div>

        {/* Bottom Section: Controls */}
        <div className="flex-shrink-0 grid grid-cols-2 gap-4">
            <Button onClick={handleFullReset} variant="destructive" className="text-lg py-6">
                <RotateCw className="mr-2" />
                Reiniciar Todo
            </Button>
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="text-lg py-6">
                        <Settings className="mr-2" />
                        Ajustes
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Ajustes del Partido</DialogTitle>
                        <DialogDescription>
                            Personaliza la duración del partido y los nombres de los equipos.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="duration">Duración por Parte (minutos)</Label>
                            <Input
                                id="duration"
                                type="number"
                                value={tempSettings.duration}
                                onChange={(e) => setTempSettings(prev => ({...prev, duration: parseInt(e.target.value, 10) || 0}))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="localName">Nombre Equipo Local</Label>
                            <Input
                                id="localName"
                                value={tempSettings.localName}
                                placeholder="Local"
                                onChange={(e) => setTempSettings(prev => ({...prev, localName: e.target.value}))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="visitorName">Nombre Equipo Visitante</Label>
                            <Input
                                id="visitorName"
                                value={tempSettings.visitorName}
                                placeholder="Visitante"
                                onChange={(e) => setTempSettings(prev => ({...prev, visitorName: e.target.value}))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSettings}>Guardar Cambios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    </div>
  );
}
