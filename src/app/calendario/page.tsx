
"use client";

import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DayContentProps } from 'react-day-picker';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar as CalendarIconLucide, Loader2, CheckCircle, ArrowLeft, Info, Dot } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface CalendarEntry {
  id: string;
  date: string; // YYYY-MM-DD
  time?: string;
  title: string;
  type: 'session' | 'match';
  rawCreatedAt: Timestamp;
}

interface EntriesByDate {
  [dateKey: string]: CalendarEntry[];
}

const createGuestCalendarEntries = (): EntriesByDate => {
    const today = new Date();
    const entries: EntriesByDate = {};
    const createDateKey = (daysAgo: number) => {
        const date = new Date(today);
        date.setDate(date.getDate() - daysAgo);
        return format(date, 'yyyy-MM-dd');
    };
    
    const matchDateKey = createDateKey(7);
    entries[matchDateKey] = [{
        id: 'demo_match_1',
        date: matchDateKey,
        time: '20:00',
        title: 'Partido: FutsalDex Demo vs Titanes FS',
        type: 'match',
        rawCreatedAt: Timestamp.now()
    }];

    const sessionDateKey = createDateKey(5);
    entries[sessionDateKey] = [{
        id: 'demo_session_1',
        date: sessionDateKey,
        title: 'Sesión de Finalización',
        type: 'session',
        rawCreatedAt: Timestamp.now()
    }];

    return entries;
};

