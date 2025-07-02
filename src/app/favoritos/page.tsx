
"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart, ListChecks, Loader2, Eye, Trash2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { collection as firestoreCollection, getDocs as firestoreGetDocs, doc as firestoreDoc, query as firestoreQuery, where, deleteDoc as firestoreDeleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Removed DialogDescription
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Ejercicio {
  id: string;
  numero?: string;
  ejercicio: string;
  descripcion: string;
  objetivos: string;
  espacio_materiales: string;
  jugadores: string;
  duracion: string;
  variantes?: string;
  fase: string;
  categoria: string;
  edad: string[];
  imagen: string;
  consejos_entrenador?: string;
  isVisible?: boolean; // Added for filtering
}


function FavoritosPageContent() {
  const { user, isRegisteredUser } = useAuth();
  const { toast } = useToast();
  const [favoriteExercises, setFavoriteExercises] = useState<Ejercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavoriteExercises = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      setFavoriteExercises([]);
      return;
    }
    setIsLoading(true);
    try {
      const favsRef = firestoreCollection(db, "usuarios", user.uid, "user_favorites");
      const favsSnapshot = await firestoreGetDocs(favsRef);
      const favoriteExerciseIds = favsSnapshot.docs.map(docSnap => docSnap.id);

      if (favoriteExerciseIds.length === 0) {
        setFavoriteExercises([]);
        setIsLoading(false);
        return;
      }

      const exercisesData: Ejercicio[] = [];
      const CHUNK_SIZE = 30; // Firestore 'in' query supports up to 30 values
      for (let i = 0; i < favoriteExerciseIds.length; i += CHUNK_SIZE) {
        const chunkIds = favoriteExerciseIds.slice(i, i + CHUNK_SIZE);
        if (chunkIds.length > 0) {
            // Fetch by ID first, then filter by visibility on the client
            // This avoids complex queries that might require a composite index and cause permission errors if the index is missing.
            const exercisesQuery = firestoreQuery(
              firestoreCollection(db, "ejercicios_futsal"), 
              where("__name__", "in", chunkIds)
            );
            const exercisesSnapshot = await firestoreGetDocs(exercisesQuery);
            exercisesSnapshot.forEach(docSnap => {
              const data = docSnap.data();
              // A document is considered visible if isVisible is not explicitly false.
              if (data.isVisible !== false) {
                  exercisesData.push({ 
                    id: docSnap.id, 
                    ...data 
                  } as Ejercicio);
              }
            });
        }
      }
      setFavoriteExercises(exercisesData.sort((a, b) => a.ejercicio.localeCompare(b.ejercicio)));
    } catch (error: any) {
      console.error("Error fetching favorite exercises:", error);
      // The toast for missing index is removed as the query is now simpler.
      toast({
        title: "Error",
        description: "No se pudieron cargar tus ejercicios favoritos. " + error.message,
        variant: "destructive",
      });
      setFavoriteExercises([]);
    }
    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchFavoriteExercises();
  }, [fetchFavoriteExercises]);

  const handleRemoveFavorite = async (exerciseId: string) => {
    if (!user) return;
    
    const originalFavorites = [...favoriteExercises];
    setFavoriteExercises(prev => prev.filter(ex => ex.id !== exerciseId));

    try {
      const favDocRef = firestoreDoc(db, "usuarios", user.uid, "user_favorites", exerciseId);
      await firestoreDeleteDoc(favDocRef);
      toast({
        title: "Favorito Eliminado",
        description: "El ejercicio ha sido eliminado de tus favoritos.",
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      setFavoriteExercises(originalFavorites);
      toast({
        title: "Error",
        description: "No se pudo eliminar el favorito. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
  };
  
  const formatDuracion = (duracion: string) => duracion ? `${duracion} min` : 'N/A';


  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isRegisteredUser) {
    return (
      <Card className="text-center py-12 shadow-lg">
        <CardHeader>
          <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <CardTitle className="text-2xl font-headline text-primary">Accede a tus Favoritos</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-6 text-foreground/80">
            <Link href="/login" className="text-primary font-bold hover:underline">Inicia sesión</Link> o <Link href="/register" className="text-primary font-bold hover:underline">regrístrate</Link> para guardar y ver tus ejercicios favoritos.
          </CardDescription>
          <Button asChild>
            <Link href="/ejercicios">
              Explorar Ejercicios
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }


  if (favoriteExercises.length === 0) {
    return (
      <Card className="text-center py-12 shadow-lg">
        <CardHeader>
          <XCircle className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <CardTitle className="text-2xl font-headline text-primary">No Tienes Favoritos</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-6 text-foreground/80">
            Aún no has marcado ningún ejercicio como favorito, o los que tenías ya no están visibles. ¡Explora la biblioteca y guarda los que más te gusten!
          </CardDescription>
          <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href="/ejercicios">
              <ListChecks className="mr-2 h-4 w-4" /> Ir a Ejercicios
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {favoriteExercises.map((ej) => (
        <Card key={ej.id} className="flex flex-col overflow-hidden transition-all hover:shadow-xl bg-card">
          <div className="relative h-48 w-full">
            <Image
              src={ej.imagen || `https://placehold.co/400x300.png`}
              alt={ej.ejercicio}
              layout="fill"
              objectFit="contain"
              data-ai-hint="futsal drill"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-background/70 hover:bg-destructive/20 text-destructive rounded-full h-8 w-8"
              onClick={() => handleRemoveFavorite(ej.id)}
              title="Quitar de favoritos"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-primary font-headline truncate" title={ej.ejercicio}>{ej.ejercicio}</CardTitle>
            {ej.categoria && <Badge variant="secondary" className="mt-1 truncate self-start" title={ej.categoria}>{ej.categoria}</Badge>}
            <CardDescription className="text-xs pt-2 space-y-0.5">
              <div><strong>Fase:</strong> {ej.fase}</div>
              <div><strong>Edad:</strong> {Array.isArray(ej.edad) ? ej.edad.join(', ') : ej.edad}</div>
              <div><strong>Duración:</strong> {formatDuracion(ej.duracion)}</div>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <p className="mb-2 text-sm text-foreground/80 line-clamp-3" title={ej.descripcion}>{ej.descripcion}</p>
          </CardContent>
          <CardFooter>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Eye className="mr-2 h-4 w-4" /> Ver Detalles
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <DialogTitle className="text-2xl text-primary font-headline">{ej.ejercicio}</DialogTitle>
                        {ej.categoria && <Badge variant="default" className="ml-2 shrink-0 text-sm py-1 px-2">{ej.categoria}</Badge>}
                    </div>
                      <div className="text-sm text-muted-foreground pt-1">
                      <p><strong className="font-semibold text-foreground/90">Fase:</strong> {ej.fase}</p>
                      <p><strong className="font-semibold text-foreground/90">Edad:</strong> {Array.isArray(ej.edad) ? ej.edad.join(', ') : ej.edad}</p>
                      <p><strong className="font-semibold text-foreground/90">Duración:</strong> {formatDuracion(ej.duracion)}</p>
                    </div>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div className="relative aspect-video">
                        <Image src={ej.imagen || `https://placehold.co/600x400.png`} alt={ej.ejercicio} layout="fill" objectFit="contain" className="rounded-md" data-ai-hint="futsal game"/>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Descripción</h3>
                      <p className="text-sm mb-3">{ej.descripcion}</p>
                      
                      <div>
                        <h3 className="font-semibold text-lg mb-1">Objetivos</h3>
                        {ej.objetivos && ej.objetivos.length > 0 ? (
                            <ul className="list-disc pl-5 space-y-1 text-sm mb-3">
                            {ej.objetivos.split(/[.;]+/) 
                                .map(obj => obj.trim())
                                .filter(obj => obj.length > 0)
                                .map((obj, index) => (
                                <li key={index}>{obj}{obj.endsWith('.') || obj.endsWith(';') ? '' : '.'}</li>
                            ))}
                            </ul>
                        ) : (
                          <p className="text-sm mb-3 text-muted-foreground">No especificados.</p>
                        )}
                      </div>

                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    <p><strong className="font-semibold">Materiales y Espacio:</strong> {ej.espacio_materiales}</p>
                    <p><strong className="font-semibold">Nº Jugadores:</strong> {ej.jugadores}</p>
                    <p><strong className="font-semibold">Variantes:</strong> {ej.variantes || 'No especificadas.'}</p>
                    <p><strong className="font-semibold">Consejos del Entrenador:</strong> {ej.consejos_entrenador || 'No disponibles.'}</p>
                  </div>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export default function FavoritosPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Mis Ejercicios Favoritos</h1>
        <p className="text-lg text-foreground/80">
          Aquí encontrarás todos los ejercicios que has marcado como favoritos.
        </p>
      </header>
      <FavoritosPageContent />
    </div>
  );
}
