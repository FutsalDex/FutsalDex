
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, getDocs, limit, query, where, startAfter, orderBy as firestoreOrderBy, DocumentData, QueryConstraint } from 'firebase/firestore';
import Image from 'next/image';
import { Upload, Filter, Search, Loader2, Eye, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Link from 'next/link';

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
  consejos_entrenador: string;
  imagen: string;
}

const ITEMS_PER_PAGE = 10;
const GUEST_ITEM_LIMIT = 5;
const ALL_PHASES_VALUE = "ALL_PHASES";
const ALL_AGES_VALUE = "ALL_AGES";

export default function EjerciciosPage() {
  const { user, isRegisteredUser } = useAuth();
  const [ejercicios, setEjercicios] = useState<Ejercicio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEjercicios, setTotalEjercicios] = useState(0); // For registered users
  const [lastVisible, setLastVisible] = useState<DocumentData | null>(null);
  const [firstVisible, setFirstVisible] = useState<DocumentData | null>(null);
  const [pageHistory, setPageHistory] = useState<(DocumentData | null)[]>([null]);


  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(''); // Example: 'Defensa', 'Ataque'
  const [ageFilter, setAgeFilter] = useState(''); // Example: 'U10', 'Senior'

  const uniqueAgeCategories = useMemo(() => {
    // In a real app, these would likely come from Firestore or a predefined list
    return ["Benjamín (U8-U9)", "Alevín (U10-U11)", "Infantil (U12-U13)", "Cadete (U14-U15)", "Juvenil (U16-U18)", "Senior"];
  }, []);
  
  const uniqueFases = useMemo(() => {
     return ["Calentamiento", "Principal", "Vuelta a la calma"];
  }, []);


  const fetchEjercicios = async (page = 1, search = searchTerm, category = categoryFilter, age = ageFilter, direction: 'next' | 'prev' | 'first' = 'first') => {
    setIsLoading(true);
    try {
      const ejerciciosCollection = collection(db, 'ejercicios_futsal');
      const constraints: QueryConstraint[] = [];

      if (search) {
        // Firestore doesn't support full-text search natively.
        // This is a basic prefix match on 'ejercicio'. For better search, use a dedicated search service.
        constraints.push(where('ejercicio', '>=', search));
        constraints.push(where('ejercicio', '<=', search + '\uf8ff'));
      }
      if (category && category !== ALL_PHASES_VALUE) { 
        constraints.push(where('fase', '==', category));
      }
      if (age && age !== ALL_AGES_VALUE) {
        constraints.push(where('categoria_edad', '==', age));
      }

      constraints.push(firestoreOrderBy('ejercicio')); // Default order by name

      if (!isRegisteredUser) {
        constraints.push(limit(GUEST_ITEM_LIMIT));
      } else {
        constraints.push(limit(ITEMS_PER_PAGE));
        if (direction === 'next' && lastVisible) {
          constraints.push(startAfter(lastVisible));
        } else if (direction === 'prev' && page > 1 && pageHistory[page-1]) {
           // This is tricky with startAfter, Firestore SDK doesn't have endBefore for web.
           // For simplicity, prev will refetch up to that point. 
           // Proper pagination requires more complex cursor management or offset-based (if small dataset)
           // For now, 'prev' will reset and fetch first page of previous set for simplicity.
           // This is a simplification and not true "previous page" functionality with cursors.
           // A full solution would require storing cursors for each page or using a library.
           // For this example, 'prev' is not fully implemented with cursors due to Firestore SDK limitations.
           // We will manage this by refetching or disabling prev for now.
           // For now, we will only implement next and first page.
        }
      }
      
      const q = query(ejerciciosCollection, ...constraints);
      const documentSnapshots = await getDocs(q);
      
      const fetchedEjercicios = documentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ejercicio));
      setEjercicios(fetchedEjercicios);

      if (isRegisteredUser) {
        setLastVisible(documentSnapshots.docs[documentSnapshots.docs.length - 1]);
        setFirstVisible(documentSnapshots.docs[0]);
        if (direction === 'first') {
          setPageHistory([null, documentSnapshots.docs[documentSnapshots.docs.length - 1]]);
        } else if (direction === 'next') {
          setPageHistory(prev => [...prev, documentSnapshots.docs[documentSnapshots.docs.length - 1]]);
        }
        // Total count is hard with Firestore pagination without reading all docs.
        // For simplicity, we'll assume there's always a "next" page unless fewer than ITEMS_PER_PAGE are returned.
        setTotalEjercicios(fetchedEjercicios.length < ITEMS_PER_PAGE ? (page-1)*ITEMS_PER_PAGE + fetchedEjercicios.length : page * ITEMS_PER_PAGE + 1); // Heuristic
      } else {
        setTotalEjercicios(fetchedEjercicios.length);
      }

    } catch (error) {
      console.error("Error fetching exercises: ", error);
      // Add toast notification for error
    }
    setIsLoading(false);
  };
  
  useEffect(() => {
    fetchEjercicios(currentPage, searchTerm, categoryFilter, ageFilter, 'first');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRegisteredUser, searchTerm, categoryFilter, ageFilter]); // Re-fetch when auth status or filters change

  const handlePageChange = (newPage: number) => {
    if (newPage > currentPage) { // Next
      setCurrentPage(newPage);
      fetchEjercicios(newPage, searchTerm, categoryFilter, ageFilter, 'next');
    } else if (newPage < currentPage && newPage > 0) { // Previous - simplified
      setCurrentPage(newPage);
      // For prev, we reset to fetch from start up to the newPage * ITEMS_PER_PAGE
      // This is not ideal but works for a basic implementation
      // This requires a more complex query structure to fetch the actual previous page using cursors
      // For now, previous button will go to page 1 as a simplification.
      fetchEjercicios(newPage, searchTerm, categoryFilter, ageFilter, 'first'); 
      // Resetting history, will only work for going to page 1
      setPageHistory([null]); 
    } else if (newPage === 1) {
      setCurrentPage(1);
      fetchEjercicios(1, searchTerm, categoryFilter, ageFilter, 'first');
      setPageHistory([null]);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Placeholder for Excel file processing logic
      console.log("File selected:", file.name);
      // Add toast: "Subida de Excel no implementada en esta demo."
    }
  };

  const totalPages = isRegisteredUser ? Math.ceil(totalEjercicios / ITEMS_PER_PAGE) : 1;

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Biblioteca de Ejercicios</h1>
        <p className="text-lg text-foreground/80">
          Explora nuestra colección de ejercicios de futsal. Filtra por nombre, fase o categoría de edad.
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
                  Estás viendo una vista previa. <Link href="/register" className="font-bold underline hover:text-accent">Regístrate</Link> para acceder a más de 500 ejercicios y todas las funciones.
                </p>
              </div>
            </div>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
              <Link href="/register">Registrarse Ahora</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
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
        <div className="flex gap-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por Fase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PHASES_VALUE}>Todas las Fases</SelectItem>
              {uniqueFases.map(fase => <SelectItem key={fase} value={fase}>{fase}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="w-full md:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoría de Edad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_AGES_VALUE}>Todas las Edades</SelectItem>
              {uniqueAgeCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {isRegisteredUser && (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="shrink-0">
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

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      ) : ejercicios.length === 0 ? (
        <p className="text-center text-lg text-muted-foreground py-10">No se encontraron ejercicios con los filtros actuales.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {ejercicios.map((ej) => (
              <Card key={ej.id} className="flex flex-col overflow-hidden transition-all hover:shadow-xl">
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
                        <p><strong>Consejos del Entrenador:</strong> {ej.consejos_entrenador}</p>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardFooter>
              </Card>
            ))}
          </div>

          {isRegisteredUser && totalPages > 1 && (
             <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => { e.preventDefault(); if (currentPage > 1) handlePageChange(1);}} // Simplified: go to page 1
                    className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>
                    {currentPage}
                  </PaginationLink>
                </PaginationItem>
                {/* Basic next/prev for now - full pagination numbers can be complex with cursors */}
                {ejercicios.length === ITEMS_PER_PAGE && ( // Heuristic for "has more pages"
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
