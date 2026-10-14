import type { PublicLegislativeItemDto } from '../../src/contracts/publicLegislative';

export type LegislativeItemRow = {
  id: string;
  type: string;
  number?: string | number | null;
  year?: number | null;
  title?: string | null;
  summary?: string | null;
  authorship?: string | null;
  status?: string | null;
  tramitacao?: string | null;
  link_alrs?: string | null;
  created_at?: string;
};

export function normalizeLegislativeCode(code: string): string {
  return (code || '').trim().toUpperCase();
}

export function toPublicLegislativeItemDto(item: any, options?: any): PublicLegislativeItemDto {
  return {
    id: item.id || '',
    code: item.code || `${item.type || 'PL'} ${item.number || ''}/${item.year || ''}`.trim(),
    title: item.title || item.summary || '',
    year: Number(item.year) || 2026,
    type: item.type || 'PL',
    ementa: item.summary || item.ementa || '',
    authorship: item.authorship || 'Carlos Búrigo',
    status: item.status || 'Em tramitação',
    tramitacao: item.tramitacao || '',
    documents: item.documents || [],
    lawNumber: item.law_number || item.lawNumber || undefined,
  };
}

export function toPublicResultDto(item: any): any {
  return {
    id: item.id || '',
    title: item.title || '',
    description: item.description || '',
    category: item.category || 'Gestão Pública',
    metrics: item.metrics,
    date: item.date || item.created_at,
  };
}
