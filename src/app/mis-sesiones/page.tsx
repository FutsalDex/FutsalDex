
"use client";

import { useAuth } from "@/contexts/auth-context";
// CAMBIO IMPORTANTE AQUÍ: Ahora importamos la función getFirebaseDb
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, orderBy as firestoreOrderBy, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, Bot, Edit2, Trash2, Filter as FilterIcon, CalendarDays, Info, ArrowLeft } from "lucide-react";
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
import { parseDurationToMinutes } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { deleteSession } from "@/lib/actions/user-actions";


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

const createGuestSessions = (): Sesion[] => {
    const now = Timestamp.now();
    const createDate = (daysAgo: number) => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString().split('T')[0];
    };
    return [
        {
            id: 'demo_manual_1', userId: 'guest', type: 'Manual', sessionTitle: 'Sesión de Finalización',
            warmUp: { id: 'w1', ejercicio: 'Rondo 4 vs 1', duracion: '10' },
            mainExercises: [{ id: 'm1', ejercicio: 'Finalización tras centro lateral', duracion: '15' }, { id: 'm2', ejercicio: 'Situación 2 vs 1 + Portero', duracion: '15' }],
            coolDown: { id: 'c1', ejercicio: 'Estiramientos estáticos', duracion: '5' },
            numero_sesion: 'D1', fecha: createDate(5), createdAt: now
        },
        {
            id: 'demo_ai_1', userId: 'guest', type: 'AI', sessionTitle: 'Sesión de Transiciones',
            warmUp: 'Calentamiento dinámico con balón, pases y movilidad articular (10 min).',
            mainExercises: ['Ejercicio de transición defensa-ataque en medio campo (20 min).', 'Partido condicionado 4 vs 4 con porterías pequeñas para fomentar transiciones rápidas (20 min).'],
            coolDown: 'Trote ligero y estiramientos suaves (5 min).',
            coachNotes: 'Focalizar en la velocidad de reacción al perder o recuperar el balón.',
            preferredSessionLengthMinutes: 55, numero_sesion: 'D2', fecha: createDate(2), createdAt: now
        }
    ];
};

const ALL_MONTHS = "ALL";

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
      <MisSesionesContent />
  );
}

