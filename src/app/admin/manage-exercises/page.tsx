
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
import { Loader2, ArrowLeft, Edit, Trash2, ArrowUpDown, AlertTriangle, ListFilter } from "lucide-react";
import { getAdminExercises, deleteExercise, toggleExerciseVisibility } from "@/ai/flows/admin-exercise-flow";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";


// Define types based on the flow output
interface ExerciseAdmin {
  id: string;
  numero: string | null | undefined;
  ejercicio: string;
  fase: string;
  categoria: string;
  edad: string[] | string;
  isVisible: boolean;
  imagen?: string | null;
}

type SortableField = 'numero' | 'ejercicio' | 'fase' | 'categoria' | 'edad';
type SortDirection = 'asc' | 'desc';
type VisibilityFilter = 'all' | 'visible' | 'hidden';

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
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');

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
        visibility: visibilityFilter, // Pass the visibility filter
      });

      setExercises(result.exercises);
      if (result.lastDocId) {
        setLastDocId(result.lastDocId);
        setPageDocIds(prev => {
          if (prev[page + 1] === result.lastDocId) return prev;
          return { ...prev, [page + 1]: result.lastDocId };
        });
      } else {
        setLastDocId(undefined);
      }
      
    } catch (error: any) {
      console.error("Error fetching exercises:", error);
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        toast({
          title: "Índice de Firestore Requerido",
          description: "Esta combinación de filtros y ordenación requiere un nuevo índice en la base de datos. Por favor, crea el índice desde el enlace que aparece en la consola de errores del navegador.",
          variant: "destructive",
          duration: 20000,
        });
      } else {
        toast({ title: "Error", description: "No se pudieron cargar los ejercicios.", variant: "destructive" });
      }
    }
    setIsLoading(false);
  }, [isAdmin, sortField, sortDirection, pageDocIds, toast, visibilityFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setPageDocIds({ 1: undefined });
    // Fetch will be triggered by the dependency change in the next effect
  }, [sortField, sortDirection, visibilityFilter]);

  useEffect(() => {
      fetchExercises(currentPage);
  }, [fetchExercises, currentPage]);
  
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
  
  const getSortIcon = (field: SortableField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-2 opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUpDown className="h-4 w-4 ml-2" /> : <ArrowUpDown className="h-4 w-4 ml-2" />;
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
            <Button asChild variant="outline" className="flex-1 md:flex-none">
                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Panel</Link>
            </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <CardTitle>Listado de Ejercicios</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 <Select value={visibilityFilter} onValueChange={(v) => setVisibilityFilter(v as VisibilityFilter)}>
                      <SelectTrigger className="w-full sm:w-[150px]">
                          <ListFilter className="mr-2 h-4 w-4" />
                          <SelectValue placeholder="Visibilidad" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="visible">Visibles</SelectItem>
                          <SelectItem value="hidden">Ocultos</SelectItem>
                      </SelectContent>
                  </Select>
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full sm:w-auto">
                              <ArrowUpDown className="mr-2 h-4 w-4" />
                              Ordenar por: {sortField}
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
              </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px] cursor-pointer" onClick={() => handleSort('numero')}>Nº {getSortIcon('numero')}</TableHead>
                            <TableHead className="w-[80px]">Imagen</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('ejercicio')}>Ejercicio {getSortIcon('ejercicio')}</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => handleSort('categoria')}>Categoría {getSortIcon('categoria')}</TableHead>
                            <TableHead>Edad</TableHead>
                            <TableHead className="w-[120px] text-center">Visible</TableHead>
                            <TableHead className="w-[100px] text-center">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={7} className="h-64 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
                        ) : exercises.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="h-64 text-center">No se encontraron ejercicios con los filtros actuales.</TableCell></TableRow>
                        ) : (
                            exercises.map(ex => (
                                <TableRow key={ex.id}>
                                    <TableCell>{ex.numero || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Image
                                            src={ex.imagen || 'https://placehold.co/64x48.png'}
                                            alt={`Imagen de ${ex.ejercicio}`}
                                            width={64}
                                            height={48}
                                            className="object-cover rounded-md"
                                            data-ai-hint="futsal drill"
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">{ex.ejercicio}</TableCell>
                                    <TableCell><Badge variant="secondary">{ex.categoria}</Badge></TableCell>
                                    <TableCell className="text-xs">{Array.isArray(ex.edad) ? ex.edad.join(', ') : ex.edad}</TableCell>
                                    <TableCell className="text-center">
                                         {isToggling === ex.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                        ) : (
                                            <Switch
                                            id={`switch-${ex.id}`}
                                            checked={ex.isVisible}
                                            onCheckedChange={() => handleToggleVisibility(ex.id, ex.isVisible)}
                                            aria-label={ex.isVisible ? "Marcar como no visible" : "Marcar como visible"}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center space-x-2">
                                        <Button asChild variant="ghost" size="icon" title="Editar">
                                            <Link href={`/admin/edit-exercise/${ex.id}`}><Edit className="h-4 w-4" /></Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(ex)} title="Eliminar">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
         {exercises.length > 0 && (
          <CardFooter className="justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem><Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || isLoading}>Anterior</Button></PaginationItem>
                  <PaginationItem><span className="p-2 text-sm">Página {currentPage}</span></PaginationItem>
                  <PaginationItem><Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={!lastDocId || isLoading}>Siguiente</Button></PaginationItem>
                </PaginationContent>
              </Pagination>
          </CardFooter>
      )}
      </Card>
      
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
