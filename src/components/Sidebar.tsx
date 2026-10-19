import React from 'react';
import {
  BarChart3,
  MapPin,
  Users2,
  PieChart,
  Grid3X3,
  Map,
  FileText,
  BookOpen,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { ViewTab } from '../types/election';

interface NavItem {
  id: ViewTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard, description: 'Resumo executivo e achados' },
  { id: 'performance', label: 'Desempenho Eleitoral', icon: BarChart3, description: 'Evolução histórica e saldos' },
  { id: 'territorial', label: 'Análise Territorial', icon: MapPin, description: 'Hierarquia município/zona/seção' },
  { id: 'comparison', label: 'Comparação de Candidatos', icon: Users2, description: 'Matriz e confronto relativo' },
  { id: 'concentration', label: 'Concentração de Votos', icon: PieChart, description: 'HHI, Lorenz e Gini' },
  { id: 'zones-sections', label: 'Zonas e Seções', icon: Grid3X3, description: 'Investigação microterritorial' },
  { id: 'spatial', label: 'Análise Espacial', icon: Map, description: 'Mapa coroplético e GIS interativo' },
  { id: 'reports', label: 'Relatórios Analíticos', icon: FileText, description: 'Documentos prontos para exportar' },
  { id: 'methodology', label: 'Metodologia', icon: BookOpen, description: 'Fórmulas e limites estatísticos' },
];

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, filters, applyPreset } = useFilter();

  return (
    <aside className="w-64 shrink-0 bg-neutral-900 text-neutral-300 flex flex-col border-r border-neutral-800 select-none no-print">
      {/* Brand Header */}
      <div className="p-5 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-emerald-800 text-white flex items-center justify-center font-bold text-sm tracking-tight shrink-0">
            IE
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-white tracking-tight truncate">
              Inteligência Eleitoral
            </h1>
            <p className="text-xs text-neutral-400 truncate">
              Dep. Carlos Búrigo · RS
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 pt-2 pb-1.5 text-[11px] font-medium tracking-wider uppercase text-neutral-500">
          Módulos Analíticos
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-md transition-colors text-left ${
                isActive
                  ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-800/60'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-emerald-400' : 'text-neutral-500'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Cenários Estratégicos Rápidos */}
      <div className="p-3 border-t border-neutral-800 space-y-1.5 bg-neutral-950/20">
        <div className="flex items-center gap-1.5 px-2 text-[11px] font-semibold text-neutral-400">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Cenários Rápidos</span>
        </div>
        <div className="space-y-0.5">
          <button
            onClick={() => applyPreset('default')}
            className={`w-full text-left px-2 py-1 rounded text-[11px] truncate transition-colors cursor-pointer ${
              filters.activePreset === 'default'
                ? 'bg-neutral-800 text-emerald-300 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            · Visão Geral Amostral
          </button>
          <button
            onClick={() => applyPreset('caxias_core')}
            className={`w-full text-left px-2 py-1 rounded text-[11px] truncate transition-colors cursor-pointer ${
              filters.activePreset === 'caxias_core'
                ? 'bg-neutral-800 text-emerald-300 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            · Bastião: Caxias do Sul
          </button>
          <button
            onClick={() => applyPreset('growth_vector')}
            className={`w-full text-left px-2 py-1 rounded text-[11px] truncate transition-colors cursor-pointer ${
              filters.activePreset === 'growth_vector'
                ? 'bg-neutral-800 text-emerald-300 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            · Expansão: Farroupilha
          </button>
          <button
            onClick={() => applyPreset('loss_epicenter')}
            className={`w-full text-left px-2 py-1 rounded text-[11px] truncate transition-colors cursor-pointer ${
              filters.activePreset === 'loss_epicenter'
                ? 'bg-neutral-800 text-emerald-300 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            · Retração: Bento Gonçalves
          </button>
        </div>
      </div>

      {/* System Integrity & Demo Identification */}
      <div className="p-4 border-t border-neutral-800 text-xs text-neutral-400 space-y-2 bg-neutral-950/40">
        <div className="flex items-center gap-1.5 text-neutral-300 font-medium text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Ambiente de Demonstração</span>
        </div>
        <p className="text-[11px] leading-relaxed text-neutral-500">
          Dados sintéticos de teste estatisticamente balanceados para investigação estratégica.
        </p>
        <div className="text-[10px] text-neutral-600 font-mono">
          Consistência: 100% reconciliado
        </div>
      </div>
    </aside>
  );
};
