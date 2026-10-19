import { ElectionYear, ViewTab } from './election';

export type InvestigationStatus = 'em_andamento' | 'concluida' | 'hipotese_refutada' | 'evidencias_inconclusivas';

export interface EvidenceReference {
  id: string;
  type: 'metric' | 'table' | 'chart' | 'competitor_flow' | 'section_detail';
  title: string;
  summary: string;
  dataSnippet?: Record<string, any>;
  action?: {
    label: string;
    view: ViewTab;
    municipalityId?: string;
    zoneId?: string;
    sectionId?: string;
  };
}

export interface AssistantMessage {
  id: string;
  investigationId: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  oralBriefingText?: string;
  kpiSummary?: {
    label: string;
    value: string;
    sublabel?: string;
    isPositive?: boolean;
  };
  contextSnapshot?: {
    view: ViewTab;
    startYear: ElectionYear;
    endYear: ElectionYear;
    candidateName: string;
    municipalityName?: string;
    zoneId?: string;
    sectionId?: string;
  };
  evidences?: EvidenceReference[];
  suggestedFollowUps?: string[];
}

export interface Investigation {
  id: string;
  title: string;
  objective: string;
  status: InvestigationStatus;
  updatedAt: string;
  referenceView: ViewTab;
  contextSummary: string;
  messages: AssistantMessage[];
}

export interface PageContextState {
  view: ViewTab;
  viewName: string;
  startYear: ElectionYear;
  endYear: ElectionYear;
  candidateId: string;
  candidateName: string;
  selectedMunicipalityId?: string;
  selectedMunicipalityName?: string;
  selectedZoneId?: string;
  selectedSectionId?: string;
  activeFiltersCount: number;
}
