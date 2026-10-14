import { test, expect } from '@playwright/test';
import { trackPageErrors, RENDER_TIMEOUT } from './helpers';

test.describe('Inteligência Eleitoral — Admin Workspace', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    // Login como admin (bootstrap ou credenciais)
    await page.goto('/admin');
    // Se estiver na tela de login, preencher credenciais de teste
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 5000 })) {
      await emailInput.fill('admin@test.local');
      await page.locator('input[type="password"]').first().fill('senha123');
      await page.locator('button[type="submit"]').click();
      await page.waitForURL('**/admin**', { timeout: 30000 });
    }
    // Navegar para módulo de inteligência eleitoral
    await page.goto('/admin?module=inteligencia-eleitoral');
    await page.waitForLoadState('networkidle');
  });

  test('acessa módulo de inteligência eleitoral e renderiza sidebar', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await expect(page.locator('text=Inteligência Eleitoral').first()).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.locator('text=Dep. Carlos Búrigo · RS')).toBeVisible();

    // Verificar itens de navegação da sidebar
    const navItems = [
      'Visão Geral',
      'Desempenho Eleitoral',
      'Análise Territorial',
      'Comparação de Candidatos',
      'Concentração de Votos',
      'Zonas e Seções',
      'Análise Espacial',
      'Relatórios Analíticos',
      'Metodologia'
    ];

    for (const item of navItems) {
      await expect(page.locator(`text=${item}`).first()).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-01-sidebar.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('navega entre views via sidebar', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    const views = [
      { tab: 'overview', label: 'Visão Geral', marker: 'Total de Votos' },
      { tab: 'performance', label: 'Desempenho Eleitoral', marker: 'Evolução' },
      { tab: 'territorial', label: 'Análise Territorial', marker: 'Hierarquia' },
      { tab: 'comparison', label: 'Comparação de Candidatos', marker: 'Matriz' },
      { tab: 'concentration', label: 'Concentração de Votos', marker: 'HHI' },
      { tab: 'zones-sections', label: 'Zonas e Seções', marker: 'Investigação microterritorial' },
      { tab: 'spatial', label: 'Análise Espacial', marker: 'Mapa' },
      { tab: 'reports', label: 'Relatórios Analíticos', marker: 'Documentos' },
      { tab: 'methodology', label: 'Metodologia', marker: 'Fórmulas' }
    ];

    for (const view of views) {
      await page.locator(`text=${view.label}`).first().click();
      await page.waitForLoadState('networkidle');
      await expect(page.locator(`text=${view.marker}`).first()).toBeVisible({ timeout: RENDER_TIMEOUT });
      await page.screenshot({ path: `.superpowers/evidence/eleitoral-02-${view.tab}.png`, fullPage: true });
    }

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('abre e interage com GlobalFiltersModal', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    // Clicar no botão de filtros globais (no Header)
    await page.locator('button:has-text("Filtros"), button[aria-label*="filtro" i]').first().click();
    await expect(page.locator('text=Filtros Globais').first()).toBeVisible({ timeout: 5000 });

    // Verificar campos do modal
    await expect(page.locator('text=Ano Inicial').first()).toBeVisible();
    await expect(page.locator('text=Ano Final').first()).toBeVisible();
    await expect(page.locator('text=Cargo').first()).toBeVisible();
    await expect(page.locator('text=Turno').first()).toBeVisible();
    await expect(page.locator('text=Estado').first()).toBeVisible();
    await expect(page.locator('text=Município').first()).toBeVisible();
    await expect(page.locator('text=Candidato Principal').first()).toBeVisible();
    await expect(page.locator('text=Candidato de Comparação').first()).toBeVisible();

    // Alterar ano final para 2026
    await page.locator('select[name="endYear"], select[id*="endYear"]').first().selectOption('2026');
    await page.locator('button:has-text("Aplicar"), button[type="submit"]').first().click();

    await expect(page.locator('text=2026').first()).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: '.superpowers/evidence/eleitoral-03-filters.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('exibe ActiveFiltersBar com filtros ativos', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    // Verificar barra de filtros ativos
    await expect(page.locator('text=Filtros ativos').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Ano:').first()).toBeVisible();
    await expect(page.locator('text=Candidato:').first()).toBeVisible();

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-04-active-filters.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renderiza OverviewView com KPIs e gráfico', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.locator('text=Visão Geral').first().click();
    await page.waitForLoadState('networkidle');

    // Verificar KPIs principais
    await expect(page.locator('text=Total de Votos').first()).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.locator('text=Participação').first()).toBeVisible();
    await expect(page.locator('text=Cobertura').first()).toBeVisible();

    // Verificar se há gráfico (canvas ou svg)
    const chart = page.locator('canvas, svg[role="img"]').first();
    await expect(chart).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-05-overview.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renderiza PerformanceView com evolução histórica', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.locator('text=Desempenho Eleitoral').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Evolução').first()).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.locator('text=Saldos').first()).toBeVisible();

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-06-performance.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renderiza TerritorialView com hierarquia município/zona/seção', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.locator('text=Análise Territorial').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Hierarquia').first()).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.locator('text=Município').first()).toBeVisible();

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-07-territorial.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renderiza ComparisonView com matriz de candidatos', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.locator('text=Comparação de Candidatos').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Matriz').first()).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.locator('text=Confronto').first()).toBeVisible();

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-08-comparison.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renderiza ConcentrationView com HHI/Lorenz/Gini', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.locator('text=Concentração de Votos').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=HHI').first()).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.locator('text=Lorenz').first()).toBeVisible();
    await expect(page.locator('text=Gini').first()).toBeVisible();

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-09-concentration.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renderiza ZonesSectionsView com investigação microterritorial', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.locator('text=Zonas e Seções').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Investigação microterritorial').first()).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.locator('text=Zona').first()).toBeVisible();

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-10-zones-sections.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renderiza SpatialView com mapa Leaflet', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.locator('text=Análise Espacial').first().click();
    await page.waitForLoadState('networkidle');

    // Aguardar carregamento do mapa Leaflet
    await expect(page.locator('.leaflet-container').first()).toBeVisible({ timeout: RENDER_TIMEOUT });

    // Verificar alternador de motor (Leaflet vs Vetor)
    await expect(page.locator('text=Mapa Leaflet').first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-11-spatial.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renderiza ReportsView com documentos exportáveis', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.locator('text=Relatórios Analíticos').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Documentos').first()).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.locator('text=Exportar').first()).toBeVisible();

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-12-reports.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('renderiza MethodologyView com fórmulas', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.locator('text=Metodologia').first().click();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Fórmulas').first()).toBeVisible({ timeout: RENDER_TIMEOUT });
    await expect(page.locator('text=Limites estatísticos').first()).toBeVisible();

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-13-methodology.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('ContextualAssistant abre e responde a pergunta', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    // Abrir assistente contextual
    await page.locator('button[aria-label*="assistente" i], button:has-text("Assistente")').first().click();
    await expect(page.locator('text=Assistente Contextual').first()).toBeVisible({ timeout: 5000 });

    // Digitar pergunta
    const input = page.locator('textarea[placeholder*="pergunta" i], input[placeholder*="pergunta" i]').first();
    await input.fill('Quantos votos o candidato teve em 2022?');
    await page.locator('button:has-text("Enviar"), button[type="submit"]').first().click();

    // Aguardar resposta
    await expect(page.locator('text=Total de Votos').first()).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-14-assistant.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('Header exibe título e breadcrumbs', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await expect(page.locator('text=Inteligência Eleitoral').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Visão Geral').first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-15-header.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});

test.describe('Inteligência Eleitoral — Fluxo completo de investigação', () => {
  test.setTimeout(300_000);

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin?module=inteligencia-eleitoral');
    await page.waitForLoadState('networkidle');
  });

  test('investigação: seleciona candidato, filtra ano, navega views, exporta relatório', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    // 1. Abrir filtros e selecionar candidato
    await page.locator('button:has-text("Filtros"), button[aria-label*="filtro" i]').first().click();
    const candidateSelect = page.locator('select[name="mainCandidateId"], select[id*="mainCandidate"]').first();
    const burigoOption = candidateSelect.locator('option').filter({ hasText: /Búrigo/i }).first();
    const burigoValue = await burigoOption.getAttribute('value');
    expect(burigoValue).toBeTruthy();
    await candidateSelect.selectOption(burigoValue!);
    await page.locator('button:has-text("Aplicar")').first().click();
    await page.waitForLoadState('networkidle');

    // 2. Navegar: Overview -> Territorial -> Comparison
    await page.locator('text=Visão Geral').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Total de Votos').first()).toBeVisible({ timeout: RENDER_TIMEOUT });

    await page.locator('text=Análise Territorial').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Hierarquia').first()).toBeVisible({ timeout: RENDER_TIMEOUT });

    await page.locator('text=Comparação de Candidatos').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Matriz').first()).toBeVisible({ timeout: RENDER_TIMEOUT });

    // 3. Abrir assistente e fazer pergunta de follow-up
    await page.locator('button[aria-label*="assistente" i], button:has-text("Assistente")').first().click();
    await page.locator('textarea[placeholder*="pergunta" i]').first().fill('Compare com o principal concorrente');
    await page.locator('button:has-text("Enviar")').first().click();
    await expect(page.locator('text=Gap').first()).toBeVisible({ timeout: 15000 });

    // 4. Exportar relatório (Reports view)
    await page.locator('text=Relatórios Analíticos').first().click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('button:has-text("Exportar"), button:has-text("Download")').first()).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-16-full-flow.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});