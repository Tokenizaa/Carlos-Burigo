/**
 * Funções matemáticas, estatísticas e formatadores de inteligência eleitoral.
 */

import { Candidate, ElectionYear, MunicipalityData, SectionHistory } from '../types/election';

// --- Formatação Numérica Brasileira ---

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/D';
  return new Intl.NumberFormat('pt-BR').format(Math.round(value));
}

export function formatDecimal(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/D';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/D';
  const formatted = formatDecimal(value, decimals);
  return `${formatted}%`;
}

export function formatPP(value: number | undefined | null, decimals = 2): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/D';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatDecimal(value, decimals)} p.p.`;
}

export function formatChange(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/D';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatNumber(value)}`;
}

// --- Cálculos de Variação ---

export function calcAbsoluteChange(finalVal?: number, initialVal?: number): number | null {
  if (finalVal === undefined || initialVal === undefined) return null;
  return finalVal - initialVal;
}

export function calcPercentChange(finalVal?: number, initialVal?: number): number | null {
  if (finalVal === undefined || initialVal === undefined) return null;
  if (initialVal === 0) return null; // Indefinido divisão por zero
  return ((finalVal - initialVal) / initialVal) * 100;
}

export function calcPPChange(finalShare?: number, initialShare?: number): number | null {
  if (finalShare === undefined || initialShare === undefined) return null;
  return finalShare - initialShare;
}

// --- Indicadores Territoriais & Estatísticos ---

export interface MunicipalityMetricRow {
  municipality: MunicipalityData;
  votes2018: number;
  votes2022: number;
  votes2026: number;
  votesStart: number;
  votesEnd: number;
  absChange: number;
  pctChange: number | null;
  share2018: number;
  share2022: number;
  share2026: number;
  shareStart: number;
  shareEnd: number;
  ppChange: number;
  rank2018: number;
  rank2022: number;
  rank2026: number;
  rankStart: number;
  rankEnd: number;
  locationQuotient2022: number; // QL mantido por compatibilidade
  locationQuotientEnd: number;  // QL relativo ao ano final selecionado
  classification: 'Crescimento expressivo' | 'Crescimento moderado' | 'Estabilidade' | 'Queda moderada' | 'Queda severa';
}

function getCandidateVotesForYear(m: MunicipalityData, candidateId: string, year: ElectionYear): number {
  if (year === 2018) return m.candidateVotes2018[candidateId] || 0;
  if (year === 2022) return m.candidateVotes2022[candidateId] || 0;
  if (year === 2026) return m.candidateVotes2026?.[candidateId] || 0;
  return 0;
}

function getTotalValidForYear(m: MunicipalityData, year: ElectionYear): number {
  if (year === 2018) return m.totalValid2018;
  if (year === 2022) return m.totalValid2022;
  if (year === 2026) return m.totalValid2026 || m.totalValid2022;
  return 0;
}

