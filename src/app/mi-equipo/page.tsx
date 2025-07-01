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
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { produce } from 'immer';
import { POSICIONES_FUTSAL } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

// Player data structure
interface Player {
  id: string;
  dorsal: string;
  nombre: string;
  posicion: string;
  faltas: number;
  tarjetasAmarillas: number;
  tarjetasRojas: number;
  goles: number;
  // Goalkeeper specific
  paradas: number;
  golesRecibidos: number;
  unoVsUno: number; // Represents 1-on-1 situations, could be saves or total
}

const createNewPlayer = (): Player => ({
  id: uuidv4(),
  dorsal: '',
  nombre: '',
  posicion: '',
  faltas: 0,
  tarjetasAmarillas: 0,
  tarjetasRojas: 0,
  goles: 0,
  paradas: 0,
  golesRecibidos: 0,
  unoVsUno: 0,
});

function MiEquipoPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>(() => [createNewPlayer()]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const getTeamDocRef = useCallback(() => {
      if (!user) return null;
      return doc(db, 'usuarios', user.uid, 'team', 'roster');
  }, [user]);

  useEffect(() => {
    const fetchTeam = async () => {
      const docRef = getTeamDocRef();
      if (!docRef) {
        setIsLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().players?.length > 0) {
            setPlayers(docSnap.data().players);
        } else {
            // If no team exists, start with a default of 5 empty rows
            setPlayers(Array.from({ length: 5 }, createNewPlayer));
        }
      } catch (error) {
        console.error("Error fetching team:", error);
        toast({ title: "Error", description: "No se pudo cargar tu equipo.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTeam();
  }, [getTeamDocRef, toast]);
  
  const handlePlayerChange = (id: string, field: keyof Player, value: string | number) => {
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
      draft.push(createNewPlayer());
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
      await setDoc(docRef, {
        players,
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
          Gestiona la plantilla de tu equipo y sus estadísticas de la temporada.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Plantilla del Equipo</CardTitle>
          <CardDescription>
            Introduce los datos de tus jugadores. Las estadísticas de portero solo se habilitan si la posición es "Portero".
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
                  <TableHead className="w-[90px] text-center">Goles</TableHead>
                  <TableHead className="w-[90px] text-center">Faltas</TableHead>
                  <TableHead className="w-[90px] text-center">T. Amarillas</TableHead>
                  <TableHead className="w-[90px] text-center">T. Rojas</TableHead>
                  <TableHead className="w-[90px] text-center">Paradas</TableHead>
                  <TableHead className="w-[90px] text-center">G. Recibidos</TableHead>
                  <TableHead className="w-[90px] text-center">1 vs 1</TableHead>
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
                      <TableCell>
                        <Input type="number" value={player.goles} onChange={(e) => handlePlayerChange(player.id, 'goles', parseInt(e.target.value) || 0)} className="h-8 text-center" min="0"/>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={player.faltas} onChange={(e) => handlePlayerChange(player.id, 'faltas', parseInt(e.target.value) || 0)} className="h-8 text-center" min="0"/>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={player.tarjetasAmarillas} onChange={(e) => handlePlayerChange(player.id, 'tarjetasAmarillas', parseInt(e.target.value) || 0)} className="h-8 text-center" min="0"/>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={player.tarjetasRojas} onChange={(e) => handlePlayerChange(player.id, 'tarjetasRojas', parseInt(e.target.value) || 0)} className="h-8 text-center" min="0"/>
                      </TableCell>
                      {/* Goalkeeper Stats */}
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
