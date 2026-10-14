export interface PublicLegislativeItemDto {
  id: string;
  code: string;
  title: string;
  year: number;
  type?: string;
  ementa?: string;
  authorship?: string;
  status?: string;
  tramitacao?: string;
  documents?: any[];
  lawNumber?: string;
}

export function extractLegislativeCode(code: string): string {
  return code || '';
}

export function normalizeLegislativeCode(code: string): string {
  return code ? code.trim().toUpperCase() : '';
}