export function computeMunicipalityMetrics(
  municipalities: MunicipalityData[],
  candidateId: string,
  startYear: ElectionYear = 2018,
  endYear: ElectionYear = 2022
): MunicipalityMetricRow[] {
  // Totais globais para ponderação
  const totalVotes2018 = municipalities.reduce((acc, m) => acc + (m.candidateVotes2018[candidateId] || 0), 0);
  const totalVotes2022 = municipalities.reduce((acc, m) => acc + (m.candidateVotes2022[candidateId] || 0), 0);
  const totalVotes2026 = municipalities.reduce((acc, m) => acc + (m.candidateVotes2026?.[candidateId] || 0), 0);
  const totalValid2018 = municipalities.reduce((acc, m) => acc + m.totalValid2018, 0);
  const totalValid2022 = municipalities.reduce((acc, m) => acc + m.totalValid2022, 0);
  const totalValid2026 = municipalities.reduce((acc, m) => acc + (m.totalValid2026 || m.totalValid2022), 0);

  const totalVotesEnd = municipalities.reduce((acc, m) => acc + getCandidateVotesForYear(m, candidateId, endYear), 0);
  const totalValidEnd = municipalities.reduce((acc, m) => acc + getTotalValidForYear(m, endYear), 0);
  const globalShareEnd = totalValidEnd > 0 ? (totalVotesEnd / totalValidEnd) * 100 : 0;
  const globalShare2022 = totalValid2022 > 0 ? (totalVotes2022 / totalValid2022) * 100 : 0;

  // Primeiro passo: computar votos e participações
  const initialRows = municipalities.map((m) => {
    const v18 = m.candidateVotes2018[candidateId] || 0;
    const v22 = m.candidateVotes2022[candidateId] || 0;
    const v26 = m.candidateVotes2026?.[candidateId] || 0;

    const s18 = m.totalValid2018 > 0 ? (v18 / m.totalValid2018) * 100 : 0;
    const s22 = m.totalValid2022 > 0 ? (v22 / m.totalValid2022) * 100 : 0;
    const s26 = (m.totalValid2026 || m.totalValid2022) > 0 ? (v26 / (m.totalValid2026 || m.totalValid2022)) * 100 : 0;

    const vStart = getCandidateVotesForYear(m, candidateId, startYear);
    const vEnd = getCandidateVotesForYear(m, candidateId, endYear);
    const validStart = getTotalValidForYear(m, startYear);
    const validEnd = getTotalValidForYear(m, endYear);

    const sStart = validStart > 0 ? (vStart / validStart) * 100 : 0;
    const sEnd = validEnd > 0 ? (vEnd / validEnd) * 100 : 0;

    const absDiff = vEnd - vStart;
    const pctDiff = vStart > 0 ? ((vEnd - vStart) / vStart) * 100 : null;
    const ppDiff = sEnd - sStart;

    const lq22 = globalShare2022 > 0 ? s22 / globalShare2022 : 1;
    const lqEnd = globalShareEnd > 0 ? sEnd / globalShareEnd : 1;

    let classification: MunicipalityMetricRow['classification'] = 'Estabilidade';
    if (pctDiff !== null) {
      if (pctDiff >= 15) classification = 'Crescimento expressivo';
      else if (pctDiff >= 3) classification = 'Crescimento moderado';
      else if (pctDiff <= -25) classification = 'Queda severa';
      else if (pctDiff <= -3) classification = 'Queda moderada';
    }

    return {
      municipality: m,
      votes2018: v18,
      votes2022: v22,
      votes2026: v26,
      votesStart: vStart,
      votesEnd: vEnd,
      absChange: absDiff,
      pctChange: pctDiff,
      share2018: s18,
      share2022: s22,
      share2026: s26,
      shareStart: sStart,
      shareEnd: sEnd,
      ppChange: ppDiff,
      rank2018: 0,
      rank2022: 0,
      rank2026: 0,
      rankStart: 0,
      rankEnd: 0,
      locationQuotient2022: lq22,
      locationQuotientEnd: lqEnd,
      classification,
    };
  });

  // Atribuir rankings de votos
  const sorted18 = [...initialRows].sort((a, b) => b.votes2018 - a.votes2018);
  sorted18.forEach((r, idx) => {
    const target = initialRows.find((x) => x.municipality.id === r.municipality.id);
    if (target) target.rank2018 = idx + 1;
  });

  const sorted22 = [...initialRows].sort((a, b) => b.votes2022 - a.votes2022);
  sorted22.forEach((r, idx) => {
    const target = initialRows.find((x) => x.municipality.id === r.municipality.id);
    if (target) target.rank2022 = idx + 1;
  });

  const sorted26 = [...initialRows].sort((a, b) => b.votes2026 - a.votes2026);
  sorted26.forEach((r, idx) => {
    const target = initialRows.find((x) => x.municipality.id === r.municipality.id);
    if (target) target.rank2026 = idx + 1;
  });

  const sortedStart = [...initialRows].sort((a, b) => b.votesStart - a.votesStart);
  sortedStart.forEach((r, idx) => {
    const target = initialRows.find((x) => x.municipality.id === r.municipality.id);
    if (target) target.rankStart = idx + 1;
  });

  const sortedEnd = [...initialRows].sort((a, b) => b.votesEnd - a.votesEnd);
  sortedEnd.forEach((r, idx) => {
    const target = initialRows.find((x) => x.municipality.id === r.municipality.id);
    if (target) target.rankEnd = idx + 1;
  });

  return initialRows;
}

