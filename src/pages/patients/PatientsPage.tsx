import { useState, useCallback, memo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PatientRegistrationModal } from '@/components/patients/PatientRegistrationModal';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useActivityLog } from '@/hooks/useActivityLog';
import { usePaginatedQuery } from '@/hooks/usePaginatedQuery';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Eye,
  Calendar,
  FileText,
  Users,
  Filter,
  Loader2,
  Phone,
  Mail,
} from 'lucide-react';
import { format, differenceInYears } from 'date-fns';

interface Patient {
  id: string;
  mrn: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string | null;
  email: string | null;
  blood_type: string | null;
  is_active: boolean;
  created_at: string;
}

const genderLabels: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Not Specified',
};

// Memoized Patient Row Component for performance optimization
const PatientRow = memo(({ patient, onViewProfile, calculateAge }: {
  patient: any;
  onViewProfile: (patient: any) => void;
  calculateAge: (dob: string) => number;
}) => (
  <TableRow key={patient.id}>
    <TableCell>
      <Badge variant="outline" className="font-mono">
        {patient.mrn}
      </Badge>
    </TableCell>
    <TableCell className="font-medium">
      {patient.first_name} {patient.last_name}
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2">
        <span>{calculateAge(patient.date_of_birth)} yrs</span>
        <Badge variant="secondary" className="text-xs">
          {genderLabels[patient.gender] || patient.gender}
        </Badge>
      </div>
    </TableCell>
    <TableCell>
      <div className="space-y-1">
        {patient.phone && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Phone className="h-3 w-3" />
            {patient.phone}
          </div>
        )}
        {patient.email && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" />
            {patient.email}
          </div>
        )}
        {!patient.phone && !patient.email && (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    </TableCell>
    <TableCell>
      {patient.blood_type ? (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          {patient.blood_type}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      )}
    </TableCell>
    <TableCell className="text-muted-foreground">
      {format(new Date(patient.created_at), 'MMM d, yyyy')}
    </TableCell>
    <TableCell>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onViewProfile(patient)}>
            <Eye className="h-4 w-4 mr-2" />
            View Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Calendar className="h-4 w-4 mr-2" />
            Book Appointment
          </DropdownMenuItem>
          <DropdownMenuItem>
            <FileText className="h-4 w-4 mr-2" />
            Medical Records
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TableCell>
  </TableRow>
));

PatientRow.displayName = 'PatientRow';

export default function PatientsPage() {
  const { profile } = useAuth();
  const { canCreatePatients } = usePermissions();
  const { logActivity } = useActivityLog();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [registrationModalOpen, setRegistrationModalOpen] = useState(false);

  // Debounce search query for server-side filtering
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  // Build filters for the query
  const filters = {
    hospital_id: profile?.hospital_id,
    is_active: true,
    ...(genderFilter !== 'all' && { gender: genderFilter }),
  };

  const {
    data: patients,
    count,
    totalPages,
    currentPage,
    pageSize,
    isLoading,
    error,
    isSearching,
    nextPage,
    prevPage,
    goToPage,
    resetPage,
  } = usePaginatedQuery({
    table: 'patients',
    select: 'id, mrn, first_name, last_name, date_of_birth, gender, phone, email, blood_type, is_active, created_at',
    filters,
    searchQuery: debouncedSearch,
    searchColumn: 'first_name,last_name,mrn,phone,email',
    orderBy: { column: 'last_name', ascending: true },
    pageSize: 25,
  });

  const calculateAge = (dob: string) => {
    return differenceInYears(new Date(), new Date(dob));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Patients</h1>
            <p className="text-muted-foreground">
              Manage patient records and registrations
            </p>
          </div>
          {canCreatePatients && (
            <Button onClick={() => setRegistrationModalOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Register Patient
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm text-muted-foreground">Total Patients</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="p-3 rounded-lg bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {patients.filter(p => p.gender === 'male').length}
              </p>
              <p className="text-sm text-muted-foreground">Male (Current Page)</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="p-3 rounded-lg bg-pink-500/10">
              <Users className="h-6 w-6 text-pink-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {patients.filter(p => p.gender === 'female').length}
              </p>
              <p className="text-sm text-muted-foreground">Female (Current Page)</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border">
            <div className="p-3 rounded-lg bg-success/10">
              <Calendar className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {patients.filter(p => {
                  const created = new Date(p.created_at);
                  const today = new Date();
                  return created.toDateString() === today.toDateString();
                }).length}
              </p>
              <p className="text-sm text-muted-foreground">Registered Today (Current Page)</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, MRN, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Patients Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">No patients found</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery || genderFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Register your first patient to get started'}
              </p>
              {canCreatePatients && !searchQuery && genderFilter === 'all' && (
                <Button onClick={() => setRegistrationModalOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Register Patient
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>MRN</TableHead>
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Age / Gender</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Blood Type</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((patient) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    calculateAge={calculateAge}
                    onViewProfile={(patient) => {
                      logActivity({
                        actionType: 'patient_view',
                        entityType: 'patient',
                        entityId: patient.id,
                        details: { mrn: patient.mrn, name: `${patient.first_name} ${patient.last_name}` },
                      });
                      toast({ title: 'Patient view logged', description: `Viewing ${patient.first_name} ${patient.last_name}` });
                    }}
                  />
                ))}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  onPrevious={prevPage}
                  onNext={nextPage}
                  pageSize={pageSize}
                  totalCount={count}
                />
              </div>
            )}
            </>
          )}
        </div>
      </div>

      <PatientRegistrationModal
        open={registrationModalOpen}
        onOpenChange={setRegistrationModalOpen}
        onSuccess={() => {
          setRegistrationModalOpen(false);
          // Refresh current page data
          window.location.reload();
        }}
      />
    </DashboardLayout>
  );
}
