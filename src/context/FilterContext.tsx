import React, { createContext, useContext, useMemo, useState } from 'react';
import { GlobalFilters, ViewTab } from '../types/election';
import { useElectionData } from '../hooks/useElectionData';

interface ScopeStats {
  municipalitiesCount: number;
  zonesCount: number;
  sectionsCount: number;
  totalCandidateVotes: number;
}

interface FilterContextType {
  filters: GlobalFilters;
  setFilters: React.Dispatch<React.SetStateAction<GlobalFilters>>;
  updateFilter: <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => void;
  resetFilters: () => void;
  applyPreset: (presetId: string) => void;
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  selectedMunicipalityForDetail: string | null;
  setSelectedMunicipalityForDetail: (id: string | null) => void;
  isFilterModalOpen: boolean;
  setIsFilterModalOpen: (open: boolean) => void;
  scopeStats: ScopeStats;
}

const DEFAULT_FILTERS: GlobalFilters = {
  startYear: 2018,
  endYear: 2022,
  office: 'Deputado Estadual',
  turno: 1,
  state: 'RS',
  municipalityId: 'all',
  zoneId: 'all',
  sectionId: 'all',
  mainCandidateId: '15140',
  compareCandidateId: '11000',
  region: 'all',
  variationTrend: 'all',
  voteRange: 'all',
  lqFilter: 'all',
  activePreset: 'default',
};

const FilterContext = createContext<FilterContextType | null>(null);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { municipalities: MUNICIPALITIES_DATA, sections: RAW_SECTIONS } = useElectionData();
  const [filters, setFilters] = useState<GlobalFilters>(DEFAULT_FILTERS);
  const [activeTab, setActiveTab] = useState<ViewTab>('overview');
  const [selectedMunicipalityForDetail, setSelectedMunicipalityForDetail] = useState<string | null>(null);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const updateFilter = <K extends keyof GlobalFilters>(key: K, value: GlobalFilters[K]) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value, activePreset: undefined };
      // Cascata dependente
      if (key === 'municipalityId') {
        updated.zoneId = 'all';
        updated.sectionId = 'all';
      }
      if (key === 'zoneId') {
        updated.sectionId = 'all';
      }
      if (key === 'region' && value !== 'all') {
        // Se município não pertencer à região, reseta para 'all'
        const currentMun = MUNICIPALITIES_DATA.find((m) => m.id === updated.municipalityId);
        if (currentMun && currentMun.region !== value) {
          updated.municipalityId = 'all';
          updated.zoneId = 'all';
          updated.sectionId = 'all';
        }
      }
      return updated;
    });
  };

  const applyPreset = (presetId: string) => {
    switch (presetId) {
      case 'caxias_core':
        setFilters({
          ...DEFAULT_FILTERS,
          municipalityId: 'caxias_do_sul',
          region: 'Serra Gaúcha',
          activePreset: 'caxias_core',
        });
        setSelectedMunicipalityForDetail('caxias_do_sul');
        break;
      case 'growth_vector':
        setFilters({
          ...DEFAULT_FILTERS,
          municipalityId: 'farroupilha',
          variationTrend: 'gains',
          region: 'Serra Gaúcha',
          activePreset: 'growth_vector',
        });
        setSelectedMunicipalityForDetail('farroupilha');
        break;
      case 'loss_epicenter':
        setFilters({
          ...DEFAULT_FILTERS,
          municipalityId: 'bento_goncalves',
          variationTrend: 'severe_drop',
          activePreset: 'loss_epicenter',
        });
        setSelectedMunicipalityForDetail('bento_goncalves');
        break;
      case 'metropolitan':
        setFilters({
          ...DEFAULT_FILTERS,
          region: 'Metropolitana',
          municipalityId: 'porto_alegre',
          activePreset: 'metropolitan',
        });
        setSelectedMunicipalityForDetail('porto_alegre');
        break;
      case 'serra_focus':
        setFilters({
          ...DEFAULT_FILTERS,
          region: 'Serra Gaúcha',
          municipalityId: 'all',
          activePreset: 'serra_focus',
        });
        break;
      case 'default':
      default:
        setFilters(DEFAULT_FILTERS);
        setSelectedMunicipalityForDetail(null);
        break;
    }
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSelectedMunicipalityForDetail(null);
  };

  // Cálculo das estatísticas do escopo ativo em tempo real
  const scopeStats = useMemo(() => {
    let muns = MUNICIPALITIES_DATA;

    if (filters.region !== 'all') {
      muns = muns.filter((m) => m.region === filters.region);
    }
    if (filters.municipalityId !== 'all') {
      muns = muns.filter((m) => m.id === filters.municipalityId);
    }
    if (filters.voteRange === 'over_10k') {
      muns = muns.filter((m) => (m.candidateVotes2022[filters.mainCandidateId] || 0) >= 10000);
    } else if (filters.voteRange === '1k_to_10k') {
      muns = muns.filter((m) => {
        const v = m.candidateVotes2022[filters.mainCandidateId] || 0;
        return v >= 1000 && v < 10000;
      });
    } else if (filters.voteRange === 'under_1k') {
      muns = muns.filter((m) => (m.candidateVotes2022[filters.mainCandidateId] || 0) < 1000);
    }

    if (filters.variationTrend !== 'all') {
      muns = muns.filter((m) => {
        const v18 = m.candidateVotes2018[filters.mainCandidateId] || 0;
        const v22 = m.candidateVotes2022[filters.mainCandidateId] || 0;
        const absDiff = v22 - v18;
        const pctDiff = v18 > 0 ? (absDiff / v18) * 100 : null;

        if (filters.variationTrend === 'gains') return absDiff > 0;
        if (filters.variationTrend === 'losses') return absDiff < 0;
        if (filters.variationTrend === 'high_growth') return pctDiff !== null && pctDiff >= 15;
        if (filters.variationTrend === 'severe_drop') return pctDiff !== null && pctDiff <= -20;
        return true;
      });
    }

    const munIds = new Set(muns.map((m) => m.id));
    const allZones = new Set<string>();
    muns.forEach((m) => m.zones.forEach((z) => allZones.add(z)));

    const matchingSections = RAW_SECTIONS.filter((s) => {
      if (!munIds.has(s.municipalityId)) return false;
      if (filters.zoneId !== 'all' && s.zoneId !== filters.zoneId) return false;
      if (filters.sectionId !== 'all' && s.sectionId !== filters.sectionId) return false;
      return true;
    });

    const totalVotes = muns.reduce((acc, m) => acc + (m.candidateVotes2022[filters.mainCandidateId] || 0), 0);

    return {
      municipalitiesCount: muns.length,
      zonesCount: filters.zoneId !== 'all' ? 1 : allZones.size,
      sectionsCount: matchingSections.length,
      totalCandidateVotes: totalVotes,
    };
  }, [filters, MUNICIPALITIES_DATA, RAW_SECTIONS]);

  const value = useMemo(
    () => ({
      filters,
      setFilters,
      updateFilter,
      resetFilters,
      applyPreset,
      activeTab,
      setActiveTab,
      selectedMunicipalityForDetail,
      setSelectedMunicipalityForDetail,
      isFilterModalOpen,
      setIsFilterModalOpen,
      scopeStats,
    }),
    [filters, activeTab, selectedMunicipalityForDetail, isFilterModalOpen, scopeStats]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

export const useFilter = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilter must be used within a FilterProvider');
  }
  return context;
};
