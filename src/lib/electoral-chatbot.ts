type Question = { id: string; area: string; label: string; prompt: string; needsCompetitor?: boolean };

const QUESTIONS: Question[] = [
  { id: 'overview.total_votes', area: 'overview', label: 'Total de votos', prompt: 'Quantos votos o candidato teve?' },
  { id: 'overview.state_share', area: 'overview', label: 'Participação estadual', prompt: 'Qual foi a participação do candidato no total de votos?' },
  { id: 'overview.municipalities_with_votes', area: 'overview', label: 'Cobertura municipal', prompt: 'Em quantos municípios o candidato recebeu votos?' },
  { id: 'overview.best_municipality', area: 'overview', label: 'Município mais forte', prompt: 'Qual município teve a maior votação?' },
  { id: 'history.total_evolution', area: 'history', label: 'Evolução histórica', prompt: 'Como evoluiu a votação ao longo das eleições?' },
  { id: 'history.trajectory', area: 'history', label: 'Trajetória', prompt: 'Qual foi a trajetória de votos, participação e ranking?' },
  { id: 'history.municipal_growth', area: 'history', label: 'Municípios que cresceram', prompt: 'Quais municípios mais cresceram?' },
  { id: 'history.municipal_decline', area: 'history', label: 'Municípios que caíram', prompt: 'Quais municípios mais perderam votos?' },
  { id: 'territory.top_rankings', area: 'territory', label: 'Ranking territorial', prompt: 'Quais são os municípios mais fortes?' },
  { id: 'territory.concentration', area: 'concentration', label: 'Concentração territorial', prompt: 'Onde a votação está concentrada?' },
  { id: 'overview.top10_concentration', area: 'concentration', label: 'Concentração nos 10 principais', prompt: 'Qual percentual da votação está nos 10 municípios mais fortes?' },
  { id: 'territory.dispersion', area: 'concentration', label: 'Dispersão territorial', prompt: 'Como a votação se distribui pelo território?' },
  { id: 'territory.regional_profile', area: 'territory', label: 'Perfil territorial', prompt: 'Qual é o perfil territorial da votação?' },
  { id: 'competition.top_candidates', area: 'competition', label: 'Principais candidatos', prompt: 'Quem são os principais candidatos?' },
  { id: 'competition.candidate_rank', area: 'competition', label: 'Ranking do candidato', prompt: 'Qual é o ranking do candidato?' },
  { id: 'competition.vote_gap', area: 'competition', label: 'Gap competitivo', prompt: 'Qual é a distância para o candidato acima?' },
  { id: 'competition.candidate_compare', area: 'competition', label: 'Comparar candidatos', prompt: 'Compare este candidato com outro.', needsCompetitor: true },
];

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export function resolveElectoralQuestion(text: string): Question | null {
  const value = normalizeText(text);
  if (!value) return null;
  if (value.includes('compar') || value.includes('concorr')) return QUESTIONS.find(q => q.id === 'competition.candidate_compare') ?? null;
  if (value.includes('ranking')) return QUESTIONS.find(q => q.id === 'competition.candidate_rank') ?? null;
  if (value.includes('gap') || value.includes('distancia')) return QUESTIONS.find(q => q.id === 'competition.vote_gap') ?? null;
  if (value.includes('crescer') || value.includes('crescimento')) return QUESTIONS.find(q => q.id === 'history.municipal_growth') ?? null;
  if (value.includes('perde') || value.includes('queda') || value.includes('declin')) return QUESTIONS.find(q => q.id === 'history.municipal_decline') ?? null;
  if (value.includes('concentr')) return QUESTIONS.find(q => q.id === 'territory.concentration') ?? null;
  if (value.includes('municip') || value.includes('territor')) return QUESTIONS.find(q => q.id === 'territory.top_rankings') ?? null;
  if (value.includes('particip') || value.includes('percent')) return QUESTIONS.find(q => q.id === 'overview.state_share') ?? null;
  if (value.includes('voto') || value.includes('votacao')) return QUESTIONS.find(q => q.id === 'overview.total_votes') ?? null;
  if (value.includes('histor') || value.includes('evolu') || value.includes('trajet')) return QUESTIONS.find(q => q.id === 'history.total_evolution') ?? null;
  return null;
}