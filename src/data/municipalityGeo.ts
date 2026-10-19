/**
 * Geometria estática de mapa (SVG + coordenadas) para o mapa territorial.
 *
 * DADO NÃO-ELEITORAL: polígonos temáticos, centróides e coordenadas de locais
 * de votação são apenas representação cartográfica (não são votos nem seções).
 * A API eleitoral não entrega GeoJSON; este arquivo é a fonte estática de
 * geometria consumida pelos mapas (Leaflet / malha SVG).
 *
 * Chave de município = slug do nome (`caxias_do_sul`), consistente com
 * `MunicipalityData.id` produzido por `src/data/electionStore.ts`.
 */

import { MunicipalityGeo, SectionHistory } from '../types/election';

// Coordenadas georreferenciadas dos locais de votação (representação estática).
export const POLLING_STATION_COORDS: Record<string, [number, number]> = {
  caxias_do_sul_0012: [-29.1620, -51.1810],
  caxias_do_sul_0015: [-29.1625, -51.1818],
  caxias_do_sul_0044: [-29.1550, -51.1650],
  caxias_do_sul_0089: [-29.1605, -51.1490],
  caxias_do_sul_0299: [-29.1230, -51.0850],
  caxias_do_sul_0102: [-29.1480, -51.1920],
  caxias_do_sul_0134: [-29.1780, -51.1550],
  caxias_do_sul_0188: [-29.1700, -51.1880],
  farroupilha_0021: [-29.2210, -51.3420],
  farroupilha_0042: [-29.2150, -51.3550],
  farroupilha_0078: [-29.2300, -51.3380],
  farroupilha_0105: [-29.2550, -51.3280],
  bento_goncalves_0008: [-29.1710, -51.5170],
  bento_goncalves_0032: [-29.1640, -51.5220],
  bento_goncalves_0065: [-29.1620, -51.5080],
  bento_goncalves_0091: [-29.1850, -51.5620],
  flores_da_cunha_0010: [-29.0270, -51.1820],
  flores_da_cunha_0035: [-29.0320, -51.1890],
  sao_marcos_0005: [-28.9710, -51.0660],
  garibaldi_0014: [-29.2560, -51.5330],
  carlos_barbosa_0028: [-29.2970, -51.5040],
  vacaria_0018: [-28.5080, -50.9340],
  porto_alegre_0003: [-30.0380, -51.2180],
  passo_fundo_0020: [-28.2620, -52.4060],
};

export function getSectionCoordinates(section: SectionHistory): [number, number] {
  if (section.coordinates) return section.coordinates;
  const key = `${section.municipalityId}_${section.sectionId}`;
  if (POLLING_STATION_COORDS[key]) return POLLING_STATION_COORDS[key];
  const munGeo = MUNICIPALITIES_GEO[section.municipalityId];
  if (munGeo) return munGeo.latLng;
  return [-29.1678, -51.1794];
}

