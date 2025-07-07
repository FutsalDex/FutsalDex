
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

const PAGE_SIZE = 12; // Adjusted for a card layout (3 or 4 per row)

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
        // This is the key change: only update state if the value is new to prevent infinite loops
        setPageDocIds(prev => {
          if (prev[page + 1] === result.lastDocId) {
            return prev;
          }
          return { ...prev, [page + 1]: result.lastDocId };
        });
      } else {
        setLastDocId(undefined);
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
      fetchExercises(currentPage);
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast({ title: "Error", description: "No se pudo eliminar el ejercicio.", variant: "destructive" });
    } finally {
      setExerciseToDelete(null);
      setIsDeleteDialogOpen(false);
    }
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
      <header className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Gestionar Ejercicios</h1>
          <p className="text-lg text-foreground/80">Edita, elimina y gestiona la visibilidad de los ejercicios.</p>
        </div>
        <div className="flex w-full md:w-auto items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1 md:flex-none">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        Ordenar por: {sortField} ({sortDirection === 'asc' ? 'Asc' : 'Desc'})
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {(['numero', 'ejercicio', 'categoria', 'edad', 'fase'] as SortableField[]).map((field) => (
                        <DropdownMenuItem key={field} onClick={() => handleSort(field)}>
                            {field.charAt(0).toUpperCase() + field.slice(1)}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <Button asChild variant="outline" className="flex-1 md:flex-none">
                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Panel</Link>
            </Button>
        </div>
      </header>
      
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            </div>
        ) : exercises.length === 0 ? (
            <Card className="shadow-lg">
                <CardContent className="p-10 text-center text-muted-foreground">
                    No se encontraron ejercicios.
                </CardContent>
            </Card>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {exercises.map(ex => (
                    <Card key={ex.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold text-primary font-headline truncate" title={ex.ejercicio}>
                        {ex.ejercicio}
                        </CardTitle>
                        <CardDescription>
                        Número: {ex.numero || 'N/A'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary">{ex.categoria}</Badge>
                          <Badge variant="outline">{ex.fase}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                        <strong>Edad:</strong> {Array.isArray(ex.edad) ? ex.edad.join(', ') : ex.edad}
                        </p>
                        <div className="flex items-center justify-between rounded-lg border p-3">
                            <label htmlFor={`switch-${ex.id}`} className="text-sm font-medium pr-2">Visible</label>
                            {isToggling === ex.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Switch
                                id={`switch-${ex.id}`}
                                checked={ex.isVisible}
                                onCheckedChange={() => handleToggleVisibility(ex.id, ex.isVisible)}
                                />
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2 border-t pt-4">
                        <Button asChild variant="ghost" size="icon" title="Editar">
                        <Link href={`/admin/edit-exercise/${ex.id}`}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                        </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(ex)} title="Eliminar">
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Eliminar</span>
                        </Button>
                    </CardFooter>
                    </Card>
                ))}
            </div>
        )}
      
      {exercises.length > 0 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem><Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || isLoading}>Anterior</Button></PaginationItem>
              <PaginationItem><span className="p-2 text-sm">Página {currentPage}</span></PaginationItem>
              <PaginationItem><Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={!lastDocId || isLoading}>Siguiente</Button></PaginationItem>
            </PaginationContent>
          </Pagination>
      )}
      
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
