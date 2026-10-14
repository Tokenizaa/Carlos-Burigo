import { createClient, SupabaseClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://wktanxbpijurimdjgone.supabase.co';
const DEFAULT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdGFueGJwaWp1cmltZGpnb25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDU1NzgsImV4cCI6MjEwNTA4MTU3OH0.M7QA4vFdwhxSn1LSqlLV-SDw0XUvv8ZXxw07cn1cy0o';

export interface SupabaseAuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  url?: string;
  anonKey?: string;
}

let cachedClient: SupabaseClient | null = null;

export async function loadAuthConfig(): Promise<SupabaseAuthConfig> {
  try {
    const res = await fetch('/api/auth/config');
    if (res.ok) {
      const data = await res.json();
      if (data?.supabaseUrl && (data?.supabaseAnonKey || data?.anonKey)) {
        return {
          supabaseUrl: data.supabaseUrl,
          supabaseAnonKey: data.supabaseAnonKey || data.anonKey,
          url: data.supabaseUrl,
          anonKey: data.supabaseAnonKey || data.anonKey,
        };
      }
    }
  } catch (err) {
    console.warn('[SupabaseClient] Falha ao consultar endpoint de configuração, usando parâmetros padrão:', err);
  }

  return {
    supabaseUrl: DEFAULT_URL,
    supabaseAnonKey: DEFAULT_KEY,
    url: DEFAULT_URL,
    anonKey: DEFAULT_KEY,
  };
}

export function getSupabaseClient(url = DEFAULT_URL, key = DEFAULT_KEY): SupabaseClient {
  if (!cachedClient) {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return cachedClient;
}

export const supabase = getSupabaseClient();

export async function initAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[SupabaseClient] Erro na inicialização da autenticação:', err);
  }
  return null;
}

export default supabase;
