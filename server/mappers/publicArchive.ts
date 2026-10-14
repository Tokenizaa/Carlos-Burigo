import type { PublicDocumentDto, PublicEvidenceDto } from '../../src/contracts/publicArchive';

export function mapToPublicMediaDto(row: any) {
  return {
    id: row.id,
    name: row.title || row.name || '',
    title: row.title || '',
    altText: row.alt_text || row.altText || '',
    description: row.description || '',
    credit: row.credit || '',
    photographer: row.photographer || '',
    sourceName: row.source_name || '',
    category: row.category || 'fotos',
    url: row.url || '',
    size: Number(row.size) || 0,
    mimeType: row.mime_type || 'image/jpeg',
    uploadedAt: row.created_at || row.uploadedAt || new Date().toISOString(),
  };
}

export function mapToPublicVideoDto(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    url: row.url,
    platform: row.platform || 'YouTube',
    category: row.category || 'Gabinete',
    date: row.published_at || row.created_at || new Date().toISOString(),
    thumbnail: row.thumbnail_url || row.thumbnail || '',
    featured: Boolean(row.featured),
    status: row.status || 'ativo',
    sourceName: row.source_name,
    verificationStatus: row.verification_status,
    rightsStatus: row.rights_status,
  };
}

export function mapToPublicDocumentDto(row: any): PublicDocumentDto {
  return {
    id: row.id,
    legislativeItemId: row.legislative_item_id || null,
    evidenceId: row.evidence_id || null,
    documentType: row.document_type || 'DOCUMENTO',
    title: row.title || '',
    originalUrl: row.original_url || null,
    publicUrl: row.public_url || null,
    storagePath: row.storage_path || '',
    mimeType: row.mime_type || 'application/pdf',
    fileSize: Number(row.file_size) || 0,
    sha256: row.sha256 || null,
    sourceName: row.source_name || null,
    publishedAt: row.published_at || null,
    downloadedAt: row.downloaded_at || null,
    verificationStatus: row.verification_status || 'FOUND_UNVERIFIED',
    rightsStatus: row.rights_status || 'UNKNOWN',
    notes: row.notes || null,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
    visible: row.visible !== false,
    category: row.category || 'parlamentar',
    status: row.status || 'publicado',
    tags: Array.isArray(row.tags) ? row.tags : [],
    visibility: row.visibility || 'publico',
  };
}

export function mapToPublicEvidenceDto(row: any): PublicEvidenceDto {
  return {
    id: row.id,
    title: row.title || '',
    description: row.description || null,
    sourceName: row.source_name || null,
    url: row.url,
    type: row.type,
    createdAt: row.created_at,
  };
}
