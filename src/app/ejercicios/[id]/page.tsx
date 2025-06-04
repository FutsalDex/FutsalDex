
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc as firestoreSetDoc, deleteDoc as firestoreDeleteDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Printer, Heart } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { DialogDescription } from '@/components/ui/dialog';
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
        setEjercicio({ id: docSnap.id, ...docSnap.data() } as Ejercicio);
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
          const favDocRef = doc(db, "users", user.uid, "user_favorites", exerciseId);
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
      const favDocRef = doc(db, "users", user.uid, "user_favorites", currentExerciseId);
      if (!isCurrentlyFavorite) { 
        await firestoreSetDoc(favDocRef, { addedAt: serverTimestamp() });
        toast({ title: "Favorito Añadido", description: "El ejercicio se ha añadido a tus favoritos." });
      } else { 
        await firestoreDeleteDoc(favDocRef);
        toast({ title: "Favorito Eliminado", description: "El ejercicio se ha eliminado de tus favoritos." });
      }
    } catch (error) {
      console.error("Error updating favorite status:", error);
      setFavorites(prev => ({ ...prev, [currentExerciseId]: isCurrentlyFavorite })); // Revert on error
      toast({ title: "Error", description: "No se pudo actualizar el estado de favorito.", variant: "destructive" });
    }
  };

  const handlePrint = async () => {
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

    const printButtonContainer = printArea.querySelector('.print-button-container') as HTMLElement | null;
    const originalDisplay = printButtonContainer ? printButtonContainer.style.display : '';
    if (printButtonContainer) {
      printButtonContainer.style.display = 'none';
    }
    // Ensure fonts and styles are applied, and background is explicitly white for capture
    const headerElement = printArea.querySelector('header');
    const originalHeaderBg = headerElement ? headerElement.style.backgroundColor : '';
    if (headerElement) headerElement.style.backgroundColor = 'white';


    try {
      const canvas = await html2canvas(printArea, { 
        scale: 2, // Higher scale for better PDF quality
        useCORS: true, // Try to fetch images from other domains
        logging: false, // Disable html2canvas logging to console if not needed
        backgroundColor: '#ffffff', // Explicitly set background to white
         onclone: (document) => {
            // Access the cloned document
            const clonedPrintArea = document.querySelector('.exercise-print-area') as HTMLElement;
            if (clonedPrintArea) {
                // You can try to re-apply styles or classes here if needed for specific elements
                // For example, ensure text colors are dark for printing
                const textElements = clonedPrintArea.querySelectorAll('p, h1, h3, li, strong, span, div:not(img):not(svg)');
                textElements.forEach(el => {
                    (el as HTMLElement).style.color = '#000000'; // Force black text
                });
                // Ensure primary color is also black or very dark
                const primaryElements = clonedPrintArea.querySelectorAll('.text-primary');
                 primaryElements.forEach(el => {
                    (el as HTMLElement).style.color = '#000000';
                 });
            }
        }
      });
      
      if (printButtonContainer) {
        printButtonContainer.style.display = originalDisplay;
      }
      if (headerElement) headerElement.style.backgroundColor = originalHeaderBg;


      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps= pdf.getImageProperties(imgData);
      const imgWidth = imgProps.width;
      const imgHeight = imgProps.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const newImgWidth = imgWidth * ratio;
      const newImgHeight = imgHeight * ratio;
      
      // Add some margin
      const margin = 20; // points
      const finalWidth = newImgWidth - (margin * 2);
      const finalHeight = newImgHeight - (margin * 2);

      const x = (pdfWidth - finalWidth) / 2;
      const y = (pdfHeight - finalHeight) / 2;


      if (finalHeight > pdfHeight) { // Content is taller than one page
        let position = margin;
        let remainingHeight = imgHeight;
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = imgWidth;
        sourceCanvas.height = imgHeight;
        const ctx = sourceCanvas.getContext('2d');
        const img = new window.Image(); // Use window.Image for browser environment
        
        await new Promise<void>((resolve, reject) => {
            img.onload = () => {
                ctx?.drawImage(img, 0, 0);
                let pageNumber = 0;
                while(remainingHeight > 0) {
                    if (pageNumber > 0) {
                        pdf.addPage();
                    }
                    const sliceHeight = Math.min(remainingHeight, pdfHeight * (imgWidth / pdfWidth) - (margin*2) ); // calculate height of the slice in original image pixels
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = imgWidth;
                    tempCanvas.height = sliceHeight;
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCtx?.drawImage(sourceCanvas, 0, pageHeight * pageNumber * (imgWidth/pdfWidth) , imgWidth, sliceHeight, 0,0, imgWidth, sliceHeight);
                    
                    const pageImgData = tempCanvas.toDataURL('image/png');
                    pdf.addImage(pageImgData, 'PNG', margin, margin, pdfWidth - (margin*2), sliceHeight * (pdfWidth - (margin*2)) / imgWidth );
                    
                    remainingHeight -= sliceHeight;
                    pageNumber++;
                    if (pageNumber > 10) { // safety break for too many pages
                         console.warn("PDF generation stopped after 10 pages.");
                         break;
                    }
                }
                resolve();
            };
            img.onerror = reject;
            img.src = imgData;
        });


      } else {
         pdf.addImage(imgData, 'PNG', x > margin ? x : margin , y > margin ? y : margin, finalWidth, finalHeight);
      }
      
      pdf.save(`${ejercicio.ejercicio.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'ejercicio'}_detalle.pdf`);

    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error al Generar PDF",
        description: "Hubo un problema al crear el archivo PDF. " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
       if (printButtonContainer) {
        printButtonContainer.style.display = originalDisplay;
      }
      if (headerElement) headerElement.style.backgroundColor = originalHeaderBg;
    } finally {
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
            <CardDescription>El ejercicio que buscas no existe o no se pudo encontrar.</CardDescription>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/ejercicios"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Ejercicios</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <div className="mb-6">
        <Button variant="outline" onClick={() => router.push('/ejercicios')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Ejercicios
        </Button>
      </div>

      <div className="exercise-print-area bg-card p-6 sm:p-8 rounded-lg shadow-xl">
        <header className="mb-6 border-b pb-4">
          <div className="flex justify-between items-start">
            <h1 className="text-3xl md:text-4xl font-bold text-primary font-headline">{ejercicio.ejercicio}</h1>
            {isRegisteredUser && (
              <Button
                variant="ghost"
                size="icon"
                className="ml-4 bg-background/70 hover:bg-background/90 text-primary rounded-full h-10 w-10 shrink-0"
                onClick={() => toggleFavorite(ejercicio.id)}
                title={favorites[ejercicio.id] ? "Quitar de favoritos" : "Añadir a favoritos"}
              >
                <Heart className={cn("h-5 w-5", favorites[ejercicio.id] ? "fill-red-500 text-red-500" : "text-primary")} />
              </Button>
            )}
          </div>
          {ejercicio.categoria && <Badge variant="default" className="mt-2 text-sm py-1 px-2">{ejercicio.categoria}</Badge>}
        </header>
        
        <div className="mb-6 relative aspect-video w-full max-w-2xl mx-auto">
           <Image
            src={ejercicio.imagen || `https://placehold.co/600x400.png`}
            alt={ejercicio.ejercicio}
            fill
            style={{ objectFit: 'contain' }}
            className="rounded-md border"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 600px"
            data-ai-hint="futsal game"
           />
        </div>
        
        <div className="mb-6">
          <h3 className="font-semibold text-xl mb-2 text-foreground/90">Descripción</h3>
          <p className="text-md text-foreground/80">{ejercicio.descripcion}</p>
        </div>
            
        <div className="mb-6">
          <h3 className="font-semibold text-xl mb-2 text-foreground/90">Objetivos</h3>
          {ejercicio.objetivos && ejercicio.objetivos.length > 0 ? (
              <ul className="list-disc pl-5 space-y-1 text-md text-foreground/80">
              {ejercicio.objetivos.split(/[.;]+/) 
                .map(obj => obj.trim())
                .filter(obj => obj.length > 0)
                .map((obj, index) => (
                  <li key={index}>{obj}{obj.endsWith('.') || obj.endsWith(';') ? '' : '.'}</li>
                ))}
            </ul>
          ) : (
            <p className="text-md text-muted-foreground">No especificados.</p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6 text-md">
          <p><strong className="font-semibold text-foreground/90">Fase:</strong> {ejercicio.fase}</p>
          <p><strong className="font-semibold text-foreground/90">Edad:</strong> {Array.isArray(ejercicio.edad) ? ejercicio.edad.join(', ') : ejercicio.edad}</p>
          <p><strong className="font-semibold text-foreground/90">Duración:</strong> {formatDuracion(ejercicio.duracion)}</p>
          <p><strong className="font-semibold text-foreground/90">Nº Jugadores:</strong> {ejercicio.jugadores}</p>
          <p className="md:col-span-2"><strong className="font-semibold text-foreground/90">Materiales y Espacio:</strong> {ejercicio.espacio_materiales}</p>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold text-xl mb-2 text-foreground/90">Variantes</h3>
          <p className="text-md text-foreground/80">{ejercicio.variantes || 'No especificadas.'}</p>
        </div>
        
        <div>
          <h3 className="font-semibold text-xl mb-2 text-foreground/90">Consejos del Entrenador</h3>
          <p className="text-md text-foreground/80">{ejercicio.consejos_entrenador || 'No disponibles.'}</p>
        </div>

        <div className="print-button-container mt-8 text-center">
            <Button onClick={handlePrint} variant="default" size="lg" disabled={isGeneratingPdf}>
                {isGeneratingPdf ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Printer className="mr-2 h-5 w-5" />}
                {isGeneratingPdf ? 'Generando PDF...' : 'Imprimir / Guardar PDF'}
            </Button>
        </div>
      </div>
    </div>
  );
}
