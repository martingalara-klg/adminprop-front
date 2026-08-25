// src/superadmin/modules/organizations/__tests__/test-router.tsx
//
// Helper de test: monta las páginas de superadmin/organizations con un
// Router "clásico" (MemoryRouter + Routes) — mismo motivo documentado en
// src/modules/auth/__tests__/test-router.tsx (jsdom no implementa el
// AbortSignal nativo que usa el fetcher interno del data router de React
// Router al navegar entre rutas).
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { OrganizationsListPage } from '../pages/OrganizationsListPage'
import { OrganizationDetailPage } from '../pages/OrganizationDetailPage'

export function renderOrganizationsApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/superadmin/organizations" element={<OrganizationsListPage />} />
          <Route
            path="/superadmin/organizations/:organizationId"
            element={<OrganizationDetailPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
