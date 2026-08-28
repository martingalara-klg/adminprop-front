// tests/e2e/payments.spec.ts
//
// issue #16 — E2E del flujo crítico "cobro con mora perdonada"
// (spec_module_04_cobranzas, CA-04-04/05/06). Usa el rent_period ya
// sembrado por tests/e2e/seed/seed.py: contrato activo, período vencido
// (2 meses atrás), amount_due=100000 ARS, daily_late_fee_pct=1%,
// grace_day=10 (org settings default). El seed resetea este período a
// `pending`/`paid_total=0` en cada corrida -- ver seed.py
// `seed_overdue_rent_period`.

import { test, expect } from '@playwright/test'
import { login } from './support/auth'
import { SEED } from './support/seed-data'

function monthsAgoPeriod(months: number): { year: number; month: number } {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() - months)
  return { year: date.getFullYear(), month: date.getMonth() + 1 }
}

function isoMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

test.describe('UC-COBRANZAS — Cobro con mora perdonada', () => {
  test('CA-16-05: paga un período vencido con perdón parcial de interés y queda pagado', async ({
    page,
  }) => {
    await login(page, SEED.owner.email, SEED.owner.password)

    const { year, month } = monthsAgoPeriod(2)
    // due_date = día grace_day (10) de ese período; pagamos el día 25 =>
    // 15 días de mora (interés = 100000 * 1% * 15 = 15000, sin ambigüedad
    // de redondeo).
    const paymentDate = isoDate(year, month, 25)

    await page.goto('/payments')
    await page.getByLabel('Período').fill(isoMonth(year, month))
    await page
      .getByLabel('Propiedad')
      .selectOption({ label: SEED.landlordWithOverdueRentPeriod.propertyAddress })

    const row = page.locator('tbody tr', {
      hasText: SEED.landlordWithOverdueRentPeriod.propertyAddress,
    })
    await expect(row).toBeVisible()
    await row.getByRole('link', { name: 'Registrar cobro' }).click()

    await expect(page).toHaveURL(/\/payments\/[^/]+$/)
    await expect(page.getByText(/^Estado: Pendiente/)).toBeVisible()

    await page.getByLabel('Fecha de pago').fill(paymentDate)

    // Interés sugerido calculado por el backend a la fecha de pago
    // (RN-P02/P03) -- 15 días de mora × 1% × 100.000 = 15.000 ARS.
    // Issue #56 punto 2: formatMoney oculta los centavos cuando son ,00.
    await expect(page.getByTestId('suggested-interest')).toHaveText('15.000 ARS')

    await page.getByLabel('Medio').selectOption('cash')
    await page.getByLabel('Moneda del pago').selectOption('ARS')
    await page.getByLabel('Importe a capital (ARS)').fill('100000')
    await page.getByLabel('Destino').selectOption('agency_account')
    // Perdón parcial: cobra 5.000 de los 15.000 sugeridos -> 10.000 perdonados.
    await page.getByLabel('Interés cobrado').fill('5000')

    await expect(page.getByTestId('forgiven-interest-preview')).toHaveText('10.000 ARS')

    await page.getByRole('button', { name: 'Registrar cobro' }).click()

    await expect(
      page.getByText('Cobro registrado — ver el historial de cobros abajo.'),
    ).toBeVisible()

    // El período queda pagado (importe a capital = balance total).
    await expect(page.getByText(/^Estado: Pagado/)).toBeVisible()
    await expect(page.getByText(/Este período ya está pagado/)).toBeVisible()

    // El cobro en el historial muestra sugerido/cobrado/perdonado.
    const historyRow = page.getByTestId('payment-history-row').first()
    await expect(historyRow.locator('td').nth(6)).toHaveText('15.000') // sugerido
    await expect(historyRow.locator('td').nth(7)).toHaveText('5.000') // cobrado
    await expect(historyRow.locator('td').nth(8)).toHaveText('10.000') // perdonado
  })
})