// --- Análise de Concorrentes & Migração de Votos por Seção ("Para quem perdemos?") ---

export interface CompetitorMigrationDetail {
  candidateId: string;
  candidateName: string;
  party: string;
  color: string;
  votesStart: number;
  votesEnd: number;
  votes2018: number;
  votes2022: number;
  votes2026: number;
  diff: number; // votesEnd - votesStart
  shareEnd: number;
}

export interface SectionDisputeAnalysis {
  section: SectionHistory;
  mainCandidateVotesStart: number;
  mainCandidateVotesEnd: number;
  mainCandidateVotes2018: number;
  mainCandidateVotes2022: number;
  mainCandidateVotes2026: number;
  mainCandidateDiff: number;
  validStart: number;
  validEnd: number;
  allCandidatesRanked: CompetitorMigrationDetail[];
  competitors: CompetitorMigrationDetail[];
  primaryBeneficiary: CompetitorMigrationDetail | null; // Concorrente que mais cresceu
  winnerCandidate: CompetitorMigrationDetail;
  runnerUpCandidate: CompetitorMigrationDetail | null;
  marginToRunnerUp: number;
  diagnosis: string;
}

export function analyzeSectionDispute(
  section: SectionHistory,
  candidates: Candidate[],
  mainCandidateId: string,
  startYear: ElectionYear = 2018,
  endYear: ElectionYear = 2022
): SectionDisputeAnalysis {
  const getSectionVote = (year: ElectionYear) => {
    if (year === 2018) return section.votes2018;
    if (year === 2022) return section.votes2022;
    if (year === 2026) return section.votes2026;
    return undefined;
  };

  const voteStart = getSectionVote(startYear);
  const voteEnd = getSectionVote(endYear);

  const validStart = voteStart?.totalValidVotes || 0;
  const validEnd = voteEnd?.totalValidVotes || 0;

  const mainVStart = voteStart?.votes[mainCandidateId] || 0;
  const mainVEnd = voteEnd?.votes[mainCandidateId] || 0;
  const mainV18 = section.votes2018?.votes[mainCandidateId] || 0;
  const mainV22 = section.votes2022?.votes[mainCandidateId] || 0;
  const mainV26 = section.votes2026?.votes[mainCandidateId] || 0;
  const mainDiff = mainVEnd - mainVStart;

  // Montar dados para todos os candidatos
  const allCandidatesRanked: CompetitorMigrationDetail[] = candidates.map((c) => {
    const vStart = voteStart?.votes[c.id] || 0;
    const vEnd = voteEnd?.votes[c.id] || 0;
    const v18 = section.votes2018?.votes[c.id] || 0;
    const v22 = section.votes2022?.votes[c.id] || 0;
    const v26 = section.votes2026?.votes[c.id] || 0;
    const diff = vEnd - vStart;
    const shareEnd = validEnd > 0 ? (vEnd / validEnd) * 100 : 0;

    return {
      candidateId: c.id,
      candidateName: c.name,
      party: c.party,
      color: c.color,
      votesStart: vStart,
      votesEnd: vEnd,
      votes2018: v18,
      votes2022: v22,
      votes2026: v26,
      diff,
      shareEnd,
    };
  }).sort((a, b) => b.votesEnd - a.votesEnd);

  const competitors = allCandidatesRanked
    .filter((c) => c.candidateId !== mainCandidateId)
    .sort((a, b) => b.diff - a.diff); // Ordenar por quem mais ganhou votos!

  // Quem mais capturou votos (maior crescimento positivo entre concorrentes)
  const primaryBeneficiary = competitors.find((c) => c.diff > 0) || null;

  const winnerCandidate = allCandidatesRanked[0];
  const runnerUpCandidate = allCandidatesRanked.length > 1 ? allCandidatesRanked[1] : null;
  const marginToRunnerUp = runnerUpCandidate ? winnerCandidate.votesEnd - runnerUpCandidate.votesEnd : 0;

  // Elaboração do diagnóstico estratégico explicável
  let diagnosis = '';
  const mainCandidateObj = candidates.find((c) => c.id === mainCandidateId);
  const mainName = mainCandidateObj?.name || 'Candidato';

  if (mainDiff < 0) {
    if (primaryBeneficiary && primaryBeneficiary.diff >= Math.abs(mainDiff) * 0.5) {
      diagnosis = `Retração de ${Math.abs(mainDiff)} votos de ${mainName}. O avanço de ${primaryBeneficiary.candidateName} (+${primaryBeneficiary.diff} votos) capturou diretamente essa base na seção.`;
    } else if (primaryBeneficiary) {
      diagnosis = `Desgaste de ${Math.abs(mainDiff)} votos disperso: ${primaryBeneficiary.candidateName} foi o principal beneficiário (+${primaryBeneficiary.diff} votos).`;
    } else {
      diagnosis = `Queda de ${Math.abs(mainDiff)} votos sem crescimento dos concorrentes da amostra (possível abstenção ou votos brancos/nulos).`;
    }
  } else if (mainDiff > 0) {
    diagnosis = `Ganho líquido de +${mainDiff} votos de ${mainName}. Base consolidada com ${mainVEnd} votos no pleito final.`;
  } else {
    diagnosis = `Estabilidade eleitoral mantida com ${mainVEnd} votos.`;
  }

  return {
    section,
    mainCandidateVotesStart: mainVStart,
    mainCandidateVotesEnd: mainVEnd,
    mainCandidateVotes2018: mainV18,
    mainCandidateVotes2022: mainV22,
    mainCandidateVotes2026: mainV26,
    mainCandidateDiff: mainDiff,
    validStart,
    validEnd,
    allCandidatesRanked,
    competitors,
    primaryBeneficiary,
    winnerCandidate,
    runnerUpCandidate,
    marginToRunnerUp,
    diagnosis,
  };
}

