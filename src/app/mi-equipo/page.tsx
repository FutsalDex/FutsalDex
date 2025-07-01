
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { SubscriptionGuard } from '@/components/subscription-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Plus, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { produce } from 'immer';
import { POSICIONES_FUTSAL } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

// Player data structure for the roster
interface RosterPlayer {
  id: string;
  dorsal: string;
  nombre: string;
  posicion: string;
  // Manually tracked season stats
  faltas: number;
  // Goalkeeper specific manually tracked season stats
  paradas: number;
  golesRecibidos: number;
  unoVsUno: number;
}

// Player data structure for display, including aggregated stats
interface DisplayPlayer extends RosterPlayer {
  totalGoles: number;
  totalAmarillas: number;
  totalRojas: number;
}

interface MatchData {
    myTeamPlayers: {
        dorsal: string;
        goals: number;
        yellowCards: number;
        redCards: number;
    }[];
}


const createNewPlayer = (): RosterPlayer => ({
  id: uuidv4(),
  dorsal: '',
  nombre: '',
  posicion: '',
  faltas: 0,
  paradas: 0,
  golesRecibidos: 0,
  unoVsUno: 0,
});

function MiEquipoPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<DisplayPlayer[]>([]);
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
        if (docSnap.exists() && docSnap.data().players?.length > 0) {
            roster = docSnap.data().players;
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
            };

            if (player.dorsal) {
                for (const match of matches) {
                    const matchPlayer = match.myTeamPlayers?.find(p => p.dorsal === player.dorsal);
                    if (matchPlayer) {
                        stats.totalGoles += matchPlayer.goals || 0;
                        stats.totalAmarillas += matchPlayer.yellowCards || 0;
                        stats.totalRojas += matchPlayer.redCards || 0;
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
          (player[field] as any) = value;
          // When position changes, reset goalkeeper stats if not a goalkeeper
          if (field === 'posicion' && value !== 'Portero') {
            player.paradas = 0;
            player.golesRecibidos = 0;
            player.unoVsUno = 0;
          }
        }
      })
    );
  };
  
  const addPlayerRow = () => {
    setPlayers(produce(draft => {
      const newPlayer: DisplayPlayer = {
        ...createNewPlayer(),
        totalGoles: 0,
        totalAmarillas: 0,
        totalRojas: 0,
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
      // Create a clean roster without aggregated stats for saving
      const rosterToSave = players.map(({ totalGoles, totalAmarillas, totalRojas, ...rosterPlayer }) => rosterPlayer);
      await setDoc(docRef, {
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
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline flex items-center">
          <Users className="mr-3 h-10 w-10" />
          Mi Equipo
        </h1>
        <p className="text-lg text-foreground/80">
          Gestiona la plantilla de tu equipo y consulta sus estadísticas de la temporada.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Plantilla del Equipo</CardTitle>
          <CardDescription>
            Introduce los datos de tus jugadores. Los goles y tarjetas se calculan automáticamente a partir de los partidos guardados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Dorsal</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="w-[150px]">Posición</TableHead>
                  <TableHead className="w-[90px] text-center" title="Total de goles de partidos guardados">Goles</TableHead>
                  <TableHead className="w-[90px] text-center" title="Total de tarjetas amarillas de partidos guardados">T. Amarillas</TableHead>
                  <TableHead className="w-[90px] text-center" title="Total de tarjetas rojas de partidos guardados">T. Rojas</TableHead>
                  <TableHead className="w-[90px] text-center" title="Faltas (total manual)">Faltas</TableHead>
                  <TableHead className="w-[90px] text-center" title="Paradas (total manual)">Paradas</TableHead>
                  <TableHead className="w-[90px] text-center" title="Goles recibidos (total manual)">G. Recibidos</TableHead>
                  <TableHead className="w-[90px] text-center" title="1 vs 1 (total manual)">1 vs 1</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.map((player) => {
                  const isGoalkeeper = player.posicion === 'Portero';
                  return (
                    <TableRow key={player.id}>
                      <TableCell>
                        <Input
                          type="text"
                          value={player.dorsal}
                          onChange={(e) => handlePlayerChange(player.id, 'dorsal', e.target.value)}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={player.nombre}
                          onChange={(e) => handlePlayerChange(player.id, 'nombre', e.target.value)}
                          className="h-8"
                          placeholder="Nombre del jugador"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={player.posicion}
                          onValueChange={(value) => handlePlayerChange(player.id, 'posicion', value)}
                        >
                          <SelectTrigger className="h-8"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>
                            {POSICIONES_FUTSAL.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {/* Aggregated stats (read-only) */}
                      <TableCell className="text-center font-bold text-lg">{player.totalGoles}</TableCell>
                      <TableCell className="text-center font-bold text-lg">{player.totalAmarillas}</TableCell>
                      <TableCell className="text-center font-bold text-lg">{player.totalRojas}</TableCell>
                      {/* Manually edited stats */}
                      <TableCell>
                        <Input type="number" value={player.faltas} onChange={(e) => handlePlayerChange(player.id, 'faltas', parseInt(e.target.value) || 0)} className="h-8 text-center" min="0"/>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={player.paradas} onChange={(e) => handlePlayerChange(player.id, 'paradas', parseInt(e.target.value) || 0)} className="h-8 text-center" disabled={!isGoalkeeper} min="0"/>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={player.golesRecibidos} onChange={(e) => handlePlayerChange(player.id, 'golesRecibidos', parseInt(e.target.value) || 0)} className="h-8 text-center" disabled={!isGoalkeeper} min="0"/>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={player.unoVsUno} onChange={(e) => handlePlayerChange(player.id, 'unoVsUno', parseInt(e.target.value) || 0)} className="h-8 text-center" disabled={!isGoalkeeper} min="0"/>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removePlayerRow(player.id)} title="Eliminar jugador">
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

export default function MiEquipoPage() {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <MiEquipoPageContent />
      </SubscriptionGuard>
    </AuthGuard>
  );
}
