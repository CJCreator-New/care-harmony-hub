import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, ExternalLink, FileText, Image, File, Lock, Calendar, User } from 'lucide-react';
import { useDocumentUpload } from '@/hooks/useDocumentUpload';
import { format } from 'date-fns';

interface Document {
  id: string;
  title: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: string;
  description: string | null;
  is_confidential: boolean | null;
  created_at: string;
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

interface DocumentViewerProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const documentTypeLabels: Record<string, string> = {
  lab_report: 'Lab Report',
  imaging: 'Imaging/Radiology',
  prescription: 'Prescription',
  consent: 'Consent Form',
  referral: 'Referral Letter',
  discharge: 'Discharge Summary',
  insurance: 'Insurance Document',
  identification: 'ID Document',
  other: 'Other',
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string | null) => {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return FileText;
  return File;
};

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  open,
  onOpenChange,
}) => {
  const { getDocumentUrl } = useDocumentUpload();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchUrl = async () => {
      if (document?.file_path && open) {
        setIsLoading(true);
        const url = await getDocumentUrl(document.file_path);
        setSignedUrl(url);
        setIsLoading(false);
      }
    };
    fetchUrl();
  }, [document?.file_path, open, getDocumentUrl]);

  if (!document) return null;

  const Icon = getFileIcon(document.mime_type);
  const isImage = document.mime_type?.startsWith('image/');
  const isPdf = document.mime_type === 'application/pdf';

  const handleDownload = () => {
    if (signedUrl) {
      const link = window.document.createElement('a');
      link.href = signedUrl;
      link.download = document.file_name;
      link.click();
    }
  };

  const handleOpenExternal = () => {
    if (signedUrl) {
      window.open(signedUrl, '_blank');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Icon className="h-8 w-8 text-muted-foreground" />
              <div>
                <DialogTitle className="text-lg">{document.title}</DialogTitle>
                <p className="text-sm text-muted-foreground">{document.file_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {document.is_confidential && (
                <Badge variant="destructive" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Confidential
                </Badge>
              )}
              <Badge variant="secondary">
                {documentTypeLabels[document.document_type] || document.document_type}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4 border-y">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Uploaded:</span>
            <span>{format(new Date(document.created_at), 'MMM d, yyyy HH:mm')}</span>
          </div>
          {document.uploader && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">By:</span>
              <span>{document.uploader.first_name} {document.uploader.last_name}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <File className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Size:</span>
            <span>{formatFileSize(document.file_size)}</span>
          </div>
        </div>

        {document.patient && (
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm">
              <span className="text-muted-foreground">Patient: </span>
              <span className="font-medium">
                {document.patient.first_name} {document.patient.last_name}
              </span>
              <span className="text-muted-foreground ml-2">MRN: {document.patient.mrn}</span>
            </p>
          </div>
        )}

        {document.description && (
          <div className="text-sm">
            <p className="text-muted-foreground mb-1">Description:</p>
            <p>{document.description}</p>
          </div>
        )}

        <div className="flex-1 min-h-[300px] bg-muted/30 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Skeleton className="w-full h-full" />
            </div>
          ) : signedUrl ? (
            <>
              {isImage && (
                <img
                  src={signedUrl}
                  alt={document.title}
                  className="w-full h-full object-contain"
                />
              )}
              {isPdf && (
                <iframe
                  src={signedUrl}
                  title={document.title}
                  className="w-full h-full min-h-[400px]"
                />
              )}
              {!isImage && !isPdf && (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <Icon className="h-16 w-16 text-muted-foreground" />
                  <p className="text-muted-foreground">Preview not available for this file type</p>
                  <Button onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" />
                    Download File
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Failed to load document</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleOpenExternal} disabled={!signedUrl}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in New Tab
          </Button>
          <Button onClick={handleDownload} disabled={!signedUrl}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
