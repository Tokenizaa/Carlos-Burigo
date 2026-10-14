import { test, expect } from '@playwright/test';
import { trackPageErrors, RENDER_TIMEOUT } from './helpers';

test.describe('Inteligência Eleitoral — Smoke Tests', () => {
  test.setTimeout(300_000);

  test('página admin carrega', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).toBeVisible({ timeout: RENDER_TIMEOUT });

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-smoke-01-admin.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('módulo inteligemcia-eleitoral acessível via URL', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.goto('/admin?module=inteligencia-eleitoral', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#root')).not.toContainText('404');

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-smoke-02-module.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('sidebar renderiza itens de navegação', async ({ page }) => {
    const { pageErrors, consoleErrors } = trackPageErrors(page);

    await page.goto('/admin?module=inteligencia-eleitoral', { waitUntil: 'domcontentloaded' });

    // Aguardar o spinner desaparecer (dados carregarem)
    await page.waitForFunction(() => {
      const spinner = document.querySelector('.animate-spin');
      return !spinner;
    }, { timeout: 300000 });

    // Aguardar React hidratar e renderizar o conteúdo
    await page.waitForFunction(() => {
      const sidebar = document.querySelector('aside');
      return sidebar && sidebar.textContent?.includes('Visão Geral');
    }, { timeout: 120000 });

    // Verificar sidebar
    const sidebar = page.locator('aside').first();
    await expect(sidebar).toBeVisible({ timeout: 10000 });

    // Verificar textos da navegação
    await expect(page.locator('text=Visão Geral').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Desempenho Eleitoral').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Análise Territorial').first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: '.superpowers/evidence/eleitoral-smoke-03-sidebar.png', fullPage: true });

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});