export default function CalendarioPage() {
  const { user, isRegisteredUser } = useAuth();
  const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | undefined>();

  const fetchCalendarEntries = useCallback(async () => {
    if (!isRegisteredUser) {
        setEntriesByDate(createGuestCalendarEntries());
        setIsLoading(false);
        return;
    }
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const sessionsQuery = query(
        collection(db, "mis_sesiones"),
        where("userId", "==", user.uid)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessionEntries: CalendarEntry[] = sessionsSnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        date: docSnap.data().fecha,
        title: docSnap.data().sessionTitle || `Sesión ${docSnap.data().numero_sesion || 'N/A'}`,
        type: 'session',
        rawCreatedAt: docSnap.data().createdAt,
      }));

      const matchesQuery = query(
        collection(db, "partidos_estadisticas"),
        where("userId", "==", user.uid)
      );
      const matchesSnapshot = await getDocs(matchesQuery);
      const matchEntries: CalendarEntry[] = matchesSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          date: data.fecha,
          time: data.hora,
          title: `Partido: ${data.myTeamName} vs ${data.opponentTeamName}`,
          type: 'match',
          rawCreatedAt: data.createdAt,
        };
      });

      const allEntries = [...sessionEntries, ...matchEntries];
      
      const groupedByDate: EntriesByDate = {};
      allEntries.forEach(entry => {
        if (entry.date) {
          const dateKey = entry.date;
          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
          }
          groupedByDate[dateKey].push(entry);
        }
      });
      setEntriesByDate(groupedByDate);

    } catch (error) {
      console.error("Error fetching calendar entries:", error);
    }
    setIsLoading(false);
  }, [user, isRegisteredUser]);

  useEffect(() => {
    fetchCalendarEntries();
  }, [fetchCalendarEntries]);

  const datesWithEntriesForModifier = useMemo(() => {
    return Object.keys(entriesByDate).map(dateKey => {
      const [year, month, day] = dateKey.split('-').map(Number);
      return new Date(year, month - 1, day, 12, 0, 0); 
    });
  }, [entriesByDate]);

  const CustomDay = (dayProps: DayContentProps) => {
    const dateKey = format(dayProps.date, 'yyyy-MM-dd');
    const hasEvents = entriesByDate[dateKey] && entriesByDate[dateKey].length > 0;
    return (
      <div className="relative h-full w-full flex items-center justify-center">
        {dayProps.date.getDate()}
        {hasEvents && (
          <Dot className="absolute bottom-0 left-1/2 -translate-x-1/2 text-primary h-6 w-6" />
        )}
      </div>
    );
  };
  
  const entriesForSelectedDay = useMemo(() => {
    if (!selectedDay) return [];
    const dateKey = format(selectedDay, 'yyyy-MM-dd');
    return (entriesByDate[dateKey] || []).sort((a,b) => a.rawCreatedAt.toMillis() - b.rawCreatedAt.toMillis());
  }, [selectedDay, entriesByDate]);

  if (isLoading) {
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
            <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
                <CalendarIconLucide className="mr-3 h-8 w-8" />
                Mi Calendario
            </h1>
            <p className="text-lg text-foreground/80">
                Visualiza tus sesiones de entrenamiento y partidos programados.
            </p>
        </div>
         <Button asChild variant="outline">
            <Link href="/mi-equipo">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
            </Link>
        </Button>
      </header>

      { !isRegisteredUser && (
        <Alert variant="default" className="mb-6 bg-blue-50 border-blue-200 text-blue-800">
            <Info className="h-4 w-4 text-blue-700" />
            <AlertTitle className="text-blue-800 font-semibold">Modo de Demostración</AlertTitle>
            <AlertDescription>
                Estás viendo un calendario con eventos de ejemplo. Para gestionar tu propio calendario, por favor{" "}
                <Link href="/register" className="font-bold underline">regístrate</Link> o{" "}
                <Link href="/login" className="font-bold underline">inicia sesión</Link>.
            </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="shadow-xl md:col-span-2">
            <Calendar
                mode="single"
                selected={selectedDay}
                onSelect={setSelectedDay}
                month={currentDisplayMonth}
                onMonthChange={setCurrentDisplayMonth}
                locale={es}
                className="p-0"
                modifiers={{ hasEvents: datesWithEntriesForModifier }}
                modifiersClassNames={{
                    hasEvents: 'font-bold',
                }}
                classNames={{
                    root: "p-4",
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4 w-full",
                    caption_label: "text-xl font-bold text-primary font-headline",
                    head_row: "flex mt-4 w-full",
                    head_cell: "text-muted-foreground w-[14.28%] text-sm font-medium",
                    row: "flex w-full mt-2",
                    cell: "h-20 md:h-24 w-[14.28%] text-center text-sm p-0 relative focus-within:relative focus-within:z-20 border",
                    day: "h-full w-full p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                    day_selected: "bg-primary text-primary-foreground hover:bg-primary/90", 
                    day_today: "bg-primary/10 text-primary font-bold ring-1 ring-primary",
                    day_outside: "text-muted-foreground opacity-50",
                }}
                components={{
                    Day: CustomDay,
                }}
            />
        </Card>

        <Card className="shadow-xl">
            <CardHeader>
                <CardTitle>
                    Eventos de {selectedDay ? format(selectedDay, 'PPP', { locale: es }) : 'hoy'}
                </CardTitle>
                <CardDescription>Detalles de los eventos del día seleccionado.</CardDescription>
            </CardHeader>
            <CardContent>
                {entriesForSelectedDay.length > 0 ? (
                    <ul className="space-y-3">
                        {entriesForSelectedDay.map(entry => (
                            <li key={entry.id} className="p-3 rounded-md border bg-card hover:bg-muted/50">
                                <Link href={isRegisteredUser ? (entry.type === 'session' ? `/mis-sesiones/detalle/${entry.id}` : `/estadisticas/historial/${entry.id}`) : '#'} className="block">
                                    <p className="font-semibold text-primary">{entry.title}</p>
                                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                                        <div className={cn("w-2 h-2 rounded-full mr-2", entry.type === 'session' ? 'bg-blue-500' : 'bg-red-500')}></div>
                                        <span>{entry.type === 'session' ? 'Sesión' : 'Partido'}</span>
                                        {entry.time && <span className="ml-auto">{entry.time}</span>}
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground italic">No hay eventos para este día.</p>
                )}
            </CardContent>
        </Card>
      </div>

       {isRegisteredUser && Object.keys(entriesByDate).length === 0 && !isLoading && (
        <Card className="mt-8 text-center py-12 bg-card shadow-md">
          <CardHeader>
            <CheckCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl font-headline text-primary">Calendario Vacío</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-6 text-foreground/80">
              Aún no has guardado ninguna sesión de entrenamiento o partido.
              <br/>
              ¡Crea tu primer evento para verlo aquí!
            </CardDescription>
            <div className="flex justify-center gap-4">
              <Button asChild variant="outline">
                <Link href="/crear-sesion">
                  Crear Sesión
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/estadisticas/historial">
                  Ver Partidos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
