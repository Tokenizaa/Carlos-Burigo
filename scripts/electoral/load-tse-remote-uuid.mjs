#!/usr/bin/env node
/**
 * ETL: carga de dados eleitorais TSE (2018/2022/2026, RS, Deputado Estadual)
 * para o schema UUID canônico do Supabase remoto.
 *
 * Fontes locais (baixadas do CDN TSE):
 *   artifacts/electoral/raw/votacao_secao_{year}_RS.zip   (votos por seção/candidato)
 *   artifacts/electoral/raw/detalhe_votacao_secao_{year}.zip (totais por seção)
 *   artifacts/electoral/raw/consulta_cand_{year}.zip        (candidatos 2026; 2018/22 usam votacao_secao)
 *
 * Recorte: Carlos Búrigo (15140) + top 15 competidores por ano,
 * definidos por votos na base eleitoral (municípios onde Búrigo pontuou).
 *
 * Uso:
 *   node scripts/electoral/load-tse-remote-uuid.mjs --dry-run   # apenas relatório
 *   node scripts/electoral/load-tse-remote-uuid.mjs             # carga real
 *
 * Idempotente (onConflict). Executa em lotes. Não apaga dados existentes.
 */
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const batchSize = 1000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
}
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const YEARS = [2018, 2022, 2026];
const OFFICE_CODE = "7"; // Deputado Estadual (TSE)
const UF = "RS";
const TURN = "1";

// Recorte por ano: Búrigo (15140) + top 15 por votos na base eleitoral.
const RECORTE = {
  2018: ["15140", "17000", "17777", "23200", "50500", "13655", "10300", "11111", "11411", "13713", "50000", "15000", "40120", "30300", "11333", "13120"],
  2022: ["15140", "10022", "50000", "50123", "22222", "10300", "13001", "10222", "11333", "15234", "13713", "65651", "11111", "45888", "13655", "22214"],
  2026: ["15140", "10222", "50000", "22777", "22190", "22222", "50123", "11333", "11000", "13007", "15386", "13001", "22100", "30000", "15000", "13100"],
};

const RAW = "artifacts/electoral/raw";
const ELECTION_CODE = { 2018: "297", 2022: "546", 2026: "6259" };
const ELECTION_DATE = { 2018: "2018-10-07", 2022: "2022-10-02", 2026: "2026-10-04" };

function required(year, kind) {
  const f =
    kind === "secao"
      ? `${RAW}/votacao_secao_${year}_RS.zip`
      : kind === "detalhe"
        ? `${RAW}/detalhe_votacao_secao_${year}.zip`
        : kind === "cand"
          ? `${RAW}/consulta_cand_${year}.zip`
          : `${RAW}/votacao_candidato_munzona_${year}.zip`;
  if (!existsSync(f)) throw new Error(`Fonte não encontrada: ${f}`);
  return f;
}

function csv(line) {
  const out = [];
  let c = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const x = line[i], n = line[i + 1];
    if (x === '"' && q && n === '"') { c += '"'; i++; continue; }
    if (x === '"') { q = !q; continue; }
    if (x === ";" && !q) { out.push(c); c = ""; continue; }
    c += x;
  }
  out.push(c);
  return out;
}

function unzipLineStream(zipFile, entry) {
  const child = spawn("unzip", ["-p", zipFile, entry], { stdio: ["ignore", "pipe", "pipe"], stderr: "ignore" });
  child.stderr.resume();
  return { child, rl: createInterface({ input: child.stdout, crlfDelay: Infinity }) };
}

async function chunked(rows, fn, label) {
  let done = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    await fn(batch);
    done += batch.length;
    if (label && (i === 0 || (i / batchSize) % 10 === 0)) console.log(`  ${label}: ${done}/${rows.length}`);
  }
}

