
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { addExerciseSchema, type AddExerciseFormValues } from "@/lib/schemas";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { FASES_SESION, CATEGORIAS_TEMATICAS_EJERCICIOS, CATEGORIAS_EDAD_EJERCICIOS } from "@/lib/constants";


function AddExercisePageContent() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddExerciseFormValues>({
    resolver: zodResolver(addExerciseSchema),
    defaultValues: {
      numero: "",
      ejercicio: "",
      descripcion: "",
      objetivos: "",
      espacio_materiales: "",
      jugadores: "",
      duracion: "",
      variantes: "",
      fase: "",
      categoria: "", // Will store category label
      edad: [], 
      consejos_entrenador: "",
      imagen: "",
    },
  });

  async function onSubmit(data: AddExerciseFormValues) {
    setIsLoading(true);
    try {
      await addDoc(collection(db, "ejercicios_futsal"), {
        ...data, // categoria field will now contain the label
        numero: data.numero || null, 
        variantes: data.variantes || null,
        consejos_entrenador: data.consejos_entrenador || null,
        imagen: data.imagen || `https://placehold.co/400x300.png?text=${encodeURIComponent(data.ejercicio)}`,
        createdAt: serverTimestamp(),
      });
      toast({
        title: "Ejercicio Añadido",
        description: `El ejercicio "${data.ejercicio}" ha sido añadido a la biblioteca.`,
      });
      form.reset();
    } catch (error) {
      console.error("Error adding exercise:", error);
      toast({
        title: "Error al Añadir Ejercicio",
        description: "Hubo un problema al guardar el ejercicio. Inténtalo de nuevo.",
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

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Añadir Nuevo Ejercicio</h1>
          <p className="text-lg text-foreground/80">
            Completa el formulario para añadir un nuevo ejercicio a la biblioteca.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Panel
          </Link>
        </Button>
      </header>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center">
            <PlusCircle className="mr-2 h-5 w-5 text-primary" />
            Formulario de Nuevo Ejercicio
          </CardTitle>
          <CardDescription>
            Rellena todos los campos para crear un nuevo ejercicio.
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormLabel>Duración Estimada</FormLabel>
                    <FormControl><Input placeholder="Ej: 15-20 minutos" {...field} /></FormControl>
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
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                Añadir Ejercicio
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AddExercisePage() {
  return (
    <AuthGuard>
      <AddExercisePageContent />
    </AuthGuard>
  );
}
