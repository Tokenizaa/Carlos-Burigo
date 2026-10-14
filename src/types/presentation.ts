import { ElectionYear, ViewTab } from './election';

export type PresentationArtifactType =
  | 'kpi_summary'
  | 'data_table'
  | 'line_chart'
  | 'bar_chart'
  | 'divergent_bar_chart'
  | 'choropleth_map'
  | 'proportional_symbol_map'
  | 'ballot_box_inspector'
  | 'hypothesis_evaluation';

export type AnalyticalIntentFamily =
  | 'territorial_trajectory'
  | 'competitive_migration'
  | 'ranking_specialization'
  | 'concentration_dependency'
  | 'microterritory_audit'
  | 'hypothesis_testing';

export interface AnalyticalEvidenceCitation {
  id: string;
  sourceDataset: string;
  datasetReleaseDate: string;
  sha256Checksum?: string;
  electoralScope: {
    startYear: ElectionYear;
    endYear: ElectionYear;
    state: string;
    office: string;
    round: 1;
    targetCandidateId: string;
    targetMunicipalityId?: string;
    targetZoneId?: string;
  };
  methodReference: {
    methodId: string;
    specificationDocument: string;
    formulaApplied: string;
  };
  epistemologicalNotice: string;
}

export interface KPIArtifact {
  type: 'kpi_summary';
  title: string;
  primaryValue: string;
  unit: string;
  comparisonLabel: string;
  absoluteDifference: number;
  percentageDifference: number | null;
  percentagePointsDifference?: number;
  trend: 'positive' | 'negative' | 'neutral' | 'undefined';
  benchmarks?: Array<{ label: string; value: string }>;
}

export interface TableColumnDefinition {
  field: string;
  label: string;
  align: 'left' | 'center' | 'right';
  format: 'text' | 'integer' | 'decimal' | 'percentage' | 'percentage_points' | 'badge';
  highlightDifference?: boolean;
}

export interface DataTableArtifact {
  type: 'data_table';
  title: string;
  subtitle?: string;
  columns: TableColumnDefinition[];
  rows: Array<Record<string, any>>;
  totalSummaryRow?: Record<string, any>;
  drilldownAction?: {
    targetView: ViewTab;
    parameterKey: string;
  };
}

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  dataPoints: Array<{ x: string | number; y: number | null }>;
}

export interface ChartSpecificationArtifact {
  type: 'line_chart' | 'bar_chart' | 'divergent_bar_chart';
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  series: ChartSeries[];
  zeroBaselineEnforced: boolean;
  annotations?: Array<{ x: string | number; text: string }>;
}

export interface MapSpecificationArtifact {
  type: 'choropleth_map' | 'proportional_symbol_map';
  title: string;
  metricKey: string;
  metricLabel: string;
  geographicLevel: 'municipality' | 'rgi_ibge' | 'polling_station';
  colorPalette: 'divergent_green_red' | 'sequential_emerald' | 'bivariate';
  breaks: number[];
  dataBinding: Record<
    string,
    {
      ibgeCode: string;
      name: string;
      value: number;
      formattedValue: string;
      details?: string;
    }
  >;
}

export interface HypothesisEvaluationArtifact {
  type: 'hypothesis_evaluation';
  hypothesisTested: string;
  status: 'supported' | 'refuted' | 'inconclusive' | 'secondary_effect';
  evidenceSummary: string;
  formalProofData: Record<string, any>;
}

export interface AnalyticalPresentationContract {
  contractVersion: '1.0';
  executionId: string;
  timestamp: string;
  intentFamily: AnalyticalIntentFamily;
  intentId: string;
  questionOrigin: string;
  executiveSummary: {
    headline: string;
    narrativeSynthesis: string;
    oralBriefingText: string;
  };
  primaryArtifact: KPIArtifact | ChartSpecificationArtifact | DataTableArtifact | MapSpecificationArtifact;
  secondaryArtifacts: Array<
    KPIArtifact | DataTableArtifact | ChartSpecificationArtifact | MapSpecificationArtifact | HypothesisEvaluationArtifact
  >;
  followUpSuggestions: Array<{
    promptText: string;
    intentId: string;
    contextOverrides?: Record<string, any>;
  }>;
  evidence: AnalyticalEvidenceCitation;
}
