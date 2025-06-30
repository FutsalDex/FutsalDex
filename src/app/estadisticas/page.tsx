
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart2, Calendar, Construction, FileText, Bot, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy as firestoreOrderBy, getDocs, Timestamp } from "firebase/firestore";
import { useEffect, useState, useMemo, useCallback } from "react";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart, Cell } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


interface EjercicioInfo {
  id: string;
  ejercicio: string;
  duracion?: string;
}

interface Sesion {
  id: string;
  userId: string;
  type: "AI" | "Manual";
  fecha?: string;
  warmUp: string | EjercicioInfo;
  mainExercises: (string | EjercicioInfo)[];
  coolDown: string | EjercicioInfo;
  createdAt: Timestamp;
}

const chartConfig: ChartConfig = {
  sessions: {
    label: "Sesiones",
  },
  manual: {
    label: "Manuales",
    color: "hsl(var(--chart-1))",
  },
  ai: {
    label: "IA",
    color: "hsl(var(--chart-2))",
  },
};

function EstadisticasPageContent() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Sesion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserSessions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "mis_sesiones"),
        where("userId", "==", user.uid),
        firestoreOrderBy("fecha", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedSessions = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      } as Sesion));
      setSessions(fetchedSessions);
    } catch (error) {
      console.error("Error fetching sessions for stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserSessions();
  }, [fetchUserSessions]);

  const stats = useMemo(() => {
    if (sessions.length === 0) {
      return {
        totalSessions: 0,
        sessionsByType: [],
        sessionsByMonth: [],
        topExercises: [],
      };
    }

    const sessionsByType = sessions.reduce(
      (acc, session) => {
        if (session.type === "AI") acc.ai++;
        else if (session.type === "Manual") acc.manual++;
        return acc;
      },
      { ai: 0, manual: 0 }
    );
    const sessionsByTypeChartData = [
      { name: 'Manuales', value: sessionsByType.manual, fill: 'hsl(var(--chart-1))' },
      { name: 'IA', value: sessionsByType.ai, fill: 'hsl(var(--chart-2))' },
    ];
    
    const sessionsByMonth = Array(12).fill(0).map((_, i) => ({ month: i + 1, count: 0 }));
    const currentYear = new Date().getFullYear();
    sessions.forEach(session => {
        if (session.fecha) {
            const sessionDate = new Date(session.fecha);
            if (sessionDate.getFullYear() === currentYear) {
                const monthIndex = sessionDate.getMonth();
                sessionsByMonth[monthIndex].count++;
            }
        }
    });

    const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const sessionsByMonthChartData = sessionsByMonth.map((data, index) => ({
      name: monthLabels[index],
      sessions: data.count,
    }));
    
    const exerciseCounts: { [name: string]: number } = {};
    sessions.forEach(session => {
        if(session.type === "Manual") {
            const allExercises = [session.warmUp, ...session.mainExercises, session.coolDown];
            allExercises.forEach(ex => {
                if (typeof ex === 'object' && ex?.ejercicio) {
                    exerciseCounts[ex.ejercicio] = (exerciseCounts[ex.ejercicio] || 0) + 1;
                }
            });
        }
    });
    const topExercises = Object.entries(exerciseCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));

    return {
      totalSessions: sessions.length,
      sessionsByType: sessionsByTypeChartData,
      sessionsByMonth: sessionsByMonthChartData,
      topExercises,
    };
  }, [sessions]);


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Cargando estadísticas...</p>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
       <div className="container mx-auto px-4 py-8 md:px-6">
        <header className="mb-8">
            <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center"><BarChart2 className="mr-3 h-8 w-8"/>Estadísticas Avanzadas</h1>
            <p className="text-lg text-foreground/80">Analiza el rendimiento de tu equipo y el progreso de tus sesiones.</p>
        </header>
        <Card className="text-center py-12 shadow-lg">
            <CardHeader>
                <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <CardTitle className="text-2xl font-headline text-primary">No hay datos para mostrar</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription className="mb-6 text-foreground/80">
                Aún no has creado ninguna sesión. ¡Crea tu primera sesión para empezar a ver tus estadísticas aquí!
                </CardDescription>
                <Button asChild>
                <Link href="/crear-sesion-manual">Crear una Sesión</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
            <BarChart2 className="mr-3 h-8 w-8"/>
            Estadísticas Avanzadas
        </h1>
        <p className="text-lg text-foreground/80">
            Analiza el rendimiento de tu equipo y el progreso de tus sesiones.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Total de Sesiones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{stats.totalSessions}</p>
            <p className="text-xs text-muted-foreground">Sesiones creadas en total</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle>Sesiones por Tipo</CardTitle>
                <CardDescription>Distribución de sesiones manuales vs. generadas por IA.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="value" hideLabel />} />
                    <Pie data={stats.sessionsByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {stats.sessionsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Actividad Mensual ({new Date().getFullYear()})</CardTitle>
                <CardDescription>Número de sesiones creadas cada mes en el año actual.</CardDescription>
            </CardHeader>
            <CardContent>
                 <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <BarChart data={stats.sessionsByMonth} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis
                        dataKey="name"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="sessions" fill="hsl(var(--chart-1))" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Top 5 Ejercicios Más Usados</CardTitle>
                <CardDescription>En tus sesiones manuales.</CardDescription>
            </CardHeader>
            <CardContent>
                 {stats.topExercises.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Ejercicio</TableHead>
                            <TableHead className="text-right">Usos</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stats.topExercises.map((ex) => (
                            <TableRow key={ex.name}>
                                <TableCell className="font-medium truncate" title={ex.name}>{ex.name}</TableCell>
                                <TableCell className="text-right font-bold">{ex.count}</TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-10">No has usado ejercicios en sesiones manuales todavía.</p>
                )}
            </CardContent>
        </Card>
      </div>

    </div>
  );
}

export default function EstadisticasPage() {
  return (
    <AuthGuard>
      <SubscriptionGuard>
        <EstadisticasPageContent />
      </SubscriptionGuard>
    </AuthGuard>
  );
}

