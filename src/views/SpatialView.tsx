import React, { useState } from 'react';
import {
  MapPin,
  Layers,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Info,
  Maximize2,
  Compass,
  Map as MapIcon,
  Calendar,
} from 'lucide-react';
import { useFilter } from '../context/FilterContext';
import { useElectionData } from '../hooks/useElectionData';
import {
  computeMunicipalityMetrics,
  formatNumber,
  formatPercent,
  formatPP,
  formatChange,
} from '../utils/electoralMath';
import { ElectoralMapLeaflet, MapMetricType } from '../components/ElectoralMapLeaflet';

export const SpatialView: React.FC = () => {
  const { filters, setFilters, setActiveTab, setSelectedMunicipalityForDetail } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA, sections: RAW_SECTIONS, geo: MUNICIPALITIES_GEO } = useElectionData();
  const [selectedMunId, setSelectedMunId] = useState<string>('caxias_do_sul');
  const [mapEngine, setMapEngine] = useState<'leaflet' | 'vector'>('leaflet');

  const candidate = CANDIDATES.find((c) => c.id === filters.mainCandidateId) || CANDIDATES[0];
  const rows = computeMunicipalityMetrics(
    MUNICIPALITIES_DATA,
    candidate.id,
    filters.startYear,
    filters.endYear
  );

  const selectedRow = rows.find((r) => r.municipality.id === selectedMunId) || rows[0];
  const selectedSections = RAW_SECTIONS.filter((s) => s.municipalityId === selectedRow.municipality.id);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-neutral-100">
          <div>
            <div className="text-xs text-neutral-500 font-medium">Cartografia e Inteligência Geoespacial</div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Análise Espacial Integrada da Votação de {candidate.name}
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">
              Visualização coroplética municipal e dispersão de locais de votação com mapa interativo (CartoDB / OpenStreetMap).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Seletor Rápido de Ciclos */}
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

            {/* Alternador de Motor Cartográfico (Leaflet GIS vs Vetor Sintético) */}
            <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-md text-xs self-start md:self-auto">
              <button
                onClick={() => setMapEngine('leaflet')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                  mapEngine === 'leaflet'
                    ? 'bg-white text-emerald-900 font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mapa Leaflet / GIS</span>
              </button>
              <button
                onClick={() => setMapEngine('vector')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                  mapEngine === 'vector'
                    ? 'bg-white text-neutral-900 font-bold shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 text-neutral-600" />
                <span>Malha Esquemática</span>
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-neutral-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            Território em foco no inspetor:{' '}
            <strong className="text-neutral-900 font-bold">{selectedRow.municipality.name}</strong> ({selectedRow.municipality.region})
          </span>
          <span className="text-[11px] text-neutral-500 font-mono">
            {selectedSections.length} locais de votação mapeados nesta cidade
          </span>
        </div>
      </div>

      {/* Grid: Mapa Leaflet Principal + Painel Inspetor Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lado Esquerdo: O Mapa Interativo */}
        <div className="lg:col-span-8 space-y-4">
          {mapEngine === 'leaflet' ? (
            <ElectoralMapLeaflet
              candidateId={candidate.id}
              selectedMunicipalityId={selectedMunId}
              onSelectMunicipality={(id) => setSelectedMunId(id)}
              heightClass="h-[520px]"
              initialMetric="votes"
            />
          ) : (
            /* Malha Esquemática Vetorial Alternativa */
            <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 text-xs text-neutral-600">
                <span className="font-semibold text-neutral-900">Malha Esquemática Topológica</span>
                <span>Clique em qualquer município para inspecionar</span>
              </div>
              <div className="w-full aspect-4/3 max-h-[460px] bg-neutral-50 rounded border border-neutral-100 flex items-center justify-center p-4">
                <svg viewBox="0 0 560 500" className="w-full h-full select-none">
                  {Object.values(MUNICIPALITIES_GEO).map((geo) => {
                    const isSelected = selectedMunId === geo.id;
                    const r = rows.find((x) => x.municipality.id === geo.id);
                    const isPositive = (r?.absChange || 0) >= 0;
                    const fillColor = geo.id === 'caxias_do_sul' ? '#064e3b' : isPositive ? '#047857' : '#be123c';

                    return (
                      <g key={geo.id}>
                        <path
                          d={geo.svgPath}
                          fill={fillColor}
                          stroke={isSelected ? '#000000' : '#ffffff'}
                          strokeWidth={isSelected ? 3 : 1.5}
                          className="cursor-pointer transition-opacity hover:opacity-85"
                          onClick={() => setSelectedMunId(geo.id)}
                        />
                        <text
                          x={geo.center[0]}
                          y={geo.center[1]}
                          textAnchor="middle"
                          className="text-[10px] font-semibold fill-white pointer-events-none"
                        >
                          {geo.name}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: Inspetor de Território Selecionado */}
        <div className="lg:col-span-4 bg-white border border-neutral-200 rounded-lg p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-neutral-100 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-neutral-500 font-medium">Inspetor Territorial</div>
              <h3 className="text-base font-bold text-neutral-900">{selectedRow.municipality.name}</h3>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-800">
              #{selectedRow.rank2022} no Ranking
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Região Geográfica:</span>
              <strong className="text-neutral-900">{selectedRow.municipality.region}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Votos em 2018:</span>
              <strong className="font-mono text-neutral-700">{formatNumber(selectedRow.votes2018)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Votos em 2022:</span>
              <strong className="font-mono text-neutral-900">{formatNumber(selectedRow.votes2022)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Votos em 2026:</span>
              <strong className="font-mono text-emerald-900">{formatNumber(selectedRow.votes2026)}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Saldo ({filters.startYear}→{filters.endYear}):</span>
              <strong
                className={`font-mono ${
                  selectedRow.absChange >= 0 ? 'text-emerald-700' : 'text-rose-700'
                }`}
              >
                {formatChange(selectedRow.absChange)} ({selectedRow.pctChange !== null ? formatPercent(selectedRow.pctChange, 1) : 'N/D'})
              </strong>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Participação {filters.endYear}:</span>
              <strong className="font-mono text-neutral-900">
                {formatPercent(selectedRow.shareEnd, 2)} ({formatPP(selectedRow.ppChange, 2)})
              </strong>
            </div>
            <div className="flex justify-between py-1 border-b border-neutral-50">
              <span className="text-neutral-500">Quociente de Localização (QL):</span>
              <strong className="font-mono text-neutral-900">
                {selectedRow.locationQuotient2022.toFixed(2)}
              </strong>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-neutral-500">Dinâmica Observada:</span>
              <strong className="text-neutral-900">{selectedRow.classification}</strong>
            </div>
          </div>

          {/* Amostra de Locais de Votação deste Município */}
          <div className="pt-2 border-t border-neutral-100 space-y-2">
            <div className="text-[11px] font-semibold text-neutral-700 uppercase tracking-wider">
              Locais de Votação Mapeados ({selectedSections.length})
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {selectedSections.map((s) => (
                <div
                  key={s.sectionId}
                  className="p-2 rounded bg-neutral-50 text-[11px] border border-neutral-100 flex items-center justify-between"
                >
                  <div className="truncate mr-2">
                    <div className="font-medium text-neutral-900 truncate">{s.locationName}</div>
                    <div className="text-neutral-500 text-[10px]">Seção {s.sectionId} · {s.neighborhood}</div>
                  </div>
                  <span className="font-mono font-bold text-neutral-900 shrink-0">
                    {s.votes2022?.votes[candidate.id] || 'N/D'} v
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                setSelectedMunicipalityForDetail(selectedRow.municipality.id);
                setActiveTab('territorial');
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-md transition-colors"
            >
              <span>Abrir Dossiê Territorial Completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Nota Metodológica */}
      <div className="p-3.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed">
          <strong>Arquitetura Geoespacial:</strong> O mapa utiliza coordenadas geográficas reais de escolas, colégios e pavilhões eleitorais da Serra Gaúcha e Rio Grande do Sul (base OpenStreetMap / CartoDB). Os polígonos representam aproximações temáticas de fronteiras municipais para fins de visualização de inteligência de campanha.
        </p>
      </div>
    </div>
  );
};
