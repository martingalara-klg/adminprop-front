// src/modules/payments/__tests__/test-router.tsx
//
// Helper de test: monta las páginas de cobranzas con un Router "clásico"
// (MemoryRouter + Routes) — mismo motivo documentado en
// src/modules/contracts/__tests__/test-router.tsx (jsdom no implementa
// el AbortSignal nativo que usa el fetcher interno del data router de
// React Router al navegar entre rutas).
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { PaymentsListPage } from '../pages/PaymentsListPage'
import { RentPeriodDetailPage } from '../pages/RentPeriodDetailPage'
import { DebtPage } from '../pages/DebtPage'

export function renderPaymentsApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/payments" element={<PaymentsListPage />} />
          <Route path="/payments/debt" element={<DebtPage />} />
          <Route path="/payments/:rentPeriodId" element={<RentPeriodDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
