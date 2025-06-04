
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy as firestoreOrderBy, getDocs, Timestamp, deleteDoc, doc, getDoc, DocumentData } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Bot, Edit2, Trash2, Filter as FilterIcon, CalendarDays, ClockIcon, Sparkles, Info, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader as ShadcnDialogHeader, DialogTitle as ShadcnDialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader as AlertDialogHead, 
  AlertDialogTitle as AlertDialogHeading,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { parseDurationToMinutes } from "@/lib/utils";


interface EjercicioInfo {
  id: string;
  ejercicio: string;
  duracion?: string;
  descripcion?: string;
  objetivos?: string;
  categoria?: string;
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
  fecha?: string;
  temporada?: string;
  club?: string;
  equipo?: string;
  preferredSessionLengthMinutes?: number;
  duracionTotalManualEstimada?: number;
  createdAt: Timestamp;
  teamDescription?: string;
  trainingGoals?: string;
  sessionFocus?: string;
}

interface EjercicioDetallado extends EjercicioInfo {
  // Ensure all fields from EjercicioInfo are here, plus any specific detailed ones
  descripcion: string; // Mark as non-optional if it's always expected
  objetivos: string; // Mark as non-optional
  categoria: string; // Mark as non-optional
  imagen?: string; // Add imagen field
}

interface SesionConDetallesEjercicio extends Omit<Sesion, 'warmUp' | 'mainExercises' | 'coolDown'> {
  warmUp: string | EjercicioDetallado;
  mainExercises: (string | EjercicioDetallado)[];
  coolDown: string | EjercicioDetallado;
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

