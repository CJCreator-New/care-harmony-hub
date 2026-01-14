import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { sanitizeLogMessage } from '@/utils/sanitize';

interface UploadOptions {
  patientId?: string;
  consultationId?: string;
  documentType: string;
  title: string;
  description?: string;
  isConfidential?: boolean;
  tags?: string[];
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export const useDocumentUpload = () => {
  const { profile } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadDocument = useCallback(async (
    file: File,
    options: UploadOptions
  ) => {
    if (!profile?.hospital_id) {
      toast.error('Hospital not found');
      return null;
    }

    const hospitalId = profile.hospital_id;
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${hospitalId}/${options.patientId || 'general'}/${fileName}`;

    setIsUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create document record
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .insert({
          hospital_id: hospitalId,
          patient_id: options.patientId || null,
          consultation_id: options.consultationId || null,
          uploaded_by: profile.id,
          document_type: options.documentType,
          title: options.title,
          description: options.description || null,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          is_confidential: options.isConfidential || false,
          tags: options.tags || null,
        })
        .select()
        .single();

      if (docError) {
        // Clean up uploaded file if record creation fails
        await supabase.storage.from('documents').remove([uploadData.path]);
        throw docError;
      }

      setProgress({ loaded: file.size, total: file.size, percentage: 100 });
      toast.success('Document uploaded successfully');
      return docData;
    } catch (error) {
      console.error('Error uploading document:', sanitizeLogMessage(error instanceof Error ? error.message : 'Unknown error'));
      toast.error('Failed to upload document');
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(null), 1000);
    }
  }, [profile]);

  const getDocumentUrl = useCallback(async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting document URL:', error);
      return null;
    }

    return data.signedUrl;
  }, []);

  const deleteDocument = useCallback(async (documentId: string, filePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath]);

      if (storageError) {
        throw storageError;
      }

      // Delete record
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw dbError;
      }

      toast.success('Document deleted');
      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
      return false;
    }
  }, []);

  return {
    uploadDocument,
    getDocumentUrl,
    deleteDocument,
    isUploading,
    progress,
  };
};
