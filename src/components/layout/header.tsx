
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { LogIn, LogOut, UserPlus, Edit3, BookUser, Menu, Heart, ShieldCheck, FileText, CalendarDays, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from 'react';

const FutsalAppIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 1.6a10.4 10.4 0 1 0 0 20.8 10.4 10.4 0 0 0 0-20.8z"/>
    <path d="M12 1.6a10.4 10.4 0 0 0-7.35 3.05M12 1.6a10.4 10.4 0 0 1 7.35 3.05M1.6 12a10.4 10.4 0 0 0 3.05 7.35M1.6 12a10.4 10.4 0 0 1 3.05-7.35M22.4 12a10.4 10.4 0 0 0-3.05-7.35M22.4 12a10.4 10.4 0 0 1-3.05 7.35M12 22.4a10.4 10.4 0 0 0 7.35-3.05M12 22.4a10.4 10.4 0 0 1-7.35-3.05"/>
    <path d="M5.75 5.75l3.5 3.5M14.75 5.75l-3.5 3.5M5.75 14.75l-3.5-3.5M14.75 14.75l-3.5-3.5"/>
  </svg>
);


export default function Header() {
  const { user, signOut, loading, isAdmin } = useAuth();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const navLinks = [
    { href: '/ejercicios', label: 'Ver ejercicios', icon: <FileText className="mr-2 h-4 w-4" /> },
    { href: '/crear-sesion-manual', label: 'Crear Sesión', icon: <Edit3 className="mr-2 h-4 w-4" /> },
    { href: '/mis-sesiones', label: 'Mis Sesiones', icon: <BookUser className="mr-2 h-4 w-4" /> },
    { href: '/calendario', label: 'Calendario', icon: <CalendarDays className="mr-2 h-4 w-4" /> },
    { href: '/favoritos', label: 'Favoritos', icon: <Heart className="mr-2 h-4 w-4" /> },
    { href: '/suscripcion', label: 'Suscripción', icon: <Star className="mr-2 h-4 w-4" /> },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Panel Admin', icon: <ShieldCheck className="mr-2 h-4 w-4" /> }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <FutsalAppIcon className="h-6 w-6" />
          <span className="text-xl font-bold font-headline">FutsalDex</span>
        </Link>
        <nav className="hidden items-center space-x-1 md:flex">
          {navLinks.map((link) => (
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
          {isMounted && isAdmin && adminLinks.map((link) => (
            <Button
              key={link.href}
              variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'}
              asChild
              className={pathname.startsWith(link.href) ? 'text-red-500 bg-red-100 hover:bg-red-200' : 'hover:bg-primary/80 text-red-300'}
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
          {/* Auth Content */}
          {!isMounted || loading ? (
             <div className="h-8 w-20 animate-pulse rounded-md bg-primary/50" />
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full hover:bg-primary/80">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || `https://placehold.co/40x40.png?text=${user.email?.[0]?.toUpperCase() ?? 'U'}`} alt={user.displayName || user.email || "Usuario"} data-ai-hint="user avatar"/>
                    <AvatarFallback>{user.email?.[0]?.toUpperCase() ?? 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                    {user.displayName && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                    {isAdmin && <p className="text-xs leading-none text-red-500 font-semibold">Admin</p>}
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
                <Link href="/login"><span className="flex items-center"><LogIn className="mr-2 h-4 w-4" /> Iniciar Sesión</span></Link>
              </Button>
              <Button variant="secondary" asChild className="hidden md:flex bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/register"><span className="flex items-center"><UserPlus className="mr-2 h-4 w-4" /> Registrarse</span></Link>
              </Button>
            </>
          )}

          {/* Mobile Menu */}
          <div className="inline-flex md:hidden">
            {isMounted && (
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="hover:bg-primary/80">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {navLinks.map((link) => ( 
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href}>
                        <span className="flex items-center">
                          {link.icon}
                          {link.label}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  {isAdmin && adminLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href}>
                        <span className="flex items-center text-red-500">
                          {link.icon}
                          {link.label}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  {!user && !loading ? (
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
                  ) : (
                     user && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Cerrar sesión</span>
                        </DropdownMenuItem>
                      </>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
