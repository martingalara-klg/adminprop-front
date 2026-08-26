// src/modules/settlements/__tests__/test-router.tsx
//
// Helper de test: monta las páginas de liquidaciones con un Router
// "clásico" (MemoryRouter + Routes) — mismo motivo documentado en
// src/modules/maintenance/__tests__/test-router.tsx (jsdom no implementa
// el AbortSignal nativo que usa el fetcher interno del data router de
// React Router al navegar entre rutas).
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { SettlementsListPage } from '../pages/SettlementsListPage'
import { ChargesMonthPage } from '../pages/ChargesMonthPage'
import { SettlementWizardPage } from '../pages/SettlementWizardPage'
import { SettlementDetailPage } from '../pages/SettlementDetailPage'

export function renderSettlementsApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/settlements" element={<SettlementsListPage />} />
          <Route path="/settlements/charges" element={<ChargesMonthPage />} />
          <Route path="/settlements/new" element={<SettlementWizardPage />} />
          <Route path="/settlements/:settlementId" element={<SettlementDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
