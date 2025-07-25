
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Plus, Trash2, Users, ArrowLeft, Info, Goal, ShieldAlert } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { produce } from 'immer';
import { POSICIONES_FUTSAL } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ToastAction } from '@/components/ui/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';


// Player data structure for the roster (what is saved to DB)
interface RosterPlayer {
  id: string;
  dorsal: string;
  nombre: string;
  posicion: string;
  isActive: boolean;
}

// Player data structure for display, including aggregated stats from matches
interface DisplayPlayer extends RosterPlayer {
  partidosJugados: number;
  totalGoles: number;
  totalAmarillas: number;
  totalRojas: number;
  totalFaltas: number;
  totalParadas: number;
  totalGolesRecibidos: number;
  totalUnoVsUno: number;
}

interface MatchDataPlayer {
    dorsal: string;
    goals: { length: number }; // In Firestore, it's just a count.
    yellowCards?: number;
    redCards?: number;
    faltas?: number;
    paradas?: number;
    golesRecibidos?: number;
    unoVsUno?: number;
}
interface MatchData {
    myTeamPlayers?: MatchDataPlayer[];
}


const createNewPlayer = (): RosterPlayer => ({
  id: uuidv4(),
  dorsal: '',
  nombre: '',
  posicion: '',
  isActive: true,
});

