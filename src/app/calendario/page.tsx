
"use client";

import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy as firestoreOrderBy, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar as CalendarIconLucide, Loader2, CheckCircle, ArrowLeft, Info } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DayContentProps } from 'react-day-picker';
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
    
    // Demo Match
    const matchDateKey = createDateKey(7);
    entries[matchDateKey] = [{
        id: 'demo_match_1',
        date: matchDateKey,
        time: '20:00',
        title: 'Partido: FutsalDex Demo vs Titanes FS',
        type: 'match',
        rawCreatedAt: Timestamp.now()
    }];

    // Demo Session
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


function CalendarPageContent() {
  const { user, isRegisteredUser } = useAuth();
  const router = useRouter();
  const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState<Date>(new Date());
  const [selectedDayForPopover, setSelectedDayForPopover] = useState<Date | null>(null);

  const fetchCalendarEntries = useCallback(async () => {
    if (!isRegisteredUser) {
        setEntriesByDate(createGuestCalendarEntries());
        setIsLoading(false);
        return;
    }
    if (!user) { // Should be redundant due to isRegisteredUser check, but good practice
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      // Fetch Sessions
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

      // Fetch Matches
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
    const dates = Object.keys(entriesByDate).map(dateKey => {
      const [year, month, day] = dateKey.split('-').map(Number);
      return new Date(year, month - 1, day, 12,0,0); 
    });
    return dates;
  }, [entriesByDate]);

  const CustomDayContent = (dayProps: DayContentProps) => {
    const dateKey = format(dayProps.date, 'yyyy-MM-dd');
    const dayHasEntries = entriesByDate[dateKey] && entriesByDate[dateKey].length > 0;

    return (
      <PopoverTrigger asChild disabled={!dayHasEntries}>
        <span
          className={cn(
            "relative flex items-center justify-center h-full w-full"
          )}
        >
          {format(dayProps.date, 'd')}
          {dayHasEntries && <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full" title="Tiene evento"></span>}
        </span>
      </PopoverTrigger>
    );
  };
  

  const entriesForSelectedDay = useMemo(() => {
    if (!selectedDayForPopover) return [];
    const dateKey = format(selectedDayForPopover, 'yyyy-MM-dd');
    return (entriesByDate[dateKey] || []).sort((a,b) => a.rawCreatedAt.toMillis() - b.rawCreatedAt.toMillis());
  }, [selectedDayForPopover, entriesByDate]);


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
            <h1 className="text-4xl font-bold text-primary mb-2 font-headline flex items-center">
                <CalendarIconLucide className="mr-3 h-10 w-10" />
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

      <Card className="shadow-xl">
        <CardContent className="p-0 md:p-6 flex justify-center">
            <Popover>
                <Calendar
                    mode="single"
                    selected={selectedDayForPopover || undefined}
                    onSelect={setSelectedDayForPopover}
                    month={currentDisplayMonth}
                    onMonthChange={setCurrentDisplayMonth}
                    locale={es}
                    className="w-full max-w-2xl"
                    modifiers={{ hasSessions: datesWithEntriesForModifier }}
                    modifierClassNames={{
                        hasSessions: 'bg-orange-400 text-white hover:bg-orange-500', 
                    }}
                    classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-2",
                        month: "space-y-4 w-full",
                        caption_label: "text-xl font-bold text-primary font-headline",
                        head_row: "flex mt-4 w-full",
                        head_cell: "text-muted-foreground w-[14.28%] text-sm font-medium",
                        row: "flex w-full mt-2",
                        cell: "h-20 md:h-28 w-[14.28%] text-center text-sm p-0 relative focus-within:relative focus-within:z-20 border",
                        day: "h-full w-full p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                        day_selected: "!bg-primary !text-primary-foreground", 
                        day_today: "bg-primary/10 text-primary font-bold ring-1 ring-primary",
                        day_outside: "text-muted-foreground opacity-50",
                    }}
                    components={{
                        DayContent: CustomDayContent,
                    }}
                />
                <PopoverContent className="w-80 p-0" align="start">
                    {selectedDayForPopover && entriesForSelectedDay.length > 0 ? (
                    <Card className="border-none shadow-none">
                        <CardHeader className="bg-muted p-4">
                        <CardTitle className="text-md font-headline">
                            Eventos del {format(selectedDayForPopover, 'PPP', { locale: es })}
                        </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 max-h-60 overflow-y-auto">
                        {entriesForSelectedDay.map(entry => (
                            <Button
                            key={entry.id}
                            variant="ghost"
                            className="w-full justify-start h-auto py-2 px-3 text-left"
                            asChild
                            disabled={!isRegisteredUser}
                            >
                            <Link href={isRegisteredUser ? (entry.type === 'session' ? `/mis-sesiones/detalle/${entry.id}` : `/estadisticas/historial/${entry.id}`) : '#'}>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-primary">
                                       {entry.title}
                                    </span>
                                    {entry.time && <span className="text-xs text-muted-foreground">{entry.time}</span>}
                                </div>
                            </Link>
                            </Button>
                        ))}
                        </CardContent>
                    </Card>
                    ) : (
                         <div className="p-4 text-sm text-muted-foreground">No hay eventos para este día.</div>
                    )}
                </PopoverContent>
            </Popover>
        </CardContent>
      </Card>

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
                <Link href="/estadisticas">
                  Registrar Partido
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CalendarioPage() {
  return (
    <CalendarPageContent />
  );
}
