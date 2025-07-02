
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
import { useState, useEffect, useMemo, useCallback } from "react";
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
import { useRouter } from "next/navigation";
import { ToastAction } from "@/components/ui/toast";
import { ArrowRight } from "lucide-react";


export default function CrearSesionManualRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/crear-sesion');
    }, [router]);

    return (
        <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                    <CardTitle className="text-2xl font-headline text-primary">Redirigiendo...</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription>
                        Esta página se ha movido. Te estamos redirigiendo a la nueva ubicación.
                    </CardDescription>
                    <Button asChild variant="outline" className="mt-4">
                        <Link href="/crear-sesion">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Ir Ahora
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
