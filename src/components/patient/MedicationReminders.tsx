import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Pill, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Bell,
  CalendarDays,
  Play,
  ArrowRight,
  TrendingUp,
  History
} from 'lucide-react';
import { format, isToday, isPast, addHours } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface MedicationReminder {
  id: string;
  patient_id: string;
  medication_id: string;
  prescription_id: string;
  scheduled_time: string;
  status: 'pending' | 'taken' | 'missed' | 'skipped';
  taken_at?: string;
  medication_name?: string; // Joined or derived
  dosage?: string;
}

export function MedicationReminders() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'today' | 'history'>('today');

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['medication-reminders', profile?.id, filter],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase
        .from('medication_reminders')
        .select(`
          *,
          medication:medications(name, dosage)
        `)
        .eq('patient_id', profile.id)
        .order('scheduled_time', { ascending: true });

      if (filter === 'today') {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        
        query = query
          .gte('scheduled_time', startOfDay.toISOString())
          .lte('scheduled_time', endOfDay.toISOString());
      } else {
        query = query.limit(20);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: 'taken' | 'skipped' | 'missed' }) => {
      const { error } = await supabase
        .from('medication_reminders')
        .update({ 
          status, 
          taken_at: status === 'taken' ? new Date().toISOString() : null 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medication-reminders'] });
      toast.success('Medication status updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    }
  });

  const adherenceRate = useMemo(() => {
    if (!reminders || reminders.length === 0) return 100;
    const pastReminders = reminders.filter(r => isPast(new Date(r.scheduled_time)) || r.status !== 'pending');
    if (pastReminders.length === 0) return 100;
    
    const taken = pastReminders.filter(r => r.status === 'taken').length;
    return Math.round((taken / pastReminders.length) * 100);
  }, [reminders]);

  const sortedReminders = useMemo(() => {
    if (!reminders) return [];
    return [...reminders].sort((a, b) => 
      new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
    );
  }, [reminders]);

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-64 flex items-center justify-center">
          <Pill className="h-8 w-8 text-muted-foreground/20 animate-bounce" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-2 border-primary/5 h-full">
      <CardHeader className="bg-slate-50/50 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Medication Schedule</CardTitle>
              <CardDescription className="text-xs">Never miss a dose, stay healthy</CardDescription>
            </div>
          </div>
          <div className="flex bg-muted p-1 rounded-lg">
            <Button 
              variant={filter === 'today' ? 'white' : 'ghost'} 
              size="sm" 
              className="h-7 text-[10px] uppercase font-bold px-3 shadow-none bg-transparent data-[variant=white]:bg-white data-[variant=white]:shadow-sm"
              onClick={() => setFilter('today')}
              data-variant={filter === 'today' ? 'white' : 'ghost'}
            >
              Today
            </Button>
            <Button 
              variant={filter === 'history' ? 'white' : 'ghost'} 
              size="sm" 
              className="h-7 text-[10px] uppercase font-bold px-3 shadow-none bg-transparent data-[variant=white]:bg-white data-[variant=white]:shadow-sm"
              onClick={() => setFilter('history')}
              data-variant={filter === 'history' ? 'white' : 'ghost'}
            >
              Recent
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Adherence Overview */}
        <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">Adherence Score</span>
            <span className="text-lg font-bold text-primary">{adherenceRate}%</span>
          </div>
          <Progress value={adherenceRate} className="h-2 bg-primary/10" />
          <div className="flex items-center gap-2 mt-3 text-[10px] text-primary/60">
            <TrendingUp className="h-3 w-3" />
            <span>Keep it above 90% for best treatment results</span>
          </div>
        </div>

        <ScrollArea className="h-[320px] pr-4">
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {sortedReminders.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground"
                >
                  <CalendarDays className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">No reminders set for this period</p>
                </motion.div>
              ) : (
                sortedReminders.map((reminder) => (
                  <motion.div
                    key={reminder.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={`p-4 rounded-xl border transition-all ${
                      reminder.status === 'taken' ? 'bg-success/5 border-success/20 opacity-75' :
                      reminder.status === 'missed' ? 'bg-destructive/5 border-destructive/20' :
                      'bg-white border-slate-200 hover:border-primary/30 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3">
                        <div className={`p-2.5 rounded-lg shrink-0 ${
                          reminder.status === 'taken' ? 'bg-success/10 text-success' :
                          reminder.status === 'missed' ? 'bg-destructive/10 text-destructive' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          <Pill className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-sm leading-none">
                            {reminder.medication?.name || 'Medication'}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                            <Clock className="h-3 w-3" />
                            {format(new Date(reminder.scheduled_time), 'hh:mm a')}
                            <span>•</span>
                            <span className="text-primary/70">{reminder.medication?.dosage}</span>
                          </div>
                        </div>
                      </div>
                      
                      {reminder.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-success hover:bg-success/10"
                            onClick={() => updateStatusMutation.mutate({ id: reminder.id, status: 'taken' })}
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => updateStatusMutation.mutate({ id: reminder.id, status: 'skipped' })}
                          >
                            <XCircle className="h-5 w-5" />
                          </Button>
                        </div>
                      )}

                      {reminder.status !== 'pending' && (
                        <Badge variant={
                          reminder.status === 'taken' ? 'success' :
                          reminder.status === 'skipped' ? 'outline' :
                          'destructive'
                        } className="capitalize text-[10px] h-5 px-2">
                          {reminder.status}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        <Button variant="outline" className="w-full text-xs h-9 gap-2 border-dashed border-primary/20 hover:bg-primary/5 font-bold uppercase tracking-wider">
          <History className="h-3 w-3" /> View Full History
        </Button>
      </CardContent>
    </Card>
  );
}
