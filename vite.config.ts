import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { defineConfig, Plugin } from 'vite';

function getDbData() {
  try {
    const dbPath = path.resolve(__dirname, 'data/db.json');
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    }
  } catch (err) {
    console.warn('[Vite API] Erro ao carregar data/db.json:', err);
  }
  return {
    settings: {},
    users: [],
    pages: [],
    news: [],
    events: [],
    projects: [],
    results: [],
    municipalities: [],
    videos: [],
    media: [],
    demands: [],
    auditLogs: [],
  };
}

let activeUserIndex = 0;

function apiServerPlugin(): Plugin {
  return {
    name: 'api-server-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        if (!url.startsWith('/api/')) {
          return next();
        }

        const pathname = url.split('?')[0];
        const db = getDbData();
        const currentUser = db.users?.[activeUserIndex] || db.users?.[0] || {
          id: 'usr-1',
          name: 'Carlos Búrigo',
          email: 'carlos.burigo@al.rs.gov.br',
          role: 'ADMIN',
          cargo: 'Deputado Estadual',
        };

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        if (pathname === '/api/auth/config' || pathname === '/api/supabase/config' || pathname === '/api/config') {
          res.end(JSON.stringify({
            success: true,
            supabaseUrl: 'https://wktanxbpijurimdjgone.supabase.co',
            supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdGFueGJwaWp1cmltZGpnb25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDU1NzgsImV4cCI6MjEwNTA4MTU3OH0.M7QA4vFdwhxSn1LSqlLV-SDw0XUvv8ZXxw07cn1cy0o',
            url: 'https://wktanxbpijurimdjgone.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdGFueGJwaWp1cmltZGpnb25lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1MDU1NzgsImV4cCI6MjEwNTA4MTU3OH0.M7QA4vFdwhxSn1LSqlLV-SDw0XUvv8ZXxw07cn1cy0o',
            configured: true,
            authMode: 'compatibility',
          }));
          return;
        }

        if (pathname === '/api/auth/me' || pathname === '/api/auth/session' || pathname === '/api/auth/user' || pathname === '/api/auth/current') {
          res.end(JSON.stringify({
            user: currentUser,
            session: { user: currentUser },
            allUsers: db.users || [currentUser],
            status: 'authenticated',
          }));
          return;
        }

        if (pathname === '/api/auth/switch-user') {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = JSON.parse(body || '{}');
              const foundIdx = (db.users || []).findIndex((u: any) => u.id === parsed.userId);
              if (foundIdx >= 0) activeUserIndex = foundIdx;
              const u = db.users?.[activeUserIndex] || currentUser;
              res.end(JSON.stringify({ success: true, user: u }));
            } catch {
              res.end(JSON.stringify({ success: true, user: currentUser }));
            }
          });
          return;
        }

        if (pathname === '/api/settings') {
          if (req.method === 'PUT' || req.method === 'POST') {
            res.end(JSON.stringify({ success: true, settings: db.settings }));
          } else {
            res.end(JSON.stringify(db.settings || {}));
          }
          return;
        }

        if (pathname === '/api/pages' || pathname === '/api/admin/pages') {
          res.end(JSON.stringify(db.pages || []));
          return;
        }

        if (pathname === '/api/news') {
          res.end(JSON.stringify(db.news || []));
          return;
        }

        if (pathname === '/api/agenda') {
          res.end(JSON.stringify(db.events || []));
          return;
        }

        if (pathname === '/api/projects') {
          res.end(JSON.stringify(db.projects || []));
          return;
        }

        if (pathname === '/api/results') {
          res.end(JSON.stringify(db.results || []));
          return;
        }

        if (pathname === '/api/municipalities') {
          res.end(JSON.stringify(db.municipalities || []));
          return;
        }

        if (pathname === '/api/videos') {
          res.end(JSON.stringify(db.videos || []));
          return;
        }

        if (pathname === '/api/media') {
          res.end(JSON.stringify(db.media || []));
          return;
        }

        if (pathname === '/api/demands') {
          res.end(JSON.stringify(db.demands || []));
          return;
        }

        if (pathname === '/api/audit-logs') {
          res.end(JSON.stringify(db.auditLogs || []));
          return;
        }

        if (pathname === '/api/tasks' || pathname === '/api/legislative' || pathname === '/api/documents') {
          res.end(JSON.stringify([]));
          return;
        }

        if (pathname === '/api/citizen/lookup') {
          const urlObj = new URL(url, 'http://localhost');
          const protocol = urlObj.searchParams.get('protocol') || '';
          const demand = (db.demands || []).find((d: any) => d.protocol === protocol);
          res.end(JSON.stringify(demand || null));
          return;
        }

        if (pathname === '/api/health') {
          res.end(JSON.stringify({ status: 'ok', app: 'Plataforma Carlos Búrigo' }));
          return;
        }

        // Generic JSON response for any other API routes
        res.end(JSON.stringify({ success: true, data: [] }));
      });
    },
  };
}

export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    apiServerPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
    watch: null,
  },
}));
