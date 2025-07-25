import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from "@/components/ui/toaster";
import Header from '@/components/layout/header'; // Assuming Header component will be created

export const metadata: Metadata = {
  title: 'FutsalDex',
  description: 'Tu compañero definitivo para el entrenamiento de fútbol sala.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <Providers>
          <Header />
          <main className="pt-16"> {/* Add padding to offset fixed header */}
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
