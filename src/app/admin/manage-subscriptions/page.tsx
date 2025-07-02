
"use client";

import { AuthGuard } from "@/components/auth-guard";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowLeft, Users, Loader2, Search, ChevronLeft, ChevronRight, ArrowDownUp, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, query, orderBy as firestoreOrderBy, limit, startAfter, QueryDocumentSnapshot, DocumentData, updateDoc, serverTimestamp, getCountFromServer, where, QueryConstraint } from 'firebase/firestore';
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

interface UserSubscription {
  id: string;
  email: string;
  role: 'admin' | 'user';
  subscriptionStatus: 'active' | 'inactive';
  updatedAt?: DocumentData;
}

const ITEMS_PER_PAGE = 20;
type SortableField = 'email' | 'role' | 'subscriptionStatus' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

function ManageSubscriptionsPageContent() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [pageDocSnapshots, setPageDocSnapshots] = useState<{ last: (QueryDocumentSnapshot<DocumentData> | null)[] }>({ last: [] });
  
  const [sortField, setSortField] = useState<SortableField>('email');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

   useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); 
      setPageDocSnapshots({ last: [] }); 
    }, 500); 
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchTotalCount = useCallback(async (term: string) => {
    try {
      const qConstraints: QueryConstraint[] = [];
      if (term) {
        qConstraints.push(where('email', '>=', term));
        qConstraints.push(where('email', '<=', term + '\uf8ff'));
      }
      const countQuery = query(collection(db, "usuarios"), ...qConstraints);
      const snapshot = await getCountFromServer(countQuery);
      setTotalUsers(snapshot.data().count);
    } catch (error) {
      console.error("Error fetching total user count: ", error);
      toast({ title: "Error", description: "No se pudo obtener el número total de usuarios.", variant: "destructive" });
    }
  }, [toast]);

  const fetchUsers = useCallback(async (newPage: number, currentSortField: SortableField, currentSortDirection: SortDirection, term: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const qConstraints: QueryConstraint[] = [];
      
      if (term) {
        qConstraints.push(where('email', '>=', term));
        qConstraints.push(where('email', '<=', term + '\uf8ff'));
      }
      
      qConstraints.push(firestoreOrderBy(currentSortField, currentSortDirection));
      if (currentSortField !== 'email') { // Add secondary sort for consistent pagination
          qConstraints.push(firestoreOrderBy('email', 'asc'));
      }

      qConstraints.push(limit(ITEMS_PER_PAGE));
      
      if (newPage > 1 && pageDocSnapshots.last[newPage - 2]) {
         qConstraints.push(startAfter(pageDocSnapshots.last[newPage - 2]!));
      }

      const q = query(collection(db, "usuarios"), ...qConstraints);
      const querySnapshot = await getDocs(q);

      const fetchedUsers = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        email: docSnap.data().email,
        role: docSnap.data().role,
        subscriptionStatus: docSnap.data().subscriptionStatus,
        updatedAt: docSnap.data().updatedAt,
      } as UserSubscription));

      setUsers(fetchedUsers);
      setCurrentPage(newPage);

      if (querySnapshot.docs.length > 0) {
        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] as QueryDocumentSnapshot<DocumentData>;
        setPageDocSnapshots(prev => {
            const newLast = [...prev.last];
            newLast[newPage - 1] = lastDoc;
            return { last: newLast };
        });
      }
    } catch (error: any) {
        console.error("Error fetching users:", error);
        toast({ title: "Error al cargar usuarios", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  }, [user, toast, pageDocSnapshots.last]);

  useEffect(() => {
    if (isAdmin) {
      fetchTotalCount(debouncedSearchTerm);
      fetchUsers(currentPage, sortField, sortDirection, debouncedSearchTerm);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, sortField, sortDirection, debouncedSearchTerm, currentPage]);
  
  const handleSort = (field: SortableField) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    setCurrentPage(1); 
    setPageDocSnapshots({ last: [] });
  };
  
  const handleSubscriptionChange = async (userId: string, newStatus: 'active' | 'inactive') => {
    setIsUpdating(userId);
    try {
      const userDocRef = doc(db, "usuarios", userId);
      await updateDoc(userDocRef, {
        subscriptionStatus: newStatus,
        updatedAt: serverTimestamp()
      });
      toast({
        title: "Suscripción Actualizada",
        description: `El estado del usuario se ha cambiado a ${newStatus === 'active' ? 'activo' : 'inactivo'}.`,
      });
      // Optimistic update
      setUsers(prevUsers => prevUsers.map(u => u.id === userId ? { ...u, subscriptionStatus: newStatus, updatedAt: new Date() } : u));
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

  const handleNextPage = () => {
    const nextPage = currentPage + 1;
    if (nextPage <= Math.ceil(totalUsers / ITEMS_PER_PAGE)) {
      setCurrentPage(nextPage);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  if (!isAdmin) {
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('email')}><span className="flex items-center">Email {renderSortIcon('email')}</span></TableHead>
                <TableHead className="w-[120px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('role')}><span className="flex items-center">Rol {renderSortIcon('role')}</span></TableHead>
                <TableHead className="w-[200px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('subscriptionStatus')}><span className="flex items-center">Estado Suscripción {renderSortIcon('subscriptionStatus')}</span></TableHead>
                <TableHead className="w-[180px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort('updatedAt')}><span className="flex items-center">Última Actualización {renderSortIcon('updatedAt')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && users.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" /></TableCell></TableRow>
              ) : !isLoading && users.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">No se encontraron usuarios.</TableCell></TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.email}</TableCell>
                    <TableCell><Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'}>{u.role}</Badge></TableCell>
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
                    <TableCell>{u.updatedAt ? new Date(u.updatedAt.seconds * 1000).toLocaleString('es-ES') : 'N/A'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem><Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1 || isLoading}><ChevronLeft className="h-4 w-4 mr-1" />Anterior</Button></PaginationItem>
              <PaginationItem className="font-medium text-sm px-3 text-muted-foreground">Página {currentPage} de {Math.ceil(totalUsers / ITEMS_PER_PAGE)}</PaginationItem>
              <PaginationItem><Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage * ITEMS_PER_PAGE >= totalUsers || isLoading}><ChevronRight className="h-4 w-4 ml-1" />Siguiente</Button></PaginationItem>
            </PaginationContent>
          </Pagination>
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
