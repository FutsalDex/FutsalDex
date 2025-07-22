
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// This page is no longer used. Redirect to the main history page.
export default function EstadisticasRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/estadisticas/historial');
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
}
