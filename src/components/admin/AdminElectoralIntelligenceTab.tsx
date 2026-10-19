import React from 'react';
import { FilterProvider, useFilter } from '../../context/FilterContext';
import { ElectionDataProvider, ElectionDataGate } from '../../hooks/useElectionData';
import { Header } from '../../components/Header';
import { ActiveFiltersBar } from '../../components/ActiveFiltersBar';
import { GlobalFiltersModal } from '../../components/GlobalFiltersModal';
import { OverviewView } from '../../views/OverviewView';
import { PerformanceView } from '../../views/PerformanceView';
import { TerritorialView } from '../../views/TerritorialView';
import { ComparisonView } from '../../views/ComparisonView';
import { ConcentrationView } from '../../views/ConcentrationView';
import { ZonesSectionsView } from '../../views/ZonesSectionsView';
import { SpatialView } from '../../views/SpatialView';
import { ReportsView } from '../../views/ReportsView';
import { MethodologyView } from '../../views/MethodologyView';
import type { ViewTab } from '../../types/election';

const TabSynchronizer: React.FC<{
  subTab?: ViewTab;
  onSelectSubTab?: (tab: ViewTab) => void;
}> = ({ subTab, onSelectSubTab }) => {
  const { activeTab, setActiveTab } = useFilter();

  React.useEffect(() => {
    if (subTab && subTab !== activeTab) {
      setActiveTab(subTab);
    }
  }, [subTab, activeTab, setActiveTab]);

  React.useEffect(() => {
    if (activeTab && onSelectSubTab && subTab !== activeTab) {
      onSelectSubTab(activeTab);
    }
  }, [activeTab, onSelectSubTab, subTab]);

  return null;
};

const MainContent: React.FC = () => {
  const { activeTab } = useFilter();

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView />;
      case 'performance':
        return <PerformanceView />;
      case 'territorial':
        return <TerritorialView />;
      case 'comparison':
        return <ComparisonView />;
      case 'concentration':
        return <ConcentrationView />;
      case 'zones-sections':
        return <ZonesSectionsView />;
      case 'spatial':
        return <SpatialView />;
      case 'reports':
        return <ReportsView />;
      case 'methodology':
        return <MethodologyView />;
      default:
        return <OverviewView />;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-neutral-50 min-h-[calc(100vh-14rem)]">
      <ActiveFiltersBar />
      {renderActiveView()}
    </main>
  );
};

export const AdminElectoralIntelligenceTab: React.FC<{
  subTab?: ViewTab;
  onSelectSubTab?: (tab: ViewTab) => void;
}> = ({ subTab = 'overview', onSelectSubTab }) => {
  return (
    <ElectionDataProvider>
      <FilterProvider>
        <ElectionDataGate>
            <TabSynchronizer subTab={subTab} onSelectSubTab={onSelectSubTab} />
            <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
              <Header />
              <MainContent />
              <GlobalFiltersModal />
            </div>
        </ElectionDataGate>
      </FilterProvider>
    </ElectionDataProvider>
  );
};