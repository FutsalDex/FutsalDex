
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection as firestoreCollection, getDocs, limit, query, where } from 'firebase/firestore';
import Image from 'next/image';
import { Filter, Search, Loader2, Lock, ListFilter, ChevronDown, Heart, Eye, FileDown, ArrowLeft } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CATEGORIAS_TEMATICAS_EJERCICIOS, CATEGORIAS_EDAD_EJERCICIOS, FASES_SESION } from '@/lib/constants';
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toggleFavorite } from '@/lib/actions/user-actions';
import Link from 'next/link';


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

const ITEMS_PER_PAGE = 12;
const GUEST_ITEM_LIMIT = 15;
const REGISTERED_USER_LIMIT = 500;
const ALL_FILTER_VALUE = "ALL";

interface FavoriteState {
  [exerciseId: string]: boolean;
}

const createGuestExercises = (): Ejercicio[] => {
    const demoData: Omit<Ejercicio, 'id'>[] = [
        {
            ejercicio: "Rondo de Calentamiento 4 vs 1",
            descripcion: "Un rondo clásico para iniciar la sesión, enfocado en la velocidad del pase y la movilidad. Los jugadores de fuera deben realizar pases a un toque, mientras el defensor presiona para recuperar.",
            objetivos: "Mejorar la velocidad de circulación, la precisión en el pase y la reacción tras pérdida.",
            espacio_materiales: "Un círculo de conos de 5 metros de diámetro, 1 balón.",
            jugadores: "5 jugadores",
            duracion: "10",
            fase: "Inicial",
            categoria: "Pase y control",
            edad: ["Alevín (10-11 años)", "Infantil (12-13 años)"],
            imagen: "https://placehold.co/400x300.png",
            isVisible: true,
            consejos_entrenador: "Insistir en la comunicación y el movimiento sin balón.",
        },
        {
            ejercicio: "Finalización 2 vs 1 + Portero",
            descripcion: "Dos atacantes parten desde el centro del campo contra un único defensor. Deben colaborar para superar al defensor y finalizar con un tiro a portería.",
            objetivos: "Trabajar la toma de decisiones en superioridad numérica, los desmarques y la definición.",
            espacio_materiales: "Media pista, 1 portería, varios balones.",
            jugadores: "3 jugadores + 1 Portero",
            duracion: "15",
            fase: "Principal",
            categoria: "Finalización",
            edad: ["Cadete (14-15 años)", "Juvenil (16-18 años)"],
            imagen: "https://placehold.co/400x300.png",
            isVisible: true,
            variantes: "Limitar el número de toques de los atacantes.",
        },
        {
            ejercicio: "Juego de Posesión 3 vs 3 + Comodines",
            descripcion: "Dos equipos de tres jugadores compiten por mantener la posesión en un espacio reducido. Se apoyan en dos comodines ofensivos que siempre juegan con el equipo que tiene el balón.",
            objetivos: "Mejorar la conservación del balón bajo presión, la visión de juego y el apoyo constante.",
            espacio_materiales: "Cuadrado de 20x20 metros, petos de dos colores, balones.",
            jugadores: "8 jugadores",
            duracion: "20",
            fase: "Principal",
            categoria: "Posesión y circulación del balón",
            edad: ["Infantil (12-13 años)", "Cadete (14-15 años)"],
            imagen: "https://placehold.co/400x300.png",
            isVisible: true,
        },
        {
            ejercicio: "Estiramientos y Vuelta a la Calma",
            descripcion: "Serie de estiramientos estáticos de los principales grupos musculares utilizados en el fútbol sala, combinados con una respiración profunda y controlada.",
            objetivos: "Reducir la tensión muscular, mejorar la flexibilidad y facilitar la recuperación post-entrenamiento.",
            espacio_materiales: "Ninguno.",
            jugadores: "Todo el equipo",
            duracion: "5",
            fase: "Final",
            categoria: "Calentamiento y activación",
            edad: ["Benjamín (8-9 años)", "Alevín (10-11 años)", "Infantil (12-13 años)", "Cadete (14-15 años)", "Juvenil (16-18 años)", "Senior (+18 años)"],
            imagen: "https://placehold.co/400x300.png",
            isVisible: true,
        },
    ];
    return demoData.map((ex, index) => ({...ex, id: `guest_ex_${index}`} as Ejercicio));
};


