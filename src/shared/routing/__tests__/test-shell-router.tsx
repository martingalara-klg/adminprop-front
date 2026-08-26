// src/shared/routing/__tests__/test-shell-router.tsx
//
// Helper de test para el shell (#6). Usa `MemoryRouter` + `Routes`
// "clásico" -- NO el data router (`createMemoryRouter`) que usa
// `src/routes.tsx` en producción -- por el mismo motivo documentado en
// `src/modules/auth/__tests__/test-router.tsx`: jsdom no implementa el
// `AbortSignal` nativo que usa el fetcher interno de React Router cuando
// una navegación cruza rutas de nivel superior (ej: "/" -> "/login",
// "/superadmin/..." -> "/"). El guard/redirect real (`<Navigate>`) es el
// mismo código de producción; sólo cambia el árbol de rutas que lo monta.
import type { ReactElement } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { AppLayout } from '../AppLayout'
import { RequireSuperAdmin } from '../RequireSuperAdmin'
import { HomeRedirect } from '../HomeRedirect'
import { LoginPage } from '@/modules/auth/pages/LoginPage'
import { PropertiesListPage } from '@/modules/properties/pages/PropertiesListPage'
import { MaintenanceListPage } from '@/modules/maintenance/pages/MaintenanceListPage'
import { OrganizationsListPage } from '@/superadmin/modules/organizations/pages/OrganizationsListPage'

function stubPage(label: string): ReactElement {
  return <div>{label}</div>
}

export function renderShellApp(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<HomeRedirect />} />
            <Route path="properties" element={<PropertiesListPage />} />
            <Route path="people" element={stubPage('Personas')} />
            <Route path="contracts" element={stubPage('Contratos')} />
            <Route path="payments" element={stubPage('Cobranzas')} />
            <Route path="settlements" element={stubPage('Liquidaciones')} />
            <Route path="maintenance" element={<MaintenanceListPage />} />
            <Route path="admin" element={stubPage('Administración')} />
            <Route path="notifications" element={stubPage('Notificaciones')} />
            <Route path="account" element={stubPage('Mi cuenta')} />
          </Route>
          <Route path="/superadmin" element={<RequireSuperAdmin />}>
            <Route path="organizations" element={<OrganizationsListPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
