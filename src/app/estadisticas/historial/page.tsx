
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc } from "firebase/firestore";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Eye, History, PlusCircle, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useToast } from "@/hooks/use-toast";

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

function HistorialPageContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [matches, setMatches] = useState<SavedMatch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [matchToDeleteId, setMatchToDeleteId] = useState<string | null>(null);

    const fetchMatches = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const q = query(
                collection(db, "partidos_estadisticas"),
                where("userId", "==", user.uid),
                orderBy("fecha", "desc")
            );
            const querySnapshot = await getDocs(q);
            const fetchedMatches = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedMatch));
            setMatches(fetchedMatches);
        } catch (error) {
            console.error("Error fetching match history:", error);
            toast({
              title: "Error al Cargar Partidos",
              description: "No se pudieron cargar tus partidos. Inténtalo de nuevo.",
              variant: "destructive"
            });
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
                    <Button asChild className="flex-1 md:flex-none">
                        <Link href="/estadisticas">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Partido
                        </Link>
                    </Button>
                </div>
            </header>

            {matches.length === 0 ? (
                <Card className="text-center py-12">
                    <CardHeader>
                        <CardTitle>No hay partidos guardados</CardTitle>
                        <CardDescription>Aún no has guardado ninguna estadística. ¡Empieza registrando tu primer partido!</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Button asChild>
                        <Link href="/estadisticas">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Añadir Partido
                        </Link>
                       </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Partido</TableHead>
                            <TableHead className="text-center">Resultado</TableHead>
                            <TableHead className="text-center">Tipo</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {matches.map(match => (
                            <TableRow key={match.id}>
                              <TableCell className="font-medium">{formatDate(match.fecha)}</TableCell>
                              <TableCell>{match.myTeamName} vs {match.opponentTeamName}</TableCell>
                              <TableCell className="text-center font-bold">{calculateScore(match)}</TableCell>
                              <TableCell className="text-center">
                                {match.tipoPartido ? <Badge variant="secondary">{match.tipoPartido}</Badge> : "N/A"}
                              </TableCell>
                              <TableCell className="text-right space-x-1">
                                <Button asChild variant="ghost" size="icon" title="Ver Detalles">
                                  <Link href={`/estadisticas/historial/${match.id}`}><Eye className="h-4 w-4"/></Link>
                                </Button>
                                <Button asChild variant="ghost" size="icon" title="Editar Partido">
                                  <Link href={`/estadisticas/edit/${match.id}`}><Edit className="h-4 w-4"/></Link>
                                </Button>
                                <Button variant="ghost" size="icon" title="Eliminar Partido" onClick={() => handleDeleteClick(match.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                </Card>
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
