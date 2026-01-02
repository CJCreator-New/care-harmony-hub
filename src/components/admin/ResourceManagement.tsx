import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Bed, 
  Plus, 
  Building, 
  Wrench,
  User,
  Loader2,
  Filter,
} from 'lucide-react';

type ResourceType = 'bed' | 'room' | 'equipment';
type ResourceStatus = 'available' | 'occupied' | 'maintenance' | 'reserved';

interface Resource {
  id: string;
  resource_type: ResourceType;
  name: string;
  code: string | null;
  status: ResourceStatus;
  floor: string | null;
  wing: string | null;
  capacity: number;
  notes: string | null;
  department_id: string | null;
  current_patient_id: string | null;
}

const statusColors: Record<ResourceStatus, string> = {
  available: 'bg-success/10 text-success border-success/20',
  occupied: 'bg-warning/10 text-warning border-warning/20',
  maintenance: 'bg-muted text-muted-foreground border-muted',
  reserved: 'bg-info/10 text-info border-info/20',
};

const typeIcons: Record<ResourceType, typeof Bed> = {
  bed: Bed,
  room: Building,
  equipment: Wrench,
};

export function ResourceManagement() {
  const { hospital } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterType, setFilterType] = useState<ResourceType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<ResourceStatus | 'all'>('all');
  const [newResource, setNewResource] = useState({
    resource_type: 'bed' as ResourceType,
    name: '',
    code: '',
    floor: '',
    wing: '',
    capacity: 1,
    notes: '',
  });

  const { data: resources, isLoading } = useQuery({
    queryKey: ['hospital-resources', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      const { data, error } = await supabase
        .from('hospital_resources')
        .select('*')
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .order('resource_type', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Resource[];
    },
    enabled: !!hospital?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (resource: typeof newResource) => {
      if (!hospital?.id) throw new Error('No hospital');
      const { error } = await supabase
        .from('hospital_resources')
        .insert({
          hospital_id: hospital.id,
          ...resource,
          status: 'available',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-resources'] });
      setIsAddOpen(false);
      setNewResource({
        resource_type: 'bed',
        name: '',
        code: '',
        floor: '',
        wing: '',
        capacity: 1,
        notes: '',
      });
      toast({ title: 'Resource added successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ResourceStatus }) => {
      const { error } = await supabase
        .from('hospital_resources')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospital-resources'] });
      toast({ title: 'Status updated' });
    },
  });

  const filteredResources = resources?.filter(r => {
    if (filterType !== 'all' && r.resource_type !== filterType) return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    return true;
  });

  const stats = {
    total: resources?.length || 0,
    available: resources?.filter(r => r.status === 'available').length || 0,
    occupied: resources?.filter(r => r.status === 'occupied').length || 0,
    maintenance: resources?.filter(r => r.status === 'maintenance').length || 0,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bed className="h-5 w-5" />
              Resource Management
            </CardTitle>
            <CardDescription>Manage beds, rooms, and equipment</CardDescription>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Resource</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Resource Type</Label>
                  <Select
                    value={newResource.resource_type}
                    onValueChange={(v) => setNewResource(p => ({ ...p, resource_type: v as ResourceType }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bed">Bed</SelectItem>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={newResource.name}
                      onChange={(e) => setNewResource(p => ({ ...p, name: e.target.value }))}
                      placeholder="e.g., Bed 101"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input
                      value={newResource.code}
                      onChange={(e) => setNewResource(p => ({ ...p, code: e.target.value }))}
                      placeholder="e.g., B-101"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Floor</Label>
                    <Input
                      value={newResource.floor}
                      onChange={(e) => setNewResource(p => ({ ...p, floor: e.target.value }))}
                      placeholder="e.g., 1st"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Wing</Label>
                    <Input
                      value={newResource.wing}
                      onChange={(e) => setNewResource(p => ({ ...p, wing: e.target.value }))}
                      placeholder="e.g., East"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newResource.capacity}
                    onChange={(e) => setNewResource(p => ({ ...p, capacity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => addMutation.mutate(newResource)}
                  disabled={!newResource.name || addMutation.isPending}
                >
                  {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Resource
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-success/10">
            <p className="text-2xl font-bold text-success">{stats.available}</p>
            <p className="text-xs text-muted-foreground">Available</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-warning/10">
            <p className="text-2xl font-bold text-warning">{stats.occupied}</p>
            <p className="text-xs text-muted-foreground">Occupied</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted">
            <p className="text-2xl font-bold text-muted-foreground">{stats.maintenance}</p>
            <p className="text-xs text-muted-foreground">Maintenance</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bed">Beds</SelectItem>
                <SelectItem value="room">Rooms</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Resource Grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredResources?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No resources found. Add your first resource above.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredResources?.map((resource) => {
              const Icon = typeIcons[resource.resource_type];
              return (
                <div
                  key={resource.id}
                  className={`p-3 rounded-lg border ${statusColors[resource.status]} transition-colors`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{resource.name}</span>
                  </div>
                  <div className="text-xs space-y-1">
                    {resource.floor && <p>Floor: {resource.floor}</p>}
                    {resource.wing && <p>Wing: {resource.wing}</p>}
                  </div>
                  <div className="mt-2">
                    <Select
                      value={resource.status}
                      onValueChange={(v) => updateStatusMutation.mutate({ 
                        id: resource.id, 
                        status: v as ResourceStatus 
                      })}
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}