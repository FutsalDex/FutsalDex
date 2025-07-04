
"use client";

import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart, ListChecks, Loader2, Eye, Trash2, XCircle, FileDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { collection as firestoreCollection, getDocs as firestoreGetDocs, doc as firestoreDoc, query as firestoreQuery, where, deleteDoc as firestoreDeleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


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
  isVisible?: boolean;
}


function FavoritosPageContent() {
  const { user, isRegisteredUser } = useAuth();
  const { toast } = useToast();
  const [favoriteExercises, setFavoriteExercises] = useState<Ejercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<Ejercicio | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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
      const CHUNK_SIZE = 30;
      for (let i = 0; i < favoriteExerciseIds.length; i += CHUNK_SIZE) {
        const chunkIds = favoriteExerciseIds.slice(i, i + CHUNK_SIZE);
        if (chunkIds.length > 0) {
            const exercisesQuery = firestoreQuery(
              firestoreCollection(db, "ejercicios_futsal"), 
              where("__name__", "in", chunkIds)
            );
            const exercisesSnapshot = await firestoreGetDocs(exercisesQuery);
            exercisesSnapshot.forEach(docSnap => {
              const data = docSnap.data();
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

  const handleSavePdf = async (exercise: Ejercicio | null) => {
    if (!isRegisteredUser) {
        toast({
            title: "Función para usuarios registrados",
            description: "Para descargar la ficha del ejercicio, necesitas una cuenta.",
            variant: "default",
            action: <Button asChild variant="outline"><Link href="/login">Iniciar Sesión</Link></Button>
        });
        return;
    }
    if (!exercise) return;
    const printArea = document.querySelector('.exercise-print-area');
    if (!printArea) {
      toast({ title: "Error", description: "Contenido del ejercicio no encontrado para exportar.", variant: "destructive" });
      return;
    }

    setIsGeneratingPdf(true);

    try {
      const canvas = await html2canvas(printArea as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;
      
      const ratio = Math.min((pdfWidth - 40) / imgWidth, (pdfHeight - 40) / imgHeight);
      
      const w = imgWidth * ratio;
      const h = imgHeight * ratio;
      
      const x = (pdfWidth - w) / 2;
      const y = (pdfHeight - h) / 2;

      pdf.addImage(imgData, 'PNG', x, y, w, h);
      pdf.save(`Ficha-${exercise.ejercicio.replace(/[^a-z0-9]/gi, '_')}.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error", description: "No se pudo generar el PDF.", variant: "destructive" });
    } finally {
      setIsGeneratingPdf(false);
    }
  };


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
    <Dialog open={!!selectedExercise} onOpenChange={(isOpen) => !isOpen && setSelectedExercise(null)}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {favoriteExercises.map((ej) => (
          <Card key={ej.id} className="flex flex-col overflow-hidden transition-all hover:shadow-xl bg-card">
            <div className="relative h-48 w-full">
              <Image
                src={ej.imagen || `https://placehold.co/400x300.png`}
                alt={ej.ejercicio}
                fill
                style={{ objectFit: 'contain' }}
                data-ai-hint="futsal drill"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary font-headline truncate" title={ej.ejercicio}>{ej.ejercicio}</CardTitle>
              {ej.categoria && <Badge variant="secondary" className="mt-1 truncate self-start" title={ej.categoria}>{ej.categoria}</Badge>}
              <div className="text-xs pt-2 space-y-0.5 text-muted-foreground">
                <div><strong>Fase:</strong> {ej.fase}</div>
                <div><strong>Edad:</strong> {Array.isArray(ej.edad) ? ej.edad.join(', ') : ej.edad}</div>
                <div><strong>Duración:</strong> {formatDuracion(ej.duracion)}</div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="mb-2 text-sm text-foreground/80 line-clamp-3" title={ej.descripcion}>{ej.descripcion}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center gap-2 border-t pt-4">
              <Button onClick={() => setSelectedExercise(ej)} variant="outline" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground">
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Ficha
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="bg-background/70 hover:bg-destructive/20 text-destructive rounded-full h-8 w-8"
                onClick={() => handleRemoveFavorite(ej.id)}
                title="Quitar de favoritos"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

       <DialogContent className="max-w-6xl w-full p-0 flex flex-col h-[90vh]">
          {selectedExercise && (
             <>
                <ScrollArea className="flex-grow bg-background">
                    <div className="exercise-print-area bg-white text-gray-800 m-0">
                        <DialogHeader className="sr-only">
                            <DialogTitle>{selectedExercise.ejercicio}</DialogTitle>
                            <DialogDescription>
                            Ficha detallada del ejercicio: {selectedExercise.ejercicio}. Objetivos: {selectedExercise.objetivos}
                            </DialogDescription>
                        </DialogHeader>
                        {/* Header */}
                        <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
                            <h2 className="text-2xl font-bold font-headline">{selectedExercise.ejercicio}</h2>
                            <div className="text-right">
                                <p className="font-bold text-lg">Duración: {formatDuracion(selectedExercise.duracion)}</p>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="p-6 bg-white text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column */}
                            <div className="space-y-4">
                                <div className="aspect-w-4 aspect-h-3 bg-gray-100 rounded overflow-hidden">
                                    <Image
                                        src={selectedExercise.imagen || `https://placehold.co/400x300.png`}
                                        alt={`Diagrama de ${selectedExercise.ejercicio}`}
                                        width={400}
                                        height={300}
                                        className="w-full h-auto object-contain"
                                        priority
                                        data-ai-hint="futsal diagram"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <div>
                                        <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">Categoría</h4>
                                        <p>{selectedExercise.categoria}</p>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">Fase</h4>
                                        <p>{selectedExercise.fase}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">Recursos Materiales</h4>
                                      <p>{selectedExercise.espacio_materiales}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">Número de jugadores</h4>
                                      <p>{selectedExercise.jugadores}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Right Column */}
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">Descripción de la Tarea</h4>
                                    <p className="whitespace-pre-wrap">{selectedExercise.descripcion}</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">Objetivos</h4>
                                    <p className="whitespace-pre-wrap">{selectedExercise.objetivos}</p>
                                </div>
                                {selectedExercise.variantes && (
                                    <div>
                                        <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">Variantes</h4>
                                        <p className="whitespace-pre-wrap">{selectedExercise.variantes}</p>
                                    </div>
                                )}
                                {selectedExercise.consejos_entrenador && (
                                    <div>
                                        <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">Consejos para el Entrenador</h4>
                                        <p className="whitespace-pre-wrap">{selectedExercise.consejos_entrenador}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Footer */}
                        <div className="p-3 bg-gray-100 border-t text-xs text-gray-600 flex justify-between">
                            <span>FutsalDex - Herramienta para entrenadores</span>
                            <span>Categorías de Edad: {Array.isArray(selectedExercise.edad) ? selectedExercise.edad.join(', ') : selectedExercise.edad}</span>
                        </div>
                    </div>
                </ScrollArea>
                <div className="p-4 bg-muted border-t flex justify-center flex-shrink-0">
                    <Button
                        onClick={() => handleSavePdf(selectedExercise)}
                        disabled={isGeneratingPdf}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                        {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                        Descargar PDF
                    </Button>
                </div>
            </>
          )}
        </DialogContent>
    </Dialog>
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
