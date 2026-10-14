-- Reparo: chaves únicas idempotentes nas tabelas de resultados raw e em electoral_sections.
-- Chave lógica DEVE incluir municipality_id: uma zona TSE (RS) cobre vários municípios e
-- NR_SECAO repete entre eles. Sem o município, seções de municípios diferentes colapsam:
--   (zone_id, section_number)                     -> seções colapsadas
--   (round_id, office_id, section_id, candidate_id) -> 2ª linha vira duplicata lógica
-- Root cause do déficit 2018: 9.057 linhas de nominal / ~1.837 de totals nunca persistidas.
-- Dados deduplicados ANTES (0 dups por chave lógica). import_runs inalterado.

-- Nominal: chave lógica (round_id, office_id, municipality_id, section_id, candidate_id)
alter table public.electoral_results_nominal
  drop constraint if exists electoral_results_nominal_round_office_section_candidate_uidx;
alter table public.electoral_results_nominal
  drop constraint if exists electoral_results_nominal_round_id_office_id_section_id_can_key;
alter table public.electoral_results_nominal
  add constraint electoral_results_nominal_round_office_section_candidate_uidx
  unique (round_id, office_id, municipality_id, section_id, candidate_id);

-- Totals: chave lógica (round_id, office_id, municipality_id, section_id)
alter table public.electoral_results_totals
  drop constraint if exists electoral_results_totals_round_office_section_uidx;
alter table public.electoral_results_totals
  drop constraint if exists electoral_results_totals_round_id_office_id_uf_municipality_key;
drop index if exists public.electoral_results_totals_identity_uidx;
alter table public.electoral_results_totals
  add constraint electoral_results_totals_round_office_section_uidx
  unique (round_id, office_id, municipality_id, section_id);

-- Sections: identidade (zone_id, section_number, municipality_id)
alter table public.electoral_sections
  drop constraint if exists electoral_sections_zone_id_section_number_key;
alter table public.electoral_sections
  drop constraint if exists electoral_sections_zone_id_section_number_municipality_key;
alter table public.electoral_sections
  add constraint electoral_sections_zone_id_section_number_municipality_key
  unique (zone_id, section_number, municipality_id);
