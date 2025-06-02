"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, ListChecks, Bot, Edit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from "next/link";

interface Sesion {
  id: string;
  userId: string;
  type: "AI" | "Manual";
  sessionTitle: string;
  warmUp: string | { id: string; ejercicio: string };
  mainExercises: (string | { id: string; ejercicio: string })[];
  coolDown: string | { id: string; ejercicio: string };
  coachNotes?: string;
  numero_sesion?: string;
  fecha?: string | Timestamp;
  temporada?: string;
  club?: string;
  equipo?: string;
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
        return new Date(dateValue).toLocaleDateString('es-ES');
      } catch (e) {
        return dateValue; // if string is not a valid date
      }
    }
    if (dateValue.toDate) { // Firebase Timestamp
      return dateValue.toDate().toLocaleDateString('es-ES');
    }
    return 'Fecha inválida';
  };
  
  const formatExerciseName = (exercise: string | { id: string; ejercicio: string }): string => {
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
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl font-semibold text-primary font-headline truncate" title={sesion.sessionTitle}>
                    {sesion.sessionTitle}
                  </CardTitle>
                  <Badge variant={sesion.type === "AI" ? "default" : "secondary"} className="ml-2 shrink-0">
                    {sesion.type === "AI" ? <Bot className="mr-1 h-3 w-3"/> : <Edit className="mr-1 h-3 w-3"/>}
                    {sesion.type}
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Fecha: {formatDate(sesion.fecha || sesion.createdAt)}
                  {sesion.numero_sesion && ` | Sesión #${sesion.numero_sesion}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <p className="text-sm text-foreground/80"><strong>Club:</strong> {sesion.club || 'N/A'}</p>
                <p className="text-sm text-foreground/80"><strong>Equipo:</strong> {sesion.equipo || 'N/A'}</p>
                <p className="text-sm text-foreground/80"><strong>Temporada:</strong> {sesion.temporada || 'N/A'}</p>
                <div className="pt-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">Calentamiento:</h4>
                  <p className="text-sm truncate" title={formatExerciseName(sesion.warmUp)}>{formatExerciseName(sesion.warmUp)}</p>
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