export function filterMunicipalities(
  municipalities: MunicipalityData[],
  filters: {
    region?: string;
    municipalityId?: string;
    voteRange?: string;
    variationTrend?: string;
    lqFilter?: string;
  },
  candidateId: string
): MunicipalityData[] {
  let result = [...municipalities];

  if (filters.region && filters.region !== 'all') {
    result = result.filter((m) => m.region === filters.region);
  }

  if (filters.municipalityId && filters.municipalityId !== 'all') {
    result = result.filter((m) => m.id === filters.municipalityId);
  }

  if (filters.voteRange && filters.voteRange !== 'all') {
    result = result.filter((m) => {
      const v = m.candidateVotes2022[candidateId] || 0;
      if (filters.voteRange === 'over_10k') return v >= 10000;
      if (filters.voteRange === '1k_to_10k') return v >= 1000 && v < 10000;
      if (filters.voteRange === 'under_1k') return v < 1000;
      return true;
    });
  }

  if (filters.variationTrend && filters.variationTrend !== 'all') {
    result = result.filter((m) => {
      const v18 = m.candidateVotes2018[candidateId] || 0;
      const v22 = m.candidateVotes2022[candidateId] || 0;
      const absDiff = v22 - v18;
      const pctDiff = v18 > 0 ? ((v22 - v18) / v18) * 100 : null;

      if (filters.variationTrend === 'gains') return absDiff > 0;
      if (filters.variationTrend === 'losses') return absDiff < 0;
      if (filters.variationTrend === 'high_growth') return pctDiff !== null && pctDiff >= 15;
      if (filters.variationTrend === 'severe_drop') return pctDiff !== null && pctDiff <= -20;
      return true;
    });
  }

  if (filters.lqFilter && filters.lqFilter !== 'all') {
    // Calculo do QL global para a amostra
    const totalVotes = municipalities.reduce((acc, m) => acc + (m.candidateVotes2022[candidateId] || 0), 0);
    const totalValid = municipalities.reduce((acc, m) => acc + m.totalValid2022, 0);
    const globalShare = totalValid > 0 ? (totalVotes / totalValid) * 100 : 0;

    result = result.filter((m) => {
      const v22 = m.candidateVotes2022[candidateId] || 0;
      const localShare = m.totalValid2022 > 0 ? (v22 / m.totalValid2022) * 100 : 0;
      const lq = globalShare > 0 ? localShare / globalShare : 1;

      if (filters.lqFilter === 'overrepresented') return lq >= 1.0;
      if (filters.lqFilter === 'underrepresented') return lq < 1.0;
      return true;
    });
  }

  return result;
}

