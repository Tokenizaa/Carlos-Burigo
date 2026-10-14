/**
 * Inteligência Eleitoral — agregações geográficas (zonas / seções / município).
 *
 * Somente leitura. Fontes:
 * - Projeção analítica: electoral_analytics_elections / _candidates / _municipalities / _candidate_municipal
 * - Raw canônico: electoral_results_nominal (votos por seção/candidato)
 *                 electoral_results_totals (totais por seção: valid_votes / electorate)
 * - Dimensões: electoral_zones, electoral_zone_municipalities, electoral_municipalities,
 *              electoral_sections, electoral_rounds, electoral_elections, electoral_candidates
 *
 * Nunca expõe import_run_id / source_dataset_id.
 *
 * ponytail: agregação em JS porque o PostgREST deste projeto tem agregação
 * desabilitada (PGRST123) e max-rows=1000 (paginamos em blocos de 1000).
 * As agregações pesadas são memoizadas no isolate do Worker (dados históricos,
 * imutáveis). Se o plano Cloudflare limitar subrequisições, migrar para
 * view/RPC no banco (handoff @banco).
 */
import { supabaseAdmin } from './supabase';

export const ELECTORAL_YEARS = [2018, 2022, 2026] as const;
export type ElectoralYear = (typeof ELECTORAL_YEARS)[number];
export const MAIN_CANDIDATE_NUMBER = '15140';

const PAGE = 1000;
const CONCURRENCY = 8;

type Row = Record<string, any>;
type AnyQuery = any;

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

async function countRows(table: string, filter?: (q: AnyQuery) => AnyQuery): Promise<number> {
  let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true }) as unknown as AnyQuery;
  if (filter) query = filter(query);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/**
 * Busca todas as linhas paginando (PostgREST limita a 1000 por request).
 *
 * - `order === 'id'` usa keyset (`id > cursor`): um índice seek por página,
 *   sem offset profundo — evita o statement_timeout de 8s do role da API.
 * - Outros `order` usam offset (tabelas pequenas).
 *
 * Os roles anon/authenticated têm statement_timeout de 8s; não usamos count(*).
 */
async function fetchAll(table: string, columns: string, order: string, filter?: (q: AnyQuery) => AnyQuery): Promise<Row[]> {
  const keyset = order.trim() === 'id';
  const out: Row[] = [];
  if (keyset) {
    const selectColumns = columns.split(',').some((c) => c.trim() === 'id') ? columns : `id,${columns}`;
    let cursor: string | null = null;
    for (;;) {
      let query = supabaseAdmin.from(table).select(selectColumns) as unknown as AnyQuery;
      if (filter) query = filter(query);
      if (cursor) query = query.gt('id', cursor);
      const { data, error } = await query.order('id', { ascending: true }).limit(PAGE);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      out.push(...rows);
      if (rows.length < PAGE) break;
      cursor = String(rows[rows.length - 1].id);
    }
    return out;
  }

  const orderColumns = order.split(',').map((c) => c.trim()).filter(Boolean);
  const buildPage = (start: number) => {
    let query = supabaseAdmin.from(table).select(columns) as unknown as AnyQuery;
    if (filter) query = filter(query);
    for (const column of orderColumns) query = query.order(column, { ascending: true });
    return query.range(start, start + PAGE - 1);
  };

  // Sonda a primeira página sozinha: tabelas pequenas terminam em 1 request.
  const first = await buildPage(0);
  if (first.error) throw first.error;
  const firstRows = (first.data ?? []) as Row[];
  out.push(...firstRows);
  if (firstRows.length < PAGE) return out;

  let from = PAGE;
  for (;;) {
    const batch: Promise<any>[] = [];
    for (let k = 0; k < CONCURRENCY; k++) batch.push(buildPage(from + k * PAGE));
    const results = await Promise.all(batch);
    let lastLength = 0;
    for (const result of results) {
      if (result.error) throw result.error;
      const rows = (result.data ?? []) as Row[];
      out.push(...rows);
      lastLength = rows.length;
    }
    if (lastLength < PAGE) break;
    from += CONCURRENCY * PAGE;
  }
  return out;
}

