
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection as firestoreCollection, getDocs, limit, query, orderBy as firestoreOrderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import Image from 'next/image';
import { Filter, Search, Loader2, Lock, ListFilter, ChevronDown, Heart, ArrowRight, Star } from 'lucide-react';
import Link from 'next/link';
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

  useEffect(() => {
    const fetchAllExercises = async () => {
      setIsLoading(true);
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
          } as Ejercicio;
        });

        let visibleExercises = fetchedEjercicios.filter(ej => ej.isVisible !== false);

        if (isRegisteredUser && (isAdmin || isSubscribed)) {
            visibleExercises.sort((a, b) => (a.ejercicio || '').localeCompare(b.ejercicio || ''));
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

  const toggleFavorite = async (exerciseId: string) => {
    if (!user || !isRegisteredUser) {
      toast({ title: "Acción Requerida", description: "Inicia sesión para guardar tus ejercicios favoritos.", variant: "default", action: <Button asChild variant="outline"><Link href="/login">Iniciar Sesión</Link></Button> });
      return;
    }
    const isCurrentlyFavorite = !!favorites[exerciseId];
    const newFavoritesState = { ...favorites, [exerciseId]: !isCurrentlyFavorite };
    setFavorites(newFavoritesState);
    try {
      const favDocRef = doc(db, "usuarios", user.uid, "user_favorites", exerciseId);
      if (!isCurrentlyFavorite) {
        await setDoc(favDocRef, { addedAt: serverTimestamp() });
        toast({ title: "Favorito Añadido", description: "El ejercicio se ha añadido a tus favoritos." });
      } else {
        await deleteDoc(favDocRef);
        toast({ title: "Favorito Eliminado", description: "El ejercicio se ha eliminado de tus favoritos." });
      }
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
  
  const formatDuracion = (duracion: string) => duracion ? `${duracion}` : 'N/A';

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Biblioteca de Ejercicios</h1>
        <p className="text-lg text-foreground/80">Explora nuestra colección de ejercicios de futsal.</p>
        <p className="text-lg text-foreground/80">Filtra por nombre, fase, categoría o edad.</p>
      </header>

      {!isRegisteredUser ? (
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
      ) : (!isSubscribed && !isAdmin) && (
         <Card className="mb-6 bg-accent/10 border-accent">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center">
                    <Star className="h-8 w-8 text-accent mr-4" />
                    <div>
                        <h3 className="text-lg font-semibold text-accent font-headline">Desbloquea FutsalDex Pro</h3>
                        <p className="text-sm text-accent/80">Estás viendo una vista previa. Suscríbete para obtener acceso ilimitado a más de 500 ejercicios y a todas las herramientas de planificación.</p>
                    </div>
                </div>
                <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
                    <Link href="/suscripcion">Ver Planes</Link>
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
                   {isRegisteredUser && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 bg-background/70 hover:bg-background/90 text-primary rounded-full h-8 w-8"
                      onClick={() => toggleFavorite(ej.id)}
                      title={favorites[ej.id] ? "Quitar de favoritos" : "Añadir a favoritos"}
                    >
                      <Heart className={cn("h-4 w-4", favorites[ej.id] ? "fill-red-500 text-red-500" : "text-primary")} />
                    </Button>
                  )}
                </div>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-primary font-headline truncate" title={ej.ejercicio}>{ej.ejercicio}</CardTitle>
                  {ej.categoria && <Badge variant="secondary" className="mt-1 truncate self-start" title={ej.categoria}>{ej.categoria}</Badge>}
                  <div className="text-xs pt-2 space-y-0.5 text-muted-foreground">
                    <div><strong>Fase:</strong> {ej.fase}</div>
                    <div><strong>Edad:</strong> {Array.isArray(ej.edad) ? ej.edad.join(', ') : ej.edad}</div>
                    <div><strong>Duración:</strong> {formatDuracion(ej.duracion)} min</div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="mb-2 text-sm text-foreground/80 line-clamp-3" title={ej.descripcion}>{ej.descripcion}</p>
                </CardContent>
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
    </div>
  );
}
