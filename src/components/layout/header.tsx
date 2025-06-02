
"use client";

import Link from 'next/link';
import type { usePathname } from 'next/navigation'; // Import type
import { usePathname as usePathnameActual } from 'next/navigation'; // Import actual
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { LogIn, LogOut, UserPlus, Dumbbell, Sparkles, Edit3, BookUser, Menu } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FutsalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1.6a10.4 10.4 0 1 0 0 20.8 10.4 10.4 0 0 0 0-20.8z"/>
    <path d="M12 1.6a10.4 10.4 0 0 0-7.35 3.05M12 1.6a10.4 10.4 0 0 1 7.35 3.05M1.6 12a10.4 10.4 0 0 0 3.05 7.35M1.6 12a10.4 10.4 0 0 1 3.05-7.35M22.4 12a10.4 10.4 0 0 0-3.05-7.35M22.4 12a10.4 10.4 0 0 1-3.05 7.35M12 22.4a10.4 10.4 0 0 0 7.35-3.05M12 22.4a10.4 10.4 0 0 1-7.35-3.05"/>
    <path d="M5.75 5.75l3.5 3.5M14.75 5.75l-3.5 3.5M5.75 14.75l3.5-3.5M14.75 14.75l-3.5-3.5"/>
  </svg>
);


export default function Header() {
  const { user, signOut, loading, isRegisteredUser } = useAuth();
  const pathname = usePathnameActual();

  const navLinks = [
    { href: '/ejercicios', label: 'Ver ejercicios', icon: <Dumbbell className="mr-2 h-4 w-4" />, guestAllowed: true },
    { href: '/crear-sesion-manual', label: 'Crear sesiones (Manual)', icon: <Edit3 className="mr-2 h-4 w-4" />, guestAllowed: false },
    { href: '/crear-sesion-ia', label: 'Crear sesiones (IA)', icon: <Sparkles className="mr-2 h-4 w-4" />, guestAllowed: false },
    { href: '/mis-sesiones', label: 'Mis Sesiones', icon: <BookUser className="mr-2 h-4 w-4" />, guestAllowed: false },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <FutsalIcon />
          <span className="text-xl font-bold font-headline">FutsalDex</span>
        </Link>
        <nav className="hidden items-center space-x-2 md:flex">
          {navLinks.map((link) =>
            (link.guestAllowed || isRegisteredUser) && (
            <Button
              key={link.href}
              variant={pathname === link.href ? 'secondary' : 'ghost'}
              asChild
              className={pathname === link.href ? 'text-primary-foreground bg-primary/80 hover:bg-primary/70' : 'hover:bg-primary/80'}
            >
              <Link href={link.href}>
                <span className="flex items-center">
                  {link.icon}
                  {link.label}
                </span>
              </Link>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-primary/50" />
          ) : user ? (
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-primary/80">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || `https://placehold.co/40x40.png?text=${user.email?.[0]?.toUpperCase() ?? 'U'}`} alt={user.displayName || user.email || "Usuario"} data-ai-hint="user avatar" />
                    <AvatarFallback>{user.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                    {user.displayName && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden md:flex hover:bg-primary/80">
                <Link href="/login">
                  <span className="flex items-center">
                    <LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión
                  </span>
                </Link>
              </Button>
              <Button variant="secondary" asChild className="hidden md:flex bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/register">
                  <span className="flex items-center">
                    <UserPlus className="mr-2 h-4 w-4" /> Registrarse
                  </span>
                </Link>
              </Button>
            </>
          )}
           {/* Mobile Menu Trigger */}
          <div className="inline-flex md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-primary/80">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navLinks.map((link) =>
                  (link.guestAllowed || isRegisteredUser) && (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href}>
                      <span className="flex items-center">
                        {link.icon}
                        {link.label}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
                {/* Separador y enlaces de autenticación para el menú móvil */}
                {!user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/login">
                        <span className="flex items-center">
                          <LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión
                        </span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                       <Link href="/register">
                        <span className="flex items-center">
                          <UserPlus className="mr-2 h-4 w-4" /> Registrarse
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                 {user && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar sesión</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
