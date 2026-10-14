import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useElectionData } from '../hooks/useElectionData';
import { getSectionCoordinates } from '../data/municipalityGeo';
import {
  computeMunicipalityMetrics,
  formatNumber,
  formatPercent,
  formatPP,
  formatChange,
} from '../utils/electoralMath';
import { useFilter } from '../context/FilterContext';
import { ElectionYear } from '../types/election';
import { Layers, ZoomIn, ZoomOut, RotateCcw, MapPin } from 'lucide-react';

export type MapMetricType = 'votes' | 'share' | 'change' | 'concentration' | 'lq';

interface ElectoralMapLeafletProps {
  candidateId: string;
  selectedMunicipalityId?: string | null;
  onSelectMunicipality?: (id: string) => void;
  heightClass?: string;
  initialMetric?: MapMetricType;
  showControlsBar?: boolean;
  startYear?: ElectionYear;
  endYear?: ElectionYear;
}

export const ElectoralMapLeaflet: React.FC<ElectoralMapLeafletProps> = ({
  candidateId,
  selectedMunicipalityId,
  onSelectMunicipality,
  heightClass = 'h-[500px]',
  initialMetric = 'votes',
  showControlsBar = true,
  startYear: propStartYear,
  endYear: propEndYear,
}) => {
  const { filters } = useFilter();
  const { candidates: CANDIDATES, municipalities: MUNICIPALITIES_DATA, sections: RAW_SECTIONS, geo: MUNICIPALITIES_GEO } = useElectionData();
  const startYear = propStartYear || filters.startYear;
  const endYear = propEndYear || filters.endYear;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markersLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [metric, setMetric] = useState<MapMetricType>(initialMetric);
  const [showPolygons, setShowPolygons] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);

  const candidate = CANDIDATES.find((c) => c.id === candidateId) || CANDIDATES[0];
  const rows = computeMunicipalityMetrics(MUNICIPALITIES_DATA, candidate.id, startYear, endYear);
  const totalCandidateVotes = rows.reduce((acc, r) => acc + r.votesEnd, 0);

  // Determinar cor do polígono conforme a métrica
  const getMetricColor = (munId: string): string => {
    const r = rows.find((x) => x.municipality.id === munId);
    if (!r) return '#9ca3af';

    switch (metric) {
      case 'votes': {
        if (r.votesEnd >= 15000) return '#064e3b';
        if (r.votesEnd >= 3000) return '#047857';
        if (r.votesEnd >= 1000) return '#10b981';
        if (r.votesEnd >= 400) return '#6ee7b7';
        return '#d1fae5';
      }
      case 'share': {
        if (r.shareEnd >= 10) return '#064e3b';
        if (r.shareEnd >= 6) return '#047857';
        if (r.shareEnd >= 3) return '#10b981';
        if (r.shareEnd >= 1) return '#6ee7b7';
        return '#d1fae5';
      }
      case 'change': {
        if (r.absChange >= 500) return '#047857';
        if (r.absChange > 0) return '#10b981';
        if (r.absChange === 0) return '#9ca3af';
        if (r.absChange > -500) return '#f43f5e';
        return '#be123c';
      }
      case 'concentration': {
        const cota = totalCandidateVotes > 0 ? (r.votesEnd / totalCandidateVotes) * 100 : 0;
        if (cota >= 50) return '#064e3b';
        if (cota >= 10) return '#047857';
        if (cota >= 5) return '#10b981';
        if (cota >= 2) return '#6ee7b7';
        return '#d1fae5';
      }
      case 'lq': {
        if (r.locationQuotientEnd >= 1.5) return '#064e3b';
        if (r.locationQuotientEnd >= 1.0) return '#10b981';
        if (r.locationQuotientEnd >= 0.5) return '#fbbf24';
        return '#f87171';
      }
    }
  };

  // 1. Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Centro na Serra Gaúcha (Caxias do Sul)
    const map = L.map(mapContainerRef.current, {
      center: [-29.1678, -51.1794],
      zoom: 9,
      zoomControl: false,
    });

    // Basemap: CartoDB Positron (cinza neutro elegante para software estatístico)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    polygonLayerGroupRef.current = L.layerGroup().addTo(map);
    markersLayerGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Atualizar polígonos municipais e marcadores ao mudar métricas ou filtros
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polyGroup = polygonLayerGroupRef.current;
    const markerGroup = markersLayerGroupRef.current;
    if (!map || !polyGroup || !markerGroup) return;

    // Limpar camadas anteriores
    polyGroup.clearLayers();
    markerGroup.clearLayers();

    // Renderizar Polígonos Municipais
    if (showPolygons) {
      Object.values(MUNICIPALITIES_GEO).forEach((geo) => {
        const row = rows.find((r) => r.municipality.id === geo.id);
        const color = getMetricColor(geo.id);
        const isSelected = selectedMunicipalityId === geo.id;

        const polygon = L.polygon(geo.polygonLatLngs, {
          color: isSelected ? '#000000' : '#ffffff',
          weight: isSelected ? 3 : 1.5,
          fillColor: color,
          fillOpacity: 0.75,
        });

        // Tooltip ao passar o mouse
        const tooltipContent = `
          <div style="font-family: inherit; font-size: 11px; padding: 2px;">
            <strong style="color: #111827; font-size: 12px;">${geo.name}</strong><br/>
            <span>Votos ${endYear}: <strong>${formatNumber(row?.votesEnd)}</strong></span><br/>
            <span>Part. Válidos: <strong>${formatPercent(row?.shareEnd, 2)}</strong></span><br/>
            <span>Saldo (${startYear}→${endYear}): <strong style="color: ${(row?.absChange || 0) >= 0 ? '#047857' : '#be123c'};">${formatChange(row?.absChange)}</strong></span><br/>
            <span>QL: <strong>${row?.locationQuotientEnd.toFixed(2)}</strong></span>
          </div>
        `;
        polygon.bindTooltip(tooltipContent, { sticky: true });

        polygon.on('click', () => {
          if (onSelectMunicipality) {
            onSelectMunicipality(geo.id);
          }
        });

        polyGroup.addLayer(polygon);
      });
    }

    // Renderizar Marcadores de Locais de Votação (Seções Eleitorais)
    if (showMarkers) {
      RAW_SECTIONS.forEach((section) => {
        const coords = getSectionCoordinates(section);
        const sectionVotesObj = endYear === 2026 ? section.votes2026 : endYear === 2022 ? section.votes2022 : section.votes2018;
        const vEnd = sectionVotesObj?.votes[candidate.id] || 0;
        const totalValid = sectionVotesObj?.totalValidVotes || 1;
        const share = (vEnd / totalValid) * 100;

        // Seção em município selecionado fica em destaque
        const isMunMatch = !selectedMunicipalityId || selectedMunicipalityId === 'all' || section.municipalityId === selectedMunicipalityId;

        const marker = L.circleMarker(coords, {
          radius: Math.max(5, Math.min(10, vEnd / 15)),
          fillColor: '#047857',
          color: '#ffffff',
          weight: 1.5,
          opacity: 1,
          fillOpacity: isMunMatch ? 0.9 : 0.3,
        });

        const popupContent = `
          <div style="font-family: inherit; font-size: 11px; line-height: 1.4; min-width: 180px;">
            <div style="font-weight: 700; color: #111827; margin-bottom: 2px;">${section.locationName}</div>
            <div style="color: #6b7280; font-size: 10px; margin-bottom: 6px;">
              Seção ${section.sectionId} · Zona ${section.zoneId} · ${section.neighborhood}
            </div>
            <div style="border-top: 1px solid #e5e7eb; padding-top: 4px;">
              <div>${candidate.name} (${endYear}): <strong>${vEnd} votos (${share.toFixed(1)}%)</strong></div>
              <div style="color: #6b7280; font-size: 10px;">Comparecimento: ${sectionVotesObj?.totalVoters || 'N/D'} eleitores</div>
            </div>
          </div>
        `;
        marker.bindPopup(popupContent);
        markerGroup.addLayer(marker);
      });
    }
  }, [metric, showPolygons, showMarkers, candidate.id, selectedMunicipalityId, rows, startYear, endYear]);

  // Se o município selecionado mudar, centraliza mapa suavemente
  useEffect(() => {
    if (!selectedMunicipalityId || selectedMunicipalityId === 'all') return;
    const geo = MUNICIPALITIES_GEO[selectedMunicipalityId];
    if (geo && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(geo.latLng, 10, { duration: 0.8 });
    }
  }, [selectedMunicipalityId]);

  const handleResetZoom = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([-29.1678, -51.1794], 9, { duration: 0.6 });
    }
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-neutral-200 bg-neutral-100 shadow-xs">
      {/* Barra Superior de Controles e Camadas */}
      {showControlsBar && (
        <div className="bg-white/95 backdrop-blur-xs border-b border-neutral-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs z-10 relative">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-neutral-800 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              <span>Camada Temática:</span>
            </span>

            <button
              onClick={() => setMetric('votes')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                metric === 'votes'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Total de Votos
            </button>
            <button
              onClick={() => setMetric('share')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                metric === 'share'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              % Válidos
            </button>
            <button
              onClick={() => setMetric('change')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                metric === 'change'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Saldo (2018→2022)
            </button>
            <button
              onClick={() => setMetric('concentration')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                metric === 'concentration'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Cota da Base (%)
            </button>
            <button
              onClick={() => setMetric('lq')}
              className={`px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
                metric === 'lq'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              Quociente Loc. (QL)
            </button>
          </div>

          {/* Alternadores de Visibilidade de Camada */}
          <div className="flex items-center gap-3 text-neutral-600">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPolygons}
                onChange={(e) => setShowPolygons(e.target.checked)}
                className="rounded border-neutral-300 text-emerald-800 focus:ring-emerald-700"
              />
              <span>Municípios</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)}
                className="rounded border-neutral-300 text-emerald-800 focus:ring-emerald-700"
              />
              <span>Locais de Votação (Seções)</span>
            </label>
          </div>
        </div>
      )}

      {/* Contêiner Leaflet */}
      <div ref={mapContainerRef} className={`w-full ${heightClass} z-0`} />

      {/* Botões Flutuantes de Navegação (Zoom & Reset) */}
      <div className="absolute top-14 right-3 z-10 flex flex-col gap-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-md shadow border border-neutral-200">
        <button
          onClick={handleZoomIn}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
          title="Aproximar Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
          title="Afastar Zoom"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetZoom}
          className="p-1.5 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
          title="Redefinir Visão Geral da Serra"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Legenda Flutuante Discreta na Base do Mapa */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-md border border-neutral-200 shadow text-[11px] text-neutral-600 flex items-center gap-3">
        <span className="font-semibold text-neutral-800">Legenda:</span>
        {metric === 'change' ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#be123c]" /> Queda severa (&lt;-500)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#10b981]" /> Ganho moderado
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#047857]" /> Expansão forte (&gt;+500)
            </span>
          </div>
        ) : metric === 'lq' ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#f87171]" /> QL &lt; 0.5 (Sub-representado)
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#10b981]" /> QL 1.0 - 1.5
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#064e3b]" /> QL &gt; 1.5 (Forte Hegemonia)
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#d1fae5]" /> Baixa
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#10b981]" /> Média
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-[#064e3b]" /> Alta (Epicentro)
            </span>
          </div>
        )}

        <div className="border-l border-neutral-200 pl-2 flex items-center gap-1 text-neutral-500">
          <span className="w-2 h-2 rounded-full bg-[#047857] inline-block" />
          <span>Local de Votação</span>
        </div>
      </div>
    </div>
  );
};