async function upsertRows(table, rows, onConflict, label, always = false) {
  if (!rows.length) { console.log(`  ${label}: 0 (nada)`); return; }
  if (dryRun && !always) { console.log(`  ${label}: ${rows.length} (dry-run)`); return; }
  // dedupe por chave de conflito (evita "cannot affect row a second time")
  const keyCols = onConflict.split(",").map((c) => c.trim());
  const seen = new Set();
  const unique = [];
  for (const row of rows) {
    const k = keyCols.map((c) => String(row[c])).join("|");
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(row);
  }
  if (unique.length !== rows.length) console.log(`  ${label}: ${rows.length - unique.length} duplicatas removidas`);
  await chunked(unique, async (batch) => {
    const { error } = await supabase.from(table).upsert(batch, { onConflict });
    if (error) throw new Error(`${label}: ${error.message}`);
  }, label);
}

/** Busca TODAS as linhas (Supabase limita ~1000 por request). */
async function fetchAll(table, columns, applyFilter) {
  const out = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    let q = supabase.from(table).select(columns).range(from, from + page - 1);
    if (applyFilter) q = applyFilter(q);
    const { data, error } = await q;
    if (error) throw new Error(`fetchAll ${table}: ${error.message}`);
    out.push(...data);
    if (data.length < page) break;
  }
  return out;
}

async function collectSectionVotes(year) {
  const zip = required(year, "secao");
  const entry = `votacao_secao_${year}_RS.csv`;
  const cands = new Set(RECORTE[year]);
  const votes = []; // { municipalityCode, zoneNumber, sectionNumber, candidateTseId, votes, location }
  const sections = new Map(); // zoneNumber|secNumber -> { section_number, location_name, municipalityCode }
  const municipalities = new Map();
  const zones = new Map();
  let header = null;

  const { child, rl } = unzipLineStream(zip, entry);
  for await (const line of rl) {
    if (!header) { header = csv(line); continue; }
    const r = csv(line);
    // $19 DS_CARGO, $6 NR_TURNO, $17 NR_SECAO, $20 NR_VOTAVEL, $22 QT_VOTOS
    if (String(r[18]).trim().toUpperCase() !== "DEPUTADO ESTADUAL") continue;
    if (r[5] !== TURN) continue;
    const candNum = r[19];
    if (!cands.has(candNum)) continue;
    const municipalityCode = r[13];
    const zoneNumber = r[15];
    const sectionNumber = r[16];
    const votesQty = Number.parseInt(r[21] || "0", 10);
    municipalities.set(municipalityCode, { uf: UF, tse_municipality_code: municipalityCode, name: r[14] });
    zones.set(String(zoneNumber), { uf: UF, zone_number: Number.parseInt(zoneNumber, 10), name: `Zona ${zoneNumber}` });
    sections.set(`${municipalityCode}|${zoneNumber}|${sectionNumber}`, {
      section_number: Number.parseInt(sectionNumber, 10),
      location_name: r[24] || null,
      municipalityCode,
    });
    if (votesQty > 0) votes.push({
      municipalityCode, zoneNumber, sectionNumber,
      candidateTseId: r[23], // SQ_CANDIDATO
      votes: votesQty,
    });
  }
  await new Promise((res) => child.on("close", res));
  console.log(`${year}: seções=${sections.size} votos=${votes.length} municípios=${municipalities.size}`);
  return { votes, sections, municipalities, zones };
}

async function collectSectionTotals(year) {
  const zip = required(year, "detalhe");
  const entry = `detalhe_votacao_secao_${year}_RS.csv`;
  const totals = [];
  let header = null;
  const { child, rl } = unzipLineStream(zip, entry);
  for await (const line of rl) {
    if (!header) { header = csv(line); continue; }
    const r = csv(line);
    if (String(r[18]).trim().toUpperCase() !== "DEPUTADO ESTADUAL") continue;
    if (r[5] !== TURN) continue;
    totals.push({
      municipalityCode: r[13],
      zoneNumber: r[15],
      sectionNumber: r[16],
      electorate: Number.parseInt(r[19] || "0", 10),
      comparecimento: Number.parseInt(r[20] || "0", 10),
      abstentions: Number.parseInt(r[21] || "0", 10),
      blankVotes: Number.parseInt(r[23] || "0", 10),
      nullVotes: Number.parseInt(r[24] || "0", 10),
      validVotes: Number.parseInt(r[22] || "0", 10),
    });
  }
  await new Promise((res) => child.on("close", res));
  console.log(`${year}: totais por seção=${totals.length}`);
  return { totals };
}