function MiPlantillaPageContent() {
  const { user, isRegisteredUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [players, setPlayers] = useState<DisplayPlayer[]>([]);
  const [club, setClub] = useState('');
  const [equipo, setEquipo] = useState('');
  const [campeonato, setCampeonato] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const getTeamDocRef = useCallback(() => {
      if (!user) return null;
      return doc(getFirebaseDb(), 'usuarios', user.uid, 'team', 'roster');
  }, [user]);

  const fetchTeamAndAggregateStats = useCallback(async () => {
    if (!isRegisteredUser) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    
    try {
        const docRef = getTeamDocRef();
        if (!docRef) throw new Error("User not found");

        const db = getFirebaseDb();
        const matchesQuery = query(collection(db, "partidos_estadisticas"), where("userId", "==", user.uid));
        
        const [docSnap, matchesSnapshot] = await Promise.all([
          getDoc(docRef),
          getDocs(matchesQuery)
        ]);

        let roster: RosterPlayer[] = [];
        if (docSnap.exists()) {
            const data = docSnap.data();
            roster = data.players?.length > 0 ? data.players.map((p: any) => ({ ...p, isActive: p.isActive !== false })) : [];
            setClub(data.club || '');
            setEquipo(data.equipo || '');
            setCampeonato(data.campeonato || '');
        } else {
            roster = Array.from({ length: 5 }, createNewPlayer);
        }

        const matches: MatchData[] = matchesSnapshot.docs.map(d => d.data() as MatchData);

        const aggregatedPlayers: DisplayPlayer[] = roster.map(player => {
            const stats = {
                partidosJugados: 0,
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
                        stats.partidosJugados++;
                        stats.totalGoles += matchPlayer.goals?.length || 0;
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
  }, [user, getTeamDocRef, toast, isRegisteredUser]);
  

  useEffect(() => {
    if (isRegisteredUser) {
        fetchTeamAndAggregateStats();
    } else {
        const createGuestPlayer = (id:string, dorsal:string, nombre:string, posicion:string, isActive: boolean, pj: number, goles:number, amarillas:number, rojas:number, faltas:number, paradas:number, recibidos:number, uno:number): DisplayPlayer => ({
            id: id, dorsal, nombre, posicion, isActive, partidosJugados: pj, totalGoles: goles, totalAmarillas: amarillas, totalRojas: rojas, totalFaltas: faltas, totalParadas: paradas, totalGolesRecibidos: recibidos, totalUnoVsUno: uno,
        });

        setPlayers([
            createGuestPlayer(uuidv4(), '1', 'A. García (Portero)', 'Portero', true, 10, 0, 0, 0, 1, 12, 3, 5),
            createGuestPlayer(uuidv4(), '4', 'J. López (Cierre)', 'Cierre', true, 8, 2, 1, 0, 5, 0, 0, 0),
            createGuestPlayer(uuidv4(), '7', 'M. Pérez (Ala)', 'Ala', true, 9, 8, 2, 0, 4, 0, 0, 0),
            createGuestPlayer(uuidv4(), '10', 'C. Ruiz (Pívot)', 'Pívot', true, 10, 15, 0, 0, 4, 0, 0, 0),
            createGuestPlayer(uuidv4(), '8', 'S. Torres (Ala-Cierre)', 'Ala-Cierre', false, 5, 5, 1, 1, 2, 0, 0, 0),
        ]);
        setClub('FutsalDex Club');
        setEquipo('Equipo Demo');
        setCampeonato('Liga de Exhibición');
        setIsLoading(false);
    }
  }, [isRegisteredUser, fetchTeamAndAggregateStats]);
  
  const handlePlayerChange = (id: string, field: keyof RosterPlayer, value: string | number | boolean) => {
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
    if (!isRegisteredUser) {
        toast({ title: "Acción Requerida", description: "Debes iniciar sesión para añadir jugadores.", action: <ToastAction altText="Iniciar Sesión" onClick={() => router.push('/login')}>Iniciar Sesión</ToastAction> });
        return;
    }
    setPlayers(produce(draft => {
      if (draft.length >= 20) {
        toast({ title: "Límite de Jugadores", description: "Puedes añadir un máximo de 20 jugadores a la plantilla.", variant: "default" });
        return;
      }
      const newPlayer: DisplayPlayer = {
        ...createNewPlayer(),
        partidosJugados: 0, totalGoles: 0, totalAmarillas: 0, totalRojas: 0, totalFaltas: 0, totalParadas: 0, totalGolesRecibidos: 0, totalUnoVsUno: 0,
      }
      draft.push(newPlayer);
    }));
  };

  const removePlayerRow = (id: string) => {
     if (!isRegisteredUser) {
        toast({ title: "Acción Requerida", description: "Debes iniciar sesión para eliminar jugadores.", action: <ToastAction altText="Iniciar Sesión" onClick={() => router.push('/login')}>Iniciar Sesión</ToastAction> });
        return;
    }
    setPlayers(players.filter(p => p.id !== id));
  };

  const handleSaveTeam = async () => {
    if (!isRegisteredUser) {
        toast({ title: "Acción Requerida", description: "Debes iniciar sesión para guardar tu plantilla.", action: <ToastAction altText="Iniciar Sesión" onClick={() => router.push('/login')}>Iniciar Sesión</ToastAction> });
        return;
    }
    if (!user) return;
    
    setIsSaving(true);
    try {
      const rosterToSave = players.map(p => ({
        id: p.id,
        dorsal: p.dorsal,
        nombre: p.nombre,
        posicion: p.posicion,
        isActive: p.isActive,
      }));
      const docRef = getTeamDocRef();
      if (docRef) {
        await setDoc(docRef, {
            club,
            equipo,
            campeonato,
            players: rosterToSave,
            updatedAt: serverTimestamp(),
        });
        toast({ title: "Equipo Guardado", description: "Los datos de tu equipo se han guardado correctamente." });
      } else {
        throw new Error("No se pudo obtener la referencia del documento.");
      }
    } catch (error) {
      console.error("Error saving team:", error);
      toast({ title: "Error al Guardar", description: "No se pudo guardar el equipo.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const goalscorerData = players
    .filter(p => p.totalGoles > 0)
    .map(p => ({
      name: p.nombre || `Dorsal ${p.dorsal}`,
      goles: p.totalGoles,
    }))
    .sort((a, b) => a.goles - b.goles);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                <Users className="mr-3 h-8 w-8" />
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
                <Input id="club" value={club} onChange={(e) => setClub(e.target.value)} placeholder="Nombre de tu club" disabled={!isRegisteredUser} />
            </div>
            <div>
                <Label htmlFor="equipo">Equipo</Label>
                <Input id="equipo" value={equipo} onChange={(e) => setEquipo(e.target.value)} placeholder="Ej: Senior A, Cadete" disabled={!isRegisteredUser} />
            </div>
            <div>
                <Label htmlFor="campeonato">Campeonato Principal</Label>
                <Input id="campeonato" value={campeonato} onChange={(e) => setCampeonato(e.target.value)} placeholder="Ej: Liga Local" disabled={!isRegisteredUser} />
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plantilla del Equipo</CardTitle>
          <CardDescription>
            Introduce los datos de tus jugadores. Máximo 20. Solo los jugadores "Activos" aparecerán en el módulo de partidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isRegisteredUser && (
            <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200 text-blue-800">
                <Info className="h-4 w-4 text-blue-700" />
                <AlertTitle className="text-blue-800 font-semibold">Modo de Vista Previa</AlertTitle>
                <AlertDescription>
                    Estás viendo una plantilla de ejemplo. Para crear y guardar tu propia plantilla, por favor{" "}
                    <Link href="/register" className="font-bold underline">regístrate</Link> o{" "}
                    <Link href="/login" className="font-bold underline">inicia sesión</Link>.
                </AlertDescription>
            </Alert>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px] px-1">Dorsal</TableHead>
                  <TableHead className="min-w-[200px] px-1">Nombre</TableHead>
                  <TableHead className="min-w-[150px] px-1">Posición</TableHead>
                  <TableHead className="w-[80px] px-1 text-center">Activo</TableHead>
                  <TableHead className="w-[60px] px-1 text-center" title="Partidos Jugados">PJ</TableHead>
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
                        <Input type="text" value={player.dorsal} onChange={(e) => handlePlayerChange(player.id, 'dorsal', e.target.value)} className="h-8 text-sm" disabled={!isRegisteredUser}/>
                      </TableCell>
                      <TableCell className="py-1 px-1">
                        <Input value={player.nombre} onChange={(e) => handlePlayerChange(player.id, 'nombre', e.target.value)} className="h-8 text-sm" placeholder="Nombre del jugador" disabled={!isRegisteredUser}/>
                      </TableCell>
                      <TableCell className="py-1 px-1">
                        <Select value={player.posicion} onValueChange={(value) => handlePlayerChange(player.id, 'posicion', value)} disabled={!isRegisteredUser}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                          <SelectContent>{POSICIONES_FUTSAL.map(pos => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-1 px-1 text-center">
                        <Switch checked={player.isActive} onCheckedChange={(checked) => handlePlayerChange(player.id, 'isActive', checked)} disabled={!isRegisteredUser} />
                      </TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.partidosJugados}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalGoles}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalAmarillas}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalRojas}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalFaltas}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalParadas}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalGolesRecibidos}</TableCell>
                      <TableCell className="text-center font-bold text-sm py-1 px-1">{player.totalUnoVsUno}</TableCell>
                      <TableCell className="py-1 px-1">
                        <Button variant="ghost" size="icon" onClick={() => removePlayerRow(player.id)} title="Eliminar jugador" className="h-8 w-8" disabled={!isRegisteredUser}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <CardFooter className="px-0 pt-4">
            <Button onClick={addPlayerRow} variant="outline" className="mt-4" disabled={!isRegisteredUser}>
              <Plus className="mr-2 h-4 w-4" /> Añadir Jugador
            </Button>
          </CardFooter>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveTeam} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar Equipo
          </Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 gap-8 mt-8">
        <Card>
          <CardHeader>
              <CardTitle className="font-headline text-xl flex items-center">
                <Goal className="mr-2 h-5 w-5 text-primary" />
                Goleadores de la Temporada
              </CardTitle>
              <CardDescription>Visualización de los goles marcados por cada jugador.</CardDescription>
          </CardHeader>
          <CardContent>
            {goalscorerData.length > 0 ? (
              <div style={{ height: `${goalscorerData.length * 40 + 60}px`, minHeight: '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={goalscorerData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Bar dataKey="goles" fill="hsl(var(--primary))">
                      <LabelList dataKey="goles" position="right" style={{ fill: 'hsl(var(--foreground))' }}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-10">
                Aún no se han registrado goles esta temporada.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


export default function MiPlantillaPage() {
    return (
        <MiPlantillaPageContent />
    );
}