let roundYearPromise: Promise<Map<string, number>> | null = null;
/** round_id -> ano eleitoral. */
function loadRoundYears(): Promise<Map<string, number>> {
  if (!roundYearPromise) {
    roundYearPromise = (async () => {
      const [rounds, elections] = await Promise.all([
        fetchAll('electoral_rounds', 'id,election_id', 'id'),
        fetchAll('electoral_elections', 'id,year', 'id'),
      ]);
      const yearByElection = new Map(elections.map((e) => [String(e.id), toNumber(e.year)]));
      const map = new Map<string, number>();
      for (const round of rounds) {
        const year = yearByElection.get(String(round.election_id));
        if (year) map.set(String(round.id), year);
      }
      return map;
    })().catch((error) => {
      roundYearPromise = null;
      throw error;
    });
  }
  return roundYearPromise;
}

/** candidate_id -> ano, para um candidate_number. electoral_candidates não tem coluna year. */
async function loadCandidateIds(candidateNumber: string): Promise<Map<string, number>> {
  const [candidates, elections] = await Promise.all([
    fetchAll('electoral_candidates', 'id,election_id,candidate_number', 'id', (q) => q.eq('candidate_number', candidateNumber)),
    fetchAll('electoral_elections', 'id,year', 'id'),
  ]);
  const yearByElection = new Map(elections.map((e) => [String(e.id), toNumber(e.year)]));
  const map = new Map<string, number>();
  for (const candidate of candidates) {
    const year = yearByElection.get(String(candidate.election_id));
    if (year) map.set(String(candidate.id), year);
  }
  return map;
}

function emptyYears(prefix: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const year of ELECTORAL_YEARS) out[`${prefix}_${year}`] = 0;
  return out;
}