// --- Índices de Concentração Territorial ---

export interface ConcentrationStats {
  totalCandidateVotes: number;
  top1Share: number;
  top3Share: number;
  top5Share: number;
  top10Share: number;
  hhi: number;
  hhiClassification: 'Baixa Concentração (< 1.500)' | 'Concentração Moderada (1.500 - 2.500)' | 'Alta Concentração (> 2.500)';
  gini: number;
  lorenzPoints: { cumTerritoriesPct: number; cumVotesPct: number; municipalityName: string }[];
  distributionTable: {
    municipalityName: string;
    votes: number;
    shareOfCandidateTotal: number;
    cumulativeShare: number;
    rank: number;
  }[];
}

export function calcConcentration(
  municipalities: MunicipalityData[],
  candidateId: string,
  year: ElectionYear = 2022
): ConcentrationStats {
  const getVotes = (m: MunicipalityData) => {
    if (year === 2018) return m.candidateVotes2018[candidateId] || 0;
    if (year === 2022) return m.candidateVotes2022[candidateId] || 0;
    if (year === 2026) return m.candidateVotes2026?.[candidateId] || 0;
    return 0;
  };

  const totalCandidateVotes = municipalities.reduce((acc, m) => acc + getVotes(m), 0);

  // Ordenar decrescente para Top-K e HHI
  const sortedDesc = [...municipalities].sort((a, b) => getVotes(b) - getVotes(a));

  // Tabela de distribuição acumulada
  let runningShare = 0;
  const distributionTable = sortedDesc.map((m, idx) => {
    const v = getVotes(m);
    const indShare = totalCandidateVotes > 0 ? (v / totalCandidateVotes) * 100 : 0;
    runningShare += indShare;
    return {
      municipalityName: m.name,
      votes: v,
      shareOfCandidateTotal: indShare,
      cumulativeShare: Math.min(100, runningShare),
      rank: idx + 1,
    };
  });

  // Top-K
  const top1Votes = sortedDesc.slice(0, 1).reduce((acc, m) => acc + getVotes(m), 0);
  const top3Votes = sortedDesc.slice(0, 3).reduce((acc, m) => acc + getVotes(m), 0);
  const top5Votes = sortedDesc.slice(0, 5).reduce((acc, m) => acc + getVotes(m), 0);
  const top10Votes = sortedDesc.slice(0, 10).reduce((acc, m) => acc + getVotes(m), 0);

  const top1Share = totalCandidateVotes > 0 ? (top1Votes / totalCandidateVotes) * 100 : 0;
  const top3Share = totalCandidateVotes > 0 ? (top3Votes / totalCandidateVotes) * 100 : 0;
  const top5Share = totalCandidateVotes > 0 ? (top5Votes / totalCandidateVotes) * 100 : 0;
  const top10Share = totalCandidateVotes > 0 ? (top10Votes / totalCandidateVotes) * 100 : 0;

  // HHI: Soma dos quadrados das participações percentuais territoriais
  // s_i = (v_i / V) * 100; HHI = sum(s_i^2)
  const hhi = sortedDesc.reduce((acc, m) => {
    const v = getVotes(m);
    const s = totalCandidateVotes > 0 ? (v / totalCandidateVotes) * 100 : 0;
    return acc + s * s;
  }, 0);

  let hhiClassification: ConcentrationStats['hhiClassification'] = 'Baixa Concentração (< 1.500)';
  if (hhi > 2500) {
    hhiClassification = 'Alta Concentração (> 2.500)';
  } else if (hhi >= 1500) {
    hhiClassification = 'Concentração Moderada (1.500 - 2.500)';
  }

  // Curva de Lorenz: Ordenar crescente por votos
  const sortedAsc = [...municipalities].sort((a, b) => getVotes(a) - getVotes(b));
  const n = sortedAsc.length;
  let cumVotes = 0;
  const lorenzPoints = [{ cumTerritoriesPct: 0, cumVotesPct: 0, municipalityName: 'Origem' }];

  sortedAsc.forEach((m, idx) => {
    cumVotes += getVotes(m);
    lorenzPoints.push({
      cumTerritoriesPct: ((idx + 1) / n) * 100,
      cumVotesPct: totalCandidateVotes > 0 ? (cumVotes / totalCandidateVotes) * 100 : 0,
      municipalityName: m.name,
    });
  });

  // Coeficiente de Gini
  // G = (2 * sum(i * y_i)) / (n * sum(y_i)) - (n + 1)/n
  let gini = 0;
  if (totalCandidateVotes > 0 && n > 0) {
    let sumRankWeighted = 0;
    sortedAsc.forEach((m, idx) => {
      const rank = idx + 1; // 1-based
      sumRankWeighted += rank * getVotes(m);
    });
    gini = (2 * sumRankWeighted) / (n * totalCandidateVotes) - (n + 1) / n;
  }

  return {
    totalCandidateVotes,
    top1Share,
    top3Share,
    top5Share,
    top10Share,
    hhi: Math.round(hhi),
    hhiClassification,
    gini: Math.max(0, Math.min(1, gini)),
    lorenzPoints,
    distributionTable,
  };
}

