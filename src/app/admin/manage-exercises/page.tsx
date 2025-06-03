
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, ListChecks, Edit, Trash2, Loader2, PlusCircle, ChevronLeft, ChevronRight, ArrowDownUp, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation'; 
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy as firestoreOrderBy, DocumentData, limit, startAfter, QueryDocumentSnapshot, getCountFromServer, QueryConstraint } from 'firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination"; 
import { useToast } from "@/hooks/use-toast";
import { CATEGORIAS_TEMATICAS_MAP } from "@/lib/constants";

interface EjercicioAdmin {
  id: string;
  numero?: string;
  ejercicio: string;
  fase: string;
  categoria: string; 
  edad: string[] | string; 
}

const ITEMS_PER_PAGE = 20;
type SortableField = 'numero' | 'ejercicio' | 'fase' | 'categoria' | 'edad'; 
type SortDirection = 'asc' | 'desc';

function ManageExercisesPageContent() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter(); 
  const [ejercicios, setEjercicios] = useState<EjercicioAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [exerciseToDeleteId, setExerciseToDeleteId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalExercisesInDB, setTotalExercisesInDB] = useState(0);
  const [pageDocSnapshots, setPageDocSnapshots] = useState<{
    first: (QueryDocumentSnapshot<DocumentData> | null)[];
    last: (QueryDocumentSnapshot<DocumentData> | null)[];
  }>({ first: [null], last: [] }); 
  const [hasMore, setHasMore] = useState(false);

  const [sortField, setSortField] = useState<SortableField>('ejercicio');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const fetchTotalCount = useCallback(async () => {
    try {
      const countQuery = query(collection(db, "ejercicios_futsal"));
      const snapshot = await getCountFromServer(countQuery);
      setTotalExercisesInDB(snapshot.data().count);
    } catch (error) {
      console.error("Error fetching total exercise count: ", error);
      toast({ title: "Error", description: "No se pudo obtener el número total de ejercicios.", variant: "destructive" });
    }
  }, [toast]);

  const fetchEjercicios = useCallback(async (newPage: number, currentSortField: SortableField, currentSortDirection: SortDirection) => {
    setIsLoading(true);
    try {
      const ejerciciosCollection = collection(db, "ejercicios_futsal");
      
      const qConstraints: QueryConstraint[] = [
        firestoreOrderBy(currentSortField, currentSortDirection),
        limit(ITEMS_PER_PAGE)
      ];

      if (newPage > 1 && pageDocSnapshots.last[newPage - 2]) { 
        qConstraints.push(startAfter(pageDocSnapshots.last[newPage - 2]!));
      }
      
      const q = query(ejerciciosCollection, ...qConstraints);
      const querySnapshot = await getDocs(q);
      let fetchedEjercicios = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EjercicioAdmin));
      
      // Aplicar ordenación natural en el cliente SI se está ordenando por 'numero'
      if (currentSortField === 'numero' && fetchedEjercicios.length > 0) {
        fetchedEjercicios.sort((a, b) => {
          const numA = a.numero || ""; // Tratar undefined/null como string vacío
          const numB = b.numero || "";
          // localeCompare con numeric: true maneja la ordenación natural
          return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
        });
        if (currentSortDirection === 'desc') {
          fetchedEjercicios.reverse();
        }
      }
      
      setEjercicios(fetchedEjercicios);

      if (querySnapshot.docs.length > 0) {
        const firstDoc = querySnapshot.docs[0] as QueryDocumentSnapshot<DocumentData>;
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] as QueryDocumentSnapshot<DocumentData>;

        setPageDocSnapshots(prev => {
          const newFirst = [...prev.first];
          const newLast = [...prev.last];
          newFirst[newPage - 1] = firstDoc; 
          newLast[newPage - 1] = lastDoc;   
          return { first: newFirst, last: newLast };
        });
      } 
      
      setHasMore(fetchedEjercicios.length === ITEMS_PER_PAGE);
      setCurrentPage(newPage);

    } catch (error: any) {
      console.error("Error fetching exercises: ", error);
      if (error.code === 'failed-precondition') {
        toast({
          title: "Índice Requerido por Firestore",
          description: (
            <div className="text-sm">
              <p>La combinación actual de ordenación y/o filtros necesita un índice compuesto en Firestore que no existe.</p>
              <p className="mt-1">Por favor, abre la consola de desarrollador del navegador (F12), busca el mensaje de error completo de Firebase y haz clic en el enlace que proporciona para crear el índice automáticamente.</p>
              <p className="mt-2 text-xs">Ejemplo del mensaje de Firebase: "The query requires an index. You can create it here: [enlace]"</p>
            </div>
          ),
          variant: "destructive",
          duration: 30000,
        });
      } else {
        toast({ title: "Error al Cargar Ejercicios", description: "No se pudieron cargar los ejercicios. " + error.message, variant: "destructive" });
      }
    }
    setIsLoading(false);
  }, [toast, pageDocSnapshots.last]); 

  useEffect(() => {
    if (isAdmin) {
      fetchTotalCount();
      setPageDocSnapshots({ first: [null], last: [] });
      setCurrentPage(1); 
      fetchEjercicios(1, sortField, sortDirection);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, sortField, sortDirection, fetchTotalCount]);


  const handleSort = (field: SortableField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };
  
  const renderSortIcon = (field: SortableField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return <ArrowDownUp className="ml-1 h-3 w-3 opacity-30" />;
  };

  const handleNextPage = () => {
    if (hasMore && !isLoading) {
      fetchEjercicios(currentPage + 1, sortField, sortDirection);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1 && !isLoading) {
      fetchEjercicios(currentPage - 1, sortField, sortDirection);
    }
  };

  const handleDeleteClick = (id: string) => {
    setExerciseToDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!exerciseToDeleteId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "ejercicios_futsal", exerciseToDeleteId));
      toast({ title: "Ejercicio Eliminado", description: "El ejercicio ha sido eliminado correctamente." });
      fetchTotalCount(); 
      const newCurrentPage = (ejercicios.length === 1 && currentPage > 1) ? currentPage - 1 : currentPage;
      
      setPageDocSnapshots({ first: [null], last: [] }); 
      fetchEjercicios(newCurrentPage, sortField, sortDirection);

    } catch (error) {
      console.error("Error deleting exercise: ", error);
      toast({ title: "Error al Eliminar", description: "No se pudo eliminar el ejercicio.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setExerciseToDeleteId(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleModifyClick = (id: string) => {
    router.push(`/admin/edit-exercise/${id}`); 
  };
  
  const formatEdad = (edad: string[] | string) => {
    if (Array.isArray(edad)) {
      return edad.join(', ');
    }
    return edad;
  };

  if (!isAdmin && !isLoading) { 
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-2xl font-headline text-destructive">Acceso Denegado</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              No tienes permisos para acceder a esta página. Esta sección es solo para administradores.
            </CardDescription>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel de Admin
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (isLoading && ejercicios.length === 0 && totalExercisesInDB === 0 && currentPage === 1) { 
     return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const startIndex = totalExercisesInDB > 0 && ejercicios.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0;
  const endIndex = totalExercisesInDB > 0 && ejercicios.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + ejercicios.length : 0;


  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Gestionar Ejercicios</h1>
          <p className="text-lg text-foreground/80">
            Visualiza, modifica o elimina ejercicios existentes en la biblioteca.
          </p>
        </div>
        <div className="flex gap-2">
            <Button asChild>
              <Link href="/admin/add-exercise">
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Ejercicio
              </Link>
            </Button>
            <Button asChild variant="outline">
            <Link href="/admin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al Panel
            </Link>
            </Button>
        </div>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl flex items-center">
              <ListChecks className="mr-2 h-5 w-5 text-primary" />
              Listado de Ejercicios
            </CardTitle>
            {totalExercisesInDB > 0 && (
              <p className="text-sm text-muted-foreground">
                Mostrando {ejercicios.length > 0 ? `${startIndex}-${endIndex}` : '0'} de {totalExercisesInDB}
              </p>
            )}
          </div>
           {isLoading && <CardDescription>Actualizando ejercicios...</CardDescription>}
        </CardHeader>
        <CardContent>
          {isLoading && ejercicios.length === 0 && totalExercisesInDB > 0 && currentPage > 1 ? ( 
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !isLoading && ejercicios.length === 0 && totalExercisesInDB === 0 && currentPage === 1 ? (
            <p className="text-muted-foreground text-center py-10">No hay ejercicios en la biblioteca. <Link href="/admin/add-exercise" className="text-primary hover:underline">Añade el primero</Link>.</p>
          ) : !isLoading && ejercicios.length === 0 && totalExercisesInDB > 0 ? (
             <p className="text-muted-foreground text-center py-10">No hay ejercicios que coincidan con la página actual o filtros.</p>
          ): (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('numero')}>
                    <span className="flex items-center">Número {renderSortIcon('numero')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('ejercicio')}>
                    <span className="flex items-center">Ejercicio {renderSortIcon('ejercicio')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('fase')}>
                     <span className="flex items-center">Fase {renderSortIcon('fase')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('categoria')}>
                    <span className="flex items-center">Categoría {renderSortIcon('categoria')}</span>
                  </TableHead>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('edad')}>
                    <span className="flex items-center">Edad {renderSortIcon('edad')}</span>
                  </TableHead>
                  <TableHead className="text-right w-[150px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ejercicios.map((ej) => (
                  <TableRow key={ej.id}>
                    <TableCell className="font-medium">{ej.numero || "N/A"}</TableCell>
                    <TableCell>{ej.ejercicio}</TableCell>
                    <TableCell>{ej.fase}</TableCell>
                    <TableCell>{CATEGORIAS_TEMATICAS_MAP[ej.categoria] || ej.categoria}</TableCell>
                    <TableCell>{formatEdad(ej.edad)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleModifyClick(ej.id)} className="hover:text-blue-600" title="Modificar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(ej.id)} className="hover:text-destructive" title="Eliminar">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             <Pagination className="mt-8">
                <PaginationContent>
                  <PaginationItem>
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handlePreviousPage} 
                        disabled={currentPage === 1 || isLoading}
                        aria-label="Página anterior"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                    </Button>
                  </PaginationItem>
                  <PaginationItem className="font-medium text-sm px-3 text-muted-foreground">
                    Página {currentPage}
                  </PaginationItem>
                  <PaginationItem>
                     <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleNextPage} 
                        disabled={!hasMore || isLoading}
                        aria-label="Página siguiente"
                    >
                        Siguiente
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro que quieres eliminar, permanentemente, este ejercicio?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setExerciseToDeleteId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ManageExercisesPage() {
  return (
    <AuthGuard>
      <ManageExercisesPageContent />
    </AuthGuard>
  );
}
    

