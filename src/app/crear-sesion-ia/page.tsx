
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { aiSessionSchema } from "@/lib/schemas";
import { useState } from "react";
import { generateTrainingSession, type GenerateTrainingSessionOutput } from "@/ai/flows/generate-training-session";
import { Loader2, Wand2, Save, Info } from "lucide-react";
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function CrearSesionIAPage() {
  return (
    // AuthGuard removed to allow guest access
    <CrearSesionIAContent />
  );
}

function CrearSesionIAContent() {
  const { user, isRegisteredUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedSession, setGeneratedSession] = useState<GenerateTrainingSessionOutput | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<z.infer<typeof aiSessionSchema>>({
    resolver: zodResolver(aiSessionSchema),
    defaultValues: {
      teamDescription: "",
      trainingGoals: "",
      sessionFocus: "",
      preferredSessionLengthMinutes: 60,
      numero_sesion: "",
      fecha: new Date().toISOString().split('T')[0], 
      temporada: "",
      club: "",
      equipo: "",
    },
  });

  const watchedTeamDescription = form.watch("teamDescription");

  async function onSubmit(values: z.infer<typeof aiSessionSchema>) {
    setIsLoading(true);
    setGeneratedSession(null);
    try {
      const sessionPlan = await generateTrainingSession({
        teamDescription: values.teamDescription,
        trainingGoals: values.trainingGoals,
        sessionFocus: values.sessionFocus,
        preferredSessionLengthMinutes: values.preferredSessionLengthMinutes,
      });
      setGeneratedSession(sessionPlan);
      toast({
        title: "¡Sesión Generada!",
        description: "Tu plan de entrenamiento ha sido creado por la IA.",
      });
    } catch (error: any) {
      console.error("Error generating AI session:", error);
      let description = "Hubo un problema al contactar la IA. Inténtalo de nuevo más tarde.";
      if (error.message && (error.message.includes("503") || error.message.toLowerCase().includes("overloaded") || error.message.toLowerCase().includes("service unavailable"))) {
        description = "El servicio de IA está experimentando mucha demanda en este momento. Por favor, inténtalo de nuevo en unos minutos.";
      }
      toast({
        title: "Error al Generar Sesión",
        description: description,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }

  async function handleSaveSession() {
    if (!generatedSession || !user || !isRegisteredUser) return; // Ensure user is registered
    setIsSaving(true);
    const sessionDataToSave = {
      userId: user.uid,
      type: "AI",
      ...form.getValues(), 
      ...generatedSession, 
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "mis_sesiones"), sessionDataToSave);
      toast({
        title: "¡Sesión Guardada!",
        description: "Tu sesión de entrenamiento ha sido guardada en 'Mis Sesiones'.",
      });
      setGeneratedSession(null); 
      form.reset();
    } catch (error) {
      console.error("Error saving session:", error);
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  }


  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Crear Sesión con IA</h1>
        <p className="text-lg text-foreground/80">
          Define los parámetros y deja que nuestra IA genere un plan de entrenamiento de futsal a medida.
        </p>
      </header>

      {!isRegisteredUser && (
        <Alert variant="default" className="mb-6 bg-accent/10 border-accent">
          <Info className="h-5 w-5 text-accent" />
          <AlertTitle className="font-headline text-accent">Modo Invitado</AlertTitle>
          <AlertDescription className="text-accent/90">
            Como invitado, puedes generar una sesión de entrenamiento con IA.
            Para guardar tus sesiones y acceder a todas las funciones, por favor{" "}
            <Link href="/register" className="font-bold underline hover:text-accent/70">
              regístrate
            </Link>
            .
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Parámetros de la Sesión</CardTitle>
            <CardDescription>Completa los detalles para que la IA cree tu entrenamiento.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="teamDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción del Equipo</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ej: Equipo amateur, jugadores con 2 años de experiencia, buena condición física pero necesitan mejorar táctica." {...field} />
                      </FormControl>
                      {!(watchedTeamDescription && watchedTeamDescription.length > 0) && <FormDescription>Nivel, experiencia, fortalezas, debilidades.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="trainingGoals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Objetivos del Entrenamiento</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Ej: Mejorar pases en corto, aumentar potencia de disparo, trabajar la presión alta." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sessionFocus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Enfoque de la Sesión</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Ataque, Defensa, Transiciones, Balón parado" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="preferredSessionLengthMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duración Preferida (minutos)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="60" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} value={field.value} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <h3 className="text-lg font-semibold pt-4 border-t mt-6">Detalles Adicionales (Opcional para Guardar)</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="numero_sesion" render={({ field }) => (
                        <FormItem><FormLabel>Número de Sesión</FormLabel><FormControl><Input placeholder="Ej: 15" {...field} /></FormControl><FormMessage /></FormItem>
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

                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Generar Sesión con IA
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full md:min-h-[500px] p-8 rounded-lg bg-background shadow-lg">
            <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
            <p className="text-lg font-semibold">Generando tu sesión de entrenamiento...</p>
            <p className="text-sm text-muted-foreground">Esto puede tardar unos momentos.</p>
          </div>
        )}

        {generatedSession && !isLoading && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl text-accent">{generatedSession.sessionTitle}</CardTitle>
              <CardDescription>Plan de entrenamiento generado por IA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Calentamiento:</h3>
                <p className="text-sm text-foreground/80">{generatedSession.warmUp}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ejercicios Principales:</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/80">
                  {generatedSession.mainExercises.map((ex, index) => <li key={index}>{ex}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Vuelta a la Calma:</h3>
                <p className="text-sm text-foreground/80">{generatedSession.coolDown}</p>
              </div>
              <div>
                <h3 className="font-semibold text-lg">Notas del Entrenador:</h3>
                <p className="text-sm text-foreground/80">{generatedSession.coachNotes}</p>
              </div>
              {isRegisteredUser && (
                <Button onClick={handleSaveSession} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-6" disabled={isSaving || !isRegisteredUser}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Sesión
                </Button>
              )}
              {!isRegisteredUser && (
                 <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-6" disabled>
                  <Save className="mr-2 h-4 w-4" />
                  Regístrate para Guardar
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
