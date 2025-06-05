
// src/app/ejercicios/[id]/page.tsx
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
import { Loader2, ArrowLeft, Save, Heart } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
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

// FutsalDex Icon SVG string for PDF
const futsalDexIconSVGString = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 1.6a10.4 10.4 0 1 0 0 20.8 10.4 10.4 0 0 0 0-20.8z"/>
  <path d="M12 1.6a10.4 10.4 0 0 0-7.35 3.05M12 1.6a10.4 10.4 0 0 1 7.35 3.05M1.6 12a10.4 10.4 0 0 0 3.05 7.35M1.6 12a10.4 10.4 0 0 1 3.05-7.35M22.4 12a10.4 10.4 0 0 0-3.05-7.35M22.4 12a10.4 10.4 0 0 1-3.05 7.35M12 22.4a10.4 10.4 0 0 0 7.35-3.05M12 22.4a10.4 10.4 0 0 1-7.35-3.05"/>
  <path d="M5.75 5.75l3.5 3.5M14.75 5.75l-3.5 3.5M5.75 14.75l3.5-3.5M14.75 14.75l-3.5-3.5"/>
</svg>`;

const convertSvgStringToPngDataURL = (svgString: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = (err) => {
      reject(err);
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgString)}`;
  });
};


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
    const headerElement = printArea.querySelector('header'); // Assuming header is direct child for simplicity
    
    const originalDisplayBtn = printButtonContainer ? printButtonContainer.style.display : '';
    const originalDisplayHeader = headerElement ? headerElement.style.display : '';

    if (printButtonContainer) printButtonContainer.style.display = 'none';
    if (headerElement) headerElement.style.backgroundColor = '#ffffff'; // Ensure header bg is white for capture


    try {
      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff', // Capture with white background
        onclone: (document) => {
          const clonedPrintArea = document.querySelector('.exercise-print-area') as HTMLElement;
          if (clonedPrintArea) {
            const textElements = clonedPrintArea.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, strong, span, div:not(img):not(svg):not(.print-button-container), td, th, a, button, label, [class*="text-"]');
            textElements.forEach(el => { (el as HTMLElement).style.color = '#000000 !important'; });
            
            const primaryElements = clonedPrintArea.querySelectorAll('.text-primary, .text-accent');
            primaryElements.forEach(el => { (el as HTMLElement).style.color = '#000000 !important'; });
            
            const badges = clonedPrintArea.querySelectorAll('[class*="bg-primary"], [class*="bg-secondary"], [class*="bg-accent"], .badge');
            badges.forEach(el => {
              (el as HTMLElement).style.backgroundColor = '#dddddd !important';
              (el as HTMLElement).style.color = '#000000 !important';
              (el as HTMLElement).style.borderColor = '#aaaaaa !important';
            });
            
            if (clonedPrintArea.classList.contains('bg-card')) {
              clonedPrintArea.style.backgroundColor = '#ffffff !important';
            }
            const btnContainer = clonedPrintArea.querySelector('.print-button-container') as HTMLElement | null;
            if (btnContainer) btnContainer.style.display = 'none';

            const headerClone = clonedPrintArea.querySelector('header');
            if (headerClone) headerClone.style.backgroundColor = '#ffffff !important';
            
            document.body.style.backgroundColor = '#ffffff !important';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const PT_PER_CM = 28.346;
      const MARGIN_CM = 1;
      const HEADER_RESERVED_CM = 3; 
      const LOGO_SIZE_CM = 1.5;

      const margin = MARGIN_CM * PT_PER_CM;
      const headerReservedHeight = HEADER_RESERVED_CM * PT_PER_CM;
      const logoSize = LOGO_SIZE_CM * PT_PER_CM;

      const pdfPageWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();

      // Convert SVG logo to PNG data URL
      const logoPngDataUrl = await convertSvgStringToPngDataURL(futsalDexIconSVGString, 100, 100); // Render SVG at 100x100px for quality
      pdf.addImage(logoPngDataUrl, 'PNG', margin, margin, logoSize, logoSize);


      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      const titleText = "Ejercicios de futsal";
      const titleTextWidth = pdf.getStringUnitWidth(titleText) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(titleText, pdfPageWidth - margin - titleTextWidth, margin + logoSize / 1.5, { align: 'left' });

      const contentStartY = margin + headerReservedHeight;
      const contentPrintableWidth = pdfPageWidth - (margin * 2);
      const contentPrintableHeight = pdfPageHeight - margin - contentStartY;

      const img = new window.Image();
      img.onload = () => {
        const originalImgWidth = img.width;
        const originalImgHeight = img.height;

        const scaleFactorWidth = contentPrintableWidth / originalImgWidth;
        const scaleFactorHeight = contentPrintableHeight / originalImgHeight;
        const finalScaleFactor = Math.min(scaleFactorWidth, scaleFactorHeight);

        const pdfImageWidth = originalImgWidth * finalScaleFactor;
        const pdfImageHeight = originalImgHeight * finalScaleFactor;
        
        const xOffset = (pdfPageWidth - pdfImageWidth) / 2; 

        pdf.addImage(imgData, 'PNG', xOffset, contentStartY, pdfImageWidth, pdfImageHeight);
        pdf.save(`${ejercicio.ejercicio.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'ejercicio'}_detalle.pdf`);

        if (printButtonContainer) printButtonContainer.style.display = originalDisplayBtn;
        if (headerElement) headerElement.style.display = originalDisplayHeader;
        setIsGeneratingPdf(false);
      };
      img.onerror = (err) => {
        console.error("Error loading image for PDF generation:", err);
        toast({ title: "Error al Cargar Imagen", description: "No se pudo cargar la imagen capturada.", variant: "destructive" });
        if (printButtonContainer) printButtonContainer.style.display = originalDisplayBtn;
        if (headerElement) headerElement.style.display = originalDisplayHeader;
        setIsGeneratingPdf(false);
      };
      img.src = imgData;

    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error al Generar PDF", description: error.message || "Hubo un problema al crear el archivo PDF.", variant: "destructive" });
      if (printButtonContainer) printButtonContainer.style.display = originalDisplayBtn;
      if (headerElement) headerElement.style.display = originalDisplayHeader;
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

        <div className="mb-6 text-md space-y-2">
          <p><strong className="font-semibold text-foreground/90">Fase:</strong> {ejercicio.fase}</p>
          <p><strong className="font-semibold text-foreground/90">Edad:</strong> {Array.isArray(ejercicio.edad) ? ejercicio.edad.join(', ') : ejercicio.edad}</p>
          <p><strong className="font-semibold text-foreground/90">Nº Jugadores:</strong> {ejercicio.jugadores}</p>
          <p><strong className="font-semibold text-foreground/90">Duración:</strong> {formatDuracion(ejercicio.duracion)}</p>
          <p><strong className="font-semibold text-foreground/90">Materiales y Espacio:</strong> {ejercicio.espacio_materiales}</p>
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
                {isGeneratingPdf ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                {isGeneratingPdf ? 'Generando PDF...' : 'Guardar PDF'}
            </Button>
        </div>
      </div>
    </div>
  );
}

