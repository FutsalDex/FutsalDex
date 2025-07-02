
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, LifeBuoy, Send, Loader2, Bot, User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { askCoach } from "@/ai/flows/support-chat-flow";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";


interface Message {
  sender: 'user' | 'ai';
  text: string;
}

function SoportePageContent() {
  const { user, isRegisteredUser, isSubscribed, isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: `¡Hola! Soy tu entrenador online de FutsalDex. ¿En qué puedo ayudarte hoy? Pregúntame sobre ejercicios, planificación de sesiones, tácticas, o cualquier otra duda que tengas.` }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);


  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRegisteredUser) {
        toast({ title: "Acción Requerida", description: "Debes iniciar sesión para chatear con el soporte.", action: <ToastAction altText="Iniciar Sesión" onClick={() => router.push('/login')}>Iniciar Sesión</ToastAction> });
        return;
    }
    if (!isSubscribed && !isAdmin) {
        toast({ title: "Suscripción Requerida", description: "Necesitas una suscripción Pro para usar el soporte con IA.", action: <ToastAction altText="Suscribirse" onClick={() => router.push('/suscripcion')}>Suscribirse</ToastAction> });
        return;
    }
    
    const messageText = inputValue.trim();
    if (!messageText || isSending || !user) return;

    setIsSending(true);
    setInputValue("");
    
    // Optimistically update UI with user's message
    setMessages(prev => [...prev, { sender: 'user', text: messageText }]);

    try {
      const response = await askCoach({ 
        question: messageText,
        chatId: chatId, // Will be null for the first message
        userId: user.uid,
      });

      // Update UI with AI response
      setMessages(prev => [...prev, { sender: 'ai', text: response.answer }]);
      
      // Set the chat ID for subsequent messages if it's the first message
      if (!chatId) {
        setChatId(response.chatId);
      }

    } catch (error) {
      console.error("Error asking AI coach:", error);
      toast({
        title: "Error del Entrenador AI",
        description: "Hubo un problema al contactar con el entrenador. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive"
      });
      // Add an error message to the chat UI
      setMessages(prev => [...prev, { sender: 'ai', text: "Lo siento, estoy teniendo problemas para conectarme en este momento." }]);
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
            <LifeBuoy className="mr-3 h-8 w-8"/>
            Soporte Técnico
          </h1>
          <p className="text-lg text-foreground/80">
            Contacta con nuestro entrenador online para cualquier duda sobre ejercicios, sesiones, etc.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/mi-equipo">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Mi Equipo
          </Link>
        </Button>
      </header>
      
      <Card className="shadow-lg max-w-3xl mx-auto h-[70vh] flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Chat con el Entrenador Online</CardTitle>
          <CardDescription>Resuelve tus dudas en tiempo real con nuestra IA experta en futsal.</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-0">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
             <div className="p-6 space-y-4">
              {messages.map((message, index) => (
                <div key={index} className={cn("flex items-start gap-3", message.sender === 'user' ? "justify-end" : "justify-start")}>
                  {message.sender === 'ai' && (
                    <Avatar className="h-8 w-8">
                       <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                  )}
                  <div className={cn("max-w-xs md:max-w-md p-3 rounded-lg text-sm", message.sender === 'user' ? "bg-primary text-primary-foreground" : "bg-muted")}>
                    <p className="whitespace-pre-wrap">{message.text}</p>
                  </div>
                   {message.sender === 'user' && (
                     <Avatar className="h-8 w-8">
                       <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'U'} />
                       <AvatarFallback>{user?.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isSending && (
                 <div className="flex items-start gap-3 justify-start">
                    <Avatar className="h-8 w-8">
                       <AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                    <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-muted flex items-center">
                       <Loader2 className="h-5 w-5 animate-spin"/>
                    </div>
                 </div>
              )}
             </div>
          </ScrollArea>
        </CardContent>
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Escribe tu pregunta aquí..."
              autoComplete="off"
              disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={isSending || !inputValue.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}

export default function SoportePage() {
  return (
    <SoportePageContent />
  );
}
