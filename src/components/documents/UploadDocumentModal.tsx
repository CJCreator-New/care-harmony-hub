import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FileUploadZone } from './FileUploadZone';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';

interface UploadDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId?: string;
  consultationId?: string;
  onSuccess?: () => void;
}

const documentTypes = [
  { value: 'lab_report', label: 'Lab Report' },
  { value: 'imaging', label: 'Imaging/Radiology' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'consent', label: 'Consent Form' },
  { value: 'referral', label: 'Referral Letter' },
  { value: 'discharge', label: 'Discharge Summary' },
  { value: 'insurance', label: 'Insurance Document' },
  { value: 'identification', label: 'ID Document' },
  { value: 'other', label: 'Other' },
];

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  open,
  onOpenChange,
  patientId,
  consultationId,
  onSuccess,
}) => {
  const { uploadDocument, isUploading, progress } = useDocumentUpload();
  const [documentType, setDocumentType] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isConfidential, setIsConfidential] = useState(false);

  const handleFilesSelected = async (files: File[]) => {
    if (!documentType || !title) {
      return;
    }

    for (const file of files) {
      await uploadDocument(file, {
        patientId,
        consultationId,
        documentType,
        title: files.length > 1 ? `${title} - ${file.name}` : title,
        description,
        isConfidential,
      });
    }

    // Reset form
    setDocumentType('');
    setTitle('');
    setDescription('');
    setIsConfidential(false);
    onOpenChange(false);
    onSuccess?.();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setDocumentType('');
      setTitle('');
      setDescription('');
      setIsConfidential(false);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type *</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="confidential"
              checked={isConfidential}
              onCheckedChange={setIsConfidential}
            />
            <Label htmlFor="confidential">Mark as Confidential</Label>
          </div>

          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            isUploading={isUploading}
            progress={progress?.percentage || 0}
          />

          {(!documentType || !title) && (
            <p className="text-sm text-muted-foreground text-center">
              Please fill in document type and title before uploading
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
