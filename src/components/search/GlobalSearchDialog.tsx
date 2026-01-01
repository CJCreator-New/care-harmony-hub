import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, User, Calendar, Pill, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';

interface SearchResult {
  id: string;
  type: 'patient' | 'appointment' | 'prescription';
  title: string;
  subtitle: string;
  badge?: string;
  badgeVariant?: string;
}

interface GlobalSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const { hospital } = useAuth();
  const navigate = useNavigate();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !hospital?.id) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    const searchResults: SearchResult[] = [];

    try {
      // Search patients
      const { data: patients } = await supabase
        .from('patients')
        .select('id, first_name, last_name, mrn, phone')
        .eq('hospital_id', hospital.id)
        .or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,mrn.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10);

      if (patients) {
        patients.forEach((p) => {
          searchResults.push({
            id: p.id,
            type: 'patient',
            title: `${p.first_name} ${p.last_name}`,
            subtitle: `MRN: ${p.mrn}${p.phone ? ` • ${p.phone}` : ''}`,
          });
        });
      }

      // Search appointments
      const { data: appointments } = await supabase
        .from('appointments')
        .select(`
          id, 
          scheduled_date, 
          scheduled_time, 
          appointment_type,
          status,
          patient:patients(first_name, last_name, mrn)
        `)
        .eq('hospital_id', hospital.id)
        .limit(10);

      if (appointments) {
        appointments
          .filter((a) => {
            const patientName = `${a.patient?.first_name} ${a.patient?.last_name}`.toLowerCase();
            return patientName.includes(searchQuery.toLowerCase()) ||
              a.appointment_type.toLowerCase().includes(searchQuery.toLowerCase());
          })
          .forEach((a) => {
            searchResults.push({
              id: a.id,
              type: 'appointment',
              title: `${a.patient?.first_name} ${a.patient?.last_name}`,
              subtitle: `${format(parseISO(a.scheduled_date), 'MMM d, yyyy')} at ${a.scheduled_time} • ${a.appointment_type}`,
              badge: a.status || 'scheduled',
            });
          });
      }

      // Search prescriptions by patient name
      const { data: prescriptions } = await supabase
        .from('prescriptions')
        .select(`
          id,
          status,
          created_at,
          patient:patients(first_name, last_name, mrn),
          items:prescription_items(medication_name)
        `)
        .eq('hospital_id', hospital.id)
        .limit(10);

      if (prescriptions) {
        prescriptions
          .filter((rx) => {
            const patientName = `${rx.patient?.first_name} ${rx.patient?.last_name}`.toLowerCase();
            const meds = rx.items?.map((i) => i.medication_name.toLowerCase()).join(' ') || '';
            return patientName.includes(searchQuery.toLowerCase()) ||
              meds.includes(searchQuery.toLowerCase());
          })
          .forEach((rx) => {
            const meds = rx.items?.slice(0, 2).map((i) => i.medication_name).join(', ') || 'No medications';
            searchResults.push({
              id: rx.id,
              type: 'prescription',
              title: `${rx.patient?.first_name} ${rx.patient?.last_name}`,
              subtitle: meds,
              badge: rx.status,
            });
          });
      }

      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hospital?.id]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, performSearch]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter((r) => r.type === activeTab);

  const handleSelect = (result: SearchResult) => {
    onOpenChange(false);
    switch (result.type) {
      case 'patient':
        navigate(`/patients?id=${result.id}`);
        break;
      case 'appointment':
        navigate(`/appointments?id=${result.id}`);
        break;
      case 'prescription':
        navigate(`/pharmacy?id=${result.id}`);
        break;
    }
  };

  const getIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'patient':
        return <User className="h-4 w-4" />;
      case 'appointment':
        return <Calendar className="h-4 w-4" />;
      case 'prescription':
        return <Pill className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <div className="flex items-center gap-3 border-b pb-4">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search patients, appointments, prescriptions..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 focus-visible:ring-0 text-lg px-0"
              autoFocus
            />
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="patient">Patients</TabsTrigger>
            <TabsTrigger value="appointment">Appointments</TabsTrigger>
            <TabsTrigger value="prescription">Prescriptions</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <ScrollArea className="h-[400px]">
              {filteredResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  {query ? (
                    <>
                      <Search className="h-12 w-12 mb-4 opacity-50" />
                      <p>No results found for "{query}"</p>
                    </>
                  ) : (
                    <>
                      <Search className="h-12 w-12 mb-4 opacity-50" />
                      <p>Start typing to search...</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2 pb-4">
                  {filteredResults.map((result) => (
                    <button
                      key={`${result.type}-${result.id}`}
                      className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-accent text-left transition-colors"
                      onClick={() => handleSelect(result)}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                        {getIcon(result.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{result.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                      </div>
                      {result.badge && (
                        <Badge variant="outline" className="capitalize shrink-0">
                          {result.badge}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="capitalize shrink-0">
                        {result.type}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
