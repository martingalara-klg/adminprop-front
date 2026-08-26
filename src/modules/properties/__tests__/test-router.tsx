// src/modules/properties/__tests__/test-router.tsx
//
// Helper de test: monta las páginas de propiedades con un Router
// "clásico" (MemoryRouter + Routes) — mismo motivo documentado en
// src/modules/people/__tests__/test-router.tsx (jsdom no implementa el
// AbortSignal nativo que usa el fetcher interno del data router de React
// Router al navegar entre rutas).
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { PropertiesListPage } from '../pages/PropertiesListPage'
import { PropertyDetailPage } from '../pages/PropertyDetailPage'

export function renderPropertiesApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/properties" element={<PropertiesListPage />} />
          <Route path="/properties/:propertyId" element={<PropertyDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
