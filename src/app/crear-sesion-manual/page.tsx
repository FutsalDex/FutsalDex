
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { parseDurationToMinutes } from "@/lib/utils";


interface Ejercicio {
  id: string;
  ejercicio: string;
  descripcion: string; 
  objetivos: string;   
  fase: string;
  categoria: string; 
  duracion: string; // Será "5", "10", "15", "20"
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
  const [selectedCategorias, setSelectedCategorias] = useState<string[]>([]); 

  const form = useForm<z.infer<typeof manualSessionSchema>>({
    resolver: zodResolver(manualSessionSchema),
    defaultValues: {
      warmUpExerciseId: "",
      mainExerciseIds: [],
      coolDownExerciseId: "",
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
        categoria: doc.data().categoria || "", 
        duracion: doc.data().duracion || "0", 
        ...(doc.data() as Omit<Ejercicio, 'id' | 'ejercicio' | 'descripcion' | 'objetivos' | 'fase' | 'categoria' | 'duracion'>)
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

 const handleCategoryChange = (categoryLabel: string) => {
    let newSelectedCategorias: string[];
    const currentSelected = selectedCategorias;
    const isSelected = currentSelected.includes(categoryLabel);
    let showToast = false;

    if (isSelected) {
      newSelectedCategorias = currentSelected.filter(label => label !== categoryLabel);
    } else {
      if (currentSelected.length < 4) {
        newSelectedCategorias = [...currentSelected, categoryLabel];
      } else {
        newSelectedCategorias = currentSelected;
        showToast = true; 
      }
    }
    
    if (showToast) {
       toast({ title: "Límite de categorías", description: "Puedes seleccionar hasta 4 categorías para filtrar." });
    } else {
        setSelectedCategorias(newSelectedCategorias);
        form.setValue('mainExerciseIds', []); 
    }
  };


  const filteredPrincipalEjercicios = useMemo(() => {
    if (selectedCategorias.length === 0) {
      return principalEjercicios;
    }
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
    
    let totalDuration = 0;
    if (warmUpDoc) totalDuration += parseDurationToMinutes(warmUpDoc.duracion);
    mainDocs.forEach(doc => totalDuration += parseDurationToMinutes(doc.duracion));
    if (coolDownDoc) totalDuration += parseDurationToMinutes(coolDownDoc.duracion);

    const dateStringToUse = values.fecha || new Date().toISOString().split('T')[0];
    let formattedDate: string;
    try {
      const dateObject = new Date(dateStringToUse);
      if (!isNaN(dateObject.getTime())) {
          formattedDate = dateObject.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } else {
          throw new Error("Invalid date string from form values");
      }
    } catch (e) {
        console.warn("Could not parse date from form, using current date for title:", e);
        formattedDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const titleToSave = `Sesión Manual - ${formattedDate}`;


    const sessionDataToSave = {
      userId: user.uid,
      type: "Manual" as "Manual" | "AI",
      sessionTitle: titleToSave,
      warmUp: warmUpDoc ? { id: warmUpDoc.id, ejercicio: warmUpDoc.ejercicio, duracion: warmUpDoc.duracion } : null,
      mainExercises: mainDocs.map(e => ({ id: e.id, ejercicio: e.ejercicio, duracion: e.duracion })),
      coolDown: coolDownDoc ? { id: coolDownDoc.id, ejercicio: coolDownDoc.ejercicio, duracion: coolDownDoc.duracion } : null,
      coachNotes: "", 
      numero_sesion: values.numero_sesion || null,
      fecha: values.fecha || null,
      temporada: values.temporada || null,
      club: values.club || null,
      equipo: values.equipo || null,
      duracionTotalManualEstimada: totalDuration,
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
            name={formFieldName as "mainExerciseIds"} 
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
                            {item.ejercicio} ({item.duracion ? `${item.duracion} min` : 'N/A'})
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
    } else { 
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
                        {ej.ejercicio} ({ej.duracion ? `${ej.duracion} min` : 'N/A'})
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
                          checked={selectedCategorias.includes(category.label)} 
                          onCheckedChange={() => handleCategoryChange(category.label)} 
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
               <FormField
                control={form.control}
                name="mainExerciseIds"
                render={() => (
                  <FormItem className="mt-2">
                    <FormMessage /> 
                  </FormItem>
                )}
              />
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
              <CardTitle className="font-headline text-xl">Detalles Adicionales de la Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="numero_sesion" render={({ field }) => (
                    <FormItem><FormLabel>Número de Sesión</FormLabel><FormControl><Input placeholder="Ej: 16" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fecha" render={({ field }) => (
                    <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="temporada" render={({ field }) => (
                    <FormItem><FormLabel>Temporada</FormLabel><FormControl><Input placeholder="Ej: 2024-2025" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="club" render={({ field }) => (
                    <FormItem><FormLabel>Club</FormLabel><FormControl><Input placeholder="Ej: Futsal Club Elite" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="equipo" render={({ field }) => (
                    <FormItem><FormLabel>Equipo</FormLabel><FormControl><Input placeholder="Ej: Senior Masculino A" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
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
