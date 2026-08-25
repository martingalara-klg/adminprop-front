// src/modules/contracts/__tests__/test-router.tsx
//
// Helper de test: monta las páginas de contratos con un Router "clásico"
// (MemoryRouter + Routes) — mismo motivo documentado en
// src/modules/properties/__tests__/test-router.tsx (jsdom no implementa
// el AbortSignal nativo que usa el fetcher interno del data router de
// React Router al navegar entre rutas).
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { ContractsListPage } from '../pages/ContractsListPage'
import { ContractDetailPage } from '../pages/ContractDetailPage'
import { AdjustmentsInboxPage } from '../pages/AdjustmentsInboxPage'

export function renderContractsApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/contracts" element={<ContractsListPage />} />
          <Route path="/contracts/adjustments" element={<AdjustmentsInboxPage />} />
          <Route path="/contracts/:contractId" element={<ContractDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
