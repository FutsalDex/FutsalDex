
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, ListChecks, Bot, Edit, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from "next/link";

interface Sesion {
  id: string;
  userId: string;
  type: "AI" | "Manual";
  sessionTitle: string; // Sigue existiendo en los datos, pero no se usa en la cabecera de la tarjeta
  warmUp: string | { id: string; ejercicio: string };
  mainExercises: (string | { id: string; ejercicio: string })[];
  coolDown: string | { id: string; ejercicio: string };
  coachNotes?: string;
  numero_sesion?: string;
  fecha?: string | Timestamp;
  temporada?: string;
  club?: string;
  equipo?: string;
  preferredSessionLengthMinutes?: number; // Para sesiones de IA
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
  const [sesiones, setSesiones] = useState<Sesion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        // Add toast notification for error
      }
      setIsLoading(false);
    };

    fetchSesiones();
  }, [user]);

  const formatDate = (dateValue: string | Timestamp | undefined) => {
    if (!dateValue) return 'N/A';
    if (typeof dateValue === 'string') {
      try {
        const date = new Date(dateValue);
         if (isNaN(date.getTime())) return dateValue; // Devuelve la cadena si no es una fecha válida
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
  
  const formatExerciseName = (exercise: string | { id: string; ejercicio: string } | null | undefined): string => {
    if (!exercise) return "Ejercicio no especificado";
    if (typeof exercise === 'string') return exercise;
    return exercise.ejercicio;
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
          Aquí encontrarás todas las sesiones de entrenamiento que has creado, tanto con IA como manualmente.
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
            <Card key={sesion.id} className="flex flex-col overflow-hidden transition-all hover:shadow-xl">
              <CardHeader className="pb-3">
                <p className="text-lg font-semibold text-primary">
                  Fecha: {formatDate(sesion.fecha || sesion.createdAt)}
                  {sesion.numero_sesion && ` | Sesión #${sesion.numero_sesion}`}
                </p>
                 <p className="text-sm text-foreground/80"><strong>Club:</strong> {sesion.club || 'N/A'}</p>
                 <p className="text-sm text-foreground/80"><strong>Equipo:</strong> {sesion.equipo || 'N/A'}</p>
                 <p className="text-sm text-foreground/80"><strong>Temporada:</strong> {sesion.temporada || 'N/A'}</p>
                 
                 {sesion.type === "AI" && sesion.preferredSessionLengthMinutes && (
                    <p className="text-sm text-foreground/80 flex items-center">
                        <Clock className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        <strong>Duración IA:</strong> {sesion.preferredSessionLengthMinutes} min
                    </p>
                 )}
                 {sesion.type === "Manual" && (
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
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Eye className="mr-2 h-4 w-4" /> Ver Detalles Completos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <div className="flex justify-between items-center">
                        {/* El título original de la sesión ahora se muestra aquí */}
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
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
