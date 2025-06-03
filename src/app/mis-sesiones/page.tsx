
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Bot, Edit2, Trash2, Filter as FilterIcon, CalendarDays,Users, Sparkles, Target, Footprints, ShieldCheck, Activity, ClockIcon } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";

interface EjercicioInfo {
  id: string;
  ejercicio: string;
  duracion?: string; // "5", "10", "15", "20"
}

interface Sesion {
  id: string;
  userId: string;
  type: "AI" | "Manual";
  sessionTitle: string; // Used for "TEMA" in AI sessions
  warmUp: string | EjercicioInfo;
  mainExercises: (string | EjercicioInfo)[];
  coolDown: string | EjercicioInfo;
  coachNotes?: string; // Used for "OBSERVACIONES"
  numero_sesion?: string; // Used for "Nº SESIÓN"
  fecha?: string; // Guardado como YYYY-MM-DD, used for "FECHA"
  temporada?: string;
  club?: string; // Can be "EQUIPO 2"
  equipo?: string; // Can be "EQUIPO 1"
  preferredSessionLengthMinutes?: number; // AI session total duration
  duracionTotalManualEstimada?: number; // Manual session total duration
  createdAt: Timestamp;
  // Fields from AI generation, for "TEMA" if sessionTitle is generic
  teamDescription?: string;
  trainingGoals?: string;
  sessionFocus?: string;
}

const MESES = [
  { value: 1, label: "Enero" }, { value: 2, label: "Febrero" }, { value: 3, label: "Marzo" },
  { value: 4, label: "Abril" }, { value: 5, label: "Mayo" }, { value: 6, label: "Junio" },
  { value: 7, label: "Julio" }, { value: 8, label: "Agosto" }, { value: 9, label: "Septiembre" },
  { value: 10, label: "Octubre" }, { value: 11, label: "Noviembre" }, { value: 12, label: "Diciembre" }
];

