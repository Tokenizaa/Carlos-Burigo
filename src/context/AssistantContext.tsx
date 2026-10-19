import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  AssistantMessage,
  Investigation,
  InvestigationStatus,
  PageContextState,
} from '../types/assistant';
import { useFilter } from './FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import { generateContextualResponse } from '../utils/assistantEngine';
import { ViewTab } from '../types/election';

interface AssistantContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  investigations: Investigation[];
  activeInvestigation: Investigation;
  setActiveInvestigationId: (id: string) => void;
  createInvestigation: (title: string, objective: string) => string;
  updateInvestigationStatus: (id: string, status: InvestigationStatus) => void;
  sendMessage: (text: string) => void;
  suggestedQuestions: string[];
  pageContext: PageContextState;
  handleEvidenceAction: (action: {
    label: string;
    view: ViewTab;
    municipalityId?: string;
    zoneId?: string;
    sectionId?: string;
  }) => void;
}

const INITIAL_INVESTIGATIONS: Investigation[] = [
  {
    id: 'inv-caxias-erosao',
    title: 'Perda de votos em Caxias do Sul (2018→2022→2026)',
    objective:
      'Investigar as causas da oscilação de votos no maior colégio eleitoral do candidato, auditar seções e identificar beneficiários da migração.',
    status: 'em_andamento',
    updatedAt: 'Hoje às 10:45',
    referenceView: 'territorial',
    contextSummary: 'Caxias do Sul · 2018→2022→2026 · Zonas 169 e 16',
    messages: [
      {
        id: 'msg-init-1',
        investigationId: 'inv-caxias-erosao',
        sender: 'assistant',
        timestamp: '10:45',
        text: `### Investigação Ativa: Perda de Votos em Caxias do Sul\n\nIdentificamos uma contração de **-1.890 votos** entre 2018 e 2022 em Caxias do Sul, seguida de recuperação de **+2.677 votos em 2026**.\n\nA auditoria por seções eleitorais demonstra que a migração não foi dispersa: concentrou-se na ascensão de concorrentes diretos (Guilherme Pasin e Pepe Vargas) em bairros específicos.\n\nComo posso ajudar a aprofundar esta análise agora?`,
        suggestedFollowUps: [
          'Por que a votação caiu nesse município?',
          'Para quem foram os votos nas seções mais críticas de Caxias do Sul?',
          'Qual foi a evolução no pleito de 2026?',
          'A abstenção causou a perda de votos?',
        ],
      },
    ],
  },
  {
    id: 'inv-expansao-regional',
    title: 'Expansão Regional e Bastiões na Serra Gaúcha',
    objective:
      'Avaliar municípios com crescimento expressivo e Quociente de Localização (QL) elevado.',
    status: 'em_andamento',
    updatedAt: 'Ontem às 16:20',
    referenceView: 'performance',
    contextSummary: 'Serra Gaúcha · Farroupilha, Flores da Cunha e Bento Gonçalves',
    messages: [
      {
        id: 'msg-init-2',
        investigationId: 'inv-expansao-regional',
        sender: 'assistant',
        timestamp: '16:20',
        text: `### Investigação: Expansão nos Bastiões da Serra\n\nEm Flores da Cunha e Farroupilha, a votação manteve Quociente de Localização (QL > 2,5), demonstrando fidelidade do eleitorado mesmo em momentos de disputa acirrada.`,
        suggestedFollowUps: [
          'Quais municípios tiveram crescimento expressivo?',
          'Como se compara a votação entre Farroupilha e Caxias do Sul?',
        ],
      },
    ],
  },
];

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    filters,
    setFilters,
    activeTab,
    setActiveTab,
    selectedMunicipalityForDetail,
    setSelectedMunicipalityForDetail,
  } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA, sections: RAW_SECTIONS } = useElectionData();

  const [isOpen, setIsOpen] = useState(false);
  const [investigations, setInvestigations] = useState<Investigation[]>(INITIAL_INVESTIGATIONS);
  const [activeInvestigationId, setActiveInvestigationId] = useState<string>('inv-caxias-erosao');

  const activeCandidate =
    CANDIDATES.find((c) => c.id === filters.mainCandidateId) || CANDIDATES[0];

  const currentMunId =
    selectedMunicipalityForDetail ||
    (filters.municipalityId !== 'all' ? filters.municipalityId : 'caxias_do_sul');
  const currentMun = MUNICIPALITIES_DATA.find((m) => m.id === currentMunId);

  const viewNameMap: Record<ViewTab, string> = {
    overview: 'Visão Geral & Diagnóstico',
    performance: 'Desempenho Municipal',
    territorial: 'Análise Territorial',
    comparison: 'Comparação de Candidatos',
    concentration: 'Concentração Eleitoral',
    'zones-sections': 'Zonas & Seções',
    spatial: 'Distribuição Espacial (Mapa)',
    reports: 'Relatórios & Exportação',
    methodology: 'Metodologia & Dados TSE',
  };

  const pageContext: PageContextState = useMemo(() => {
    return {
      view: activeTab,
      viewName: viewNameMap[activeTab] || activeTab,
      startYear: filters.startYear,
      endYear: filters.endYear,
      candidateId: activeCandidate.id,
      candidateName: activeCandidate.name,
      selectedMunicipalityId: currentMunId,
      selectedMunicipalityName: currentMun?.name || 'Caxias do Sul',
      selectedZoneId: filters.zoneId !== 'all' ? filters.zoneId : undefined,
      selectedSectionId: filters.sectionId !== 'all' ? filters.sectionId : undefined,
      activeFiltersCount:
        (filters.municipalityId !== 'all' ? 1 : 0) +
        (filters.region !== 'all' ? 1 : 0) +
        (filters.variationTrend !== 'all' ? 1 : 0),
    };
  }, [activeTab, filters, activeCandidate, currentMunId, currentMun]);

  const activeInvestigation = useMemo(() => {
    const found = investigations.find((i) => i.id === activeInvestigationId);
    return found || investigations[0];
  }, [investigations, activeInvestigationId]);

  // Sugestões dinâmicas de perguntas para o contexto atual
  const suggestedQuestions = useMemo(() => {
    const munName = currentMun?.name || 'Caxias do Sul';
    const suggestions: string[] = [];

    if (activeTab === 'territorial' || activeTab === 'performance') {
      suggestions.push(`Por que a votação caiu nesse município?`);
      suggestions.push(`Para quem foram os votos perdidos em ${munName}?`);
      suggestions.push(`Como foi a evolução em 2026 em ${munName}?`);
      suggestions.push(`A abstenção explica a oscilação de votos?`);
    } else if (activeTab === 'comparison') {
      suggestions.push(`Onde o candidato mais perdeu votos para Pepe Vargas e Guilherme Pasin?`);
      suggestions.push(`Quem foi o principal concorrente em Caxias do Sul?`);
    } else if (activeTab === 'concentration') {
      suggestions.push(`Qual a dependência do candidato em relação a Caxias do Sul?`);
      suggestions.push(`A votação está mais dispersa ou concentrada em 2026?`);
    } else {
      suggestions.push(`Por que a votação caiu em Caxias do Sul?`);
      suggestions.push(`Para quem foram os votos perdidos nas seções mais críticas?`);
      suggestions.push(`Qual foi o desempenho histórico nos 3 pleitos (2018, 2022, 2026)?`);
    }

    return suggestions;
  }, [activeTab, currentMun]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: AssistantMessage = {
      id: `msg-user-${Date.now()}`,
      investigationId: activeInvestigation.id,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      text: text.trim(),
    };

    // Gera resposta contextual determinística baseada na base real
    const assistantMsg = generateContextualResponse(
      text,
      activeInvestigation.id,
      pageContext,
      { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA, sections: RAW_SECTIONS }
    );

    setInvestigations((prev) =>
      prev.map((inv) => {
        if (inv.id === activeInvestigation.id) {
          return {
            ...inv,
            updatedAt: 'Agora mesmo',
            messages: [...inv.messages, userMsg, assistantMsg],
          };
        }
        return inv;
      })
    );
  };

  const createInvestigation = (title: string, objective: string): string => {
    const newId = `inv-${Date.now()}`;
    const newInv: Investigation = {
      id: newId,
      title: title.trim(),
      objective: objective.trim(),
      status: 'em_andamento',
      updatedAt: 'Criada agora',
      referenceView: activeTab,
      contextSummary: `${pageContext.selectedMunicipalityName} · ${pageContext.startYear}→${pageContext.endYear}`,
      messages: [
        {
          id: `msg-init-${newId}`,
          investigationId: newId,
          sender: 'assistant',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          text: `Nova investigação iniciada: **${title}**\n\n*Objetivo*: ${objective}\n*Contexto*: Página ${pageContext.viewName}, foco em ${pageContext.selectedMunicipalityName} no ciclo ${pageContext.startYear} → ${pageContext.endYear}.\n\nComo gostaria de iniciar a análise dos dados?`,
          suggestedFollowUps: [
            `Por que a votação caiu em ${pageContext.selectedMunicipalityName}?`,
            `Para quem foram os votos nas seções mais críticas?`,
          ],
        },
      ],
    };

    setInvestigations((prev) => [newInv, ...prev]);
    setActiveInvestigationId(newId);
    return newId;
  };

  const updateInvestigationStatus = (id: string, status: InvestigationStatus) => {
    setInvestigations((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, status, updatedAt: 'Agora mesmo' } : inv))
    );
  };

  const handleEvidenceAction = (action: {
    label: string;
    view: ViewTab;
    municipalityId?: string;
    zoneId?: string;
    sectionId?: string;
  }) => {
    if (action.view) {
      setActiveTab(action.view);
    }
    if (action.municipalityId) {
      setSelectedMunicipalityForDetail(action.municipalityId);
      setFilters((f) => ({ ...f, municipalityId: action.municipalityId! }));
    }
    if (action.zoneId) {
      setFilters((f) => ({ ...f, zoneId: action.zoneId! }));
    }
    if (action.sectionId) {
      setFilters((f) => ({ ...f, sectionId: action.sectionId! }));
    }
  };

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        setIsOpen,
        toggleOpen: () => setIsOpen((prev) => !prev),
        investigations,
        activeInvestigation,
        setActiveInvestigationId,
        createInvestigation,
        updateInvestigationStatus,
        sendMessage,
        suggestedQuestions,
        pageContext,
        handleEvidenceAction,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
};

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};
