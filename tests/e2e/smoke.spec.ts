// Fase 0 — Scaffolding (#3). Smoke E2E: la app builda, sirve y monta el
// shell con routing lazy. No depende del backend (placeholders sin API).

import { test, expect } from '@playwright/test'

test.describe('Scaffolding — App shell (#3)', () => {
  test('CA-03-01: la app carga y redirige al módulo default', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Propiedades')).toBeVisible()
  })
})
