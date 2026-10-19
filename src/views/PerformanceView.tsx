import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Search,
  Download,
  Filter,
  CheckSquare,
  Square,
  Info,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  Calendar,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import {
  computeMunicipalityMetrics,
  MunicipalityMetricRow,
  formatNumber,
  formatPercent,
  formatPP,
  formatChange,
  filterMunicipalities,
} from '../utils/electoralMath';
import { exportToCSV } from '../utils/csvExport';
import { MunicipalitySectionInspector } from '../components/MunicipalitySectionInspector';
import { ElectionYear } from '../types/election';

type SortField =
  | 'name'
  | 'votes2018'
  | 'votes2022'
  | 'votes2026'
  | 'votesStart'
  | 'votesEnd'
  | 'absChange'
  | 'pctChange'
  | 'shareStart'
  | 'shareEnd'
  | 'ppChange'
  | 'rankStart'
  | 'rankEnd';

type FilterVariation = 'all' | 'gains' | 'losses' | 'high_growth' | 'severe_drop';

export const PerformanceView: React.FC = () => {
  const { filters, setFilters, setActiveTab, setSelectedMunicipalityForDetail } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA } = useElectionData();
  const candidate = CANDIDATES.find((c) => c.id === filters.mainCandidateId) || CANDIDATES[0];

  const allRows = useMemo(() => {
    const muns = filterMunicipalities(MUNICIPALITIES_DATA, filters, candidate.id);
    return computeMunicipalityMetrics(
      muns.length > 0 ? muns : MUNICIPALITIES_DATA,
      candidate.id,
      filters.startYear,
      filters.endYear
    );
  }, [candidate.id, filters]);

  // Estados locais da tabela
  const [searchTerm, setSearchTerm] = useState('');
  const [variationFilter, setVariationFilter] = useState<FilterVariation>('all');
  const [sortField, setSortField] = useState<SortField>('votesEnd');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMunIds, setExpandedMunIds] = useState<string[]>(['caxias_do_sul']);
  const pageSize = 8;

  const toggleExpand = (munId: string) => {
    setExpandedMunIds((prev) =>
      prev.includes(munId) ? prev.filter((id) => id !== munId) : [...prev, munId]
    );
  };

  const handleCycleChange = (start: ElectionYear, end: ElectionYear) => {
    setFilters((prev) => ({
      ...prev,
      startYear: start,
      endYear: end,
    }));
  };

  // Filtragem
  const filteredRows = useMemo(() => {
    return allRows.filter((r) => {
      // Busca por nome
      if (
        searchTerm &&
        !r.municipality.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !r.municipality.region.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      // Intervalo de variação
      if (variationFilter === 'gains' && r.absChange <= 0) return false;
      if (variationFilter === 'losses' && r.absChange >= 0) return false;
      if (variationFilter === 'high_growth' && (r.pctChange === null || r.pctChange < 15)) return false;
      if (variationFilter === 'severe_drop' && (r.pctChange === null || r.pctChange > -20)) return false;

      return true;
    });
  }, [allRows, searchTerm, variationFilter]);

  // Ordenação
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let valA: any = a.votesEnd;
      let valB: any = b.votesEnd;

      switch (sortField) {
        case 'name':
          valA = a.municipality.name;
          valB = b.municipality.name;
          break;
        case 'votes2018':
          valA = a.votes2018;
          valB = b.votes2018;
          break;
        case 'votes2022':
          valA = a.votes2022;
          valB = b.votes2022;
          break;
        case 'votes2026':
          valA = a.votes2026;
          valB = b.votes2026;
          break;
        case 'absChange':
          valA = a.absChange;
          valB = b.absChange;
          break;
        case 'pctChange':
          valA = a.pctChange ?? -99999;
          valB = b.pctChange ?? -99999;
          break;
        case 'shareStart':
          valA = a.shareStart;
          valB = b.shareStart;
          break;
        case 'shareEnd':
          valA = a.shareEnd;
          valB = b.shareEnd;
          break;
        case 'ppChange':
          valA = a.ppChange;
          valB = b.ppChange;
          break;
        case 'rankStart':
          valA = a.rankStart;
          valB = b.rankStart;
          break;
        case 'rankEnd':
          valA = a.rankEnd;
          valB = b.rankEnd;
          break;
      }

      if (typeof valA === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? valA - valB : valB - valA;
    });
  }, [filteredRows, sortField, sortAsc]);

  // Paginação
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRows.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRows.map((r) => r.municipality.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExportTableCSV = () => {
    const exportData = sortedRows.map((r) => [
      r.municipality.name,
      r.municipality.region,
      r.votes2018,
      r.votes2022,
      r.absChange,
      r.pctChange !== null ? formatPercent(r.pctChange, 2) : 'N/D',
      formatPercent(r.share2018, 2),
      formatPercent(r.share2022, 2),
      formatPP(r.ppChange, 2),
      r.rank2018,
      r.rank2022,
      r.classification,
    ]);

    exportToCSV(
      `desempenho_eleitoral_${candidate.id}_2018_2022`,
      [
        'Município',
        'Região',
        'Votos 2018',
        'Votos 2022',
        'Diferença Absoluta',
        'Variação %',
        'Part. Válidos 2018 (%)',
        'Part. Válidos 2022 (%)',
        'Variação p.p.',
        'Ranking 2018',
        'Ranking 2022',
        'Classificação',
      ],
      exportData
    );
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Análise Longitudinal e Saldos</div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Desempenho Eleitoral Comparativo ({filters.startYear} vs {filters.endYear})
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Matriz municipal completa com separação estrita entre saldo absoluto, variação percentual e pontos percentuais.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Seletor Rápido de Ciclos (2018, 2022, 2026) */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md text-xs">
              <span className="text-[11px] text-neutral-500 font-medium px-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-neutral-400" />
                Ciclo:
              </span>
              <button
                onClick={() => handleCycleChange(2018, 2022)}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  filters.startYear === 2018 && filters.endYear === 2022
                    ? 'bg-white text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                2018 → 2022
              </button>
              <button
                onClick={() => handleCycleChange(2022, 2026)}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  filters.startYear === 2022 && filters.endYear === 2026
                    ? 'bg-white text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                2022 → 2026
              </button>
              <button
                onClick={() => handleCycleChange(2018, 2026)}
                className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                  filters.startYear === 2018 && filters.endYear === 2026
                    ? 'bg-white text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                2018 → 2026
              </button>
            </div>

            <button
              onClick={handleExportTableCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gráficos Analíticos: Barras Divergentes e Slopegraph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Barras Divergentes de Saldo Absoluto (Ganhos vs Perdas) */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Gráfico Divergente de Saldo de Votos
              </h3>
              <p className="text-xs text-neutral-500">
                Saldo líquido absoluto (2022 - 2018) por município da amostra.
              </p>
            </div>
            <ArrowUpDown className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="space-y-2 py-2">
            {[...allRows]
              .sort((a, b) => b.absChange - a.absChange)
              .map((r) => {
                const maxAbs = 2300; // Limiar de escala
                const pct = Math.min(100, (Math.abs(r.absChange) / maxAbs) * 100);
                const isPositive = r.absChange >= 0;

                return (
                  <div key={r.municipality.id} className="grid grid-cols-12 items-center text-xs gap-2">
                    <span className="col-span-4 font-medium text-neutral-800 truncate text-right pr-2">
                      {r.municipality.name}
                    </span>
                    <div className="col-span-6 flex items-center h-4 relative">
                      {/* Linha de centro zero */}
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-300 z-10" />

                      {isPositive ? (
                        <div
                          className="h-3.5 bg-emerald-700 rounded-r ml-[50%] transition-all"
                          style={{ width: `${pct / 2}%` }}
                        />
                      ) : (
                        <div
                          className="h-3.5 bg-rose-700 rounded-l transition-all"
                          style={{
                            width: `${pct / 2}%`,
                            marginLeft: `calc(50% - ${pct / 2}%)`,
                          }}
                        />
                      )}
                    </div>
                    <span
                      className={`col-span-2 font-mono font-medium text-right ${
                        isPositive ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {formatChange(r.absChange)}
                    </span>
                  </div>
                );
              })}
          </div>

          <div className="flex items-center justify-between pt-3 mt-2 border-t border-neutral-100 text-[11px] text-neutral-500">
            <span className="text-rose-700 font-medium">← Perdas de votos</span>
            <span>Eixo zero</span>
            <span className="text-emerald-700 font-medium">Ganhos de votos →</span>
          </div>
        </div>

        {/* Gráfico 2: Slopegraph de Participação Eleitoral (2018 vs 2022) */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Slopegraph: Variação de Penetração nos Votos Válidos
              </h3>
              <p className="text-xs text-neutral-500">
                Trajetória da participação (%) em votos válidos entre os dois pleitos.
              </p>
            </div>
            <TrendingUp className="w-4 h-4 text-neutral-400" />
          </div>

          <div className="h-64 flex flex-col justify-between pt-4 pb-2 px-6">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 pb-2 border-b border-neutral-200">
              <span>Eleição 2018</span>
              <span>Eleição 2022</span>
            </div>

            <div className="relative flex-1 py-2">
              <svg className="w-full h-full overflow-visible">
                {allRows.slice(0, 6).map((r) => {
                  const maxShare = 15; // Escala máxima ~15%
                  const y1 = Math.max(10, Math.min(180, 180 - (r.share2018 / maxShare) * 160));
                  const y2 = Math.max(10, Math.min(180, 180 - (r.share2022 / maxShare) * 160));
                  const isUp = r.ppChange >= 0;
                  const color = isUp ? '#047857' : '#be123c';

                  return (
                    <g key={r.municipality.id} className="group">
                      <line
                        x1="10%"
                        y1={y1}
                        x2="90%"
                        y2={y2}
                        stroke={color}
                        strokeWidth="2"
                        className="transition-all hover:stroke-width-3"
                      />
                      {/* Pontos */}
                      <circle cx="10%" cy={y1} r="3.5" fill={color} />
                      <circle cx="90%" cy={y2} r="3.5" fill={color} />

                      {/* Rótulo 2018 */}
                      <text
                        x="9%"
                        y={y1 + 4}
                        textAnchor="end"
                        className="text-[10px] font-mono fill-neutral-600"
                      >
                        {formatPercent(r.share2018, 1)}
                      </text>

                      {/* Rótulo 2022 + Nome */}
                      <text
                        x="91%"
                        y={y2 + 4}
                        textAnchor="start"
                        className="text-[10px] font-medium fill-neutral-900"
                      >
                        {formatPercent(r.share2022, 1)} · {r.municipality.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500 flex justify-between">
              <span>Linhas verdes: ganho de participação</span>
              <span>Linhas vermelhas: retração de penetração</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de Tabela: Busca e Segmentação */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Buscar por município ou região..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-700 bg-white"
              />
            </div>
          </div>

          {/* Segmented Control para Filtro de Variação */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md text-xs">
            <button
              onClick={() => {
                setVariationFilter('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                variationFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todos ({allRows.length})
            </button>
            <button
              onClick={() => {
                setVariationFilter('gains');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                variationFilter === 'gains'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Ganhos (+Votos)
            </button>
            <button
              onClick={() => {
                setVariationFilter('losses');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                variationFilter === 'losses'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Perdas (-Votos)
            </button>
            <button
              onClick={() => {
                setVariationFilter('high_growth');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                variationFilter === 'high_growth'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Expansão &gt;15%
            </button>
            <button
              onClick={() => {
                setVariationFilter('severe_drop');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                variationFilter === 'severe_drop'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Queda &gt;20%
            </button>
          </div>
        </div>

        {/* Tabela de Alta Densidade com Investigação Direta de Zonas e Seções */}
        <div className="overflow-x-auto border border-neutral-200 rounded-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200 select-none">
              <tr>
                <th className="py-2.5 px-3 w-8">
                  <button onClick={toggleSelectAll} className="text-neutral-500 hover:text-neutral-800">
                    {selectedIds.length === filteredRows.length && filteredRows.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                </th>
                <th
                  onClick={() => handleSort('name')}
                  className="py-2.5 px-3 font-semibold cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Município</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('votes2018')}
                  className="py-2.5 px-2.5 font-semibold text-right cursor-pointer hover:bg-neutral-100 transition-colors font-mono"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>2018</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('votes2022')}
                  className="py-2.5 px-2.5 font-semibold text-right cursor-pointer hover:bg-neutral-100 transition-colors font-mono"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>2022</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('votes2026')}
                  className="py-2.5 px-2.5 font-semibold text-right cursor-pointer hover:bg-neutral-100 transition-colors font-mono"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>2026</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('absChange')}
                  className="py-2.5 px-3 font-semibold text-right cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Δ ({filters.startYear}→{filters.endYear})</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('pctChange')}
                  className="py-2.5 px-2.5 font-semibold text-right cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Var. %</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('shareStart')}
                  className="py-2.5 px-2.5 font-semibold text-right cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Part. {filters.startYear}</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('shareEnd')}
                  className="py-2.5 px-2.5 font-semibold text-right cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Part. {filters.endYear}</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('ppChange')}
                  className="py-2.5 px-2.5 font-semibold text-right cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Var. p.p.</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('rankEnd')}
                  className="py-2.5 px-2.5 font-semibold text-center cursor-pointer hover:bg-neutral-100 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Rank</span>
                    <ArrowUpDown className="w-3 h-3 text-neutral-400" />
                  </div>
                </th>
                <th className="py-2.5 px-3 font-semibold text-left">Classificação</th>
                <th className="py-2.5 px-3 font-semibold text-center">Zonas & Seções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-neutral-500">
                    Nenhum município corresponde aos filtros de variação e busca aplicados.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((r) => {
                  const isSelected = selectedIds.includes(r.municipality.id);
                  const isPositive = r.absChange >= 0;
                  const isExpanded = expandedMunIds.includes(r.municipality.id);

                  return (
                    <React.Fragment key={r.municipality.id}>
                      <tr
                        className={`hover:bg-neutral-50/80 transition-colors ${
                          isSelected ? 'bg-emerald-50/40' : ''
                        } ${isExpanded ? 'bg-neutral-50/60 font-medium' : ''}`}
                      >
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => toggleSelectOne(r.municipality.id)}
                            className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => toggleExpand(r.municipality.id)}
                              className="text-neutral-400 hover:text-neutral-800 p-0.5 rounded cursor-pointer"
                              title={isExpanded ? 'Ocultar seções' : 'Expandir zonas e seções'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-emerald-800" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <div>
                              <button
                                onClick={() => {
                                  setSelectedMunicipalityForDetail(r.municipality.id);
                                  setActiveTab('territorial');
                                }}
                                className="font-semibold text-neutral-900 hover:text-emerald-800 hover:underline text-left cursor-pointer"
                              >
                                {r.municipality.name}
                              </button>
                              <div className="text-[11px] text-neutral-500">
                                {r.municipality.region} · {r.municipality.zones.length} zonas
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-neutral-700">
                          {formatNumber(r.votes2018)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium text-neutral-900">
                          {formatNumber(r.votes2022)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium text-emerald-900">
                          {formatNumber(r.votes2026)}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right font-mono font-semibold ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatChange(r.absChange)}
                        </td>
                        <td
                          className={`py-2.5 px-2.5 text-right font-mono font-medium ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {r.pctChange !== null ? formatPercent(r.pctChange, 1) : 'N/D'}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono text-neutral-600">
                          {formatPercent(r.shareStart, 2)}
                        </td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-medium text-neutral-900">
                          {formatPercent(r.shareEnd, 2)}
                        </td>
                        <td
                          className={`py-2.5 px-2.5 text-right font-mono ${
                            r.ppChange >= 0 ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {formatPP(r.ppChange, 2)}
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono text-neutral-700">
                          #{r.rankStart}→#{r.rankEnd}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[11px] font-medium ${
                              r.classification === 'Crescimento expressivo'
                                ? 'text-emerald-800'
                                : r.classification === 'Queda severa'
                                ? 'text-rose-800'
                                : 'text-neutral-600'
                            }`}
                          >
                            {r.classification}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpand(r.municipality.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                              isExpanded
                                ? 'bg-emerald-800 text-white shadow-xs'
                                : 'bg-neutral-100 text-neutral-700 hover:bg-emerald-50 hover:text-emerald-900 border border-neutral-200'
                            }`}
                          >
                            <Grid3X3 className="w-3 h-3" />
                            <span>{isExpanded ? 'Recolher' : 'Investigar'}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Linha Subordinada Expandível: Zonas, Seções e Para Quem Foram os Votos */}
                      {isExpanded && (
                        <tr className="bg-neutral-50/80">
                          <td colSpan={13} className="p-0 border-b-2 border-emerald-800/30">
                            <MunicipalitySectionInspector
                              municipalityId={r.municipality.id}
                              candidateId={candidate.id}
                              startYear={filters.startYear}
                              endYear={filters.endYear}
                              compact={true}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela: Paginação e Nota Epistemológica */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-neutral-500">
          <div>
            Exibindo {paginatedRows.length} de {filteredRows.length} municípios{' '}
            {selectedIds.length > 0 && `(${selectedIds.length} selecionados)`}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-neutral-300 text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50"
            >
              Anterior
            </button>
            <span className="px-2 font-mono text-neutral-800">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-neutral-300 text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50"
            >
              Próxima
            </button>
          </div>
        </div>

        {/* Nota Metodológica de Diferenciação */}
        <div className="p-3 bg-neutral-50 rounded border border-neutral-200 text-xs text-neutral-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-neutral-800">
              Diferenciação Crítica das Grandezas de Variação:
            </span>
            <p className="text-[11px] leading-relaxed">
              <strong>Variação Absoluta (Δ Votos):</strong> saldo quantitativo de cédulas (2022 − 2018).{' '}
              <strong>Variação Percentual (%):</strong> expansão ou retração do candidato relativo à sua própria votação em 2018.{' '}
              <strong>Pontos Percentuais (p.p.):</strong> diferença líquida da fatia de mercado sobre os votos válidos do município (Part. 2022 − Part. 2018).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
