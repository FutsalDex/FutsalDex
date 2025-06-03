
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query, where, startAfter, orderBy as firestoreOrderBy, DocumentData, QueryConstraint } from 'firebase/firestore';
import Image from 'next/image';
import { Upload, Filter, Search, Loader2, Eye, Lock, ListFilter, ChevronDown, Heart, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { CATEGORIAS_TEMATICAS_EJERCICIOS, CATEGORIAS_EDAD_EJERCICIOS, FASES_SESION, CATEGORIAS_TEMATICAS_MAP } from '@/lib/constants';


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

const ITEMS_PER_PAGE = 10;
const GUEST_ITEM_LIMIT = 10;
const ALL_PHASES_VALUE = "ALL_PHASES";
const ALL_THEMATIC_CATEGORIES_VALUE = "ALL_THEMATIC_CATEGORIES";


interface FavoriteState {
  [exerciseId: string]: boolean;
}

export default function EjerciciosPage() {
  const { user, isRegisteredUser } = useAuth();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEjercicios, setTotalEjercicios] = useState(0); // Not strictly total, but an indicator for pagination
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState(ALL_PHASES_VALUE);
  const [selectedAgeFilters, setSelectedAgeFilters] = useState<string[]>([]);
  const [thematicCategoryFilter, setThematicCategoryFilter] = useState<string>(ALL_THEMATIC_CATEGORIES_VALUE);
  const [favorites, setFavorites] = useState<FavoriteState>({});

  const uniqueAgeCategories = useMemo(() => CATEGORIAS_EDAD_EJERCICIOS, []);
  const uniqueFases = useMemo(() => FASES_SESION, []);

  const fetchEjercicios = async (page = 1, search = searchTerm, phase = phaseFilter, ages = selectedAgeFilters, thematicCategory = thematicCategoryFilter, direction: 'next' | 'prev' | 'first' = 'first') => {
    setIsLoading(true);
    try {
      const ejerciciosCollection = collection(db, 'ejercicios_futsal');
      let constraints: QueryConstraint[] = [];

      if (search) {
        constraints.push(firestoreOrderBy('ejercicio')); 
        constraints.push(where('ejercicio', '>=', search));
        constraints.push(where('ejercicio', '<=', search + '\uf8ff'));
      } else {
        constraints.push(firestoreOrderBy('ejercicio')); 
      }

      if (phase && phase !== ALL_PHASES_VALUE) {
        constraints.push(where('fase', '==', phase));
      }
      
      if (ages.length > 0) {
        constraints.push(where('edad', 'array-contains-any', ages));
      }
      
      if (thematicCategory && thematicCategory !== ALL_THEMATIC_CATEGORIES_VALUE) {
        constraints.push(where('categoria', '==', thematicCategory));
      }


      if (!isRegisteredUser) {
        constraints.push(limit(GUEST_ITEM_LIMIT));
      } else {
        constraints.push(limit(ITEMS_PER_PAGE));
        if (direction === 'next' && lastVisible && page > 1) {
          constraints.push(startAfter(lastVisible));
        }
      }
      
      const q = query(ejerciciosCollection, ...constraints);
      const documentSnapshots = await getDocs(q);

      const fetchedEjercicios = documentSnapshots.docs.map(doc => ({ 
        id: doc.id, 
        ...(doc.data() as Omit<Ejercicio, 'id'>) 
      } as Ejercicio));
      setEjercicios(fetchedEjercicios);

      if (isRegisteredUser) {
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        setTotalEjercicios(fetchedEjercicios.length < ITEMS_PER_PAGE ? (page-1)*ITEMS_PER_PAGE + fetchedEjercicios.length : page * ITEMS_PER_PAGE + 1);
      } else {
        setTotalEjercicios(fetchedEjercicios.length);
      }

    } catch (error) {
      console.error("Error fetching exercises: ", error);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    setCurrentPage(1);
    setLastVisible(null);
    fetchEjercicios(1, searchTerm, phaseFilter, selectedAgeFilters, thematicCategoryFilter, 'first');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegisteredUser, searchTerm, phaseFilter, selectedAgeFilters, thematicCategoryFilter]);


  const handleAgeCategoryChange = (ageCategory: string) => {
    setSelectedAgeFilters(prev => {
      const isSelected = prev.includes(ageCategory);
      if (isSelected) {
        return prev.filter(cat => cat !== ageCategory);
      } else {
        return [...prev, ageCategory];
      }
    });
  };

  const toggleFavorite = (exerciseId: string) => {
    if (!isRegisteredUser) return; 
    setFavorites(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const displayedEjercicios = useMemo(() => ejercicios, [ejercicios]);

  const handlePageChange = (newPage: number) => {
    if (!isRegisteredUser) return;

    if (newPage > currentPage) { 
      fetchEjercicios(newPage, searchTerm, phaseFilter, selectedAgeFilters, thematicCategoryFilter, 'next');
    } else if (newPage < currentPage && newPage > 0) { 
      fetchEjercicios(1, searchTerm, phaseFilter, selectedAgeFilters, thematicCategoryFilter, 'first');
      newPage = 1; 
    } else if (newPage === 1 && currentPage !==1 ) { 
       fetchEjercicios(1, searchTerm, phaseFilter, selectedAgeFilters, thematicCategoryFilter, 'first');
    }
    setCurrentPage(newPage);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
    }
  };

  const getAgeFilterButtonText = () => {
    if (selectedAgeFilters.length === 0) return "Todas las Edades";
    if (selectedAgeFilters.length === 1) return selectedAgeFilters[0];
    return `${selectedAgeFilters.length} edades sel.`;
  };

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Biblioteca de Ejercicios</h1>
        <p className="text-lg text-foreground/80">
          Explora nuestra colección de ejercicios de futsal.
        </p>
         <p className="text-lg text-foreground/80">
          Filtra por nombre, fase, categoría o edad.
        </p>
      </header>

      {!isRegisteredUser && (
        <Card className="mb-6 bg-accent/10 border-accent">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <Lock className="h-8 w-8 text-accent mr-4" />
              <div>
                <h3 className="text-lg font-semibold text-accent font-headline">Acceso Limitado</h3>
                <p className="text-sm text-accent/80">
                  Estás viendo una vista previa ({GUEST_ITEM_LIMIT} ejercicios). <Link href="/register" className="font-bold underline hover:text-accent">Regístrate</Link> para acceder a más de 500 ejercicios y todas las funciones.
                </p>
              </div>
            </div>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
              <Link href="/register">Registrarse Ahora</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-grow">
            <Input
              type="text"
              placeholder="Buscar ejercicio por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={phaseFilter} onValueChange={setPhaseFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar por Fase" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PHASES_VALUE}>Todas las Fases</SelectItem>
                {uniqueFases.map(fase => <SelectItem key={fase} value={fase}>{fase}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={thematicCategoryFilter} onValueChange={setThematicCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
                <ListFilter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_THEMATIC_CATEGORIES_VALUE}>Todas las Categorías</SelectItem>
                {CATEGORIAS_TEMATICAS_EJERCICIOS.map(category => (
                  <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>
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
                <DropdownMenuLabel>Selecciona Edades</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {uniqueAgeCategories.map(ageCat => (
                  <DropdownMenuCheckboxItem
                    key={ageCat}
                    checked={selectedAgeFilters.includes(ageCat)}
                    onCheckedChange={() => handleAgeCategoryChange(ageCat)}
                    onSelect={(e) => e.preventDefault()} 
                  >
                    {ageCat}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
          {isRegisteredUser && ( 
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="shrink-0 w-full md:w-auto">
                  <Upload className="mr-2 h-4 w-4" /> Subir Excel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Subir Ejercicios desde Excel</DialogTitle>
                  <DialogDescription>
                    Selecciona un archivo Excel (.xlsx o .xls) para importar ejercicios. Asegúrate de que el archivo sigue el formato especificado.
                  </DialogDescription>
                </DialogHeader>
                <Input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
                <p className="text-xs text-muted-foreground mt-2">
                  Esta funcionalidad está en desarrollo. La carga de archivos no está implementada en esta demostración.
                </p>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : displayedEjercicios.length === 0 ? (
        <p className="text-center text-lg text-muted-foreground py-10">No se encontraron ejercicios con los filtros actuales.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {displayedEjercicios.map((ej) => (
              <Card key={ej.id} className="flex flex-col overflow-hidden transition-all hover:shadow-xl bg-card">
                <div className="relative h-48 w-full">
                  <Image
                    src={ej.imagen || `https://placehold.co/400x300.png`}
                    alt={ej.ejercicio}
                    layout="fill"
                    objectFit="cover"
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
                  <CardDescription className="text-xs">
                    {ej.fase} - {Array.isArray(ej.edad) ? ej.edad.join(', ') : ej.edad} - {ej.duracion} 
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="mb-2 text-sm text-foreground/80 line-clamp-3" title={ej.descripcion}>{ej.descripcion}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2" title={ej.objetivos}><strong>Objetivos:</strong> {ej.objetivos}</p>
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
                        <DialogTitle className="text-2xl text-primary font-headline">{ej.ejercicio}</DialogTitle>
                        <div className="text-sm text-muted-foreground pt-1">
                          <p><strong className="font-semibold text-foreground/90">Fase:</strong> {ej.fase}</p>
                          <p><strong className="font-semibold text-foreground/90">Edad:</strong> {Array.isArray(ej.edad) ? ej.edad.join(', ') : ej.edad}</p>
                          <p><strong className="font-semibold text-foreground/90">Duración:</strong> {ej.duracion}</p>
                        </div>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="relative aspect-video">
                           <Image src={ej.imagen || `https://placehold.co/600x400.png`} alt={ej.ejercicio} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="futsal game"/>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Descripción</h3>
                          <p className="text-sm mb-3">{ej.descripcion}</p>
                          
                          <div>
                            <h3 className="font-semibold text-lg mb-1">Objetivos</h3>
                            {ej.objetivos && ej.objetivos.length > 0 ? (
                              <ul className="list-disc pl-5 space-y-1 text-sm mb-3">
                                {ej.objetivos.split('.')
                                  .map(obj => obj.trim())
                                  .filter(obj => obj.length > 0)
                                  .map((obj, index) => (
                                    <li key={index}>{obj}.</li>
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
                        <p><strong className="font-semibold">Categoría:</strong> {CATEGORIAS_TEMATICAS_MAP[ej.categoria] || ej.categoria}</p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>

          {isRegisteredUser && totalEjercicios > ITEMS_PER_PAGE && displayedEjercicios.length > 0 && (
             <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => { e.preventDefault(); if (currentPage > 1) handlePageChange(1);}}
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {currentPage}
                  </PaginationLink>
                </PaginationItem>

                {ejercicios.length === ITEMS_PER_PAGE && ( 
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1);}} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}

    