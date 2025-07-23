
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, PlusCircle, UploadCloud, Users, Wrench, Eye, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, getDocs, query } from 'firebase/firestore';

interface PageViewData {
    [key: string]: number;
}

const mapPathToName = (pathKey: string): string => {
    const mappings: Record<string, string> = {
        'home': 'Página Principal',
        'ejercicios': 'Ver ejercicios',
        'crear-sesion': 'Crear Sesión Manual',
        'crear-sesion-ia': 'Crear Sesión con IA',
        'mi-equipo': 'Panel de Mi Equipo',
        'mi-equipo_plantilla': 'Mi Plantilla',
        'mi-equipo_asistencia': 'Control de Asistencia',
        'estadisticas_historial': 'Historial de Partidos',
        'mis-sesiones': 'Mis Sesiones',
        'favoritos': 'Favoritos',
        'suscripcion': 'Suscripción',
        'soporte': 'Soporte con IA',
        'perfil': 'Perfil de Usuario',
        'admin': 'Panel de Admin',
    };
    const sortedKeys = Object.keys(mappings).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
        if (pathKey.startsWith(key)) {
            return mappings[key];
        }
    }
    return pathKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const StatCard = ({ title, value, icon, isText = false }: { title: string, value: string | number, icon: React.ReactNode, isText?: boolean }) => (
    <Card className="shadow-md text-center">
        <CardHeader className="pb-2">
            <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full mb-2">
                {icon}
            </div>
            <CardTitle className="text-lg font-headline">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-3xl font-bold">{value}</p>
        </CardContent>
    </Card>
);

function AdminPageContent() {
  const { isAdmin, user } = useAuth();
  const [pageViewStats, setPageviewStats] = useState<{name: string, count: number}[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const fetchPageViews = useCallback(async () => {
    if (!isAdmin) return;
    setIsLoadingStats(true);
    try {
        const db = getFirebaseDb();
        const pageViewsQuery = query(collection(db, "user_page_views"));
        const pageViewsSnapshot = await getDocs(pageViewsQuery);
        const pageCounts: { [key: string]: number } = {};
        pageViewsSnapshot.forEach(doc => {
            const data = doc.data() as PageViewData;
            for (const key in data) {
                if (key !== 'lastVisitedPath' && key !== 'updatedAt') {
                    const pageName = mapPathToName(key);
                    pageCounts[pageName] = (pageCounts[pageName] || 0) + data[key];
                }
            }
        });
        const stats = Object.entries(pageCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        setPageviewStats(stats);
    } catch (error) {
        console.error("Error fetching page view stats:", error);
        setPageviewStats([]);
    } finally {
        setIsLoadingStats(false);
    }
  }, [isAdmin]);

  useEffect(() => {
      fetchPageViews();
  }, [fetchPageViews]);

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-2xl font-headline text-destructive">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              No tienes permisos para acceder a esta página. Esta sección es solo para administradores.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 text-center">
        <ShieldCheck className="mx-auto h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Panel de Administración</h1>
        <p className="text-lg text-foreground/80">
          Bienvenido, Administrador ({user?.email}).
        </p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Añadir Ejercicios</CardTitle>
            <CardDescription>Añade nuevos ejercicios a la biblioteca de forma individual o por lote.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Button asChild className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
                <Link href="/admin/add-exercise">
                  <PlusCircle className="mr-2 h-5 w-5" />
                  Añadir Nuevo Ejercicio
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/admin/batch-add-exercises">
                  <UploadCloud className="mr-2 h-5 w-5" />
                  Añadir Ejercicios por Lote
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Gestionar Ejercicios</CardTitle>
            <CardDescription>Edita y elimina los ejercicios existentes en la base de datos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex">
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/admin/manage-exercises">
                  <Wrench className="mr-2 h-5 w-5" />
                  Gestionar Ejercicios
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Gestión de Suscripciones</CardTitle>
            <CardDescription>Visualiza y gestiona las suscripciones de los usuarios.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4">
              <Button variant="outline" asChild className="w-full sm:w-auto">
                <Link href="/admin/manage-subscriptions">
                  <Users className="mr-2 h-5 w-5" />
                  Gestionar Suscripciones
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

       <Card className="mt-8">
            <CardHeader>
                <CardTitle className="text-xl font-headline flex items-center">
                    <Eye className="mr-2 h-5 w-5"/>Páginas Más Visitadas
                </CardTitle>
                <CardDescription>Top 5 de páginas más visitadas por todos los usuarios.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoadingStats ? (
                     <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     </div>
                ) : pageViewStats.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {pageViewStats.map((page, index) => (
                            <StatCard key={index} title={page.name} value={page.count} icon={<div className="font-bold text-lg">{index + 1}</div>} />
                        ))}
                    </div>
                ) : (
                    <p className="text-muted-foreground text-center py-4">No hay datos de visitas de páginas para mostrar.</p>
                )}
            </CardContent>
        </Card>

    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard>
      <AdminPageContent />
    </AuthGuard>
  );
}
