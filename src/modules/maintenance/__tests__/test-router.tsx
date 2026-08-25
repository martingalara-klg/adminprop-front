// src/modules/maintenance/__tests__/test-router.tsx
//
// Helper de test: monta las páginas de mantenimiento con un Router
// "clásico" (MemoryRouter + Routes) — mismo motivo documentado en
// src/modules/properties/__tests__/test-router.tsx (jsdom no implementa
// el AbortSignal nativo que usa el fetcher interno del data router de
// React Router al navegar entre rutas).
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { MaintenanceListPage } from '../pages/MaintenanceListPage'
import { WorkOrderCreatePage } from '../pages/WorkOrderCreatePage'
import { WorkOrderDetailPage } from '../pages/WorkOrderDetailPage'

export function renderMaintenanceApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/maintenance" element={<MaintenanceListPage />} />
          <Route path="/maintenance/new" element={<WorkOrderCreatePage />} />
          <Route path="/maintenance/:workOrderId" element={<WorkOrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
