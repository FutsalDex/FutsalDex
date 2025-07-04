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
      
      const widthScale = pdfWidth / canvasWidth;
      const heightScale = pdfHeight / canvasHeight;
      const scale = Math.min(widthScale, heightScale, 1);
      
      const finalWidth = canvasWidth * scale;
      const finalHeight = canvasHeight * scale;

      const xOffset = (pdfWidth - finalWidth) / 2;
      const yOffset = (pdfHeight - finalHeight) > 0 ? (pdfHeight - finalHeight) / 2 : 0;
      
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, finalWidth, finalHeight);
      pdf.save(`${ejercicio.ejercicio.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'ejercicio'}_detalle.pdf`);

    } catch (error: any) {
      console.error("Error generating PDF:", error);
      toast({ title: "Error al Generar PDF", description: error.message, variant: "destructive" });
    } finally {
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
        <Button variant="outline" onClick={() => router.push('/ejercicios')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Ejercicios
        </Button>
        {isRegisteredUser && (
          <Button
            variant="ghost"
            size="icon"
            className="ml-4 bg-background hover:bg-background/90 text-primary rounded-full h-10 w-10 shrink-0"
            onClick={() => toggleFavorite(ejercicio.id)}
            title={favorites[ejercicio.id] ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Heart className={cn("h-5 w-5", favorites[ejercicio.id] ? "fill-red-500 text-red-500" : "text-primary")} />
          </Button>
        )}
      </div>

      <div className="exercise-print-area bg-white text-gray-800 shadow-lg max-w-4xl mx-auto rounded-md border border-gray-400">
        <div className="px-4 py-4 flex justify-start items-center border-b border-gray-300">
          <img 
            src="https://i.ibb.co/RTck7Qzq/logo-futsaldex-completo.png" 
            alt="FutsalDex Logo" 
            className="h-12 w-auto"
            crossOrigin="anonymous"
          />
        </div>
        
        <div className="bg-[#2D3748] text-white px-4 py-2 flex justify-between items-center">
            <span className="text-xs">CATEGORÍA: {ejercicio.categoria}</span>
            <h2 className="text-lg font-bold">FICHA DE EJERCICIO</h2>
            <span className="text-xs">Nº EJERCICIO: {ejercicio.numero || 'N/A'}</span>
        </div>

        <div className="p-4 border-b border-gray-300">
            <div className="bg-[#2D3748] text-white px-3 py-1 mb-3 rounded">
                <h3 className="font-semibold uppercase">OBJETIVOS</h3>
            </div>
            {objetivosList.length > 0 ? (
                <ul className="text-sm grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                {objetivosList.map((obj, index) => (
                    <li key={index} className="before:content-['•'] before:mr-2">{obj}</li>
                ))}
                </ul>
            ) : <p className="text-sm text-gray-600">No especificados.</p>}
        </div>

        <div className="p-4 border-b border-gray-300">
            <div className="bg-[#2D3748] text-white px-3 py-1 mb-3 flex justify-between items-center rounded">
                <h3 className="font-semibold uppercase truncate pr-4">{ejercicio.ejercicio}</h3>
                <span className="text-sm bg-white text-gray-800 font-bold px-2 py-0.5 rounded-sm shrink-0">{formatDuracion(ejercicio.duracion)}</span>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-start">
                <div className="w-full md:w-1/2 flex-shrink-0">
                    <div className="relative aspect-video w-full border border-gray-300 rounded overflow-hidden">
                        <Image
                            src={ejercicio.imagen || `https://placehold.co/600x400.png`}
                            alt={`Diagrama de ${ejercicio.ejercicio}`}
                            layout="fill"
                            objectFit="contain"
                            className="bg-gray-100"
                            data-ai-hint="futsal court"
                        />
                    </div>
                </div>
                <div className="w-full md:w-1/2">
                    <p className="text-sm text-gray-700">{ejercicio.descripcion}</p>
                </div>
            </div>
        </div>

        <div className="p-4 border-b border-gray-300 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p><strong className="font-semibold text-gray-900">Fase:</strong> {ejercicio.fase}</p>
            <p><strong className="font-semibold text-gray-900">Edad:</strong> {Array.isArray(ejercicio.edad) ? ejercicio.edad.join(', ') : ejercicio.edad}</p>
            <p><strong className="font-semibold text-gray-900">Nº Jugadores:</strong> {ejercicio.jugadores}</p>
            <p><strong className="font-semibold text-gray-900">Materiales y Espacio:</strong> {ejercicio.espacio_materiales}</p>
        </div>

        {ejercicio.variantes && (
        <div className="p-4 border-b border-gray-300">
          <h3 className="font-semibold text-md mb-1 text-gray-900">Variantes</h3>
          <p className="text-sm text-gray-700">{ejercicio.variantes}</p>
        </div>
        )}

        {ejercicio.consejos_entrenador && (
        <div className="p-4">
          <h3 className="font-semibold text-md mb-1 text-gray-900">Consejos del Entrenador</h3>
          <p className="text-sm text-gray-700">{ejercicio.consejos_entrenador}</p>
        </div>
        )}
        
        <div className="hide-on-print p-4 mt-2 text-center border-t border-gray-300">
            <Button onClick={handlePrint} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isGeneratingPdf}>
                {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isGeneratingPdf ? 'Generando PDF...' : 'Guardar Ficha en PDF'}
            </Button>
        </div>
      </div>
    </div>
  );
}
