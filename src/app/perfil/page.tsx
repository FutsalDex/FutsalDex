
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, UserCircle, Shield, Star, CalendarOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { passwordChangeSchema } from "@/lib/schemas";
import { Badge } from "@/components/ui/badge";

function PerfilPageContent() {
  const { user, changePassword, error: authError, clearError, isSubscribed, isAdmin, subscriptionType, subscriptionEnd } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof passwordChangeSchema>>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof passwordChangeSchema>) {
    setIsLoading(true);
    clearError();
    const success = await changePassword(values.currentPassword, values.newPassword);
    setIsLoading(false);
    
    if (success) {
      toast({
        title: "Contraseña Actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente.",
      });
      form.reset();
    }
  }
  
  const formatDate = (date: Date | null) => {
    if (!date) return 'No especificada';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  };
  
  const getSubscriptionBadgeVariant = (type: string | null) => {
      switch (type) {
          case 'Pro': return 'destructive';
          case 'Básica': return 'default';
          case 'Prueba': return 'secondary';
          default: return 'outline';
      }
  };


  return (
    <div className="container mx-auto max-w-2xl px-4 py-8 md:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-1 font-headline flex items-center">
            <UserCircle className="mr-3 h-8 w-8"/>
            Mi Perfil
        </h1>
        <p className="text-lg text-foreground/80">
            Gestiona la información de tu cuenta y tu suscripción.
        </p>
      </header>
      
      <Card className="mb-8">
        <CardHeader>
            <CardTitle>Información del Usuario</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-1">
                <Label>Correo Electrónico</Label>
                <p className="font-semibold text-foreground">{user?.email}</p>
            </div>
            <div className="space-y-1">
                <Label>Rol</Label>
                <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="font-semibold text-foreground">{isAdmin ? 'Administrador' : 'Usuario'}</p>
                </div>
            </div>
             <div className="space-y-1">
                <Label>Suscripción</Label>
                <div className="flex items-center">
                   <Star className="h-4 w-4 mr-2 text-muted-foreground" />
                   <Badge variant={getSubscriptionBadgeVariant(subscriptionType)}>{subscriptionType || 'Sin Suscripción'}</Badge>
                </div>
            </div>
            {isSubscribed && subscriptionEnd && (
                <div className="space-y-1">
                    <Label>Fecha de Vencimiento</Label>
                    <div className="flex items-center">
                        <CalendarOff className="h-4 w-4 mr-2 text-muted-foreground" />
                        <p className="font-semibold text-foreground">{formatDate(subscriptionEnd)}</p>
                    </div>
                </div>
            )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>
            Para cambiar tu contraseña, introduce tu contraseña actual seguida de la nueva.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error al Cambiar Contraseña</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña Actual</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input type={showCurrentPassword ? "text" : "password"} {...field} />
                      </FormControl>
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                        {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nueva Contraseña</FormLabel>
                     <div className="relative">
                      <FormControl>
                        <Input type={showNewPassword ? "text" : "password"} {...field} />
                      </FormControl>
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setShowNewPassword(!showNewPassword)}>
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nueva Contraseña</FormLabel>
                     <div className="relative">
                      <FormControl>
                        <Input type={showConfirmPassword ? "text" : "password"} {...field} />
                      </FormControl>
                      <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Nueva Contraseña
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PerfilPage() {
    return (
        <AuthGuard>
            <PerfilPageContent />
        </AuthGuard>
    );
}
