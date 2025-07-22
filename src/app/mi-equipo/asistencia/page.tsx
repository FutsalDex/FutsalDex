
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ArrowLeft, CalendarIcon, History, Info, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, FieldValue, deleteField } from 'firebase/firestore';
import { produce } from 'immer';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format, parse, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ToastAction } from '@/components/ui/toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { v4 as uuidv4 } from 'uuid';

interface RosterPlayer {
  id: string;
  dorsal: string;
  nombre: string;
}

type AttendanceStatus = 'presente' | 'ausente' | 'justificado' | 'lesionado';

const ATTENDANCE_OPTIONS: { value: AttendanceStatus, label: string }[] = [
    { value: 'presente', label: 'Presente' },
    { value: 'ausente', label: 'Ausente' },
    { value: 'justificado', label: 'Justificado' },
    { value: 'lesionado', label: 'Lesionado' },
];

interface DisplayPlayerStats {
    id: string;
    dorsal: string;
    nombre: string;
    presente: number;
    ausente: number;
    justificado: number;
    lesionado: number;
    totalRegistros: number;
    asistenciaPct: number;
}

const createGuestPlayers = (): RosterPlayer[] => [
    { id: uuidv4(), dorsal: '1', nombre: 'A. García' },
    { id: uuidv4(), dorsal: '4', nombre: 'J. López' },
    { id: uuidv4(), dorsal: '7', nombre: 'M. Pérez' },
    { id: uuidv4(), dorsal: '10', nombre: 'C. Ruiz' },
    { id: uuidv4(), dorsal: '8', nombre: 'S. Torres' },
];

const createGuestHistoryStats = (players: RosterPlayer[]): DisplayPlayerStats[] => players.map(p => {
    const presente = Math.floor(Math.random() * 15) + 5; // 5-19
    const ausente = Math.floor(Math.random() * 3); // 0-2
    const justificado = Math.floor(Math.random() * 2); // 0-1
    const lesionado = Math.floor(Math.random() * 2); // 0-1
    const totalEsperado = presente + ausente + justificado + lesionado;
    const pct = totalEsperado > 0 ? Math.round(((presente + justificado) / totalEsperado) * 100) : 0;
    return {
        id: p.id,
        dorsal: p.dorsal,
        nombre: p.nombre,
        presente, ausente, justificado, lesionado,
        totalRegistros: totalEsperado,
        asistenciaPct: pct
    };
});

// Helper function to normalize a date, removing time and timezone effects.
const normalizeDate = (date: Date): Date => {
  return startOfDay(date);
};

