
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc, addDoc, serverTimestamp, getDoc as getRosterDoc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Eye, History, PlusCircle, Edit, Trash2 } from "lucide-react";
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
    fecha: string;
    hora?: string;
    tipoPartido?: string;
    myTeamPlayers?: { goals: number; }[];
    opponentPlayers: { goals: number; }[];
    createdAt: Timestamp;
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
});


function HistorialPageContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [matches, setMatches] = useState<SavedMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isSavingMatch, setIsSavingMatch] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAddMatchDialogOpen, setIsAddMatchDialogOpen] = useState(false);
    const [matchToDeleteId, setMatchToDeleteId] = useState<string | null>(null);

    const [rosterInfo, setRosterInfo] = useState({ name: '', campeonato: '' });
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

    useEffect(() => {
        const fetchRosterInfo = async () => {
          if (!user) return;
          try {
            const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');
            const rosterSnap = await getRosterDoc(rosterDocRef);
            if (rosterSnap.exists()) {
              const data = rosterSnap.data();
              const teamInfo = { name: data.equipo || '', campeonato: data.campeonato || '' };
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

    const fetchMatches = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const q = query(
                collection(db, "partidos_estadisticas"),
                where("userId", "==", user.uid),
                orderBy("fecha", "desc"),
                orderBy("createdAt", "desc")
            );
            const querySnapshot = await getDocs(q);
            const fetchedMatches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedMatch));
            setMatches(fetchedMatches);
        } catch (error: any) {
            console.error("Error fetching match history:", error);
            if (error.code === 'failed-precondition') {
                toast({
                    title: "Índice Requerido",
                    description: "Se necesita un índice en Firestore para esta consulta. Por favor, crea el índice desde el enlace en la consola de errores de tu navegador.",
                    variant: "destructive",
                    duration: 20000,
                });
            } else {
                toast({
                title: "Error al Cargar Partidos",
                description: "No se pudieron cargar tus partidos. Inténtalo de nuevo.",
                variant: "destructive"
                });
            }
        }
        setIsLoading(false);
    }, [user, toast]);

    useEffect(() => {
        fetchMatches();
    }, [fetchMatches]);
    
    const handleDeleteClick = (id: string) => {
      setMatchToDeleteId(id);
      setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!matchToDeleteId) return;
        setIsDeleting(true);
        try {
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
        if (!user) return;
        
        const myTeamName = rosterSide === 'local' ? values.localTeamName : values.visitorTeamName;
        if (!myTeamName) {
            toast({ title: "Asigna tu equipo", description: "Asegúrate de que el nombre de tu equipo esté en el campo Local o Visitante y selecciona el lado correcto.", variant: "destructive" });
            return;
        }

        setIsSavingMatch(true);

        const newMatchData = {
          userId: user.uid,
          myTeamName: myTeamName,
          opponentTeamName: rosterSide === 'local' ? values.visitorTeamName : values.localTeamName,
          myTeamWasHome: rosterSide === 'local',
          fecha: values.fecha,
          hora: values.hora || null,
          campeonato: values.campeonato || null,
          jornada: values.jornada || null,
          tipoPartido: values.tipoPartido || null,
          myTeamStats: createInitialTeamStats(),
          opponentTeamStats: createInitialTeamStats(),
          myTeamPlayers: [],
          opponentPlayers: [],
          createdAt: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, "partidos_estadisticas"), newMatchData);
            toast({ title: "Partido Añadido", description: "El nuevo partido se ha guardado. Ahora puedes editarlo para añadir estadísticas." });
            setIsAddMatchDialogOpen(false);
            fetchMatches(); // Refresh the list
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


    const calculateScore = (match: SavedMatch) => {
        const myGoals = match.myTeamPlayers?.reduce((total, player) => total + (player.goals || 0), 0) || 0;
        const opponentGoals = match.opponentPlayers?.reduce((total, player) => total + (player.goals || 0), 0) || 0;
        return `${myGoals} - ${opponentGoals}`;
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
                                          Guardar Partido
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
                    {matches.map(match => (
                        <Card key={match.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-headline truncate" title={`${match.myTeamName} vs ${match.opponentTeamName}`}>
                                    {match.myTeamName} vs {match.opponentTeamName}
                                </CardTitle>
                                <CardDescription>
                                    {formatDate(match.fecha)} {match.hora && `- ${match.hora}`}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow text-center">
                                <p className="text-4xl font-bold text-primary">{calculateScore(match)}</p>
                                {match.tipoPartido && <Badge variant="secondary" className="mt-2">{match.tipoPartido}</Badge>}
                            </CardContent>
                            <CardFooter className="flex justify-center gap-2">
                                <Button asChild variant="ghost" size="icon" title="Ver Detalles">
                                  <Link href={`/estadisticas/historial/${match.id}`}><Eye className="h-4 w-4"/></Link>
                                </Button>
                                <Button asChild variant="ghost" size="icon" title="Editar Estadísticas">
                                  <Link href={`/estadisticas/edit/${match.id}`}><Edit className="h-4 w-4"/></Link>
                                </Button>
                                <Button variant="ghost" size="icon" title="Eliminar Partido" onClick={() => handleDeleteClick(match.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
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
        <AuthGuard>
            <SubscriptionGuard>
                <HistorialPageContent />
            </SubscriptionGuard>
        </AuthGuard>
    );
}
