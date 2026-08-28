// tests/e2e/contracts.spec.ts
//
// issue #16 — E2E del flujo crítico "alta de contrato" (spec_module_03,
// CA-03-01/02). Usa la propiedad + inquilino ya sembrados por
// tests/e2e/seed/seed.py (docs/runbooks/E2E-LOCAL.md) -- el alta de
// propiedad/persona en sí ya tiene su propia cobertura E2E potencial
// (issues #10/#9); acá el flujo bajo prueba es contrato: crear → activar
// → verlo activo. La propiedad sembrada para este contrato (distinta de
// la usada por payments/settlements) no tiene ningún otro contrato
// `draft` u `active` -- así la nueva fila en la tabla es identificable
// sin depender del formato exacto de fecha (Intl.DateTimeFormat('es-AR')
// no rellena con ceros, ej. "5/8/2026", no "05/08/2026").

import { test, expect } from '@playwright/test'
import { login } from './support/auth'
import { SEED } from './support/seed-data'

function isoDateDaysAgo(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function isoDateDaysAhead(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

test.describe('UC-CONTRATOS — Alta y activación de contrato', () => {
  test('CA-16-04: crea un contrato ARS, lo activa y lo ve activo', async ({ page }) => {
    await login(page, SEED.owner.email, SEED.owner.password)

    await page.goto('/contracts')
    await expect(page.getByRole('heading', { name: 'Contratos' })).toBeVisible()

    const startDate = isoDateDaysAgo(5)
    const endDate = isoDateDaysAhead(365)

    // Issue #48: el form de alta vive en un modal — se abre desde el
    // botón "Nuevo contrato" del listado.
    await page.getByRole('button', { name: 'Nuevo contrato' }).click()

    await page.getByLabel('Propiedad').selectOption({ label: SEED.property.address })
    await page.getByLabel('Inquilino').selectOption({ label: SEED.renter.name })
    await page.getByLabel('Moneda').selectOption('ARS')
    await page.getByLabel('Monto inicial').fill('150000')
    await page.getByLabel('Fecha de inicio').fill(startDate)
    await page.getByLabel('Fecha de fin').fill(endDate)
    await page.getByLabel('% de mora diaria').fill('0.1')
    await page.getByRole('button', { name: 'Crear contrato' }).click()

    // Único contrato `draft` de la organización sembrada -- ver nota de
    // cabecera. Filtramos por moneda + estado en vez de por fecha
    // formateada.
    const table = page.getByTestId('contracts-table')
    const draftRow = table.locator('tr', { hasText: 'Borrador' }).filter({ hasText: 'ARS' })
    await expect(draftRow).toBeVisible()

    await draftRow.getByRole('link', { name: 'Ver contrato' }).click()
    await expect(page).toHaveURL(/\/contracts\/[^/]+$/)
    // Issue #56 (cierra #38): la ficha ya no muestra el status crudo del
    // backend — badge legible es-AR, igual que el listado.
    await expect(page.getByText('Borrador', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Activar contrato' }).click()
    await page.getByRole('button', { name: 'Confirmar activación' }).click()

    // RF-03: `draft -> active`, sin CONTRACT_OVERLAP porque la propiedad
    // sembrada no tiene otro contrato activo vigente.
    await expect(page.getByText('Activo', { exact: true })).toBeVisible()
  })
})
