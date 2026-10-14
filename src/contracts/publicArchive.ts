export type DocumentVisibility = 'publico' | 'interno' | 'restrito';

export interface PublicDocumentDto {
  id: string;
  legislativeItemId?: string | null;
  evidenceId?: string | null;
  documentType: string;
  title: string;
  originalUrl?: string | null;
  publicUrl?: string | null;
  storagePath: string;
  mimeType: string;
  fileSize: number;
  sha256?: string | null;
  sourceName?: string | null;
  publishedAt?: string | null;
  downloadedAt?: string | null;
  verificationStatus: string;
  rightsStatus: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  visible: boolean;
  category: string;
  status: string;
  tags: string[];
  visibility: DocumentVisibility;
}

export interface PublicEvidenceDto {
  id: string;
  title: string;
  description?: string | null;
  sourceName?: string | null;
  url?: string;
  type?: string;
  createdAt?: string;
}
