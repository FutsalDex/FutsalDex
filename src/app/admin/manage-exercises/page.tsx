
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, Edit, Trash2, ArrowUpDown, AlertTriangle } from "lucide-react";
import { getAdminExercises, deleteExercise, toggleExerciseVisibility } from "@/ai/flows/admin-exercise-flow";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";

// Define types based on the flow output
interface ExerciseAdmin {
  id: string;
  numero: string | null | undefined;
  ejercicio: string;
  fase: string;
  categoria: string;
  edad: string[] | string;
  isVisible: boolean;
}

type SortableField = 'numero' | 'ejercicio' | 'fase' | 'categoria' | 'edad';
type SortDirection = 'asc' | 'desc';

const PAGE_SIZE = 15;

function ManageExercisesPageContent() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [exercises, setExercises] = useState<ExerciseAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [lastDocId, setLastDocId] = useState<string | undefined>(undefined);
  const [pageDocIds, setPageDocIds] = useState<Record<number, string | undefined>>({ 1: undefined });
  
  const [sortField, setSortField] = useState<SortableField>('ejercicio');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseAdmin | null>(null);

  const fetchExercises = useCallback(async (page: number) => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const startAfter = pageDocIds[page];
      const result = await getAdminExercises({
        sortField,
        sortDirection,
        pageSize: PAGE_SIZE,
        startAfterDocId: startAfter,
      });

      setExercises(result.exercises);
      if (result.lastDocId) {
        setLastDocId(result.lastDocId);
        // Store the last doc ID for the *next* page
        setPageDocIds(prev => ({ ...prev, [page + 1]: result.lastDocId }));
      } else {
        setLastDocId(undefined); // No more pages
      }
      
    } catch (error) {
      console.error("Error fetching exercises:", error);
      toast({ title: "Error", description: "No se pudieron cargar los ejercicios.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [isAdmin, sortField, sortDirection, pageDocIds, toast]);

  useEffect(() => {
    fetchExercises(currentPage);
  }, [fetchExercises, currentPage]);
  
  // Reset pagination when sorting changes
  useEffect(() => {
    setCurrentPage(1);
    setPageDocIds({ 1: undefined });
  }, [sortField, sortDirection]);

  const handleSort = (field: SortableField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
  };
  
  const handleToggleVisibility = async (exerciseId: string, currentVisibility: boolean) => {
    setIsToggling(exerciseId);
    try {
      await toggleExerciseVisibility({ exerciseId, newVisibility: !currentVisibility });
      setExercises(prev => 
        prev.map(ex => ex.id === exerciseId ? { ...ex, isVisible: !currentVisibility } : ex)
      );
      toast({ title: "Visibilidad actualizada", description: `El ejercicio ahora está ${!currentVisibility ? 'visible' : 'oculto'}.` });
    } catch (error) {
      console.error("Error toggling visibility:", error);
      toast({ title: "Error", description: "No se pudo cambiar la visibilidad.", variant: "destructive" });
    } finally {
      setIsToggling(null);
    }
  };

  const handleDeleteClick = (exercise: ExerciseAdmin) => {
    setExerciseToDelete(exercise);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!exerciseToDelete) return;
    try {
      await deleteExercise({ exerciseId: exerciseToDelete.id });
      toast({ title: "Ejercicio Eliminado", description: `"${exerciseToDelete.ejercicio}" ha sido eliminado.` });
      // Refetch current page
      fetchExercises(currentPage);
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast({ title: "Error", description: "No se pudo eliminar el ejercicio.", variant: "destructive" });
    } finally {
      setExerciseToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const renderSortIcon = (field: SortableField) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUpDown className="ml-2 h-4 w-4" /> : <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center shadow-lg"><CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle className="text-2xl font-headline text-destructive">Acceso Denegado</CardTitle></CardHeader><CardContent><CardDescription>No tienes permisos para acceder a esta página.</CardDescription><Button asChild variant="outline" className="mt-4"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Panel</Link></Button></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-primary mb-1 font-headline">Gestionar Ejercicios</h1><p className="text-lg text-foreground/80">Edita, elimina y gestiona la visibilidad de los ejercicios.</p></div>
        <Button asChild variant="outline"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Panel</Link></Button>
      </header>
      
      <Card className="shadow-lg">
        <CardHeader><CardTitle>Listado de Ejercicios</CardTitle><CardDescription>Mostrando página {currentPage}.</CardDescription></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('numero')}>Número {renderSortIcon('numero')}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('ejercicio')}>Ejercicio {renderSortIcon('ejercicio')}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('categoria')}>Categoría {renderSortIcon('categoria')}</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort('edad')}>Edad {renderSortIcon('edad')}</TableHead>
                  <TableHead>Visible</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
                ) : exercises.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center">No se encontraron ejercicios.</TableCell></TableRow>
                ) : (
                  exercises.map(ex => (
                    <TableRow key={ex.id}>
                      <TableCell className="w-[80px]">{ex.numero || 'N/A'}</TableCell>
                      <TableCell className="font-medium max-w-[300px] truncate">{ex.ejercicio}</TableCell>
                      <TableCell>{ex.categoria}</TableCell>
                      <TableCell>{Array.isArray(ex.edad) ? ex.edad.join(', ') : ex.edad}</TableCell>
                      <TableCell>
                        {isToggling === ex.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                          <Switch
                            checked={ex.isVisible}
                            onCheckedChange={() => handleToggleVisibility(ex.id, ex.isVisible)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button asChild variant="ghost" size="icon"><Link href={`/admin/edit-exercise/${ex.id}`}><Edit className="h-4 w-4" /></Link></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(ex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      <Pagination className="mt-8">
        <PaginationContent>
          <PaginationItem><Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>Anterior</Button></PaginationItem>
          <PaginationItem><span className="p-2 text-sm">Página {currentPage}</span></PaginationItem>
          <PaginationItem><Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={!lastDocId}>Siguiente</Button></PaginationItem>
        </PaginationContent>
      </Pagination>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Confirmar eliminación?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. El ejercicio "{exerciseToDelete?.ejercicio}" se eliminará permanentemente.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction></AlertDialogFooter>
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
