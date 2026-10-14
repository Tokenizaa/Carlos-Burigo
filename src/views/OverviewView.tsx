import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MapPin,
  Vote,
  Target,
  BarChart,
  Award,
  Calendar,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import {
  computeMunicipalityMetrics,
  generateKeyFindings,
  calcConcentration,
  formatNumber,
  formatPercent,
  formatPP,
  formatChange,
  filterMunicipalities,
} from '../utils/electoralMath';
import { ElectoralMapLeaflet } from '../components/ElectoralMapLeaflet';

export const OverviewView: React.FC = () => {
  const { filters, setFilters, setActiveTab, setSelectedMunicipalityForDetail } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA } = useElectionData();

  const candidate = CANDIDATES.find((c) => c.id === filters.mainCandidateId) || CANDIDATES[0];
  const filteredMuns = filterMunicipalities(MUNICIPALITIES_DATA, filters, candidate.id);
  const activeMuns = filteredMuns.length > 0 ? filteredMuns : MUNICIPALITIES_DATA;

  const rows = computeMunicipalityMetrics(
    activeMuns,
    candidate.id,
    filters.startYear,
    filters.endYear
  );
  const concentration = calcConcentration(activeMuns, candidate.id, filters.endYear);
  const findings = generateKeyFindings(rows, candidate.name);

  // Totais agregados nos 3 pleitos (2018, 2022, 2026)
  const totalVotes2018 = rows.reduce((acc, r) => acc + r.votes2018, 0);
  const totalVotes2022 = rows.reduce((acc, r) => acc + r.votes2022, 0);
  const totalVotes2026 = rows.reduce((acc, r) => acc + r.votes2026, 0);

  const totalValid2018 = MUNICIPALITIES_DATA.reduce((acc, m) => acc + m.totalValid2018, 0);
  const totalValid2022 = MUNICIPALITIES_DATA.reduce((acc, m) => acc + m.totalValid2022, 0);
  const totalValid2026 = MUNICIPALITIES_DATA.reduce((acc, m) => acc + (m.totalValid2026 || m.totalValid2022), 0);

  const globalShare2018 = totalValid2018 > 0 ? (totalVotes2018 / totalValid2018) * 100 : 0;
  const globalShare2022 = totalValid2022 > 0 ? (totalVotes2022 / totalValid2022) * 100 : 0;
  const globalShare2026 = totalValid2026 > 0 ? (totalVotes2026 / totalValid2026) * 100 : 0;

  const totalVotesStart = rows.reduce((acc, r) => acc + r.votesStart, 0);
  const totalVotesEnd = rows.reduce((acc, r) => acc + r.votesEnd, 0);

  const absDiff = totalVotesEnd - totalVotesStart;
  const pctDiff = totalVotesStart > 0 ? (absDiff / totalVotesStart) * 100 : 0;
  const ppDiff = (filters.endYear === 2026 ? globalShare2026 : globalShare2022) -
    (filters.startYear === 2018 ? globalShare2018 : globalShare2022);

  // Rankings
  const top10ByVotes = [...rows].sort((a, b) => b.votesEnd - a.votesEnd);
  const topGains = [...rows].filter((r) => r.absChange > 0).sort((a, b) => b.absChange - a.absChange);
  const topLosses = [...rows].filter((r) => r.absChange < 0).sort((a, b) => a.absChange - b.absChange);

  return (
    <div className="space-y-6">
      {/* Resumo Executivo / Metrificação Superior */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-neutral-100 gap-4">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Balanço Geral de Votação Regional</div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              {candidate.name} ({candidate.party} - {candidate.ballotNumber})
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor Rápido de Ciclos */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md text-xs">
              <span className="text-[11px] text-neutral-500 font-medium px-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-neutral-400" />
                Ciclo:
              </span>
              <button
                onClick={() => setFilters((f) => ({ ...f, startYear: 2018, endYear: 2022 }))}
                className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                  filters.startYear === 2018 && filters.endYear === 2022
                    ? 'bg-white text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                2018→'22
              </button>
              <button
                onClick={() => setFilters((f) => ({ ...f, startYear: 2022, endYear: 2026 }))}
                className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                  filters.startYear === 2022 && filters.endYear === 2026
                    ? 'bg-white text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                2022→'26
              </button>
              <button
                onClick={() => setFilters((f) => ({ ...f, startYear: 2018, endYear: 2026 }))}
                className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                  filters.startYear === 2018 && filters.endYear === 2026
                    ? 'bg-white text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                2018→'26
              </button>
            </div>

            <div className="text-xs text-neutral-500 flex items-center gap-2">
              <span>Escopo: <strong>{rows.length} Municípios</strong></span>
              <span aria-hidden="true" className="text-neutral-300">·</span>
              <span>Cargo: <strong>{candidate.office}</strong></span>
            </div>
          </div>
        </div>

        {/* Grade de Indicadores Principais */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Votos Totais ({filters.endYear})</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatNumber(totalVotesEnd)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              {formatNumber(totalVotesStart)} em {filters.startYear}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Saldo Líquido (Absoluto)</div>
            <div className={`text-xl font-bold font-mono mt-0.5 ${absDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatChange(absDiff)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              variação de votos
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Variação Relativa (%)</div>
            <div className={`text-xl font-bold font-mono mt-0.5 ${pctDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatPercent(pctDiff, 2)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1">
              vs base de {filters.startYear}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Participação em Válidos</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatPercent(filters.endYear === 2026 ? globalShare2026 : globalShare2022, 2)}
            </div>
            <div className={`text-[11px] font-mono mt-1 ${ppDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatPP(ppDiff, 2)}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Concentração Top 1 (Base)</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatPercent(concentration.top1Share, 1)}
            </div>
            <div className="text-[11px] text-neutral-500 mt-1 truncate">
              {top10ByVotes[0]?.municipality.name}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Índice HHI Territorial</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatNumber(concentration.hhi)}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-1 truncate">
              {concentration.hhiClassification.split(' ')[0]} Concentração
            </div>
          </div>
        </div>
      </div>

      {/* Seção: Principais Achados (Calculada Dinamicamente) */}
      <div className="bg-neutral-900 text-white rounded-lg p-5 border border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-white">
              Principais Achados Estratégicos
            </h3>
            <p className="text-xs text-neutral-400">
              Inferências matemáticas calculadas diretamente a partir dos dados do ciclo {filters.startYear}–{filters.endYear}.
            </p>
          </div>
          <span className="text-xs text-neutral-400 font-mono">
            {findings.length} constatações
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {findings.map((f) => (
            <div
              key={f.id}
              className="bg-neutral-800/80 border border-neutral-700/80 rounded-md p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-xs font-semibold text-neutral-100">{f.title}</h4>
                  <span className="text-[11px] font-mono text-emerald-400 font-medium">
                    {f.metricHighlight}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {f.summary}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1.5 font-mono">
                  {f.supportingData}
                </p>
              </div>

              <div className="pt-3 mt-2 border-t border-neutral-700/60 flex justify-end">
                <button
                  onClick={() => setActiveTab(f.targetView)}
                  className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
                >
                  <span>Abrir evidências na aba de apoio</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gráficos de Evolução (2018 vs 2022) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Evolução do Volume de Votos */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Evolução do Volume Total de Votos
              </h3>
              <p className="text-xs text-neutral-500">
                Comparativo absoluto do contingente de votos válidos conquistados.
              </p>
            </div>
            <Vote className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="h-44 flex items-end justify-around pt-6 pb-2 px-4 border-b border-neutral-100">
            {/* Barra 2018 */}
            <div className="flex flex-col items-center gap-1.5 w-24">
              <span className="text-xs font-mono font-semibold text-neutral-700">
                {formatNumber(totalVotes2018)}
              </span>
              <div
                className="w-full bg-neutral-300 rounded-t transition-all"
                style={{ height: '110px' }}
              />
              <span className="text-xs font-medium text-neutral-600">2018</span>
            </div>

            {/* Barra 2022 */}
            <div className="flex flex-col items-center gap-1.5 w-24">
              <span className="text-xs font-mono font-semibold text-emerald-800">
                {formatNumber(totalVotes2022)}
              </span>
              <div
                className="w-full bg-emerald-700 rounded-t transition-all"
                style={{ height: `${(totalVotes2022 / Math.max(1, totalVotes2018)) * 110}px` }}
              />
              <span className="text-xs font-medium text-neutral-900">2022</span>
            </div>

            {/* Barra 2026 */}
            <div className="flex flex-col items-center gap-1.5 w-24">
              <span className="text-xs font-mono font-semibold text-emerald-950 font-bold">
                {formatNumber(totalVotes2026)}
              </span>
              <div
                className="w-full bg-emerald-950 rounded-t transition-all"
                style={{ height: `${(totalVotes2026 / Math.max(1, totalVotes2018)) * 110}px` }}
              />
              <span className="text-xs font-bold text-emerald-950">2026</span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-neutral-600">
            <span>Ciclo ({filters.startYear}→{filters.endYear}): <strong className="font-mono">{formatChange(absDiff)}</strong> votos</span>
            <span>Variação %: <strong className="font-mono">{formatPercent(pctDiff, 2)}</strong></span>
          </div>
        </div>

        {/* Gráfico 2: Evolução da Participação nos Votos Válidos */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Evolução da Participação em Votos Válidos (3 Ciclos)
              </h3>
              <p className="text-xs text-neutral-500">
                Penetração do candidato sobre o total de votos válidos da amostra territorial.
              </p>
            </div>
            <Target className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="h-44 flex items-end justify-around pt-6 pb-2 px-4 border-b border-neutral-100">
            {/* Barra Participação 2018 */}
            <div className="flex flex-col items-center gap-1.5 w-24">
              <span className="text-xs font-mono font-semibold text-neutral-700">
                {formatPercent(globalShare2018, 2)}
              </span>
              <div
                className="w-full bg-neutral-300 rounded-t transition-all"
                style={{ height: '110px' }}
              />
              <span className="text-xs font-medium text-neutral-600">2018</span>
            </div>

            {/* Barra Participação 2022 */}
            <div className="flex flex-col items-center gap-1.5 w-24">
              <span className="text-xs font-mono font-semibold text-emerald-800">
                {formatPercent(globalShare2022, 2)}
              </span>
              <div
                className="w-full bg-emerald-700 rounded-t transition-all"
                style={{ height: `${(globalShare2022 / Math.max(0.1, globalShare2018)) * 110}px` }}
              />
              <span className="text-xs font-medium text-neutral-900">2022</span>
            </div>

            {/* Barra Participação 2026 */}
            <div className="flex flex-col items-center gap-1.5 w-24">
              <span className="text-xs font-mono font-semibold text-emerald-950 font-bold">
                {formatPercent(globalShare2026, 2)}
              </span>
              <div
                className="w-full bg-emerald-950 rounded-t transition-all"
                style={{ height: `${(globalShare2026 / Math.max(0.1, globalShare2018)) * 110}px` }}
              />
              <span className="text-xs font-bold text-emerald-950">2026</span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-between text-xs text-neutral-600">
            <span>Diferença ({filters.startYear}→{filters.endYear}): <strong className="font-mono">{formatPP(ppDiff, 2)}</strong></span>
            <span className="font-mono text-neutral-500">Base total: {formatNumber(totalValid2026)} eleitores válidos</span>
          </div>
        </div>
      </div>

      {/* Grid: Rankings Territoriais (Top 10 Votos, Maiores Ganhos, Maiores Perdas) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 Municípios em Votação */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              Ranking de Votação (Top 10)
            </h3>
            <span className="text-xs text-neutral-400 font-mono">2022</span>
          </div>
          <div className="space-y-2">
            {top10ByVotes.slice(0, 7).map((r, idx) => (
              <div
                key={r.municipality.id}
                onClick={() => {
                  setSelectedMunicipalityForDetail(r.municipality.id);
                  setActiveTab('territorial');
                }}
                className="flex items-center justify-between p-2 rounded hover:bg-neutral-50 cursor-pointer transition-colors text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-neutral-400 font-mono w-4 shrink-0 text-right">
                    {idx + 1}.
                  </span>
                  <span className="font-medium text-neutral-900 truncate">
                    {r.municipality.name}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-semibold text-neutral-900">
                    {formatNumber(r.votes2022)}
                  </span>
                  <span className="text-[11px] text-neutral-500 ml-1 font-mono">
                    ({formatPercent(r.share2022, 1)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Maiores Ganhos Absolutos */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              Maiores Ganhos de Votos
            </h3>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-2">
            {topGains.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center">Nenhum município em expansão.</p>
            ) : (
              topGains.slice(0, 5).map((r) => (
                <div
                  key={r.municipality.id}
                  onClick={() => {
                    setSelectedMunicipalityForDetail(r.municipality.id);
                    setActiveTab('territorial');
                  }}
                  className="flex items-center justify-between p-2 rounded hover:bg-neutral-50 cursor-pointer transition-colors text-xs"
                >
                  <span className="font-medium text-neutral-900 truncate">
                    {r.municipality.name}
                  </span>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-semibold text-emerald-700">
                      {formatChange(r.absChange)}
                    </span>
                    <span className="text-[11px] text-neutral-500 ml-1 font-mono">
                      ({formatPercent(r.pctChange, 1)})
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Maiores Perdas Absolutas */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              Maiores Perdas de Votos
            </h3>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="space-y-2">
            {topLosses.length === 0 ? (
              <p className="text-xs text-neutral-400 py-4 text-center">Nenhuma retração registrada.</p>
            ) : (
              topLosses.slice(0, 5).map((r) => (
                <div
                  key={r.municipality.id}
                  onClick={() => {
                    setSelectedMunicipalityForDetail(r.municipality.id);
                    setActiveTab('territorial');
                  }}
                  className="flex items-center justify-between p-2 rounded hover:bg-neutral-50 cursor-pointer transition-colors text-xs"
                >
                  <span className="font-medium text-neutral-900 truncate">
                    {r.municipality.name}
                  </span>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-semibold text-rose-700">
                      {formatChange(r.absChange)}
                    </span>
                    <span className="text-[11px] text-neutral-500 ml-1 font-mono">
                      ({formatPercent(r.pctChange, 1)})
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Seção Cartográfica Integrada no Resumo Executivo */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Cartografia e Distribuição Espacial de Votos</div>
            <h3 className="text-base font-bold text-neutral-900">
              Mapa Interativo de Penetração Territorial (Serra Gaúcha & RS)
            </h3>
            <p className="text-xs text-neutral-600 mt-0.5">
              Polígonos temáticos e locais de votação interativos com zoom e inspeção em tempo real.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('spatial')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors self-start sm:self-auto shrink-0"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Módulo Espacial em Tela Cheia</span>
          </button>
        </div>

        <ElectoralMapLeaflet
          candidateId={candidate.id}
          heightClass="h-80"
          initialMetric="votes"
          onSelectMunicipality={(id) => {
            setSelectedMunicipalityForDetail(id);
            setActiveTab('territorial');
          }}
        />
      </div>
    </div>
  );
};
