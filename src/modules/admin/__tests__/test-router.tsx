// src/modules/admin/__tests__/test-router.tsx
//
// Helper de test: monta las páginas de administración con un Router
// "clásico" (MemoryRouter + Routes) — mismo motivo documentado en
// src/superadmin/modules/organizations/__tests__/test-router.tsx (jsdom
// no implementa el AbortSignal nativo que usa el fetcher interno del
// data router de React Router al navegar entre rutas).
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { AdminUsersPage } from '../pages/AdminUsersPage'
import { AdminRolesPage } from '../pages/AdminRolesPage'
import { AdminSettingsPage } from '../pages/AdminSettingsPage'

export function renderAdminApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/admin" element={<AdminUsersPage />} />
          <Route path="/admin/roles" element={<AdminRolesPage />} />
          <Route path="/admin/settings" element={<AdminSettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
