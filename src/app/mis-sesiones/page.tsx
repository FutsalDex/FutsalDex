
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, ListChecks, Bot, Edit, Clock, Edit2, Trash2, Filter as FilterIcon } from "lucide-react";
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
  fecha?: string; // Guardado como YYYY-MM-DD
  temporada?: string;
  club?: string;
  equipo?: string;
  preferredSessionLengthMinutes?: number;
  duracionTotalManualEstimada?: number;
  createdAt: Timestamp;
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
        targetMonth = filter.month; // 1-indexed
    } else {
        const now = new Date();
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1; // 1-indexed
    }

    // Formatear mes para el string YYYY-MM-DD
    const monthString = targetMonth < 10 ? `0${targetMonth}` : `${targetMonth}`;
    const startDateString = `${targetYear}-${monthString}-01`;

    // Calcular inicio del siguiente mes para el rango
    let nextMonth = targetMonth === 12 ? 1 : targetMonth + 1;
    let nextYear = targetMonth === 12 ? targetYear + 1 : targetYear;
    const nextMonthString = nextMonth < 10 ? `0${nextMonth}` : `${nextMonth}`;
    const startOfNextMonthString = `${nextYear}-${nextMonthString}-01`;

    let q_constraints = [
        where("userId", "==", user.uid),
        where("fecha", ">=", startDateString),
        where("fecha", "<", startOfNextMonthString),
        orderBy("fecha", "asc"),
        orderBy("createdAt", "asc") // Orden secundario por si hay varias sesiones en la misma fecha
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
      if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) { // Formato YYYY-MM-DD
         const [year, month, day] = dateValue.split('-').map(Number);
         // Para evitar problemas de zona horaria que cambian el día, crea la fecha en UTC
         // y luego formatea. O simplemente asume que el string es la fecha correcta.
         // Aquí usamos el constructor Date que puede ser sensible a la zona horaria local.
         // Una forma más robusta sería parsear y formatear directamente, o usar UTC.
         // Dado que el input es YYYY-MM-DD, podemos confiar en el parseo simple si las fechas
         // se guardan consistentemente y no se manipulan con zonas horarias.
         date = new Date(year, month - 1, day, 12,0,0); // Set to midday
      } else {
         date = new Date(dateValue); // Try parsing other string formats
      }
    } else if (dateValue && typeof dateValue.toDate === 'function') { // Firestore Timestamp
      date = dateValue.toDate();
    } else {
      return 'Fecha inválida';
    }

    if (isNaN(date.getTime())) return (typeof dateValue === 'string' ? dateValue : 'Fecha inválida'); // If still invalid

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
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
        <Card className="text-center py-12">
          <CardHeader>
            <ListChecks className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl font-headline">
              {activeFilter ? "No Hay Sesiones para este Mes" : "No Tienes Sesiones este Mes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-6">
              {activeFilter
                ? `No se encontraron sesiones para ${MESES.find(m=>m.value === activeFilter.month)?.label} de ${activeFilter.year}.`
                : "Parece que aún no has creado ninguna sesión de entrenamiento este mes."}
              <br/>
              ¡Empieza ahora o ajusta los filtros!
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
                  {formatDate(sesion.fecha)}
                  {sesion.numero_sesion && ` | Sesión #${sesion.numero_sesion}`}
                </p>
                 <p className="text-sm text-foreground/80"><strong>Club:</strong> {sesion.club || 'N/A'}</p>
                 <p className="text-sm text-foreground/80"><strong>Equipo:</strong> {sesion.equipo || 'N/A'}</p>
                 <p className="text-sm text-foreground/80"><strong>Temporada:</strong> {sesion.temporada || 'N/A'}</p>

                <div className="flex items-center text-sm text-foreground/80 mt-1">
                    <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <strong>Tiempo Total:&nbsp;</strong>
                    {sesion.type === "AI" && sesion.preferredSessionLengthMinutes ? `${sesion.preferredSessionLengthMinutes} min (IA)` :
                     sesion.type === "Manual" && sesion.duracionTotalManualEstimada !== undefined ? `${sesion.duracionTotalManualEstimada} min` :
                     'No especificada'}
                 </div>
              </CardHeader>
              <CardContent className="flex-grow space-y-3 pt-2">
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">1. Fase Inicial:</h4>
                  <p className="text-sm ml-2">{formatExerciseName(sesion.warmUp)}</p>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">2. Fase Principal:</h4>
                  <ul className="list-none pl-2 space-y-0.5 text-sm">
                    {sesion.mainExercises.map((ex, index) => (
                        <li key={index} className="flex">
                            <span className="mr-1.5">{`${index + 1}.`}</span>
                            <span>{formatExerciseName(ex)}</span>
                        </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground tracking-wider">3. Fase Final:</h4>
                  <p className="text-sm ml-2">{formatExerciseName(sesion.coolDown)}</p>
                </div>
              </CardContent>
              <CardFooter className="flex-col space-y-2 items-stretch pt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="mr-2 h-4 w-4" /> Ver Detalles Completos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <div className="flex justify-between items-center">
                        <DialogTitle className="text-2xl text-primary font-headline">
                           {formatDate(sesion.fecha)}
                           {sesion.numero_sesion && ` | Sesión #${sesion.numero_sesion}`}
                        </DialogTitle>
                        <Badge variant={sesion.type === "AI" ? "default" : "secondary"}>
                           {sesion.type === "AI" ? <Bot className="mr-1 h-3 w-3"/> : <Edit className="mr-1 h-3 w-3"/>}
                          {sesion.type}
                        </Badge>
                      </div>
                      <DialogDescription>
                         Club: {sesion.club || 'N/A'} | Equipo: {sesion.equipo || 'N/A'} | Temporada: {sesion.temporada || 'N/A'}
                        <br/>
                        Tiempo Total (aprox.): {sesion.type === "AI" && sesion.preferredSessionLengthMinutes ? `${sesion.preferredSessionLengthMinutes} min (IA)` :
                        sesion.type === "Manual" && sesion.duracionTotalManualEstimada !== undefined ? `${sesion.duracionTotalManualEstimada} min` :
                        'No especificada'}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4 space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">1. Calentamiento:</h3>
                        <p className="text-sm">{formatExerciseName(sesion.warmUp)}</p>
                      </div>
                       <div>
                        <h3 className="font-semibold text-lg mb-1">2. Ejercicios Principales:</h3>
                        <ul className="list-disc pl-5 space-y-1 text-sm">
                          {sesion.mainExercises.map((ex, index) => <li key={index}>{formatExerciseName(ex)}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg mb-1">3. Vuelta a la Calma:</h3>
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

    