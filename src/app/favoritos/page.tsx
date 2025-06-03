
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Heart, ListChecks } from "lucide-react";

function FavoritosPageContent() {
  const { user } = useAuth();
  // Lógica para obtener y mostrar ejercicios favoritos (a implementar)
  const favoritos = []; // Placeholder

  if (favoritos.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardHeader>
          <Heart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <CardTitle className="text-2xl font-headline">No Tienes Favoritos</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-6">
            Aún no has marcado ningún ejercicio como favorito. ¡Explora la biblioteca y guarda los que más te gusten!
          </CardDescription>
          <Button asChild>
            <Link href="/ejercicios">
              <ListChecks className="mr-2 h-4 w-4" /> Ir a Ejercicios
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      {/* Aquí se listarían los ejercicios favoritos */}
      <p className="text-muted-foreground">
        (Listado de ejercicios favoritos en desarrollo)
      </p>
    </div>
  );
}

export default function FavoritosPage() {
  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8 md:px-6">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2 font-headline">Mis Ejercicios Favoritos</h1>
          <p className="text-lg text-foreground/80">
            Aquí encontrarás todos los ejercicios que has marcado como favoritos.
          </p>
        </header>
        <FavoritosPageContent />
      </div>
    </AuthGuard>
  );
}
