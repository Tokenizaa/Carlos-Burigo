/**
 * Tipos e interfaces de domínio para Inteligência Eleitoral
 */

export type ElectionYear = 2018 | 2022 | 2026;

export interface Candidate {
  id: string;
  name: string;
  ballotNumber: string;
  party: string;
  coalition?: string;
  office: string;
  color: string;
  isMainCandidate?: boolean;
}

export interface SectionVote {
  sectionId: string; // ex: "0012"
  zoneId: string;    // ex: "016"
  municipalityId: string;
  votes: Record<string, number>; // candidateId -> votes
  blankVotes: number;
  nullVotes: number;
  totalValidVotes: number;
  totalVoters: number;
}

export interface SectionHistory {
  sectionId: string;
  zoneId: string;
  municipalityId: string;
  locationName: string;
  neighborhood: string;
  coordinates?: [number, number]; // [lat, lng]
  votes2018?: SectionVote;
  votes2022?: SectionVote;
  votes2026?: SectionVote; // 3º ciclo eleitoral (2026)
}

export interface ZoneData {
  zoneId: string;
  municipalityId: string;
  sectionsCount: number;
  totalValid2018: number;
  totalValid2022: number;
  totalValid2026: number;
  candidateVotes2018: Record<string, number>;
  candidateVotes2022: Record<string, number>;
  candidateVotes2026: Record<string, number>;
}

export interface MunicipalityGeo {
  id: string;
  name: string;
  codeIBGE: string;
  region: string;
  svgPath: string;
  center: [number, number];
  latLng: [number, number]; // [lat, lng] para Leaflet
  polygonLatLngs: [number, number][]; // Polígono de coordenadas para Leaflet
}

export interface MunicipalityData {
  id: string;
  name: string;
  codeIBGE: string;
  region: string;
  zones: string[];
  electorate2018: number;
  electorate2022: number;
  electorate2026: number;
  totalValid2018: number;
  totalValid2022: number;
  totalValid2026: number;
  candidateVotes2018: Record<string, number>;
  candidateVotes2022: Record<string, number>;
  candidateVotes2026: Record<string, number>;
}

export interface GlobalFilters {
  startYear: ElectionYear;
  endYear: ElectionYear;
  office: string;
  turno: 1;
  state: string;
  municipalityId: string; // "all" or specific ID
  zoneId: string;         // "all" or specific ID
  sectionId: string;      // "all" or specific ID
  mainCandidateId: string;
  compareCandidateId: string;
  // Filtros Avançados
  region: 'all' | 'Serra Gaúcha' | 'Metropolitana' | 'Campos de Cima' | 'Planalto';
  variationTrend: 'all' | 'gains' | 'losses' | 'high_growth' | 'severe_drop';
  voteRange: 'all' | 'over_10k' | '1k_to_10k' | 'under_1k';
  lqFilter: 'all' | 'overrepresented' | 'underrepresented';
  activePreset?: string;
}

export type ViewTab =
  | 'overview'
  | 'performance'
  | 'territorial'
  | 'comparison'
  | 'concentration'
  | 'zones-sections'
  | 'spatial'
  | 'reports'
  | 'methodology';

export interface Finding {
  id: string;
  type: 'gain' | 'loss' | 'concentration' | 'opportunity';
  title: string;
  description: string;
  targetView: ViewTab;
  filterPayload?: Partial<GlobalFilters>;
  metricHighlight: string;
}
