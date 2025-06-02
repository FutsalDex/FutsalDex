"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { manualSessionSchema } from "@/lib/schemas";
import { useState, useEffect, useMemo } from "react";
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, limit, orderBy as firestoreOrderBy, serverTimestamp, DocumentData } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ListPlus, CheckSquare, Square } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface Ejercicio {
  id: string;
  ejercicio: string;
  fase: string;
  // Add other relevant fields if needed for display
}

const ITEMS_PER_LOAD = 10;

export default function CrearSesionManualPage() {
  return (
    <AuthGuard>
      <CrearSesionManualContent />
    </AuthGuard>
  );
}

function CrearSesionManualContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [calentamientoEjercicios, setCalentamientoEjercicios] = useState<Ejercicio[]>([]);
  const [principalEjercicios, setPrincipalEjercicios] = useState<Ejercicio[]>([]);
  const [vueltaCalmaEjercicios, setVueltaCalmaEjercicios] = useState<Ejercicio[]>([]);
  
  const [loadingEjercicios, setLoadingEjercicios] = useState({ calentamiento: true, principal: true, vueltaCalma: true });

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
      const q = query(collection(db, 'ejercicios_futsal'), where('fase', '==', fase), firestoreOrderBy('ejercicio'), limit(50)); // Load more for selection
      const snapshot = await getDocs(q);
      const ejerciciosData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ejercicio));
      setter(ejerciciosData);
    } catch (error) {
      console.error(`Error fetching ${fase} exercises:`, error);
      toast({ title: `Error al cargar ejercicios de ${fase}`, variant: "destructive" });
    }
    setLoadingEjercicios(prev => ({ ...prev, [loadingKey]: false }));
  };

  useEffect(() => {
    fetchEjerciciosPorFase("Calentamiento", setCalentamientoEjercicios, "calentamiento");
    fetchEjerciciosPorFase("Principal", setPrincipalEjercicios, "principal");
    fetchEjerciciosPorFase("Vuelta a la calma", setVueltaCalmaEjercicios, "vueltaCalma");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(values: z.infer<typeof manualSessionSchema>) {
    if (!user) return;
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
      coachNotes: "", // Manual sessions don't have AI coach notes by default
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
    isMultiSelect: boolean = false
  ) => {
    if (loading) return <div className="flex items-center justify-center h-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
    if (exercises.length === 0) return <p className="text-sm text-muted-foreground">No hay ejercicios disponibles para esta fase.</p>;

    return (
      <ScrollArea className="h-64 rounded-md border p-4">
        {isMultiSelect ? (
           <FormField
            control={form.control}
            name={name as "mainExerciseIds"}
            render={() => (
              <div className="space-y-2">
              {exercises.map((item) => (
                <FormField
                  key={item.id}
                  control={form.control}
                  name={name as "mainExerciseIds"}
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
                                  // Manually uncheck the box if limit is reached. This is a bit hacky.
                                  // The checkbox state is ultimately controlled by field.value.
                                  // To prevent checking, we ensure it's not added to field.value.
                                  // For ShadCN checkbox, onCheckedChange provides boolean or 'indeterminate'.
                                  // We need to find the checkbox DOM element and set its checked state to false.
                                  // This part is tricky, usually, we disable further checkboxes.
                                  // A simpler way is just to not update if currentValues.length >= 4.
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
        ) : (
          <Controller
            control={form.control}
            name={name as "warmUpExerciseId" | "coolDownExerciseId"}
            render={({ field }) => (
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-1"
              >
                {exercises.map((ej) => (
                  <FormItem key={ej.id} className="flex items-center space-x-3 space-y-0">
                    <FormControl>
                      <RadioGroupItem value={ej.id} />
                    </FormControl>
                    <FormLabel className="font-normal">{ej.ejercicio}</FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            )}
          />
        )}
      </ScrollArea>
    );
  };


  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Crear Sesión Manualmente</h1>
        <p className="text-lg text-foreground/80">
          Selecciona ejercicios de nuestra biblioteca para construir tu propio plan de entrenamiento.
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Fase Inicial: Calentamiento</CardTitle>
              <CardDescription>Selecciona 1 ejercicio para el calentamiento.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="warmUpExerciseId"
                render={() => (
                  <FormItem>
                    {renderExerciseList(calentamientoEjercicios, loadingEjercicios.calentamiento, "warmUpExerciseId")}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Fase Principal</CardTitle>
              <CardDescription>Selecciona hasta 4 ejercicios para la fase principal.</CardDescription>
            </CardHeader>
            <CardContent>
               <FormField
                control={form.control}
                name="mainExerciseIds"
                render={() => (
                  <FormItem>
                    {renderExerciseList(principalEjercicios, loadingEjercicios.principal, "mainExerciseIds", true)}
                     <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Fase Final: Vuelta a la Calma</CardTitle>
              <CardDescription>Selecciona 1 ejercicio para la vuelta a la calma.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="coolDownExerciseId"
                render={() => (
                  <FormItem>
                    {renderExerciseList(vueltaCalmaEjercicios, loadingEjercicios.vueltaCalma, "coolDownExerciseId")}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Detalles de la Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="sessionTitle" render={({ field }) => (
                  <FormItem><FormLabel>Título de la Sesión</FormLabel><FormControl><Input placeholder="Ej: Sesión de Técnica Individual" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="numero_sesion" render={({ field }) => (
                    <FormItem><FormLabel>Número de Sesión (Opcional)</FormLabel><FormControl><Input placeholder="Ej: 16" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="fecha" render={({ field }) => (
                    <FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="temporada" render={({ field }) => (
                    <FormItem><FormLabel>Temporada (Opcional)</FormLabel><FormControl><Input placeholder="Ej: 2024-2025" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="club" render={({ field }) => (
                    <FormItem><FormLabel>Club (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Futsal Club Elite" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="equipo" render={({ field }) => (
                    <FormItem><FormLabel>Equipo (Opcional)</FormLabel><FormControl><Input placeholder="Ej: Senior Masculino A" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-lg" disabled={isSaving || Object.values(loadingEjercicios).some(l => l)}>
            {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            Guardar Sesión Manual
          </Button>
        </form>
      </Form>
    </div>
  );
}