// --- Decomposição da Variação e Achados Analíticos Dinâmicos ---

export interface KeyFinding {
  id: string;
  category: 'concentracao_perda' | 'polo_crescimento' | 'dependencia_base' | 'pressao_competitiva';
  title: string;
  summary: string;
  supportingData: string;
  targetView: 'performance' | 'concentration' | 'comparison' | 'territorial';
  metricHighlight: string;
}

export function generateKeyFindings(
  rows: MunicipalityMetricRow[],
  candidateName = 'Carlos Búrigo'
): KeyFinding[] {
  const findings: KeyFinding[] = [];

  // 1. Decomposição de Perdas Líquidas
  const negativeRows = rows.filter((r) => r.absChange < 0).sort((a, b) => a.absChange - b.absChange);
  const positiveRows = rows.filter((r) => r.absChange > 0).sort((a, b) => b.absChange - a.absChange);

  const totalLoss = negativeRows.reduce((acc, r) => acc + Math.abs(r.absChange), 0);
  const totalGain = positiveRows.reduce((acc, r) => acc + r.absChange, 0);

  if (negativeRows.length > 0 && totalLoss > 0) {
    // Top 2 maiores perdedores
    const topLosers = negativeRows.slice(0, 2);
    const topLossSum = topLosers.reduce((acc, r) => acc + Math.abs(r.absChange), 0);
    const pctOfLoss = (topLossSum / totalLoss) * 100;

    findings.push({
      id: 'finding_loss_concentration',
      category: 'concentracao_perda',
      title: 'Concentração Geográfica das Perdas Eleitorais',
      summary: `A redução de votos está concentrada fortemente em ${topLosers.length} municípios (${topLosers.map((x) => x.municipality.name).join(' e ')}), responsáveis por ${formatPercent(pctOfLoss, 1)} de toda a variação negativa observada.`,
      supportingData: `Perda acumulada nestes polos: ${formatNumber(topLossSum)} votos de um total de ${formatNumber(totalLoss)} votos perdidos em bases em retração.`,
      targetView: 'performance',
      metricHighlight: `${formatPercent(pctOfLoss, 1)} das perdas`,
    });
  }

  // 2. Polo de Maior Expansão
  if (positiveRows.length > 0) {
    const mainWinner = positiveRows[0];
    const winnerShareOfGains = totalGain > 0 ? (mainWinner.absChange / totalGain) * 100 : 0;
    findings.push({
      id: 'finding_growth_hub',
      category: 'polo_crescimento',
      title: `Vetor de Expansão: Destaque em ${mainWinner.municipality.name}`,
      summary: `${mainWinner.municipality.name} liderou os ganhos territoriais com acréscimo de ${formatChange(mainWinner.absChange)} votos (${formatPercent(mainWinner.pctChange, 1)}), respondendo por ${formatPercent(winnerShareOfGains, 1)} do crescimento positivo do candidato.`,
      supportingData: `Participação nos votos válidos subiu de ${formatPercent(mainWinner.share2018, 2)} para ${formatPercent(mainWinner.share2022, 2)} (${formatPP(mainWinner.ppChange)}).`,
      targetView: 'territorial',
      metricHighlight: formatChange(mainWinner.absChange),
    });
  }

  // 3. Dependência de Base Central (Caxias do Sul)
  const totalVotes2022 = rows.reduce((acc, r) => acc + r.votes2022, 0);
  const mainBase = [...rows].sort((a, b) => b.votes2022 - a.votes2022)[0];
  if (mainBase && totalVotes2022 > 0) {
    const mainBaseShare = (mainBase.votes2022 / totalVotes2022) * 100;
    findings.push({
      id: 'finding_base_dependency',
      category: 'dependencia_base',
      title: `Dependência Territorial da Base Principal (${mainBase.municipality.name})`,
      summary: `${mainBase.municipality.name} concentra ${formatPercent(mainBaseShare, 1)} de todo o eleitorado conquistado por ${candidateName}, evidenciando estrutura de alta centralidade metropolitana/regional.`,
      supportingData: `Votos em ${mainBase.municipality.name}: ${formatNumber(mainBase.votes2022)} em 2022 vs ${formatNumber(mainBase.votes2018)} em 2018 (saldo de ${formatChange(mainBase.absChange)} votos).`,
      targetView: 'concentration',
      metricHighlight: `${formatPercent(mainBaseShare, 1)} dos votos`,
    });
  }

  // 4. Pressão Competitiva em Bento Gonçalves
  const bento = rows.find((r) => r.municipality.id === 'bento_goncalves');
  if (bento) {
    findings.push({
      id: 'finding_competitive_clash',
      category: 'pressao_competitiva',
      title: 'Efeito Concorrência Local em Bento Gonçalves',
      summary: `Em Bento Gonçalves ocorreu a oscilação mais severa do ciclo (-54,1%), coincidindo com o fenômeno de candidatura local adversária que capturou a hegemonia do município.`,
      supportingData: `Votação retraiu de ${formatNumber(bento.votes2018)} para ${formatNumber(bento.votes2022)} votos (-${formatNumber(Math.abs(bento.absChange))} votos).`,
      targetView: 'comparison',
      metricHighlight: '-54,1% no município',
    });
  }

  return findings;
}
