
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is no longer used. Redirect to the main history page.
export default function EstadisticasRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/estadisticas/historial');
    }, [router]);

    return null; // Render nothing while redirecting
}
