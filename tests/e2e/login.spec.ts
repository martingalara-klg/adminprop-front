// tests/e2e/login.spec.ts
//
// issue #16 — E2E del flujo crítico de login (UC-LOGIN, sdd_04 §2.2a
// anti-enumeration). Corre contra el backend real sembrado por
// tests/e2e/seed/seed.py -- ver docs/runbooks/E2E-LOCAL.md.

import { test, expect } from '@playwright/test'
import { login } from './support/auth'
import { SEED } from './support/seed-data'

test.describe('UC-LOGIN — Autenticación', () => {
  test('CA-16-01: usuario semilla hace login OK y ve el shell con navegación según su rol', async ({
    page,
  }) => {
    await login(page, SEED.owner.email, SEED.owner.password)

    await expect(page).not.toHaveURL(/\/login$/)

    const nav = page.getByRole('navigation', { name: 'Navegación principal' })
    // El owner tiene todos los permisos de negocio -- ve todos los módulos
    // (CLAUDE.md §4: navegación filtrada por permissions[], nunca role_name).
    await expect(nav.getByRole('link', { name: 'Propiedades' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Contratos' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Cobranzas' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Liquidaciones' })).toBeVisible()
  })

  test('CA-16-02: credenciales malas muestran el mensaje anti-enumeration literal', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(SEED.owner.email)
    await page.getByLabel('Contraseña').fill(SEED.invalidPassword)
    await page.getByRole('button', { name: /ingresar/i }).click()

    // sdd_04 §2.2a -- texto literal, idéntico para email inexistente y
    // password incorrecta (no discrimina cuál de los dos falló).
    await expect(page.getByText('Credenciales incorrectas.')).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('CA-16-03: email inexistente muestra el mismo mensaje anti-enumeration (no revela existencia)', async ({
    page,
  }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill('no-existe.e2e@adminprop.local')
    await page.getByLabel('Contraseña').fill(SEED.invalidPassword)
    await page.getByRole('button', { name: /ingresar/i }).click()

    await expect(page.getByText('Credenciales incorrectas.')).toBeVisible()
  })
})
