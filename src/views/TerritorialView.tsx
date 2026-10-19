import React, { useState } from 'react';
import {
  MapPin,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Building,
  Layers,
  Vote,
  Users2,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import {
  computeMunicipalityMetrics,
  formatNumber,
  formatPercent,
  formatPP,
  formatChange,
} from '../utils/electoralMath';
import { ElectoralMapLeaflet } from '../components/ElectoralMapLeaflet';
import { MunicipalitySectionInspector } from '../components/MunicipalitySectionInspector';

export const TerritorialView: React.FC = () => {
  const {
    filters,
    setFilters,
    selectedMunicipalityForDetail,
    setSelectedMunicipalityForDetail,
  } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA, sections: RAW_SECTIONS } = useElectionData();

  const candidate = CANDIDATES.find((c) => c.id === filters.mainCandidateId) || CANDIDATES[0];
  const allRows = computeMunicipalityMetrics(
    MUNICIPALITIES_DATA,
    candidate.id,
    filters.startYear,
    filters.endYear
  );

  // Município em foco (se nenhum selecionado, default para Caxias do Sul ou primeiro)
  const currentMunId = selectedMunicipalityForDetail || filters.municipalityId !== 'all' ? (selectedMunicipalityForDetail || filters.municipalityId) : 'caxias_do_sul';
  const currentMunData = MUNICIPALITIES_DATA.find((m) => m.id === currentMunId) || MUNICIPALITIES_DATA[0];
  const munMetric = allRows.find((r) => r.municipality.id === currentMunData.id);

  // Seções deste município
  const municipalSections = RAW_SECTIONS.filter((s) => s.municipalityId === currentMunData.id);

  // Agrupamento por zona eleitoral nos 3 pleitos (2018, 2022, 2026)
  const zoneBreakdown = currentMunData.zones.map((zoneId) => {
    const sectionsInZone = municipalSections.filter((s) => s.zoneId === zoneId);
    const votes2018 = sectionsInZone.reduce(
      (acc, s) => acc + (s.votes2018?.votes[candidate.id] || 0),
      0
    );
    const votes2022 = sectionsInZone.reduce(
      (acc, s) => acc + (s.votes2022?.votes[candidate.id] || 0),
      0
    );
    const votes2026 = sectionsInZone.reduce(
      (acc, s) => acc + (s.votes2026?.votes[candidate.id] || 0),
      0
    );

    const valid2018 = sectionsInZone.reduce((acc, s) => acc + (s.votes2018?.totalValidVotes || 0), 0);
    const valid2022 = sectionsInZone.reduce((acc, s) => acc + (s.votes2022?.totalValidVotes || 0), 0);
    const valid2026 = sectionsInZone.reduce((acc, s) => acc + (s.votes2026?.totalValidVotes || s.votes2022?.totalValidVotes || 0), 0);

    const votesStart = filters.startYear === 2018 ? votes2018 : filters.startYear === 2022 ? votes2022 : votes2026;
    const votesEnd = filters.endYear === 2026 ? votes2026 : filters.endYear === 2022 ? votes2022 : votes2018;
    const validStart = filters.startYear === 2018 ? valid2018 : filters.startYear === 2022 ? valid2022 : valid2026;
    const validEnd = filters.endYear === 2026 ? valid2026 : filters.endYear === 2022 ? valid2022 : valid2018;

    const shareStart = validStart > 0 ? (votesStart / validStart) * 100 : 0;
    const shareEnd = validEnd > 0 ? (votesEnd / validEnd) * 100 : 0;

    return {
      zoneId,
      sectionsCount: sectionsInZone.length,
      votes2018,
      votes2022,
      votes2026,
      votesStart,
      votesEnd,
      absDiff: votesEnd - votesStart,
      shareStart,
      shareEnd,
      ppDiff: shareEnd - shareStart,
    };
  });

  return (
    <div className="space-y-6">
      {/* Barra de Navegação Hierárquica */}
      <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-neutral-600">
          <span className="font-semibold text-neutral-900">Rio Grande do Sul (RS)</span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <span className="font-semibold text-emerald-800">{currentMunData.name}</span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <span>{currentMunData.zones.length} Zonas Eleitorais</span>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
          <span>{municipalSections.length} Seções Auditadas</span>
        </div>

        {/* Seletor Rápido de Município */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-medium">Trocar Município:</span>
          <select
            value={currentMunData.id}
            onChange={(e) => setSelectedMunicipalityForDetail(e.target.value)}
            className="text-xs rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          >
            {MUNICIPALITIES_DATA.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.region})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dossiê Municipal: Resumo Estatístico */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 mb-4 border-b border-neutral-100 gap-4">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Dossiê Territorial Integrado</div>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
              <span>{currentMunData.name}</span>
              <span className="text-xs font-normal text-neutral-500 font-mono">
                (IBGE {currentMunData.codeIBGE} · {currentMunData.region})
              </span>
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

            <div className="text-xs text-neutral-600 flex items-center gap-2">
              <div>
                Eleitorado: <strong className="font-mono text-neutral-900">{formatNumber(currentMunData.electorate2022)}</strong>
              </div>
              <span aria-hidden="true" className="text-neutral-300">·</span>
              <div>
                Válidos: <strong className="font-mono text-neutral-900">{formatNumber(currentMunData.totalValid2022)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Indicadores do Candidato no Município nos 3 Pleitos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Votos 2018</div>
            <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
              {formatNumber(munMetric?.votes2018)}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono">
              {formatPercent(munMetric?.share2018, 1)} válidos
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Votos 2022</div>
            <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
              {formatNumber(munMetric?.votes2022)}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono">
              {formatPercent(munMetric?.share2022, 1)} válidos
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Votos 2026</div>
            <div className="text-lg font-bold font-mono text-emerald-900 mt-0.5">
              {formatNumber(munMetric?.votes2026)}
            </div>
            <div className="text-[11px] text-neutral-500 font-mono">
              {formatPercent(munMetric?.share2026, 1)} válidos
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Saldo ({filters.startYear}→{filters.endYear})</div>
            <div
              className={`text-lg font-bold font-mono mt-0.5 ${
                (munMetric?.absChange || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatChange(munMetric?.absChange)}
            </div>
            <div className="text-[11px] text-neutral-500">votos nominais</div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Variação %</div>
            <div
              className={`text-lg font-bold font-mono mt-0.5 ${
                (munMetric?.pctChange || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatPercent(munMetric?.pctChange, 2)}
            </div>
            <div className="text-[11px] text-neutral-500">sobre si mesmo</div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Variação p.p.</div>
            <div
              className={`text-lg font-bold font-mono mt-0.5 ${
                (munMetric?.ppChange || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}
            >
              {formatPP(munMetric?.ppChange, 2)}
            </div>
            <div className="text-[11px] text-neutral-500">fatia de mercado</div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Quociente Loc. (QL)</div>
            <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">
              {munMetric?.locationQuotientEnd?.toFixed(2) || munMetric?.locationQuotient2022.toFixed(2)}
            </div>
            <div className="text-[11px] text-neutral-500">
              {(munMetric?.locationQuotientEnd || munMetric?.locationQuotient2022 || 0) >= 1 ? 'Sobre-representado' : 'Sub-representado'}
            </div>
          </div>
        </div>
      </div>

      {/* Confronto Local de Concorrentes no Município Selecionado */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Força Eleitoral dos Concorrentes em {currentMunData.name} (2022)
            </h3>
            <p className="text-xs text-neutral-500">
              Distribuição dos votos entre os principais candidatos da amostra na disputa municipal.
            </p>
          </div>
          <Users2 className="w-4 h-4 text-neutral-400" />
        </div>

        <div className="space-y-3">
          {CANDIDATES.map((c) => {
            const v = currentMunData.candidateVotes2022[c.id] || 0;
            const share = currentMunData.totalValid2022 > 0 ? (v / currentMunData.totalValid2022) * 100 : 0;
            const isMain = c.id === candidate.id;

            return (
              <div key={c.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-medium ${isMain ? 'text-emerald-900 font-bold' : 'text-neutral-800'}`}>
                    {c.name} ({c.party}) {isMain && '· Candidato Analisado'}
                  </span>
                  <div className="space-y-0 text-right">
                    <span className="font-mono font-semibold text-neutral-900">{formatNumber(v)} votos</span>
                    <span className="text-[11px] text-neutral-500 ml-1 font-mono">({formatPercent(share, 2)})</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, share * 2.5)}%`, // escala visual proporcional
                      backgroundColor: c.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cartografia e Locais de Votação do Município */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Malha Espacial e Locais de Votação em {currentMunData.name}
            </h3>
            <p className="text-xs text-neutral-500">
              Dispersão geográfica das seções e zonas eleitorais sobre a mancha urbana municipal.
            </p>
          </div>
          <span className="text-xs font-mono text-neutral-500">
            {municipalSections.length} seções georreferenciadas
          </span>
        </div>

        <ElectoralMapLeaflet
          candidateId={candidate.id}
          selectedMunicipalityId={currentMunData.id}
          heightClass="h-72"
          initialMetric="votes"
        />
      </div>

      {/* Tabela de Zonas Eleitorais do Município */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Desempenho por Zona Eleitoral ({currentMunData.name})
            </h3>
            <p className="text-xs text-neutral-500">
              Comportamento eleitoral em cada jurisdição cartorária nos 3 ciclos (2018, 2022 e 2026).
            </p>
          </div>
          <Layers className="w-4 h-4 text-neutral-400" />
        </div>

        <div className="overflow-x-auto border border-neutral-200 rounded-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Zona Eleitoral</th>
                <th className="py-2.5 px-3 font-semibold text-center">Seções</th>
                <th className="py-2.5 px-3 font-semibold text-right font-mono">2018</th>
                <th className="py-2.5 px-3 font-semibold text-right font-mono">2022</th>
                <th className="py-2.5 px-3 font-semibold text-right font-mono">2026</th>
                <th className="py-2.5 px-3 font-semibold text-right font-mono">
                  Saldo ({filters.startYear}→{filters.endYear})
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">Part. {filters.startYear} (%)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Part. {filters.endYear} (%)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Variação p.p.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {zoneBreakdown.map((z) => {
                const isPositive = z.absDiff >= 0;
                return (
                  <tr key={z.zoneId} className="hover:bg-neutral-50">
                    <td className="py-2.5 px-3 font-semibold text-neutral-900 font-mono">
                      Zona {z.zoneId}
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono text-neutral-600">
                      {z.sectionsCount}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-700">
                      {formatNumber(z.votes2018)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-neutral-900">
                      {formatNumber(z.votes2022)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-900">
                      {formatNumber(z.votes2026)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-semibold ${
                        isPositive ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatChange(z.absDiff)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                      {formatPercent(z.shareStart, 2)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-neutral-900">
                      {formatPercent(z.shareEnd, 2)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono ${
                        z.ppDiff >= 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatPP(z.ppDiff, 2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investigação Microterritorial Direta: Zonas & Seções e Para Quem Foram os Votos */}
      <MunicipalitySectionInspector
        municipalityId={currentMunData.id}
        candidateId={candidate.id}
        startYear={filters.startYear}
        endYear={filters.endYear}
        compact={false}
      />
    </div>
  );
};
