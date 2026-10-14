/**
 * Fonte de dados REAL da Inteligência Eleitoral (Fase 9).
 *
 * Substitui o antigo `mockElections`. Tudo aqui é derivado dos endpoints
 * `/api/admin/electoral/*`. NÃO há votos sintéticos.
 *
 * Limitações do contrato atual (reportadas como lacunas — ver relatório):
 * - A API entrega votos por geografia apenas para o candidato principal
 *   (número 15140). Os concorrentes têm identidade no registry mas SEM votos
 *   por município/seção — essas chaves são omitidas (nunca fabricadas).
 * - Seções não trazem nome de local, bairro, coordenadas, brancos, nulos
 *   nem comparecimento. O mapa usa coordenadas estáticas (municipalityGeo).
 */

import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type {
  Candidate,
  ElectionYear,
  MunicipalityData,
  MunicipalityGeo,
  SectionHistory,
  SectionVote,
} from '../types/election';
import {
  MAIN_CANDIDATE_NUMBER,
  fetchOverview,
  fetchSections,
  fetchZones,
  type ApiOverviewYear,
} from '../lib/electoralApi';
import { MAIN_CANDIDATE_ID, CANDIDATE_REGISTRY } from '../data/candidateRegistry';
import { MUNICIPALITIES_GEO } from '../data/municipalityGeo';

const SECTION_PAGE = 500;
const MAX_SECTIONS = 5000; // trava de segurança de memória (ver `truncated`)

export interface ElectionDataState {
  status: 'loading' | 'error' | 'ready';
  error: string | null;
  candidates: Candidate[];
  municipalities: MunicipalityData[];
  sections: SectionHistory[];
  geo: Record<string, MunicipalityGeo>;
  overviewYears: ApiOverviewYear[];
  truncated: boolean;
  reload: () => void;
}

