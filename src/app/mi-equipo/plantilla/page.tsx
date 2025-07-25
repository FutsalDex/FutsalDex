
"use client";

import { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from "@/components/auth-guard";
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


  return (
    <AuthGuard>
      <MiPlantillaPageContent />
    </AuthGuard>
  );
}

export default function MiPlantillaPage() {
    return (
      <AuthGuard>
        <MiPlantillaPageContent />
      </AuthGuard>
    );
}

