
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { SubscriptionGuard } from '@/components/subscription-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Plus, Trash2, Users, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { produce } from 'immer';
import { POSICIONES_FUTSAL } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';

// Player data structure for the roster (what is saved to DB)
interface RosterPlayer {
  id: string;
  dorsal: string;
  nombre: string;
  posicion: string;
}

// Player data structure for display, including aggregated stats from matches
interface DisplayPlayer extends RosterPlayer {
  totalGoles: number;
  totalAmarillas: number;
  totalRojas: number;
  totalFaltas: number;
  totalParadas: number;
  totalGolesRecibidos: number;
  totalUnoVsUno: number;
}

interface MatchData {
    myTeamPlayers: {
        dorsal: string;
        goals?: number;
        yellowCards?: number;
        redCards?: number;
        faltas?: number;
        paradas?: number;
        golesRecibidos?: number;
        unoVsUno?: number;
    }[];
}

const createNewPlayer = (): RosterPlayer => ({
  id: uuidv4(),
  dorsal: '',
  nombre: '',
  posicion: '',
});

function MiPlantillaPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<DisplayPlayer[]>([]);
  const [club, setClub] = useState('');
  const [equipo, setEquipo] = useState('');
  const [campeonato, setCampeonato] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const getTeamDocRef = useCallback(() => {
      if (!user) return null;
      return doc(db, 'usuarios', user.uid, 'team', 'roster');
  }, [user]);

  const fetchTeamAndAggregateStats = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    
    try {
        // 1. Fetch Roster
        const docRef = getTeamDocRef();
        if (!docRef) throw new Error("User not found");

        const docSnap = await getDoc(docRef);
        let roster: RosterPlayer[] = [];
        if (docSnap.exists()) {
            const data = docSnap.data();
            roster = data.players?.length > 0 ? data.players : [];
            setClub(data.club || '');
            setEquipo(data.equipo || '');
            setCampeonato(data.campeonato || '');
        } else {
            roster = Array.from({ length: 5 }, createNewPlayer);
        }

        // 2. Fetch all matches for the user
        const matchesQuery = query(collection(db, "partidos_estadisticas"), where("userId", "==", user.uid));
        const matchesSnapshot = await getDocs(matchesQuery);
        const matches: MatchData[] = matchesSnapshot.docs.map(d => d.data() as MatchData);

        // 3. Aggregate stats
        const aggregatedPlayers: DisplayPlayer[] = roster.map(player => {
            const stats = {
                totalGoles: 0,
                totalAmarillas: 0,
                totalRojas: 0,
                totalFaltas: 0,
                totalParadas: 0,
                totalGolesRecibidos: 0,
                totalUnoVsUno: 0,
            };

            if (player.dorsal) {
                for (const match of matches) {
                    const matchPlayer = match.myTeamPlayers?.find(p => p.dorsal === player.dorsal);
                    if (matchPlayer) {
                        stats.totalGoles += matchPlayer.goals || 0;
                        stats.totalAmarillas += matchPlayer.yellowCards || 0;
                        stats.totalRojas += matchPlayer.redCards || 0;
                        stats.totalFaltas += matchPlayer.faltas || 0;
                        stats.totalParadas += matchPlayer.paradas || 0;
                        stats.totalGolesRecibidos += matchPlayer.golesRecibidos || 0;
                        stats.totalUnoVsUno += matchPlayer.unoVsUno || 0;
                    }
                }
            }
            
            return {
                ...player,
                ...stats,
            };
        });

        setPlayers(aggregatedPlayers);
    } catch (error) {
        console.error("Error fetching team and stats:", error);
        toast({ title: "Error", description: "No se pudieron cargar los datos del equipo y las estadísticas.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  }, [user, getTeamDocRef, toast]);
  

  useEffect(() => {
    fetchTeamAndAggregateStats();
  }, [fetchTeamAndAggregateStats]);
  
  const handlePlayerChange = (id: string, field: keyof RosterPlayer, value: string | number) => {
    setPlayers(
      produce(draft => {
        const player = draft.find(p => p.id === id);
        if (player) {
          (player as any)[field] = value;
        }
      })
    );
  };
  
  const addPlayerRow = () => {
    setPlayers(produce(draft => {
      if (draft.length >= 12) {
        toast({ title: "Límite de Jugadores", description: "Puedes añadir un máximo de 12 jugadores a la plantilla.", variant: "default" });
        return;
      }
      const newPlayer: DisplayPlayer = {
        ...createNewPlayer(),
        totalGoles: 0,
        totalAmarillas: 0,
        totalRojas: 0,
        totalFaltas: 0,
        totalParadas: 0,
        totalGolesRecibidos: 0,
        totalUnoVsUno: 0,
      }
      draft.push(newPlayer);
    }));
  };

  const removePlayerRow = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const handleSaveTeam = async () => {
    const docRef = getTeamDocRef();
    if (!docRef) {
      toast({ title: "Error", description: "Debes iniciar sesión para guardar.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const rosterToSave = players.map(p => ({
        id: p.id,
        dorsal: p.dorsal,
        nombre: p.nombre,
        posicion: p.posicion,
      }));
      await setDoc(docRef, {
        club,
        equipo,
        campeonato,
        players: rosterToSave,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Equipo Guardado", description: "Los datos de tu equipo se han guardado correctamente." });
    } catch (error) {
      console.error("Error saving team:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar el equipo.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

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
            <h1 className="text-4xl font-bold text-primary mb-2 font-headline flex items-center">
                <Users className="mr-3 h-10 w-10" />
                Mi Plantilla
            </h1>
            <p className="text-lg text-foreground/80">
                Gestiona la plantilla de tu equipo y consulta sus estadísticas de la temporada.
            </p>
        </div>
        <Button asChild variant="outline">
            <Link href="/mi-equipo">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
            </Link>
        </Button>
      </header>

      <Card className="mb-8">
        <CardHeader>
            <CardTitle>Información del Equipo</CardTitle>
            <CardDescription>
                Define los datos de tu club. Esta información se usará para rellenar automáticamente los datos en las estadísticas de los partidos.
            </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
                <Label htmlFor="club">Club</Label>
                <Input id="club" value={club} onChange={(e) => setClub(e.target.value)} placeholder="Nombre de tu club" />
            </div>
            <div>
                <Label htmlFor="equipo">Equipo</Label>
                <Input id="equipo" value={equipo} onChange={(e) => setEquipo(e.target.value)} placeholder="Ej: Senior A, Cadete" />
            </div>
            <div>
                <Label htmlFor="campeonato">Campeonato Principal</Label>
                <Input id="campeonato" value={campeonato} onChange={(e) => setCampeonato(e.target.value)} placeholder="Ej: Liga Local" />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plantilla del Equipo</CardTitle>
          <CardDescription>
            Introduce los datos de tus jugadores. Las estadísticas se calculan automáticamente a partir de los partidos guardados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] px-1">Dorsal</TableHead>
                  <TableHead className="w-[300px] px-1">Nombre</TableHead>
                  <TableHead className="w-[150px] px-1">Posición</TableHead>
                  <TableHead className="w-[60px] px-1 text-center" title="Goles">Goles</TableHead>
                  <TableHead className="w-[60px] px-1 text-center" title="Tarjetas Amarillas">T.A.</TableHead>
                  <TableHead className="w-[60px] px-1 text-center" title="Tarjetas Rojas">T.R.</TableHead>
                  <TableHead className="w-[60px] px-1 text-center" title="Faltas Cometidas">Faltas</TableHead>
                  <TableHead className="w-[60px] px-1 text-center" title="Paradas (Porteros)">Paradas</TableHead>
                  <TableHead className="w-[60px] px-1 text-center" title="Goles Recibidos (Porteros)">G. Rec.</TableHead>
                  <TableHead className="w-[60px] px-1 text-center" title="Uno contra Uno (Porteros)">1vs1</TableHead>
                  <TableHead className="w-[40px] px-1"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => {
                  return (
                    <TableRow key={player.id}>
                      <TableCell className="py-1 px-1">
                        <Input
                          type="text"
                          value={player.dorsal}
                          onChange={(e) => handlePlayerChange(player.id, 'dorsal', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="py-1 px-1">
                        <Input
                          value={player.nombre}
                          onChange={(e) => handlePlayerChange(player.id, 'nombre', e.target.value)}
                          className="h-8 text-sm"
                          placeholder="Nombre del jugador"
                        />
                      </TableCell>
                      <TableCell className="py-1 px-1">
                        <Select
                          value={player.posicion}
                          onValueChange={(value) => handlePlayerChange(player.id, 'posicion', value)}
                        >
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            {POSICIONES_FUTSAL.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Aggregated stats (read-only) */}
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalGoles}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalAmarillas}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalRojas}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalFaltas}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalParadas}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalGolesRecibidos}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalUnoVsUno}</TableCell>
                      <TableCell className="py-1 px-1">
                        <Button variant="ghost" size="icon" onClick={() => removePlayerRow(player.id)} title="Eliminar jugador" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <Button onClick={addPlayerRow} variant="outline" className="mt-4">
            <Plus className="mr-2 h-4 w-4" /> Añadir Jugador
          </Button>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveTeam} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Equipo
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function MiPlantillaPage() {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <MiPlantillaPageContent />
      </SubscriptionGuard>
    </AuthGuard>
  );
}
