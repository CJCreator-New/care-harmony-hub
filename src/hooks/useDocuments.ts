import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Document {
  id: string;
  hospital_id: string;
  patient_id: string | null;
  consultation_id: string | null;
  uploaded_by: string;
  document_type: string;
  title: string;
  description: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  is_confidential: boolean | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    mrn: string;
  };
  uploader?: {
    first_name: string;
    last_name: string;
  };
}

export const useDocuments = (patientId?: string) => {
  const { profile } = useAuth();
  const hospitalId = profile?.hospital_id;
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', hospitalId, patientId],
    queryFn: async () => {
      if (!hospitalId) return [];
      
      let query = supabase
        .from('documents')
        .select(`
          *,
          patient:patients(first_name, last_name, mrn),
          uploader:profiles!documents_uploaded_by_fkey(first_name, last_name)
        `)
        .eq('hospital_id', hospitalId)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Document[];
    },
    enabled: !!hospitalId,
  });

  const uploadDocument = useMutation({
    mutationFn: async (doc: {
      patient_id?: string;
      consultation_id?: string;
      document_type: string;
      title: string;
      description?: string;
      file_name: string;
      file_path: string;
      file_size?: number;
      mime_type?: string;
      is_confidential?: boolean;
      tags?: string[];
    }) => {
      if (!hospitalId || !profile) throw new Error('No hospital or profile');
      
      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...doc,
          hospital_id: hospitalId,
          uploaded_by: profile.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document uploaded successfully');
    },
    onError: (error) => {
      toast.error('Failed to upload document: ' + error.message);
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete document: ' + error.message);
    },
  });

  const documentsByType = documents?.reduce((acc, doc) => {
    const type = doc.document_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(doc);
    return acc;
  }, {} as Record<string, Document[]>) || {};

  return {
    documents,
    documentsByType,
    isLoading,
    uploadDocument,
    deleteDocument,
  };
};