export const MUNICIPALITIES_GEO: Record<string, MunicipalityGeo> = {
  caxias_do_sul: {
    id: 'caxias_do_sul',
    name: 'Caxias do Sul',
    codeIBGE: '4305108',
    region: 'Serra Gaúcha',
    center: [320, 240],
    latLng: [-29.1678, -51.1794],
    polygonLatLngs: [
      [-29.080, -51.250],
      [-29.080, -51.080],
      [-29.230, -51.050],
      [-29.260, -51.200],
      [-29.200, -51.280],
    ],
    svgPath: 'M 270,180 L 370,180 L 390,260 L 340,320 L 260,300 L 250,220 Z',
  },
  farroupilha: {
    id: 'farroupilha',
    name: 'Farroupilha',
    codeIBGE: '4307906',
    region: 'Serra Gaúcha',
    center: [210, 240],
    latLng: [-29.2239, -51.3444],
    polygonLatLngs: [
      [-29.160, -51.410],
      [-29.170, -51.280],
      [-29.280, -51.280],
      [-29.290, -51.420],
    ],
    svgPath: 'M 170,195 L 250,220 L 260,300 L 190,300 L 150,240 Z',
  },
  bento_goncalves: {
    id: 'bento_goncalves',
    name: 'Bento Gonçalves',
    codeIBGE: '4302105',
    region: 'Serra Gaúcha',
    center: [120, 220],
    latLng: [-29.1706, -51.5189],
    polygonLatLngs: [
      [-29.110, -51.580],
      [-29.120, -51.450],
      [-29.230, -51.460],
      [-29.240, -51.590],
    ],
    svgPath: 'M 80,180 L 170,195 L 150,240 L 130,270 L 60,240 Z',
  },
  flores_da_cunha: {
    id: 'flores_da_cunha',
    name: 'Flores da Cunha',
    codeIBGE: '4308201',
    region: 'Serra Gaúcha',
    center: [310, 140],
    latLng: [-29.0289, -51.1831],
    polygonLatLngs: [
      [-28.950, -51.260],
      [-28.950, -51.110],
      [-29.080, -51.100],
      [-29.080, -51.260],
    ],
    svgPath: 'M 260,110 L 350,110 L 370,180 L 270,180 Z',
  },
  sao_marcos: {
    id: 'sao_marcos',
    name: 'São Marcos',
    codeIBGE: '4319000',
    region: 'Serra Gaúcha',
    center: [390, 140],
    latLng: [-28.9711, -51.0669],
    polygonLatLngs: [
      [-28.900, -51.140],
      [-28.900, -50.990],
      [-29.040, -50.990],
      [-29.040, -51.140],
    ],
    svgPath: 'M 350,110 L 440,110 L 440,180 L 370,180 Z',
  },
  garibaldi: {
    id: 'garibaldi',
    name: 'Garibaldi',
    codeIBGE: '4308607',
    region: 'Serra Gaúcha',
    center: [120, 300],
    latLng: [-29.2567, -51.5333],
    polygonLatLngs: [
      [-29.220, -51.580],
      [-29.220, -51.480],
      [-29.290, -51.480],
      [-29.290, -51.580],
    ],
    svgPath: 'M 130,270 L 170,260 L 170,320 L 90,330 L 80,290 Z',
  },
  carlos_barbosa: {
    id: 'carlos_barbosa',
    name: 'Carlos Barbosa',
    codeIBGE: '4304804',
    region: 'Serra Gaúcha',
    center: [150, 350],
    latLng: [-29.2978, -51.5039],
    polygonLatLngs: [
      [-29.270, -51.550],
      [-29.270, -51.450],
      [-29.350, -51.450],
      [-29.350, -51.550],
    ],
    svgPath: 'M 170,320 L 200,320 L 180,390 L 110,380 L 90,330 Z',
  },
  vacaria: {
    id: 'vacaria',
    name: 'Vacaria',
    codeIBGE: '4322509',
    region: 'Campos de Cima',
    center: [460, 70],
    latLng: [-28.5089, -50.9339],
    polygonLatLngs: [
      [-28.380, -51.150],
      [-28.380, -50.750],
      [-28.650, -50.750],
      [-28.650, -51.150],
    ],
    svgPath: 'M 380,30 L 530,30 L 520,110 L 420,110 L 380,80 Z',
  },
  porto_alegre: {
    id: 'porto_alegre',
    name: 'Porto Alegre',
    codeIBGE: '4314902',
    region: 'Metropolitana',
    center: [280, 440],
    latLng: [-30.0346, -51.2177],
    polygonLatLngs: [
      [-29.950, -51.300],
      [-29.950, -51.100],
      [-30.150, -51.100],
      [-30.150, -51.300],
    ],
    svgPath: 'M 220,400 L 340,400 L 330,470 L 250,470 Z',
  },
  passo_fundo: {
    id: 'passo_fundo',
    name: 'Passo Fundo',
    codeIBGE: '4314100',
    region: 'Planalto',
    center: [80, 90],
    latLng: [-28.2628, -52.4067],
    polygonLatLngs: [
      [-28.180, -52.500],
      [-28.180, -52.300],
      [-28.350, -52.300],
      [-28.350, -52.500],
    ],
    svgPath: 'M 30,50 L 140,50 L 130,120 L 40,120 Z',
  },
};
