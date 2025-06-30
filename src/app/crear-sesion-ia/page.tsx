
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { SubscriptionGuard } from "@/components/subscription-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Bot, Wand2, Loader2, Save, Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { aiSessionSchema } from "@/lib/schemas";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateSession, type GeneratedSessionOutput, type GenerateSessionInput } from "@/ai/flows/generate-session-flow";
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";


type AiSessionFormValues = Zod.infer<typeof aiSessionSchema>;

function AiSessionGeneratorPageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedSession, setGeneratedSession] = useState<GeneratedSessionOutput | null>(null);
  const [sessionDetails, setSessionDetails] = useState<Partial<AiSessionFormValues> | null>(null);

  const form = useForm<AiSessionFormValues>({
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

  const onSubmit = async (values: AiSessionFormValues) => {
    setIsLoading(true);
    setError(null);
    setGeneratedSession(null);
    setSessionDetails(null);

    const aiInput: GenerateSessionInput = {
      teamDescription: values.teamDescription,
      trainingGoals: values.trainingGoals,
      sessionFocus: values.sessionFocus,
      preferredSessionLengthMinutes: values.preferredSessionLengthMinutes,
    };

    try {
      const result = await generateSession(aiInput);
      setGeneratedSession(result);
      setSessionDetails({
        numero_sesion: values.numero_sesion,
        fecha: values.fecha,
        temporada: values.temporada,
        club: values.club,
        equipo: values.equipo,
      });
    } catch (e: any) {
      console.error("Error generating AI session:", e);
      setError("No se pudo generar la sesión. Por favor, intenta ajustar tu petición o inténtalo de nuevo más tarde.");
      toast({
        title: "Error de la IA",
        description: "Hubo un problema al generar la sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSession = async () => {
    if (!generatedSession || !user) return;
    setIsSaving(true);
    
    const sessionDataToSave = {
        userId: user.uid,
        type: "AI" as "AI",
        sessionTitle: `Sesión IA - ${sessionDetails?.fecha || new Date().toLocaleDateString('es-ES')}`,
        ...generatedSession, // warmUp, mainExercises, coolDown, coachNotes
        ...sessionDetails, // numero_sesion, fecha, etc.
        createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "mis_sesiones"), sessionDataToSave);
      toast({
        title: "¡Sesión Guardada!",
        description: "Tu sesión generada por IA se ha guardado en 'Mis Sesiones'.",
      });
      setGeneratedSession(null);
      setSessionDetails(null);
      form.reset({
        teamDescription: "",
        trainingGoals: "",
        sessionFocus: "",
        preferredSessionLengthMinutes: 60,
        numero_sesion: "",
        fecha: new Date().toISOString().split('T')[0],
        temporada: "",
        club: "",
        equipo: "",
      });
      router.push('/mis-sesiones');
    } catch (e: any) {
      console.error("Error saving AI session:", e);
      toast({
        title: "Error al Guardar",
        description: "No se pudo guardar la sesión. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-primary mb-2 font-headline flex items-center">
          <Bot className="mr-3 h-10 w-10" />
          Generador de Sesiones con IA
        </h1>
        <p className="text-lg text-foreground/80">
          Describe tus necesidades y deja que la IA cree un plan de entrenamiento completo y personalizado para tu equipo.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Wand2 className="mr-2 h-5 w-5 text-primary" />
              1. Define los Parámetros
            </CardTitle>
            <CardDescription>
              Proporciona la información que la IA necesita para diseñar la sesión.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="teamDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción del Equipo</FormLabel>
                    <FormControl><Textarea placeholder="Ej: Equipo cadete (14-15 años), nivel intermedio, con buena técnica pero problemas en la toma de decisiones bajo presión." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="trainingGoals" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objetivos del Entrenamiento</FormLabel>
                    <FormControl><Textarea placeholder="Ej: Mejorar la velocidad de circulación del balón y crear superioridades numéricas en ataque." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="sessionFocus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Foco Principal de la Sesión</FormLabel>
                     <FormControl><Input placeholder="Ej: Transiciones ataque-defensa, Posesión, Finalización" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="preferredSessionLengthMinutes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duración de la Sesión: {field.value} minutos</FormLabel>
                    <FormControl>
                        <Slider
                            min={15} max={180} step={5}
                            defaultValue={[field.value]}
                            onValueChange={(value) => field.onChange(value[0])}
                        />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="font-headline text-lg">Detalles Adicionales (Opcional)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <FormField control={form.control} name="numero_sesion" render={({ field }) => (<FormItem><FormLabel>Nº Sesión</FormLabel><FormControl><Input placeholder="Ej: 25" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="fecha" render={({ field }) => (<FormItem><FormLabel>Fecha</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="temporada" render={({ field }) => (<FormItem><FormLabel>Temporada</FormLabel><FormControl><Input placeholder="Ej: 2024-2025" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="club" render={({ field }) => (<FormItem><FormLabel>Club</FormLabel><FormControl><Input placeholder="Ej: Mi Club FS" {...field} /></FormControl></FormItem>)} />
                        <FormField control={form.control} name="equipo" render={({ field }) => (<FormItem><FormLabel>Equipo</FormLabel><FormControl><Input placeholder="Ej: Cadete A" {...field} /></FormControl></FormItem>)} />
                    </CardContent>
                </Card>

                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground py-3 text-lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                  {isLoading ? 'Generando Sesión...' : 'Generar Sesión con IA'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-accent" />
              2. Resultado Generado
            </CardTitle>
            <CardDescription>
              Aquí aparecerá la sesión de entrenamiento creada por la IA.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">La IA está trabajando...</p>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {generatedSession && (
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-bold text-primary">Calentamiento</h3>
                  <p className="whitespace-pre-wrap">{generatedSession.warmUp}</p>
                </div>
                <div>
                  <h3 className="font-bold text-primary">Ejercicios Principales</h3>
                  {generatedSession.mainExercises.map((ex, i) => (
                    <p key={i} className="whitespace-pre-wrap border-b pb-2 mb-2">{ex}</p>
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-primary">Vuelta a la Calma</h3>
                  <p className="whitespace-pre-wrap">{generatedSession.coolDown}</p>
                </div>
                 <div>
                  <h3 className="font-bold text-primary">Notas para el Entrenador</h3>
                  <p className="whitespace-pre-wrap">{generatedSession.coachNotes}</p>
                </div>
              </div>
            )}
          </CardContent>
          {generatedSession && (
            <CardFooter>
              <Button onClick={handleSaveSession} className="w-full" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSaving ? "Guardando..." : "Guardar Sesión en 'Mis Sesiones'"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function AiSessionGeneratorPage() {
    return (
        <AuthGuard>
            <SubscriptionGuard>
                <AiSessionGeneratorPageContent />
            </SubscriptionGuard>
        </AuthGuard>
    );
}