  const [selectedSesionForDialog, setSelectedSesionForDialog] = useState<Sesion | null>(null);
  const [detailedSessionData, setDetailedSessionData] = useState<SesionConDetallesEjercicio | null>(null);
  const [isLoadingDialogDetails, setIsLoadingDialogDetails] = useState(false);


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
        firestoreOrderBy("fecha", "asc"),
        firestoreOrderBy("createdAt", "asc")
    ];

    try {
      const finalQuery = query(collection(db, "mis_sesiones"), ...q_constraints);
      const querySnapshot = await getDocs(finalQuery);
      const fetchedSesiones = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Sesion));
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


  const fetchExerciseDetailsForDialog = useCallback(async (sesion: Sesion) => {
    setIsLoadingDialogDetails(true);
    setDetailedSessionData(null); 

    try {
      const exerciseIdsToFetch: string[] = [];
      if (sesion.type === "Manual") {
        if (typeof sesion.warmUp === 'object' && sesion.warmUp?.id) exerciseIdsToFetch.push(sesion.warmUp.id);
        sesion.mainExercises.forEach(ex => {
          if (typeof ex === 'object' && ex?.id) exerciseIdsToFetch.push(ex.id);
        });
        if (typeof sesion.coolDown === 'object' && sesion.coolDown?.id) exerciseIdsToFetch.push(sesion.coolDown.id);
      }

      const uniqueExerciseIds = Array.from(new Set(exerciseIdsToFetch));
      const exerciseDocs: Record<string, EjercicioDetallado> = {};

      if (uniqueExerciseIds.length > 0) {
        const MAX_IN_VALUES = 30;
        for (let i = 0; i < uniqueExerciseIds.length; i += MAX_IN_VALUES) {
            const chunk = uniqueExerciseIds.slice(i, i + MAX_IN_VALUES);
            if (chunk.length > 0) {
                const exercisesQuery = query(collection(db, "ejercicios_futsal"), where("__name__", "in", chunk));
                const querySnapshot = await getDocs(exercisesQuery);
                querySnapshot.forEach(docSnap => {
                  const data = docSnap.data() as Omit<EjercicioDetallado, 'id'>;
                  exerciseDocs[docSnap.id] = { 
                    id: docSnap.id, 
                    ejercicio: data.ejercicio || "Ejercicio sin nombre",
                    descripcion: data.descripcion || "Descripción no disponible.",
                    objetivos: data.objetivos || "Objetivos no especificados.",
                    categoria: data.categoria || "Categoría no especificada.",
                    duracion: data.duracion, 
                    imagen: data.imagen || `https://placehold.co/300x200.png?text=${encodeURIComponent(data.ejercicio || 'Ejercicio')}`,
                    ...data 
                  };
                });
            }
        }
      }
      
      let enrichedWarmUp: string | EjercicioDetallado = sesion.warmUp as string | EjercicioDetallado;
      let enrichedMainExercises: (string | EjercicioDetallado)[] = sesion.mainExercises as (string | EjercicioDetallado)[];
      let enrichedCoolDown: string | EjercicioDetallado = sesion.coolDown as string | EjercicioDetallado;

      if (sesion.type === "Manual") {
          enrichedWarmUp = (typeof sesion.warmUp === 'object' && sesion.warmUp?.id && exerciseDocs[sesion.warmUp.id]) ? exerciseDocs[sesion.warmUp.id] : sesion.warmUp;
          enrichedMainExercises = sesion.mainExercises.map(ex => (typeof ex === 'object' && ex?.id && exerciseDocs[ex.id]) ? exerciseDocs[ex.id] : ex);
          enrichedCoolDown = (typeof sesion.coolDown === 'object' && sesion.coolDown?.id && exerciseDocs[sesion.coolDown.id]) ? exerciseDocs[sesion.coolDown.id] : sesion.coolDown;
      }


      setDetailedSessionData({
        ...sesion,
        warmUp: enrichedWarmUp,
        mainExercises: enrichedMainExercises,
        coolDown: enrichedCoolDown,
      });

    } catch (error) {
      console.error("Error fetching exercise details for dialog:", error);
      toast({ title: "Error al cargar detalles", description: "No se pudieron cargar los detalles completos de los ejercicios.", variant: "destructive"});
      setDetailedSessionData(sesion as SesionConDetallesEjercicio); 
    }
    setIsLoadingDialogDetails(false);
  }, [toast]);


  const handleOpenDialog = (sesion: Sesion) => {
    setSelectedSesionForDialog(sesion);
    fetchExerciseDetailsForDialog(sesion);
  };


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

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatExerciseName = (exercise: string | EjercicioInfo | EjercicioDetallado | null | undefined): string => {
    if (!exercise) return "Ejercicio no especificado";
    if (typeof exercise === 'string') return exercise;
    return exercise.ejercicio || "Ejercicio sin nombre";
  };

  const formatExerciseDescription = (exercise: string | EjercicioInfo | EjercicioDetallado | null | undefined): string => {
    if (!exercise || typeof exercise === 'string' || !exercise.descripcion) return "Descripción no disponible.";
    return exercise.descripcion;
  };
  
  const getExerciseDuration = (exercise: string | EjercicioInfo | EjercicioDetallado | null | undefined): string => {
    if (!exercise || typeof exercise === 'string' || !exercise.duracion || exercise.duracion === "0") return "N/A";
    return `${exercise.duracion} min`;
  };
  
  const getExerciseImage = (exercise: string | EjercicioInfo | EjercicioDetallado | null | undefined, defaultText: string): string => {
    if (typeof exercise === 'object' && exercise?.imagen) return exercise.imagen;
    const text = typeof exercise === 'object' && exercise?.ejercicio ? exercise.ejercicio : defaultText;
    return `https://placehold.co/300x200.png?text=${encodeURIComponent(text)}`;
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
  
 const getDialogTotalDuration = (sesion: SesionConDetallesEjercicio | null): string => {
    if (!sesion) return 'N/A';
    let totalMinutes = 0;

    if (sesion.type === "AI" && sesion.preferredSessionLengthMinutes) {
        totalMinutes = sesion.preferredSessionLengthMinutes;
    } else if (sesion.type === "Manual") {
        if (typeof sesion.warmUp === 'object' && sesion.warmUp?.duracion) {
            totalMinutes += parseDurationToMinutes(sesion.warmUp.duracion);
        }
        sesion.mainExercises.forEach(ex => {
            if (typeof ex === 'object' && ex?.duracion) {
                totalMinutes += parseDurationToMinutes(ex.duracion);
            }
        });
        if (typeof sesion.coolDown === 'object' && sesion.coolDown?.duracion) {
            totalMinutes += parseDurationToMinutes(sesion.coolDown.duracion);
        }
    }
    return totalMinutes > 0 ? `${totalMinutes} min` : 'N/A';
};

const getMainExercisesTotalDuration = (exercises: (string | EjercicioDetallado)[]): string => {
  if (!exercises || exercises.length === 0) return '0 min';
  let totalMinutes = 0;
  exercises.forEach(ex => {
    if (typeof ex === 'object' && ex?.duracion) {
      totalMinutes += parseDurationToMinutes(ex.duracion);
    }
  });
  return totalMinutes > 0 ? `${totalMinutes} min` : '0 min';
};


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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sesiones.map((sesion) => (
            <Card key={sesion.id} className="shadow-lg flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <p className="text-2xl font-bold text-primary font-headline">
                      {formatDate(sesion.fecha)}
                    </p>
                  </div>
                </div>
                 <p className="text-xs text-muted-foreground">
                    Número sesión: {sesion.numero_sesion || "N/A"}
                  </p>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow pb-6"> 
                <div>
                  <p className="text-xs"> 
                    <span className="font-semibold text-muted-foreground">Tiempo total: </span>
                    <span className="font-medium">{getDialogTotalDuration(sesion as SesionConDetallesEjercicio)}</span>
                  </p>
                </div>

                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-muted-foreground">Calentamiento:</p>
                  <p className="text-xs pl-2 line-clamp-1">- {formatExerciseName(sesion.warmUp)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-muted-foreground">Ejercicios Principales:</p>
                  {sesion.mainExercises.length > 0 ? (
                    sesion.mainExercises.slice(0,4).map((ex, index) => ( 
                      <p key={index} className="text-xs pl-2 line-clamp-1">- {formatExerciseName(ex)}</p>
                    ))
                  ) : (
                    <p className="text-xs pl-2 text-muted-foreground">- No especificados</p>
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-muted-foreground">Vuelta a la Calma:</p>
                  <p className="text-xs pl-2 line-clamp-1">- {formatExerciseName(sesion.coolDown)}</p>
                </div>
                 {sesion.coachNotes && sesion.type === "AI" && (
                    <div>
                        <p className="text-xs font-semibold text-muted-foreground">Notas (IA):</p>
                        <p className="text-xs pl-2 line-clamp-2">{sesion.coachNotes}</p>
                    </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-center gap-2 px-4 py-4 border-t">
                <Dialog onOpenChange={(open) => { if (open) handleOpenDialog(sesion); else { setSelectedSesionForDialog(null); setDetailedSessionData(null);}}}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full text-sm bg-background shadow-md hover:shadow-lg">
                      <Eye className="mr-2 h-4 w-4" /> Ver Ficha Detallada
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-0">
                    <ShadcnDialogHeader className="p-4 border-b bg-gray-800 text-white rounded-t-md">
                        <ShadcnDialogTitle className="text-xl font-bold uppercase sr-only">SESIÓN DE ENTRENAMIENTO</ShadcnDialogTitle>
                         {detailedSessionData && (
                             <div className="flex justify-between items-start">
                                <h2 className="text-xl font-bold uppercase text-white">SESIÓN DE ENTRENAMIENTO</h2>
                                <div className="text-right">
                                <p className="text-md text-gray-300">FECHA: {formatDate(detailedSessionData.fecha)}</p>
                                <p className="text-md text-gray-300">Nº SESIÓN: {detailedSessionData.numero_sesion || 'N/A'}</p>
                                </div>
                            </div>
                         )}
                         {detailedSessionData && (
                            <div className="flex justify-between text-md text-gray-300">
                                <p>EQUIPO: {detailedSessionData.equipo || 'No especificado'}</p>
                                <p>CLUB: {detailedSessionData.club || 'No especificado'}</p>
                            </div>
                         )}
                    </ShadcnDialogHeader>
                    {isLoadingDialogDetails && !detailedSessionData && (
                        <div className="flex flex-col items-center justify-center p-10 min-h-[300px]">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                            <p className="text-lg">Cargando detalles de la sesión...</p>
                        </div>
                    )}
                    {detailedSessionData && (
                      <div className="session-print-area border border-gray-700 bg-gray-50 text-gray-800 shadow-lg m-0 rounded-b-md">
                        
                        <div className="p-4 border-b border-gray-300">
                            <div className="flex justify-between items-center bg-gray-700 text-white px-3 py-1.5 mb-3 rounded">
                                <h3 className="font-semibold text-lg uppercase">OBJETIVOS</h3>
                            </div>
                            <div className="text-sm space-y-1">
                                <p><strong className="font-medium">CATEGORÍA(S):</strong> {getDialogCategorias(detailedSessionData)}</p>
                                <p><strong className="font-medium">OBJETIVOS GENERALES:</strong> {getDialogObjetivos(detailedSessionData)}</p>
                            </div>
                        </div>

                        <div className="p-4 border-b border-gray-300">
                          <div className="flex justify-between items-center bg-gray-700 text-white px-3 py-1.5 mb-3 rounded">
                            <h3 className="font-semibold text-lg">PARTE INICIAL</h3>
                            <span className="text-sm">{getExerciseDuration(detailedSessionData.warmUp)}</span>
                          </div>
                          <div className="flex flex-col md:flex-row gap-4 items-start">
                            <div className="md:w-1/3 flex-shrink-0">
                                <Image src={getExerciseImage(detailedSessionData.warmUp, "Calentamiento")} alt="Calentamiento" width={300} height={200} className="rounded border border-gray-400 object-contain w-full aspect-[3/2]" data-ai-hint="futsal warmup"/>
                            </div>
                            <div className="flex-1">
                                <p className="text-md font-semibold">{formatExerciseName(detailedSessionData.warmUp)}</p>
                                <p className="text-sm mt-1">{formatExerciseDescription(detailedSessionData.warmUp)}</p>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 border-b border-gray-300">
                          <div className="flex justify-between items-center bg-gray-700 text-white px-3 py-1.5 mb-3 rounded">
                            <h3 className="font-semibold text-lg text-left">PARTE PRINCIPAL</h3>
                            <span className="text-sm text-right">{getMainExercisesTotalDuration(detailedSessionData.mainExercises)}</span>
                          </div>
                          <div className="space-y-4">
                            {detailedSessionData.mainExercises.map((ex, index) => (
                              <div key={typeof ex === 'string' ? `ai-main-${index}` : ex.id || `manual-main-${index}`} className="p-3 border border-gray-400 rounded bg-white">
                                <div className="flex justify-end items-center mb-1 text-sm">
                                  <span className="font-medium">TIEMPO: {getExerciseDuration(ex)}</span>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4 items-start">
                                  <div className="md:w-1/3 flex-shrink-0">
                                      <Image src={getExerciseImage(ex, `Principal ${index + 1}`)} alt={`Ejercicio Principal ${index + 1}`} width={300} height={200} className="rounded border border-gray-400 object-contain w-full aspect-[3/2]" data-ai-hint="futsal exercise"/>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-md font-semibold">{formatExerciseName(ex)}</p>
                                    <p className="text-sm mt-1">{formatExerciseDescription(ex)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="p-4 border-b border-gray-300">
                          <div className="flex justify-between items-center bg-gray-700 text-white px-3 py-1.5 mb-3 rounded">
                            <h3 className="font-semibold text-lg">FASE FINAL - VUELTA A LA CALMA</h3>
                            <span className="text-sm">{getExerciseDuration(detailedSessionData.coolDown)}</span>
                          </div>
                           <div className="flex flex-col md:flex-row gap-4 items-start">
                             <div className="md:w-1/3 flex-shrink-0">
                                 <Image src={getExerciseImage(detailedSessionData.coolDown, "Vuelta a la Calma")} alt="Vuelta a la calma" width={300} height={200} className="rounded border border-gray-400 object-contain w-full aspect-[3/2]" data-ai-hint="futsal cooldown"/>
                             </div>
                             <div className="flex-1">
                                <p className="text-md font-semibold">{formatExerciseName(detailedSessionData.coolDown)}</p>
                                <p className="text-sm mt-1">{formatExerciseDescription(detailedSessionData.coolDown)}</p>
                             </div>
                           </div>
                        </div>
                        
                         <div className="p-4 mt-3 border-b border-gray-300 text-center">
                            <p className="font-semibold text-md">
                                <ClockIcon className="inline-block mr-1.5 h-5 w-5" />
                                Tiempo total: {getDialogTotalDuration(detailedSessionData)}
                            </p>
                        </div>

                        {(detailedSessionData.coachNotes && detailedSessionData.coachNotes.trim() !== "") && (
                          <div className="p-4">
                            <h3 className="font-semibold mb-1 text-lg uppercase">OBSERVACIONES:</h3>
                            <p className="text-md whitespace-pre-wrap">{detailedSessionData.coachNotes}</p>
                          </div>
                        )}
                        {detailedSessionData.type === "AI" && (
                          <div className="p-4 space-y-2 border-t border-gray-300 mt-2">
                            {detailedSessionData.teamDescription && <div><h4 className="font-semibold text-md">Descripción del Equipo (IA):</h4><p className="text-sm whitespace-pre-wrap">{detailedSessionData.teamDescription}</p></div>}
                            {detailedSessionData.trainingGoals && detailedSessionData.type === "AI" && (!detailedSessionData.coachNotes?.includes(detailedSessionData.trainingGoals)) && <div><h4 className="font-semibold text-md">Objetivos (Input IA):</h4><p className="text-sm whitespace-pre-wrap">{detailedSessionData.trainingGoals}</p></div>}
                          </div>
                        )}
                        <div className="print-button-container p-4 mt-4 text-center border-t border-gray-300">
                            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Printer className="mr-2 h-4 w-4" />
                                Imprimir / Guardar PDF
                            </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
                <div className="flex flex-row justify-center gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 text-sm bg-background shadow-md hover:shadow-lg"
                    onClick={() => handleEditSessionClick(sesion.type, sesion.id)}
                    disabled={sesion.type === "AI"}
                    title={sesion.type === "AI" ? "La edición de sesiones AI no está disponible" : "Editar sesión"}
                  >
                    <Edit2 className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 text-sm shadow-md hover:shadow-lg"
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
        <AlertDialogContent className="bg-white">
          <AlertDialogHead>
            <AlertDialogHeading className="text-gray-800">Confirmar Eliminación</AlertDialogHeading>
            <AlertDialogDescription className="text-gray-600">
              ¿Estás seguro de que quieres eliminar esta sesión permanentemente? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHead>
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