function slugify(name: string | null | undefined): string {
  return (name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function zoneKey(zoneNumber: number | null | undefined): string {
  if (zoneNumber == null) return '';
  return String(zoneNumber).padStart(3, '0');
}

/** Constrói MunicipalityData[] a partir da agregação de zonas da API. */
function buildMunicipalities(
  zones: Awaited<ReturnType<typeof fetchZones>>['zones']
): MunicipalityData[] {
  const byId = new Map<string, MunicipalityData & { zoneSet: Set<string> }>();

  for (const zone of zones) {
    const id = slugify(zone.municipality.name);
    if (!id) continue;
    let entry = byId.get(id);
    if (!entry) {
      const geo = MUNICIPALITIES_GEO[id];
      entry = {
        id,
        name: zone.municipality.name ?? id,
        codeIBGE: geo?.codeIBGE ?? '',
        region: geo?.region ?? '',
        zones: [],
        electorate2018: 0,
        electorate2022: 0,
        electorate2026: 0,
        totalValid2018: 0,
        totalValid2022: 0,
        totalValid2026: 0,
        candidateVotes2018: {},
        candidateVotes2022: {},
        candidateVotes2026: {},
        zoneSet: new Set<string>(),
      };
      byId.set(id, entry);
    }
    entry.zoneSet.add(zoneKey(zone.zone_number));
    entry.totalValid2018 += zone.votes_2018;
    entry.totalValid2022 += zone.votes_2022;
    entry.totalValid2026 += zone.votes_2026;
    entry.candidateVotes2018[MAIN_CANDIDATE_ID] =
      (entry.candidateVotes2018[MAIN_CANDIDATE_ID] ?? 0) + zone.burigo_votes_2018;
    entry.candidateVotes2022[MAIN_CANDIDATE_ID] =
      (entry.candidateVotes2022[MAIN_CANDIDATE_ID] ?? 0) + zone.burigo_votes_2022;
    entry.candidateVotes2026[MAIN_CANDIDATE_ID] =
      (entry.candidateVotes2026[MAIN_CANDIDATE_ID] ?? 0) + zone.burigo_votes_2026;
  }

  return [...byId.values()]
    .map(({ zoneSet, ...mun }) => ({
      ...mun,
      zones: [...zoneSet].filter(Boolean).sort(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function buildSectionVote(
  year: number,
  sectionId: string,
  zoneId: string,
  municipalityId: string,
  valid: number,
  mainVotes: number
): SectionVote {
  return {
    sectionId,
    zoneId,
    municipalityId,
    votes: { [MAIN_CANDIDATE_ID]: mainVotes },
    // Campos não fornecidos pela API — omitidos como zero documentado (lacuna).
    blankVotes: 0,
    nullVotes: 0,
    totalValidVotes: valid,
    totalVoters: 0,
  };
}

function buildSections(rows: Awaited<ReturnType<typeof fetchSections>>['sections']): SectionHistory[] {
  return rows.map((row) => {
    const sectionId = String(row.section_number).padStart(4, '0');
    const zoneId = zoneKey(row.zone_number);
    const municipalityId = slugify(row.municipality_name);
    return {
      sectionId,
      zoneId,
      municipalityId,
      // Local/bairro não fornecidos pela API (lacuna).
      locationName: '',
      neighborhood: '',
      votes2018: buildSectionVote(2018, sectionId, zoneId, municipalityId, row.votes_2018, row.burigo_votes_2018),
      votes2022: buildSectionVote(2022, sectionId, zoneId, municipalityId, row.votes_2022, row.burigo_votes_2022),
      votes2026: buildSectionVote(2026, sectionId, zoneId, municipalityId, row.votes_2026, row.burigo_votes_2026),
    };
  });
}

const ElectionDataContext = createContext<ElectionDataState | null>(null);

export const ElectionDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [municipalities, setMunicipalities] = useState<MunicipalityData[]>([]);
  const [sections, setSections] = useState<SectionHistory[]>([]);
  const [overviewYears, setOverviewYears] = useState<ApiOverviewYear[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setError(null);

    (async () => {
      try {
        const [overview, zones] = await Promise.all([
          fetchOverview(controller.signal),
          fetchZones(controller.signal),
        ]);
        if (controller.signal.aborted) return;

        const muns = buildMunicipalities(zones.zones);

        // Seções paginadas (todas as páginas, com trava de segurança).
        const collected: SectionHistory[] = [];
        let offset = 0;
        let total = Infinity;
        let hitCap = false;
        while (offset < total) {
          const page = await fetchSections(
            { candidateNumber: MAIN_CANDIDATE_NUMBER, limit: SECTION_PAGE, offset },
            controller.signal
          );
          if (controller.signal.aborted) return;
          collected.push(...buildSections(page.sections));
          total = page.total;
          if (page.sections.length === 0) break;
          offset += SECTION_PAGE;
          if (collected.length >= MAX_SECTIONS) {
            hitCap = offset < total;
            break;
          }
        }

        setOverviewYears(overview.years);
        setMunicipalities(muns);
        setSections(collected);
        setTruncated(hitCap);
        setStatus('ready');
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Falha ao carregar dados eleitorais.');
        setStatus('error');
      }
    })();

    return () => controller.abort();
  }, [reloadToken]);

  const value = useMemo<ElectionDataState>(
    () => ({
      status,
      error,
      candidates: CANDIDATE_REGISTRY,
      municipalities,
      sections,
      geo: MUNICIPALITIES_GEO,
      overviewYears,
      truncated,
      reload: () => setReloadToken((n) => n + 1),
    }),
    [status, error, municipalities, sections, overviewYears, truncated]
  );

  return <ElectionDataContext.Provider value={value}>{children}</ElectionDataContext.Provider>;
};

export function useElectionData(): ElectionDataState {
  const ctx = useContext(ElectionDataContext);
  if (!ctx) throw new Error('useElectionData must be used within an ElectionDataProvider');
  return ctx;
}

/** Estados de carregamento/erro/vazio — para o provider envolver a UI. */
export const ElectionDataGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { status, error, municipalities, reload } = useElectionData();
  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-4 border-neutral-200 border-t-emerald-700 animate-spin" aria-hidden="true" />
          <p className="text-sm font-semibold text-neutral-600" role="status" aria-live="polite">
            Carregando dados eleitorais…
          </p>
        </div>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="max-w-md text-center space-y-3">
          <p className="text-sm font-semibold text-neutral-900">Não foi possível carregar os dados eleitorais.</p>
          <p className="text-xs text-neutral-500">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }
  if (municipalities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm font-semibold text-neutral-600">
          Nenhum dado eleitoral disponível para o escopo atual.
        </p>
      </div>
    );
  }
  return <>{children}</>;
};
