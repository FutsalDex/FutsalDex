
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CalendarioRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/mi-equipo');
    }, [router]);

    return (
        <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                    <CardTitle className="text-2xl font-headline text-primary">Funcionalidad Movida</CardTitle>
                </CardHeader>
                <CardContent>
                    <CardDescription>
                        La funcionalidad del calendario ha sido eliminada. Te estamos redirigiendo al panel de "Mi Equipo".
                    </CardDescription>
                    <Button asChild variant="outline" className="mt-4">
                        <Link href="/mi-equipo">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Ir Ahora
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
