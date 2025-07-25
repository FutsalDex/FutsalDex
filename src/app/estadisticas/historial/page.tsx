
"use client";

import { useAuth } from "@/contexts/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp, doc, addDoc, getDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Eye, History, PlusCircle, BarChart2, Trash2, Info, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ToastAction } from "@/components/ui/toast";
import { Alert, AlertTitle, AlertDescription as AlertDesc } from "@/components/ui/alert";


// New Match Schema
const newMatchSchema = z.object({
  localTeamName: z.string().min(1, "El nombre del equipo local es requerido."),
  visitorTeamName: z.string().min(1, "El nombre del equipo visitante es requerido."),
  fecha: z.string().min(1, "La fecha es requerida."),
  hora: z.string().optional(),
  tipoPartido: z.string().optional(),
  campeonato: z.string().optional(),
  jornada: z.string().optional(),
});

type NewMatchFormValues = z.infer<typeof newMatchSchema>;


interface SavedMatch {
    id: string;
    myTeamName: string;
    opponentTeamName: string;
    myTeamWasHome: boolean;
    fecha: string;
    hora?: string;
    tipoPartido?: string;
    myTeamPlayers?: { goals: any[] }[];
    opponentPlayers?: { goals: any[] }[];
    createdAt: string; 
}

const createInitialTeamStats = () => ({
  shots: {
    onTarget: { firstHalf: 0, secondHalf: 0 },
    offTarget: { firstHalf: 0, secondHalf: 0 },
    blocked: { firstHalf: 0, secondHalf: 0 },
  },
  turnovers: { firstHalf: 0, secondHalf: 0 },
  steals: { firstHalf: 0, secondHalf: 0 },
  timeouts: { firstHalf: 0, secondHalf: 0 },
  faltas: { firstHalf: 0, secondHalf: 0 },
});


