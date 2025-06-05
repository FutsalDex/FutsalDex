
// src/app/mis-sesiones/detalle/[id]/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Save, Bot, ClockIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { parseDurationToMinutes } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

// Interfaces
interface EjercicioBase {
  id: string;
  ejercicio: string;
  duracion?: string;
}

interface EjercicioDetallado extends EjercicioBase {
  descripcion?: string;
  objetivos?: string;
  categoria?: string;
  imagen?: string;
}

interface SesionBase {
  id: string;
  userId: string;
  type: "AI" | "Manual";
  sessionTitle?: string; // Puede ser opcional si se genera dinámicamente
  coachNotes?: string;
  numero_sesion?: string;
  fecha?: string; // Formato YYYY-MM-DD
  temporada?: string;
  club?: string;
  equipo?: string;
  createdAt: Timestamp;
}

interface SesionAI extends SesionBase {
  type: "AI";
  warmUp: string;
  mainExercises: string[];
  coolDown: string;
  preferredSessionLengthMinutes?: number;
  teamDescription?: string;
  trainingGoals?: string;
  sessionFocus?: string;
}

interface SesionManual extends SesionBase {
  type: "Manual";
  warmUp: EjercicioBase | null;
  mainExercises: EjercicioBase[];
  coolDown: EjercicioBase | null;
  duracionTotalManualEstimada?: number;
}

type Sesion = SesionAI | SesionManual;

interface SesionConDetallesEjercicio extends Omit<Sesion, 'warmUp' | 'mainExercises' | 'coolDown'> {
  warmUp: string | EjercicioDetallado | null;
  mainExercises: (string | EjercicioDetallado)[];
  coolDown: string | EjercicioDetallado | null;
}

// SVG string for FutsalDex Icon
const futsalDexIconSVGString = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 1.6a10.4 10.4 0 1 0 0 20.8 10.4 10.4 0 0 0 0-20.8z"/>
  <path d="M12 1.6a10.4 10.4 0 0 0-7.35 3.05M12 1.6a10.4 10.4 0 0 1 7.35 3.05M1.6 12a10.4 10.4 0 0 0 3.05 7.35M1.6 12a10.4 10.4 0 0 1 3.05-7.35M22.4 12a10.4 10.4 0 0 0-3.05-7.35M22.4 12a10.4 10.4 0 0 1-3.05 7.35M12 22.4a10.4 10.4 0 0 0 7.35-3.05M12 22.4a10.4 10.4 0 0 1-7.35-3.05"/>
  <path d="M5.75 5.75l3.5 3.5M14.75 5.75l-3.5 3.5M5.75 14.75l3.5-3.5M14.75 14.75l-3.5-3.5"/>
</svg>`;

// Helper to convert SVG string to PNG data URL
const convertSvgStringToPngDataURL = (svgString: string, width: number, height: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window object not available'));
      return;
    }
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
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
  });
};

// Helper functions (copied from mis-sesiones/page.tsx or adapted)
const formatDate = (dateValue: string | Timestamp | undefined): string => {
    if (!dateValue) return 'N/A';
    let date: Date;
    if (typeof dateValue === 'string') {
        if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = dateValue.split('-').map(Number);
            date = new Date(year, month - 1, day, 12,0,0); 
        } else {
            date = new Date(dateValue);
        }
    } else if (dateValue && typeof dateValue.toDate === 'function') {
        date = dateValue.toDate();
    } else { return 'Fecha inválida'; }
    if (isNaN(date.getTime())) return (typeof dateValue === 'string' ? dateValue : 'Fecha inválida');
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const formatExerciseName = (exercise: string | EjercicioBase | EjercicioDetallado | null | undefined): string => {
    if (!exercise) return "Ejercicio no especificado";
    if (typeof exercise === 'string') return exercise;
    return exercise.ejercicio || "Ejercicio sin nombre";
};

const formatExerciseDescription = (exercise: string | EjercicioDetallado | null | undefined): string => {
    if (!exercise || typeof exercise === 'string' || !exercise.descripcion) return "Descripción no disponible.";
    return exercise.descripcion;
};

const getExerciseDuration = (exercise: string | EjercicioBase | EjercicioDetallado | null | undefined): string => {
    if (!exercise || typeof exercise === 'string' || !exercise.duracion || exercise.duracion === "0") return "N/A";
    return `${exercise.duracion} min`;
};

const getExerciseImage = (exercise: string | EjercicioDetallado | null | undefined, defaultText: string): string => {
    if (typeof exercise === 'object' && exercise?.imagen) return exercise.imagen;
    const text = typeof exercise === 'object' && exercise?.ejercicio ? exercise.ejercicio : defaultText;
    return `https://placehold.co/300x200.png?text=${encodeURIComponent(text)}`;
};