const getYearsRange = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear + 1; i >= currentYear - 5; i--) {
    years.push(i);
  }
  return years;
};

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
  const router = useRouter();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());
  const [activeFilter, setActiveFilter] = useState<{ year: number; month: number } | null>(null);

  const fetchSesiones = useCallback(async (filter?: { year: number; month: number } | null) => {
    if (!user) return;
    setIsLoading(true);

    let targetYear: number, targetMonth: number;

    if (filter) {
        targetYear = filter.year;
        targetMonth = filter.month; 
    } else {
        const now = new Date();
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1; 
    }

    const monthString = targetMonth < 10 ? `0${targetMonth}` : `${targetMonth}`;
    const startDateString = `${targetYear}-${monthString}-01`;

    let nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
    let nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
    const nextMonthString = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
    const startOfNextMonthString = `${nextYear}-${nextMonthString}-01`;

    let q_constraints = [
        where("userId", "==", user.uid),
        where("fecha", ">=", startDateString),
        where("fecha", "<", startOfNextMonthString),
        orderBy("fecha", "asc"),
        orderBy("createdAt", "asc") 
    ];


    try {
      const finalQuery = query(collection(db, "mis_sesiones"), ...q_constraints);
      const querySnapshot = await getDocs(finalQuery);
      const fetchedSesiones = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sesion));
      setSesiones(fetchedSesiones);
    } catch (error: any) {
      console.error("Error fetching sessions:", error);
      if (error.code === 'failed-precondition') {
        toast({
          title: "Índice Requerido por Firestore",
          description: (
            <div className="text-sm">
              <p>La combinación actual de filtros y/o ordenación necesita un índice compuesto en Firestore que no existe.</p>
              <p className="mt-1">Por favor, abre la consola de desarrollador (F12), busca el mensaje de error completo de Firebase y haz clic en el enlace que proporciona para crear el índice automáticamente.</p>
              <p className="mt-2 text-xs">Ejemplo: "The query requires an index. You can create it here: [enlace]"</p>
            </div>
          ),
          variant: "destructive",
          duration: 30000,
        });
      } else {
        toast({
            title: "Error al Cargar Sesiones",
            description: "No se pudieron cargar tus sesiones.",
            variant: "destructive",
        });
      }
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    const now = new Date();
    const initialFilter = { year: now.getFullYear(), month: now.getMonth() + 1 };
    setActiveFilter(initialFilter);
    setSelectedYear(initialFilter.year.toString());
    setSelectedMonth((initialFilter.month).toString());
    fetchSesiones(initialFilter);
  }, [fetchSesiones]);

  const handleApplyFilter = () => {
    if (selectedYear && selectedMonth) {
      const yearNum = parseInt(selectedYear, 10);
      const monthNum = parseInt(selectedMonth, 10);
      const newFilter = { year: yearNum, month: monthNum };
      setActiveFilter(newFilter);
      fetchSesiones(newFilter);
    }
  };

  const formatDate = (dateValue: string | Timestamp | undefined) => {
    if (!dateValue) return 'N/A';
    let date: Date;

    if (typeof dateValue === 'string') {
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) { 
         const [year, month, day] = dateValue.split('-').map(Number);
         date = new Date(year, month - 1, day, 12,0,0); 
      } else {
         date = new Date(dateValue); 
      }
    } else if (dateValue && typeof dateValue.toDate === 'function') { 
      date = dateValue.toDate();
    } else {
      return 'Fecha inválida';
    }

    if (isNaN(date.getTime())) return (typeof dateValue === 'string' ? dateValue : 'Fecha inválida'); 

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const formatExerciseName = (exercise: string | EjercicioInfo | null | undefined): string => {
    if (!exercise) return "Ejercicio no especificado";
    if (typeof exercise === 'string') return exercise;
    return exercise.ejercicio || "Ejercicio sin nombre";
  };
  
  const getExerciseDuration = (exercise: string | EjercicioInfo | null | undefined): string => {
    if (!exercise || typeof exercise === 'string' || !exercise.duracion) return "";
    return `${exercise.duracion} min`;
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
      if (activeFilter) {
        fetchSesiones(activeFilter);
      } else {
        const now = new Date();
        fetchSesiones({ year: now.getFullYear(), month: now.getMonth() + 1 });
      }
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
    router.push(`/mis-sesiones/edit/${sessionId}`);
  };

  const years = getYearsRange();

  const getSessionTema = (sesion: Sesion): string => {
    if (sesion.type === "AI" && sesion.sessionFocus) return sesion.sessionFocus;
    if (sesion.sessionTitle && !sesion.sessionTitle.startsWith("Sesión Manual -")) return sesion.sessionTitle;
    if (sesion.equipo) return `Entrenamiento ${sesion.equipo}`;
    return "Tema no especificado";
  }

  const getTotalDuration = (sesion: Sesion): string => {
    if (sesion.type === "AI" && sesion.preferredSessionLengthMinutes) {
        return `${sesion.preferredSessionLengthMinutes} min (IA)`;
    }
    if (sesion.type === "Manual" && sesion.duracionTotalManualEstimada !== undefined) {
        return `${sesion.duracionTotalManualEstimada} min`;
    }
    return 'No especificada';
  }


  if (isLoading && sesiones.length === 0) {
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

      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <FilterIcon className="mr-2 h-5 w-5 text-primary" />
            Filtrar Sesiones por Mes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {MESES.map(mes => <SelectItem key={mes.value} value={mes.value.toString()}>{mes.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleApplyFilter} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">Aplicar Filtro</Button>
        </CardContent>
      </Card>

      {isLoading ? (
         <div className="flex justify-center items-center py-10">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="ml-3 text-muted-foreground">Cargando sesiones...</p>
         </div>
      ) : sesiones.length === 0 ? (
        <Card className="text-center py-12 bg-card">
          <CardHeader>
            <CalendarDays className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl font-headline text-primary">
              {activeFilter ? "No Hay Sesiones para este Mes" : "No Tienes Sesiones este Mes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-6 text-foreground/80">
              {activeFilter
                ? `No se encontraron sesiones para ${MESES.find(m=>m.value === activeFilter.month)?.label} de ${activeFilter.year}.`
                : "Parece que aún no has creado ninguna sesión de entrenamiento este mes."}
              <br/>
              ¡Empieza ahora o ajusta los filtros!
            </CardDescription>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link href="/crear-sesion-ia">
                  <Sparkles className="mr-2 h-4 w-4" /> Crear con IA
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/crear-sesion-manual">
                  <Edit2 className="mr-2 h-4 w-4" /> Crear Manualmente
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sesiones.map((sesion) => (
            <div key={sesion.id} className="border border-gray-700 bg-gray-50 text-gray-800 shadow-lg rounded-md">
              {/* Header Section */}
              <div className="bg-gray-800 text-white p-3 rounded-t-md">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold uppercase">TEMA: {getSessionTema(sesion)}</h2>
                  <div className="text-right">
                    <p className="text-sm">FECHA: {formatDate(sesion.fecha)}</p>
                    <p className="text-sm">Nº SESIÓN: {sesion.numero_sesion || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <p>EQUIPO 1: {sesion.equipo || 'No especificado'}</p>
                  <p>EQUIPO 2: {sesion.club || 'No especificado'}</p>
                  {/* PTS omitido ya que no está en los datos */}
                </div>
              </div>

              {/* Parte Inicial */}
              <div className="p-3 border-b border-gray-600">
                <div className="flex justify-between items-center bg-gray-700 text-white px-2 py-1 mb-2 rounded">
                  <h3 className="font-semibold">PARTE INICIAL</h3>
                  <span className="text-xs">{getExerciseDuration(sesion.warmUp) || (typeof sesion.warmUp === 'object' ? 'Tiempo no esp.' : '')}</span>
                </div>
                <div className="flex gap-2 items-start">
                  <Image src="https://placehold.co/150x100.png?text=Warm-up" alt="Calentamiento" width={100} height={70} className="rounded border border-gray-400" data-ai-hint="futsal warm up" />
                  <p className="text-sm flex-1">{formatExerciseName(sesion.warmUp)}</p>
                </div>
              </div>

              {/* Parte Principal */}
              <div className="p-3 border-b border-gray-600">
                <div className="bg-gray-700 text-white px-2 py-1 mb-2 rounded">
                  <h3 className="font-semibold text-center">PARTE PRINCIPAL</h3>
                </div>
                <div className="space-y-3">
                  {sesion.mainExercises.map((ex, index) => (
                    <div key={index} className="p-2 border border-gray-400 rounded bg-white">
                      <div className="flex justify-between items-center mb-1 text-xs">
                        <span>{/* Superficie - Omitido, no en datos de sesion.mainExercises */}</span>
                        <span>{/* Jugadores - Omitido */}</span>
                        <span className="font-medium">TIEMPO: {getExerciseDuration(ex) || (typeof ex === 'object' ? 'No esp.' : '')}</span>
                      </div>
                      <div className="flex gap-2 items-start">
                        <Image src={`https://placehold.co/150x100.png?text=Main+Ex.+${index + 1}`} alt={`Ejercicio Principal ${index + 1}`} width={100} height={70} className="rounded border border-gray-400" data-ai-hint="futsal drill court" />
                        <p className="text-sm flex-1">{formatExerciseName(ex)}</p>
                      </div>
                       {typeof ex === 'object' && ex.id && (
                            <Button variant="link" size="sm" asChild className="text-xs p-0 h-auto mt-1">
                                <Link href={`/ejercicios#${ex.id}`} target="_blank" rel="noopener noreferrer">Ver detalles del ejercicio</Link>
                            </Button>
                        )}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Total Duration */}
                <div className="p-3 border-b border-gray-600 text-center">
                    <p className="font-semibold text-sm">
                        <ClockIcon className="inline-block mr-1 h-4 w-4" />
                        TIEMPO TOTAL ENTRENAMIENTO (APROX.): {getTotalDuration(sesion)}
                    </p>
                </div>


              {/* Fase Final */}
              <div className="p-3 border-b border-gray-600">
                 <div className="flex justify-between items-center bg-gray-700 text-white px-2 py-1 mb-2 rounded">
                  <h3 className="font-semibold">FASE FINAL - VUELTA A LA CALMA</h3>
                   <span className="text-xs">{getExerciseDuration(sesion.coolDown) || (typeof sesion.coolDown === 'object' ? 'Tiempo no esp.' : '')}</span>
                </div>
                <p className="text-sm">{formatExerciseName(sesion.coolDown)}</p>
              </div>

              {/* Observaciones */}
              {(sesion.coachNotes && sesion.coachNotes.trim() !== "") && (
                <div className="p-3">
                  <h3 className="font-semibold mb-1 text-sm uppercase">OBSERVACIONES:</h3>
                  <p className="text-sm whitespace-pre-wrap">{sesion.coachNotes}</p>
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="p-3 mt-2 flex flex-col sm:flex-row gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-auto border-gray-600 text-gray-700 hover:bg-gray-200">
                      <Eye className="mr-2 h-4 w-4" /> Ver Detalles (Original)
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
                    <DialogHeader>
                      <div className="flex justify-between items-center">
                        <DialogTitle className="text-2xl text-primary font-headline">
                           {formatDate(sesion.fecha)}
                           {sesion.numero_sesion && ` | Sesión #${sesion.numero_sesion}`}
                        </DialogTitle>
                        <Badge variant={sesion.type === "AI" ? "default" : "secondary"}>
                           {sesion.type === "AI" ? <Bot className="mr-1 h-3 w-3"/> : <Edit2 className="mr-1 h-3 w-3"/>}
                          {sesion.type}
                        </Badge>
                      </div>
                      <DialogDescription className="text-gray-600">
                         Club: {sesion.club || 'N/A'} | Equipo: {sesion.equipo || 'N/A'} | Temporada: {sesion.temporada || 'N/A'}
                        <br/>
                        Tiempo Total (aprox.): {getTotalDuration(sesion)}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-4 text-gray-700">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">1. Calentamiento:</h3>
                        <p className="text-sm">{formatExerciseName(sesion.warmUp)} {getExerciseDuration(sesion.warmUp)}</p>
                      </div>
                       <div>
                        <h3 className="font-semibold text-lg mb-1">2. Ejercicios Principales:</h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          {sesion.mainExercises.map((ex, index) => <li key={index}>{formatExerciseName(ex)} {getExerciseDuration(ex)}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">3. Vuelta a la Calma:</h3>
                        <p className="text-sm">{formatExerciseName(sesion.coolDown)} {getExerciseDuration(sesion.coolDown)}</p>
                      </div>
                      {sesion.coachNotes && (
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Notas del Entrenador (IA):</h3>
                          <p className="text-sm whitespace-pre-wrap">{sesion.coachNotes}</p>
                        </div>
                      )}
                      {sesion.type === "AI" && (
                        <>
                          {sesion.teamDescription && <div><h3 className="font-semibold text-lg mb-1">Descripción del Equipo (IA):</h3><p className="text-sm whitespace-pre-wrap">{sesion.teamDescription}</p></div>}
                          {sesion.trainingGoals && <div><h3 className="font-semibold text-lg mb-1">Objetivos del Entrenamiento (IA):</h3><p className="text-sm whitespace-pre-wrap">{sesion.trainingGoals}</p></div>}
                          {sesion.sessionFocus && <div><h3 className="font-semibold text-lg mb-1">Enfoque de la Sesión (IA):</h3><p className="text-sm whitespace-pre-wrap">{sesion.sessionFocus}</p></div>}
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-blue-600 text-blue-700 hover:bg-blue-100"
                  onClick={() => handleEditSessionClick(sesion.type, sesion.id)}
                  disabled={sesion.type === "AI"}
                  title={sesion.type === "AI" ? "La edición de sesiones AI no está disponible" : "Editar sesión"}
                >
                  <Edit2 className="mr-2 h-4 w-4" /> Editar Sesión
                </Button>
                <Button
                  variant="destructive"
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => handleDeleteSessionClick(sesion.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Borrar Sesión
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-800">Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              ¿Estás seguro de que quieres eliminar esta sesión permanentemente? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionToDeleteId(null)} className="border-gray-400 text-gray-700 hover:bg-gray-100">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSession} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