function addYear(bucket: Record<string, number>, prefix: string, year: number, value: number): void {
  bucket[`${prefix}_${year}`] = (bucket[`${prefix}_${year}`] ?? 0) + value;
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface ElectoralOverviewYear {
  year: number;
  total_votes: number;
  burigo_votes: number;
  burigo_rank_abs: number | null;
  municipalities_total: number;
  zones_total: number;
  sections_total: number;
  candidates: number;
}

export async function getElectoralOverview(): Promise<{ years: ElectoralOverviewYear[] }> {
  const [elections, burigo, zonesTotal, sectionsTotal] = await Promise.all([
    fetchAll('electoral_analytics_elections', 'year,total_nominal_votes,municipalities,candidates', 'year'),
    fetchAll('electoral_analytics_candidates', 'year,candidate_number,votes,rank', 'year', (q) => q.eq('candidate_number', Number(MAIN_CANDIDATE_NUMBER))),
    countRows('electoral_zones'),
    countRows('electoral_sections'),
  ]);
  const electionByYear = new Map(elections.map((row) => [toNumber(row.year), row]));
  const burigoByYear = new Map(burigo.map((row) => [toNumber(row.year), row]));
  const years = ELECTORAL_YEARS.map((year) => {
    const election = electionByYear.get(year);
    const candidate = burigoByYear.get(year);
    return {
      year,
      total_votes: toNumber(election?.total_nominal_votes),
      burigo_votes: toNumber(candidate?.votes),
      burigo_rank_abs: candidate?.rank == null ? null : toNumber(candidate.rank),
      municipalities_total: toNumber(election?.municipalities),
      zones_total: zonesTotal,
      sections_total: sectionsTotal,
      candidates: toNumber(election?.candidates),
    };
  });
  return { years };
}

// ---------------------------------------------------------------------------
// Zonas
// ---------------------------------------------------------------------------

type ZoneCell = { sectionIds: Set<string>; votes: Record<string, number>; burigo: Record<string, number> };

let zoneAggPromise: Promise<Map<string, ZoneCell>> | null = null;
/** Por (ano, zona, município): valid_votes + votos por seção + votos do candidato principal. */
function loadMainZoneAggregation(): Promise<Map<string, ZoneCell>> {
  if (!zoneAggPromise) {
    zoneAggPromise = (async () => {
      const [roundYears, burigoIds] = await Promise.all([
        loadRoundYears(),
        loadCandidateIds(MAIN_CANDIDATE_NUMBER),
      ]);
      const cells = new Map<string, ZoneCell>();
      const cellFor = (key: string) => {
        let cell = cells.get(key);
        if (!cell) {
          cell = { sectionIds: new Set(), votes: emptyYears('votes'), burigo: emptyYears('burigo_votes') };
          cells.set(key, cell);
        }
        return cell;
      };

      const totals = await fetchAll('electoral_results_totals', 'round_id,zone_id,municipality_id,section_id,valid_votes', 'id');
      for (const row of totals) {
        const year = roundYears.get(String(row.round_id));
        if (!year) continue;
        const cell = cellFor(`${year}|${row.zone_id}|${row.municipality_id}`);
        addYear(cell.votes, 'votes', year, toNumber(row.valid_votes));
        if (row.section_id) cell.sectionIds.add(String(row.section_id));
      }

      const candidateIds = [...burigoIds.keys()];
      if (candidateIds.length) {
        const nominal = await fetchAll('electoral_results_nominal', 'candidate_id,zone_id,municipality_id,votes', 'candidate_id,id', (q) => q.in('candidate_id', candidateIds));
        for (const row of nominal) {
          const year = burigoIds.get(String(row.candidate_id));
          if (!year) continue;
          const cell = cellFor(`${year}|${row.zone_id}|${row.municipality_id}`);
          addYear(cell.burigo, 'burigo_votes', year, toNumber(row.votes));
        }
      }
      return cells;
    })().catch((error) => {
      zoneAggPromise = null;
      throw error;
    });
  }
  return zoneAggPromise;
}

export interface ElectoralZoneEntry {
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

export async function getElectoralZones(): Promise<{ zones: ElectoralZoneEntry[] }> {
  const [cells, zones, pairs, municipalities] = await Promise.all([
    loadMainZoneAggregation(),
    fetchAll('electoral_zones', 'id,zone_number', 'id'),
    fetchAll('electoral_zone_municipalities', 'zone_id,municipality_id', 'zone_id,municipality_id'),
    fetchAll('electoral_municipalities', 'id,name', 'id'),
  ]);
  const zoneNumberById = new Map(zones.map((z) => [String(z.id), toNumber(z.zone_number)]));
  const nameById = new Map(municipalities.map((m) => [String(m.id), m.name == null ? null : String(m.name)]));

  const result = pairs.map((pair) => {
    const zoneId = String(pair.zone_id);
    const municipalityId = String(pair.municipality_id);
    let sectionsCount = 0;
    const votes = emptyYears('votes');
    const burigo = emptyYears('burigo_votes');
    for (const year of ELECTORAL_YEARS) {
      const cell = cells.get(`${year}|${zoneId}|${municipalityId}`);
      if (!cell) continue;
      votes[`votes_${year}`] = cell.votes[`votes_${year}`];
      burigo[`burigo_votes_${year}`] = cell.burigo[`burigo_votes_${year}`];
      if (cell.sectionIds.size > sectionsCount) sectionsCount = cell.sectionIds.size;
    }
    return {
      zone_id: zoneId,
      zone_number: zoneNumberById.get(zoneId) ?? null,
      municipality: { id: municipalityId, name: nameById.get(municipalityId) ?? null },
      sections_count: sectionsCount,
      votes_2018: votes.votes_2018,
      votes_2022: votes.votes_2022,
      votes_2026: votes.votes_2026,
      burigo_votes_2018: burigo.burigo_votes_2018,
      burigo_votes_2022: burigo.burigo_votes_2022,
      burigo_votes_2026: burigo.burigo_votes_2026,
    } satisfies ElectoralZoneEntry;
  });

  result.sort((a, b) => (a.zone_number ?? 0) - (b.zone_number ?? 0));
  return { zones: result };
}

// ---------------------------------------------------------------------------
// Seções (drill-down)
// ---------------------------------------------------------------------------

export interface ElectoralSectionParams {
  municipalityId?: string | null;
  zoneId?: string | null;
  candidateNumber: string;
  limit: number;
  offset: number;
}

export interface ElectoralSectionEntry {
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

export async function getElectoralSections(params: ElectoralSectionParams): Promise<{
  sections: ElectoralSectionEntry[];
  total: number;
  limit: number;
  offset: number;
}> {
  const { municipalityId, zoneId, candidateNumber, limit, offset } = params;
  const [roundYears, candidateIds] = await Promise.all([
    loadRoundYears(),
    loadCandidateIds(candidateNumber),
  ]);

  const applyFilter = (q: AnyQuery): AnyQuery => {
    let query = q;
    if (municipalityId) query = query.eq('municipality_id', municipalityId);
    if (zoneId) query = query.eq('zone_id', zoneId);
    return query;
  };

  const total = await countRows('electoral_sections', applyFilter);

  let pageQuery = supabaseAdmin.from('electoral_sections').select('id,zone_id,municipality_id,section_number') as unknown as AnyQuery;
  pageQuery = applyFilter(pageQuery)
    .order('zone_id', { ascending: true })
    .order('section_number', { ascending: true })
    .range(offset, offset + limit - 1);
  const { data: sectionRows, error: sectionError } = await pageQuery;
  if (sectionError) throw sectionError;
  const sections = (sectionRows ?? []) as Row[];

  const sectionIds = sections.map((row) => String(row.id));
  const zoneIds = [...new Set(sections.map((row) => String(row.zone_id)))];
  const municipalityIds = [...new Set(sections.map((row) => String(row.municipality_id)))];
  const candidateIdList = [...candidateIds.keys()];

  const [zones, municipalities, totals, nominal] = await Promise.all([
    zoneIds.length ? fetchAll('electoral_zones', 'id,zone_number', 'id', (q) => q.in('id', zoneIds)) : Promise.resolve([]),
    municipalityIds.length ? fetchAll('electoral_municipalities', 'id,name', 'id', (q) => q.in('id', municipalityIds)) : Promise.resolve([]),
    sectionIds.length ? fetchAll('electoral_results_totals', 'round_id,section_id,valid_votes', 'id', (q) => q.in('section_id', sectionIds)) : Promise.resolve([]),
    sectionIds.length && candidateIdList.length
      ? fetchAll('electoral_results_nominal', 'section_id,votes,candidate_id', 'candidate_id,id', (q) => q.in('section_id', sectionIds).in('candidate_id', candidateIdList))
      : Promise.resolve([]),
  ]);

  const zoneNumberById = new Map(zones.map((z) => [String(z.id), toNumber(z.zone_number)]));
  const nameById = new Map(municipalities.map((m) => [String(m.id), m.name == null ? null : String(m.name)]));

  const bySection = new Map<string, { votes: Record<string, number>; burigo: Record<string, number> }>();
  const cellFor = (sectionId: string) => {
    let cell = bySection.get(sectionId);
    if (!cell) {
      cell = { votes: emptyYears('votes'), burigo: emptyYears('burigo_votes') };
      bySection.set(sectionId, cell);
    }
    return cell;
  };

  for (const row of totals) {
    const year = roundYears.get(String(row.round_id));
    if (!year) continue;
    addYear(cellFor(String(row.section_id)).votes, 'votes', year, toNumber(row.valid_votes));
  }
  for (const row of nominal) {
    const year = candidateIds.get(String(row.candidate_id));
    if (!year) continue;
    addYear(cellFor(String(row.section_id)).burigo, 'burigo_votes', year, toNumber(row.votes));
  }

  const entries = sections.map((row) => {
    const sectionId = String(row.id);
    const cell = bySection.get(sectionId);
    const municipalityIdValue = String(row.municipality_id);
    return {
      section_id: sectionId,
      zone_number: zoneNumberById.get(String(row.zone_id)) ?? null,
      municipality_id: municipalityIdValue,
      municipality_name: nameById.get(municipalityIdValue) ?? null,
      section_number: toNumber(row.section_number),
      votes_2018: cell?.votes.votes_2018 ?? 0,
      votes_2022: cell?.votes.votes_2022 ?? 0,
      votes_2026: cell?.votes.votes_2026 ?? 0,
      burigo_votes_2018: cell?.burigo.burigo_votes_2018 ?? 0,
      burigo_votes_2022: cell?.burigo.burigo_votes_2022 ?? 0,
      burigo_votes_2026: cell?.burigo.burigo_votes_2026 ?? 0,
    } satisfies ElectoralSectionEntry;
  });

  return { sections: entries, total, limit, offset };
}

// ---------------------------------------------------------------------------
// Município (detalhe)
// ---------------------------------------------------------------------------

export interface ElectoralMunicipalityZone {
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

export interface ElectoralMunicipalityDetail {
  municipality: { id: string; name: string | null; code_tse: string | null; code_ibge: number | null; region: string | null };
  zones: ElectoralMunicipalityZone[];
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

export async function getElectoralMunicipality(code: string): Promise<ElectoralMunicipalityDetail | null> {
  const isUuid = /^[0-9a-fA-F-]{36}$/.test(code);
  let baseQuery = supabaseAdmin.from('electoral_municipalities').select('id,name,tse_municipality_code,ibge_code') as unknown as AnyQuery;
  baseQuery = isUuid ? baseQuery.eq('id', code) : baseQuery.eq('tse_municipality_code', code);
  const { data: municipality, error: municipalityError } = await baseQuery.maybeSingle();
  if (municipalityError) throw municipalityError;
  if (!municipality) return null;

  const municipalityId = String(municipality.id);
  const tseCode = municipality.tse_municipality_code == null ? null : String(municipality.tse_municipality_code);
  const numericCode = tseCode == null ? Number.NaN : Number(tseCode);

  const [roundYears, candidateIds] = await Promise.all([
    loadRoundYears(),
    loadCandidateIds(MAIN_CANDIDATE_NUMBER),
  ]);
  const candidateIdList = [...candidateIds.keys()];

  const [sections, totals, nominal, analyticsMunicipality, analyticsCandidate, zonesDim] = await Promise.all([
    fetchAll('electoral_sections', 'id,zone_id', 'id', (q) => q.eq('municipality_id', municipalityId)),
    fetchAll('electoral_results_totals', 'round_id,zone_id,section_id,valid_votes,electorate', 'id', (q) => q.eq('municipality_id', municipalityId)),
    candidateIdList.length
      ? fetchAll('electoral_results_nominal', 'zone_id,votes,candidate_id', 'candidate_id,id', (q) => q.eq('municipality_id', municipalityId).in('candidate_id', candidateIdList))
      : Promise.resolve([]),
    Number.isFinite(numericCode)
      ? fetchAll('electoral_analytics_municipalities', 'year,region_name,total_nominal_votes', 'year', (q) => q.eq('municipality_code', numericCode))
      : Promise.resolve([]),
    Number.isFinite(numericCode)
      ? fetchAll('electoral_analytics_candidate_municipal', 'year,votes', 'year', (q) => q.eq('municipality_code', numericCode).eq('candidate_number', Number(MAIN_CANDIDATE_NUMBER)))
      : Promise.resolve([]),
    fetchAll('electoral_zones', 'id,zone_number', 'id'),
  ]);

  const region = analyticsMunicipality.find((row) => row.region_name != null)?.region_name ?? null;
  const zoneNumberById = new Map(zonesDim.map((z) => [String(z.id), toNumber(z.zone_number)]));

  const votes = emptyYears('votes');
  const electorate = emptyYears('electorate');
  const burigo = emptyYears('burigo_votes');
  const zones = new Map<string, { sectionIds: Set<string>; votes: Record<string, number>; burigo: Record<string, number> }>();
  const zoneFor = (zoneId: string) => {
    let entry = zones.get(zoneId);
    if (!entry) {
      entry = { sectionIds: new Set(), votes: emptyYears('votes'), burigo: emptyYears('burigo_votes') };
      zones.set(zoneId, entry);
    }
    return entry;
  };

  for (const row of totals) {
    const year = roundYears.get(String(row.round_id));
    if (!year) continue;
    const valid = toNumber(row.valid_votes);
    addYear(votes, 'votes', year, valid);
    addYear(electorate, 'electorate', year, toNumber(row.electorate));
    const zone = zoneFor(String(row.zone_id));
    addYear(zone.votes, 'votes', year, valid);
    if (row.section_id) zone.sectionIds.add(String(row.section_id));
  }
  for (const row of nominal) {
    const year = candidateIds.get(String(row.candidate_id));
    if (!year) continue;
    addYear(burigo, 'burigo_votes', year, toNumber(row.votes));
    addYear(zoneFor(String(row.zone_id)).burigo, 'burigo_votes', year, toNumber(row.votes));
  }

  // Total canônico do município vem da projeção analítica (fonte canônica).
  const analyticsVotesByYear = new Map(analyticsMunicipality.map((row) => [toNumber(row.year), toNumber(row.total_nominal_votes)]));
  const analyticsBurigoByYear = new Map(analyticsCandidate.map((row) => [toNumber(row.year), toNumber(row.votes)]));
  for (const year of ELECTORAL_YEARS) {
    if (analyticsVotesByYear.has(year)) votes[`votes_${year}`] = analyticsVotesByYear.get(year) as number;
    if (analyticsBurigoByYear.has(year)) burigo[`burigo_votes_${year}`] = analyticsBurigoByYear.get(year) as number;
  }

  const zoneEntries: ElectoralMunicipalityZone[] = [...zones.entries()].map(([zoneId, entry]) => ({
    zone_id: zoneId,
    zone_number: zoneNumberById.get(zoneId) ?? null,
    sections_count: entry.sectionIds.size,
    votes_2018: entry.votes.votes_2018,
    votes_2022: entry.votes.votes_2022,
    votes_2026: entry.votes.votes_2026,
    burigo_votes_2018: entry.burigo.burigo_votes_2018,
    burigo_votes_2022: entry.burigo.burigo_votes_2022,
    burigo_votes_2026: entry.burigo.burigo_votes_2026,
  }));

  // Dimensão de zonas do município, mesmo se ainda sem seções carregadas.
  if (zoneEntries.length === 0) {
    const pairs = await fetchAll('electoral_zone_municipalities', 'zone_id,municipality_id', 'zone_id,municipality_id', (q) => q.eq('municipality_id', municipalityId));
    for (const pair of pairs) {
      const zoneId = String(pair.zone_id);
      zoneEntries.push({
        zone_id: zoneId,
        zone_number: zoneNumberById.get(zoneId) ?? null,
        sections_count: 0,
        votes_2018: 0,
        votes_2022: 0,
        votes_2026: 0,
        burigo_votes_2018: 0,
        burigo_votes_2022: 0,
        burigo_votes_2026: 0,
      });
    }
  }
  zoneEntries.sort((a, b) => (a.zone_number ?? 0) - (b.zone_number ?? 0));

  return {
    municipality: {
      id: municipalityId,
      name: municipality.name == null ? null : String(municipality.name),
      code_tse: tseCode,
      code_ibge: municipality.ibge_code == null ? null : toNumber(municipality.ibge_code),
      region: region == null ? null : String(region),
    },
    zones: zoneEntries,
    sections_count: sections.length,
    electorate_2018: electorate.electorate_2018,
    electorate_2022: electorate.electorate_2022,
    electorate_2026: electorate.electorate_2026,
    votes_2018: votes.votes_2018,
    votes_2022: votes.votes_2022,
    votes_2026: votes.votes_2026,
    burigo_votes_2018: burigo.burigo_votes_2018,
    burigo_votes_2022: burigo.burigo_votes_2022,
    burigo_votes_2026: burigo.burigo_votes_2026,
  };
}
