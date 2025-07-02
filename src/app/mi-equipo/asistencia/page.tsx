
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { AuthGuard } from '@/components/auth-guard';
import { SubscriptionGuard } from '@/components/subscription-guard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ArrowLeft, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { produce } from 'immer';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

function AsistenciaPageContent() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [players, setPlayers] = useState<RosterPlayer[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchRoster = useCallback(async () => {
        if (!user) return;
        try {
            const rosterDocRef = doc(db, 'usuarios', user.uid, 'team', 'roster');
            const docSnap = await getDoc(rosterDocRef);
            if (docSnap.exists() && docSnap.data().players) {
                setPlayers(docSnap.data().players);
            }
        } catch (error) {
            console.error("Error fetching roster: ", error);
            toast({ title: "Error", description: "No se pudo cargar la plantilla.", variant: "destructive" });
        }
    }, [user, toast]);

    const fetchAttendanceForDate = useCallback(async (date: Date) => {
        if (!user || players.length === 0) {
            if (players.length > 0) setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const dateString = format(date, 'yyyy-MM-dd');
        
        try {
            // Path to the single document holding all attendance data
            const attendanceCollectionDocRef = doc(db, 'usuarios', user.uid, 'team', 'attendance');
            const docSnap = await getDoc(attendanceCollectionDocRef);

            const initialAttendance = players.reduce((acc, player) => {
                acc[player.id] = 'presente'; // Default to 'presente'
                return acc;
            }, {} as Record<string, AttendanceStatus>);

            if (docSnap.exists()) {
                const allAttendanceData = docSnap.data();
                const attendanceForDate = allAttendanceData[dateString] || {};
                const finalAttendance = { ...initialAttendance, ...attendanceForDate };
                setAttendance(finalAttendance);
            } else {
                setAttendance(initialAttendance);
            }
        } catch (error) {
            console.error("Error fetching attendance: ", error);
            toast({ title: "Error", description: "No se pudo cargar la asistencia para esta fecha.", variant: "destructive" });
        }
        setIsLoading(false);
    }, [user, players, toast]);

    useEffect(() => {
        fetchRoster();
    }, [fetchRoster]);

    useEffect(() => {
        if (selectedDate && players.length > 0) {
            fetchAttendanceForDate(selectedDate);
        } else if (players.length === 0) {
            setIsLoading(false);
        }
    }, [selectedDate, players, fetchAttendanceForDate]);

    const handleAttendanceChange = (playerId: string, status: AttendanceStatus) => {
        setAttendance(
            produce(draft => {
                draft[playerId] = status;
            })
        );
    };

    const handleSaveAttendance = async () => {
        if (!user || !selectedDate) return;
        setIsSaving(true);
        const dateString = format(selectedDate, 'yyyy-MM-dd');
        
        // Path to the single document holding all attendance data
        const attendanceCollectionDocRef = doc(db, 'usuarios', user.uid, 'team', 'attendance');

        try {
            // Using set with merge:true will create the document if it doesn't exist,
            // or update the specific field (the date) if it does, without overwriting other dates.
            await setDoc(attendanceCollectionDocRef, {
                [dateString]: attendance,
                updatedAt: serverTimestamp() // To track overall updates
            }, { merge: true });
            
            toast({ title: "Asistencia Guardada", description: `La asistencia para el ${format(selectedDate, 'PPP', { locale: es })} ha sido guardada.` });
        } catch (error) {
            console.error("Error saving attendance: ", error);
            toast({ title: "Error al Guardar", description: "No se pudo guardar la asistencia.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8 md:px-6">
            <header className="mb-8 flex items-center justify-between">
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

            <Card>
                <CardHeader>
                    <CardTitle>Registro de Asistencia</CardTitle>
                    <CardDescription>
                        Selecciona una fecha y marca el estado de cada jugador.
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
                                                >
                                                    {ATTENDANCE_OPTIONS.map(opt => (
                                                        <div key={opt.value} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={opt.value} id={`${player.id}-${opt.value}`} />
                                                            <Label htmlFor={`${player.id}-${opt.value}`} className="text-xs sm:text-sm">{opt.label}</Label>
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
                    
                    <div className="mt-6 flex justify-end">
                        <Button onClick={handleSaveAttendance} disabled={isSaving || isLoading || players.length === 0}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Asistencia
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function AsistenciaPage() {
    return (
        <AuthGuard>
            <SubscriptionGuard>
                <AsistenciaPageContent />
            </SubscriptionGuard>
        </AuthGuard>
    );
}