const getSessionTotalDuration = (sesion: SesionConDetallesEjercicio | null): string => {
    if (!sesion) return 'N/A';
    let totalMinutes = 0;
    if (sesion.type === "AI" && (sesion as SesionAI).preferredSessionLengthMinutes) {
        totalMinutes = (sesion as SesionAI).preferredSessionLengthMinutes!;
    } else if (sesion.type === "Manual") {
        const manualSesion = sesion as SesionManual;
        if (manualSesion.warmUp && typeof manualSesion.warmUp === 'object' && manualSesion.warmUp.duracion) {
            totalMinutes += parseDurationToMinutes(manualSesion.warmUp.duracion);
        }
        manualSesion.mainExercises.forEach(ex => {
            if (typeof ex === 'object' && ex.duracion) {
                totalMinutes += parseDurationToMinutes(ex.duracion);
            }
        });
        if (manualSesion.coolDown && typeof manualSesion.coolDown === 'object' && manualSesion.coolDown.duracion) {
            totalMinutes += parseDurationToMinutes(manualSesion.coolDown.duracion);
        }
    }
    return totalMinutes > 0 ? `${totalMinutes} min` : 'N/A';
};

const getMainExercisesTotalDuration = (exercises: (string | EjercicioDetallado)[]): string => {
  if (!exercises || exercises.length === 0) return '0 min';
  let totalMinutes = 0;
  exercises.forEach(ex => {
    if (typeof ex === 'object' && ex?.duracion) {
      totalMinutes += parseDurationToMinutes(ex.duracion);
    }
  });
  return totalMinutes > 0 ? `${totalMinutes} min` : '0 min';
};

const getSessionCategorias = (sesion: SesionConDetallesEjercicio | null): string => {
    if (!sesion) return "No especificadas";
    if (sesion.type === "AI") return (sesion as SesionAI).sessionFocus || "No especificadas";
    const categorias = new Set<string>();
    const exercises: (string | EjercicioDetallado | null | undefined)[] = [
        sesion.warmUp, ...(sesion.mainExercises || []), sesion.coolDown,
    ];
    exercises.forEach(ex => {
        if (typeof ex === 'object' && ex?.categoria) categorias.add(ex.categoria);
    });
    return categorias.size === 0 ? "No especificadas" : Array.from(categorias).join(', ');
};

const getSessionObjetivos = (sesion: SesionConDetallesEjercicio | null): string => {
    if (!sesion) return "No especificados";
    if (sesion.type === "AI") return (sesion as SesionAI).trainingGoals || "No especificados";
    const objetivos = new Set<string>();
    const exercises: (string | EjercicioDetallado | null | undefined)[] = [
        sesion.warmUp, ...(sesion.mainExercises || []), sesion.coolDown,
    ];
    exercises.forEach(ex => {
        if (typeof ex === 'object' && ex?.objetivos) {
            ex.objetivos.split(/[.;]+/).map(o => o.trim()).filter(o => o.length > 0)
                .forEach(o => objetivos.add(o + (o.endsWith('.') || o.endsWith(';') ? '' : '.')));
        }
    });
    return objetivos.size === 0 ? "No especificados" : Array.from(objetivos).join(' ');
};


