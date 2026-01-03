import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Image, File, Lock, MoreVertical, Eye, Download, Trash2 } from 'lucide-react';
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

interface DocumentCardProps {
  document: Document;
  onView: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
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

const documentTypeColors: Record<string, string> = {
  lab_report: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  imaging: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  prescription: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  consent: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  referral: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  discharge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  insurance: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  identification: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};

const formatFileSize = (bytes: number | null): string => {
  if (!bytes) return '';
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

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onView,
  onDownload,
  onDelete,
}) => {
  const Icon = getFileIcon(document.mime_type);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer group" onClick={() => onView(document)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium truncate">{document.title}</h3>
                <p className="text-sm text-muted-foreground truncate">{document.file_name}</p>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(document); }}>
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(document); }}>
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={(e) => { e.stopPropagation(); onDelete(document); }}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Badge className={documentTypeColors[document.document_type] || documentTypeColors.other}>
                {documentTypeLabels[document.document_type] || document.document_type}
              </Badge>
              {document.is_confidential && (
                <Badge variant="destructive" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Confidential
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span>{format(new Date(document.created_at), 'MMM d, yyyy')}</span>
              {document.file_size && <span>{formatFileSize(document.file_size)}</span>}
              {document.patient && (
                <span className="truncate">
                  Patient: {document.patient.first_name} {document.patient.last_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
