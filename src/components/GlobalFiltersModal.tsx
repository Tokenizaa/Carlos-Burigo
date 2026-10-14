import React, { useState } from 'react';
import {
  X,
  Check,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
  MapPin,
  TrendingUp,
  Layers,
  BarChart2,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import { GlobalFilters } from '../types/election';
import { formatNumber } from '../utils/electoralMath';

export const GlobalFiltersModal: React.FC = () => {
  const {
    filters,
    setFilters,
    isFilterModalOpen,
    setIsFilterModalOpen,
    resetFilters,
    applyPreset,
    scopeStats,
  } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA, sections: RAW_SECTIONS } = useElectionData();

  const [localFilters, setLocalFilters] = useState<GlobalFilters>(filters);

  // Sincronizar estado local quando modal abre
  React.useEffect(() => {
    if (isFilterModalOpen) {
      setLocalFilters(filters);
    }
  }, [isFilterModalOpen, filters]);

  // Municípios disponíveis filtrados por região se selecionada
  const availableMunicipalities = React.useMemo(() => {
    if (localFilters.region === 'all') return MUNICIPALITIES_DATA;
    return MUNICIPALITIES_DATA.filter((m) => m.region === localFilters.region);
  }, [localFilters.region]);

  // Zonas disponíveis baseadas no município local
  const availableZones = React.useMemo(() => {
    if (localFilters.municipalityId === 'all') {
      const allZones = new Set<string>();
      availableMunicipalities.forEach((m) => m.zones.forEach((z) => allZones.add(z)));
      return Array.from(allZones).sort();
    }
    const mun = MUNICIPALITIES_DATA.find((m) => m.id === localFilters.municipalityId);
    return mun ? mun.zones : [];
  }, [localFilters.municipalityId, availableMunicipalities]);

  // Seções disponíveis
  const availableSections = React.useMemo(() => {
    return RAW_SECTIONS.filter((s) => {
      if (localFilters.municipalityId !== 'all' && s.municipalityId !== localFilters.municipalityId) {
        return false;
      }
      if (localFilters.zoneId !== 'all' && s.zoneId !== localFilters.zoneId) {
        return false;
      }
      return true;
    }).map((s) => s.sectionId);
  }, [localFilters.municipalityId, localFilters.zoneId]);

  if (!isFilterModalOpen) return null;

  const handleApply = () => {
    setFilters(localFilters);
    setIsFilterModalOpen(false);
  };

  const handlePresetClick = (presetKey: string) => {
    applyPreset(presetKey);
    setIsFilterModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-2xl border border-neutral-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-800" />
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Sistema Avançado de Filtros e Parâmetros Eleitorais
              </h2>
              <p className="text-xs text-neutral-500">
                Configure o escopo temporal, espacial, partidário e métricas analíticas.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsFilterModalOpen(false)}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo do Escopo em Tempo Real */}
        <div className="bg-emerald-950 text-emerald-100 px-6 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono">
          <span>Escopo atual: <strong>{scopeStats.municipalitiesCount} municípios</strong> · <strong>{scopeStats.zonesCount} zonas</strong> · <strong>{scopeStats.sectionsCount} seções</strong></span>
          <span className="text-emerald-300">Votos do Candidato: <strong>{formatNumber(scopeStats.totalCandidateVotes)}</strong></span>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-6 space-y-5 max-h-[68vh] overflow-y-auto">
          {/* Cenários Estratégicos Rápidos (Presets) */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Cenários Estratégicos Pré-Configurados (1 Clique):</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handlePresetClick('default')}
                className="p-2.5 rounded border border-neutral-200 hover:border-emerald-700 hover:bg-emerald-50/40 text-left transition-colors"
              >
                <div className="font-semibold text-neutral-900">Cenário Completo</div>
                <div className="text-[11px] text-neutral-500">Todos os 10 polos da Serra Gaúcha e RS</div>
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('caxias_core')}
                className="p-2.5 rounded border border-neutral-200 hover:border-emerald-700 hover:bg-emerald-50/40 text-left transition-colors"
              >
                <div className="font-semibold text-neutral-900">Bastião Principal (Caxias do Sul)</div>
                <div className="text-[11px] text-neutral-500">Concentra 67% dos votos de Carlos Búrigo</div>
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('growth_vector')}
                className="p-2.5 rounded border border-neutral-200 hover:border-emerald-700 hover:bg-emerald-50/40 text-left transition-colors"
              >
                <div className="font-semibold text-neutral-900">Polos de Expansão (Farroupilha)</div>
                <div className="text-[11px] text-neutral-500">Maior crescimento líquido (+610 votos / +21%)</div>
              </button>
              <button
                type="button"
                onClick={() => handlePresetClick('loss_epicenter')}
                className="p-2.5 rounded border border-neutral-200 hover:border-emerald-700 hover:bg-emerald-50/40 text-left transition-colors"
              >
                <div className="font-semibold text-neutral-900">Foco de Retração (Bento Gonçalves)</div>
                <div className="text-[11px] text-neutral-500">Retração de -54,1% pelo avanço de Pasin</div>
              </button>
            </div>
          </div>

          {/* 1. Ciclo Eleitoral das 3 Eleições (2018, 2022, 2026) */}
          <div className="pt-2 border-t border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-800" />
                <span>1. Ciclo Temporal de Comparação (2018, 2022 e 2026)</span>
              </h3>
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({ ...prev, startYear: 2018, endYear: 2022 }))
                  }
                  className={`px-2.5 py-1 rounded border text-[11px] font-medium transition-colors ${
                    localFilters.startYear === 2018 && localFilters.endYear === 2022
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  2018 → 2022
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({ ...prev, startYear: 2022, endYear: 2026 }))
                  }
                  className={`px-2.5 py-1 rounded border text-[11px] font-medium transition-colors ${
                    localFilters.startYear === 2022 && localFilters.endYear === 2026
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  2022 → 2026
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setLocalFilters((prev) => ({ ...prev, startYear: 2018, endYear: 2026 }))
                  }
                  className={`px-2.5 py-1 rounded border text-[11px] font-medium transition-colors ${
                    localFilters.startYear === 2018 && localFilters.endYear === 2026
                      ? 'bg-emerald-800 text-white border-emerald-800'
                      : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  2018 → 2026 (Decenal)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Eleição Inicial (Base de Comparação)
                </label>
                <select
                  value={localFilters.startYear}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      startYear: Number(e.target.value) as any,
                    }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700 font-mono"
                >
                  <option value={2018}>Eleições Gerais 2018</option>
                  <option value={2022}>Eleições Gerais 2022</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Eleição Final (Alvo de Investigação)
                </label>
                <select
                  value={localFilters.endYear}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      endYear: Number(e.target.value) as any,
                    }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700 font-mono"
                >
                  <option value={2022}>Eleições Gerais 2022</option>
                  <option value={2026}>Eleições Gerais 2026</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Candidatos e Concorrentes */}
          <div className="pt-2 border-t border-neutral-200 space-y-3">
            <h3 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              2. Candidato em Foco & Concorrente de Referência
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Candidato Principal (Investigado)
                </label>
                <select
                  value={localFilters.mainCandidateId}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, mainCandidateId: e.target.value }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700 font-medium"
                >
                  {CANDIDATES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.party} - {c.ballotNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Concorrente de Comparação
                </label>
                <select
                  value={localFilters.compareCandidateId}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, compareCandidateId: e.target.value }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700 font-medium"
                >
                  {CANDIDATES.filter((c) => c.id !== localFilters.mainCandidateId).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.party} - {c.ballotNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Recorte Territorial Hierárquico */}
          <div className="pt-2 border-t border-neutral-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" />
              <span>2. Hierarquia Geográfica (Região → Município → Zona → Seção)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Macrorregião Geográfica
                </label>
                <select
                  value={localFilters.region}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      region: e.target.value as any,
                      municipalityId: 'all',
                      zoneId: 'all',
                      sectionId: 'all',
                    }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="all">Todas as Regiões</option>
                  <option value="Serra Gaúcha">Serra Gaúcha</option>
                  <option value="Metropolitana">Metropolitana (Porto Alegre)</option>
                  <option value="Campos de Cima">Campos de Cima da Serra (Vacaria)</option>
                  <option value="Planalto">Planalto Médio (Passo Fundo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Município
                </label>
                <select
                  value={localFilters.municipalityId}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      municipalityId: e.target.value,
                      zoneId: 'all',
                      sectionId: 'all',
                    }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700 font-medium"
                >
                  <option value="all">Todos os Municípios da Região</option>
                  {availableMunicipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.region})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Zona Eleitoral
                </label>
                <select
                  value={localFilters.zoneId}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      zoneId: e.target.value,
                      sectionId: 'all',
                    }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="all">Todas as Zonas do Recorte</option>
                  {availableZones.map((z) => (
                    <option key={z} value={z}>
                      Zona {z}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Seção Eleitoral
                </label>
                <select
                  value={localFilters.sectionId}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, sectionId: e.target.value }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="all">Todas as Seções ({availableSections.length} disponíveis)</option>
                  {availableSections.map((s) => (
                    <option key={s} value={s}>
                      Seção {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Filtros Estatísticos Multicritério */}
          <div className="pt-2 border-t border-neutral-200 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 uppercase tracking-wider">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
              <span>3. Filtros Estatísticos Multicritério</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Tendência de Variação
                </label>
                <select
                  value={localFilters.variationTrend}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, variationTrend: e.target.value as any }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="all">Todas as Variações</option>
                  <option value="gains">Apenas Ganhos (+Votos)</option>
                  <option value="losses">Apenas Perdas (-Votos)</option>
                  <option value="high_growth">Forte Crescimento (&gt;15%)</option>
                  <option value="severe_drop">Queda Severa (&gt;20%)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Faixa de Votação
                </label>
                <select
                  value={localFilters.voteRange}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, voteRange: e.target.value as any }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="all">Todas as Faixas</option>
                  <option value="over_10k">Grandes Bases (&gt; 10k votos)</option>
                  <option value="1k_to_10k">Médias Bases (1k a 10k)</option>
                  <option value="under_1k">Pequenas Bases (&lt; 1k)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Quociente de Localização (QL)
                </label>
                <select
                  value={localFilters.lqFilter}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({ ...prev, lqFilter: e.target.value as any }))
                  }
                  className="w-full text-xs rounded-md border border-neutral-300 bg-white px-2.5 py-2 text-neutral-900 focus:ring-1 focus:ring-emerald-700"
                >
                  <option value="all">Todos os Territórios</option>
                  <option value="overrepresented">Sobre-representados (QL &gt; 1.0)</option>
                  <option value="underrepresented">Sub-representados (QL &lt; 1.0)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              resetFilters();
              setIsFilterModalOpen(false);
            }}
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFilterModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 rounded-md hover:bg-emerald-900 transition-colors shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar Parâmetros</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
