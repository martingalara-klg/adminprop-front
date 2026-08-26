// src/modules/people/__tests__/test-router.tsx
//
// Helper de test: monta las páginas de personas con un Router "clásico"
// (MemoryRouter + Routes) — mismo motivo documentado en
// src/modules/admin/__tests__/test-router.tsx (jsdom no implementa el
// AbortSignal nativo que usa el fetcher interno del data router de React
// Router al navegar entre rutas).
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { LandlordsListPage } from '../pages/LandlordsListPage'
import { LandlordDetailPage } from '../pages/LandlordDetailPage'
import { RentersListPage } from '../pages/RentersListPage'
import { RenterDetailPage } from '../pages/RenterDetailPage'

export function renderPeopleApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/people" element={<LandlordsListPage />} />
          <Route path="/people/landlords/:landlordId" element={<LandlordDetailPage />} />
          <Route path="/people/renters" element={<RentersListPage />} />
          <Route path="/people/renters/:renterId" element={<RenterDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
