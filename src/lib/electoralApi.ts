/**
 * Client tipado para a API de Inteligência Eleitoral (Fase 9).
 *
 * Base: /api/admin/electoral/ — autenticação via Bearer token da sessão
 * Supabase (mesmo padrão de src/context/AppContext.tsx). Nenhum dado é
 * fabricado aqui; o cliente apenas transporta o contrato do Worker.
 */

import { getSupabaseClient } from './supabaseClient';
import type { ElectionYear } from '../types/election';

const BASE = '/api/admin/electoral';

/** Número eleitoral do candidato principal (Carlos Búrigo). */
export const MAIN_CANDIDATE_NUMBER = '15140';

export interface ApiOverviewYear {
  year: number;
  total_votes: number;
  burigo_votes: number;
  burigo_rank_abs: number | null;
  municipalities_total: number;
  zones_total: number;
  sections_total: number;
  candidates: number;
}

export interface ApiCandidateOption {
  year: number;
  candidate_number: number;
  candidate_name: string | null;
  votes: number | null;
  rank: number | null;
}

export interface ApiZoneEntry {
  zone_id: string;
  zone_number: number | null;
  municipality: { id: string; name: string | null };
  sections_count: number;
  votes_2018: number;
  votes_2022: number;
  votes_2026: number;
  burigo_votes_2018: number;
  burigo_votes_2022: number;
  burigo_votes_2026: number;
}

export interface ApiSectionEntry {
  section_id: string;
  zone_number: number | null;
  municipality_id: string;
  municipality_name: string | null;
  section_number: number;
  votes_2018: number;
  votes_2022: number;
  votes_2026: number;
  burigo_votes_2018: number;
  burigo_votes_2022: number;
  burigo_votes_2026: number;
}

export interface ApiMunicipalityZone {
  zone_id: string;
  zone_number: number | null;
  sections_count: number;
  votes_2018: number;
  votes_2022: number;
  votes_2026: number;
  burigo_votes_2018: number;
  burigo_votes_2022: number;
  burigo_votes_2026: number;
}

export interface ApiMunicipalityDetail {
  municipality: {
    id: string;
    name: string | null;
    code_tse: string | null;
    code_ibge: number | null;
    region: string | null;
  };
  zones: ApiMunicipalityZone[];
  sections_count: number;
  electorate_2018: number;
  electorate_2022: number;
  electorate_2026: number;
  votes_2018: number;
  votes_2022: number;
  votes_2026: number;
  burigo_votes_2018: number;
  burigo_votes_2022: number;
  burigo_votes_2026: number;
}

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const client = await getSupabaseClient();
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: await authHeaders(),
    credentials: 'same-origin',
    signal,
  });
  if (!response.ok) {
    let message = `Falha na requisição (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // corpo não-JSON — mantém mensagem padrão
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function fetchCandidates(year: ElectionYear, q: string, signal?: AbortSignal): Promise<{ candidates: ApiCandidateOption[] }> {
  return getJson(`/candidates?year=${year}&q=${encodeURIComponent(q)}`, signal);
}

export function fetchOverview(signal?: AbortSignal): Promise<{ years: ApiOverviewYear[] }> {
  return getJson('/overview', signal);
}

export function fetchZones(signal?: AbortSignal): Promise<{ zones: ApiZoneEntry[] }> {
  return getJson('/zones', signal);
}

export function fetchSections(
  params: {
    municipalityId?: string;
    zoneId?: string;
    candidateNumber?: string;
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal
): Promise<{ sections: ApiSectionEntry[]; total: number; limit: number; offset: number }> {
  const search = new URLSearchParams();
  if (params.municipalityId) search.set('municipalityId', params.municipalityId);
  if (params.zoneId) search.set('zoneId', params.zoneId);
  if (params.candidateNumber) search.set('candidateNumber', params.candidateNumber);
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.offset != null) search.set('offset', String(params.offset));
  const qs = search.toString();
  return getJson(`/sections${qs ? `?${qs}` : ''}`, signal);
}

export function fetchMunicipality(code: string, signal?: AbortSignal): Promise<ApiMunicipalityDetail> {
  return getJson(`/municipality/${encodeURIComponent(code)}`, signal);
}
