
"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { LogIn, LogOut, UserPlus, Edit3, BookUser, Menu, Heart, ShieldCheck, FileText, Star, Users, UserCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useRef } from 'react';
import { trackPageView } from '@/lib/actions/user-actions';
import { Loader2 } from 'lucide-react';

export default function Header() {
  const { user, signOut, isAdmin, loading } = useAuth();
  const pathname = usePathname();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (user && pathname !== lastTrackedPath.current) {
      trackPageView({ userId: user.uid, pathname });
      lastTrackedPath.current = pathname;
    }
  }, [user, pathname]);

  const navLinks = [
    { href: '/ejercicios', label: 'Ver ejercicios', icon: <FileText className="mr-2 h-4 w-4" /> },
    { href: '/crear-sesion', label: 'Crear Sesión', icon: <Edit3 className="mr-2 h-4 w-4" /> },
    { href: '/mi-equipo', label: 'Mi Equipo', icon: <Users className="mr-2 h-4 w-4" /> },
    { href: '/favoritos', label: 'Favoritos', icon: <Heart className="mr-2 h-4 w-4" /> },
    { href: '/suscripcion', label: 'Suscripción', icon: <Star className="mr-2 h-4 w-4" /> },
  ];

  const adminLinks = [
    { href: '/admin', label: 'Panel Admin', icon: <ShieldCheck className="mr-2 h-4 w-4" /> }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground shadow-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-2xl font-bold font-headline tracking-tight">
          <span>FutsalDex</span>
        </Link>
        <nav className="hidden items-center space-x-1 md:flex">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant={pathname === link.href ? 'secondary' : 'ghost'}
              asChild
              className={pathname === link.href ? 'text-secondary-foreground bg-secondary hover:bg-secondary/90' : 'hover:bg-primary/80'}
            >
              <Link href={link.href}>
                <span className="flex items-center">
                  {link.icon}
                  {link.label}
                </span>
              </Link>
            </Button>
          ))}
          {isAdmin && adminLinks.map((link) => (
            <Button
              key={link.href}
              variant={pathname.startsWith(link.href) ? 'secondary' : 'ghost'}
              asChild
              className={pathname.startsWith(link.href) ? 'text-destructive-foreground bg-destructive hover:bg-destructive/90' : 'hover:bg-primary/80 text-destructive'}
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
            <Loader2 className="h-6 w-6 animate-spin" />
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
              <DropdownMenuContent className="w-64" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                    {user.displayName && <p className="text-xs leading-none text-muted-foreground">{user.email}</p>}
                    {isAdmin && <p className="text-xs leading-none text-red-500 font-semibold">Admin</p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer">
                   <Link href="/perfil">
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Perfil</span>
                    </Link>
                </DropdownMenuItem>
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
                {!user ? (
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
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild className="cursor-pointer">
                          <Link href="/perfil">
                              <UserCircle className="mr-2 h-4 w-4" />
                              <span>Perfil</span>
                          </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Cerrar sesión</span>
                      </DropdownMenuItem>
                    </>
                  )
                }
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
