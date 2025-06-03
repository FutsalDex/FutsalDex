
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { manualSessionSchema } from "@/lib/schemas";
import { useState, useEffect, useMemo } from "react";
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, limit, orderBy as firestoreOrderBy, serverTimestamp, DocumentData } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Info, Filter } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { CATEGORIAS_TEMATICAS_EJERCICIOS } from "@/lib/constants";


interface Ejercicio {
  id: string;
  ejercicio: string;
  descripcion: string; 
  objetivos: string;   
  fase: string;
  categoria: string; // Esta es la etiqueta de la categoría
  // Otros campos de Ejercicio si los hay y son relevantes
}


export default function CrearSesionManualPage() {
  return (
    <CrearSesionManualContent />
  );
}

function CrearSesionManualContent() {
  const { user, isRegisteredUser } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [calentamientoEjercicios, setCalentamientoEjercicios] = useState<Ejercicio[]>([]);
  const [principalEjercicios, setPrincipalEjercicios] = useState<Ejercicio[]>([]); 
  const [vueltaCalmaEjercicios, setVueltaCalmaEjercicios] = useState<Ejercicio[]>([]);

  const [loadingEjercicios, setLoadingEjercicios] = useState({ calentamiento: true, principal: true, vueltaCalma: true });
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]); // Almacenará las etiquetas de las categorías

  const form = useForm<z.infer<typeof manualSessionSchema>>({
    resolver: zodResolver(manualSessionSchema),
    defaultValues: {
      warmUpExerciseId: "",
      mainExerciseIds: [],
      coolDownExerciseId: "",
      sessionTitle: `Sesión Manual - ${new Date().toLocaleDateString('es-ES')}`,
      numero_sesion: "",
      fecha: new Date().toISOString().split('T')[0],
      temporada: "",
      club: "",
      equipo: "",
    },
  });

  const fetchEjerciciosPorFase = async (fase: string, setter: React.Dispatch<React.SetStateAction<Ejercicio[]>>, loadingKey: keyof typeof loadingEjercicios) => {
    setLoadingEjercicios(prev => ({ ...prev, [loadingKey]: true }));
    try {
      const q = query(collection(db, 'ejercicios_futsal'), where('fase', '==', fase), firestoreOrderBy('ejercicio'), limit(150));
      const snapshot = await getDocs(q);
      const ejerciciosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ejercicio: doc.data().ejercicio || "",
        descripcion: doc.data().descripcion || "", 
        objetivos: doc.data().objetivos || "",  
        fase: doc.data().fase || "",
        categoria: doc.data().categoria || "", // Este es el nombre/label de la categoría
        ...(doc.data() as Omit<Ejercicio, 'id' | 'ejercicio' | 'descripcion' | 'objetivos' | 'fase' | 'categoria'>)
      } as Ejercicio));
      setter(ejerciciosData);
    } catch (error) {
      console.error(`Error fetching ${fase} exercises:`, error);
      toast({ title: `Error al cargar ejercicios de ${fase}`, variant: "destructive" });
    }
    setLoadingEjercicios(prev => ({ ...prev, [loadingKey]: false }));
  };

  useEffect(() => {
    fetchEjerciciosPorFase("Inicial", setCalentamientoEjercicios, "calentamiento");
    fetchEjerciciosPorFase("Principal", setPrincipalEjercicios, "principal");
    fetchEjerciciosPorFase("Final", setVueltaCalmaEjercicios, "vueltaCalma");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryChange = (categoryLabel: string) => { // Ahora recibe la etiqueta
    setSelectedCategorias(prev => {
      const isSelected = prev.includes(categoryLabel);
      if (isSelected) {
        return prev.filter(label => label !== categoryLabel);
      } else {
        if (prev.length < 4) {
          return [...prev, categoryLabel];
        } else {
          toast({ title: "Límite de categorías", description: "Puedes seleccionar hasta 4 categorías para filtrar." });
          return prev;
        }
      }
    });
    form.setValue('mainExerciseIds', []); // Resetear selección de ejercicios principales al cambiar filtro
  };

  const filteredPrincipalEjercicios = useMemo(() => {
    if (selectedCategorias.length === 0) {
      return principalEjercicios;
    }
    // Compara la etiqueta de la categoría del ejercicio con las etiquetas seleccionadas
    return principalEjercicios.filter(exercise => {
      return selectedCategorias.includes(exercise.categoria); 
    });
  }, [principalEjercicios, selectedCategorias]);


  async function onSubmit(values: z.infer<typeof manualSessionSchema>) {
    if (!user || !isRegisteredUser) {
        toast({
            title: "Acción Requerida",
            description: "Por favor, regístrate o inicia sesión para guardar la sesión.",
            variant: "default",
        });
        return;
    }
    setIsSaving(true);

    const warmUpDoc = calentamientoEjercicios.find(e => e.id === values.warmUpExerciseId);
    const mainDocs = principalEjercicios.filter(e => values.mainExerciseIds.includes(e.id));
    const coolDownDoc = vueltaCalmaEjercicios.find(e => e.id === values.coolDownExerciseId);

    const sessionDataToSave = {
      userId: user.uid,
      type: "Manual",
      sessionTitle: values.sessionTitle || `Sesión Manual ${values.fecha}`,
      warmUp: warmUpDoc ? { id: warmUpDoc.id, ejercicio: warmUpDoc.ejercicio } : null,
      mainExercises: mainDocs.map(e => ({ id: e.id, ejercicio: e.ejercicio })),
      coolDown: coolDownDoc ? { id: coolDownDoc.id, ejercicio: coolDownDoc.ejercicio } : null,
      coachNotes: "", 
      numero_sesion: values.numero_sesion,
      fecha: values.fecha,
      temporada: values.temporada,
      club: values.club,
      equipo: values.equipo,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "mis_sesiones"), sessionDataToSave);
      toast({
        title: "¡Sesión Guardada!",
        description: "Tu sesión manual ha sido guardada en 'Mis Sesiones'.",
      });
      form.reset({
        warmUpExerciseId: "",
        mainExerciseIds: [],
        coolDownExerciseId: "",
        sessionTitle: `Sesión Manual - ${new Date().toLocaleDateString('es-ES')}`,
        numero_sesion: "",
        fecha: new Date().toISOString().split('T')[0],
        temporada: "",
        club: "",
        equipo: "",
      });
      setSelectedCategorias([]);
    } catch (error) {
      console.error("Error saving manual session:", error);
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la sesión manual. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  }

  const renderExerciseList = (
    exercises: Ejercicio[],
    loading: boolean,
    name: "warmUpExerciseId" | "coolDownExerciseId" | "mainExerciseIds",
    isMultiSelect: boolean = false,
    formFieldName: "warmUpExerciseId" | "coolDownExerciseId" | "mainExerciseIds"
  ) => {
    if (loading) return <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
    if (exercises.length === 0 && name === "mainExerciseIds" && selectedCategorias.length > 0) return <p className="text-sm text-muted-foreground py-4 text-center">No hay ejercicios que coincidan con las categorías seleccionadas.</p>;
    if (exercises.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">No hay ejercicios disponibles para esta fase.</p>;

    if (isMultiSelect) {
      return (
        <ScrollArea className="h-64 rounded-md border p-4">
          <FormField
            control={form.control}
            name={formFieldName as "mainExerciseIds"} // Asegurar que es el nombre correcto del campo
            render={() => (
              <div className="space-y-2">
                {exercises.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name={formFieldName as "mainExerciseIds"}
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={item.id}
                          className="flex flex-row items-start space-x-3 space-y-0"
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(item.id)}
                              onCheckedChange={(checked) => {
                                const currentValues = field.value || [];
                                if (checked) {
                                  if (currentValues.length < 4) {
                                    field.onChange([...currentValues, item.id]);
                                  } else {
                                    toast({ title: "Límite alcanzado", description: "Puedes seleccionar hasta 4 ejercicios principales.", variant: "default" });
                                    return; 
                                  }
                                } else {
                                  field.onChange(
                                    currentValues.filter(
                                      (value) => value !== item.id
                                    )
                                  );
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            {item.ejercicio}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
            )}
          />
        </ScrollArea>
      );
    } else { // Selección única con Select
      return (
         <FormField
            control={form.control}
            name={formFieldName as "warmUpExerciseId" | "coolDownExerciseId"}
            render={({ field }) => (
              <FormItem>
                <Select onValueChange={field.onChange} value={field.value || ""} defaultValue={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Selecciona un ejercicio`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {exercises.map((ej) => (
                      <SelectItem key={ej.id} value={ej.id}>
                        {ej.ejercicio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
      );
    }
  };


  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Crear Sesión Manualmente</h1>
        <p className="text-lg text-foreground/80">
          Selecciona ejercicios de nuestra biblioteca para construir tu propio plan de entrenamiento.
        </p>
      </header>

      {!isRegisteredUser && (
         <Alert variant="default" className="mb-6 bg-accent/10 border-accent">
          <Info className="h-5 w-5 text-accent" />
          <AlertTitle className="font-headline text-accent">Modo Invitado</AlertTitle>
          <AlertDescription className="text-accent/90">
            Como invitado, puedes diseñar una sesión de entrenamiento manual.
            Para guardar tus sesiones y acceder a todas las funciones, por favor{" "}
            <Link href="/register" className="font-bold underline hover:text-accent/70">
              regístrate
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Fase Inicial</CardTitle>
              <CardDescription>Selecciona 1 ejercicio para la fase inicial.</CardDescription>
            </CardHeader>
            <CardContent>
              {renderExerciseList(calentamientoEjercicios, loadingEjercicios.calentamiento, "warmUpExerciseId", false, "warmUpExerciseId")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Fase Principal</CardTitle>
              <CardDescription>Selecciona hasta 4 ejercicios para la fase principal. Puedes filtrar por categorías.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <FormLabel className="text-md font-semibold flex items-center mb-2">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar por Categorías (máx. 4)
                </FormLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 p-4 border rounded-md">
                  {CATEGORIAS_TEMATICAS_EJERCICIOS.map((category) => (
                    <FormItem key={category.id} className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={selectedCategorias.includes(category.label)} // Comprobar contra la etiqueta
                          onCheckedChange={() => handleCategoryChange(category.label)} // Pasar la etiqueta
                          id={`cat-${category.id}`}
                        />
                      </FormControl>
                      <FormLabel htmlFor={`cat-${category.id}`} className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        {category.label}
                      </FormLabel>
                    </FormItem>
                  ))}
                </div>
              </div>
               {renderExerciseList(filteredPrincipalEjercicios, loadingEjercicios.principal, "mainExerciseIds", true, "mainExerciseIds")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Fase Final</CardTitle>
              <CardDescription>Selecciona 1 ejercicio para la fase final.</CardDescription>
            </CardHeader>
            <CardContent>
               {renderExerciseList(vueltaCalmaEjercicios, loadingEjercicios.vueltaCalma, "coolDownExerciseId", false, "coolDownExerciseId")}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Detalles de la Sesión (Opcional para Guardar)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="sessionTitle" render={({ field }) => (
                  <FormItem><FormLabel>Título de la Sesión</FormLabel><FormControl><Input placeholder="Ej: Sesión de Técnica Individual" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="numero_sesion" render={({ field }) => (
                    <FormItem><FormLabel>Número de Sesión</FormLabel><FormControl><Input placeholder="Ej: 16" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fecha" render={({ field }) => (
                    <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="temporada" render={({ field }) => (
                    <FormItem><FormLabel>Temporada</FormLabel><FormControl><Input placeholder="Ej: 2024-2025" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="club" render={({ field }) => (
                    <FormItem><FormLabel>Club</FormLabel><FormControl><Input placeholder="Ej: Futsal Club Elite" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="equipo" render={({ field }) => (
                    <FormItem><FormLabel>Equipo</FormLabel><FormControl><Input placeholder="Ej: Senior Masculino A" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-lg"
            disabled={isSaving || Object.values(loadingEjercicios).some(l => l) || !isRegisteredUser}
            title={!isRegisteredUser ? "Regístrate para guardar la sesión" : "Guardar Sesión Manual"}
          >
            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            {isRegisteredUser ? "Guardar Sesión Manual" : "Regístrate para Guardar"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