function HistorialPageContent() {
    const { user, isSubscribed, isAdmin } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [matches, setMatches] = useState<SavedMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSavingMatch, setIsSavingMatch] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAddMatchDialogOpen, setIsAddMatchDialogOpen] = useState(false);
    const [matchToDeleteId, setMatchToDeleteId] = useState<string | null>(null);

    const [rosterInfo, setRosterInfo] = useState({ name: '', campeonato: '', players: [] as any[] });
    const [rosterSide, setRosterSide] = useState<'local' | 'visitante'>('local');

    const form = useForm<NewMatchFormValues>({
      resolver: zodResolver(newMatchSchema),
      defaultValues: {
        localTeamName: '',
        visitorTeamName: '',
        fecha: new Date().toISOString().split('T')[0],
        hora: '',
        tipoPartido: '',
        campeonato: '',
        jornada: '',
      }
    });

    const fetchMatches = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const db = getFirebaseDb();
            const q = query(
                collection(db, "partidos_estadisticas"),
                where("userId", "==", user.uid),
                orderBy("fecha", "desc")
            );

            const querySnapshot = await getDocs(q);
            const fetchedMatches = querySnapshot.docs.map(doc => {
                const data = doc.data();
                const createdAtTimestamp = data.createdAt as Timestamp;
                const createdAtISO = createdAtTimestamp?.toDate ? createdAtTimestamp.toDate().toISOString() : new Date().toISOString();
                
                return {
                    id: doc.id,
                    myTeamName: data.myTeamName || '',
                    opponentTeamName: data.opponentTeamName || '',
                    myTeamWasHome: data.myTeamWasHome === true, // Default to false if undefined
                    fecha: data.fecha || '',
                    hora: data.hora,
                    tipoPartido: data.tipoPartido,
                    myTeamPlayers: data.myTeamPlayers || [],
                    opponentPlayers: data.opponentPlayers || [],
                    createdAt: createdAtISO,
                } as SavedMatch;
            });
            setMatches(fetchedMatches);
        } catch (error: any) {
            console.error("Error fetching match history:", error);
            toast({
                title: "Error al Cargar Partidos",
                description: "No se pudieron cargar tus partidos. Revisa la consola (F12) para más detalles.",
                variant: "destructive"
            });
        }
        setIsLoading(false);
    }, [user, toast]);

    useEffect(() => {
        if (user) {
            fetchMatches();
        } else {
            setIsLoading(false);
        }
    }, [user, fetchMatches]);

    useEffect(() => {
        if (!user) return;
        const fetchRosterInfo = async () => {
          try {
            const db = getFirebaseDb();
            const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');
            const rosterSnap = await getDoc(rosterDocRef);
            if (rosterSnap.exists()) {
              const data = rosterSnap.data();
              const teamInfo = { 
                  name: data.equipo || '', 
                  campeonato: data.campeonato || '',
                  players: data.players || []
              };
              setRosterInfo(teamInfo);
              form.reset({
                localTeamName: teamInfo.name,
                visitorTeamName: '',
                fecha: new Date().toISOString().split('T')[0],
                hora: '',
                tipoPartido: '',
                campeonato: teamInfo.campeonato,
                jornada: '',
              });
            }
          } catch (error) {
            console.error("Error fetching roster info: ", error);
          }
        };
        fetchRosterInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);
    
    const handleDeleteClick = (id: string) => {
      setMatchToDeleteId(id);
      setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!user) {
            toast({ title: "Acción Requerida", description: "Debes iniciar sesión para eliminar partidos." });
            return;
        }
        if (!isSubscribed && !isAdmin) {
            toast({ title: "Suscripción Requerida", description: "Necesitas una suscripción Pro para eliminar partidos." });
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
            return;
        }
        if (!matchToDeleteId) return;
        setIsDeleting(true);
        try {
            const db = getFirebaseDb();
            await deleteDoc(doc(db, "partidos_estadisticas", matchToDeleteId));
            toast({ title: "Partido Eliminado", description: "El partido ha sido eliminado correctamente." });
            setMatches(prevMatches => prevMatches.filter(match => match.id !== matchToDeleteId));
        } catch (error) {
            console.error("Error deleting match: ", error);
            toast({ title: "Error al Eliminar", description: "No se pudo eliminar el partido.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setMatchToDeleteId(null);
            setIsDeleteDialogOpen(false);
        }
    };

    const onAddMatchSubmit = async (values: NewMatchFormValues) => {
        if (!user) {
            toast({ title: "Acción Requerida", description: "Debes iniciar sesión para añadir un partido.", action: <ToastAction altText="Iniciar Sesión" onClick={() => router.push('/login')}>Iniciar Sesión</ToastAction> });
            return;
        }
        if (!isSubscribed && !isAdmin) {
            toast({ title: "Suscripción Requerida", description: "Necesitas una suscripción Pro para añadir partidos.", action: <ToastAction altText="Suscribirse" onClick={() => router.push('/suscripcion')}>Suscribirse</ToastAction> });
            return;
        }
        
        const myTeamName = rosterSide === 'local' ? values.localTeamName : values.visitorTeamName;
        if (!myTeamName || myTeamName !== rosterInfo.name) {
            toast({ title: "Asigna tu equipo", description: "Asegúrate de que el nombre de tu equipo esté en el campo Local o Visitante y selecciona el lado correcto usando el botón 'Mi Equipo'.", variant: "destructive" });
            return;
        }

        setIsSavingMatch(true);
        
        const activePlayersFromRoster = rosterInfo.players
            .filter(p => p.isActive)
            .map(p => ({
                ...p,
                goals: [], // Initialize goals as an empty array
                yellowCards: 0,
                redCards: 0,
                faltas: 0,
                paradas: 0,
                golesRecibidos: 0,
                unoVsUno: 0
            }));

        const newMatchData = {
          userId: user.uid,
          myTeamName: myTeamName,
          opponentTeamName: rosterSide === 'local' ? values.visitorTeamName : values.localTeamName,
          myTeamWasHome: rosterSide === 'local',
          fecha: values.fecha,
          hora: values.hora || null,
          campeonato: values.campeonato || '',
          jornada: values.jornada || '',
          tipoPartido: values.tipoPartido || null,
          myTeamStats: createInitialTeamStats(),
          opponentTeamStats: createInitialTeamStats(),
          myTeamPlayers: activePlayersFromRoster,
          opponentPlayers: [],
          timer: { duration: 25 * 60 },
          createdAt: serverTimestamp(),
        };

        try {
            const db = getFirebaseDb();
            const collectionRef = collection(db, "partidos_estadisticas");
            await addDoc(collectionRef, newMatchData);
            toast({ title: "Partido Añadido", description: "El nuevo partido se ha guardado. Ahora puedes editarlo para añadir estadísticas." });
            setIsAddMatchDialogOpen(false);
            fetchMatches();
        } catch (error) {
            console.error("Error saving new match: ", error);
            toast({ title: "Error al Guardar", description: "No se pudo añadir el nuevo partido.", variant: "destructive" });
        } finally {
            setIsSavingMatch(false);
        }
    };

    const handleUseMyTeam = (side: 'local' | 'visitante') => {
        form.setValue(side === 'local' ? 'localTeamName' : 'visitorTeamName', rosterInfo.name);
        setRosterSide(side);
    }

    const getMatchDisplayInfo = (match: SavedMatch) => {
        const localTeam = match.myTeamWasHome ? match.myTeamName : match.opponentTeamName;
        const visitorTeam = match.myTeamWasHome ? match.opponentTeamName : match.myTeamName;
        
        const localScore = (match.myTeamWasHome ? match.myTeamPlayers : match.opponentPlayers)?.reduce((acc, p) => acc + (p.goals?.length || 0), 0) || 0;
        const visitorScore = (match.myTeamWasHome ? match.opponentPlayers : match.myTeamPlayers)?.reduce((acc, p) => acc + (p.goals?.length || 0), 0) || 0;

        return {
            localTeam,
            visitorTeam,
            score: `${localScore} - ${visitorScore}`
        };
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "Fecha no disponible";
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    }

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8 md:px-6">
                 <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
                    <Info className="h-4 w-4 text-blue-700" />
                    <AlertTitle className="text-blue-800 font-semibold">Función para Usuarios Registrados</AlertTitle>
                    <AlertDesc>
                        Para guardar y gestionar tus propios partidos, por favor{" "}
                        <Link href="/register" className="font-bold underline">regístrate</Link> o{" "}
                        <Link href="/login" className="font-bold underline">inicia sesión</Link>.
                    </AlertDesc>
                </Alert>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                        <History className="mr-3 h-8 w-8"/>
                        Mis Partidos
                    </h1>
                    <p className="text-lg text-foreground/80">
                        Gestiona tus partidos. Añade nuevos encuentros, edita los existentes o consulta sus estadísticas.
                    </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button asChild variant="outline" className="flex-1 md:flex-none">
                        <Link href="/mi-equipo">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Volver al Panel
                        </Link>
                    </Button>
                    <Dialog open={isAddMatchDialogOpen} onOpenChange={setIsAddMatchDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="flex-1 md:flex-none">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Añadir Partido
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Añadir Nuevo Partido</DialogTitle>
                                <DialogDescription>Introduce los datos básicos del partido. Podrás añadir las estadísticas más tarde.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onAddMatchSubmit)} className="space-y-4">
                                  <div>
                                      <Label>Equipo Local</Label>
                                      <div className="flex gap-2 items-center">
                                          <FormField control={form.control} name="localTeamName" render={({ field }) => (<FormItem className="flex-grow"><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                          <Button type="button" variant="outline" size="sm" onClick={() => handleUseMyTeam('local')}>Mi Equipo</Button>
                                      </div>
                                  </div>
                                   <div>
                                      <Label>Equipo Visitante</Label>
                                      <div className="flex gap-2 items-center">
                                          <FormField control={form.control} name="visitorTeamName" render={({ field }) => (<FormItem className="flex-grow"><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                          <Button type="button" variant="outline" size="sm" onClick={() => handleUseMyTeam('visitante')}>Mi Equipo</Button>
                                      </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="fecha" render={({ field }) => (<FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="hora" render={({ field }) => (<FormItem><FormLabel>Hora</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                  </div>

                                  <FormField control={form.control} name="tipoPartido" render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Tipo de Partido</FormLabel>
                                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                          <SelectItem value="Amistoso">Amistoso</SelectItem><SelectItem value="Liga">Liga</SelectItem><SelectItem value="Torneo">Torneo</SelectItem><SelectItem value="Copa">Copa</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )} />
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="campeonato" render={({ field }) => (<FormItem><FormLabel>Campeonato</FormLabel><FormControl><Input placeholder="Ej: Liga Local" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="jornada" render={({ field }) => (<FormItem><FormLabel>Jornada</FormLabel><FormControl><Input placeholder="Ej: Jornada 5" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                  </div>

                                   <DialogFooter>
                                      <Button type="button" variant="ghost" onClick={() => setIsAddMatchDialogOpen(false)}>Cancelar</Button>
                                      <Button type="submit" disabled={isSavingMatch}>
                                          {isSavingMatch && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                          Guardar
                                      </Button>
                                  </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </header>

            {matches.length === 0 ? (
                <Card className="text-center py-12">
                    <CardHeader>
                        <CardTitle>No hay partidos guardados</CardTitle>
                        <CardDescription>Aún no has guardado ninguna estadística. ¡Empieza añadiendo tu primer partido!</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {/* The Dialog Trigger is already in the header */}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {matches.map(match => {
                        const { localTeam, visitorTeam, score } = getMatchDisplayInfo(match);
                        return (
                            <Card key={match.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
                                <CardHeader className="pb-4 text-center">
                                    <CardTitle className="text-lg font-headline truncate" title={`${localTeam} vs ${visitorTeam}`}>
                                        {localTeam} vs {visitorTeam}
                                    </CardTitle>
                                    <CardDescription>
                                        {formatDate(match.fecha)} {match.hora && `- ${match.hora}`}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow text-center">
                                    <p className="text-4xl font-bold text-primary">{score}</p>
                                    {match.tipoPartido && <Badge variant="secondary" className="mt-2">{match.tipoPartido}</Badge>}
                                </CardContent>
                                <CardFooter className="flex justify-center gap-2">
                                    <Button asChild variant="ghost" size="icon" title="Ver Detalles">
                                    <Link href={`/estadisticas/historial/${match.id}`}><Eye className="h-4 w-4"/></Link>
                                    </Button>
                                    <Button asChild variant="ghost" size="icon" title="Editar Estadísticas y Datos">
                                    <Link href={`/estadisticas/edit/${match.id}`}><Edit className="h-4 w-4"/></Link>
                                    </Button>
                                    <Button variant="ghost" size="icon" title="Eliminar Partido" onClick={() => handleDeleteClick(match.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                    </Button>
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            )}
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción no se puede deshacer. Se eliminarán permanentemente los datos y estadísticas de este partido.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setMatchToDeleteId(null)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    );
}

export default function HistorialEstadisticasPage() {
    return (
        <HistorialPageContent />
    );
}
