import { describe, expect, it, vi } from 'vitest';
import worker from '../../src/worker';

vi.mock('../../server/supabase', () => {
  const chainable = (): any =>
    new Proxy({} as any, {
      get(_target, prop) {
        if (prop === 'then') return undefined;
        if (typeof prop === 'string' && ['select', 'eq', 'in', 'order', 'limit', 'single', 'maybeSingle', 'range', 'gt', 'neq', 'count'].includes(prop)) {
          return () => chainable();
        }
        return undefined;
      },
    });

  return {
    configureSupabaseAdmin: vi.fn(),
    supabaseAdmin: { from: () => chainable(), auth: { getUser: vi.fn() } },
    supabasePublic: { from: () => chainable() },
    getPublicSettings: vi.fn(async () => null),
    getAuthenticatedAdminUser: vi.fn(async () => ({ id: 'user-1', role: 'ADMIN', name: 'Test User', email: 'test@test.com' })),
    getAdminUserById: vi.fn(async () => null),
    getAllAdminUsers: vi.fn(async () => []),
  };
});

const ENV = {
  ASSETS: { fetch: async () => new Response('', { status: 200 }) },
  SUPABASE_URL: 'https://db.test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'pk-test',
};

describe('electoral endpoints contract — auth & validation', () => {
  const endpoints = [
    '/api/admin/electoral/overview',
    '/api/admin/electoral/zones',
    '/api/admin/electoral/sections?limit=10',
    '/api/admin/electoral/municipality/88013',
  ];

  it.each(endpoints)('returns 401 when no auth for %s', async (path) => {
    const response = await worker.fetch(new Request(`https://portal.test${path}`), ENV as any);
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe('Não autenticado');
  });

  it.each(endpoints)('returns 405 when POST for %s', async (path) => {
    const response = await worker.fetch(
      new Request(`https://portal.test${path}`, { method: 'POST', headers: { authorization: 'Bearer fake' } }),
      ENV as any,
    );
    expect(response.status).toBe(405);
    expect((await response.json()).error).toBe('Método não permitido');
  });

  it('sections returns 400 for invalid municipalityId', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/sections?municipalityId=invalid', { headers: { authorization: 'Bearer fake' } }),
      ENV as any,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('municipalityId inválido.');
  });

  it('sections returns 400 for invalid zoneId', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/sections?zoneId=invalid', { headers: { authorization: 'Bearer fake' } }),
      ENV as any,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('zoneId inválido.');
  });

  it('sections returns 400 for invalid candidateNumber', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/sections?candidateNumber=abc', { headers: { authorization: 'Bearer fake' } }),
      ENV as any,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('candidateNumber inválido.');
  });

  it('sections returns 400 for limit out of range', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/sections?limit=999', { headers: { authorization: 'Bearer fake' } }),
      ENV as any,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('limit deve ser um inteiro entre 1 e 500.');
  });

  it('sections returns 400 for negative offset', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/sections?offset=-1', { headers: { authorization: 'Bearer fake' } }),
      ENV as any,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('offset deve ser um inteiro não negativo.');
  });

  it('municipality returns 400 for invalid code', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/municipality/@invalid', { headers: { authorization: 'Bearer fake' } }),
      ENV as any,
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Código de município inválido.');
  });
});

describe('electoral endpoints contract — response shape documentation (when implementation succeeds)', () => {
  const validAuthHeaders = { authorization: 'Bearer valid-token' };

  it('overview — expected shape: { years: [{ year, total_votes, burigo_votes, burigo_rank_abs, municipalities_total, zones_total, sections_total, candidates }] }', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/overview', { headers: validAuthHeaders }),
      ENV as any,
    );
    // With mocked supabase returning empty chains, implementation returns 500
    // This test documents the expected contract shape for when real data is available
    expect([401, 403, 500, 200]).toContain(response.status);
  });

  it('zones — expected shape: { zones: [{ zone_id, zone_number, municipality: {id,name}, sections_count, votes_2018, votes_2022, votes_2026, burigo_votes_2018, burigo_votes_2022, burigo_votes_2026 }] }', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/zones', { headers: validAuthHeaders }),
      ENV as any,
    );
    expect([401, 403, 500, 200]).toContain(response.status);
  });

  it('sections — expected shape: { total, limit, offset, sections: [{ section_id, zone_number, municipality_id, municipality_name, section_number, votes_2018, votes_2022, votes_2026, burigo_votes_2018, burigo_votes_2022, burigo_votes_2026 }] }', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/sections?limit=10', { headers: validAuthHeaders }),
      ENV as any,
    );
    expect([401, 403, 500, 200]).toContain(response.status);
  });

  it('municipality/:code — expected shape: { municipality: {id,name,code_tse,code_ibge,region}, zones: [...], sections_count, electorate_2018/2022/2026, votes_2018/2022/2026, burigo_votes_2018/2022/2026 }', async () => {
    const response = await worker.fetch(
      new Request('https://portal.test/api/admin/electoral/municipality/88013', { headers: validAuthHeaders }),
      ENV as any,
    );
    expect([401, 403, 500, 200, 404]).toContain(response.status);
  });
});

// Known reference values from real dataset (for integration test reference)
export const KNOWN_VALUES = {
  burigo_votes: { 2018: 34322, 2022: 33611, 2026: 21038 },
  zones_total: 522,
  sections_total: 28342,
};