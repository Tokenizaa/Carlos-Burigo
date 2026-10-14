import React from 'react';
import { X, Filter, Sparkles, MapPin, TrendingUp, BarChart2, Calendar, User } from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import { ElectionYear } from '../types/election';

export const ActiveFiltersBar: React.FC = () => {
  const { filters, setFilters, updateFilter, resetFilters, applyPreset, scopeStats } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA } = useElectionData();

  const mainCand = CANDIDATES.find((c) => c.id === filters.mainCandidateId);
  const compCand = CANDIDATES.find((c) => c.id === filters.compareCandidateId);
  const mun = MUNICIPALITIES_DATA.find((m) => m.id === filters.municipalityId);

  const hasNonDefaultFilter =
    filters.region !== 'all' ||
    filters.municipalityId !== 'all' ||
    filters.zoneId !== 'all' ||
    filters.sectionId !== 'all' ||
    filters.variationTrend !== 'all' ||
    filters.voteRange !== 'all' ||
    filters.lqFilter !== 'all' ||
    filters.mainCandidateId !== '15140' ||
    filters.startYear !== 2018 ||
    filters.endYear !== 2022;

  const handleCycleQuickSwitch = (start: ElectionYear, end: ElectionYear) => {
    setFilters((prev) => ({
      ...prev,
      startYear: start,
      endYear: end,
    }));
  };

  return (
    <div className="bg-white border-b border-neutral-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-600 no-print">
      {/* Controles Rápidos Primários: Ciclo Eleitoral + Candidato + Município */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Ciclo Eleitoral das 3 Eleições (2018, 2022, 2026) */}
        <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-md border border-neutral-200">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-1.5 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-emerald-800" />
            Ciclo:
          </span>
          <button
            type="button"
            onClick={() => handleCycleQuickSwitch(2018, 2022)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filters.startYear === 2018 && filters.endYear === 2022
                ? 'bg-white text-emerald-900 font-bold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            2018→'22
          </button>
          <button
            type="button"
            onClick={() => handleCycleQuickSwitch(2022, 2026)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filters.startYear === 2022 && filters.endYear === 2026
                ? 'bg-white text-emerald-900 font-bold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            2022→'26
          </button>
          <button
            type="button"
            onClick={() => handleCycleQuickSwitch(2018, 2026)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              filters.startYear === 2018 && filters.endYear === 2026
                ? 'bg-white text-emerald-900 font-bold shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            2018→'26 (Decenal)
          </button>
        </div>

        {/* Candidato em Análise */}
        <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-200 rounded-md px-2 py-0.5">
          <User className="w-3 h-3 text-emerald-700" />
          <span className="text-[11px] text-neutral-500">Candidato:</span>
          <select
            value={filters.mainCandidateId}
            onChange={(e) => updateFilter('mainCandidateId', e.target.value)}
            className="text-xs font-semibold text-neutral-900 bg-transparent focus:outline-none cursor-pointer"
          >
            {CANDIDATES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.party})
              </option>
            ))}
          </select>
        </div>

        {/* Município Rápido */}
        <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-200 rounded-md px-2 py-0.5">
          <MapPin className="w-3 h-3 text-neutral-500" />
          <span className="text-[11px] text-neutral-500">Município:</span>
          <select
            value={filters.municipalityId}
            onChange={(e) => updateFilter('municipalityId', e.target.value)}
            className="text-xs font-medium text-neutral-900 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="all">Todos os 10 Polos</option>
            {MUNICIPALITIES_DATA.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Região (se filtrada) */}
        {filters.region !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs">
            <MapPin className="w-3 h-3 text-emerald-700" />
            <span>Região: {filters.region}</span>
            <button
              onClick={() => updateFilter('region', 'all')}
              className="text-emerald-700 hover:text-emerald-950 ml-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Zona */}
        {filters.zoneId !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs">
            <span>Zona {filters.zoneId}</span>
            <button
              onClick={() => updateFilter('zoneId', 'all')}
              className="text-emerald-700 hover:text-emerald-950 ml-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Seção */}
        {filters.sectionId !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs">
            <span>Seção {filters.sectionId}</span>
            <button
              onClick={() => updateFilter('sectionId', 'all')}
              className="text-emerald-700 hover:text-emerald-950 ml-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Tendência de Variação */}
        {filters.variationTrend !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-xs">
            <TrendingUp className="w-3 h-3 text-blue-700" />
            <span>
              {filters.variationTrend === 'gains' && 'Apenas Ganhos (+Votos)'}
              {filters.variationTrend === 'losses' && 'Apenas Perdas (-Votos)'}
              {filters.variationTrend === 'high_growth' && 'Expansão > 15%'}
              {filters.variationTrend === 'severe_drop' && 'Queda > 20%'}
            </span>
            <button
              onClick={() => updateFilter('variationTrend', 'all')}
              className="text-blue-700 hover:text-blue-950 ml-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}

        {/* Faixa de Votos */}
        {filters.voteRange !== 'all' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-xs">
            <span>
              {filters.voteRange === 'over_10k' && 'Grandes Bases (>10k)'}
              {filters.voteRange === '1k_to_10k' && 'Médias Bases (1k a 10k)'}
              {filters.voteRange === 'under_1k' && 'Pequenas Bases (<1k)'}
            </span>
            <button
              onClick={() => updateFilter('voteRange', 'all')}
              className="text-amber-700 hover:text-amber-950 ml-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {/* Indicador de Escopo & Ação de Limpeza Geral */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono text-neutral-500">
          Amostra: <strong>{scopeStats.municipalitiesCount} muns</strong> · <strong>{scopeStats.zonesCount} zonas</strong> · <strong>{scopeStats.sectionsCount} seções</strong>
        </span>

        {hasNonDefaultFilter && (
          <button
            onClick={resetFilters}
            className="text-[11px] font-medium text-rose-700 hover:text-rose-900 underline underline-offset-2 transition-colors cursor-pointer"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
};