function SesionDetallePageContent() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const sessionId = params.id as string;

  const [sessionData, setSessionData] = useState<SesionConDetallesEjercicio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const fetchSessionAndExerciseDetails = useCallback(async () => {
    if (!sessionId || !user) {
      setIsLoading(false);
      setNotFound(true);
      return;
    }
    setIsLoading(true);
    setNotFound(false);

    try {
      const sessionDocRef = doc(db, "mis_sesiones", sessionId);
      const sessionDocSnap = await getDoc(sessionDocRef);

      if (!sessionDocSnap.exists() || sessionDocSnap.data()?.userId !== user.uid) {
        setNotFound(true);
        toast({ title: "Error", description: "Sesión no encontrada o no tienes permiso para verla.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const baseSessionData = { id: sessionDocSnap.id, ...sessionDocSnap.data() } as Sesion;
      let enrichedSessionData: SesionConDetallesEjercicio = { ...baseSessionData } as unknown as SesionConDetallesEjercicio;


      if (baseSessionData.type === "Manual") {
        const exerciseIdsToFetch: string[] = [];
        const manualSession = baseSessionData as SesionManual;
        if (manualSession.warmUp?.id) exerciseIdsToFetch.push(manualSession.warmUp.id);
        manualSession.mainExercises.forEach(ex => { if (ex?.id) exerciseIdsToFetch.push(ex.id); });
        if (manualSession.coolDown?.id) exerciseIdsToFetch.push(manualSession.coolDown.id);
        
        const uniqueExerciseIds = Array.from(new Set(exerciseIdsToFetch));
        const exerciseDocs: Record<string, EjercicioDetallado> = {};

        if (uniqueExerciseIds.length > 0) {
          const MAX_IN_VALUES = 30;
          for (let i = 0; i < uniqueExerciseIds.length; i += MAX_IN_VALUES) {
              const chunk = uniqueExerciseIds.slice(i, i + MAX_IN_VALUES);
              if (chunk.length > 0) {
                  const exercisesQuery = query(collection(db, "ejercicios_futsal"), where("__name__", "in", chunk));
                  const querySnapshot = await getDocs(exercisesQuery);
                  querySnapshot.forEach(docSnap => {
                    const data = docSnap.data();
                    exerciseDocs[docSnap.id] = { 
                      id: docSnap.id, 
                      ejercicio: data.ejercicio || "Ejercicio sin nombre",
                      descripcion: data.descripcion || "Descripción no disponible.",
                      objetivos: data.objetivos || "Objetivos no especificados.",
                      categoria: data.categoria || "Categoría no especificada.",
                      duracion: data.duracion, 
                      imagen: data.imagen || `https://placehold.co/300x200.png?text=${encodeURIComponent(data.ejercicio || 'Ejercicio')}`,
                      ...data 
                    } as EjercicioDetallado;
                  });
              }
          }
        }
        enrichedSessionData.warmUp = manualSession.warmUp?.id && exerciseDocs[manualSession.warmUp.id] ? exerciseDocs[manualSession.warmUp.id] : manualSession.warmUp;
        enrichedSessionData.mainExercises = manualSession.mainExercises.map(ex => ex?.id && exerciseDocs[ex.id] ? exerciseDocs[ex.id] : ex) as (string | EjercicioDetallado)[];
        enrichedSessionData.coolDown = manualSession.coolDown?.id && exerciseDocs[manualSession.coolDown.id] ? exerciseDocs[manualSession.coolDown.id] : manualSession.coolDown;
      } else { // AI Session
        enrichedSessionData.warmUp = (baseSessionData as SesionAI).warmUp;
        enrichedSessionData.mainExercises = (baseSessionData as SesionAI).mainExercises;
        enrichedSessionData.coolDown = (baseSessionData as SesionAI).coolDown;
      }
      
      setSessionData(enrichedSessionData);

    } catch (error) {
      console.error("Error fetching session details:", error);
      toast({ title: "Error al Cargar", description: "No se pudo cargar la sesión.", variant: "destructive" });
      setNotFound(true);
    }
    setIsLoading(false);
  }, [sessionId, user, toast]);

  useEffect(() => {
    fetchSessionAndExerciseDetails();
  }, [fetchSessionAndExerciseDetails]);

  const handleSavePdf = async () => {
    const printArea = document.querySelector('.session-print-area') as HTMLElement;
    if (!printArea || !sessionData) {
      toast({ title: "Error", description: "Contenido de la sesión no encontrado para PDF.", variant: "destructive" });
      return;
    }
    setIsGeneratingPdf(true);
    const printButtonContainer = printArea.querySelector('.print-button-container') as HTMLElement | null;
    const originalDisplayBtn = printButtonContainer ? printButtonContainer.style.display : '';
    if (printButtonContainer) printButtonContainer.style.display = 'none';

    const dialogHeader = printArea.querySelector('.dialog-header-print-override') as HTMLElement | null;
    const originalHeaderStyles: { element: HTMLElement; bgColor: string; textColor: string }[] = [];
    if (dialogHeader) {
        originalHeaderStyles.push({ element: dialogHeader, bgColor: dialogHeader.style.backgroundColor, textColor: dialogHeader.style.color });
        const children = dialogHeader.querySelectorAll<HTMLElement>('*');
        children.forEach(child => { originalHeaderStyles.push({ element: child, bgColor: child.style.backgroundColor, textColor: child.style.color }); });
    }

    try {
      const canvas = await html2canvas(printArea, {
        scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
        onclone: (document) => {
          const clonedPrintArea = document.querySelector('.session-print-area') as HTMLElement;
          if (clonedPrintArea) {
            const textElements = clonedPrintArea.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, strong, span, div:not(img):not(svg):not(.print-button-container)');
            textElements.forEach(el => { (el as HTMLElement).style.color = '#000000 !important'; });
            const headerClone = clonedPrintArea.querySelector('.dialog-header-print-override') as HTMLElement | null;
            if (headerClone) {
                headerClone.style.backgroundColor = '#ffffff !important'; headerClone.style.color = '#000000 !important';
                const headerChildren = headerClone.querySelectorAll<HTMLElement>('*');
                headerChildren.forEach(child => { child.style.backgroundColor = 'transparent !important'; child.style.color = '#000000 !important'; });
            }
            const badges = clonedPrintArea.querySelectorAll('[class*="bg-primary"], [class*="bg-secondary"], [class*="bg-accent"], .badge');
            badges.forEach(el => { (el as HTMLElement).style.backgroundColor = '#dddddd !important'; (el as HTMLElement).style.color = '#000000 !important'; (el as HTMLElement).style.borderColor = '#aaaaaa !important';});
            if (clonedPrintArea.classList.contains('bg-card') || clonedPrintArea.classList.contains('bg-gray-50')) { clonedPrintArea.style.backgroundColor = '#ffffff !important';}
            const btnContainer = clonedPrintArea.querySelector('.print-button-container') as HTMLElement | null;
            if (btnContainer) btnContainer.style.display = 'none';
            document.body.style.backgroundColor = '#ffffff !important';
          }
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const PT_PER_CM = 28.346; const MARGIN_CM = 1.5; const HEADER_RESERVED_CM = 3; const LOGO_SIZE_CM = 1.5;
      const margin = MARGIN_CM * PT_PER_CM; const headerReservedHeight = HEADER_RESERVED_CM * PT_PER_CM; const logoSize = LOGO_SIZE_CM * PT_PER_CM;
      const pdfPageWidth = pdf.internal.pageSize.getWidth(); const pdfPageHeight = pdf.internal.pageSize.getHeight();
      const logoPngDataUrl = await convertSvgStringToPngDataURL(futsalDexIconSVGString, 100, 100);
      pdf.addImage(logoPngDataUrl, 'PNG', margin, margin, logoSize, logoSize);
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20);
      const titleText = "Ficha de Sesión";
      const titleTextWidth = pdf.getStringUnitWidth(titleText) * pdf.getFontSize() / pdf.internal.scaleFactor;
      pdf.text(titleText, pdfPageWidth - margin - titleTextWidth, margin + logoSize / 1.5 , { align: 'left' });
      const contentStartY = margin + headerReservedHeight;
      const contentPrintableWidth = pdfPageWidth - (margin * 2);
      const contentPrintableHeight = pdfPageHeight - margin - contentStartY;
      const img = new window.Image();
      img.onload = () => {
        const originalImgWidth = img.width; const originalImgHeight = img.height;
        const scaleFactorWidth = contentPrintableWidth / originalImgWidth;
        const finalScaleFactor = scaleFactorWidth; // Use width-based scaling
        const pdfImageWidth = contentPrintableWidth;
        const pdfImageHeight = originalImgHeight * finalScaleFactor;
        const xOffset = margin;
        
        // Check if scaled height fits, if not, it will be clipped as per single page requirement
        // For true multi-page, different logic would be needed here.
        // For now, it scales to width and if height is too much, it gets cut.
        pdf.addImage(imgData, 'PNG', xOffset, contentStartY, pdfImageWidth, pdfImageHeight);
        const sessionDateStr = sessionData.fecha ? formatDate(sessionData.fecha).replace(/\s/g, '_') : 'sin_fecha';
        const sessionNumStr = sessionData.numero_sesion || 'N';
        pdf.save(`sesion_${sessionNumStr}_${sessionDateStr}.pdf`);
      };
      img.onerror = (err) => { console.error("Error loading image for PDF:", err); toast({ title: "Error Imagen PDF", variant: "destructive" }); };
      img.src = imgData;
    } catch (error: any) {
      console.error("Error PDF:", error); toast({ title: "Error al Generar PDF", description: error.message, variant: "destructive" });
    } finally {
      if (printButtonContainer) printButtonContainer.style.display = originalDisplayBtn;
      originalHeaderStyles.forEach(s => { s.element.style.backgroundColor = s.bgColor; s.element.style.color = s.textColor; });
      setIsGeneratingPdf(false);
    }
  };


  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !sessionData) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-destructive">Sesión No Encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>La sesión que buscas no existe o no se pudo encontrar.</CardDescription>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/mis-sesiones"><ArrowLeft className="mr-2 h-4 w-4" /> Volver a Mis Sesiones</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
        <div className="mb-6 flex justify-between items-center">
            <Button variant="outline" asChild>
            <Link href="/mis-sesiones">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Mis Sesiones
            </Link>
            </Button>
            {sessionData.type === "AI" && <Bot className="h-8 w-8 text-accent" title="Sesión generada por IA"/>}
        </div>

        {/* Content to be rendered for PDF */}
        <div className="session-print-area bg-white text-gray-800 shadow-lg m-0 rounded-md border border-gray-700">
            <div className="dialog-header-print-override p-4 border-b bg-gray-800 text-white rounded-t-md">
                <div className="flex justify-between items-start">
                    <h2 className="text-xl font-bold uppercase text-white">SESIÓN DE ENTRENAMIENTO</h2>
                    <div className="text-right">
                        <p className="text-md text-gray-300">FECHA: {formatDate(sessionData.fecha)}</p>
                        <p className="text-md text-gray-300">Nº SESIÓN: {sessionData.numero_sesion || 'N/A'}</p>
                    </div>
                </div>
                <div className="flex justify-between text-md text-gray-300">
                    <p>EQUIPO: {sessionData.equipo || 'No especificado'}</p>
                    <p>CLUB: {sessionData.club || 'No especificado'}</p>
                </div>
            </div>
            
            <div className="p-4 border-b border-gray-300">
                <div className="flex justify-between items-center bg-gray-700 text-white px-3 py-1.5 mb-3 rounded">
                    <h3 className="font-semibold text-lg uppercase">OBJETIVOS</h3>
                </div>
                <div className="text-sm space-y-1">
                    <p><strong className="font-medium">CATEGORÍA(S)/ENFOQUE:</strong> {getSessionCategorias(sessionData)}</p>
                    <p><strong className="font-medium">OBJETIVOS GENERALES:</strong> {getSessionObjetivos(sessionData)}</p>
                </div>
            </div>

            <div className="p-4 border-b border-gray-300">
              <div className="flex justify-between items-center bg-gray-700 text-white px-3 py-1.5 mb-3 rounded">
                <h3 className="font-semibold text-lg">PARTE INICIAL</h3>
                <span className="text-sm">{getExerciseDuration(sessionData.warmUp)}</span>
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-start">
                {sessionData.type === "Manual" && sessionData.warmUp && typeof sessionData.warmUp === 'object' && (
                    <div className="md:w-1/3 flex-shrink-0">
                        <Image src={getExerciseImage(sessionData.warmUp as EjercicioDetallado, "Calentamiento")} alt="Calentamiento" width={300} height={200} className="rounded border border-gray-400 object-contain w-full aspect-[3/2]" data-ai-hint="futsal warmup"/>
                    </div>
                )}
                <div className="flex-1">
                    <p className="text-md font-semibold">{formatExerciseName(sessionData.warmUp)}</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{sessionData.type === "AI" ? sessionData.warmUp : formatExerciseDescription(sessionData.warmUp as EjercicioDetallado)}</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-gray-300">
              <div className="flex justify-between items-center bg-gray-700 text-white px-3 py-1.5 mb-3 rounded">
                <h3 className="font-semibold text-lg text-left">PARTE PRINCIPAL</h3>
                <span className="text-sm text-right">{getMainExercisesTotalDuration(sessionData.mainExercises)}</span>
              </div>
              <div className="space-y-4">
                {sessionData.mainExercises.map((ex, index) => (
                  <div key={typeof ex === 'string' ? `ai-main-${index}` : ex.id || `manual-main-${index}`} className="p-3 border border-gray-400 rounded bg-white">
                    <div className="flex justify-end items-center mb-1 text-sm">
                      <span className="font-medium">TIEMPO: {getExerciseDuration(ex)}</span>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      {typeof ex === 'object' && (
                          <div className="md:w-1/3 flex-shrink-0">
                              <Image src={getExerciseImage(ex as EjercicioDetallado, `Principal ${index + 1}`)} alt={`Ejercicio Principal ${index + 1}`} width={300} height={200} className="rounded border border-gray-400 object-contain w-full aspect-[3/2]" data-ai-hint="futsal exercise"/>
                          </div>
                      )}
                      <div className="flex-1">
                        <p className="text-md font-semibold">{formatExerciseName(ex)}</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{typeof ex === 'string' ? ex : formatExerciseDescription(ex as EjercicioDetallado)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 border-b border-gray-300">
              <div className="flex justify-between items-center bg-gray-700 text-white px-3 py-1.5 mb-3 rounded">
                <h3 className="font-semibold text-lg">FASE FINAL - VUELTA A LA CALMA</h3>
                <span className="text-sm">{getExerciseDuration(sessionData.coolDown)}</span>
              </div>
               <div className="flex flex-col md:flex-row gap-4 items-start">
                 {sessionData.type === "Manual" && sessionData.coolDown && typeof sessionData.coolDown === 'object' && (
                     <div className="md:w-1/3 flex-shrink-0">
                         <Image src={getExerciseImage(sessionData.coolDown as EjercicioDetallado, "Vuelta a la Calma")} alt="Vuelta a la calma" width={300} height={200} className="rounded border border-gray-400 object-contain w-full aspect-[3/2]" data-ai-hint="futsal cooldown"/>
                     </div>
                 )}
                 <div className="flex-1">
                    <p className="text-md font-semibold">{formatExerciseName(sessionData.coolDown)}</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{sessionData.type === "AI" ? sessionData.coolDown : formatExerciseDescription(sessionData.coolDown as EjercicioDetallado)}</p>
                 </div>
               </div>
            </div>
            
            <div className="p-4 mt-3 border-b border-gray-300 text-center">
                <p className="font-semibold text-md">
                    <ClockIcon className="inline-block mr-1.5 h-5 w-5" />
                    Tiempo total: {getSessionTotalDuration(sessionData)}
                </p>
            </div>

            {(sessionData.coachNotes && sessionData.coachNotes.trim() !== "") && (
              <div className="p-4">
                <h3 className="font-semibold mb-1 text-lg uppercase">OBSERVACIONES:</h3>
                <p className="text-md whitespace-pre-wrap">{sessionData.coachNotes}</p>
              </div>
            )}
            {sessionData.type === "AI" && (
              <div className="p-4 space-y-2 border-t border-gray-300 mt-2">
                {(sessionData as SesionAI).teamDescription && <div><h4 className="font-semibold text-md">Descripción del Equipo (IA):</h4><p className="text-sm whitespace-pre-wrap">{(sessionData as SesionAI).teamDescription}</p></div>}
                {(sessionData as SesionAI).trainingGoals && sessionData.type === "AI" && (!sessionData.coachNotes?.includes((sessionData as SesionAI).trainingGoals!)) && <div><h4 className="font-semibold text-md">Objetivos (Input IA):</h4><p className="text-sm whitespace-pre-wrap">{(sessionData as SesionAI).trainingGoals}</p></div>}
              </div>
            )}
            <div className="print-button-container p-4 mt-4 text-center border-t border-gray-300">
                <Button onClick={handleSavePdf} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isGeneratingPdf}>
                    {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {isGeneratingPdf ? 'Generando PDF...' : 'Guardar PDF'}
                </Button>
            </div>
        </div>
    </div>
  );
}

export default function SesionDetallePage() {
    return (
        <AuthGuard>
            <SesionDetallePageContent />
        </AuthGuard>
    )
}

    