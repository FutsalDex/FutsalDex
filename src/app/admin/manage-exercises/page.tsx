
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, ListChecks, Edit, Trash2, Loader2, PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation'; 
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy as firestoreOrderBy, DocumentData, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
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
import { Pagination, PaginationContent, PaginationItem, PaginationLink } from "@/components/ui/pagination";
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
  const [lastVisibleDoc, setLastVisibleDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [firstVisibleDocCurrentPage, setFirstVisibleDocCurrentPage] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [pageHistory, setPageHistory] = useState<(QueryDocumentSnapshot<DocumentData> | null)[]>([null]); // Stores first doc of each page for 'Previous'
  const [hasMore, setHasMore] = useState(false);


  const fetchEjercicios = useCallback(async (page: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    setIsLoading(true);
    try {
      const ejerciciosCollection = collection(db, "ejercicios_futsal");
      let q;
      
      const baseQuery = [firestoreOrderBy("ejercicio"), limit(ITEMS_PER_PAGE)];

      if (direction === 'first' || page === 1) {
        q = query(ejerciciosCollection, ...baseQuery);
        setPageHistory([null]); 
      } else if (direction === 'next' && lastVisibleDoc) {
        q = query(ejerciciosCollection, ...baseQuery, startAfter(lastVisibleDoc));
      } else if (direction === 'prev' && page > 0 && pageHistory[page -1]) {
         // For previous, we use the stored snapshot of the page we are going to
        const previousPageStartAfter = pageHistory[page - 1];
        if (previousPageStartAfter) {
             q = query(ejerciciosCollection, ...baseQuery, startAfter(previousPageStartAfter));
        } else { // page is 1, so no startAfter
             q = query(ejerciciosCollection, ...baseQuery);
        }
      } else { // Default to first page if logic is unclear
         q = query(ejerciciosCollection, ...baseQuery);
         setPageHistory([null]);
      }


      const querySnapshot = await getDocs(q);
      const fetchedEjercicios = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EjercicioAdmin));
      
      setEjercicios(fetchedEjercicios);

      if (querySnapshot.docs.length > 0) {
        setFirstVisibleDocCurrentPage(querySnapshot.docs[0] as QueryDocumentSnapshot<DocumentData>);
        setLastVisibleDoc(querySnapshot.docs[querySnapshot.docs.length - 1] as QueryDocumentSnapshot<DocumentData>);
        
        if (direction === 'next') {
            setPageHistory(prev => {
                const newHistory = [...prev];
                newHistory[page -1] = firstVisibleDocCurrentPage; // Store first doc of current page before moving to next
                return newHistory;
            });
        }
      } else {
        setLastVisibleDoc(null);
        setFirstVisibleDocCurrentPage(null);
      }
      
      setHasMore(fetchedEjercicios.length === ITEMS_PER_PAGE);
      setCurrentPage(page);

    } catch (error) {
      console.error("Error fetching exercises: ", error);
      toast({ title: "Error al Cargar Ejercicios", description: "No se pudieron cargar los ejercicios.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast, lastVisibleDoc, pageHistory, firstVisibleDocCurrentPage]);


  useEffect(() => {
    if (isAdmin) {
      fetchEjercicios(1, 'first');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]); // fetchEjercicios dependency removed due to useCallback, ensure it captures all needed values

  const handleNextPage = () => {
    if (hasMore) {
      fetchEjercicios(currentPage + 1, 'next');
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      // Simplified: go to page 1
      // For true previous page, more complex state needed for startAfter on previous page.
      // For now, this just fetches the "previous set" based on the lastVisibleDoc of the *previous* page,
      // which is effectively going back to the start of the previous page's data.
       const targetPage = currentPage -1;
       const startAfterDoc = pageHistory[targetPage -1]; // pageHistory is 0-indexed for pages 1...N

       const qConstraints = [firestoreOrderBy("ejercicio"), limit(ITEMS_PER_PAGE)];
       if(startAfterDoc) {
           qConstraints.push(startAfter(startAfterDoc));
       }
       const q = query(collection(db, "ejercicios_futsal"), ...qConstraints);
       
       setIsLoading(true);
       getDocs(q).then(querySnapshot => {
           const fetchedEjercicios = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as EjercicioAdmin));
           setEjercicios(fetchedEjercicios);
           if (querySnapshot.docs.length > 0) {
               setFirstVisibleDocCurrentPage(querySnapshot.docs[0] as QueryDocumentSnapshot<DocumentData>);
               setLastVisibleDoc(querySnapshot.docs[querySnapshot.docs.length - 1] as QueryDocumentSnapshot<DocumentData>);
           }
           setHasMore(fetchedEjercicios.length === ITEMS_PER_PAGE);
           setCurrentPage(targetPage);
           setIsLoading(false);
       }).catch(error => {
           console.error("Error fetching previous page:", error);
           toast({ title: "Error", description: "No se pudo cargar la página anterior.", variant: "destructive" });
           setIsLoading(false);
       });
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
      // Refetch current page or the first page if the current page becomes empty
      fetchEjercicios(ejercicios.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage, 'first');
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

  if (!isAdmin && !isLoading) { // ensure loading is false before redirecting
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
  
  if (isLoading && ejercicios.length === 0) { // Show full page loader only on initial load
     return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


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
          <CardTitle className="font-headline text-xl flex items-center">
            <ListChecks className="mr-2 h-5 w-5 text-primary" />
            Listado de Ejercicios
          </CardTitle>
          {isLoading && ejercicios.length > 0 && <CardDescription>Actualizando ejercicios...</CardDescription>}
        </CardHeader>
        <CardContent>
          {isLoading && ejercicios.length === 0 ? ( // This case is handled by the full page loader now
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !isLoading && ejercicios.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No hay ejercicios en la biblioteca. <Link href="/admin/add-exercise" className="text-primary hover:underline">Añade el primero</Link>.</p>
          ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Número</TableHead>
                  <TableHead>Ejercicio</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Edad</TableHead>
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
                  <PaginationItem className="font-medium text-sm px-3">
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


    