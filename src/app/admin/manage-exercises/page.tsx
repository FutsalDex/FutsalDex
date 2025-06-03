
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, ListChecks, Edit, Trash2, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation'; // Import useRouter
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc, query, orderBy as firestoreOrderBy, DocumentData } from 'firebase/firestore';
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

function ManageExercisesPageContent() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter(); // Initialize useRouter
  const [ejercicios, setEjercicios] = useState<EjercicioAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [exerciseToDeleteId, setExerciseToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEjercicios = async () => {
      setIsLoading(true);
      try {
        const q = query(collection(db, "ejercicios_futsal"), firestoreOrderBy("ejercicio"));
        const querySnapshot = await getDocs(q);
        const fetchedEjercicios = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as EjercicioAdmin));
        setEjercicios(fetchedEjercicios);
      } catch (error) {
        console.error("Error fetching exercises: ", error);
        toast({ title: "Error al Cargar Ejercicios", description: "No se pudieron cargar los ejercicios.", variant: "destructive" });
      }
      setIsLoading(false);
    };

    if (isAdmin) {
      fetchEjercicios();
    }
  }, [isAdmin, toast]);

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
      setEjercicios(prev => prev.filter(ej => ej.id !== exerciseToDeleteId));
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
    router.push(`/admin/edit-exercise/${id}`); // Correct navigation
  };
  
  const formatEdad = (edad: string[] | string) => {
    if (Array.isArray(edad)) {
      return edad.join(', ');
    }
    return edad;
  };

  if (!isAdmin) {
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
          {isLoading && <CardDescription>Cargando ejercicios...</CardDescription>}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : ejercicios.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No hay ejercicios en la biblioteca. <Link href="/admin/add-exercise" className="text-primary hover:underline">Añade el primero</Link>.</p>
          ) : (
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
                      <Button variant="ghost" size="icon" onClick={() => handleModifyClick(ej.id)} className="hover:text-blue-600">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(ej.id)} className="hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Esto eliminará permanentemente el ejercicio de la base de datos.
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
