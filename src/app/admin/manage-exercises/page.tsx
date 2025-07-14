
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Loader2, Search, Edit, Trash2, ListChecks, Save, Download, Filter } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addExerciseSchema, type AddExerciseFormValues } from "@/lib/schemas";
import { AdminExercise, getAdminExercisesAndClean, updateExercise, deleteExercise, getAllExercisesForExport, deleteAllExercises } from "@/lib/actions/admin-exercise-actions";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { FASES_SESION, CATEGORIAS_TEMATICAS_EJERCICIOS, CATEGORIAS_EDAD_EJERCICIOS, DURACION_EJERCICIO_OPCIONES, EXPECTED_HEADERS } from "@/lib/constants";
import { ScrollArea } from "@/components/ui/scroll-area";


const ITEMS_PER_PAGE = 10;
const ALL_FILTER_VALUE = "ALL";

function EditExerciseForm({ exercise, onFormSubmit, closeDialog }: { exercise: AdminExercise, onFormSubmit: () => void, closeDialog: () => void }) {
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<AddExerciseFormValues>({
        resolver: zodResolver(addExerciseSchema),
        defaultValues: {
            ...exercise,
            numero: exercise.numero || "",
            variantes: exercise.variantes || "",
            consejos_entrenador: exercise.consejos_entrenador || "",
            imagen: exercise.imagen || "",
            isVisible: exercise.isVisible !== false,
        },
    });

    async function onSubmit(data: AddExerciseFormValues) {
        setIsSaving(true);
        try {
            await updateExercise({ id: exercise.id, ...data });
            toast({
                title: "Ejercicio Actualizado",
                description: `El ejercicio "${data.ejercicio}" ha sido actualizado.`,
            });
            onFormSubmit();
            closeDialog();
        } catch (error) {
            console.error("Error updating exercise:", error);
            toast({ title: "Error", description: "No se pudo actualizar el ejercicio.", variant: "destructive" });
        }
        setIsSaving(false);
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <ScrollArea className="h-[60vh] p-4">
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField control={form.control} name="ejercicio" render={({ field }) => ( <FormItem><FormLabel>Nombre</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                             <FormField control={form.control} name="numero" render={({ field }) => ( <FormItem><FormLabel>Número (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <FormField control={form.control} name="descripcion" render={({ field }) => ( <FormItem><FormLabel>Descripción</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="objetivos" render={({ field }) => ( <FormItem><FormLabel>Objetivos</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem> )} />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <FormField control={form.control} name="fase" render={({ field }) => ( <FormItem><FormLabel>Fase</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{FASES_SESION.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="categoria" render={({ field }) => ( <FormItem><FormLabel>Categoría</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{CATEGORIAS_TEMATICAS_EJERCICIOS.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="edad" render={() => (
                            <FormItem>
                                <FormLabel>Edades</FormLabel>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border rounded-md">
                                {CATEGORIAS_EDAD_EJERCICIOS.map((edadCat) => (
                                    <FormField key={edadCat} control={form.control} name="edad" render={({ field }) => (
                                    <FormItem key={edadCat} className="flex flex-row items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(edadCat)}
                                            onCheckedChange={(checked) => {
                                            const currentValue = field.value || [];
                                            if (checked) field.onChange([...currentValue, edadCat]);
                                            else field.onChange(currentValue.filter(value => value !== edadCat));
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">{edadCat}</FormLabel>
                                    </FormItem>
                                    )}
                                />
                                ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="consejos_entrenador" render={({ field }) => ( <FormItem><FormLabel>Consejos para el Entrenador (Opcional)</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="imagen" render={({ field }) => ( <FormItem><FormLabel>URL Imagen</FormLabel><FormControl><Input type="url" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="isVisible" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                <div className="space-y-0.5">
                                <FormLabel>Visibilidad</FormLabel>
                                <FormDescription>Si está activado, el ejercicio será visible para todos.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}


function ManageExercisesPageContent() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const [allExercises, setAllExercises] = useState<AdminExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_FILTER_VALUE);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [exerciseToEdit, setExerciseToEdit] = useState<AdminExercise | null>(null);
  const [exerciseToDelete, setExerciseToDelete] = useState<AdminExercise | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  const fetchExercises = useCallback(async () => {
    setIsLoading(true);
    try {
      const { exercises, deletedCount } = await getAdminExercisesAndClean();
      setAllExercises(exercises);
      if (deletedCount > 0) {
        toast({
          title: "Limpieza Completada",
          description: `Se eliminaron ${deletedCount} ejercicios duplicados.`,
          duration: 7000
        });
      }
    } catch (error) {
      console.error("Error fetching or cleaning exercises:", error);
      toast({ title: "Error", description: "No se pudieron cargar los ejercicios.", variant: "destructive" });
    }
    setIsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleExportAll = async () => {
    setIsExporting(true);
    try {
        const exercisesToExport = await getAllExercisesForExport();
        const dataForSheet = exercisesToExport.map(ex => ({
            [EXPECTED_HEADERS.numero]: ex.numero || '',
            [EXPECTED_HEADERS.ejercicio]: ex.ejercicio,
            [EXPECTED_HEADERS.descripcion]: ex.descripcion,
            [EXPECTED_HEADERS.objetivos]: ex.objetivos,
            [EXPECTED_HEADERS.espacio_materiales]: ex.espacio_materiales,
            [EXPECTED_HEADERS.jugadores]: ex.jugadores,
            [EXPECTED_HEADERS.duracion]: ex.duracion,
            [EXPECTED_HEADERS.variantes]: ex.variantes || '',
            [EXPECTED_HEADERS.fase]: ex.fase,
            [EXPECTED_HEADERS.categoria]: ex.categoria,
            [EXPECTED_HEADERS.edad]: Array.isArray(ex.edad) ? ex.edad.join(', ') : '',
            [EXPECTED_HEADERS.consejos_entrenador]: ex.consejos_entrenador || '',
            [EXPECTED_HEADERS.imagen]: ex.imagen || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ejercicios");

        const max_widths = Object.keys(dataForSheet[0] || {}).map(header => ({
            wch: Math.max(header.length, ...dataForSheet.map(row => String(row[header as keyof typeof row] || '').length))
        }));
        worksheet["!cols"] = max_widths;

        XLSX.writeFile(workbook, "FutsalDex_Todos_Ejercicios.xlsx");

        toast({
            title: "Exportación Completa",
            description: `Se han exportado ${exercisesToExport.length} ejercicios.`
        });

    } catch (error) {
        console.error("Error exporting exercises:", error);
        toast({ title: "Error de Exportación", description: "No se pudieron exportar los ejercicios.", variant: "destructive" });
    } finally {
        setIsExporting(false);
    }
  };


  const filteredExercises = useMemo(() => {
    let exercises = [...allExercises];
    if (searchTerm) {
      exercises = exercises.filter(e => e.ejercicio.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (categoryFilter !== ALL_FILTER_VALUE) {
        exercises = exercises.filter(e => e.categoria === categoryFilter);
    }
    return exercises;
  }, [allExercises, searchTerm, categoryFilter]);

  const paginatedExercises = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredExercises.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredExercises, currentPage]);

  const totalPages = Math.ceil(filteredExercises.length / ITEMS_PER_PAGE);

  const handleDelete = async () => {
    if (!exerciseToDelete) return;
    setIsDeleting(exerciseToDelete.id);
    try {
        await deleteExercise({ exerciseId: exerciseToDelete.id });
        toast({ title: "Ejercicio Eliminado", description: `"${exerciseToDelete.ejercicio}" ha sido eliminado.` });
        setAllExercises(prev => prev.filter(e => e.id !== exerciseToDelete.id));
        setExerciseToDelete(null);
    } catch (error) {
        console.error("Error deleting exercise:", error);
        toast({ title: "Error", description: "No se pudo eliminar el ejercicio.", variant: "destructive" });
    }
    setIsDeleting(null);
  };

  const handleDeleteAll = async () => {
    setIsDeletingAll(true);
    try {
      const result = await deleteAllExercises();
      toast({
        title: "Eliminación Completada",
        description: `Se han eliminado ${result.deletedCount} ejercicios.`,
      });
      setAllExercises([]); // Clear UI immediately
      setCurrentPage(1);
    } catch (error) {
      console.error("Error deleting all exercises:", error);
      toast({ title: "Error", description: "No se pudieron eliminar todos los ejercicios.", variant: "destructive" });
    } finally {
      setIsDeletingAll(false);
      setIsDeleteAllDialogOpen(false);
    }
  };


  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle className="text-2xl font-headline text-destructive">Acceso Denegado</CardTitle></CardHeader>
          <CardContent><CardDescription>No tienes permisos de administrador.</CardDescription><Button asChild variant="outline" className="mt-4"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Panel</Link></Button></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-primary mb-1 font-headline">Gestionar Ejercicios</h1><p className="text-lg text-foreground/80">Edita, elimina y gestiona los ejercicios del catálogo.</p></div>
        <div className="flex gap-2">
            <Button onClick={handleExportAll} variant="outline" disabled={isExporting}>
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Exportar Todo
            </Button>
            <Button asChild variant="outline">
                <Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Panel</Link>
            </Button>
        </div>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl flex items-center"><ListChecks className="mr-2 h-5 w-5 text-primary" />Listado de Ejercicios</CardTitle>
            <p className="text-sm text-muted-foreground">Total: {filteredExercises.length}</p>
          </div>
          <CardDescription>Ejercicios únicos en la base de datos. Los duplicados se han eliminado automáticamente.</CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <div className="relative flex-grow"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por nombre..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="pl-10" /></div>
            <Select value={categoryFilter} onValueChange={(value) => { setCategoryFilter(value); setCurrentPage(1); }}>
                <SelectTrigger className="w-full sm:w-[250px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filtrar por categoría" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Todas las Categorías</SelectItem>
                    {CATEGORIAS_TEMATICAS_EJERCICIOS.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                </SelectContent>
            </Select>
            <Button variant="destructive" onClick={() => setIsDeleteAllDialogOpen(true)} disabled={isLoading || allExercises.length === 0}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar Todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Imagen</TableHead>
                <TableHead>Ejercicio</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Visibilidad</TableHead>
                <TableHead className="w-[120px] text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
              ) : paginatedExercises.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No se encontraron ejercicios.</TableCell></TableRow>
              ) : (
                paginatedExercises.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell><Image src={ex.imagen || 'https://placehold.co/400x300.png'} alt={ex.ejercicio} width={60} height={45} className="rounded-md object-cover" data-ai-hint="futsal drill" /></TableCell>
                    <TableCell className="font-medium">{ex.ejercicio}</TableCell>
                    <TableCell><Badge variant="secondary">{ex.categoria}</Badge></TableCell>
                    <TableCell><Badge variant={ex.isVisible ? "default" : "destructive"}>{ex.isVisible ? 'Visible' : 'Oculto'}</Badge></TableCell>
                    <TableCell className="text-right">
                       <Dialog open={exerciseToEdit?.id === ex.id} onOpenChange={(isOpen) => !isOpen && setExerciseToEdit(null)}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setExerciseToEdit(ex)}><Edit className="h-4 w-4" /></Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>Editar Ejercicio</DialogTitle>
                                    <DialogDescription>Realiza cambios en el ejercicio y guarda.</DialogDescription>
                                </DialogHeader>
                                {exerciseToEdit && <EditExerciseForm exercise={exerciseToEdit} onFormSubmit={fetchExercises} closeDialog={() => setExerciseToEdit(null)} />}
                            </DialogContent>
                        </Dialog>
                      <Button variant="ghost" size="icon" onClick={() => setExerciseToDelete(ex)} disabled={isDeleting === ex.id}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || isLoading}>Anterior</Button></PaginationItem>
                <PaginationItem className="font-medium text-sm px-3 text-muted-foreground">Página {currentPage} de {totalPages}</PaginationItem>
                <PaginationItem><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages || isLoading}>Siguiente</Button></PaginationItem>
              </PaginationContent>
            </Pagination>
          )}

          <AlertDialog open={!!exerciseToDelete} onOpenChange={(isOpen) => !isOpen && setExerciseToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Estás seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminará el ejercicio "{exerciseToDelete?.ejercicio}".</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Estás ABSOLUTAMENTE seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Se eliminarán TODOS los ejercicios ({allExercises.length}) de la base de datos de forma permanente. Esto afectará a las sesiones guardadas que los utilicen.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} disabled={isDeletingAll} className="bg-destructive hover:bg-destructive/90">
                      {isDeletingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Sí, eliminar todo
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
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
