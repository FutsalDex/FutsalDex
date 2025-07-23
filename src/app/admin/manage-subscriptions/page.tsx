
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Users, Loader2, Search, ChevronLeft, ChevronRight, ArrowDownUp, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination, PaginationContent, PaginationItem } from "@/components/ui/pagination";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, doc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";


type SubscriptionType = 'Pro' | 'Básica' | 'Prueba' | 'inactive';

interface UserSubscription {
  id: string;
  email: string;
  role: 'admin' | 'user';
  subscriptionStatus: 'active' | 'inactive';
  subscriptionType: SubscriptionType;
  subscriptionExpiresAt?: number; // Store as epoch milliseconds
}

const ITEMS_PER_PAGE = 20;
type SortableField = 'email' | 'role' | 'subscriptionStatus' | 'subscriptionType' | 'subscriptionExpiresAt';
type SortDirection = 'asc' | 'desc';

function ManageSubscriptionsPageContent() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = useState<UserSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortableField>('email');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); 
    }, 500); 
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchAllUsers = useCallback(async () => {
      if (!isAdmin) {
          setIsLoading(false);
          return;
      }
      setIsLoading(true);
      try {
          const db = getFirebaseDb();
          const usersCollection = collection(db, "usuarios");
          const q = query(usersCollection, orderBy('email', 'asc'));
          const querySnapshot = await getDocs(q);

          const usersFromDb = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            let subType: SubscriptionType = 'inactive';
            let expiresAt: number | undefined;

            if (data.subscriptionStatus === 'active') {
                subType = data.subscriptionType || 'Pro'; // Default to pro if active but no type
            }
            if (data.trialEndsAt instanceof Timestamp && data.trialEndsAt.toDate() > new Date()) {
                subType = 'Prueba';
                expiresAt = data.trialEndsAt.toMillis();
            }
            if (data.subscriptionExpiresAt instanceof Timestamp) {
                expiresAt = data.subscriptionExpiresAt.toMillis();
            }

            return {
              id: docSnap.id,
              email: data.email || '',
              role: data.role || 'user',
              subscriptionStatus: data.subscriptionStatus || 'inactive',
              subscriptionType: subType,
              subscriptionExpiresAt: expiresAt,
            };
          });
          setAllUsers(usersFromDb as UserSubscription[]);
      } catch (error: any) {
          console.error("Error fetching users:", error);
          toast({ title: "Error al cargar usuarios", description: error.message || "No se pudieron obtener los datos de los usuarios.", variant: "destructive" });
      }
      setIsLoading(false);
  }, [isAdmin, toast]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const filteredAndSortedUsers = useMemo(() => {
    let users = [...allUsers];

    if (debouncedSearchTerm) {
      users = users.filter(u => u.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
    }

    users.sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        
        let comparison = 0;
        if (typeof valA === 'string' && typeof valB === 'string') {
            comparison = valA.localeCompare(valB);
        } else if (typeof valA === 'number' && typeof valB === 'number') {
            comparison = valA - valB;
        }

        return sortDirection === 'asc' ? comparison : -comparison;
    });

    return users;
  }, [allUsers, debouncedSearchTerm, sortField, sortDirection]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAndSortedUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredAndSortedUsers, currentPage]);

  const totalUsers = filteredAndSortedUsers.length;
  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);
  
  const handleSort = (field: SortableField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    setCurrentPage(1); 
  };
  
  const handleSubscriptionChange = async (userId: string, newStatus: 'active' | 'inactive') => {
    setIsUpdating(userId);
    try {
      const db = getFirebaseDb();
      const userDocRef = doc(db, "usuarios", userId);
      await updateDoc(userDocRef, {
        subscriptionStatus: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Suscripción Actualizada",
        description: `El estado del usuario se ha cambiado a ${newStatus === 'active' ? 'activo' : 'inactivo'}.`,
      });
      // Optimistic update in the main list, which will trigger re-render of sorted/paginated list
      setAllUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, subscriptionStatus: newStatus } : u));
    } catch (error) {
      console.error("Error updating subscription:", error);
      toast({ title: "Error al Actualizar", description: "No se pudo cambiar el estado de la suscripción.", variant: "destructive" });
    } finally {
      setIsUpdating(null);
    }
  };
  
  const renderSortIcon = (field: SortableField) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
    }
    return <ArrowDownUp className="ml-1 h-3 w-3 opacity-30" />;
  };

  const getSubscriptionTypeBadgeVariant = (type: SubscriptionType) => {
    switch (type) {
      case 'Pro': return 'destructive';
      case 'Básica': return 'default';
      case 'Prueba': return 'secondary';
      default: return 'outline';
    }
  };

  if (!isAdmin && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 md:px-6 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle className="text-2xl font-headline text-destructive">Acceso Denegado</CardTitle></CardHeader>
          <CardContent><CardDescription>No tienes permisos para acceder a esta página. Esta sección es solo para administradores.</CardDescription><Button asChild variant="outline" className="mt-4"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Panel de Admin</Link></Button></CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:px-6">
      <header className="mb-8 flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-primary mb-1 font-headline">Gestionar Suscripciones</h1><p className="text-lg text-foreground/80">Visualiza y administra las suscripciones de los usuarios.</p></div>
        <Button asChild variant="outline"><Link href="/admin"><ArrowLeft className="mr-2 h-4 w-4" />Volver al Panel</Link></Button>
      </header>
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="font-headline text-xl flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Listado de Usuarios</CardTitle>
            <p className="text-sm text-muted-foreground">Total: {totalUsers}</p>
          </div>
          <CardDescription>Busca usuarios y modifica el estado de su suscripción.</CardDescription>
           <div className="relative pt-2"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Buscar por email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" /></div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('email')}><span className="flex items-center">Email {renderSortIcon('email')}</span></TableHead>
                  <TableHead className="w-[120px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('role')}><span className="flex items-center">Rol {renderSortIcon('role')}</span></TableHead>
                  <TableHead className="w-[180px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('subscriptionType')}><span className="flex items-center">Tipo Suscripción {renderSortIcon('subscriptionType')}</span></TableHead>
                  <TableHead className="w-[200px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('subscriptionStatus')}><span className="flex items-center">Estado Suscripción {renderSortIcon('subscriptionStatus')}</span></TableHead>
                  <TableHead className="w-[180px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('subscriptionExpiresAt')}><span className="flex items-center">Fecha Vencimiento {renderSortIcon('subscriptionExpiresAt')}</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
                ) : paginatedUsers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-24 text-center">No se encontraron usuarios.</TableCell></TableRow>
                ) : (
                  paginatedUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell><Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'}>{u.role}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={getSubscriptionTypeBadgeVariant(u.subscriptionType)}>
                          {u.subscriptionType === 'inactive' ? 'Ninguna' : u.subscriptionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isUpdating === u.id ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                          <Select
                            value={u.subscriptionStatus}
                            onValueChange={(newStatus) => handleSubscriptionChange(u.id, newStatus as 'active' | 'inactive')}
                            disabled={u.email === user?.email}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Activa</SelectItem>
                              <SelectItem value="inactive">Inactiva</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>{u.subscriptionExpiresAt ? new Date(u.subscriptionExpiresAt).toLocaleDateString('es-ES') : 'N/A'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || isLoading}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button></PaginationItem>
                <PaginationItem className="font-medium text-sm px-3 text-muted-foreground">Página {currentPage} de {totalPages}</PaginationItem>
                <PaginationItem><Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages || isLoading}><ChevronRight className="h-4 w-4 ml-1" />Siguiente</Button></PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ManageSubscriptionsPage() {
  return (
    <AuthGuard>
      <ManageSubscriptionsPageContent />
    </AuthGuard>
  );
}

    