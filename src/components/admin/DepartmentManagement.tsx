import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Plus, 
  Users,
  Loader2,
  Edit,
  Trash2,
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  head_of_department: string | null;
}

export function DepartmentManagement() {
  const { hospital } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
  });

  const { data: departments, isLoading } = useQuery({
    queryKey: ['departments', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('hospital_id', hospital.id)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return data as Department[];
    },
    enabled: !!hospital?.id,
  });

  const { data: staffCounts } = useQuery({
    queryKey: ['department-staff-counts', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return {};
      // For now, return empty counts since we don't have department assignment on profiles
      return {};
    },
    enabled: !!hospital?.id,
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!hospital?.id) throw new Error('No hospital');
      const { error } = await supabase
        .from('departments')
        .insert({
          hospital_id: hospital.id,
          name: data.name,
          code: data.code || null,
          description: data.description || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: 'Department created successfully' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('departments')
        .update({
          name: data.name,
          code: data.code || null,
          description: data.description || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      setEditingDept(null);
      resetForm();
      toast({ title: 'Department updated' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('departments')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Department removed' });
    },
  });

  const resetForm = () => {
    setFormData({ name: '', code: '', description: '' });
  };

  const openEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
    });
  };

  const handleSubmit = () => {
    if (editingDept) {
      updateMutation.mutate({ id: editingDept.id, data: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  const activeDepartments = departments?.filter(d => d.is_active) || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Departments
            </CardTitle>
            <CardDescription>Manage hospital departments and units</CardDescription>
          </div>
          <Dialog open={isAddOpen || !!editingDept} onOpenChange={(open) => {
            if (!open) {
              setIsAddOpen(false);
              setEditingDept(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingDept ? 'Edit Department' : 'Add New Department'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Department Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Emergency Department"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department Code</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData(p => ({ ...p, code: e.target.value }))}
                    placeholder="e.g., ED"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Brief description of the department..."
                    rows={3}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={!formData.name || addMutation.isPending || updateMutation.isPending}
                >
                  {(addMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingDept ? 'Update Department' : 'Create Department'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeDepartments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No departments configured. Add your first department above.
          </div>
        ) : (
          <div className="space-y-3">
            {activeDepartments.map((dept) => (
              <div
                key={dept.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{dept.name}</h4>
                      {dept.code && (
                        <Badge variant="secondary" className="text-xs">{dept.code}</Badge>
                      )}
                    </div>
                    {dept.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">{dept.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this department?')) {
                        deleteMutation.mutate(dept.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}