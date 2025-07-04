
// src/app/ejercicios/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc as firestoreSetDoc, deleteDoc as firestoreDeleteDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft, Save, Heart } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

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

interface FavoriteState {
  [exerciseId: string]: boolean;
}

export default function EjercicioDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, isRegisteredUser } = useAuth();
  const exerciseId = params.id as string;

  const [ejercicio, setEjercicio] = useState<Ejercicio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteState>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetchExerciseData = useCallback(async () => {
    if (!exerciseId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const docRef = doc(db, "ejercicios_futsal", exerciseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.isVisible === false) {
          setNotFound(true);
          toast({ title: "Ejercicio No Disponible", description: "Este ejercicio no está actualmente visible.", variant: "destructive" });
          setIsLoading(false); 
          return; 
        }
        setEjercicio({ id: docSnap.id, ...data } as Ejercicio);
        setNotFound(false);
      } else {
        setNotFound(true);
        toast({ title: "Error", description: "Ejercicio no encontrado.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching exercise:", error);
      toast({ title: "Error al Cargar", description: "No se pudo cargar el ejercicio.", variant: "destructive" });
      setNotFound(true);
    }
    setIsLoading(false);
  }, [exerciseId, toast]);

  useEffect(() => {
    fetchExerciseData();
  }, [fetchExerciseData]);

  useEffect(() => {
    if (user && isRegisteredUser && exerciseId) {
      const loadFavoriteStatus = async () => {
        try {
          const favDocRef = doc(db, "usuarios", user.uid, "user_favorites", exerciseId);
          const docSnap = await getDoc(favDocRef);
          setFavorites(prev => ({ ...prev, [exerciseId]: docSnap.exists() }));
        } catch (error) {
          console.error("Error loading favorite status for exercise:", error);
        }
      };
      loadFavoriteStatus();
    }
  }, [user, isRegisteredUser, exerciseId]);

  const toggleFavorite = async (currentExerciseId: string) => {
    if (!user || !isRegisteredUser) {
      toast({
        title: "Acción Requerida",
        description: "Inicia sesión para guardar tus ejercicios favoritos.",
        variant: "default",
        action: <Button asChild variant="outline"><Link href="/login">Iniciar Sesión</Link></Button>
      });
      return;
    }

    const isCurrentlyFavorite = !!favorites[currentExerciseId];
    setFavorites(prev => ({ ...prev, [currentExerciseId]: !isCurrentlyFavorite }));

    try {
      const favDocRef = doc(db, "usuarios", user.uid, "user_favorites", currentExerciseId);
      if (!isCurrentlyFavorite) {
        await firestoreSetDoc(favDocRef, { addedAt: serverTimestamp() });
        toast({ title: "Favorito Añadido", description: "El ejercicio se ha añadido a tus favoritos." });
      } else {
        await firestoreDeleteDoc(favDocRef);
        toast({ title: "Favorito Eliminado", description: "El ejercicio se ha eliminado de tus favoritos." });
      }
    } catch (error) {
      console.error("Error updating favorite status:", error);
      setFavorites(prev => ({ ...prev, [currentExerciseId]: isCurrentlyFavorite })); 
      toast({ title: "Error", description: "No se pudo actualizar el estado de favorito.", variant: "destructive" });
    }
  };

  const handlePrint = async () => {
    if (!isRegisteredUser) {
        toast({
            title: "Función para usuarios registrados",
            description: "Para descargar la ficha del ejercicio, necesitas una cuenta.",
            variant: "default",
            action: <Button asChild variant="outline"><Link href="/login">Iniciar Sesión</Link></Button>
        });
        return;
    }
    const printArea = document.querySelector('.exercise-print-area') as HTMLElement;
    if (!printArea || !ejercicio) {
      toast({
        title: "Error",
        description: "No se pudo encontrar el contenido del ejercicio para generar el PDF.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingPdf(true);
    
    // Hide buttons for printing
    const elementsToHide = printArea.querySelectorAll('.hide-on-print');
    elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none');

    try {
      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      const ratio = canvasWidth / canvasHeight;
      const pdfRatio = pdfWidth / pdfHeight;

      let finalWidth, finalHeight;
      
      if (ratio > pdfRatio) {
        finalWidth = pdfWidth;
        finalHeight = pdfWidth / ratio;
      } else {
        finalHeight = pdfHeight;
        finalWidth = pdfHeight * ratio;
      }
      
      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) / 2;

      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      
      pdf.save(`${ejercicio.ejercicio.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'ejercicio'}_detalle.pdf`);

    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error al Generar PDF", description: error.message, variant: "destructive" });
    } finally {
      // Show buttons again after printing
      elementsToHide.forEach(el => (el as HTMLElement).style.display = '');
      setIsGeneratingPdf(false);
    }
  };
  
  const formatDuracion = (duracion: string | undefined) => duracion ? `${duracion} min` : 'N/A';

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !ejercicio) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-destructive">Ejercicio No Encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>El ejercicio que buscas no existe o no está disponible.</CardDescription>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/ejercicios"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Ejercicios</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const objetivosList = ejercicio.objetivos.split(/[.;]+/)
    .map(obj => obj.trim())
    .filter(obj => obj.length > 0);

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
       <div className="mb-6 flex justify-between items-center hide-on-print">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Ejercicios
        </Button>
        {isRegisteredUser && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-4 bg-transparent hover:bg-primary/10 text-primary rounded-full h-10 w-10 shrink-0"
            onClick={() => toggleFavorite(ejercicio.id)}
            title={favorites[ejercicio.id] ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Heart className={cn("h-6 w-6", favorites[ejercicio.id] ? "fill-red-500 text-red-500" : "text-primary")} />
          </Button>
        )}
      </div>

      <div className="exercise-print-area max-w-4xl mx-auto">
        <Card className="shadow-lg border-muted overflow-hidden">
            <CardHeader className="bg-foreground text-primary-foreground p-4">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl font-headline">
                        <span>{ejercicio.ejercicio}</span>
                    </CardTitle>
                    <Badge variant="secondary" className="text-base">{formatDuracion(ejercicio.duracion)}</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        <div className="w-full bg-muted rounded-lg overflow-hidden border">
                           <Image
                                src={ejercicio.imagen || `https://placehold.co/600x400.png?text=${encodeURIComponent('Diagrama')}`}
                                alt={`Diagrama de ${ejercicio.ejercicio}`}
                                width={600}
                                height={400}
                                className="w-full h-auto object-contain"
                                data-ai-hint="futsal court"
                                crossOrigin="anonymous"
                                priority
                            />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-primary mb-2 font-headline">Consejos del Entrenador</h3>
                            <p className="text-sm text-foreground/80">{ejercicio.consejos_entrenador || 'No hay consejos específicos para este ejercicio.'}</p>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-semibold text-lg text-primary mb-2 font-headline">Descripción</h3>
                            <p className="text-sm text-foreground/80">{ejercicio.descripcion}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-primary mb-2 font-headline">Objetivos</h3>
                            <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                                {objetivosList.map((obj, index) => (
                                    <li key={index}>{obj}</li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg text-primary mb-2 font-headline">Variantes</h3>
                            <p className="text-sm text-foreground/80">{ejercicio.variantes || 'No se especifican variantes.'}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm border-t">
                <div><strong className="font-semibold text-primary block font-headline">Fase:</strong> {ejercicio.fase}</div>
                <div><strong className="font-semibold text-primary block font-headline">Edad:</strong> {Array.isArray(ejercicio.edad) ? ejercicio.edad.join(', ') : ejercicio.edad}</div>
                <div><strong className="font-semibold text-primary block font-headline">Nº Jugadores:</strong> {ejercicio.jugadores}</div>
                <div><strong className="font-semibold text-primary block font-headline">Materiales:</strong> {ejercicio.espacio_materiales}</div>
            </CardFooter>
        </Card>
      </div>
      
       <div className="hide-on-print p-4 mt-6 text-center">
            <Button onClick={handlePrint} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isGeneratingPdf}>
                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isGeneratingPdf ? 'Generando PDF...' : 'Guardar Ficha en PDF'}
            </Button>
        </div>
    </div>
  );
}
