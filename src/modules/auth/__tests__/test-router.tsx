// src/modules/auth/__tests__/test-router.tsx
//
// Helper de test: monta las paginas de auth con un Router "clasico"
// (MemoryRouter + Routes), no el data router (createBrowserRouter) que usa
// App.tsx en produccion. jsdom no implementa el AbortSignal nativo que usa
// el fetcher interno del data router de React Router al navegar entre
// rutas (ver tests/e2e/smoke.spec.ts y src/__tests__/app-shell.spec.tsx
// para el mismo caveat) -- limitacion conocida del entorno de test, no del
// codigo de produccion. Este helper valida el comportamiento real de
// `navigate()` de cada pagina sin tropezar con esa limitacion.
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { LoginPage } from '../pages/LoginPage'
import { LogoutPage } from '../pages/LogoutPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { AcceptInvitationPage } from '../pages/AcceptInvitationPage'

// eslint-disable-next-line react-refresh/only-export-components -- helper de test, no un modulo de produccion
function HomeStub() {
  return <div>Propiedades</div>
}

// issue #45: stub de destino post-login de Super Admin -- válida el
// `navigate('/superadmin', ...)` de LoginPage sin montar el guard real
// (`RequireSuperAdmin`) ni el árbol de rutas de `/superadmin/*`, que ya
// tienen su propia cobertura en `src/shared/routing/__tests__`.
// eslint-disable-next-line react-refresh/only-export-components -- helper de test, no un modulo de produccion
function SuperAdminStub() {
  return <div>Organizaciones</div>
}

export function renderAuthApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<HomeStub />} />
          <Route path="/superadmin" element={<SuperAdminStub />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

export function renderElementAt(initialPath: string, element: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>{element}</MemoryRouter>
    </QueryClientProvider>,
  )
}
