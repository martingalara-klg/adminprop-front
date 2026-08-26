// tests/e2e/settlements.spec.ts
//
// issue #16 — E2E del flujo crítico "wizard de liquidación"
// (spec_module_05_liquidaciones §Wizard: select_period → review →
// exchange_rate → confirmation, CA-05-03/08). Requiere `documents_worker`
// (Celery, queue `documents`) corriendo -- sin él, el job de generación
// nunca sale de `processing` -- ver docs/runbooks/RUNBOOK-LOCAL-002-frontend.md
// §"E2E (Playwright)". Usa el landlord/propiedad/concepto recurrente ya
// sembrados por tests/e2e/seed/seed.py (sin contrato ni rent_period --
// aislado del fixture de payments.spec.ts para no cruzar advertencias del
// checklist de revisión).

import { test, expect } from '@playwright/test'
import { login } from './support/auth'
import { SEED } from './support/seed-data'

test.describe('UC-LIQUIDACIONES — Wizard de generación', () => {
  test('CA-16-06: carga los cargos del mes, corre el wizard de 4 pasos y ve el detalle con line items', async ({
    page,
  }) => {
    // adminprop-back#89 (resuelto, PR adminprop-back#91) arregló el
    // import circular entre notification_worker.py y
    // administracion/service.py que hacía crashear cualquier worker
    // Celery al arrancar. `documents_worker` corre ahora tanto en Docker
    // (docker-compose.yml --profile workers) como fuera de Docker (CI),
    // así que el job de generación llega a completed/with_errors y el
    // polling post-generar deja de estar bloqueado. Ver issue #39.
    test.setTimeout(90_000)
    await login(page, SEED.owner.email, SEED.owner.password)

    // ── Paso previo: cargar los cargos del mes (RF-05, CA-05-08) ──────
    await page.goto('/settlements/charges')
    await expect(page.getByRole('heading', { name: 'Cargos del mes' })).toBeVisible()

    const checklist = page.getByTestId('charge-verification-checklist')
    const chargeRow = checklist.locator('tr', {
      hasText: SEED.settlementsLandlord.propertyAddress,
    })
    await expect(chargeRow).toBeVisible()
    await expect(chargeRow.getByTestId('charge-missing-badge')).toHaveText('Falta cargar')
    await chargeRow.getByLabel('Importe').fill(SEED.settlementsLandlord.chargeAmount)
    await chargeRow.getByRole('button', { name: 'Cargar' }).click()
    await expect(chargeRow.getByTestId('charge-missing-badge')).not.toBeVisible()

    // ── Wizard de liquidación ──────────────────────────────────────────
    await page.goto('/settlements/new')
    await expect(page.getByRole('heading', { name: 'Nueva liquidación' })).toBeVisible()

    // Paso 1/4 — select_period.
    await page
      .getByLabel('Propietario')
      .selectOption({ label: SEED.settlementsLandlord.name })
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Paso 2/4 — review (sin contrato/rent_period ni reparaciones para
    // este landlord, y el cargo ya está cargado -> sin advertencias).
    await expect(page.getByTestId('settlement-review-checklist')).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()

    // Paso 4/4 — confirmation (paso 3 exchange_rate se salta: landlord
    // sin montos USD en el período, ver SettlementWizardPage.tsx).
    await expect(page.getByTestId('settlement-confirmation-summary')).toBeVisible()
    await page.getByRole('button', { name: 'Generar liquidación' }).click()

    // Polling hasta estado terminal (completed o with_errors -- ambos
    // renderizan el mismo testid "settlement-job-completed").
    await expect(page.getByTestId('settlement-job-completed')).toBeVisible({ timeout: 60_000 })

    await page.getByRole('button', { name: 'Ver detalle' }).click()
    await expect(page).toHaveURL(/\/settlements\/[^/]+$/)

    const lineItems = page.getByTestId('settlement-line-items')
    await expect(lineItems).toBeVisible()
    await expect(lineItems.getByText('Cargo')).toBeVisible()
  })
})
