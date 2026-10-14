import React, { useState } from 'react';
import {
  PieChart,
  HelpCircle,
  TrendingUp,
  Info,
  Scale,
  Activity,
  Calendar,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import {
  calcConcentration,
  formatNumber,
  formatPercent,
  formatDecimal,
  filterMunicipalities,
} from '../utils/electoralMath';
import { ElectionYear } from '../types/election';

export const ConcentrationView: React.FC = () => {
  const { filters } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA } = useElectionData();
  const [selectedYear, setSelectedYear] = useState<ElectionYear>(filters.endYear || 2026);
  const candidate = CANDIDATES.find((c) => c.id === filters.mainCandidateId) || CANDIDATES[0];

  const filteredMuns = filterMunicipalities(MUNICIPALITIES_DATA, filters, candidate.id);
  const activeMuns = filteredMuns.length > 0 ? filteredMuns : MUNICIPALITIES_DATA;

  const compareYear: ElectionYear = selectedYear === 2026 ? 2022 : selectedYear === 2022 ? 2018 : 2018;

  const currentConcentration = calcConcentration(activeMuns, candidate.id, selectedYear);
  const previousConcentration = calcConcentration(activeMuns, candidate.id, compareYear);

  const {
    totalCandidateVotes,
    top1Share,
    top3Share,
    top5Share,
    top10Share,
    hhi,
    hhiClassification,
    gini,
    lorenzPoints,
    distributionTable,
  } = currentConcentration;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-neutral-100">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Estatística Espacial Descritiva</div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Análise de Concentração Territorial dos Votos (Eleição {selectedYear})
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Avaliação do grau de dispersão vs centralização espacial da votação de {candidate.name}.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Pleito para Concentração */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md text-xs">
              <span className="text-[11px] text-neutral-500 font-medium px-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-neutral-400" />
                Pleito:
              </span>
              {([2018, 2022, 2026] as ElectionYear[]).map((yr) => (
                <button
                  key={yr}
                  onClick={() => setSelectedYear(yr)}
                  className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                    selectedYear === yr
                      ? 'bg-white text-emerald-900 font-bold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {yr}
                </button>
              ))}
            </div>

            <div className="text-xs text-neutral-500 font-mono">
              Universo: {formatNumber(totalCandidateVotes)} votos em {distributionTable.length} municípios
            </div>
          </div>
        </div>

        {/* Indicadores Top-K e HHI */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Top 1 Município (Base)</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatPercent(top1Share, 1)}
            </div>
            <div className="text-[11px] text-neutral-500 truncate">
              {distributionTable[0]?.municipalityName}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Top 3 Municípios</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatPercent(top3Share, 1)}
            </div>
            <div className="text-[11px] text-neutral-500">
              dos votos do candidato
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Top 5 Municípios</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatPercent(top5Share, 1)}
            </div>
            <div className="text-[11px] text-neutral-500">
              dos votos do candidato
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Top 10 Municípios</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatPercent(top10Share, 1)}
            </div>
            <div className="text-[11px] text-neutral-500">
              cobertura total amostral
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Índice HHI (0–10.000)</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatNumber(hhi)}
            </div>
            <div className="text-[11px] text-neutral-500">
              ({formatNumber(previousConcentration.hhi)} em {compareYear})
            </div>
          </div>

          <div>
            <div className="text-[11px] text-neutral-500 font-medium">Coeficiente de Gini</div>
            <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
              {formatDecimal(gini, 3)}
            </div>
            <div className="text-[11px] text-neutral-500">
              ({formatDecimal(previousConcentration.gini, 3)} em {compareYear})
            </div>
          </div>
        </div>
      </div>

      {/* Seção Gráfica: Curva de Lorenz Interativa e Régua HHI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico 1: Curva de Lorenz */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">
                Curva de Lorenz Territorial
              </h3>
              <p className="text-xs text-neutral-500">
                Distribuição acumulada de municípios (% ordenados crescentemente) vs % acumulada de votos.
              </p>
            </div>
            <Activity className="w-4 h-4 text-neutral-400" />
          </div>

          {/* SVG Lorenz Curve */}
          <div className="h-64 pt-4 pb-2 px-4 flex items-center justify-center">
            <svg viewBox="0 0 300 240" className="w-full h-full max-w-sm overflow-visible">
              {/* Eixos */}
              <line x1="40" y1="20" x2="40" y2="200" stroke="#d4d4d4" strokeWidth="1" />
              <line x1="40" y1="200" x2="280" y2="200" stroke="#d4d4d4" strokeWidth="1" />

              {/* Linha de Perfeita Igualdade (45 graus) */}
              <line
                x1="40"
                y1="200"
                x2="280"
                y2="20"
                stroke="#9ca3af"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />

              {/* Polígono de Desigualdade (Área entre linha de 45° e Curva) */}
              {(() => {
                const mapX = (pct: number) => 40 + (pct / 100) * 240;
                const mapY = (pct: number) => 200 - (pct / 100) * 180;

                const pathPoints = lorenzPoints.map((pt) => `${mapX(pt.cumTerritoriesPct)},${mapY(pt.cumVotesPct)}`);
                const pathString = `M ${pathPoints.join(' L ')}`;

                return (
                  <>
                    <path
                      d={`${pathString} L 280,200 L 40,200 Z`}
                      fill="#ecfdf5"
                      opacity="0.8"
                    />
                    <path
                      d={pathString}
                      fill="none"
                      stroke="#047857"
                      strokeWidth="2.5"
                    />
                    {/* Pontos calculados */}
                    {lorenzPoints.map((pt, i) => (
                      <circle
                        key={i}
                        cx={mapX(pt.cumTerritoriesPct)}
                        cy={mapY(pt.cumVotesPct)}
                        r="3.5"
                        fill="#047857"
                        stroke="#ffffff"
                        strokeWidth="1"
                      >
                        <title>{`${pt.municipalityName}: ${formatPercent(pt.cumTerritoriesPct, 1)} territórios → ${formatPercent(pt.cumVotesPct, 1)} votos acumulados`}</title>
                      </circle>
                    ))}
                  </>
                );
              })()}

              {/* Rótulos dos eixos */}
              <text x="40" y="215" textAnchor="middle" className="text-[9px] fill-neutral-500 font-mono">0%</text>
              <text x="280" y="215" textAnchor="middle" className="text-[9px] fill-neutral-500 font-mono">100%</text>
              <text x="30" y="200" textAnchor="end" className="text-[9px] fill-neutral-500 font-mono">0%</text>
              <text x="30" y="25" textAnchor="end" className="text-[9px] fill-neutral-500 font-mono">100%</text>
              <text x="160" y="232" textAnchor="middle" className="text-[10px] fill-neutral-700 font-medium">
                % Acumulada de Municípios
              </text>
            </svg>
          </div>

          <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-neutral-400 inline-block border-b border-dashed" />
              Linha de perfeita igualdade (45°)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <span className="w-3 h-1 bg-emerald-700 inline-block rounded" />
              Curva de Lorenz (Gini = {formatDecimal(gini, 3)})
            </span>
          </div>
        </div>

        {/* Diagnóstico HHI & Interpretação de Faixas */}
        <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Régua e Interpretação do Índice HHI
                </h3>
                <p className="text-xs text-neutral-500">
                  Herfindahl-Hirschman Index calculado sobre as cotas territoriais dos votos.
                </p>
              </div>
              <Scale className="w-4 h-4 text-neutral-400" />
            </div>

            {/* Marcador Visual do HHI */}
            <div className="my-6 space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>0</span>
                <span>1.500 (Baixa)</span>
                <span>2.500 (Moderada)</span>
                <span>10.000 (Monopólio)</span>
              </div>
              <div className="h-4 bg-neutral-100 rounded-md overflow-hidden flex relative">
                {/* Zona 1: Baixa */}
                <div className="h-full bg-emerald-200/80 w-[15%]" />
                {/* Zona 2: Moderada */}
                <div className="h-full bg-amber-200/80 w-[10%]" />
                {/* Zona 3: Alta */}
                <div className="h-full bg-rose-200/80 w-[75%]" />

                {/* Ponteiro atual */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-neutral-900 z-10 -ml-0.5"
                  style={{ left: `${Math.min(100, (hhi / 10000) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-neutral-500">
                <span>Disperso / Capilar</span>
                <span className="font-mono font-bold text-neutral-900">
                  HHI Atual: {formatNumber(hhi)} ({hhiClassification})
                </span>
                <span>Altamente Concentrado</span>
              </div>
            </div>

            {/* Explicação Técnica */}
            <div className="space-y-2.5 text-xs text-neutral-600 bg-neutral-50 p-3.5 rounded border border-neutral-200">
              <div className="font-semibold text-neutral-800">
                O que indica o HHI de {formatNumber(hhi)} para {candidate.name}?
              </div>
              <p className="text-[11px] leading-relaxed">
                O valor superior a 2.500 pontos reflete uma <strong>estrutura de alta dependência territorial</strong>. O candidato possui seu epicentro decisivo em Caxias do Sul (que sozinha abrange mais de 65% do seu contingente total de votos).
              </p>
              <p className="text-[11px] leading-relaxed">
                Em termos eleitorais, uma base hiperconcentrada assegura votação maciça com custo logístico concentrado, porém expõe a candidatura a riscos desproporcionais caso haja retração no reduto principal.
              </p>
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-neutral-100 text-[11px] text-neutral-500">
            {'Fórmula: HHI = Σ (s_m)², onde s_m é a participação percentual do município m no total de votos do candidato.'}
          </div>
        </div>
      </div>

      {/* Tabela de Distribuição Territorial Ordenada */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              Tabela de Concentração e Participação Acumulada ({selectedYear})
            </h3>
            <p className="text-xs text-neutral-500">
              Municípios ordenados por volume de votação decrescente com cálculo de cota individual e acumulada.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200 rounded-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-neutral-50 text-neutral-700 border-b border-neutral-200">
              <tr>
                <th className="py-2.5 px-3 font-semibold text-center w-12">Rank</th>
                <th className="py-2.5 px-3 font-semibold">Município</th>
                <th className="py-2.5 px-3 font-semibold text-right">Votos Obtidos</th>
                <th className="py-2.5 px-3 font-semibold text-right">Cota Individual (%)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Participação Acumulada (%)</th>
                <th className="py-2.5 px-3 font-semibold">Representação Gráfica</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white">
              {distributionTable.map((row) => (
                <tr key={row.municipalityName} className="hover:bg-neutral-50">
                  <td className="py-2.5 px-3 text-center font-mono font-semibold text-neutral-500">
                    #{row.rank}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-neutral-900">
                    {row.municipalityName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-neutral-900">
                    {formatNumber(row.votes)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-neutral-700">
                    {formatPercent(row.shareOfCandidateTotal, 2)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                    {formatPercent(row.cumulativeShare, 2)}
                  </td>
                  <td className="py-2.5 px-3 w-48">
                    <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-800 rounded-full transition-all"
                        style={{ width: `${Math.min(100, row.shareOfCandidateTotal)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota Metodológica de Neutralidade */}
      <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 text-xs text-neutral-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-neutral-800">
            Princípio da Neutralidade Descritiva
          </div>
          <p className="text-[11px] leading-relaxed">
            Indicadores estatísticos de concentração (HHI, Lorenz e Gini) têm valor estritamente <strong>descritivo</strong>. Uma candidatura altamente concentrada não é inerentemente "melhor" ou "pior" do que uma candidatura dispersa. Candidatos regionais/distritais tendem a apresentar alto HHI por desenho estratégico (maximizar quociente eleitoral com menos dispersão de campanha), enquanto candidatos de causas difusas ou figuras estaduais majoritárias apresentam baixo HHI.
          </p>
        </div>
      </div>
    </div>
  );
};