async function collectCandidates2026() {
  const zip = required(2026, "cand");
  const entry = `consulta_cand_2026_RS.csv`;
  const cands = new Set(RECORTE[2026]);
  const out = [];
  let header = null;
  const { child, rl } = unzipLineStream(zip, entry);
  for await (const line of rl) {
    if (!header) { header = csv(line); continue; }
    const r = csv(line);
    if (String(r[14]).trim().toUpperCase() !== "DEPUTADO ESTADUAL") continue;
    const num = r[16];
    if (!cands.has(num)) continue;
    out.push({
      sq: r[15],
      candidate_number: num,
      ballot_name: r[18],
      full_name: r[17],
      party_number: r[25] || null,
      party_acronym: r[26] || null,
      status: r[23] || null,
    });
  }
  await new Promise((res) => child.on("close", res));
  console.log(`2026: candidatos recorte=${out.length}`);
  return out;
}

/** Candidatos 2018/2022: derivar do votacao_secao (tem SQ_CANDIDATO, NM_VOTAVEL). */
async function collectCandidatesOld(year) {
  const zip = required(year, "secao");
  const entry = `votacao_secao_${year}_RS.csv`;
  const cands = new Set(RECORTE[year]);
  const byNum = new Map();
  let header = null;
  const { child, rl } = unzipLineStream(zip, entry);
  for await (const line of rl) {
    if (!header) { header = csv(line); continue; }
    const r = csv(line);
    if (String(r[18]).trim().toUpperCase() !== "DEPUTADO ESTADUAL") continue;
    if (r[5] !== TURN) continue;
    const num = r[19];
    if (!cands.has(num)) continue;
    byNum.set(num, { sq: r[23], ballot_name: r[20] });
  }
  await new Promise((res) => child.on("close", res));
  console.log(`${year}: candidatos recorte=${byNum.size}`);
  return byNum;
}

