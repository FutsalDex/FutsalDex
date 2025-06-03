
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, ListChecks, Bot, Edit, Clock, Edit2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
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

interface EjercicioInfo {
  id: string;
  ejercicio: string;
  duracion?: string; 
}

interface Sesion {
  id: string;
  userId: string;
  type: "AI" | "Manual";
  sessionTitle: string; 
  warmUp: string | EjercicioInfo; 
  mainExercises: (string | EjercicioInfo)[]; 
  coolDown: string | EjercicioInfo; 
  coachNotes?: string;
  numero_sesion?: string;
  fecha?: string | Timestamp;
  temporada?: string;
  club?: string;
  equipo?: string;
  preferredSessionLengthMinutes?: number; 
  duracionTotalManualEstimada?: number; 
  createdAt: Timestamp;
}

export default function MisSesionesPage() {
  return (
    <AuthGuard>
      <MisSesionesContent />
    </AuthGuard>
  );
}

function MisSesionesContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchSesiones = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "mis_sesiones"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedSesiones = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sesion));
        setSesiones(fetchedSesiones);
      } catch (error) {
        console.error("Error fetching sessions:", error);
        toast({
          title: "Error al Cargar Sesiones",
          description: "No se pudieron cargar tus sesiones.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    };

    fetchSesiones();
  }, [user, toast]);

  const formatDate = (dateValue: string | Timestamp | undefined) => {
    if (!dateValue) return 'N/A';
    if (typeof dateValue === 'string') {
      try {
        const date = new Date(dateValue);
         if (isNaN(date.getTime())) return dateValue; 
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
      } catch (e) {
        return dateValue; 
      }
    }
    if (dateValue.toDate) { 
      return dateValue.toDate().toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
    }
    return 'Fecha inválida';
  };
  
  const formatExerciseName = (exercise: string | EjercicioInfo | null | undefined): string => {
    if (!exercise) return "Ejercicio no especificado";
    if (typeof exercise === 'string') return exercise; 
    return exercise.ejercicio; 
  };

  const handleDeleteSessionClick = (sessionId: string) => {
    setSessionToDeleteId(sessionId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "mis_sesiones", sessionToDeleteId));
      setSesiones(prev => prev.filter(s => s.id !== sessionToDeleteId));
      toast({
        title: "Sesión Eliminada",
        description: "La sesión ha sido eliminada correctamente.",
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      toast({
        title: "Error al Eliminar",
        description: "No se pudo eliminar la sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setSessionToDeleteId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleEditSessionClick = (sesionType: "AI" | "Manual", sessionId: string) => {
    if (sesionType === "AI") {
       toast({
        title: "Función no disponible",
        description: "La edición de sesiones generadas por IA no está disponible actualmente.",
      });
      return;
    }
    // Placeholder para la lógica de edición de sesiones manuales
    // router.push(`/mis-sesiones/edit/${sessionId}`);
    toast({
      title: "En Desarrollo",
      description: "La funcionalidad para editar sesiones manuales está en desarrollo.",
    });
  };


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Mis Sesiones</h1>
        <p className="text-lg text-foreground/80">
          Aquí encontrarás todas las sesiones de entrenamiento que has creado.
        </p>
      </header>

      {sesiones.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl font-headline">No Tienes Sesiones Guardadas</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-6">
              Parece que aún no has creado ninguna sesión de entrenamiento. ¡Empieza ahora!
            </CardDescription>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link href="/crear-sesion-ia">
                  <Bot className="mr-2 h-4 w-4" /> Crear con IA
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/crear-sesion-manual">
                  <Edit className="mr-2 h-4 w-4" /> Crear Manualmente
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sesiones.map((sesion) => (
            <Card key={sesion.id} className="flex flex-col overflow-hidden transition-all hover:shadow-xl bg-card">
              <CardHeader className="pb-3">
                 <p className="text-xl font-semibold text-primary">
                  Fecha: {formatDate(sesion.fecha || sesion.createdAt)}
                  {sesion.numero_sesion && ` | Sesión #${sesion.numero_sesion}`}
                </p>
                 <p className="text-sm text-foreground/80"><strong>Club:</strong> {sesion.club || 'N/A'}</p>
                 <p className="text-sm text-foreground/80"><strong>Equipo:</strong> {sesion.equipo || 'N/A'}</p>
                 <p className="text-sm text-foreground/80"><strong>Temporada:</strong> {sesion.temporada || 'N/A'}</p>
                 
                 {(sesion.type === "AI" && sesion.preferredSessionLengthMinutes) && (
                    <p className="text-sm text-foreground/80 flex items-center">
                        <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        <strong>Duración IA:</strong> {sesion.preferredSessionLengthMinutes} min
                    </p>
                 )}
                 {(sesion.type === "Manual" && sesion.duracionTotalManualEstimada !== undefined) && (
                    <p className="text-sm text-foreground/80 flex items-center">
                        <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        <strong>Duración Total (aprox.):</strong> {sesion.duracionTotalManualEstimada} min
                    </p>
                 )}
                 {(sesion.type === "Manual" && sesion.duracionTotalManualEstimada === undefined) && (
                    <p className="text-sm text-muted-foreground flex items-center">
                        <Clock className="mr-1.5 h-3.5 w-3.5" />
                        Duración no especificada
                    </p>
                 )}
              </CardHeader>
              <CardContent className="flex-grow space-y-3 pt-2">
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">1. Inicial:</h4>
                  <p className="text-sm ml-2">{formatExerciseName(sesion.warmUp)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">2. Principal:</h4>
                  <ul className="list-none pl-2 space-y-0.5 text-sm">
                    {sesion.mainExercises.map((ex, index) => (
                        <li key={index} className="flex">
                            <span className="mr-1.5">{`•`}</span>
                            <span>{formatExerciseName(ex)}</span>
                        </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">3. Final:</h4>
                  <p className="text-sm ml-2">{formatExerciseName(sesion.coolDown)}</p>
                </div>
              </CardContent>
              <CardFooter className="flex-col space-y-2 items-stretch">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="mr-2 h-4 w-4" /> Ver Detalles Completos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <div className="flex justify-between items-center">
                        <DialogTitle className="text-2xl text-primary font-headline">{sesion.sessionTitle}</DialogTitle>
                        <Badge variant={sesion.type === "AI" ? "default" : "secondary"}>
                           {sesion.type === "AI" ? <Bot className="mr-1 h-3 w-3"/> : <Edit className="mr-1 h-3 w-3"/>}
                          {sesion.type}
                        </Badge>
                      </div>
                      <DialogDescription>
                        Fecha: {formatDate(sesion.fecha || sesion.createdAt)}
                        {sesion.numero_sesion && ` | Sesión #${sesion.numero_sesion}`}
                        <br/>Club: {sesion.club || 'N/A'} | Equipo: {sesion.equipo || 'N/A'} | Temporada: {sesion.temporada || 'N/A'}
                        {sesion.type === "AI" && sesion.preferredSessionLengthMinutes && ` | Duración IA: ${sesion.preferredSessionLengthMinutes} min`}
                        {sesion.type === "Manual" && sesion.duracionTotalManualEstimada !== undefined && ` | Duración Total (aprox.): ${sesion.duracionTotalManualEstimada} min`}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Calentamiento:</h3>
                        <p className="text-sm">{formatExerciseName(sesion.warmUp)}</p>
                      </div>
                       <div>
                        <h3 className="font-semibold text-lg mb-1">Ejercicios Principales:</h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          {sesion.mainExercises.map((ex, index) => <li key={index}>{formatExerciseName(ex)}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Vuelta a la Calma:</h3>
                        <p className="text-sm">{formatExerciseName(sesion.coolDown)}</p>
                      </div>
                      {sesion.coachNotes && (
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Notas del Entrenador (IA):</h3>
                          <p className="text-sm whitespace-pre-wrap">{sesion.coachNotes}</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleEditSessionClick(sesion.type, sesion.id)}
                    disabled={sesion.type === "AI"}
                    title={sesion.type === "AI" ? "La edición de sesiones AI no está disponible" : "Editar sesión"}
                  >
                    <Edit2 className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => handleDeleteSessionClick(sesion.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Borrar
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar esta sesión permanentemente? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionToDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSession} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

