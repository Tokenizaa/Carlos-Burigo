import { ElectionYear } from './election';

export interface CandidateIdentity {
  id: string;
  tseCandidateNumber: string;
  officialBallotName: string;
  fullName: string;
  partyCode: string;
  federationCode?: string;
  office: string;
  state: string;
  primaryColor: string;
  secondaryColor?: string;
  avatarUrl?: string;
}

export interface WorkspaceElectoralScope {
  state: string;
  office: string;
  availableYears: ElectionYear[];
  primaryBenchmarkYear: ElectionYear;
  geographicFocusRegion?: string;
}

export interface WorkspaceConfig {
  workspaceId: string;
  workspaceName: string;
  clientType: 'parliamentary_office' | 'campaign_team' | 'political_consulting' | 'party_directory';
  targetCandidate: CandidateIdentity;
  rosterOfKeyCompetitors: CandidateIdentity[];
  electoralScope: WorkspaceElectoralScope;
  branding: {
    organizationName: string;
    logoUrl?: string;
    reportHeaderSubtitle: string;
  };
}

export interface ResolvedElectoralContext {
  workspaceId: string;
  targetCandidate: CandidateIdentity;
  availableCompetitors: CandidateIdentity[];
  activeYears: [ElectionYear, ElectionYear];
  allowedState: string;
  allowedOffice: string;
}

export function resolveElectoralContext(
  workspaceConfig: WorkspaceConfig,
  requestedCandidateId?: string,
  requestedYears?: [ElectionYear, ElectionYear]
): ResolvedElectoralContext {
  const activeCandidate =
    requestedCandidateId && requestedCandidateId === workspaceConfig.targetCandidate.id
      ? workspaceConfig.targetCandidate
      : workspaceConfig.targetCandidate;

  const validYears: [ElectionYear, ElectionYear] = requestedYears || [2018, 2022];

  return {
    workspaceId: workspaceConfig.workspaceId,
    targetCandidate: activeCandidate,
    availableCompetitors: workspaceConfig.rosterOfKeyCompetitors,
    activeYears: validYears,
    allowedState: workspaceConfig.electoralScope.state,
    allowedOffice: workspaceConfig.electoralScope.office,
  };
}