async function run() {
  console.log(`ETL TSE → Supabase UUID (${dryRun ? "DRY-RUN" : "CARGA REAL"})`);

  // ---- Dimensões estáticas ----
  console.log("\n[1] Dimensões");
  const office = { tse_office_code: OFFICE_CODE, name: "Deputado Estadual", level: "ESTADUAL" };
  await upsertRows("electoral_offices", [office], "tse_office_code", "offices", true);
  await upsertRows("electoral_ufs", [{ uf: UF, name: "Rio Grande do Sul", region: "Sul" }], "uf", "ufs", true);
  const { data: officeRow } = await supabase.from("electoral_offices").select("id").eq("tse_office_code", OFFICE_CODE).limit(1);
  const officeId = officeRow[0].id;

  // Parties coletadas dos zips de candidatos (votacao_candidato_munzona tem SG_PARTIDO; consulta_cand 2026 também)
  const parties = new Map();
  for (const year of YEARS) {
    if (year === 2026) {
      for (const c of await collectCandidates2026()) {
        if (c.party_number) parties.set(c.party_number, {
          party_number: c.party_number,
          acronym: c.party_acronym || null,
          name: c.party_acronym || `Partido ${c.party_number}`,
        });
      }
    } else {
      const zipFile = required(year, "munzona");
      const entry = `votacao_candidato_munzona_${year}_RS.csv`;
      const cands = new Set(RECORTE[year]);
      let header = null;
      const { child, rl } = unzipLineStream(zipFile, entry);
      for await (const line of rl) {
        if (!header) { header = csv(line); continue; }
        const r = csv(line);
        if (String(r[17]).trim().toUpperCase() !== "DEPUTADO ESTADUAL") continue;
        if (r[5] !== TURN) continue;
        if (!cands.has(r[19])) continue;
        // munzona: NR_PARTIDO=$35(index34), SG_PARTIDO=$36(index35)
        const num = r[34];
        if (!num) continue;
        parties.set(num, { party_number: num, acronym: r[35] || null, name: r[35] || `Partido ${num}` });
      }
      await new Promise((res) => child.on("close", res));
    }
  }
  await upsertRows("electoral_parties", [...parties.values()], "party_number", "parties", true);

  // ---- Eleições e rounds ----
  console.log("\n[2] Eleições e rounds");
  const elections = [];
  for (const year of YEARS) {
    elections.push({
      tse_election_code: ELECTION_CODE[year],
      year,
      name: `Eleições Gerais ${year}`,
      election_type: "GERAL",
      scope: "ESTADUAL",
      status: year === 2026 ? "EM_APURACAO" : "FINAL",
      official_date: ELECTION_DATE[year],
    });
  }
  await upsertRows("electoral_elections", elections, "tse_election_code", "elections", true);
  const { data: electionRows } = await supabase.from("electoral_elections").select("id,tse_election_code,year");
  const electionMap = new Map(electionRows.map((e) => [String(e.year), e]));
  const rounds = YEARS.map((year) => ({
    election_id: electionMap.get(String(year)).id,
    round_number: 1,
    official_date: ELECTION_DATE[year],
  }));
  await upsertRows("electoral_rounds", rounds, "election_id,round_number", "rounds", true);
  const { data: roundRows } = await supabase.from("electoral_rounds").select("id,election_id");
  const roundMap = new Map(roundRows.map((r) => [r.election_id, r]));

  // ---- Municipalities / zones / sections / candidates / results ----
  console.log("\n[3] Coleta e carga por ano");
  const allNominals = [];
  const allTotals = [];

  for (const year of YEARS) {
    console.log(`--- ${year} ---`);
    const { votes, sections, municipalities, zones } = await collectSectionVotes(year);
    const { totals } = await collectSectionTotals(year);

    // municípios e zonas
    await upsertRows("electoral_municipalities", [...municipalities.values()].map((m) => ({
      uf: m.uf, tse_municipality_code: m.tse_municipality_code, name: m.name,
    })), "uf,tse_municipality_code", `${year} municípios`, true);
    await upsertRows("electoral_zones", [...zones.values()], "uf,zone_number", `${year} zonas`, true);

    // maps (paginated — Supabase limita 1000)
  const muns = await fetchAll("electoral_municipalities", "id,tse_municipality_code", (q) => q.eq("uf", UF));
  const munMap = new Map(muns.map((m) => [m.tse_municipality_code, m.id]));
  const zns = await fetchAll("electoral_zones", "id,zone_number", (q) => q.eq("uf", UF));
  const zoneMap = new Map(zns.map((z) => [String(z.zone_number), z.id]));

    // sectionRows com municipality_id (CD_MUNICIPIO do próprio zip)
    const sectionRows = [...sections.entries()].map(([key, s]) => {
      const [municipalityCode, zoneNumber] = key.split("|");
      return {
        zone_id: zoneMap.get(zoneNumber),
        municipality_id: munMap.get(municipalityCode) ?? null,
        section_number: s.section_number,
        location_name: s.location_name,
      };
    });
    await upsertRows("electoral_sections", sectionRows, "zone_id,municipality_id,section_number", `${year} sections`, true);
    const sectionLoaded = await fetchAll("electoral_sections", "id,zone_id,municipality_id,section_number", null);
    const sectionMap = new Map(sectionLoaded.map((s) => [`${s.municipality_id}|${s.zone_id}|${s.section_number}`, s.id]));

    // candidates
    const candList = year === 2026
      ? await collectCandidates2026()
      : [...(await collectCandidatesOld(year)).entries()].map(([num, c]) => ({
          sq: c.sq, candidate_number: num, ballot_name: c.ballot_name, full_name: c.ballot_name,
        }));
    const candRows = candList.map((c) => ({
      election_id: electionMap.get(String(year)).id,
      office_id: officeId,
      tse_candidate_id: c.sq,
      candidate_number: c.candidate_number,
      ballot_name: c.ballot_name || null,
      full_name: c.full_name || c.ballot_name || null,
      candidate_status: c.status || null,
    }));
    await upsertRows("electoral_candidates", candRows, "election_id,office_id,tse_candidate_id", `${year} candidates`, true);
    const candLoaded = await fetchAll("electoral_candidates", "id,tse_candidate_id", (q) => q.eq("election_id", electionMap.get(String(year)).id).eq("office_id", officeId));
    const candMap = new Map(candLoaded.map((c) => [c.tse_candidate_id, c.id]));

    // source_dataset + import_run
    const sourceDataset = {
      provider: "TSE",
      dataset_code: `votacao_secao_${year}_RS`,
      dataset_name: `Votação por seção - Deputado Estadual RS ${year}`,
      dataset_year: year,
      source_url: `https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_secao/votacao_secao_${year}_RS.zip`,
      retrieved_at: new Date().toISOString(),
      metadata: { uf: UF, cargo: "Deputado Estadual", turno: 1, recorte: "base eleitoral 16 candidatos" },
    };
    await upsertRows("electoral_source_datasets", [sourceDataset], "provider,dataset_code", `${year} dataset`, true);
    const { data: dsRows } = await supabase.from("electoral_source_datasets").select("id").eq("provider", "TSE").eq("dataset_code", sourceDataset.dataset_code).limit(1);
    const sourceDatasetId = dsRows[0].id;
    const importRun = {
      dataset_id: sourceDatasetId,
      source_file_name: `votacao_secao_${year}_RS.zip`,
      source_file_url: sourceDataset.source_url,
      started_at: new Date().toISOString(),
      status: dryRun ? "PLANNED" : "RUNNING",
      rows_read: votes.length,
      rows_loaded: 0,
      rows_rejected: 0,
      metadata: { year, uf: UF, office_code: OFFICE_CODE, recorte: "16", granularidade: "secao" },
    };
    const { data: runRows, error: runErr } = await supabase
      .from("electoral_import_runs")
      .insert(importRun)
      .select("id");
    if (runErr) throw new Error(`import_runs: ${runErr.message}`);
    const importRunId = runRows[0].id;

    // nominal (seção) — recorte
    const nominalRows = votes.map((v) => ({
      round_id: roundMap.get(electionMap.get(String(year)).id).id,
      office_id: officeId,
      uf: UF,
      municipality_id: munMap.get(v.municipalityCode),
      zone_id: zoneMap.get(String(v.zoneNumber)),
      section_id: sectionMap.get(`${munMap.get(v.municipalityCode)}|${zoneMap.get(String(v.zoneNumber))}|${v.sectionNumber}`) ?? null,
      source_dataset_id: sourceDatasetId,
      import_run_id: importRunId,
      candidate_id: candMap.get(v.candidateTseId),
      votes: v.votes,
    })).filter((r) => r.municipality_id && r.zone_id && r.section_id && r.candidate_id);
    await upsertRows("electoral_results_nominal", nominalRows, "round_id,office_id,municipality_id,section_id,candidate_id", `${year} nominal`);

    // totals (seção)
    const totalRows = totals.map((t) => ({
      round_id: roundMap.get(electionMap.get(String(year)).id).id,
      office_id: officeId,
      uf: UF,
      municipality_id: munMap.get(t.municipalityCode),
      zone_id: zoneMap.get(String(t.zoneNumber)),
      section_id: sectionMap.get(`${munMap.get(t.municipalityCode)}|${zoneMap.get(String(t.zoneNumber))}|${t.sectionNumber}`) ?? null,
      source_dataset_id: sourceDatasetId,
      import_run_id: importRunId,
      electorate: t.electorate,
      comparecimento: t.comparecimento,
      abstentions: t.abstentions,
      blank_votes: t.blankVotes,
      null_votes: t.nullVotes,
      valid_votes: t.validVotes,
      total_votes: t.electorate - t.abstentions || 0,
    })).filter((r) => r.municipality_id && r.zone_id && r.section_id);
    await upsertRows("electoral_results_totals", totalRows, "round_id,office_id,municipality_id,section_id", `${year} totals`);

    if (!dryRun) {
      const { error } = await supabase
        .from("electoral_import_runs")
        .update({ status: "COMPLETED", finished_at: new Date().toISOString(), rows_loaded: nominalRows.length })
        .eq("id", importRunId);
      if (error) throw new Error(`finalizar run ${year}: ${error.message}`);
    }
  }

  console.log(`\nETL ${dryRun ? "DRY-RUN" : "CONCLUÍDO"} ✅`);
}

run().catch((e) => { console.error("ETL FALHOU:", e.message); process.exit(1); });