
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, Edit, Trash2, ArrowUpDown, AlertTriangle, ListFilter, Search, Image as ImageIcon, EyeOff, ImageOff } from "lucide-react";
import { getAdminExercises, deleteExercise, toggleExerciseVisibility, setAllExercisesVisibility, deleteExercisesWithoutImages } from "@/lib/actions/admin-exercise-actions";
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
  
  // Server-side state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const [sortField, setSortField] = useState<SortableField>('ejercicio');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  
  // Pagination cursors - Use useRef to avoid re-render loops
  const pageCursors = useRef<Record<number, string | null>>({ 1: null });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseAdmin | null>(null);

  const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const [isDeleteNoImageDialogOpen, setIsDeleteNoImageDialogOpen] = useState(false);
  const [isDeletingNoImage, setIsDeletingNoImage] = useState(false);


  // Debounce search term to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchExercises = useCallback(async (page: number) => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const result = await getAdminExercises({
        visibility: visibilityFilter,
        sortField: debouncedSearchTerm ? 'ejercicio' : sortField, // Must sort by 'ejercicio' when searching
        sortDirection,
        pageSize: PAGE_SIZE,
        startAfterDocId: pageCursors.current[page] ?? undefined,
        searchTerm: debouncedSearchTerm || undefined,
      });

      setExercises(result.exercises);
      setHasNextPage(result.hasNextPage);
      
      // Store the cursor for the next page
      if (result.lastDocId) {
        pageCursors.current[page + 1] = result.lastDocId;
      }
      
    } catch (error: any) {
      console.error("Error fetching exercises:", error);
      toast({ title: "Error", description: "No se pudieron cargar los ejercicios.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [isAdmin, visibilityFilter, sortField, sortDirection, debouncedSearchTerm, toast]);

  // Effect to reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    pageCursors.current = { 1: null };
  }, [visibilityFilter, sortField, sortDirection, debouncedSearchTerm]);
  
  // Main data fetching effect, triggered by page changes or filter changes (via the effect above)
  useEffect(() => {
    fetchExercises(currentPage);
  }, [currentPage, fetchExercises]);


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
      // Reset to page 1 to refetch data consistently after deletion
      if (currentPage === 1) {
        fetchExercises(1); // Manually trigger refetch for current page after deletion
      } else {
        setCurrentPage(1);
        pageCursors.current = { 1: null };
      }
    } catch (error) {
      console.error("Error deleting exercise:", error);
      toast({ title: "Error", description: "No se pudo eliminar el ejercicio.", variant: "destructive" });
    } finally {
      setExerciseToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };
  
  const handleConfirmBulkUpdate = async () => {
    setIsBulkUpdating(true);
    setIsBulkUpdateDialogOpen(false);
    try {
        const result = await setAllExercisesVisibility({ isVisible: false });
        toast({
            title: "Actualización Masiva Completa",
            description: `${result.successCount} ejercicios se han marcado como no visibles.`,
        });
        // Reset to page 1 to refetch data after bulk update
        if (currentPage === 1) {
            fetchExercises(1); // Manually trigger refetch
        } else {
            setCurrentPage(1);
            pageCursors.current = { 1: null };
        }
    } catch (error) {
        console.error("Error in bulk update:", error);
        toast({
            title: "Error en Actualización Masiva",
            description: "No se pudieron actualizar todos los ejercicios.",
            variant: "destructive",
        });
    } finally {
        setIsBulkUpdating(false);
    }
  };

  const handleConfirmDeleteNoImage = async () => {
    setIsDeletingNoImage(true);
    setIsDeleteNoImageDialogOpen(false);
    try {
        const result = await deleteExercisesWithoutImages();
        toast({
            title: "Operación Completada",
            description: `${result.deletedCount} ejercicios sin imagen personalizada han sido eliminados.`,
        });
        if (currentPage === 1) {
            fetchExercises(1);
        } else {
            setCurrentPage(1);
            pageCursors.current = { 1: null };
        }
    } catch (error) {
        console.error("Error deleting exercises without images:", error);
        toast({
            title: "Error en Borrado Masivo",
            description: "No se pudieron eliminar los ejercicios.",
            variant: "destructive",
        });
    } finally {
        setIsDeletingNoImage(false);
    }
  };


  const getSortIcon = (field: SortableField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-2 opacity-30" />;
    return sortDirection === 'asc' ? <ArrowUpDown className="h-4 w-4 ml-2" /> : <ArrowUpDown className="h-4 w-4 ml-2" />;
  };

  if (!isAdmin && !isLoading) {
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
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
                 <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full sm:w-[200px]"
                    />
                </div>
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
                          <Button variant="outline" className="w-full sm:w-auto" disabled={!!debouncedSearchTerm}>
                              <ArrowUpDown className="mr-2 h-4 w-4" />
                              Ordenar por: {debouncedSearchTerm ? 'nombre' : sortField}
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
                  <div className="flex gap-2">
                    <Button
                        variant="destructive"
                        onClick={() => setIsBulkUpdateDialogOpen(true)}
                        disabled={isLoading || isBulkUpdating}
                        className="w-full sm:w-auto"
                        title="Ocultar todos los ejercicios"
                      >
                        {isBulkUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <EyeOff className="mr-2 h-4 w-4" />}
                        Ocultar Todos
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setIsDeleteNoImageDialogOpen(true)}
                      disabled={isLoading || isDeletingNoImage}
                      className="w-full sm:w-auto"
                      title="Eliminar ejercicios sin imagen personalizada"
                    >
                      {isDeletingNoImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageOff className="mr-2 h-4 w-4" />}
                      Eliminar Sin Imagen
                    </Button>
                  </div>
              </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px] cursor-pointer" onClick={() => !debouncedSearchTerm && handleSort('numero')}>Nº {!debouncedSearchTerm && getSortIcon('numero')}</TableHead>
                            <TableHead className="w-[80px]">Imagen</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => !debouncedSearchTerm && handleSort('ejercicio')}>Ejercicio {!debouncedSearchTerm && getSortIcon('ejercicio')}</TableHead>
                            <TableHead className="cursor-pointer" onClick={() => !debouncedSearchTerm && handleSort('categoria')}>Categoría {!debouncedSearchTerm && getSortIcon('categoria')}</TableHead>
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
         { (currentPage > 1 || hasNextPage) && (
          <CardFooter className="justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem><Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || isLoading}>Anterior</Button></PaginationItem>
                  <PaginationItem><span className="p-2 text-sm">Página {currentPage}</span></PaginationItem>
                  <PaginationItem><Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={!hasNextPage || isLoading}>Siguiente</Button></PaginationItem>
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

      <AlertDialog open={isBulkUpdateDialogOpen} onOpenChange={setIsBulkUpdateDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción marcará TODOS los ejercicios en la base de datos como NO VISIBLES. No podrán ser vistos por los usuarios hasta que los vuelvas a activar manualmente uno por uno.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmBulkUpdate} className="bg-destructive hover:bg-destructive/90" disabled={isBulkUpdating}>
                    {isBulkUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Sí, ocultar todos
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteNoImageDialogOpen} onOpenChange={setIsDeleteNoImageDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>¿Confirmar borrado masivo?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción eliminará permanentemente TODOS los ejercicios que NO tengan una imagen personalizada (es decir, los que usen una imagen de 'placehold.co' o no tengan imagen). Esta acción no se puede deshacer.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDeleteNoImage} className="bg-destructive hover:bg-destructive/90" disabled={isDeletingNoImage}>
                    {isDeletingNoImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                    Sí, eliminar sin imagen
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
