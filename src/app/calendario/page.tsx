
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { DayContentProps } from 'react-day-picker';
import { cn } from "@/lib/utils";
import { SubscriptionGuard } from "@/components/subscription-guard";

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
  const [sessionsByDate, setSessionsByDate] = useState<SessionsByDate>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState<Date>(new Date());
  const [selectedDayForPopover, setSelectedDayForPopover] = useState<Date | null>(null);

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
        firestoreOrderBy("fecha", "asc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedSessions = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as SesionEntry));

      const groupedByDate: SessionsByDate = {};
      fetchedSessions.forEach(session => {
        if (session.fecha) {
          const dateKey = session.fecha;
          if (!groupedByDate[dateKey]) {
            groupedByDate[dateKey] = [];
          }
          groupedByDate[dateKey].push(session);
        }
      });
      setSessionsByDate(groupedByDate);

    } catch (error) {
      console.error("Error fetching user sessions for calendar:", error);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUserSessions();
  }, [fetchUserSessions]);

  const datesWithSessionsForModifier = useMemo(() => {
    const dates = Object.keys(sessionsByDate).map(dateKey => {
      const [year, month, day] = dateKey.split('-').map(Number);
      return new Date(year, month - 1, day, 12,0,0); 
    });
    return dates;
  }, [sessionsByDate]);

  const CustomDayContent = (dayProps: DayContentProps) => {
    const dateKey = format(dayProps.date, 'yyyy-MM-dd');
    const dayHasSessions = sessionsByDate[dateKey] && sessionsByDate[dateKey].length > 0;

    return (
      <PopoverTrigger asChild disabled={!dayHasSessions}>
        <span
          className={cn(
            "relative flex items-center justify-center h-full w-full"
          )}
        >
          {format(dayProps.date, 'd')}
          {dayHasSessions && <span className="absolute bottom-1 right-1 h-1.5 w-1.5 bg-red-500 rounded-full" title="Tiene sesión"></span>}
        </span>
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
          Visualiza tus sesiones de entrenamiento programadas. Las fechas con sesiones se marcan en naranja.
        </p>
      </header>

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
                    modifiers={{ hasSessions: datesWithSessionsForModifier }}
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
                                        Sesión: {session.numero_sesion || 'N/A'} ({session.type === "AI" ? "IA" : ""})
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

       {Object.keys(sessionsByDate).length === 0 && !isLoading && (
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
              <Button asChild variant="outline">
                <Link href="/crear-sesion">
                  Crear Sesión
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
      <SubscriptionGuard>
        <CalendarPageContent />
      </SubscriptionGuard>
    </AuthGuard>
  );
}
