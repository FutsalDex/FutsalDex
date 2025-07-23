
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, LifeBuoy, Send, Loader2, Bot, User, Info } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { askCoach, type SupportChatInput } from "@/ai/flows/support-chat-flow";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getFirebaseDb } from "@/lib/firebase";
import { doc, getDoc, collection, query, orderBy, limit } from "firebase/firestore";
import type { Message } from "genkit";


interface ClientMessage {
  sender: 'user' | 'ai';
  text: string;
}

const initialMessage: ClientMessage = { sender: 'ai', text: `¡Hola! Soy tu entrenador online de FutsalDex. ¿En qué puedo ayudarte hoy? Pregúntame sobre ejercicios, planificación de sesiones, tácticas, o cualquier otra duda que tengas.` };

function SoportePageContent() {
  const { user, isRegisteredUser, isSubscribed, isAdmin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [messages, setMessages] = useState<ClientMessage[]>([initialMessage]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [chatId, setChatId] = useState<string | null>(null);
  const [guestQuestionCount, setGuestQuestionCount] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // --- Fetch Chat History ---
  const fetchHistory = useCallback(async () => {
    if (!user) {
      setIsHistoryLoading(false);
      return;
    }
    setIsHistoryLoading(true);

    try {
        const db = getFirebaseDb();
        const chatsRef = collection(db, 'support_chats');
        const q = query(chatsRef, where('userId', '==', user.uid), orderBy('updatedAt', 'desc'), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const lastChatDoc = querySnapshot.docs[0];
            const chatData = lastChatDoc.data();
            setChatId(lastChatDoc.id);

            const historyMessages: ClientMessage[] = chatData.messages.map((msg: any) => ({
                sender: msg.role === 'model' || msg.role === 'ai' ? 'ai' : 'user',
                text: msg.content,
            }));
            
            setMessages([initialMessage, ...historyMessages]);
        }
    } catch (error) {
        console.error("Error fetching chat history:", error);
        toast({ title: "Error", description: "No se pudo cargar tu historial de chat.", variant: "destructive" });
    } finally {
        setIsHistoryLoading(false);
    }
  }, [user, toast]);
  
  useEffect(() => {
      if (isRegisteredUser) {
          fetchHistory();
      } else {
          setIsHistoryLoading(false);
      }
  }, [isRegisteredUser, fetchHistory]);


  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const guestLimitReached = !isRegisteredUser && guestQuestionCount >= 3;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const messageText = inputValue.trim();
    if (!messageText || isSending) return;

    if (!isRegisteredUser) {
        if (guestLimitReached) {
            toast({ title: "Límite de preguntas alcanzado", description: "Para seguir chateando con el Entrenador IA, por favor regístrate.", action: <ToastAction altText="Registrarse" onClick={() => router.push('/register')}>Registrarse</ToastAction> });
            return;
        }
    } else if (!isSubscribed && !isAdmin) {
        toast({ title: "Suscripción Requerida", description: "Necesitas una suscripción Pro para usar el soporte con IA.", action: <ToastAction altText="Suscribirse" onClick={() => router.push('/suscripcion')}>Suscribirse</ToastAction> });
        return;
    }
    
    if (!user && isRegisteredUser) return;

    setIsSending(true);
    setInputValue("");
    
    const newMessages: ClientMessage[] = [...messages, { sender: 'user', text: messageText }];
    setMessages(newMessages);

    if (!isRegisteredUser) {
        setGuestQuestionCount(prev => prev + 1);
    }
    
    const historyForAi: Message[] = newMessages
      .slice(1) // Remove initial AI greeting
      .map(msg => ({
        role: msg.sender === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      }));


    try {
      const input: SupportChatInput = { 
        question: messageText,
        chatId: isRegisteredUser ? chatId : null, 
        userId: user?.uid || "guest-user",
        history: historyForAi,
      };

      const response = await askCoach(input);
      setMessages(prev => [...prev, { sender: 'ai', text: response.answer }]);
      
      if (isRegisteredUser && !chatId) {
        setChatId(response.chatId);
      }

    } catch (error) {
      console.error("Error asking AI coach:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: "Lo siento, estoy teniendo problemas para conectarme en este momento." }]);
      toast({
        title: "Error del Entrenador AI",
        description: "Hubo un problema al contactar con el entrenador. Por favor, inténtalo de nuevo más tarde.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            Volver al Panel
          </Link>
        </Button>
      </header>
      
      <Card className="shadow-lg max-w-3xl mx-auto h-[70vh] flex flex-col">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Chat con el Entrenador Online</CardTitle>
          <CardDescription>Resuelve tus dudas en tiempo real con nuestra IA experta en futsal.</CardDescription>
        </CardHeader>
        {!isRegisteredUser && (
            <div className="px-6 pb-4">
                <Alert variant="default" className="bg-accent/10 border-accent">
                    <Info className="h-5 w-5 text-accent" />
                    <AlertTitle className="font-headline text-accent">Modo Invitado</AlertTitle>
                    <AlertDescription className="text-accent/90">
                        Como invitado, puedes hacer hasta <strong>3 preguntas</strong> al entrenador IA para probar la funcionalidad.{" "}
                        <Link href="/register" className="font-bold underline hover:text-accent/70">
                            Regístrate
                        </Link>{" "}para preguntas ilimitadas.
                    </AlertDescription>
                </Alert>
            </div>
        )}
        <CardContent className="flex-grow overflow-hidden p-0">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
             <div className="p-6 space-y-4">
              {isHistoryLoading ? (
                 <div className="flex justify-center items-center h-full">
                   <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 </div>
              ) : (
                <>
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
                          <AvatarFallback>{user?.email?.[0]?.toUpperCase() ?? 'I'}</AvatarFallback>
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
                </>
              )}
             </div>
          </ScrollArea>
        </CardContent>
        <div className="p-4 border-t">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={guestLimitReached ? "Regístrate para seguir chateando" : "Escribe tu pregunta aquí..."}
              autoComplete="off"
              disabled={isSending || isHistoryLoading || guestLimitReached || (isRegisteredUser && (!isSubscribed && !isAdmin))}
            />
            <Button type="submit" size="icon" disabled={isSending || isHistoryLoading || !inputValue.trim() || guestLimitReached || (isRegisteredUser && (!isSubscribed && !isAdmin))}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
           {!isRegisteredUser && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    Preguntas restantes: {Math.max(0, 3 - guestQuestionCount)} de 3.
                </p>
            )}
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
