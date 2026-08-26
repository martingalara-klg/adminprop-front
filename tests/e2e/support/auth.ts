// tests/e2e/support/auth.ts
//
// Helper de login para specs E2E — issue #16. Loguea contra el backend
// real (sesión vía cookies HttpOnly, sin bypass posible — ver
// src/api/http-client.ts) usando los usuarios sembrados por
// tests/e2e/seed/seed.py (docs/runbooks/E2E-LOCAL.md).

import { expect, type Page } from '@playwright/test'

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Contraseña').fill(password)
  await page.getByRole('button', { name: /ingresar/i }).click()

  // El shell autenticado (AppLayout) sólo monta la navegación principal
  // una vez que la sesión resolvió (GET /auth/me) -- ver
  // src/shared/routing/AppLayout.tsx. No hay heading fijo post-login: la
  // landing depende del primer nav item visible para el rol (HomeRedirect).
  await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()
}
