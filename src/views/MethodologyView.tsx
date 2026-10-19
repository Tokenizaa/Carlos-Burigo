import React from 'react';
import {
  BookOpen,
  Calculator,
  ShieldAlert,
  HelpCircle,
  FileCode,
  Scale,
} from 'lucide-react';

export const MethodologyView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabeçalho */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="text-xs text-neutral-500 font-medium">Fundamentação Científica e Métodos</div>
        <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
          Manual Metodológico e Procedimentos Analíticos
        </h2>
        <p className="text-xs text-neutral-600 mt-0.5">
          Definições matemáticas, procedimentos de cálculo, hipóteses teóricas e limites epistemológicos da plataforma.
        </p>
      </div>

      {/* 1. Variação Absoluta vs Variação Percentual vs Pontos Percentuais */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Calculator className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-neutral-900">
            01. Dinâmica Temporal: As Três Grandezas de Variação
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 rounded border border-neutral-200 bg-neutral-50/50 space-y-2">
            <div className="font-bold text-neutral-900">Variação Absoluta (Δ Votos)</div>
            <div className="font-mono text-neutral-600 text-[11px] bg-white p-1.5 rounded border border-neutral-200">
              Δ = V_final − V_inicial
            </div>
            <p className="text-neutral-600 text-[11px] leading-relaxed">
              <strong>Pergunta:</strong> Quantos eleitores nominais a mais ou a menos o candidato mobilizou?
            </p>
            <p className="text-neutral-500 text-[11px]">
              <strong>Limitação:</strong> Não pondera pelo crescimento do eleitorado ou tamanho do município.
            </p>
          </div>

          <div className="p-3.5 rounded border border-neutral-200 bg-neutral-50/50 space-y-2">
            <div className="font-bold text-neutral-900">Variação Percentual (%)</div>
            <div className="font-mono text-neutral-600 text-[11px] bg-white p-1.5 rounded border border-neutral-200">
              % = ((V_final − V_inicial) / V_inicial) × 100
            </div>
            <p className="text-neutral-600 text-[11px] leading-relaxed">
              <strong>Pergunta:</strong> Qual foi a taxa de expansão do candidato sobre sua própria base pretérita?
            </p>
            <p className="text-neutral-500 text-[11px]">
              <strong>Limitação:</strong> Bases pequenas geram percentuais inflados (ex: ir de 2 para 6 votos é +200%). Indefinido quando V_inicial = 0.
            </p>
          </div>

          <div className="p-3.5 rounded border border-neutral-200 bg-neutral-50/50 space-y-2">
            <div className="font-bold text-neutral-900">Pontos Percentuais (p.p.)</div>
            <div className="font-mono text-neutral-600 text-[11px] bg-white p-1.5 rounded border border-neutral-200">
              Δpp = Part_final − Part_inicial
            </div>
            <p className="text-neutral-600 text-[11px] leading-relaxed">
              <strong>Pergunta:</strong> Quanto o candidato avançou na fatia de mercado de votos válidos do território?
            </p>
            <p className="text-neutral-500 text-[11px]">
              <strong>Vantagem:</strong> Neutraliza flutuações de abstenção e crescimento populacional entre eleições.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Quociente de Localização (QL) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Scale className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-neutral-900">
            02. Quociente de Localização (QL) / Desempenho Relativo
          </h3>
        </div>

        <div className="text-xs text-neutral-700 space-y-2 leading-relaxed">
          <p>
            O Quociente de Localização espacial mede o grau de <strong>especialização territorial</strong> da votação do candidato:
          </p>
          <div className="font-mono text-neutral-800 text-xs bg-neutral-50 p-2.5 rounded border border-neutral-200">
            QL_m = (Votos_cand,m / Válidos_m) / (Votos_cand,total / Válidos_total)
          </div>
          <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-600">
            <li><strong>QL &gt; 1,0:</strong> Território de sobre-representação. O candidato tem penetração local acima da sua média geral no estado.</li>
            <li><strong>QL = 1,0:</strong> Território neutro. Penetração perfeitamente proporcional à média estadual.</li>
            <li><strong>QL &lt; 1,0:</strong> Território de sub-representação. O candidato tem desempenho relativo fraco no local.</li>
          </ul>
        </div>
      </div>

      {/* 3. Índice Herfindahl-Hirschman (HHI) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Calculator className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-neutral-900">
            03. Índice Herfindahl-Hirschman (HHI)
          </h3>
        </div>

        <div className="text-xs text-neutral-700 space-y-2 leading-relaxed">
          <p>
            Adaptado da economia industrial para a geografia eleitoral, o HHI mensura a dispersão versus concentração dos votos nas unidades territoriais da candidatura:
          </p>
          <div className="font-mono text-neutral-800 text-xs bg-neutral-50 p-2.5 rounded border border-neutral-200">
            {'HHI = Σ (s_m)², onde s_m = (Votos_cand,m / Votos_cand,total) × 100'}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-[11px]">
            <div className="p-2.5 rounded border border-neutral-200">
              <strong>HHI &lt; 1.500:</strong> Baixa concentração (Votação difusa e pulverizada em múltiplos municípios).
            </div>
            <div className="p-2.5 rounded border border-neutral-200">
              <strong>1.500 ≤ HHI ≤ 2.500:</strong> Concentração moderada (Base equilibrada com alguns polos de sustentação).
            </div>
            <div className="p-2.5 rounded border border-neutral-200">
              <strong>HHI &gt; 2.500:</strong> Alta concentração (Forte dependência de 1 ou 2 municípios para viabilidade eleitoral).
            </div>
          </div>
        </div>
      </div>

      {/* 4. Curva de Lorenz e Coeficiente de Gini */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <Scale className="w-4 h-4 text-emerald-700" />
          <h3 className="text-sm font-bold text-neutral-900">
            04. Curva de Lorenz e Coeficiente de Gini Territorial
          </h3>
        </div>

        <div className="text-xs text-neutral-700 space-y-2 leading-relaxed">
          <p>
            A <strong>Curva de Lorenz</strong> confronta a proporção acumulada de municípios da amostra (ordenados crescentemente pelo volume de votos) contra a proporção acumulada de votos recebidos pelo candidato.
          </p>
          <p>
            O <strong>Coeficiente de Gini</strong> corresponde à razão entre a área compreendida entre a linha de perfeita igualdade (45 graus) e a Curva de Lorenz, variando de 0 (perfeita homogeneidade entre municípios) a 1 (todos os votos em uma única cidade).
          </p>
          <div className="font-mono text-neutral-800 text-xs bg-neutral-50 p-2.5 rounded border border-neutral-200">
            {'G = [2 · Σ (i · y_i)] / [n · Σ y_i] − (n + 1) / n'}
          </div>
        </div>
      </div>

      {/* 5. A Falácia Ecológica (Robinson, 1950) */}
      <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-5 shadow-xs space-y-2.5 text-xs text-rose-950">
        <div className="flex items-center gap-2 font-bold text-rose-900">
          <ShieldAlert className="w-4 h-4 text-rose-700" />
          <span>05. A Falácia Ecológica e Limites de Inferência de Voto Individual</span>
        </div>
        <p className="leading-relaxed text-[11px] text-rose-900/90">
          Um dos erros mais comuns em consultoria eleitoral é afirmar que a queda de votos de um candidato em determinado bairro ou município transferiu-se diretamente para o candidato concorrente que cresceu no mesmo local.
        </p>
        <p className="leading-relaxed text-[11px] text-rose-900/90">
          Conforme demonstrado pelo estatístico <strong>William S. Robinson (1950)</strong>, correlações agregadas em nível territorial não implicam correlações no nível do eleitor individual. Dados oficiais de urna preservam o sigilo do voto e não permitem rastrear eleitores específicos entre eleições. Toda interpretação de migração eleitoral deve ser explicitada como hipótese interpretativa, e nunca como fato empírico observado.
        </p>
      </div>

      {/* 6. Tratamento de Ausência de Dados (N/D vs Zero) */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-neutral-100 pb-3">
          <FileCode className="w-4 h-4 text-neutral-700" />
          <h3 className="text-sm font-bold text-neutral-900">
            06. Tratamento Rigoroso de Ausência de Dados: N/D vs Zero
          </h3>
        </div>

        <div className="text-xs text-neutral-700 space-y-2 leading-relaxed">
          <p>
            Seções eleitorais são frequentemente desmembradas, extintas, unificadas ou transferidas pela Justiça Eleitoral entre um pleito e outro.
          </p>
          <p className="text-[11px] text-neutral-600">
            Substituir a inexistência de uma seção em 2018 pelo algarismo zero geraria um falso crescimento absoluto e uma taxa de variação de $+ \infty\%$, corrompendo as médias territoriais. A plataforma trata a inexistência de histórico explicitamente como <strong>N/D (Não Disponível)</strong> e isola essas ocorrências dos cálculos de variação longitudinal.
          </p>
        </div>
      </div>

      {/* 7. Nota sobre Autocorrelação Espacial (Moran's I e LISA) */}
      <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200 text-xs text-neutral-600 space-y-1.5">
        <div className="font-semibold text-neutral-800">
          07. Nota sobre Autocorrelação Espacial (Moran's I e LISA)
        </div>
        <p className="text-[11px] leading-relaxed">
          Indicadores de autocorrelação espacial global (Moran's I) e local (LISA) exigem a especificação de uma matriz contígua e formal de vizinhança espacial (Queen/Rook de ordem 1 ou distâncias geodésicas k-nearest-neighbors). Em conformidade com as diretrizes de integridade, índices de Moran não são simulados de forma fictícia ou aproximada; são implementados apenas quando geometrias georreferenciadas oficiais contíguas estiverem integralmente acopladas.
        </p>
      </div>
    </div>
  );
};
