// src/modules/notifications/__tests__/test-router.tsx
//
// Helper de test — monta <NotificationBell/> dentro de un header stub
// junto con las rutas de destino reales (bandeja de ajustes, ficha de
// contrato, ficha de pedido, página completa de notificaciones) para
// poder verificar la navegación por `event_type`/payload (CA-NT-04 lado
// UI). Mismo patrón "Router clásico" que el resto de los test-router.tsx
// del repo (MemoryRouter + Routes, no el data router de producción).
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'

import { NotificationBell } from '../components/NotificationBell'
import { NotificationsListPage } from '../pages/NotificationsListPage'

function stubPage(label: string) {
  return <div>{label}</div>
}

export function renderNotificationsApp(initialPath: string): ReturnType<typeof render> {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/" element={<NotificationBell />} />
          <Route path="/notifications" element={<NotificationsListPage />} />
          <Route path="/contracts/adjustments" element={stubPage('Bandeja de ajustes')} />
          <Route path="/contracts/:contractId" element={stubPage('Ficha de contrato')} />
          <Route path="/maintenance/:workOrderId" element={stubPage('Ficha de pedido')} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
