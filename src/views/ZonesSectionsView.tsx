import React, { useMemo, useState } from 'react';
import {
  Grid3X3,
  Search,
  TrendingUp,
  TrendingDown,
  Info,
  Filter,
  Layers,
  Vote,
  Download,
  Calendar,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import {
  calcAbsoluteChange,
  calcPercentChange,
  calcPPChange,
  formatNumber,
  formatPercent,
  formatPP,
  formatChange,
} from '../utils/electoralMath';
import { exportToCSV } from '../utils/csvExport';

export const ZonesSectionsView: React.FC = () => {
  const { filters, setFilters } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA, sections: RAW_SECTIONS } = useElectionData();

  const [selectedMun, setSelectedMun] = useState<string>(filters.municipalityId);
  const [selectedZone, setSelectedZone] = useState<string>(filters.zoneId);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState<string>('0012');

  React.useEffect(() => {
    setSelectedMun(filters.municipalityId);
  }, [filters.municipalityId]);

  React.useEffect(() => {
    setSelectedZone(filters.zoneId);
  }, [filters.zoneId]);

  const candidate = CANDIDATES.find((c) => c.id === filters.mainCandidateId) || CANDIDATES[0];

  // Zonas disponíveis baseadas no filtro de município
  const availableZones = useMemo(() => {
    if (selectedMun === 'all') {
      const set = new Set<string>();
      RAW_SECTIONS.forEach((s) => set.add(s.zoneId));
      return Array.from(set).sort();
    }
    const mun = MUNICIPALITIES_DATA.find((m) => m.id === selectedMun);
    return mun ? mun.zones : [];
  }, [selectedMun]);

  // Seções filtradas com cálculo completo nos 3 pleitos
  const enrichedSections = useMemo(() => {
    return RAW_SECTIONS.filter((s) => {
      if (selectedMun !== 'all' && s.municipalityId !== selectedMun) return false;
      if (selectedZone !== 'all' && s.zoneId !== selectedZone) return false;
      if (
        searchQuery &&
        !s.sectionId.includes(searchQuery) &&
        !s.locationName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !s.neighborhood.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    }).map((s) => {
      const v18 = s.votes2018?.votes[candidate.id];
      const v22 = s.votes2022?.votes[candidate.id];
      const v26 = s.votes2026?.votes[candidate.id];

      const valid18 = s.votes2018?.totalValidVotes;
      const valid22 = s.votes2022?.totalValidVotes;
      const valid26 = s.votes2026?.totalValidVotes;

      const share18 = v18 !== undefined && valid18 ? (v18 / valid18) * 100 : undefined;
      const share22 = v22 !== undefined && valid22 ? (v22 / valid22) * 100 : undefined;
      const share26 = v26 !== undefined && valid26 ? (v26 / valid26) * 100 : undefined;

      const vStart = filters.startYear === 2018 ? v18 : filters.startYear === 2022 ? v22 : v26;
      const vEnd = filters.endYear === 2018 ? v18 : filters.endYear === 2022 ? v22 : v26;

      const shareStart = filters.startYear === 2018 ? share18 : filters.startYear === 2022 ? share22 : share26;
      const shareEnd = filters.endYear === 2018 ? share18 : filters.endYear === 2022 ? share22 : share26;

      const absChange = calcAbsoluteChange(vEnd, vStart);
      const pctChange = calcPercentChange(vEnd, vStart);
      const ppChange = calcPPChange(shareEnd, shareStart);

      const munName = MUNICIPALITIES_DATA.find((m) => m.id === s.municipalityId)?.name || s.municipalityId;

      return {
        ...s,
        munName,
        v18,
        v22,
        v26,
        valid18,
        valid22,
        valid26,
        share18,
        share22,
        share26,
        vStart,
        vEnd,
        shareStart,
        shareEnd,
        absChange,
        pctChange,
        ppChange,
        isNewSection: s.votes2018 === undefined,
      };
    });
  }, [selectedMun, selectedZone, searchQuery, candidate.id, filters.startYear, filters.endYear]);

  // Seções com maiores ganhos e perdas (excluindo N/D)
  const validDeltas = enrichedSections.filter((s) => s.absChange !== null);
  const topGainSections = [...validDeltas]
    .filter((s) => (s.absChange ?? 0) > 0)
    .sort((a, b) => (b.absChange ?? 0) - (a.absChange ?? 0))
    .slice(0, 4);

  const topLossSections = [...validDeltas]
    .filter((s) => (s.absChange ?? 0) < 0)
    .sort((a, b) => (a.absChange ?? 0) - (b.absChange ?? 0))
    .slice(0, 4);

  // Seção selecionada para distribuição de candidatos no local
  const currentSection =
    RAW_SECTIONS.find((s) => s.sectionId === activeSectionId) || RAW_SECTIONS[0];

  const handleExportCSV = () => {
    const headers = [
      'Município',
      'Zona',
      'Seção',
      'Local de Votação',
      'Bairro',
      'Votos 2018',
      'Votos 2022',
      'Diferença Absoluta',
      'Variação %',
      'Part. 2018 (%)',
      'Part. 2022 (%)',
      'Variação p.p.',
      'Total Válidos 2022',
    ];

    const data = enrichedSections.map((s) => [
      s.munName,
      s.zoneId,
      s.sectionId,
      s.locationName,
      s.neighborhood,
      s.v18 !== undefined ? s.v18 : 'N/D',
      s.v22 !== undefined ? s.v22 : 'N/D',
      s.absChange !== null ? s.absChange : 'N/D',
      s.pctChange !== null ? formatPercent(s.pctChange, 2) : 'N/D',
      s.share18 !== undefined ? formatPercent(s.share18, 2) : 'N/D',
      s.share22 !== undefined ? formatPercent(s.share22, 2) : 'N/D',
      s.ppChange !== null ? formatPP(s.ppChange, 2) : 'N/D',
      s.valid22 !== undefined ? s.valid22 : 'N/D',
    ]);

    exportToCSV(`auditoria_secoes_${candidate.id}_2018_2022`, headers, data);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-neutral-100">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Investigação Microterritorial</div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Análise Auditada por Zona e Seção Eleitoral
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Escaneamento no menor nível de agregação oficial da urna eletrônica com controle estrito de ausência de dados (N/D).
            </p>
          </div>
          <div className="flex items-center gap-3">
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

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors self-start md:self-auto cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Seções</span>
            </button>
          </div>
        </div>

        {/* Filtros em Linha */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">
              Filtrar por Município
            </label>
            <select
              value={selectedMun}
              onChange={(e) => {
                setSelectedMun(e.target.value);
                setSelectedZone('all');
              }}
              className="w-full text-xs rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            >
              <option value="all">Todos os Municípios da Amostra</option>
              {MUNICIPALITIES_DATA.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">
              Filtrar por Zona Eleitoral
            </label>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full text-xs rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
            >
              <option value="all">Todas as Zonas</option>
              {availableZones.map((z) => (
                <option key={z} value={z}>
                  Zona {z}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-neutral-600 mb-1">
              Buscar Escola, Seção ou Bairro
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ex: 0012, Murialdo, Centro..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Painel de Maiores Variações de Seções e Distribuição de Candidatos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Seções com Maiores Ganhos */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              Seções com Maior Saldo Positivo
            </h3>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="space-y-2">
            {topGainSections.map((s) => (
              <div
                key={s.sectionId}
                onClick={() => setActiveSectionId(s.sectionId)}
                className={`p-2.5 rounded border transition-colors cursor-pointer text-xs ${
                  activeSectionId === s.sectionId
                    ? 'border-emerald-700 bg-emerald-50/50'
                    : 'border-neutral-100 hover:bg-neutral-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-neutral-900">
                    Seção {s.sectionId} ({s.munName})
                  </span>
                  <span className="font-mono font-bold text-emerald-700">
                    {formatChange(s.absChange)} votos
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                  {s.locationName} · {s.neighborhood}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seções com Maiores Perdas */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900">
              Seções com Maior Saldo Negativo
            </h3>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="space-y-2">
            {topLossSections.map((s) => (
              <div
                key={s.sectionId}
                onClick={() => setActiveSectionId(s.sectionId)}
                className={`p-2.5 rounded border transition-colors cursor-pointer text-xs ${
                  activeSectionId === s.sectionId
                    ? 'border-rose-700 bg-rose-50/50'
                    : 'border-neutral-100 hover:bg-neutral-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-neutral-900">
                    Seção {s.sectionId} ({s.munName})
                  </span>
                  <span className="font-mono font-bold text-rose-700">
                    {formatChange(s.absChange)} votos
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                  {s.locationName} · {s.neighborhood}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição de Votos na Seção em Destaque */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-neutral-900">
                Distribuição na Seção {currentSection.sectionId}
              </h3>
              <Vote className="w-4 h-4 text-neutral-400" />
            </div>
            <p className="text-[11px] text-neutral-500 truncate mb-3">
              {currentSection.locationName} ({currentSection.neighborhood})
            </p>

            <div className="space-y-2">
              {CANDIDATES.map((c) => {
                const votes = currentSection.votes2022?.votes[c.id] || 0;
                const total = currentSection.votes2022?.totalValidVotes || 1;
                const share = (votes / total) * 100;
                const isTarget = c.id === candidate.id;

                return (
                  <div key={c.id} className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className={isTarget ? 'font-bold text-emerald-900' : 'text-neutral-700'}>
                        {c.name} ({c.party})
                      </span>
                      <span className="font-mono font-medium">
                        {formatNumber(votes)} ({formatPercent(share, 1)})
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${share}%`,
                          backgroundColor: c.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 mt-2 border-t border-neutral-100 text-[10px] text-neutral-500 font-mono">
            Votos Válidos: {currentSection.votes2022?.totalValidVotes} · Comparecimento: {currentSection.votes2022?.totalVoters}
          </div>
        </div>
      </div>

      {/* Tabela de Alta Densidade das Seções com Tratamento N/D */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Grade Completa de Seções Auditadas ({enrichedSections.length} no escopo)
            </h3>
            <p className="text-xs text-neutral-500">
              Registros com histórico incompleto são reportados como <strong>N/D</strong> para evitar distorções estatísticas.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200 rounded-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Município</th>
                <th className="py-2.5 px-3 font-semibold">Zona</th>
                <th className="py-2.5 px-3 font-semibold">Seção</th>
                <th className="py-2.5 px-3 font-semibold">Local e Bairro</th>
                <th className="py-2.5 px-3 font-semibold text-right font-mono">2018</th>
                <th className="py-2.5 px-3 font-semibold text-right font-mono">2022</th>
                <th className="py-2.5 px-3 font-semibold text-right font-mono">2026</th>
                <th className="py-2.5 px-3 font-semibold text-right">
                  Δ ({filters.startYear}→{filters.endYear})
                </th>
                <th className="py-2.5 px-3 font-semibold text-right">Var. %</th>
                <th className="py-2.5 px-3 font-semibold text-right">Part. {filters.endYear}</th>
                <th className="py-2.5 px-3 font-semibold text-right">Var. p.p.</th>
                <th className="py-2.5 px-3 font-semibold text-right">Válidos {filters.endYear}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {enrichedSections.map((s) => {
                const isPositive = (s.absChange ?? 0) >= 0;
                const validEnd = filters.endYear === 2018 ? s.valid18 : filters.endYear === 2022 ? s.valid22 : s.valid26;
                return (
                  <tr
                    key={s.sectionId}
                    onClick={() => setActiveSectionId(s.sectionId)}
                    className={`hover:bg-neutral-50 cursor-pointer transition-colors ${
                      activeSectionId === s.sectionId ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-medium text-neutral-900">{s.munName}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-600">{s.zoneId}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">{s.sectionId}</td>
                    <td className="py-2.5 px-3 max-w-xs">
                      <div className="font-medium text-neutral-900 truncate">{s.locationName}</div>
                      <div className="text-[11px] text-neutral-500 truncate">{s.neighborhood}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-700">
                      {s.v18 !== undefined ? formatNumber(s.v18) : <span className="text-amber-700 font-semibold">N/D</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-neutral-900">
                      {s.v22 !== undefined ? formatNumber(s.v22) : 'N/D'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-900">
                      {s.v26 !== undefined ? formatNumber(s.v26) : 'N/D'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        s.absChange === null
                          ? 'text-neutral-400'
                          : isPositive
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {s.absChange !== null ? formatChange(s.absChange) : 'N/D'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono ${
                        s.pctChange === null
                          ? 'text-neutral-400'
                          : isPositive
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {s.pctChange !== null ? formatPercent(s.pctChange, 1) : 'N/D'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-900 font-medium">
                      {s.shareEnd !== undefined ? formatPercent(s.shareEnd, 1) : 'N/D'}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono ${
                        s.ppChange === null
                          ? 'text-neutral-400'
                          : (s.ppChange ?? 0) >= 0
                          ? 'text-emerald-700'
                          : 'text-rose-700'
                      }`}
                    >
                      {s.ppChange !== null ? formatPP(s.ppChange, 1) : 'N/D'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-600">
                      {validEnd !== undefined ? formatNumber(validEnd) : 'N/D'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Advertência Metodológica sobre N/D e Seções Desmembradas */}
        <div className="p-3 bg-neutral-50 rounded border border-neutral-200 text-xs text-neutral-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Critério de Integridade N/D:</strong> Seções criadas ou desmembradas entre eleições (como a seção 0299 do Colégio Murialdo em Ana Rech) não possuem base de comparação legítima em 2018. É uma grave falha metodológica computar a variação a partir de zero, pois geraria falsos crescimentos de +∞%. A plataforma preserva o estado <strong>N/D</strong> em conformidade com as boas práticas estatísticas.
          </p>
        </div>
      </div>
    </div>
  );
};
