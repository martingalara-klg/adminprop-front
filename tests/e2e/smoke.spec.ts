// Fase 0 — Scaffolding (#3) + Fase 1 — Shell real (#6). Smoke E2E: la app
// builda, sirve y monta el shell con routing lazy. No depende del backend
// (sin backend disponible, GET /auth/me falla como NETWORK_ERROR -- el
// bootstrap de sesión (#21) resuelve "sin sesión" igual que un 401 real).
//
// issue #6: `AppLayout` ahora exige sesión resuelta antes de mostrar
// cualquier módulo -- sin sesión, "/" redirige a "/login" (ver
// src/shared/routing/AppLayout.tsx). El happy path autenticado (CA-06-*)
// se cubre en Vitest (src/shared/routing/__tests__/); acá sólo el smoke de
// que el shell monta y el guard de sesión funciona end-to-end.

import { test, expect } from '@playwright/test'

test.describe('Scaffolding — App shell (#3) + shell real (#6)', () => {
  test('CA-06-02: sin sesión, la app carga y redirige a /login', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /ingresar a adminprop/i })).toBeVisible()
  })
})
