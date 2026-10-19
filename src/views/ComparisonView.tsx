import React, { useState } from 'react';
import {
  Users2,
  ArrowRightLeft,
  ShieldAlert,
  BarChart2,
  Check,
  Scale,
  Calendar,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import {
  formatNumber,
  formatPercent,
  formatPP,
  formatChange,
  filterMunicipalities,
} from '../utils/electoralMath';
import { ElectionYear, MunicipalityData } from '../types/election';

export const ComparisonView: React.FC = () => {
  const { filters } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA } = useElectionData();

  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([
    filters.mainCandidateId,
    filters.compareCandidateId,
  ]);
  const [metricMode, setMetricMode] = useState<'votes' | 'share'>('votes');
  const [comparisonYear, setComparisonYear] = useState<ElectionYear>(filters.endYear || 2022);

  const filteredMuns = filterMunicipalities(MUNICIPALITIES_DATA, filters, filters.mainCandidateId);
  const activeMuns = filteredMuns.length > 0 ? filteredMuns : MUNICIPALITIES_DATA;

  const toggleCandidate = (id: string) => {
    if (selectedCandidateIds.includes(id)) {
      if (selectedCandidateIds.length > 2) {
        setSelectedCandidateIds((prev) => prev.filter((x) => x !== id));
      }
    } else {
      setSelectedCandidateIds((prev) => [...prev, id]);
    }
  };

  const getCandidateVotes = (m: MunicipalityData, candId: string, yr: ElectionYear) => {
    if (yr === 2018) return m.candidateVotes2018[candId] || 0;
    if (yr === 2022) return m.candidateVotes2022[candId] || 0;
    if (yr === 2026) return m.candidateVotes2026?.[candId] || 0;
    return 0;
  };

  const getTotalValid = (m: MunicipalityData, yr: ElectionYear) => {
    if (yr === 2018) return m.totalValid2018;
    if (yr === 2022) return m.totalValid2022;
    if (yr === 2026) return m.totalValid2026 || m.totalValid2022;
    return 0;
  };

  const comparedCandidates = CANDIDATES.filter((c) => selectedCandidateIds.includes(c.id));
  const mainCandidate = CANDIDATES.find((c) => c.id === filters.mainCandidateId) || CANDIDATES[0];
  const rivalCandidate =
    CANDIDATES.find((c) => c.id === filters.compareCandidateId && c.id !== mainCandidate.id) ||
    CANDIDATES.find((c) => c.id !== mainCandidate.id) ||
    CANDIDATES[1];

  // Totais agregados dos candidatos selecionados no ano da comparação
  const candidateTotals = comparedCandidates.map((c) => {
    const totalVotes = MUNICIPALITIES_DATA.reduce(
      (acc, m) => acc + getCandidateVotes(m, c.id, comparisonYear),
      0
    );
    const totalValid = MUNICIPALITIES_DATA.reduce(
      (acc, m) => acc + getTotalValid(m, comparisonYear),
      0
    );
    const overallShare = totalValid > 0 ? (totalVotes / totalValid) * 100 : 0;
    return {
      candidate: c,
      totalVotes,
      overallShare,
    };
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Comparação */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-neutral-100">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Confronto Competitivo Territorial</div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Comparação Territorial entre Candidatos ({comparisonYear})
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Avaliação de hegemonias territoriais relativas, sobreposição de bases e penetração competitiva.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            {/* Seletor de Ano da Comparação */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md text-xs">
              <span className="text-[11px] text-neutral-500 font-medium px-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-neutral-400" />
                Ano:
              </span>
              {(['2018', '2022', '2026'] as const).map((yrStr) => {
                const yr = Number(yrStr) as ElectionYear;
                return (
                  <button
                    key={yr}
                    onClick={() => setComparisonYear(yr)}
                    className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                      comparisonYear === yr
                        ? 'bg-white text-emerald-900 font-bold shadow-xs'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {yr}
                  </button>
                );
              })}
            </div>

            {/* Toggle de Modo de Métrica */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md text-xs">
              <button
                onClick={() => setMetricMode('votes')}
                className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                  metricMode === 'votes'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Votos Absolutos
              </button>
              <button
                onClick={() => setMetricMode('share')}
                className={`px-3 py-1 rounded font-medium transition-colors cursor-pointer ${
                  metricMode === 'share'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                % Votos Válidos
              </button>
            </div>
          </div>
        </div>

        {/* Seleção de Candidatos no Confronto */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-neutral-700">
            Candidatos no Confronto (Mínimo 2):
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {CANDIDATES.map((c) => {
              const isSelected = selectedCandidateIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCandidate(c.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-900 text-white border-neutral-900'
                      : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: c.color }}
                  />
                  <span>
                    {c.name} ({c.party})
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 ml-1" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resumo do Confronto Direto (Principal vs Concorrente de Referência) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-700" />
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{mainCandidate.name}</h3>
                <span className="text-[11px] text-neutral-500">{mainCandidate.party} · Candidato em Foco</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800">
              {formatNumber(candidateTotals.find((x) => x.candidate.id === mainCandidate.id)?.totalVotes)} votos
            </span>
          </div>
          <div className="pt-3 space-y-2 text-xs text-neutral-600">
            <div className="flex justify-between">
              <span>Participação Média nos Válidos:</span>
              <strong className="font-mono text-neutral-900">
                {formatPercent(candidateTotals.find((x) => x.candidate.id === mainCandidate.id)?.overallShare, 2)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Principal Reduto Eleitoral:</span>
              <strong className="text-neutral-900">Caxias do Sul (21.420 votos)</strong>
            </div>
            <div className="flex justify-between">
              <span>Vetor de Maior Crescimento:</span>
              <strong className="text-emerald-800">Farroupilha (+610 votos)</strong>
            </div>
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: rivalCandidate.color }} />
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{rivalCandidate.name}</h3>
                <span className="text-[11px] text-neutral-500">{rivalCandidate.party} · Concorrente Direto</span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-neutral-900">
              {formatNumber(candidateTotals.find((x) => x.candidate.id === rivalCandidate.id)?.totalVotes)} votos
            </span>
          </div>
          <div className="pt-3 space-y-2 text-xs text-neutral-600">
            <div className="flex justify-between">
              <span>Participação Média nos Válidos:</span>
              <strong className="font-mono text-neutral-900">
                {formatPercent(candidateTotals.find((x) => x.candidate.id === rivalCandidate.id)?.overallShare, 2)}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Principal Reduto Eleitoral:</span>
              <strong className="text-neutral-900">
                {rivalCandidate.id === '11000' ? 'Bento Gonçalves (28.900 votos)' : 'Caxias / Porto Alegre'}
              </strong>
            </div>
            <div className="flex justify-between">
              <span>Impacto sobre o Candidato em Foco:</span>
              <strong className="text-rose-800">
                {rivalCandidate.id === '11000' ? 'Forte canibalização em Bento (-54,1%)' : 'Disputa acirrada de redutos'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Matriz Territorial: Município × Candidato */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Matriz Territorial: Município × Candidato (2022)
            </h3>
            <p className="text-xs text-neutral-500">
              Visualização comparativa por unidade territorial ({metricMode === 'votes' ? 'votos absolutos nominais' : '% sobre os votos válidos'}).
            </p>
          </div>
          <Scale className="w-4 h-4 text-neutral-400" />
        </div>

        <div className="overflow-x-auto border border-neutral-200 rounded-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Município</th>
                <th className="py-2.5 px-3 font-semibold text-right">Votos Válidos</th>
                {comparedCandidates.map((c) => (
                  <th key={c.id} className="py-2.5 px-3 font-semibold text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                      <span>{c.name}</span>
                    </div>
                  </th>
                ))}
                <th className="py-2.5 px-3 font-semibold text-center">Líder Territorial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {activeMuns.map((m) => {
                // Descobrir candidato com maior votação neste município no ano selecionado
                let leaderCand = comparedCandidates[0];
                let maxVal = -1;
                comparedCandidates.forEach((c) => {
                  const votes = getCandidateVotes(m, c.id, comparisonYear);
                  if (votes > maxVal) {
                    maxVal = votes;
                    leaderCand = c;
                  }
                });

                const validVotes = getTotalValid(m, comparisonYear);

                return (
                  <tr key={m.id} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-3 font-semibold text-neutral-900">
                      {m.name}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                      {formatNumber(validVotes)}
                    </td>

                    {comparedCandidates.map((c) => {
                      const v = getCandidateVotes(m, c.id, comparisonYear);
                      const share = validVotes > 0 ? (v / validVotes) * 100 : 0;
                      const isLeader = leaderCand.id === c.id;

                      return (
                        <td
                          key={c.id}
                          className={`py-2.5 px-3 text-right font-mono ${
                            isLeader ? 'font-bold bg-neutral-50/70 text-neutral-950' : 'text-neutral-700'
                          }`}
                        >
                          {metricMode === 'votes' ? formatNumber(v) : formatPercent(share, 2)}
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-center">
                      <span
                        className="inline-flex items-center gap-1 font-semibold text-[11px]"
                        style={{ color: leaderCand.color }}
                      >
                        {leaderCand.name.split(' ')[0]} ({leaderCand.party})
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota Metodológica Obrigatória sobre Falácia Ecológica */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-950">
            Advertência de Rigor Metodológico: Não Inferncia de Transferência Individual
          </div>
          <p className="text-[11px] leading-relaxed text-amber-900/90">
            Resultados eleitorais agregados no nível de urna, seção ou município expressam padrões territoriais e correlações espaciais. É metodologicamente incorreto afirmar que "eleitores individuais de Carlos Búrigo migraram diretamente para Guilherme Pasin". Atribuir comportamento individual a dados agregados constitui a clássica <strong>Falácia Ecológica (Robinson, 1950)</strong>. Os números devem ser tratados estritamente como flutuações de participação e dominância regional de votos.
          </p>
        </div>
      </div>
    </div>
  );
};
