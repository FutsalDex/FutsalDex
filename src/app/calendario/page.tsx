
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy as firestoreOrderBy, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calendar as CalendarIconLucide, Loader2, CheckCircle } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import { format, parseISO,isSameDay, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DayContentProps } from 'react-day-picker';

interface SesionEntry {
  id: string;
  numero_sesion?: string;
  fecha: string; // YYYY-MM-DD
  type: "AI" | "Manual";
  sessionTitle?: string;
  createdAt: Timestamp;
}

interface SessionsByDate {
  [dateKey: string]: SesionEntry[];
}

function CalendarPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [allUserSessions, setAllUserSessions] = useState<SesionEntry[]>([]);
  const [sessionsByDate, setSessionsByDate] = useState<SessionsByDate>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState<Date>(new Date());
  const [selectedDayForPopover, setSelectedDayForPopover] = useState<Date | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);


  const fetchUserSessions = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "mis_sesiones"),
        where("userId", "==", user.uid),
        firestoreOrderBy("fecha", "asc") // Order by date to easily group
      );
      const querySnapshot = await getDocs(q);
      const fetchedSessions = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as SesionEntry));
      setAllUserSessions(fetchedSessions);

      const groupedByDate: SessionsByDate = {};
      fetchedSessions.forEach(session => {
        if (session.fecha) { // Ensure fecha exists
          const dateKey = session.fecha; // fecha is already YYYY-MM-DD
          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
          }
          groupedByDate[dateKey].push(session);
        }
      });
      setSessionsByDate(groupedByDate);

    } catch (error) {
      console.error("Error fetching user sessions for calendar:", error);
      // Consider adding a toast message here
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUserSessions();
  }, [fetchUserSessions]);

  const CustomDayContent = (props: DayContentProps) => {
    const dateKey = format(props.date, 'yyyy-MM-dd');
    const daySessions = sessionsByDate[dateKey];

    if (!daySessions || daySessions.length === 0) {
      return <div className="flex items-center justify-center h-full w-full relative">{format(props.date, 'd')}</div>;
    }
    
    // Sort sessions by creation time if multiple on the same day
    const sortedDaySessions = [...daySessions].sort((a,b) => a.createdAt.toMillis() - b.createdAt.toMillis());

    return (
        <PopoverTrigger asChild>
            <button 
                type="button" 
                className="flex flex-col items-center justify-start h-full w-full p-1 text-left relative hover:bg-accent/50 rounded-sm focus:outline-none focus:ring-1 focus:ring-primary"
                onClick={() => {setSelectedDayForPopover(props.date); setIsPopoverOpen(true);}}
            >
                <span className="absolute top-1 right-1 text-xs font-medium">{format(props.date, 'd')}</span>
                <div className="mt-3 space-y-0.5 w-full overflow-hidden">
                {sortedDaySessions.slice(0, 2).map(session => ( // Show max 2 items, add ellipsis if more
                    <div key={session.id} className="text-xs bg-primary/20 text-primary-foreground px-1 py-0.5 rounded-sm truncate w-full font-semibold">
                    S: {session.numero_sesion || 'N/A'}
                    </div>
                ))}
                {sortedDaySessions.length > 2 && <div className="text-xs text-muted-foreground text-center">...</div>}
                </div>
            </button>
        </PopoverTrigger>
    );
  };

  const sessionsForSelectedDay = useMemo(() => {
    if (!selectedDayForPopover) return [];
    const dateKey = format(selectedDayForPopover, 'yyyy-MM-dd');
    return (sessionsByDate[dateKey] || []).sort((a,b) => a.createdAt.toMillis() - b.createdAt.toMillis());
  }, [selectedDayForPopover, sessionsByDate]);


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
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline flex items-center">
          <CalendarIconLucide className="mr-3 h-10 w-10" />
          Calendario de Sesiones
        </h1>
        <p className="text-lg text-foreground/80">
          Visualiza tus sesiones de entrenamiento programadas.
        </p>
      </header>

      <Card className="shadow-xl">
        <CardContent className="p-0 md:p-6 flex justify-center">
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                {/* Trigger is now part of CustomDayContent, Popover needs a non-rendering trigger here or handle focus management carefully */}
                {/* This empty div acts as a placeholder for Popover context if needed, but CustomDayContent's button is the actual trigger */}
                <div/> 
                <Calendar
                    mode="single"
                    selected={selectedDayForPopover || undefined} // Keep selected day highlighted if popover is for it
                    onSelect={(day) => { 
                        // This onSelect is for direct calendar selection if needed outside popover logic
                        // For triggering popover, the button inside CustomDayContent is used.
                        // If a day is clicked that has no sessions, we might not want to do anything or just log it.
                        if (day) {
                            const dateKey = format(day, 'yyyy-MM-dd');
                            if (sessionsByDate[dateKey] && sessionsByDate[dateKey].length > 0) {
                                setSelectedDayForPopover(day);
                                setIsPopoverOpen(true);
                            } else {
                                setSelectedDayForPopover(null); // Clear selection if day has no sessions
                                setIsPopoverOpen(false);
                            }
                        }
                    }}
                    month={currentDisplayMonth}
                    onMonthChange={setCurrentDisplayMonth}
                    locale={es}
                    className="w-full max-w-2xl"
                    classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-2",
                        month: "space-y-4 w-full",
                        caption_label: "text-xl font-bold text-primary font-headline",
                        head_row: "flex mt-4 w-full",
                        head_cell: "text-muted-foreground rounded-md w-[14.28%] text-sm font-medium",
                        row: "flex w-full mt-2",
                        cell: "h-20 md:h-28 w-[14.28%] text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 border border-transparent",
                        day: "h-full w-full p-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-sm",
                        day_selected: "bg-accent text-accent-foreground rounded-sm",
                        day_today: "bg-primary/10 text-primary font-bold rounded-sm ring-1 ring-primary",
                        day_outside: "text-muted-foreground opacity-50",
                    }}
                    components={{
                        DayContent: CustomDayContent,
                    }}
                />
                <PopoverContent className="w-80 p-0" align="start">
                    {selectedDayForPopover && sessionsForSelectedDay.length > 0 ? (
                    <Card className="border-none shadow-none">
                        <CardHeader className="bg-muted p-4">
                        <CardTitle className="text-md font-headline">
                            Sesiones del {format(selectedDayForPopover, 'PPP', { locale: es })}
                        </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-2 max-h-60 overflow-y-auto">
                        {sessionsForSelectedDay.map(session => (
                            <Button
                            key={session.id}
                            variant="ghost"
                            className="w-full justify-start h-auto py-2 px-3 text-left"
                            asChild
                            >
                            <Link href={`/mis-sesiones/detalle/${session.id}`}>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-primary">
                                        Sesión: {session.numero_sesion || 'N/A'} ({session.type === "AI" ? "IA" : "Manual"})
                                    </span>
                                    {session.sessionTitle && <span className="text-xs text-muted-foreground">{session.sessionTitle}</span>}
                                </div>
                            </Link>
                            </Button>
                        ))}
                        </CardContent>
                    </Card>
                    ) : (
                         <div className="p-4 text-sm text-muted-foreground">No hay sesiones para este día.</div>
                    )}
                </PopoverContent>
            </Popover>
        </CardContent>
      </Card>

       {allUserSessions.length === 0 && !isLoading && (
        <Card className="mt-8 text-center py-12 bg-card shadow-md">
          <CardHeader>
            <CheckCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-2xl font-headline text-primary">Calendario Vacío</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-6 text-foreground/80">
              Aún no has guardado ninguna sesión de entrenamiento.
              <br/>
              ¡Crea tu primera sesión para verla aquí!
            </CardDescription>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link href="/crear-sesion-ia">
                  Crear con IA
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/crear-sesion-manual">
                  Crear Manualmente
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
    <AuthGuard>
      <CalendarPageContent />
    </AuthGuard>
  );
}