export default function EjerciciosPage() {
  const { user, isRegisteredUser, isAdmin, isSubscribed } = useAuth();
  const { toast } = useToast();
  
  const [allExercises, setAllExercises] = useState<Ejercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState(ALL_FILTER_VALUE);
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>(ALL_FILTER_VALUE);
  const [thematicCategoryFilter, setThematicCategoryFilter] = useState<string>(ALL_FILTER_VALUE);
  
  const [favorites, setFavorites] = useState<FavoriteState>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedExercise, setSelectedExercise] = useState<Ejercicio | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const fetchAllExercises = async () => {
      setIsLoading(true);

      if (!isRegisteredUser) {
        setAllExercises(createGuestExercises());
        setIsLoading(false);
        return;
      }

      try {
        const ejerciciosCollectionRef = firestoreCollection(db, 'ejercicios_futsal');
        const qLimit = (isRegisteredUser && (isAdmin || isSubscribed)) ? REGISTERED_USER_LIMIT : GUEST_ITEM_LIMIT;
        
        const q = query(ejerciciosCollectionRef, limit(qLimit));
        
        const documentSnapshots = await getDocs(q);
        
        const fetchedEjercicios = documentSnapshots.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ejercicio: data.ejercicio || '',
            descripcion: data.descripcion || '',
            objetivos: data.objetivos || '',
            espacio_materiales: data.espacio_materiales || '',
            jugadores: data.jugadores || '',
            duracion: data.duracion || '0',
            variantes: data.variantes || '',
            fase: data.fase || '',
            categoria: data.categoria || '',
            edad: data.edad || [],
            imagen: data.imagen || '',
            consejos_entrenador: data.consejos_entrenador || '',
            isVisible: data.isVisible,
            numero: data.numero,
          } as Ejercicio;
        });

        let visibleExercises = fetchedEjercicios.filter(ej => ej.isVisible !== false);

        if (isRegisteredUser && (isAdmin || isSubscribed)) {
            // Sort by 'numero' field. Handles alphanumeric sorting and places exercises without a number at the end.
            visibleExercises.sort((a, b) => {
              const numA = a.numero;
              const numB = b.numero;

              if (numA && !numB) return -1; // a comes first
              if (!numA && numB) return 1;  // b comes first
              if (!numA && !numB) return (a.ejercicio || '').localeCompare(b.ejercicio || ''); // fallback to name if both are null

              // Both have a number, compare them. localeCompare with numeric option helps sort "2" before "10".
              return (numA || '').localeCompare(numB || '', undefined, { numeric: true });
            });
        }
        
        setAllExercises(visibleExercises);
        
      } catch (error: any) {
        console.error("Error fetching exercises: ", error);
        toast({ title: "Error al Cargar Ejercicios", description: "No se pudieron cargar los ejercicios. Revisa tu conexión o contacta soporte.", variant: "destructive" });
        setAllExercises([]);
      }
      setIsLoading(false);
    };
    fetchAllExercises();
  }, [isRegisteredUser, isAdmin, isSubscribed, toast]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, phaseFilter, selectedAgeFilter, thematicCategoryFilter]);

  const filteredExercises = useMemo(() => {
    return allExercises.filter(ej => {
      const lowerSearchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
      const searchMatch = lowerSearchTerms.length === 0 || lowerSearchTerms.some(term => (ej.ejercicio || '').toLowerCase().includes(term));
      const phaseMatch = phaseFilter === ALL_FILTER_VALUE || ej.fase === phaseFilter;
      const ageMatch = selectedAgeFilter === ALL_FILTER_VALUE || (ej.edad && ej.edad.includes(selectedAgeFilter));
      const categoryMatch = thematicCategoryFilter === ALL_FILTER_VALUE || ej.categoria === thematicCategoryFilter;
      return searchMatch && phaseMatch && ageMatch && categoryMatch;
    });
  }, [allExercises, searchTerm, phaseFilter, selectedAgeFilter, thematicCategoryFilter]);

  const paginatedExercises = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExercises.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredExercises, currentPage]);

  const totalPages = Math.ceil(filteredExercises.length / ITEMS_PER_PAGE);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  useEffect(() => {
    if (user && isRegisteredUser) {
      const loadFavorites = async () => {
        try {
          const favsRef = firestoreCollection(db, "usuarios", user.uid, "user_favorites");
          const querySnapshot = await getDocs(favsRef);
          const userFavorites: FavoriteState = {};
          querySnapshot.forEach((docSnap) => {
            userFavorites[docSnap.id] = true;
          });
          setFavorites(userFavorites);
        } catch (error) {
          console.error("Error loading favorites:", error);
          toast({ title: "Error", description: "No se pudieron cargar tus favoritos.", variant: "destructive" });
        }
      };
      loadFavorites();
    } else {
      setFavorites({});
    }
  }, [user, isRegisteredUser, toast]);

  const handleToggleFavorite = async (exerciseId: string) => {
    if (!user || !isRegisteredUser) {
      toast({ title: "Acción Requerida", description: "Inicia sesión para guardar tus ejercicios favoritos.", variant: "default", action: <Button asChild variant="outline"><Link href="/login">Iniciar Sesión</Link></Button> });
      return;
    }
    const isCurrentlyFavorite = !!favorites[exerciseId];
    const newFavoritesState = { ...favorites, [exerciseId]: !isCurrentlyFavorite };
    setFavorites(newFavoritesState);
    try {
      await toggleFavorite({ userId: user.uid, exerciseId, isFavorite: !isCurrentlyFavorite });
      toast({ title: `Favorito ${!isCurrentlyFavorite ? 'Añadido' : 'Eliminado'}`, description: `El ejercicio se ha ${!isCurrentlyFavorite ? 'añadido a' : 'eliminado de'} tus favoritos.` });
    } catch (error) {
      console.error("Error updating favorite status:", error);
      setFavorites(favorites); 
      toast({ title: "Error", description: "No se pudo actualizar el estado de favorito. Inténtalo de nuevo.", variant: "destructive" });
    }
  };
  
  const getAgeFilterButtonText = () => {
    if (selectedAgeFilter === ALL_FILTER_VALUE) return "Todas las Edades";
    return selectedAgeFilter;
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
      
      const ratio = Math.min((pdfWidth - 40) / imgWidth, (pdfHeight - 40) / imgHeight); // with some margin
      
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

  return (
    <Dialog open={!!selectedExercise} onOpenChange={(isOpen) => !isOpen && setSelectedExercise(null)}>
      <div className="container mx-auto px-4 py-8 md:px-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Biblioteca de Ejercicios</h1>
          <p className="text-lg text-foreground/80">Explora nuestra colección de ejercicios de futsal.</p>
          <p className="text-lg text-foreground/80">Filtra por nombre, fase, categoría o edad.</p>
        </header>

        {!isRegisteredUser && (
          <Card className="mb-6 bg-accent/10 border-accent">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center">
                <Lock className="h-8 w-8 text-accent mr-4" />
                <div>
                  <h3 className="text-lg font-semibold text-accent font-headline">Acceso Limitado</h3>
                  <p className="text-sm text-accent/80">Estás viendo una vista previa ({GUEST_ITEM_LIMIT} ejercicios). <Link href="/register" className="font-bold underline hover:text-accent">Regístrate</Link> para acceder a más de 500 ejercicios y todas las funciones.</p>
                </div>
              </div>
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
                <Link href="/register">Registrarse Ahora</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
              <div className="relative flex-grow w-full md:w-auto">
                  <Input
                  type="text"
                  placeholder="Buscar ejercicio por nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              </div>
              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filtrar por Fase" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>Todas las Fases</SelectItem>
                      {FASES_SESION.map(fase => <SelectItem key={fase} value={fase}>{fase}</SelectItem>)}
                  </SelectContent>
              </Select>

              <Select value={thematicCategoryFilter} onValueChange={setThematicCategoryFilter}>
                  <SelectTrigger className="w-full md:w-[220px]">
                      <ListFilter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value={ALL_FILTER_VALUE}>Todas las Categorías</SelectItem>
                      {CATEGORIAS_TEMATICAS_EJERCICIOS.map(category => (
                      <SelectItem key={category.id} value={category.label}>{category.label}</SelectItem>
                      ))}
                  </SelectContent>
              </Select>

              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full md:w-[200px] justify-between">
                      <div className="flex items-center">
                          <Filter className="h-4 w-4 mr-2" />
                          {getAgeFilterButtonText()}
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-[250px]">
                      <DropdownMenuLabel>Selecciona Edad</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={selectedAgeFilter} onValueChange={setSelectedAgeFilter}>
                      <DropdownMenuRadioItem value={ALL_FILTER_VALUE}>Todas las Edades</DropdownMenuRadioItem>
                      {CATEGORIAS_EDAD_EJERCICIOS.map(ageCat => (
                          <DropdownMenuRadioItem key={ageCat} value={ageCat}>
                          {ageCat}
                          </DropdownMenuRadioItem>
                      ))}
                      </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
          <div className="text-left text-sm text-muted-foreground pt-2">
            <p className="text-sm text-muted-foreground">
              Total de ejercicios: <span className="font-bold text-foreground">{filteredExercises.length}</span>
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        ) : paginatedExercises.length === 0 ? (
          <p className="text-center text-lg text-muted-foreground py-10">
            No se encontraron ejercicios con los filtros actuales.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {paginatedExercises.map((ej) => (
                <Card key={ej.id} className="flex flex-col overflow-hidden transition-all hover:shadow-xl bg-card">
                  <div className="relative h-48 w-full">
                    <Image
                      src={ej.imagen || 'https://placehold.co/400x300.png'}
                      alt={ej.ejercicio}
                      fill
                      style={{ objectFit: 'contain' }}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      data-ai-hint="futsal drill"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold text-primary font-headline truncate" title={ej.ejercicio}>{ej.numero ? `${ej.numero} - ` : ''}{ej.ejercicio}</CardTitle>
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
                    <DialogTrigger asChild>
                      <Button onClick={() => setSelectedExercise(ej)} variant="outline" className="text-primary border-primary hover:bg-primary hover:text-primary-foreground">
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Ficha
                      </Button>
                    </DialogTrigger>
                    {isRegisteredUser && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="bg-background/70 hover:bg-background/90 text-primary rounded-full h-8 w-8"
                        onClick={() => handleToggleFavorite(ej.id)}
                        title={favorites[ej.id] ? "Quitar de favoritos" : "Añadir a favoritos"}
                      >
                        <Heart className={cn("h-4 w-4", favorites[ej.id] ? "fill-red-500 text-red-500" : "text-primary")} />
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center items-center gap-4">
                <Button
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    disabled={!canGoPrevious || isLoading}
                    variant="outline"
                >
                    Anterior
                </Button>
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={!canGoNext || isLoading}
                    variant="outline"
                >
                    Siguiente
                </Button>
              </div>
            )}
          </>
        )}

        <DialogContent className="max-w-6xl w-full p-0 flex flex-col h-[90vh]">
          {selectedExercise && (
            <>
              <DialogHeader className="sr-only">
                <DialogTitle>{selectedExercise.ejercicio}</DialogTitle>
                <DialogDescription>Ficha detallada del ejercicio: {selectedExercise.ejercicio}. Objetivos: {selectedExercise.objetivos}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-grow bg-background">
                <div className="exercise-print-area bg-white text-gray-800 m-0">
                  <div className="p-4 bg-gray-800 text-white flex justify-between items-center">
                    <h2 className="text-2xl font-bold font-headline">{selectedExercise.numero ? `${selectedExercise.numero} - ` : ''}{selectedExercise.ejercicio}</h2>
                    <div className="text-right">
                      <p className="font-bold text-lg">Duración: {formatDuracion(selectedExercise.duracion)}</p>
                    </div>
                  </div>
                  <div className="p-6 bg-white text-gray-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="w-full h-auto">
                        <Image
                          src={selectedExercise.imagen || `https://placehold.co/400x300.png`}
                          alt={`Diagrama de ${selectedExercise.ejercicio}`}
                          width={400}
                          height={300}
                          className="w-full h-auto object-contain rounded border"
                          priority
                          data-ai-hint="futsal diagram"
                        />
                      </div>
                      <div className="space-y-3">
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
                    <div className="space-y-4">
                       <div>
                          <h4 className="font-bold text-sm uppercase tracking-wider text-gray-500">Categoría</h4>
                          <p>{selectedExercise.categoria}</p>
                        </div>
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
                  <div className="p-3 bg-gray-100 border-t text-xs text-gray-600 flex justify-between">
                    <span>FutsalDex - Herramienta para entrenadores</span>
                    <span>Categorías de Edad: {Array.isArray(selectedExercise.edad) ? selectedExercise.edad.join(', ') : selectedExercise.edad}</span>
                  </div>
                </div>
              </ScrollArea>
              <div className="p-4 bg-muted border-t flex justify-center gap-4 flex-shrink-0">
                <Button
                  onClick={() => handleSavePdf(selectedExercise)}
                  disabled={isGeneratingPdf}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {isGeneratingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                  Descargar PDF
                </Button>
                <Button variant="outline" onClick={() => setSelectedExercise(null)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver a Ejercicios
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </div>
    </Dialog>
  );
}
