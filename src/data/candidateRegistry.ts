/**
 * Registro de IDENTIDADE dos candidatos acompanhados (metadata de referência).
 *
 * NÃO contém votos nem dados eleitorais — apenas identidade exibível
 * (nome, número, partido, cor, cargo). Os votos vêm exclusivamente da API
 * em `src/data/electionData.ts`.
 *
 * Regra de chave: `id = String(candidate_number)`. O candidato principal é
 * o número 15140 (Carlos Búrigo), conforme MAIN_CANDIDATE_NUMBER.
 */

import type { Candidate } from '../types/election';

export const MAIN_CANDIDATE_ID = '15140';

export const CANDIDATE_REGISTRY: Candidate[] = [
  {
    id: '15140',
    name: 'Carlos Búrigo',
    ballotNumber: '15140',
    party: 'MDB',
    office: 'Deputado Estadual',
    color: '#047857',
    isMainCandidate: true,
  },
  {
    id: '13123',
    name: 'Pepe Vargas',
    ballotNumber: '13123',
    party: 'PT',
    office: 'Deputado Estadual',
    color: '#dc2626',
  },
  {
    id: '11000',
    name: 'Guilherme Pasin',
    ballotNumber: '11000',
    party: 'PP',
    office: 'Deputado Estadual',
    color: '#2563eb',
  },
  {
    id: '77077',
    name: 'Neri, o Carteiro',
    ballotNumber: '77077',
    party: 'SOLIDARIEDADE',
    office: 'Deputado Estadual',
    color: '#d97706',
  },
  {
    id: '40123',
    name: 'Elton Weber',
    ballotNumber: '40123',
    party: 'PSB',
    office: 'Deputado Estadual',
    color: '#9333ea',
  },
];
