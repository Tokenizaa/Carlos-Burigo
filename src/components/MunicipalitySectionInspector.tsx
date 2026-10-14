import React, { useMemo, useState } from 'react';
import {
  Layers,
  Search,
  TrendingDown,
  TrendingUp,
  Users2,
  FileSpreadsheet,
  X,
  AlertTriangle,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Candidate, ElectionYear, SectionHistory } from '../types/election';
import { useElectionData } from '../hooks/useElectionData';
import {
  analyzeSectionDispute,
  formatChange,
  formatNumber,
  formatPercent,
  SectionDisputeAnalysis,
} from '../utils/electoralMath';

interface MunicipalitySectionInspectorProps {
  municipalityId: string;
  candidateId?: string;
  startYear?: ElectionYear;
  endYear?: ElectionYear;
  compact?: boolean;
}

export const MunicipalitySectionInspector: React.FC<MunicipalitySectionInspectorProps> = ({
  municipalityId,
  candidateId = '15140',
  startYear = 2018,
  endYear = 2022,
  compact = false,
}) => {
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA, sections: RAW_SECTIONS } = useElectionData();
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [disputeFilter, setDisputeFilter] = useState<
    'all' | 'losses' | 'gains' | 'pasin_lead' | 'pepe_lead' | 'severe_loss'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectedSection, setInspectedSection] = useState<SectionDisputeAnalysis | null>(null);

  const municipality = MUNICIPALITIES_DATA.find((m) => m.id === municipalityId) || MUNICIPALITIES_DATA[0];
  const mainCandidate = CANDIDATES.find((c) => c.id === candidateId) || CANDIDATES[0];

  // Seções deste município
  const municipalSections = useMemo(() => {
    return RAW_SECTIONS.filter((s) => s.municipalityId === municipality.id);
  }, [municipality.id]);

  // Análise de disputa para cada seção
  const analyzedSections = useMemo(() => {
    return municipalSections.map((s) =>
      analyzeSectionDispute(s, CANDIDATES, mainCandidate.id, startYear, endYear)
    );
  }, [municipalSections, mainCandidate.id, startYear, endYear]);

  // Estatísticas agregadas do município
  const summaryStats = useMemo(() => {
    const totalSections = analyzedSections.length;
    const lossSections = analyzedSections.filter((a) => a.mainCandidateDiff < 0);
    const gainSections = analyzedSections.filter((a) => a.mainCandidateDiff > 0);
    const stableSections = analyzedSections.filter((a) => a.mainCandidateDiff === 0);

    const totalLostVotes = lossSections.reduce((acc, a) => acc + Math.abs(a.mainCandidateDiff), 0);
    const totalGainedVotes = gainSections.reduce((acc, a) => acc + a.mainCandidateDiff, 0);

    // Contabilizar quem mais ganhou votos nas seções em que o candidato perdeu
    const predatorTally: Record<string, number> = {};
    lossSections.forEach((a) => {
      a.competitors.forEach((c) => {
        if (c.diff > 0) {
          predatorTally[c.candidateId] = (predatorTally[c.candidateId] || 0) + c.diff;
        }
      });
    });

    let topPredatorCandidate: Candidate | null = null;
    let topPredatorVotes = 0;
    Object.entries(predatorTally).forEach(([cId, votes]) => {
      if (votes > topPredatorVotes) {
        topPredatorVotes = votes;
        topPredatorCandidate = CANDIDATES.find((c) => c.id === cId) || null;
      }
    });

    return {
      totalSections,
      lossSectionsCount: lossSections.length,
      gainSectionsCount: gainSections.length,
      stableSectionsCount: stableSections.length,
      totalLostVotes,
      totalGainedVotes,
      netCycleBalance: totalGainedVotes - totalLostVotes,
      topPredatorCandidate,
      topPredatorVotes,
    };
  }, [analyzedSections]);

  // Seções filtradas por zona, status e busca
  const filteredSections = useMemo(() => {
    return analyzedSections.filter((item) => {
      // Filtro por Zona
      if (selectedZone !== 'all' && item.section.zoneId !== selectedZone) {
        return false;
      }

      // Filtro por Disputa / Migração
      if (disputeFilter === 'losses' && item.mainCandidateDiff >= 0) return false;
      if (disputeFilter === 'gains' && item.mainCandidateDiff <= 0) return false;
      if (disputeFilter === 'severe_loss' && item.mainCandidateDiff > -15) return false;
      if (disputeFilter === 'pasin_lead' && item.winnerCandidate.candidateId !== '11000') return false;
      if (disputeFilter === 'pepe_lead' && item.winnerCandidate.candidateId !== '13123') return false;

      // Busca textual
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchSec = item.section.sectionId.toLowerCase().includes(term);
        const matchLoc = item.section.locationName.toLowerCase().includes(term);
        const matchNeigh = item.section.neighborhood.toLowerCase().includes(term);
        const matchZone = item.section.zoneId.toLowerCase().includes(term);
        if (!matchSec && !matchLoc && !matchNeigh && !matchZone) return false;
      }

      return true;
    });
  }, [analyzedSections, selectedZone, disputeFilter, searchTerm]);

  return (
    <div className={`space-y-4 ${compact ? 'p-3 bg-neutral-50/70 border-t border-neutral-200' : 'bg-white p-5 rounded-lg border border-neutral-200 shadow-xs'}`}>
      {/* Cabeçalho do Inspetor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Raiz do Problema: Investigação de Zonas & Seções
            </span>
            <span className="text-[11px] font-mono text-neutral-500">
              ({startYear} → {endYear})
            </span>
          </div>
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <span>{municipality.name}</span>
            <span className="text-xs font-normal text-neutral-500 font-mono">
              · {municipality.zones.length} Zonas · {municipalSections.length} Seções Georreferenciadas
            </span>
          </h3>
        </div>

        {/* Resumo Rápido da Sangria Eleitoral */}
        <div className="flex items-center gap-2 text-xs">
          <div className="bg-rose-50 border border-rose-200 text-rose-800 px-2.5 py-1 rounded font-medium flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Perdas: <strong>{summaryStats.lossSectionsCount} seções</strong> (-{formatNumber(summaryStats.totalLostVotes)} votos)</span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded font-medium flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Ganhos: <strong>{summaryStats.gainSectionsCount} seções</strong> (+{formatNumber(summaryStats.totalGainedVotes)} votos)</span>
          </div>
        </div>
      </div>

      {/* Cartão de Alerta Explicativo: Para Quem Foram os Votos */}
      {summaryStats.topPredatorCandidate && summaryStats.totalLostVotes > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-md p-3 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-neutral-700 leading-relaxed">
            <span className="font-semibold text-neutral-900">
              Diagnóstico de Migração Territorial em {municipality.name}:
            </span>{' '}
            Nas seções em que {mainCandidate.name} recuou, o principal beneficiário foi{' '}
            <strong className="text-neutral-900">
              {(summaryStats.topPredatorCandidate as Candidate).name} ({(summaryStats.topPredatorCandidate as Candidate).party})
            </strong>
            , que capturou aproximadamente{' '}
            <strong className="font-mono text-emerald-800">
              +{formatNumber(summaryStats.topPredatorVotes)} votos
            </strong>{' '}
            nesses mesmos locais. A disputa local se polarizou principalmente no eleitorado de centros urbanos e bairros centrais.
          </div>
        </div>
      )}

      {/* Barra de Filtros e Busca de Seções */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-md border border-neutral-200">
        <div className="flex flex-wrap items-center gap-2">
          {/* Seletor de Zona */}
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <Layers className="w-3.5 h-3.5 text-neutral-500" />
            <span className="font-medium">Zona:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="text-xs rounded border border-neutral-300 bg-white px-2 py-1 text-neutral-900 focus:ring-1 focus:ring-emerald-700 font-mono"
            >
              <option value="all">Todas as {municipality.zones.length} Zonas</option>
              {municipality.zones.map((z) => (
                <option key={z} value={z}>
                  Zona {z}
                </option>
              ))}
            </select>
          </div>

          <span className="text-neutral-300">|</span>

          {/* Filtros de Disputa / Migração */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setDisputeFilter('all')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                disputeFilter === 'all'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Todas ({analyzedSections.length})
            </button>
            <button
              type="button"
              onClick={() => setDisputeFilter('losses')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                disputeFilter === 'losses'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-neutral-100 text-rose-700 hover:bg-rose-50'
              }`}
            >
              Para quem perdemos? ({summaryStats.lossSectionsCount})
            </button>
            <button
              type="button"
              onClick={() => setDisputeFilter('severe_loss')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                disputeFilter === 'severe_loss'
                  ? 'bg-rose-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Queda Severa (&gt;15 votos)
            </button>
            <button
              type="button"
              onClick={() => setDisputeFilter('gains')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                disputeFilter === 'gains'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-neutral-100 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Ganhos ({summaryStats.gainSectionsCount})
            </button>
            <button
              type="button"
              onClick={() => setDisputeFilter('pasin_lead')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                disputeFilter === 'pasin_lead'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-neutral-100 text-blue-700 hover:bg-blue-50'
              }`}
            >
              Onde Pasin Liderou
            </button>
            <button
              type="button"
              onClick={() => setDisputeFilter('pepe_lead')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                disputeFilter === 'pepe_lead'
                  ? 'bg-red-700 text-white shadow-xs'
                  : 'bg-neutral-100 text-red-700 hover:bg-red-50'
              }`}
            >
              Onde Pepe Liderou
            </button>
          </div>
        </div>

        {/* Campo de Busca Rápida de Escola/Seção */}
        <div className="relative min-w-[200px]">
          <Search className="w-3 h-3 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar seção, colégio ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-xs rounded border border-neutral-300 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-700"
          />
        </div>
      </div>

      {/* Tabela de Alta Densidade: Seções e Para Quem Foram os Votos */}
      <div className="overflow-x-auto border border-neutral-200 rounded-md bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Seção & Local de Votação</th>
              <th className="py-2.5 px-2 font-semibold text-center font-mono">Zona</th>
              <th className="py-2.5 px-3 font-semibold text-right font-mono">2018</th>
              <th className="py-2.5 px-3 font-semibold text-right font-mono">2022</th>
              <th className="py-2.5 px-3 font-semibold text-right font-mono">2026</th>
              <th className="py-2.5 px-3 font-semibold text-right font-mono">
                Saldo ({startYear}→{endYear})
              </th>
              <th className="py-2.5 px-3 font-semibold text-left">
                Para quem foram os votos? (Migração de Eleitores)
              </th>
              <th className="py-2.5 px-3 font-semibold text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {filteredSections.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-neutral-500">
                  Nenhuma seção encontrada com os filtros selecionados ({selectedZone !== 'all' ? `Zona ${selectedZone}, ` : ''}{disputeFilter}).
                </td>
              </tr>
            ) : (
              filteredSections.map((item) => {
                const isLoss = item.mainCandidateDiff < 0;
                const isGain = item.mainCandidateDiff > 0;
                const beneficiary = item.primaryBeneficiary;

                return (
                  <tr
                    key={item.section.sectionId}
                    className={`hover:bg-neutral-50/80 transition-colors ${
                      isLoss ? 'bg-rose-50/20' : isGain ? 'bg-emerald-50/20' : ''
                    }`}
                  >
                    {/* Seção e Nome do Colégio */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                        <span className="font-mono text-emerald-800">Seção {item.section.sectionId}</span>
                        <span className="text-[10px] text-neutral-400 font-normal">·</span>
                        <span className="text-neutral-700 font-medium truncate max-w-[220px]">
                          {item.section.locationName}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate max-w-[260px]">
                        Bairro: {item.section.neighborhood}
                      </div>
                    </td>

                    {/* Zona */}
                    <td className="py-2.5 px-2 text-center font-mono text-neutral-600">
                      {item.section.zoneId}
                    </td>

                    {/* Votos 2018 */}
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-700">
                      {item.mainCandidateVotes2018 ? formatNumber(item.mainCandidateVotes2018) : 'N/D'}
                    </td>

                    {/* Votos 2022 */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-neutral-900">
                      {formatNumber(item.mainCandidateVotes2022)}
                    </td>

                    {/* Votos 2026 */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-emerald-900">
                      {item.mainCandidateVotes2026 ? formatNumber(item.mainCandidateVotes2026) : 'N/D'}
                    </td>

                    {/* Saldo Selecionado */}
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        isGain ? 'text-emerald-700' : isLoss ? 'text-rose-700' : 'text-neutral-600'
                      }`}
                    >
                      {formatChange(item.mainCandidateDiff)}
                    </td>

                    {/* Para quem foram os votos (Análise de Concorrentes) */}
                    <td className="py-2.5 px-3">
                      <div className="space-y-1">
                        {/* Pílulas de Concorrentes */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {item.competitors.slice(0, 3).map((comp) => {
                            const isPositive = comp.diff > 0;
                            return (
                              <span
                                key={comp.candidateId}
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                                  isPositive
                                    ? 'bg-neutral-100 text-neutral-900 border-neutral-300 font-semibold'
                                    : 'bg-neutral-50 text-neutral-500 border-neutral-200'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: comp.color }} />
                                <span>{comp.candidateName.split(' ')[0]}:</span>
                                <span className={isPositive ? 'text-emerald-700' : 'text-neutral-600'}>
                                  {formatChange(comp.diff)}
                                </span>
                              </span>
                            );
                          })}
                        </div>

                        {/* Diagnóstico Explicativo Curto */}
                        <div className="text-[11px] text-neutral-600">
                          {isLoss && beneficiary ? (
                            <span>
                              Perda de {Math.abs(item.mainCandidateDiff)} votos. Capturado por{' '}
                              <strong className="text-neutral-900">{beneficiary.candidateName}</strong> (+{beneficiary.diff} votos).
                            </span>
                          ) : (
                            <span className="text-neutral-500">{item.diagnosis}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Ação: Boletim de Urna */}
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => setInspectedSection(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
                        title="Ver Boletim de Urna completo e apuração dos 3 pleitos"
                      >
                        <FileSpreadsheet className="w-3 h-3" />
                        <span>Boletim</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal / Drawer: Boletim de Urna Completo da Seção */}
      {inspectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-neutral-300 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header do Boletim */}
            <div className="px-5 py-4 bg-neutral-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <h4 className="text-sm font-bold tracking-tight">
                    Boletim de Urna Oficial · Seção {inspectedSection.section.sectionId} (Zona {inspectedSection.section.zoneId})
                  </h4>
                  <p className="text-xs text-neutral-400">
                    {inspectedSection.section.locationName} · {inspectedSection.section.neighborhood} · {municipality.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedSection(null)}
                className="text-neutral-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Boletim */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {/* Diagnóstico da Seção */}
              <div className="p-3 bg-neutral-50 rounded border border-neutral-200 space-y-1">
                <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Diagnóstico Estratégico da Seção ({startYear} → {endYear}):</span>
                </div>
                <p className="text-neutral-700 leading-relaxed">
                  {inspectedSection.diagnosis}
                </p>
              </div>

              {/* Tabela Comparativa de Todos os Candidatos nos 3 Ciclos */}
              <div className="border border-neutral-200 rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Candidato / Partido</th>
                      <th className="py-2 px-2.5 font-semibold text-right font-mono">2018</th>
                      <th className="py-2 px-2.5 font-semibold text-right font-mono">2022</th>
                      <th className="py-2 px-2.5 font-semibold text-right font-mono">2026</th>
                      <th className="py-2 px-2.5 font-semibold text-right font-mono">
                        Variação ({startYear}→{endYear})
                      </th>
                      <th className="py-2 px-2.5 font-semibold text-right font-mono">Part. {endYear}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 bg-white font-mono">
                    {inspectedSection.allCandidatesRanked.map((cand) => {
                      const isMain = cand.candidateId === mainCandidate.id;
                      const isPositive = cand.diff >= 0;

                      return (
                        <tr
                          key={cand.candidateId}
                          className={isMain ? 'bg-emerald-50/40 font-semibold' : 'hover:bg-neutral-50'}
                        >
                          <td className="py-2 px-3 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cand.color }} />
                              <span className="text-neutral-900">
                                {cand.candidateName} ({cand.party})
                              </span>
                              {isMain && (
                                <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1 rounded font-sans">
                                  Investigado
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2.5 text-right text-neutral-700">
                            {formatNumber(cand.votes2018)}
                          </td>
                          <td className="py-2 px-2.5 text-right text-neutral-900 font-bold">
                            {formatNumber(cand.votes2022)}
                          </td>
                          <td className="py-2 px-2.5 text-right text-emerald-900">
                            {formatNumber(cand.votes2026)}
                          </td>
                          <td
                            className={`py-2 px-2.5 text-right font-bold ${
                              isPositive ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {formatChange(cand.diff)}
                          </td>
                          <td className="py-2 px-2.5 text-right text-neutral-600">
                            {formatPercent(cand.shareEnd, 1)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Estatísticas de Urna (Válidos, Brancos, Nulos, Abstenção) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-neutral-50 rounded border border-neutral-200 text-center font-mono">
                <div>
                  <div className="text-[10px] text-neutral-500 font-sans uppercase">Votos Válidos ({endYear})</div>
                  <div className="text-sm font-bold text-neutral-900">
                    {formatNumber(inspectedSection.validEnd)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-500 font-sans uppercase">Brancos ({endYear})</div>
                  <div className="text-sm font-bold text-neutral-700">
                    {formatNumber(inspectedSection.section.votes2022?.blankVotes)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-500 font-sans uppercase">Nulos ({endYear})</div>
                  <div className="text-sm font-bold text-neutral-700">
                    {formatNumber(inspectedSection.section.votes2022?.nullVotes)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-500 font-sans uppercase">Comparecimento Total</div>
                  <div className="text-sm font-bold text-neutral-900">
                    {formatNumber(inspectedSection.section.votes2022?.totalVoters)} eleitores
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-5 py-3 bg-neutral-100 border-t border-neutral-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedSection(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