function AsistenciaPageContent() {
    const { user, isRegisteredUser, isSubscribed, isAdmin } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [players, setPlayers] = useState<RosterPlayer[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const [allAttendanceData, setAllAttendanceData] = useState<Record<string, any>>({});
    const [historyStats, setHistoryStats] = useState<DisplayPlayerStats[]>([]);

    const fetchFullData = useCallback(async () => {
        if (!isRegisteredUser) {
          const guestPlayers = createGuestPlayers();
          setPlayers(guestPlayers);
          setHistoryStats(createGuestHistoryStats(guestPlayers));
          setIsLoading(false);
          return;
        }
        if (!user) {
          setIsLoading(false);
          return;
        }
        setIsLoading(true);
        try {
            const db = getFirebaseDb();
            const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');
            const attendanceDocRef = doc(db, 'usuarios', user.uid, 'team', 'attendance');

            const [rosterSnap, attendanceSnap] = await Promise.all([
                getDoc(rosterDocRef),
                getDoc(attendanceDocRef)
            ]);

            const roster: RosterPlayer[] = (rosterSnap.exists() && rosterSnap.data().players) ? rosterSnap.data().players : [];
            setPlayers(roster);

            const attendanceData = attendanceSnap.exists() ? attendanceSnap.data() : {};
            if (attendanceData.updatedAt) delete attendanceData.updatedAt;
            setAllAttendanceData(attendanceData);

        } catch (error) {
            console.error("Error fetching full data: ", error);
            toast({ title: "Error", description: "No se pudo cargar la información de asistencia.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast, isRegisteredUser]);
    
    useEffect(() => {
        fetchFullData();
    }, [fetchFullData]);

    useEffect(() => {
        if (!selectedDate || players.length === 0) return;
        
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        const attendanceForDate = allAttendanceData[dateString] || {};
        
        const initialAttendance = players.reduce((acc, player) => {
            acc[player.id] = 'presente';
            return acc;
        }, {} as Record<string, AttendanceStatus>);
        
        setAttendance({ ...initialAttendance, ...attendanceForDate });
    }, [selectedDate, players, allAttendanceData]);

    useEffect(() => {
        if (!isRegisteredUser) return; // Only for registered users
        if (players.length === 0) {
            setHistoryStats([]);
            return;
        }

        const stats: Record<string, Omit<DisplayPlayerStats, 'id' | 'dorsal' | 'nombre'>> = {};
        players.forEach(p => {
            stats[p.id] = { presente: 0, ausente: 0, justificado: 0, lesionado: 0, totalRegistros: 0, asistenciaPct: 0 };
        });

        Object.values(allAttendanceData).forEach((dailyAttendance: any) => {
            if (typeof dailyAttendance === 'object' && dailyAttendance !== null) {
                Object.entries(dailyAttendance).forEach(([playerId, status]) => {
                    const statusKey = status as AttendanceStatus;
                    if (stats[playerId] && ATTENDANCE_OPTIONS.map(o => o.value).includes(statusKey)) {
                         stats[playerId][statusKey]++;
                    }
                });
            }
        });

        const finalHistoryStats = players.map(player => {
            const playerStats = stats[player.id];
            const totalConvocatorias = playerStats.presente + playerStats.ausente + playerStats.justificado + playerStats.lesionado;
            const pct = totalConvocatorias > 0 ? Math.round(((playerStats.presente + playerStats.justificado) / totalConvocatorias) * 100) : 0;

            return {
                id: player.id,
                dorsal: player.dorsal,
                nombre: player.nombre,
                ...playerStats,
                totalRegistros: totalConvocatorias,
                asistenciaPct: pct,
            };
        });
        
        setHistoryStats(finalHistoryStats);
    }, [players, allAttendanceData, isRegisteredUser]);


    const handleAttendanceChange = (playerId: string, status: AttendanceStatus) => {
        setAttendance(
            produce(draft => {
                draft[playerId] = status;
            })
        );
    };

    const handleSaveAttendance = async () => {
        if (!isRegisteredUser) {
            toast({ title: "Acción Requerida", description: "Debes iniciar sesión para guardar la asistencia.", action: <ToastAction altText="Iniciar Sesión" onClick={() => router.push('/login')}>Iniciar Sesión</ToastAction> });
            return;
        }
        if (!isSubscribed && !isAdmin) {
            toast({ title: "Suscripción Requerida", description: "Necesitas una suscripción Pro para guardar la asistencia.", action: <ToastAction altText="Suscribirse" onClick={() => router.push('/suscripcion')}>Suscribirse</ToastAction> });
            return;
        }
        if (!user || !selectedDate) return;
        setIsSaving(true);
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        
        try {
            const db = getFirebaseDb();
            const docRef = doc(db, 'usuarios', user.uid, 'team', 'attendance');
            await setDoc(docRef, {
                [dateString]: attendance,
                updatedAt: serverTimestamp()
            }, { merge: true });

            toast({ title: "Asistencia Guardada", description: `La asistencia para el ${format(selectedDate, 'PPP', { locale: es })} ha sido guardada.` });
            await fetchFullData(); // Re-fetch to update history
        } catch (error) {
            console.error("Error saving attendance: ", error);
            toast({ title: "Error al Guardar", description: "No se pudo guardar la asistencia.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteRecord = async () => {
        if (!isRegisteredUser || !user || !selectedDate) return;
        setIsDeleting(true);
        const dateString = format(selectedDate, 'yyyy-MM-dd');

        try {
            const db = getFirebaseDb();
            const docRef = doc(db, 'usuarios', user.uid, 'team', 'attendance');
            await updateDoc(docRef, {
                [dateString]: deleteField(),
                updatedAt: serverTimestamp()
            });

            toast({ title: "Registro Eliminado", description: `El registro de asistencia para el ${format(selectedDate, 'PPP', { locale: es })} ha sido eliminado.` });
            
            // Optimistic update of local state before re-fetching
            const newAttendanceData = { ...allAttendanceData };
            delete newAttendanceData[dateString];
            setAllAttendanceData(newAttendanceData);
            
        } catch (error) {
            console.error("Error deleting attendance record: ", error);
            toast({ title: "Error al Eliminar", description: "No se pudo eliminar el registro de asistencia.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    };

    const recordedDates = useMemo(() => {
        return Object.keys(allAttendanceData)
          .map(dateString => parse(dateString, 'yyyy-MM-dd', new Date()))
          .filter(date => !isNaN(date.getTime()));
    }, [allAttendanceData]);

    const hasRecordForSelectedDate = useMemo(() => {
        if (!selectedDate) return false;
        const normalizedSelected = normalizeDate(selectedDate).getTime();
        return recordedDates.some(d => normalizeDate(d).getTime() === normalizedSelected);
    }, [selectedDate, recordedDates]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <header className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-primary mb-1 font-headline">Control de Asistencia</h1>
                    <p className="text-lg text-foreground/80">
                        Registra la asistencia de tus jugadores a los entrenamientos.
                    </p>
                </div>
                <Button asChild variant="outline">
                    <Link href="/mi-equipo">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver al Panel
                    </Link>
                </Button>
            </header>

            {!isRegisteredUser && (
                <Alert variant="default" className="mb-4 bg-blue-50 border-blue-200 text-blue-800">
                    <Info className="h-4 w-4 text-blue-700" />
                    <AlertTitle className="text-blue-800 font-semibold">Modo de Demostración</AlertTitle>
                    <AlertDescription>
                        Estás viendo un ejemplo. Para registrar la asistencia de tu propio equipo, por favor{" "}
                        <Link href="/register" className="font-bold underline">regístrate</Link> o{" "}
                        <Link href="/login" className="font-bold underline">inicia sesión</Link>.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Registro de Asistencia</CardTitle>
                    <CardDescription>
                        Selecciona una fecha y marca el estado de cada jugador. Los días enmarcados ya tienen un registro.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                        <Label>Fecha del entrenamiento:</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn("w-full sm:w-[280px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, 'PPP', { locale: es }) : <span>Selecciona una fecha</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                initialFocus
                                locale={es}
                                modifiers={{ recorded: recordedDates }}
                                modifiersClassNames={{ recorded: 'has-record' }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : players.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <p className="mb-4">No tienes jugadores en tu equipo. Ve a "Mi Plantilla" para añadir jugadores.</p>
                            <Button asChild>
                                <Link href="/mi-equipo/plantilla">Ir a Mi Plantilla</Link>
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[80px]">Dorsal</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead className="text-right">Asistencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {players.map((player) => (
                                        <TableRow key={player.id}>
                                            <TableCell className="font-medium">{player.dorsal}</TableCell>
                                            <TableCell>{player.nombre}</TableCell>
                                            <TableCell className="text-right">
                                                <RadioGroup
                                                    value={attendance[player.id] || 'presente'}
                                                    onValueChange={(value) => handleAttendanceChange(player.id, value as AttendanceStatus)}
                                                    className="flex justify-end gap-2 sm:gap-4"
                                                    disabled={!isRegisteredUser}
                                                >
                                                    {ATTENDANCE_OPTIONS.map(opt => (
                                                        <div key={opt.value} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={opt.value} id={`${player.id}-${opt.value}`} />
                                                            <Label htmlFor={`${player.id}-${opt.value}`} className={cn("text-xs sm:text-sm", !isRegisteredUser && "cursor-not-allowed")}>{opt.label}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                    
                    <div className="mt-6 flex justify-end gap-2">
                         {hasRecordForSelectedDate && (
                            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                Eliminar Registro
                            </Button>
                        )}
                        <Button onClick={handleSaveAttendance} disabled={isSaving || isLoading || players.length === 0}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Asistencia
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <History className="mr-2 h-5 w-5 text-primary" />
                        Historial de Asistencia
                    </CardTitle>
                    <CardDescription>
                        Resumen de la asistencia de los jugadores a todos los entrenamientos registrados.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : historyStats.length === 0 || players.length === 0 ? (
                        <p className="text-center text-muted-foreground py-10">No hay datos históricos de asistencia para mostrar.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[60px]">Dorsal</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead className="text-center" title="Presente">P</TableHead>
                                        <TableHead className="text-center" title="Ausente">A</TableHead>
                                        <TableHead className="text-center" title="Justificado">J</TableHead>
                                        <TableHead className="text-center" title="Lesionado">L</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="w-[150px] text-center">% Asistencia</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyStats.map(player => (
                                        <TableRow key={player.id}>
                                            <TableCell>{player.dorsal}</TableCell>
                                            <TableCell>{player.nombre}</TableCell>
                                            <TableCell className="text-center">{player.presente}</TableCell>
                                            <TableCell className="text-center">{player.ausente}</TableCell>
                                            <TableCell className="text-center">{player.justificado}</TableCell>
                                            <TableCell className="text-center">{player.lesionado}</TableCell>
                                            <TableCell className="text-center font-bold">{player.totalRegistros}</TableCell>
                                            <TableCell className="text-center font-bold">
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="w-8">{player.asistenciaPct}%</span>
                                                    <Progress value={player.asistenciaPct} className="h-2 w-20" />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <p className="text-xs text-muted-foreground mt-2">* El % de asistencia se calcula como: ((Presente + Justificado) / (Presente + Ausente + Justificado + Lesionado)) * 100.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

             <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Confirmar Eliminación?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción eliminará permanentemente el registro de asistencia para el día{" "}
                            <strong>{selectedDate ? format(selectedDate, 'PPP', { locale: es }) : ''}</strong>.
                            No se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRecord} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                           {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                            Eliminar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function AsistenciaPage() {
    return (
        <AsistenciaPageContent />
    );
}
