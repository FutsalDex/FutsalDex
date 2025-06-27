
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection as firestoreCollection, getDocs, limit, query, where, startAfter, orderBy as firestoreOrderBy, DocumentData, QueryConstraint, QueryDocumentSnapshot, doc, setDoc, deleteDoc, serverTimestamp, getCountFromServer } from 'firebase/firestore';
import Image from 'next/image';
import { Filter, Search, Loader2, Lock, ListFilter, ChevronDown, Heart, ArrowRight } from 'lucide-react';
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

const ITEMS_PER_PAGE = 10;
const GUEST_ITEM_LIMIT = 10;
const ALL_FILTER_VALUE = "ALL";


interface FavoriteState {
  [exerciseId: string]: boolean;
}

export default function EjerciciosPage() {
  const { user, isRegisteredUser } = useAuth();
  const { toast } = useToast();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [rawFetchedItemsCountOnPage, setRawFetchedItemsCountOnPage] = useState(0);
  const [pageCursors, setPageCursors] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState(ALL_FILTER_VALUE);
  const [selectedAgeFilter, setSelectedAgeFilter] = useState<string>(ALL_FILTER_VALUE);
  const [thematicCategoryFilter, setThematicCategoryFilter] = useState<string>(ALL_FILTER_VALUE);
  const [favorites, setFavorites] = useState<FavoriteState>({});

  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(true);

  const uniqueAgeCategories = useMemo(() => CATEGORIAS_EDAD_EJERCICIOS, []);
  const uniqueFases = useMemo(() => FASES_SESION, []);

  useEffect(() => {
    const fetchFilteredCount = async () => {
      setIsCounting(true);
      try {
        const coll = firestoreCollection(db, "ejercicios_futsal");
        let countConstraints: QueryConstraint[] = [];
        
        if (selectedAgeFilter && selectedAgeFilter !== ALL_FILTER_VALUE) {
            countConstraints.push(where('edad', 'array-contains', selectedAgeFilter));
        }

        if (phaseFilter && phaseFilter !== ALL_FILTER_VALUE) {
          countConstraints.push(where('fase', '==', phaseFilter));
        }
        if (thematicCategoryFilter && thematicCategoryFilter !== ALL_FILTER_VALUE) {
          countConstraints.push(where('categoria', '==', thematicCategoryFilter));
        }

        const countQuery = query(coll, ...countConstraints);
        const snapshot = await getCountFromServer(countQuery);
        setFilteredCount(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching filtered exercise count: ", error);
        setFilteredCount(0);
      }
      setIsCounting(false);
    };

    fetchFilteredCount();
  }, [phaseFilter, selectedAgeFilter, thematicCategoryFilter]);


  const fetchEjercicios = useCallback(async (
    pageToFetch: number,
    currentSearchTerm: string,
    currentPhase: string,
    currentAgeCategory: string,
    currentThematicCategory: string,
    docToStartAfter: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<QueryDocumentSnapshot<DocumentData> | null> => {
    let newLastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null;
    try {
      const ejerciciosCollectionRef = firestoreCollection(db, 'ejercicios_futsal');
      
      let constraintsList: QueryConstraint[] = [];

      if (currentAgeCategory && currentAgeCategory !== ALL_FILTER_VALUE) {
        constraintsList.push(where('edad', 'array-contains', currentAgeCategory));
      }

      if (currentPhase && currentPhase !== ALL_FILTER_VALUE) {
        constraintsList.push(where('fase', '==', currentPhase));
      }
      if (currentThematicCategory && currentThematicCategory !== ALL_FILTER_VALUE) {
        constraintsList.push(where('categoria', '==', currentThematicCategory));
      }
      
      constraintsList.push(firestoreOrderBy('ejercicio'));

      const currentLimit = isRegisteredUser ? ITEMS_PER_PAGE : GUEST_ITEM_LIMIT;
      constraintsList.push(limit(currentLimit));
      
      if (docToStartAfter) {
         constraintsList.push(startAfter(docToStartAfter));
      }

      const q = query(ejerciciosCollectionRef, ...constraintsList);
      const documentSnapshots = await getDocs(q);
      
      let fetchedEjerciciosFromDB = documentSnapshots.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Ejercicio, 'id'>)
      } as Ejercicio));
      
      let filteredAndSearchedEjercicios = fetchedEjerciciosFromDB;

      if (currentSearchTerm.trim() !== "") {
        const lowerSearchTerms = currentSearchTerm.toLowerCase().split(' ').filter(term => term.length > 0);
        filteredAndSearchedEjercicios = filteredAndSearchedEjercicios.filter(ej => {
          const lowerEjercicioName = ej.ejercicio.toLowerCase();
          return lowerSearchTerms.some(term => lowerEjercicioName.includes(term));
        });
      }
      
      setEjercicios(filteredAndSearchedEjercicios);
      newLastVisibleDoc = documentSnapshots.docs[documentSnapshots.docs.length - 1] || null;
      setRawFetchedItemsCountOnPage(documentSnapshots.docs.length);

    } catch (error: any) {
      console.error("Error fetching exercises: ", error);
      if (error.code === 'failed-precondition') {
        toast({
          title: "Índice Requerido por Firestore",
          description: ( <div className="text-sm"> <p>La combinación actual de filtros y/o ordenación necesita un índice compuesto en Firestore que no existe.</p> <p className="mt-1">Por favor, abre la consola de desarrollador (F12), busca el mensaje de error completo de Firebase y haz clic en el enlace que proporciona para crear el índice automáticamente.</p> </div> ),
          variant: "destructive", duration: 30000,
        });
      } else {
        toast({ title: "Error al Cargar Ejercicios", description: "No se pudieron cargar los ejercicios.", variant: "destructive" });
      }
      setEjercicios([]); 
      setRawFetchedItemsCountOnPage(0);
    }
    return newLastVisibleDoc;
  }, [isRegisteredUser, toast]);


  useEffect(() => {
    const fetchDataForCurrentPage = async () => {
      setIsLoading(true);
      const startAfterDoc = currentPage > 1 && pageCursors[currentPage - 2] ? pageCursors[currentPage - 2] : null;

      const newLastVisibleDoc = await fetchEjercicios(
        currentPage,
        searchTerm,
        phaseFilter,
        selectedAgeFilter,
        thematicCategoryFilter,
        startAfterDoc
      );
      
      setPageCursors(prevCursors => {
        const updatedCursors = [...prevCursors];
        if (currentPage === 1) {
          return newLastVisibleDoc ? [newLastVisibleDoc] : [];
        }
        if (newLastVisibleDoc) {
          updatedCursors[currentPage - 1] = newLastVisibleDoc;
        } else if (currentPage > 0 && updatedCursors.length >= currentPage) {
          updatedCursors[currentPage - 1] = null; 
           while (updatedCursors.length > 0 && updatedCursors[updatedCursors.length - 1] === null) {
            updatedCursors.pop();
          }
        }
        return updatedCursors;
      });
      setIsLoading(false);
    };

    fetchDataForCurrentPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, phaseFilter, selectedAgeFilter, thematicCategoryFilter, isRegisteredUser]);

  const resetPaginationAndFilters = () => {
    setCurrentPage(1);
    setPageCursors([]);
    setEjercicios([]); 
  };

  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    resetPaginationAndFilters();
  };

  const handlePhaseFilterChange = (value: string) => {
    setPhaseFilter(value);
    resetPaginationAndFilters();
  };

  const handleThematicCategoryFilterChange = (value: string) => {
    setThematicCategoryFilter(value);
    resetPaginationAndFilters();
  };

  const handleSelectedAgeFilterChange = (value: string) => {
    setSelectedAgeFilter(value);
    resetPaginationAndFilters();
  };

  useEffect(() => {
    if (user && isRegisteredUser) {
      const loadFavorites = async () => {
        try {
          const favsRef = firestoreCollection(db, "users", user.uid, "user_favorites");
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
      const favDocRef = doc(db, "users", user.uid, "user_favorites", exerciseId);
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
  
  const handlePageChange = (newPage: number) => {
    if (isLoading) return;
    if (newPage < 1 && currentPage === 1) return;
    if (newPage > currentPage && !canGoNext) return;
    setCurrentPage(newPage);
  };
  
  const getAgeFilterButtonText = () => {
    if (selectedAgeFilter === ALL_FILTER_VALUE) return "Todas las Edades";
    return selectedAgeFilter;
  };
  
  const formatDuracion = (duracion: string) => duracion ? `${duracion}` : 'N/A';

  const currentLimit = isRegisteredUser ? ITEMS_PER_PAGE : GUEST_ITEM_LIMIT;
  const canGoPrevious = currentPage > 1;
  const canGoNext = rawFetchedItemsCountOnPage === currentLimit;


  return (
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
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                <div className="relative flex-grow w-full sm:w-auto">
                    <Input
                    type="text"
                    placeholder="Buscar ejercicio por nombre..."
                    value={searchTerm}
                    onChange={handleSearchTermChange}
                    className="pl-10"
                    />
                    <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                </div>
                <Select value={phaseFilter} onValueChange={handlePhaseFilterChange}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filtrar por Fase" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL_FILTER_VALUE}>Todas las Fases</SelectItem>
                        {uniqueFases.map(fase => <SelectItem key={fase} value={fase}>{fase}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={thematicCategoryFilter} onValueChange={handleThematicCategoryFilterChange}>
                    <SelectTrigger className="w-full sm:w-[220px]">
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
                        <Button variant="outline" className="w-full sm:w-[200px] justify-between">
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
                        <DropdownMenuRadioGroup value={selectedAgeFilter} onValueChange={handleSelectedAgeFilterChange}>
                        <DropdownMenuRadioItem value={ALL_FILTER_VALUE}>Todas las Edades</DropdownMenuRadioItem>
                        {uniqueAgeCategories.map(ageCat => (
                            <DropdownMenuRadioItem key={ageCat} value={ageCat}>
                            {ageCat}
                            </DropdownMenuRadioItem>
                        ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

             <div className="text-right text-sm text-muted-foreground w-full md:w-auto shrink-0">
                {searchTerm.trim() === '' ? (
                <>
                    {isCounting ? (
                    <Loader2 className="inline-block h-4 w-4 animate-spin" />
                    ) : (
                    <span className='font-medium'>{filteredCount ?? 0} ejercicios</span>
                    )}
                </>
                ) : (
                <span className='italic'>Buscando por: "{searchTerm}"</span>
                )}
            </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && ejercicios.length === 0 && (
         <p className="text-center text-lg text-muted-foreground py-10">
           {filteredCount === 0 ? "No se encontraron ejercicios con los filtros actuales." : "No se encontraron ejercicios."}
         </p>
      )}

      {ejercicios.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ejercicios.map((ej) => (
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
                  <CardDescription className="text-xs pt-2 space-y-0.5">
                    <div><strong>Fase:</strong> {ej.fase}</div>
                    <div><strong>Edad:</strong> {Array.isArray(ej.edad) ? ej.edad.join(', ') : ej.edad}</div>
                    <div><strong>Duración:</strong> {formatDuracion(ej.duracion)} min</div>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="mb-2 text-sm text-foreground/80 line-clamp-3" title={ej.descripcion}>{ej.descripcion}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/ejercicios/${ej.id}`}>
                      <ArrowRight className="mr-2 h-4 w-4" /> Ver Detalles
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          <div className="mt-8 flex justify-center">
            <Button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!canGoPrevious || isLoading}
                variant="outline"
                className="mr-2"
            >
                Anterior
            </Button>
            <Button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!canGoNext || isLoading}
                variant="outline"
            >
                {isLoading && currentPage > 1 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Siguiente"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
