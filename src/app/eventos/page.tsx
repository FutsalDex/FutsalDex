
"use client";

import { useAuth } from "@/contexts/auth-context";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, orderBy as firestoreOrderBy, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CalendarClock, ArrowRight, ClipboardList, Trophy, Info } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Evento {
  id: string;
  type: 'sesion' | 'partido';
  date: Date;
  title: string;
  description: string;
  link: string;
}

const formatDate = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return 'Fecha inválida';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const parseDate = (dateValue: string | Timestamp | undefined): Date | null => {
    if (!dateValue) return null;
    let date: Date;
    if (typeof dateValue === 'string') {
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateValue.split('-').map(Number);
            date = new Date(Date.UTC(year, month - 1, day));
        } else {
            date = new Date(dateValue);
        }
    } else if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
    } else {
        return null;
    }
    return isNaN(date.getTime()) ? null : date;
};

const createGuestEvents = (): Evento[] => {
    const today = new Date();
    const createDate = (daysAgo: number) => {
        const date = new Date();
        date.setDate(today.getDate() - daysAgo);
        return date;
    };
    return [
        { id: 'guest_match_1', type: 'partido', date: createDate(2), title: 'FutsalDex Demo vs Rivales FC', description: 'Jornada 15 de Liga de Exhibición', link: '/estadisticas/historial' },
        { id: 'guest_session_1', type: 'sesion', date: createDate(3), title: 'Sesión de Finalización', description: 'Trabajo de definición y movimientos de pívot', link: '/mis-sesiones' },
        { id: 'guest_match_2', type: 'partido', date: createDate(9), title: 'Titanes FS vs FutsalDex Demo', description: 'Amistoso de pre-temporada', link: '/estadisticas/historial' },
        { id: 'guest_session_2', type: 'sesion', date: createDate(10), title: 'Sesión de Transiciones (IA)', description: 'Foco en transiciones defensa-ataque', link: '/mis-sesiones' },
    ].sort((a, b) => b.date.getTime() - a.date.getTime());
};


function EventosPageContent() {
  const { user, isRegisteredUser } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Evento[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!isRegisteredUser || !user) {
        setEvents(createGuestEvents());
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    try {
      const db = getFirebaseDb();
      const sesionesQuery = query(collection(db, "mis_sesiones"), where("userId", "==", user.uid));
      const partidosQuery = query(collection(db, "partidos_estadisticas"), where("userId", "==", user.uid));
      
      const [sesionesSnapshot, partidosSnapshot] = await Promise.all([
        getDocs(sesionesQuery),
        getDocs(partidosQuery)
      ]);

      const fetchedEvents: Evento[] = [];

      sesionesSnapshot.forEach(doc => {
        const data = doc.data();
        const date = parseDate(data.fecha);
        if (date) {
            fetchedEvents.push({
                id: doc.id,
                type: 'sesion',
                date: date,
                title: data.sessionTitle || `Sesión del ${formatDate(date)}`,
                description: `Tipo: ${data.type || 'Manual'}. Nº ${data.numero_sesion || 'N/A'}`,
                link: `/mis-sesiones/detalle/${doc.id}`
            });
        }
      });

      partidosSnapshot.forEach(doc => {
        const data = doc.data();
        const date = parseDate(data.fecha);
        if (date) {
            fetchedEvents.push({
                id: doc.id,
                type: 'partido',
                date: date,
                title: `${data.myTeamName || 'Mi Equipo'} vs ${data.opponentTeamName || 'Oponente'}`,
                description: data.campeonato ? `${data.tipoPartido || 'Partido'} - ${data.campeonato}` : `${data.tipoPartido || 'Partido'}`,
                link: `/estadisticas/historial/${doc.id}`
            });
        }
      });

      fetchedEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
      setEvents(fetchedEvents);

    } catch (error) {
      console.error("Error fetching events:", error);
      toast({ title: "Error", description: "No se pudieron cargar los eventos.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, isRegisteredUser, toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
          <CalendarClock className="mr-3 h-8 w-8"/>
          Cronología de Eventos
        </h1>
        <p className="text-lg text-foreground/80">
          Un listado de todos tus partidos y sesiones de entrenamiento, ordenados por fecha.
        </p>
      </header>
      
      {!isRegisteredUser && (
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
            <Info className="h-4 w-4 text-blue-700" />
            <AlertTitle className="text-blue-800 font-semibold">Modo de Demostración</AlertTitle>
            <AlertDescription>
                Estás viendo eventos de ejemplo. Para gestionar tu propio calendario de eventos, por favor{" "}
                <Link href="/register" className="font-bold underline">regístrate</Link> o{" "}
                <Link href="/login" className="font-bold underline">inicia sesión</Link>.
            </AlertDescription>
        </Alert>
      )}

      {events.length === 0 ? (
        <Card className="text-center py-12">
            <CardHeader>
                <CardTitle>No hay eventos guardados</CardTitle>
                <CardDescription>Aún no has guardado ninguna sesión o partido.</CardDescription>
            </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
            {events.map(evento => (
                <Card key={evento.id} className="shadow-md hover:shadow-lg transition-shadow">
                    <CardHeader className="grid grid-cols-1 md:grid-cols-4 items-start gap-4">
                        <div className="md:col-span-1">
                            <p className="font-bold text-lg text-primary">{formatDate(evento.date)}</p>
                            <Badge variant={evento.type === 'partido' ? 'destructive' : 'secondary'} className="mt-1">
                                {evento.type === 'partido' ? <Trophy className="mr-1.5 h-3 w-3" /> : <ClipboardList className="mr-1.5 h-3 w-3" />}
                                {evento.type === 'partido' ? 'Partido' : 'Sesión'}
                            </Badge>
                        </div>
                        <div className="md:col-span-3">
                            <CardTitle className="text-xl font-headline">{evento.title}</CardTitle>
                            <CardDescription className="mt-1">{evento.description}</CardDescription>
                        </div>
                    </CardHeader>
                     <CardFooter className="flex justify-end">
                        <Button asChild variant="outline" disabled={!isRegisteredUser}>
                            <Link href={evento.link}>
                                Ver Detalles <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}


export default function EventosPage() {
    return <EventosPageContent />;
}
