#!/usr/bin/env node
/**
 * Auditoria TSE RS / Deputado Estadual, 2018/2022/2026.
 * Leitura incremental de CSVs em ZIP e consultas somente de leitura ao Supabase.
 * Não realiza carga nem altera dados.
 */
import { createHash } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { createClient } from "@supabase/supabase-js";

const YEARS = [2018, 2022, 2026], UF = "RS", OFFICE = "DEPUTADO ESTADUAL", TURN = "1";
const RAW = "artifacts/electoral/raw", OUT = "artifacts/electoral/reports", PAGE = 1000;
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const db = url && key ? createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
const norm = (v) => String(v ?? "").replace(/^\uFEFF/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();

function parseLine(line) {
  const out = []; let value = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i], next = line[i + 1];
    if (ch === '"' && quoted && next === '"') { value += '"'; i++; continue; }
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === ";" && !quoted) { out.push(value); value = ""; continue; }
    value += ch;
  }
  if (quoted) throw new Error("CSV com aspas não fechadas.");
  out.push(value); return out;
}
function add(map, key, n) { map.set(key, (map.get(key) || 0) + n); }
function field(row, idx, name) { return idx[name] === undefined ? "" : (row[idx[name]] ?? ""); }
function entryFor(zip, pattern) {
  const r = spawnSync("unzip", ["-Z1", zip], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error("Não foi possível listar " + zip + ": " + String(r.stderr || "").trim());
  const e = r.stdout.split(/\r?\n/).filter(Boolean).find((n) => pattern.test(basename(n)));
  if (!e) throw new Error("CSV esperado não encontrado em " + zip);
  return e;
}
async function hashFile(path) {
  const h = createHash("sha256");
  for await (const chunk of createReadStream(path)) h.update(chunk);
  return h.digest("hex");
}
async function* linesFromZip(zip, entry) {
  const child = spawn("unzip", ["-p", zip, entry], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = ""; child.stderr.setEncoding("utf8"); child.stderr.on("data", (x) => { stderr += x; });
  const done = new Promise((resolve, reject) => { child.once("error", reject); child.once("close", resolve); });
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  for await (const line of rl) yield line;
  const code = await done;
  if (code !== 0) throw new Error("unzip falhou: " + stderr.trim());
}
function hasOpenCsvQuote(value) {
  let quoted = false;
  for (let i = 0; i < value.length; i++) {
    if (value[i] !== '"') continue;
    if (quoted && value[i + 1] === '"') { i++; continue; }
    quoted = !quoted;
  }
  return quoted;
}
async function* csvRecordsFromZip(zip, entry) {
  let pending = "";
  for await (const physicalLine of linesFromZip(zip, entry)) {
    pending = pending ? pending + "\n" + physicalLine : physicalLine;
    if (hasOpenCsvQuote(pending)) continue;
    yield pending;
    pending = "";
  }
  if (pending) throw new Error("CSV termina com registro incompleto/aspas não fechadas: " + entry);
}
async function source(year, kind) {
  const path = join(RAW, kind === "section" ? "votacao_secao_" + year + "_RS.zip" : "votacao_candidato_munzona_" + year + ".zip");
  if (!existsSync(path)) throw new Error("Arquivo ausente: " + path);
  const pattern = kind === "section" ? new RegExp("^votacao_secao_" + year + "_RS\\.csv$", "i") : new RegExp("^votacao_candidato_munzona_" + year + "_RS\\.csv$", "i");
  const entry = entryFor(path, pattern), aggregate = new Map();
  let header = null, idx = null, read = 0, included = 0;
  const required = ["DS_CARGO", "NR_TURNO", "CD_MUNICIPIO", "NR_ZONA", "SQ_CANDIDATO", kind === "section" ? "QT_VOTOS" : "QT_VOTOS_NOMINAIS"];
  for await (const line of csvRecordsFromZip(path, entry)) {
    if (header === null) {
      header = parseLine(line).map(norm); idx = Object.fromEntries(header.map((v, i) => [v, i]));
      const missing = required.filter((v) => idx[v] === undefined);
      if (missing.length) throw new Error("Layout " + kind + " " + year + " sem colunas: " + missing.join(", "));
      continue;
    }
    if (!line) continue;
    read++;
    const row = parseLine(line);
    if (norm(field(row, idx, "DS_CARGO")) !== OFFICE) continue;
    if (String(field(row, idx, "NR_TURNO") || "1").trim() !== TURN) continue;
    if (idx.SG_UF !== undefined && norm(field(row, idx, "SG_UF")) !== UF) continue;
    const municipality = String(field(row, idx, "CD_MUNICIPIO")).trim();
    const zone = String(field(row, idx, "NR_ZONA")).trim();
    const candidate = String(field(row, idx, "SQ_CANDIDATO")).trim();
    const votes = Number.parseInt(field(row, idx, kind === "section" ? "QT_VOTOS" : "QT_VOTOS_NOMINAIS"), 10);
    // Votos sem identificador de candidato (brancos, nulos ou legenda) não integram a reconciliação nominal.
    if (!candidate) continue;
    if (!municipality || !zone || !Number.isSafeInteger(votes) || votes < 0) throw new Error("Registro inválido em " + path + " linha " + (read + 1));
    included++;
    if (votes > 0) add(aggregate, [municipality, zone, candidate].join("|"), votes);
  }
  if (header === null) throw new Error("CSV vazio: " + path);
  return { path, entry, sizeBytes: statSync(path).size, sha256: await hashFile(path), recordsRead: read, recordsIncluded: included, aggregateRows: aggregate.size, voteTotal: [...aggregate.values()].reduce((a, b) => a + b, 0), columns: header, aggregate };
}
async function detailSource(year) {
  const path = join(RAW, "detalhe_votacao_secao_" + year + ".zip");
  if (!existsSync(path)) throw new Error("Arquivo oficial de totais por seção ausente: " + path);
  const entry = entryFor(path, new RegExp("^detalhe_votacao_secao_" + year + "_RS\\.csv$", "i"));
  const aggregate = new Map();
  let header = null, idx = null, read = 0, included = 0;
  const aliases = {
    electorate: ["QT_APTOS", "QT_ELEITORADO"], comparecimento: ["QT_COMPARECIMENTO"],
    abstentions: ["QT_ABSTENCOES", "QT_ABSTENCAO"], validVotes: ["QT_VOTOS_VALIDOS"],
    blankVotes: ["QT_VOTOS_BRANCOS", "QT_VOTOS_BRANCO"], nullVotes: ["QT_VOTOS_NULOS", "QT_VOTOS_NULO"]
  };
  for await (const line of csvRecordsFromZip(path, entry)) {
    if (header === null) {
      header = parseLine(line).map(norm);
      idx = Object.fromEntries(header.map((v, i) => [v, i]));
      const required = ["DS_CARGO", "NR_TURNO", "CD_MUNICIPIO", "NR_ZONA", "NR_SECAO"];
      const missing = required.filter((v) => idx[v] === undefined);
      for (const [metric, names] of Object.entries(aliases)) if (!names.some((name) => idx[name] !== undefined)) missing.push(metric + " (" + names.join(" ou ") + ")");
      if (missing.length) throw new Error("Layout de totais por seção " + year + " sem colunas: " + missing.join(", "));
      continue;
    }
    if (!line) continue;
    read++;
    const row = parseLine(line);
    if (norm(field(row, idx, "DS_CARGO")) !== OFFICE) continue;
    if (String(field(row, idx, "NR_TURNO") || "1").trim() !== TURN) continue;
    if (idx.SG_UF !== undefined && norm(field(row, idx, "SG_UF")) !== UF) continue;
    const m = String(field(row, idx, "CD_MUNICIPIO")).trim();
    const z = String(field(row, idx, "NR_ZONA")).trim();
    const s = String(field(row, idx, "NR_SECAO")).trim();
    if (!m || !z || !s) throw new Error("Chave territorial ausente em totais por seção, linha " + (read + 1));
    const values = {};
    for (const [metric, names] of Object.entries(aliases)) {
      const name = names.find((candidate) => idx[candidate] !== undefined);
      const value = Number.parseInt(field(row, idx, name), 10);
      if (!Number.isSafeInteger(value) || value < 0) throw new Error("Métrica inválida " + name + " em totais por seção, linha " + (read + 1));
      values[metric] = value;
    }
    const key = [m, z, s].join("|");
    if (aggregate.has(key)) throw new Error("Seção duplicada em totais oficiais: " + key);
    aggregate.set(key, values);
    included++;
  }
  if (header === null) throw new Error("CSV de totais por seção vazio: " + path);
  return { path, entry, sizeBytes: statSync(path).size, sha256: await hashFile(path), recordsRead: read, recordsIncluded: included, aggregateRows: aggregate.size, columns: header, aggregate };
}
function compareTotals(official, stored) {
  const metrics = ["electorate", "comparecimento", "abstentions", "validVotes", "blankVotes", "nullVotes"];
  const keys = new Set([...official.keys(), ...stored.keys()]);
  let mismatches = 0, officialOnly = 0, storedOnly = 0, compared = 0, nonComparable = 0;
  const examples = [];
  for (const key of keys) {
    const a = official.get(key), b = stored.get(key);
    if (!a) { storedOnly++; continue; }
    if (!b) { officialOnly++; continue; }
    compared++;
    for (const metric of metrics) {
      if (a[metric] == null || b[metric] == null || !Number.isSafeInteger(b[metric])) { nonComparable++; continue; }
      if (a[metric] !== b[metric]) {
        mismatches++;
        if (examples.length < 20) examples.push({ key, metric, official: a[metric], supabase: b[metric], difference: a[metric] - b[metric] });
      }
    }
  }
  const status = mismatches || storedOnly ? "DIVERGENT" : officialOnly || nonComparable ? "PENDING" : "MATCHED";
  return { status, keysUnion: keys.size, comparedKeys: compared, mismatches, officialOnlyKeys: officialOnly, supabaseOnlyKeys: storedOnly, nonComparableMetrics: nonComparable, examples };
}

function compare(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()]);
  let mismatches = 0, sectionOnly = 0, otherOnly = 0, equal = 0, compared = 0, totalA = 0, totalB = 0;
  const examples = [];
  for (const k of keys) {
    const x = a.get(k), y = b.get(k);
    if (x !== undefined) totalA += x;
    if (y !== undefined) totalB += y;
    if (x === undefined) otherOnly++;
    else if (y === undefined) sectionOnly++;
    else { compared++; if (x === y) equal++; else { mismatches++; if (examples.length < 20) examples.push({ key: k, sectionVotes: x, otherVotes: y, difference: x - y }); } }
  }
  return { status: mismatches || sectionOnly || otherOnly ? "DIVERGENT" : "MATCHED", keysUnion: keys.size, comparedKeys: compared, equalKeys: equal, mismatches, sectionOnlyKeys: sectionOnly, otherOnlyKeys: otherOnly, sectionVotesTotal: totalA, otherVotesTotal: totalB, examples };
}
async function allRows(table, columns, filter) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = db.from(table).select(columns || "*").range(from, from + PAGE - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(table + ": " + error.message);
    out.push(...(data || []));
    if (!data || data.length < PAGE) return out;
  }
}
async function auditDb(year, official, officialTotals) {
  if (!db) return { status: "PENDING", reason: "SUPABASE_URL e chave de leitura não configurados." };
  const elections = await allRows("electoral_elections", "id,year,election_type", (q) => q.eq("year", year));
  const election = elections.find((x) => Number(x.year) === year && (!x.election_type || x.election_type === "GERAL"));
  if (!election) return { status: "PENDING", reason: "Eleição não encontrada em electoral_elections.year para " + year };
  const rounds = await allRows("electoral_rounds", "*", (q) => q.eq("election_id", election.id));
  const round = rounds.find((x) => Number(x.round_number) === 1);
  if (!round) return { status: "PENDING", reason: "Turno 1 ausente em electoral_rounds." };
  const offices = await allRows("electoral_offices", "id,tse_office_code", (q) => q.eq("tse_office_code", "7"));
  const office = offices[0];
  if (!office) return { status: "PENDING", reason: "Cargo TSE 7 não encontrado em electoral_offices." };
  const candidates = await allRows("electoral_candidates", "*", (q) => q.eq("election_id", election.id).eq("office_id", office.id));
  const cand = new Map(candidates.map((x) => [String(x.id), String(x.tse_candidate_id ?? "")]));
  const municipalities = await allRows("electoral_municipalities", "id,tse_municipality_code,uf", (q) => q.eq("uf", UF));
  if (!municipalities.length) return { status: "PENDING", reason: "Nenhum município RS encontrado no Supabase." };
  const mun = new Map(municipalities.map((x) => [String(x.id), String(x.tse_municipality_code ?? "")]));
  const zones = await allRows("electoral_zones", "id,zone_number,uf", (q) => q.eq("uf", UF));
  const zone = new Map(zones.map((x) => [String(x.id), String(x.zone_number ?? "")]));
  const rows = await allRows("electoral_results_nominal", "*", (q) => q.eq("round_id", round.id).eq("office_id", office.id));
  const nominal = new Map(); let unmappedNominal = 0, mappedNominal = 0;
  for (const row of rows) {
    if (row.uf && norm(row.uf) !== UF) continue;
    const m = mun.get(String(row.municipality_id)) || String(row.tse_municipality_code ?? "");
    const z = row.zone_id != null ? (zone.get(String(row.zone_id)) || "") : String(row.zone ?? row.zone_number ?? "");
    const candidate = cand.get(String(row.candidate_id)) || String(row.tse_candidate_id ?? "");
    const votes = Number(row.votes ?? row.candidate_votes);
    if (!m || !z || !candidate || !Number.isSafeInteger(votes)) { unmappedNominal++; continue; }
    mappedNominal++;
    if (votes > 0) add(nominal, [m, z, candidate].join("|"), votes);
  }
  const totalRows = await allRows("electoral_results_totals", "*", (q) => q.eq("round_id", round.id).eq("office_id", office.id));
  const sections = await allRows("electoral_sections", "id,section_number,municipality_id,zone_id", (q) => q.in("municipality_id", municipalities.map((x) => x.id)));
  const sectionById = new Map(sections.map((x) => [String(x.id), {
    municipality: mun.get(String(x.municipality_id)) || "",
    zone: zone.get(String(x.zone_id)) || "",
    section: String(x.section_number ?? "")
  }]));
  const storedTotals = new Map(); let unmappedTotals = 0;
  for (const row of totalRows) {
    if (row.uf && norm(row.uf) !== UF) continue;
    const s = sectionById.get(String(row.section_id));
    const municipality = s?.municipality || mun.get(String(row.municipality_id)) || "";
    const zoneNumber = s?.zone || zone.get(String(row.zone_id)) || String(row.zone ?? row.zone_number ?? "");
    const sectionNumber = s?.section || String(row.section_number ?? "");
    if (!municipality || !zoneNumber || !sectionNumber) { unmappedTotals++; continue; }
    const key = [municipality, zoneNumber, sectionNumber].join("|");
    if (storedTotals.has(key)) { unmappedTotals++; continue; }
    storedTotals.set(key, {
      electorate: row.electorate == null ? null : Number(row.electorate),
      comparecimento: row.comparecimento == null ? null : Number(row.comparecimento),
      abstentions: row.abstentions == null ? null : Number(row.abstentions),
      validVotes: row.valid_votes == null ? null : Number(row.valid_votes),
      blankVotes: row.blank_votes == null ? null : Number(row.blank_votes),
      nullVotes: row.null_votes == null ? null : Number(row.null_votes)
    });
  }
  const nominalComparison = compare(official, nominal);
  // A cobertura parcial de candidatos é BLOQUEIO, não divergência de votos; divergência em chaves presentes continua rejeitando.
  nominalComparison.status = nominalComparison.mismatches > 0 || nominalComparison.otherOnlyKeys > 0
    ? "DIVERGENT" : nominalComparison.sectionOnlyKeys > 0 ? "PENDING" : "MATCHED";
  const totalsComparison = compareTotals(officialTotals, storedTotals);
  const status = nominalComparison.status === "DIVERGENT" || totalsComparison.status === "DIVERGENT"
    ? "DIVERGENT"
    : !rows.length || !totalRows.length || unmappedNominal || unmappedTotals || nominalComparison.status === "PENDING" || totalsComparison.status === "PENDING"
      ? "PENDING" : "MATCHED";
  return {
    status, electionId: election.id, roundId: round.id, candidates: candidates.length,
    nominalRowsRead: rows.length, nominalRowsMapped: mappedNominal, nominalRowsUnmapped: unmappedNominal,
    totalsRowsRead: totalRows.length, totalsRowsUnmapped: unmappedTotals,
    nominalComparison, totalsComparison,
    note: "Ano resolvido por electoral_elections.year → electoral_rounds.election_id. Nenhuma consulta usa election_year."
  };
}
function verdictFor(r) {
  if (r.fileReconciliation?.status === "DIVERGENT" || r.totalsReconciliation?.status === "DIVERGENT" || r.database?.status === "DIVERGENT") return "REJECTED";
  if (r.errors.length || r.sources.section?.status !== "SUCCESS" || r.sources.munzona?.status !== "SUCCESS" || r.sources.detail?.status !== "SUCCESS" || r.database?.status === "PENDING") return "BLOCKED";
  return "APPROVED";
}
async function runYear(year) {
  const r = { year, status: "BLOCKED", errors: [], sources: {}, fileReconciliation: null, totalsReconciliation: null, database: null };
  let section = null, munzona = null, detail = null;
  for (const kind of ["section", "munzona"]) {
    const path = join(RAW, kind === "section" ? "votacao_secao_" + year + "_RS.zip" : "votacao_candidato_munzona_" + year + ".zip");
    try {
      const x = await source(year, kind); if (kind === "section") section = x; else munzona = x;
      r.sources[kind] = { status: "SUCCESS", path: x.path, entry: x.entry, sizeBytes: x.sizeBytes, sha256: x.sha256, recordsRead: x.recordsRead, recordsIncluded: x.recordsIncluded, aggregateRows: x.aggregateRows, voteTotal: x.voteTotal, columns: x.columns };
    } catch (e) {
      r.sources[kind] = { status: existsSync(path) ? "FAILED" : "MISSING", path };
      r.errors.push(kind + ": " + String(e?.message || e));
    }
  }
  const detailPath = join(RAW, "detalhe_votacao_secao_" + year + ".zip");
  try {
    detail = await detailSource(year);
    r.sources.detail = { status: "SUCCESS", path: detail.path, entry: detail.entry, sizeBytes: detail.sizeBytes, sha256: detail.sha256, recordsRead: detail.recordsRead, recordsIncluded: detail.recordsIncluded, aggregateRows: detail.aggregateRows };
  } catch (e) {
    r.sources.detail = { status: existsSync(detailPath) ? "FAILED" : "MISSING", path: detailPath };
    r.errors.push("detail: " + String(e?.message || e));
  }
  if (section && munzona) r.fileReconciliation = compare(section.aggregate, munzona.aggregate);
  try {
    r.database = section && detail
      ? await auditDb(year, section.aggregate, detail.aggregate)
      : { status: "PENDING", reason: "Fontes oficiais de seção e totais por seção são necessárias." };
  } catch (e) { r.database = { status: "PENDING", reason: String(e?.message || e) }; }
  r.totalsReconciliation = r.database?.totalsComparison || null;
  r.status = verdictFor(r);
  return r;
}
function markdown(report) {
  const out = [
    "# Auditoria consolidada eleitoral — TSE RS", "",
    "- Executada em: " + report.executedAt,
    "- Cargo: Deputado Estadual; UF: RS; turno: 1",
    "- Veredito: **" + report.verdict + "**", "",
    "| Ano | Seção | Município/zona | Totais oficiais | Nominais | Totais | Supabase | Veredito |",
    "|---:|---|---|---|---|---|---|---|"
  ];
  for (const r of report.years) out.push("| " + r.year + " | " + (r.sources.section?.status || "N/A") + " | " + (r.sources.munzona?.status || "N/A") + " | " + (r.sources.detail?.status || "N/A") + " | " + (r.fileReconciliation?.status || "NÃO EXECUTADA") + " | " + (r.totalsReconciliation?.status || "NÃO EXECUTADA") + " | " + (r.database?.status || "PENDENTE") + " | " + r.status + " |");
  for (const r of report.years) {
    out.push("", "## " + r.year, "");
    for (const k of ["section", "munzona", "detail"]) {
      const s = r.sources[k]; if (!s) continue;
      const label = k === "section" ? "Votação nominal por seção" : k === "munzona" ? "Votação nominal por município/zona" : "Totais oficiais por seção";
      out.push("### " + label, "", "- Status: " + s.status, "- Arquivo: " + s.path, "- SHA-256: " + (s.sha256 || "N/A"), "- Tamanho (bytes): " + (s.sizeBytes ?? "N/A"), "- Registros lidos: " + (s.recordsRead ?? "N/A"), "- Registros no recorte: " + (s.recordsIncluded ?? "N/A"), "- Chaves agregadas: " + (s.aggregateRows ?? "N/A"), "- Soma de votos nominais: " + (k === "detail" ? "N/A" : (s.voteTotal ?? "N/A")), "- Colunas: " + (s.columns || []).join(", "));
    }
    out.push("", "### Reconciliação nominal: seção × município/zona", "");
    if (r.fileReconciliation) {
      const c = r.fileReconciliation;
      out.push("- Status: " + c.status, "- Chaves comparadas: " + c.comparedKeys, "- Correspondências exatas: " + c.equalKeys, "- Divergências: " + c.mismatches, "- Chaves somente na seção: " + c.sectionOnlyKeys, "- Chaves somente em município/zona: " + c.otherOnlyKeys, "- Total seção: " + c.sectionVotesTotal, "- Total município/zona: " + c.otherVotesTotal);
      if (c.examples.length) out.push("", "Exemplos de divergências:", "", JSON.stringify(c.examples, null, 2));
    } else out.push("- NÃO EXECUTADA: uma ou ambas as fontes falharam.");
    out.push("", "### Reconciliação dos totais oficiais por seção × Supabase", "");
    if (r.totalsReconciliation) {
      const t = r.totalsReconciliation;
      out.push("- Status: " + t.status, "- Chaves comparadas: " + t.comparedKeys, "- Divergências por métrica: " + t.mismatches, "- Seções ausentes no Supabase: " + t.officialOnlyKeys, "- Seções extras no Supabase: " + t.supabaseOnlyKeys, "- Métricas não comparáveis: " + t.nonComparableMetrics);
      if (t.examples.length) out.push("", "Exemplos:", "", JSON.stringify(t.examples, null, 2));
    } else out.push("- NÃO EXECUTADA: fonte oficial ou consulta ao Supabase indisponível.");
    out.push("", "### Supabase", "", "- Status: " + (r.database?.status || "PENDENTE"), "- Motivo/observação: " + (r.database?.reason || r.database?.note || "N/A"));
    if (r.database?.nominalComparison) out.push("- Linhas nominais: " + r.database.nominalRowsRead, "- Linhas mapeadas: " + r.database.nominalRowsMapped, "- Linhas sem mapeamento: " + r.database.nominalRowsUnmapped, "- Divergências seção × Supabase: " + r.database.nominalComparison.mismatches, "- Linhas de totais: " + r.database.totalsRowsRead, "- Totais sem mapeamento: " + r.database.totalsRowsUnmapped);
    if (r.errors.length) out.push("", "Erros:", "", ...r.errors.map((x) => "- " + x));
  }
  out.push("", "APPROVED exige todas as fontes oficiais, reconciliação nominal e reconciliação dos totais sem divergências, além da consulta Supabase concluída. BLOCKED significa evidência ausente ou falha técnica. REJECTED significa divergência comprovada. Comparação não executada nunca equivale a zero divergências.", "");
  return out.join("\n");
}
async function main() {
  const years = [];
  for (const year of YEARS) {
    console.log("\n=== Auditoria " + year + " ===");
    const r = await runYear(year); years.push(r);
    console.log("Status " + year + ": " + r.status);
    if (r.fileReconciliation) console.log("Arquivos: " + r.fileReconciliation.status + "; divergências=" + r.fileReconciliation.mismatches);
    for (const e of r.errors) console.error(e);
  }
  const verdict = years.some((r) => r.status === "REJECTED") ? "REJECTED" : years.every((r) => r.status === "APPROVED") ? "APPROVED" : "BLOCKED";
  const report = { executedAt: new Date().toISOString(), verdict, years };
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, "reconciliation-latest.json"), JSON.stringify(report, null, 2) + "\n");
  writeFileSync(join(OUT, "reconciliation-latest.md"), markdown(report) + "\n");
  console.log("\nRelatórios atualizados em " + OUT + "; veredito: " + verdict);
  if (verdict !== "APPROVED") process.exitCode = 1;
}
main().catch((e) => { console.error("Auditoria falhou:", e?.stack || e); process.exitCode = 1; });
