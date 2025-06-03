
// src/app/admin/edit-exercise/[id]/page.tsx
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addExerciseSchema, type AddExerciseFormValues } from "@/lib/schemas";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect, useCallback } from "react";
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { FASES_SESION, CATEGORIAS_TEMATICAS_EJERCICIOS, CATEGORIAS_EDAD_EJERCICIOS, DURACION_EJERCICIO_OPCIONES } from "@/lib/constants";

function EditExercisePageContent() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams();
  const exerciseId = params.id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [exerciseNotFound, setExerciseNotFound] = useState(false);

  const form = useForm<AddExerciseFormValues>({
    resolver: zodResolver(addExerciseSchema),
    defaultValues: {
      numero: "",
      ejercicio: "",
      descripcion: "",
      objetivos: "",
      espacio_materiales: "",
      jugadores: "",
      duracion: "", // Default to empty, will be populated from fetched data
      variantes: "",
      fase: "",
      categoria: "", 
      edad: [],
      consejos_entrenador: "",
      imagen: "",
    },
  });

  const fetchExerciseData = useCallback(async () => {
    if (!exerciseId) {
      setIsFetching(false);
      setExerciseNotFound(true);
      return;
    }
    setIsFetching(true);
    try {
      const docRef = doc(db, "ejercicios_futsal", exerciseId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as AddExerciseFormValues;
        const currentEdad = Array.isArray(data.edad) ? data.edad : (data.edad ? [String(data.edad)] : []);
        const currentImagen = typeof data.imagen === 'string' ? data.imagen : '';
        const currentNumero = typeof data.numero === 'string' ? data.numero : '';
        const currentVariantes = typeof data.variantes === 'string' ? data.variantes : '';
        const currentConsejos = typeof data.consejos_entrenador === 'string' ? data.consejos_entrenador : '';
        const currentCategoria = typeof data.categoria === 'string' ? data.categoria : '';
        const currentDuracion = typeof data.duracion === 'string' ? data.duracion : '';

        form.reset({
          ...data,
          edad: currentEdad,
          imagen: currentImagen,
          numero: currentNumero,
          variantes: currentVariantes,
          consejos_entrenador: currentConsejos,
          categoria: currentCategoria,
          duracion: currentDuracion,
        });
        setExerciseNotFound(false);
      } else {
        setExerciseNotFound(true);
        toast({ title: "Error", description: "Ejercicio no encontrado.", variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching exercise:", error);
      toast({ title: "Error al Cargar", description: "No se pudo cargar el ejercicio.", variant: "destructive" });
      setExerciseNotFound(true);
    }
    setIsFetching(false);
  }, [exerciseId, form, toast]);

  useEffect(() => {
    if (isAdmin && exerciseId) { 
      fetchExerciseData();
    } else if (!exerciseId && isAdmin) { 
        setIsFetching(false);
        setExerciseNotFound(true);
    }
  }, [isAdmin, exerciseId, fetchExerciseData]);


  async function onSubmit(data: AddExerciseFormValues) {
    if (!exerciseId) return;
    setIsLoading(true);
    try {
      const docRef = doc(db, "ejercicios_futsal", exerciseId);
      await updateDoc(docRef, {
        ...data, 
        numero: data.numero || null, 
        variantes: data.variantes || null, 
        consejos_entrenador: data.consejos_entrenador || null, 
        imagen: data.imagen || `https://placehold.co/400x300.png?text=${encodeURIComponent(data.ejercicio)}`,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Ejercicio Actualizado",
        description: `El ejercicio "${data.ejercicio}" ha sido actualizado.`,
      });
      router.push("/admin/manage-exercises");
    } catch (error) {
      console.error("Error updating exercise:", error);
      toast({
        title: "Error al Actualizar",
        description: "Hubo un problema al guardar los cambios. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }

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

  if (isFetching) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (exerciseNotFound) {
     return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
            <CardTitle className="text-2xl font-headline text-destructive">Ejercicio No Encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              El ejercicio que intentas editar no existe o no se pudo encontrar. Verifica que el ID es correcto.
            </CardDescription>
             <Button asChild variant="outline" className="mt-4">
                <Link href="/admin/manage-exercises">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver a Gestionar Ejercicios
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
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Modificar Ejercicio</h1>
          <p className="text-lg text-foreground/80">
            Edita los detalles del ejercicio seleccionado.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/manage-exercises">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Gestionar
          </Link>
        </Button>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <Save className="mr-2 h-5 w-5 text-primary" />
            Formulario de Edición
          </CardTitle>
          <CardDescription>
            Modifica los campos necesarios y guarda los cambios.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="ejercicio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Ejercicio</FormLabel>
                    <FormControl><Input placeholder="Nombre descriptivo del ejercicio" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="numero" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número (Opcional)</FormLabel>
                    <FormControl><Input placeholder="Ej: 001, A-10" {...field} /></FormControl>
                    <FormDescription>Identificador numérico o alfanumérico.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="descripcion" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción de la Tarea</FormLabel>
                  <FormControl><Textarea placeholder="Explica detalladamente en qué consiste el ejercicio..." {...field} rows={4} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="objetivos" render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivos</FormLabel>
                  <FormControl><Textarea placeholder="¿Qué se busca mejorar con este ejercicio? (Ej: Control del balón, pase corto, definición...)" {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={form.control} name="fase" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fase de la Sesión</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una fase" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {FASES_SESION.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="categoria" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CATEGORIAS_TEMATICAS_EJERCICIOS.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField
                control={form.control}
                name="edad"
                render={() => (
                  <FormItem>
                    <FormLabel>Categorías de Edad (Selecciona una o más)</FormLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 border rounded-md">
                      {CATEGORIAS_EDAD_EJERCICIOS.map((edadCat) => (
                        <FormField
                          key={edadCat}
                          control={form.control}
                          name="edad"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={edadCat}
                                className="flex flex-row items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(edadCat)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = field.value || [];
                                      if (checked) {
                                        field.onChange([...currentValue, edadCat]);
                                      } else {
                                        field.onChange(
                                          currentValue.filter(
                                            (value) => value !== edadCat
                                          )
                                        );
                                      }
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal">
                                  {edadCat}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                 <FormField control={form.control} name="jugadores" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Jugadores</FormLabel>
                    <FormControl><Input placeholder="Ej: 8-12 jugadores" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="duracion" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Duración (minutos)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una duración" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {DURACION_EJERCICIO_OPCIONES.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="espacio_materiales" render={({ field }) => (
                <FormItem>
                  <FormLabel>Espacio y Materiales Necesarios</FormLabel>
                  <FormControl><Textarea placeholder="Ej: Media pista, 10 conos, 5 balones..." {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="variantes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Variantes (Opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Posibles modificaciones o progresiones del ejercicio..." {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="consejos_entrenador" render={({ field }) => (
                <FormItem>
                  <FormLabel>Consejos para el Entrenador (Opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Puntos clave a observar, correcciones comunes, cómo motivar..." {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="imagen" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de la Imagen (Opcional)</FormLabel>
                  <FormControl><Input type="url" placeholder="https://ejemplo.com/imagen.png" {...field} /></FormControl>
                  <FormDescription>Si se deja vacío, se usará una imagen genérica.</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || isFetching}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar Cambios
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EditExercisePage() {
  return (
    <AuthGuard>
      <EditExercisePageContent />
    </AuthGuard>
  );
}
