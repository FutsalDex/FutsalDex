"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";


export default function ManageExercisesRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/admin');
    }, [router]);

    return (
        <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                    <CardTitle className="text-2xl font-headline text-primary">Página Eliminada</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription>
                        Esta página ha sido eliminada. Redirigiendo al panel de administración...
                    </CardDescription>
                    <Button asChild variant="outline" className="mt-4">
                        <Link href="/admin">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Ir Ahora
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
