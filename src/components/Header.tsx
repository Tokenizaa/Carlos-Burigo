import React from 'react';
import { SlidersHorizontal, Download, Printer, RefreshCw, Sparkles } from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useAssistant } from '../context/AssistantContext';
import { useElectionData } from '../hooks/useElectionData';
import { exportToCSV } from '../utils/csvExport';
import { computeMunicipalityMetrics, formatNumber, formatPercent, formatPP } from '../utils/electoralMath';

export const Header: React.FC = () => {
  const { filters, activeTab, setIsFilterModalOpen, resetFilters, applyPreset, updateFilter } = useFilter();
  const { toggleOpen, isOpen } = useAssistant();
  const { municipalities: MUNICIPALITIES_DATA } = useElectionData();

  const handleExportCSV = () => {
    const rows = computeMunicipalityMetrics(MUNICIPALITIES_DATA, filters.mainCandidateId);
    const headers = [
      'Município',
      'Código IBGE',
      'Região',
      'Votos 2018',
      'Votos 2022',
      'Variação Absoluta',
      'Variação Percentual (%)',
      'Participação 2018 (%)',
      'Participação 2022 (%)',
      'Variação p.p.',
      'Ranking 2018',
      'Ranking 2022',
      'Quociente de Localização',
      'Classificação',
    ];

    const data = rows.map((r) => [
      r.municipality.name,
      r.municipality.codeIBGE,
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
      r.locationQuotient2022.toFixed(2),
      r.classification,
    ]);

    exportToCSV(`inteligencia_eleitoral_${filters.mainCandidateId}_${filters.endYear}`, headers, data);
  };

  const handlePrint = () => {
    window.print();
  };

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'overview':
        return 'Visão Geral';
      case 'performance':
        return 'Desempenho Eleitoral';
      case 'territorial':
        return 'Análise Territorial';
      case 'comparison':
        return 'Comparação entre Candidatos';
      case 'concentration':
        return 'Concentração de Votos';
      case 'zones-sections':
        return 'Análise por Zona e Seção';
      case 'spatial':
        return 'Análise Espacial';
      case 'reports':
        return 'Relatórios Analíticos';
      case 'methodology':
        return 'Metodologia e Procedimentos';
      default:
        return 'Análise';
    }
  };

  return (
    <header className="bg-white border-b border-neutral-200 shrink-0 no-print">
      <div className="px-6 py-3.5 flex items-center justify-between gap-4">
        {/* Context Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 min-w-0">
          <span className="font-semibold text-neutral-900 truncate">
            {getBreadcrumbTitle()}
          </span>
          <span aria-hidden="true" className="text-neutral-300">/</span>
          <span className="truncate">Eleições {filters.startYear}–{filters.endYear}</span>
          <span aria-hidden="true" className="text-neutral-300">·</span>
          <span className="truncate">{filters.office}</span>
          <span aria-hidden="true" className="text-neutral-300">·</span>
          <span className="truncate">{filters.state}</span>
        </div>

        {/* Filtro primário do ciclo eleitoral */}
        <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-700 bg-emerald-50 px-4 py-2 shadow-sm">
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800">Eleição em análise</span>
            <span className="text-xs font-semibold text-emerald-950">Comparar ciclos</span>
          </div>
          <select
            aria-label="Selecionar comparação entre eleições"
            value={`${filters.startYear}-${filters.endYear}`}
            onChange={(event) => {
              const [start, end] = event.target.value.split('-').map(Number);
              updateFilter('startYear', start as 2018 | 2022 | 2026);
              updateFilter('endYear', end as 2018 | 2022 | 2026);
            }}
            className="min-h-10 min-w-[170px] rounded-lg border border-emerald-700 bg-white px-3 py-2 text-sm font-bold text-emerald-950 shadow-sm outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="2018-2022">2018 → 2022</option>
            <option value="2022-2026">2022 → 2026</option>
            <option value="2018-2026">2018 → 2026</option>
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleOpen}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              isOpen
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
            }`}
            title="Abrir Assistente de Inteligência Eleitoral"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Assistente IA</span>
          </button>

          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-md transition-colors"
            title="Ajustar parâmetros de filtro"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-600" />
            <span>Filtros Globais</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-md transition-colors"
            title="Exportar base consolidada em formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-neutral-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-md transition-colors"
            title="Imprimir visualização ou exportar PDF"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-600" />
            <span>Imprimir</span>
          </button>

          <button
            onClick={resetFilters}
            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
            title="Restaurar filtros originais"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
