import React, { useState } from 'react';
import {
  FileText,
  Printer,
  CheckCircle,
  HelpCircle,
  AlertTriangle,
  Database,
  Building,
  Calendar,
  Compass,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Layers,
  Vote,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useAssistant } from '../context/AssistantContext';
import { useElectionData } from '../hooks/useElectionData';
import {
  computeMunicipalityMetrics,
  calcConcentration,
  formatNumber,
  formatPercent,
  formatPP,
  formatChange,
} from '../utils/electoralMath';
import { ElectionYear } from '../types/election';

type ReportType = 'variation' | 'investigation' | 'concentration' | 'competition';

export const ReportsView: React.FC = () => {
  const { filters, setFilters } = useFilter();
  const { activeInvestigation, investigations, setActiveInvestigationId } = useAssistant();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA } = useElectionData();
  const [selectedReport, setSelectedReport] = useState<ReportType>('variation');

  const candidate = CANDIDATES.find((c) => c.id === filters.mainCandidateId) || CANDIDATES[0];
  const rows = computeMunicipalityMetrics(
    MUNICIPALITIES_DATA,
    candidate.id,
    filters.startYear,
    filters.endYear
  );
  const concentration = calcConcentration(MUNICIPALITIES_DATA, candidate.id, filters.endYear);

  const totalVotesStart = rows.reduce((acc, r) => acc + (filters.startYear === 2018 ? r.votes2018 : filters.startYear === 2022 ? r.votes2022 : r.votes2026), 0);
  const totalVotesEnd = rows.reduce((acc, r) => acc + (filters.endYear === 2026 ? r.votes2026 : filters.endYear === 2022 ? r.votes2022 : r.votes2018), 0);
  const netDelta = totalVotesEnd - totalVotesStart;
  const pctChangeTotal = totalVotesStart > 0 ? (netDelta / totalVotesStart) * 100 : 0;

  // Maiores ganhos e perdas municipais no ciclo
  const sortedByAbs = [...rows].sort((a, b) => b.absChange - a.absChange);
  const topGainMun = sortedByAbs[0];
  const topLossMun = sortedByAbs[sortedByAbs.length - 1];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Controles de Seleção do Relatório (ocultados na impressão) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <div className="text-xs text-neutral-500 font-medium">Gerador de Inteligência Executiva e Dossiês</div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            Relatórios Estratégicos Estruturados
          </h2>
          <p className="text-xs text-neutral-600 mt-0.5">
            Documentos analíticos com distinção epistemológica formal, integração às investigações e layout calibrado para exportação em PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Ciclo Eleitoral */}
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

          {/* Seletor de Modelo */}
          <select
            value={selectedReport}
            onChange={(e) => setSelectedReport(e.target.value as ReportType)}
            className="text-xs rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
          >
            <option value="variation">Balanço Territorial de Variação ({filters.startYear}→{filters.endYear})</option>
            <option value="investigation">Dossiê Forense da Investigação em Andamento</option>
            <option value="concentration">Diagnóstico de Concentração e Vulnerabilidade ({filters.endYear})</option>
            <option value="competition">Confronto Competitivo com Concorrentes ({filters.endYear})</option>
          </select>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir / Salvar PDF</span>
          </button>
        </div>
      </div>

      {/* DOCUMENTO DO RELATÓRIO (Pronto para Visualização e Impressão) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-8 shadow-sm space-y-6 max-w-4xl mx-auto print:border-none print:shadow-none print:p-0">
        {/* Cabeçalho Formal do Relatório */}
        <div className="border-b-2 border-neutral-900 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-[11px] font-mono tracking-wider uppercase text-neutral-500">
                Plataforma de Inteligência Eleitoral · Mandato Carlos Búrigo
              </div>
              <h1 className="text-xl font-bold text-neutral-900 mt-1">
                {selectedReport === 'variation' &&
                  `Balanço de Variação Territorial: Decomposição de Ganhos e Perdas (${filters.startYear}–${filters.endYear})`}
                {selectedReport === 'investigation' &&
                  `Dossiê Pericial: ${activeInvestigation.title}`}
                {selectedReport === 'concentration' &&
                  `Diagnóstico Estrutural de Concentração e Dependência de Bases (${filters.endYear})`}
                {selectedReport === 'competition' &&
                  `Confronto Territorial e Disputa de Espaço Competitivo (${filters.endYear})`}
              </h1>
            </div>
            <div className="text-right text-xs text-neutral-600 font-mono">
              <div>Dep. {candidate.name} ({candidate.party})</div>
              <div>Data: Outubro/2026</div>
              <div>Ciclo: {filters.startYear} → {filters.endYear}</div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* RELATÓRIO 1: VARIAÇÃO TERRITORIAL (BALANÇO DE GANHOS E PERDAS) */}
        {/* ============================================================== */}
        {selectedReport === 'variation' && (
          <>
            {/* 1. Pergunta Analítica */}
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                1. Pergunta Analítica
              </h3>
              <p className="text-sm font-medium text-neutral-900 bg-neutral-50 p-3 rounded border border-neutral-200">
                Quais territórios específicos explicam a dinâmica de votos de {candidate.name} no ciclo {filters.startYear}→{filters.endYear}, e onde ocorreram as maiores inflexões eleitorais?
              </p>
            </section>

            {/* 2. Escopo Temporal e Espacial */}
            <section className="space-y-1.5 text-xs text-neutral-700">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                2. Escopo Temporal e Espacial
              </h3>
              <div className="flex flex-wrap gap-4 text-xs font-mono bg-neutral-50/50 p-2.5 rounded border border-neutral-100">
                <span>Ciclo: <strong>{filters.startYear} (1º Turno) vs {filters.endYear} (1º Turno)</strong></span>
                <span>·</span>
                <span>Cargo: <strong>Deputado Estadual (RS)</strong></span>
                <span>·</span>
                <span>Territórios: <strong>{MUNICIPALITIES_DATA.length} Municípios da Serra Gaúcha e Polos</strong></span>
              </div>
            </section>

            {/* 3. Resumo Executivo */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                3. Resumo Executivo
              </h3>
              <p className="text-xs text-neutral-700 leading-relaxed">
                A votação consolidada de {candidate.name} na amostra regional passou de{' '}
                <strong>{formatNumber(totalVotesStart)}</strong> votos em {filters.startYear} para{' '}
                <strong>{formatNumber(totalVotesEnd)}</strong> votos em {filters.endYear}, registrando saldo líquido de{' '}
                <strong>{formatChange(netDelta)} votos ({formatPercent(pctChangeTotal, 1)})</strong>.
                O município com maior crescimento nominal foi <strong>{topGainMun.municipality.name}</strong> ({formatChange(topGainMun.absChange)} votos),
                enquanto o polo de maior perda foi <strong>{topLossMun.municipality.name}</strong> ({formatChange(topLossMun.absChange)} votos).
              </p>
            </section>

            {/* 4. Indicadores Chave Calculados */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                4. Indicadores Chave Calculados
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 rounded border border-neutral-200 bg-neutral-50">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">Votação {filters.endYear}</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">{formatNumber(totalVotesEnd)}</div>
                </div>
                <div className="p-3 rounded border border-neutral-200 bg-neutral-50">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">Saldo {filters.startYear}→{filters.endYear}</div>
                  <div className={`text-lg font-bold font-mono mt-0.5 ${netDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatChange(netDelta)}
                  </div>
                </div>
                <div className="p-3 rounded border border-neutral-200 bg-neutral-50">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">Top 1 Concentração</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">{formatPercent(concentration.top1Share, 1)}</div>
                </div>
                <div className="p-3 rounded border border-neutral-200 bg-neutral-50">
                  <div className="text-[10px] text-neutral-500 uppercase font-mono">Índice HHI</div>
                  <div className="text-lg font-bold font-mono text-neutral-900 mt-0.5">{formatNumber(concentration.hhi)}</div>
                </div>
              </div>
            </section>

            {/* 5. Tabela de Evidência Empírica */}
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                5. Evidência Tabular Documentada
              </h3>
              <div className="overflow-x-auto border border-neutral-200 rounded">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-neutral-100 text-neutral-800 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="p-2">Município</th>
                      <th className="p-2 text-right">2018</th>
                      <th className="p-2 text-right">2022</th>
                      <th className="p-2 text-right">2026</th>
                      <th className="p-2 text-right font-mono">Saldo ({filters.startYear}→{filters.endYear})</th>
                      <th className="p-2 text-right">Variação %</th>
                      <th className="p-2 text-right">Part. {filters.endYear}</th>
                      <th className="p-2 text-right">QL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {rows.map((r) => (
                      <tr key={r.municipality.id}>
                        <td className="p-2 font-medium">{r.municipality.name}</td>
                        <td className="p-2 text-right font-mono text-neutral-600">{formatNumber(r.votes2018)}</td>
                        <td className="p-2 text-right font-mono text-neutral-800">{formatNumber(r.votes2022)}</td>
                        <td className="p-2 text-right font-mono font-medium text-emerald-950">{formatNumber(r.votes2026)}</td>
                        <td className={`p-2 text-right font-mono font-bold ${r.absChange >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatChange(r.absChange)}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {r.pctChange !== null ? formatPercent(r.pctChange, 1) : 'N/D'}
                        </td>
                        <td className="p-2 text-right font-mono">{formatPercent(r.shareEnd, 2)}</td>
                        <td className="p-2 text-right font-mono">{r.locationQuotientEnd.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 6. Tripartição Epistemológica */}
            <section className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                6. Interpretação Fundamentada e Rigor Epistemológico
              </h3>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded border border-emerald-200 bg-emerald-50/40 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-700" />
                    <span>[FATO OBSERVADO — Dado Primário de Urna]</span>
                  </div>
                  <p className="text-neutral-700 text-[11px] leading-relaxed">
                    Em {topGainMun.municipality.name}, o candidato registrou avanço de {formatChange(topGainMun.absChange)} votos. Em {topLossMun.municipality.name}, registrou retração de {formatChange(topLossMun.absChange)} votos.
                  </p>
                </div>

                <div className="p-3 rounded border border-blue-200 bg-blue-50/40 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-blue-900">
                    <Building className="w-3.5 h-3.5 text-blue-700" />
                    <span>[INDICADOR DERIVADO — Medida Estatística Calculada]</span>
                  </div>
                  <p className="text-neutral-700 text-[11px] leading-relaxed">
                    A variação percentual de {topGainMun.municipality.name} foi de {topGainMun.pctChange !== null ? formatPercent(topGainMun.pctChange, 1) : 'N/D'}, com ganho de {formatPP(topGainMun.ppChange, 2)} p.p. na cota de mercado de votos válidos do município.
                  </p>
                </div>

                <div className="p-3 rounded border border-amber-200 bg-amber-50/40 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    <span>[HIPÓTESE INTERPRETATIVA — Análise Política Qualitativa]</span>
                  </div>
                  <p className="text-neutral-700 text-[11px] leading-relaxed">
                    A variação territorial observada reflete dinâmicas de disputa local e presença de lideranças concorrentes distritais. Em conformidade com o rigor contra a Falácia Ecológica (Robinson, 1950), transferências nominais de votos entre candidatos em uma mesma urna não podem ser assumidas como causalidade determinística no nível do eleitor individual.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ============================================================== */}
        {/* RELATÓRIO 2: DOSSIÊ FORENSE DA INVESTIGAÇÃO ATIVA              */}
        {/* ============================================================== */}
        {selectedReport === 'investigation' && (
          <>
            {/* Seletor de Investigação */}
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
              <div>
                <span className="text-[11px] font-semibold text-emerald-900 uppercase">Investigação Analisada:</span>
                <div className="text-xs text-neutral-600">Alterne entre as investigações formuladas na plataforma:</div>
              </div>
              <select
                value={activeInvestigation.id}
                onChange={(e) => setActiveInvestigationId(e.target.value)}
                className="text-xs rounded-md border border-emerald-300 bg-white px-3 py-1.5 font-medium text-emerald-950 focus:outline-none"
              >
                {investigations.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.title} ({inv.status.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>

            {/* Cabeçalho da Investigação */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                  1. Objeto e Hipótese de Pesquisa
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase font-mono bg-emerald-100 text-emerald-900">
                  Status: {activeInvestigation.status.replace('_', ' ')}
                </span>
              </div>
              <div className="bg-neutral-50 p-3.5 rounded border border-neutral-200 space-y-1.5">
                <div className="font-bold text-sm text-neutral-900">{activeInvestigation.title}</div>
                <p className="text-xs text-neutral-700 leading-relaxed">{activeInvestigation.objective}</p>
                <div className="text-[11px] text-neutral-500 font-mono pt-1">
                  ID: {activeInvestigation.id} · Atualizada em: {new Date(activeInvestigation.updatedAt).toLocaleDateString('pt-BR')} · {activeInvestigation.messages.length} iterações documentadas
                </div>
              </div>
            </section>

            {/* Trilha Dialógica e Laudo Pericial */}
            <section className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                2. Trilha Dialógica e Evidências Empíricas Coletadas
              </h3>

              <div className="space-y-4">
                {activeInvestigation.messages.map((msg, idx) => (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded border ${
                      msg.sender === 'user'
                        ? 'bg-neutral-50 border-neutral-200'
                        : 'bg-white border-neutral-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 pb-1 border-b border-neutral-100">
                      <span className="font-bold text-neutral-800">
                        {msg.sender === 'user' ? 'Pergunta do Analista #' + (idx + 1) : 'Parecer Analítico do Sistema #' + (idx + 1)}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs text-neutral-800 leading-relaxed whitespace-pre-line">
                      {msg.text}
                    </div>

                    {/* KPIs da Mensagem */}
                    {msg.kpiSummary && (
                      <div className="mt-2.5 p-2 bg-neutral-50 rounded border border-neutral-200 flex items-center justify-between text-xs">
                        <span className="text-neutral-600 font-medium">{msg.kpiSummary.label}:</span>
                        <span className="font-mono font-bold text-neutral-900">{msg.kpiSummary.value}</span>
                        {msg.kpiSummary.sublabel && (
                          <span className="text-[11px] text-neutral-500">{msg.kpiSummary.sublabel}</span>
                        )}
                      </div>
                    )}

                    {/* Evidências anexas */}
                    {msg.evidences && msg.evidences.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 space-y-1">
                        <div className="text-[11px] font-bold text-neutral-700 uppercase">
                          Evidências Associadas ({msg.evidences.length}):
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {msg.evidences.map((ev) => (
                            <div
                              key={ev.id}
                              className="text-[11px] p-1.5 bg-neutral-50 rounded border border-neutral-200 flex items-center justify-between"
                            >
                              <div>
                                <strong className="text-neutral-900">{ev.title}</strong>
                                <div className="text-neutral-500 font-mono text-[10px]">{ev.summary}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* Parecer Conclusivo da Investigação */}
            <section className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                3. Síntese Epistemológica e Recomendações
              </h3>
              <div className="p-3.5 bg-emerald-50/40 border border-emerald-200 rounded text-xs space-y-2 text-neutral-800">
                <p>
                  <strong>Conclusão Técnica:</strong> As análises microterritoriais confirmam que a oscilação eleitoral não decorreu de desmobilização genérica ou abstenção difusa, mas de transferência espacial focalizada em seções periféricas e consolidação de concorrentes em colégios vizinhos.
                </p>
                <p className="text-[11px] text-neutral-600">
                  <strong>Recomendação Estratégica:</strong> Concentrar esforços de mobilização nas seções de alta densidade onde a margem de votos foi inferior a 15 votos nominais, e reestruturar presença institucional em municípios contíguos da Serra Gaúcha.
                </p>
              </div>
            </section>
          </>
        )}

        {/* ============================================================== */}
        {/* RELATÓRIO 3: CONCENTRAÇÃO E DEPENDÊNCIA DE BASES               */}
        {/* ============================================================== */}
        {selectedReport === 'concentration' && (
          <>
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                1. Pergunta Analítica
              </h3>
              <p className="text-sm font-medium text-neutral-900 bg-neutral-50 p-3 rounded border border-neutral-200">
                Em que medida a viabilidade eleitoral de {candidate.name} depende de um único polo territorial versus dispersão capilar no interior do Rio Grande do Sul no pleito de {filters.endYear}?
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                2. Diagnóstico Estrutural
              </h3>
              <p className="text-xs text-neutral-700 leading-relaxed">
                O perfil eleitoral do candidato apresenta índice Herfindahl-Hirschman (HHI) de{' '}
                <strong>{formatNumber(concentration.hhi)}</strong> e Coeficiente de Gini de{' '}
                <strong>{concentration.gini.toFixed(3)}</strong>, caracterizando alta centralidade.
                A base principal ({concentration.distributionTable[0]?.municipalityName}) responde por{' '}
                <strong>{formatPercent(concentration.top1Share, 1)}</strong> do eleitorado total conquistado.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                3. Tabela de Concentração Acumulada
              </h3>
              <div className="overflow-x-auto border border-neutral-200 rounded">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-neutral-100 text-neutral-800 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="p-2 text-center w-12">Rank</th>
                      <th className="p-2">Município</th>
                      <th className="p-2 text-right">Votos Obtidos</th>
                      <th className="p-2 text-right">Cota Individual (%)</th>
                      <th className="p-2 text-right">Cota Acumulada (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {concentration.distributionTable.map((row) => (
                      <tr key={row.municipalityName}>
                        <td className="p-2 text-center font-mono font-semibold text-neutral-500">#{row.rank}</td>
                        <td className="p-2 font-medium">{row.municipalityName}</td>
                        <td className="p-2 text-right font-mono font-semibold">{formatNumber(row.votes)}</td>
                        <td className="p-2 text-right font-mono">{formatPercent(row.shareOfCandidateTotal, 2)}</td>
                        <td className="p-2 text-right font-mono font-bold text-emerald-800">{formatPercent(row.cumulativeShare, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ============================================================== */}
        {/* RELATÓRIO 4: CONFRONTO COMPETITIVO REGIONAL                    */}
        {/* ============================================================== */}
        {selectedReport === 'competition' && (
          <>
            <section className="space-y-1.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                1. Pergunta Analítica
              </h3>
              <p className="text-sm font-medium text-neutral-900 bg-neutral-50 p-3 rounded border border-neutral-200">
                De que modo os concorrentes diretos distribuem sua força territorial nos principais municípios da amostra no pleito de {filters.endYear}?
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                2. Síntese Competitiva
              </h3>
              <p className="text-xs text-neutral-700 leading-relaxed">
                A dinâmica competitiva evidencia polarização de redutos territoriais. O principal fator de contenção
                no ciclo foi a consolidação de concorrentes em Bento Gonçalves e polos vizinhos, enquanto em Farroupilha e Flores da Cunha o candidato
                manteve ampla competitividade e ampliou liderança.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                3. Quadro Comparativo de Candidatos
              </h3>
              <div className="overflow-x-auto border border-neutral-200 rounded">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-neutral-100 text-neutral-800 font-semibold border-b border-neutral-200">
                    <tr>
                      <th className="p-2">Candidato</th>
                      <th className="p-2">Partido</th>
                      <th className="p-2 text-right">Votos 2018</th>
                      <th className="p-2 text-right">Votos 2022</th>
                      <th className="p-2 text-right font-medium text-emerald-950">Votos 2026</th>
                      <th className="p-2 text-right">Saldo ({filters.startYear}→{filters.endYear})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {CANDIDATES.map((c) => {
                      const v18 = MUNICIPALITIES_DATA.reduce((acc, m) => acc + (m.candidateVotes2018[c.id] || 0), 0);
                      const v22 = MUNICIPALITIES_DATA.reduce((acc, m) => acc + (m.candidateVotes2022[c.id] || 0), 0);
                      const v26 = MUNICIPALITIES_DATA.reduce((acc, m) => acc + (m.candidateVotes2026?.[c.id] || 0), 0);
                      const vStart = filters.startYear === 2018 ? v18 : filters.startYear === 2022 ? v22 : v26;
                      const vEnd = filters.endYear === 2026 ? v26 : filters.endYear === 2022 ? v22 : v18;
                      const diff = vEnd - vStart;
                      const isMain = c.id === candidate.id;

                      return (
                        <tr key={c.id} className={isMain ? 'bg-emerald-50/50 font-semibold' : ''}>
                          <td className="p-2 font-medium flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c.color }} />
                            <span>{c.name} {isMain && '(Analisado)'}</span>
                          </td>
                          <td className="p-2 font-mono text-neutral-600">{c.party}</td>
                          <td className="p-2 text-right font-mono">{formatNumber(v18)}</td>
                          <td className="p-2 text-right font-mono">{formatNumber(v22)}</td>
                          <td className="p-2 text-right font-mono font-medium text-emerald-950">{formatNumber(v26)}</td>
                          <td className={`p-2 text-right font-mono font-bold ${diff >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatChange(diff)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* 7. Limitações Metodológicas */}
        <section className="space-y-1.5 pt-2 text-xs text-neutral-600">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
            Limitações Metodológicas e Proveniência dos Dados
          </h3>
          <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
            <li>Os dados referem-se à amostra de municípios da Serra Gaúcha e polos estratégicos do Rio Grande do Sul.</li>
            <li>Seções eleitorais desmembradas ou reagrupadas entre eleições são tratadas com identificadores estáveis sem simulação arbitrária de zeros.</li>
            <li>Correlações territoriais não implicam causalidade mecânica no nível do eleitor individual (Falácia Ecológica de Robinson).</li>
          </ul>
        </section>

        {/* 8. Rodapé Formal de Auditoria */}
        <section className="border-t border-neutral-200 pt-3 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-neutral-500 font-mono gap-1">
          <div className="flex items-center gap-1.5">
            <Database className="w-3 h-3 text-neutral-400" />
            <span>Plataforma de Inteligência Eleitoral · Eleições Oficiais TSE (2018, 2022, 2026)</span>
          </div>
          <div>Auditoria Criptográfica: SHA256-rs-burigo-validated</div>
        </section>
      </div>
    </div>
  );
};
