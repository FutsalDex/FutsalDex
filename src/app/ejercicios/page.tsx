
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
import { Upload, Filter, Search, Loader2, Eye, Lock, ListFilter, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Ejercicio {
  id: string;
  numero: string;
  ejercicio: string;
  descripcion: string;
  objetivos: string;
  espacio_materiales: string;
  jugadores: string;
  duracion: string;
  variantes: string;
  fase: string;
  categoria_edad: string;
  imagen: string;
  consejos_entrenador?: string; // Added optional for safety
}

const ITEMS_PER_PAGE = 10;
const GUEST_ITEM_LIMIT = 10;
const ALL_PHASES_VALUE = "ALL_PHASES";


const THEMATIC_CATEGORIES = [
  { id: "tecnica", label: "Técnica" },
  { id: "tactica", label: "Táctica" },
  { id: "fisico", label: "Preparación Física" },
  { id: "estrategia", label: "Estrategia (ABP)" },
  { id: "porteros", label: "Porteros" },
];

export default function EjerciciosPage() {
  const { user, isRegisteredUser } = useAuth();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEjercicios, setTotalEjercicios] = useState(0);
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [phaseFilter, setPhaseFilter] = useState(ALL_PHASES_VALUE);
  const [selectedAgeFilters, setSelectedAgeFilters] = useState<string[]>([]);
  const [selectedThematicCategories, setSelectedThematicCategories] = useState<string[]>([]);

  const uniqueAgeCategories = useMemo(() => {
    return [
      "Benjamín (8-9 años)", 
      "Alevín (10-11 años)", 
      "Infantil (12-13 años)", 
      "Cadete (14-15 años)", 
      "Juvenil (16-18 años)", 
      "Senior (+18 años)"
    ];
  }, []);
  
  const uniqueFases = useMemo(() => {
     return ["Calentamiento", "Principal", "Vuelta a la calma"];
  }, []);

  const fetchEjercicios = async (page = 1, search = searchTerm, phase = phaseFilter, ages = selectedAgeFilters, direction: 'next' | 'prev' | 'first' = 'first') => {
    setIsLoading(true);
    try {
      const ejerciciosCollection = collection(db, 'ejercicios_futsal');
      const constraints: QueryConstraint[] = [];

      if (search) {
        // Basic prefix search, might need more sophisticated search for production
        constraints.push(where('ejercicio', '>=', search));
        constraints.push(where('ejercicio', '<=', search + '\uf8ff'));
      }
      if (phase && phase !== ALL_PHASES_VALUE) { 
        constraints.push(where('fase', '==', phase));
      }
      if (ages.length > 0) {
        constraints.push(where('categoria_edad', 'in', ages));
      }

      constraints.push(firestoreOrderBy('ejercicio')); 

      if (!isRegisteredUser) {
        constraints.push(limit(GUEST_ITEM_LIMIT));
      } else {
        constraints.push(limit(ITEMS_PER_PAGE));
        if (direction === 'next' && lastVisible) {
          constraints.push(startAfter(lastVisible));
        }
      }
      
      const q = query(ejerciciosCollection, ...constraints);
      const documentSnapshots = await getDocs(q);
      
      const fetchedEjercicios = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ejercicio));
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
    fetchEjercicios(1, searchTerm, phaseFilter, selectedAgeFilters, 'first');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegisteredUser, searchTerm, phaseFilter, selectedAgeFilters]); 

  const handleThematicCategoryChange = (categoryId: string) => {
    setSelectedThematicCategories(prev => {
      const isSelected = prev.includes(categoryId);
      if (isSelected) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };
  
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


  const displayedEjercicios = useMemo(() => {
    if (selectedThematicCategories.length === 0) {
      return ejercicios;
    }
    return ejercicios.filter(exercise => {
      return selectedThematicCategories.some(catId => {
        const categoryObj = THEMATIC_CATEGORIES.find(c => c.id === catId);
        if (!categoryObj) return false;
        const searchKeyword = categoryObj.label.toLowerCase().split(" ")[0]; 
        const exerciseText = `${exercise.ejercicio} ${exercise.descripcion} ${exercise.objetivos}`.toLowerCase();
        return exerciseText.includes(searchKeyword);
      });
    });
  }, [ejercicios, selectedThematicCategories]);


  const handlePageChange = (newPage: number) => {
    if (newPage > currentPage) { 
      setCurrentPage(newPage);
      fetchEjercicios(newPage, searchTerm, phaseFilter, selectedAgeFilters, 'next');
    } else if (newPage < currentPage && newPage > 0) { 
      setCurrentPage(1); 
      fetchEjercicios(1, searchTerm, phaseFilter, selectedAgeFilters, 'first'); 
    } else if (newPage === 1) {
      setCurrentPage(1);
      fetchEjercicios(1, searchTerm, phaseFilter, selectedAgeFilters, 'first');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
    }
  };

  const getAgeFilterButtonText = () => {
    if (selectedAgeFilters.length === 0) return "Categoría de Edad";
    if (selectedAgeFilters.length === 1) return selectedAgeFilters[0];
    return `${selectedAgeFilters.length} edades sel.`;
  };

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Biblioteca de Ejercicios</h1>
        <p className="text-lg text-foreground/80">
          Explora nuestra colección de ejercicios de futsal. Filtra por nombre, fase, categoría o edad.
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
        
        <div>
          <Label className="text-md font-semibold flex items-center mb-2">
            <ListFilter className="h-4 w-4 mr-2" />
            Filtrar por Categoría Temática
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2 p-4 border rounded-md bg-card">
            {THEMATIC_CATEGORIES.map((category) => (
              <div key={category.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`thematic-cat-${category.id}`}
                  checked={selectedThematicCategories.includes(category.id)}
                  onCheckedChange={() => handleThematicCategoryChange(category.id)}
                />
                <Label htmlFor={`thematic-cat-${category.id}`} className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {category.label}
                </Label>
              </div>
            ))}
          </div>
           <p className="text-xs text-muted-foreground mt-1">
              Nota: El filtrado por categoría temática busca palabras clave en los detalles del ejercicio.
           </p>
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
                </div>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-primary font-headline truncate" title={ej.ejercicio}>{ej.ejercicio}</CardTitle>
                  <CardDescription className="text-xs">
                    {ej.fase} - {ej.categoria_edad} - {ej.duracion} min
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
                        <DialogDescription>{ej.fase} - {ej.categoria_edad} - {ej.duracion} min</DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="relative aspect-video">
                           <Image src={ej.imagen || `https://placehold.co/600x400.png`} alt={ej.ejercicio} layout="fill" objectFit="cover" className="rounded-md" data-ai-hint="futsal game"/>
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Descripción</h3>
                          <p className="text-sm mb-3">{ej.descripcion}</p>
                          <h3 className="font-semibold text-lg mb-1">Objetivos</h3>
                          <p className="text-sm mb-3">{ej.objetivos}</p>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <p><strong>Materiales y Espacio:</strong> {ej.espacio_materiales}</p>
                        <p><strong>Nº Jugadores:</strong> {ej.jugadores}</p>
                        <p><strong>Variantes:</strong> {ej.variantes}</p>
                        <p><strong>Consejos del Entrenador:</strong> {ej.consejos_entrenador || 'No disponibles.'}</p>
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