function MisSesionesContent() {
  const { user, isRegisteredUser, isSubscribed, isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sessionToDeleteId, setSessionToDeleteId] = useState<string | null>(null);

  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(ALL_MONTHS);
  const [activeFilter, setActiveFilter] = useState<{ year: number; month: number | 'ALL' } | null>(null);

  const fetchSesiones = useCallback(async (filter?: { year: number; month: number | 'ALL' } | null) => {
    if (!user) {
        setSesiones(createGuestSessions());
        setIsLoading(false);
        return;
    };
    setIsLoading(true);

    let q_constraints = [
        where("userId", "==", user.uid),
    ];

    if (filter) {
        const { year, month } = filter;
        let startDateString: string;
        let endDateString: string;

        if (month === ALL_MONTHS) {
            // Filter for the whole year
            startDateString = `${year}-01-01`;
            endDateString = `${year + 1}-01-01`;
        } else {
            // Filter for a specific month
            const monthString = month < 10 ? `0${month}` : `${month}`;
            startDateString = `${year}-${monthString}-01`;
            
            let nextMonth = month === 12 ? 1 : month + 1;
            let nextYear = month === 12 ? year + 1 : year;
            const nextMonthString = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
            endDateString = `${nextYear}-${nextMonthString}-01`;
        }
        
        q_constraints.push(where("fecha", ">=", startDateString));
        q_constraints.push(where("fecha", "<", endDateString));
    }
    
    q_constraints.push(firestoreOrderBy("fecha", "asc"));
    q_constraints.push(firestoreOrderBy("createdAt", "asc"));

    try {
      // OBTENEMOS LA INSTANCIA DE FIRESTORE LLAMANDO A LA FUNCIÓN
      const dbInstance = getFirebaseDb();
      const finalQuery = query(collection(dbInstance, "mis_sesiones"), ...q_constraints);
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
  }, [user, toast]); // Eliminamos 'db' de las dependencias, ya que se obtiene dentro de la función

  useEffect(() => {
    if (isRegisteredUser) {
        const now = new Date();
        const initialFilter = { year: now.getFullYear(), month: ALL_MONTHS as 'ALL' };
        setActiveFilter(initialFilter);
        setSelectedYear(initialFilter.year.toString());
        setSelectedMonth(initialFilter.month);
        fetchSesiones(initialFilter);
    } else {
        setSesiones(createGuestSessions());
        setIsLoading(false);
    }
  }, [fetchSesiones, isRegisteredUser]);

  const handleApplyFilter = () => {
    if (selectedYear && selectedMonth) {
      const yearNum = parseInt(selectedYear, 10);
      const monthValue = selectedMonth === ALL_MONTHS ? ALL_MONTHS : parseInt(selectedMonth, 10);
      const newFilter = { year: yearNum, month: monthValue };
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

  const formatExerciseName = (exercise: string | EjercicioInfo | null | undefined): string => {
    if (!exercise) return "Ejercicio no especificado";
    if (typeof exercise === 'string') return exercise;
    return exercise.ejercicio || "Ejercicio sin nombre";
  };
  
  const getTotalDuration = (sesion: Sesion): string => {
    if (sesion.type === "AI" && sesion.preferredSessionLengthMinutes) {
        return `${sesion.preferredSessionLengthMinutes} min`;
    } else if (sesion.type === "Manual") {
        let totalMinutes = 0;
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
        return totalMinutes > 0 ? `${totalMinutes} min` : 'N/A';
    }
    return 'N/A';
  };

  const handleDeleteSessionClick = (sessionId: string) => {
    setSessionToDeleteId(sessionId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSession = async () => {
    if (!isRegisteredUser || (!isSubscribed && !isAdmin)) {
      toast({ title: "Suscripción Requerida", description: "Necesitas una suscripción Pro para eliminar sesiones." });
      return;
    }
    if (!sessionToDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteSession({ sessionId: sessionToDeleteId });
      if (activeFilter) {
        fetchSesiones(activeFilter);
      } else {
        const now = new Date();
        fetchSesiones({ year: now.getFullYear(), month: ALL_MONTHS as 'ALL' });
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

  const handleEditSessionClick = (sessionId: string) => {
    router.push(`/mis-sesiones/edit/${sessionId}`);
  };

  const years = getYearsRange();

  if (isLoading && sesiones.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Mis Sesiones</h1>
            <p className="text-lg text-foreground/80">
                Aquí encontrarás todas las sesiones de entrenamiento que has creado.
            </p>
        </div>
        <Button asChild variant="outline">
            <Link href="/mi-equipo">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
            </Link>
        </Button>
      </header>

      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center">
            <FilterIcon className="mr-2 h-5 w-5 text-primary" />
            Filtrar Sesiones
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 items-center">
          <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!isRegisteredUser}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!isRegisteredUser}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MONTHS}>Todos los meses</SelectItem>
              {MESES.map(mes => <SelectItem key={mes.value} value={mes.value.toString()}>{mes.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleApplyFilter} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!isRegisteredUser}>Aplicar Filtro</Button>
        </CardContent>
      </Card>
      
        {!isRegisteredUser && (
            <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
                <Info className="h-4 w-4 text-blue-700" />
                <AlertTitle className="text-blue-800 font-semibold">Modo de Demostración</AlertTitle>
                <AlertDescription>
                    Estás viendo sesiones de ejemplo. Para guardar y gestionar tus propias sesiones, por favor{" "}
                    <Link href="/register" className="font-bold underline">regístrate</Link> o{" "}
                    <Link href="/login" className="font-bold underline">inicia sesión</Link>. Los filtros están desactivados.
                </AlertDescription>
            </Alert>
        )}

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
              {isRegisteredUser ? "No Hay Sesiones para este Periodo" : "No Tienes Sesiones Guardadas"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-6 text-foreground/80">
              {isRegisteredUser
                ? `No se encontraron sesiones para tu selección. Prueba con otro periodo.`
                : "Para guardar y ver tus sesiones, necesitas una cuenta."}
              <br/>
              {isRegisteredUser ? "¡Empieza ahora o ajusta los filtros!" : <Link href="/register" className="text-primary font-bold hover:underline">Regístrate gratis</Link>}
            </CardDescription>
            <div className="flex justify-center gap-4">
              <Button asChild variant="outline">
                <Link href="/crear-sesion">
                  <Edit2 className="mr-2 h-4 w-4" /> Crear Nueva Sesión
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
                  {sesion.type === "AI" && <Bot className="h-6 w-6 text-accent" title="Sesión generada por IA"/>}
                </div>
                   <p className="text-xs text-muted-foreground">
                     Número sesión: {sesion.numero_sesion || "N/A"}
                   </p>
              </CardHeader>
              <CardContent className="space-y-2 flex-grow pb-6"> 
                <div>
                  <p className="text-xs"> 
                    <span className="font-semibold text-muted-foreground">Tiempo total: </span>
                    <span className="font-medium text-xs">{getTotalDuration(sesion)}</span>
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
                <Button asChild variant="outline" className="w-full text-sm bg-background shadow-md hover:shadow-lg" disabled={!isRegisteredUser}>
                    <Link href={`/mis-sesiones/detalle/${sesion.id}`}>
                        <Eye className="mr-2 h-4 w-4" /> Ver Ficha Detallada
                    </Link>
                </Button>
                <div className="flex flex-row justify-center gap-2 w-full">
                  <Button
                    variant="outline"
                    className="flex-1 text-sm bg-background shadow-md hover:shadow-lg"
                    onClick={() => handleEditSessionClick(sesion.id)}
                    title="Editar sesión"
                    disabled={sesion.type === 'AI' || !isRegisteredUser}
                  >
                    <Edit2 className="mr-2 h-4 w-4" /> Editar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 text-sm shadow-md hover:shadow-lg"
                    onClick={() => handleDeleteSessionClick(sesion.id)}
                    disabled={!isRegisteredUser}
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
            <AlertDialogAction onClick={confirmDeleteSession} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
