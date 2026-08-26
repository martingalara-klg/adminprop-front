// src/modules/notifications/__tests__/notifications.spec.tsx
//
// SDD: infrastructure/spec_notificaciones.md RF-02 + sdd_03 §13. Issue
// #15 (Fase 8) — CA-NT-04 (lado UI): "El badge muestra las no leídas del
// usuario; read-all las marca todas y el badge queda en cero", más los
// FA de navegación por evento y el gate de permiso `notification:read`.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import type { Notification } from '@/api/notifications.api'
import { renderNotificationsApp } from './test-router'

vi.mock('@/api/notifications.api', () => ({
  notificationsApi: {
    list: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

import { notificationsApi } from '@/api/notifications.api'

const OWNER_SESSION = buildSession({
  userId: 'u-owner',
  email: 'owner@inmobiliaria-sur.com',
  fullName: 'Owner Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
  permissions: ['notification:read', 'contract:read'],
  isSuperAdmin: false,
})

// maintenance también ve la campanita (recibe work_order_created y quote_approved).
const MAINTENANCE_SESSION = buildSession({
  userId: 'u-maint',
  email: 'maint@inmobiliaria-sur.com',
  fullName: 'Mantenimiento Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'maintenance' },
  permissions: ['notification:read', 'work-order:read'],
  isSuperAdmin: false,
})

function setSession(session: ReturnType<typeof buildSession>) {
  useSessionStore.setState({ session, logoutReason: null, isBootstrapping: false })
}

function makeNotification(overrides: Partial<Notification>): Notification {
  return {
    id: 'n-default',
    event_type: 'adjustment_pending',
    payload: {},
    read_at: null,
    created_at: '2026-08-20T10:00:00Z',
    ...overrides,
  }
}

let serverNotifications: Notification[]

function unreadCount(): number {
  return serverNotifications.filter((n) => !n.read_at).length
}

beforeEach(() => {
  serverNotifications = [
    makeNotification({
      id: 'n-1',
      event_type: 'adjustment_pending',
      payload: { contract_id: 'c-1', adjustment_id: 'adj-1', due_period: '2026-09-01' },
      read_at: null,
      created_at: '2026-08-20T10:00:00Z',
    }),
    makeNotification({
      id: 'n-2',
      event_type: 'contract_expiring',
      payload: { contract_id: 'c-2' },
      read_at: '2026-08-15T09:00:00Z',
      created_at: '2026-08-15T08:00:00Z',
    }),
  ]

  vi.mocked(notificationsApi.list).mockImplementation(async () => ({
    data: serverNotifications,
    meta: { unread_count: unreadCount() },
  }))
  vi.mocked(notificationsApi.markRead).mockImplementation(async (notificationId: string) => {
    serverNotifications = serverNotifications.map((n) =>
      n.id === notificationId ? { ...n, read_at: '2026-08-20T11:00:00Z' } : n,
    )
    return { data: serverNotifications.find((n) => n.id === notificationId)! }
  })
  vi.mocked(notificationsApi.markAllRead).mockImplementation(async () => {
    serverNotifications = serverNotifications.map((n) => ({
      ...n,
      read_at: n.read_at ?? '2026-08-20T11:00:00Z',
    }))
    return { data: { marked: unreadCount() } }
  })
})

afterEach(() => {
  useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
  localStorage.clear()
  vi.clearAllMocks()
})

describe('UC-20 — Panel de notificaciones + badge (#15)', () => {
  it('CA-NT-04: sin el permiso notification:read no muestra la campanita ni consulta el backend', async () => {
    setSession(
      buildSession({
        userId: 'u-x',
        email: 'x@a.com',
        fullName: 'Sin Permiso',
        organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
        permissions: [],
        isSuperAdmin: false,
      }),
    )

    renderNotificationsApp('/')

    expect(screen.queryByRole('button', { name: /notificaciones/i })).not.toBeInTheDocument()
    expect(notificationsApi.list).not.toHaveBeenCalled()
  })

  it('CA-NT-04: el badge muestra las no leídas del usuario', async () => {
    setSession(OWNER_SESSION)

    renderNotificationsApp('/')

    await waitFor(() => {
      expect(screen.getByTestId('notification-badge')).toHaveTextContent('1')
    })
  })

  it('CA-NT-04: sin no leídas, el badge no se muestra', async () => {
    serverNotifications = serverNotifications.map((n) => ({
      ...n,
      read_at: '2026-08-15T09:00:00Z',
    }))
    setSession(OWNER_SESSION)

    renderNotificationsApp('/')

    await waitFor(() => expect(notificationsApi.list).toHaveBeenCalled())
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
  })

  it('CA-NT-04: abrir el panel lista las notificaciones, con las no leídas destacadas', async () => {
    setSession(OWNER_SESSION)
    const user = userEvent.setup()

    renderNotificationsApp('/')

    await user.click(await screen.findByRole('button', { name: /notificaciones/i }))

    const panel = await screen.findByRole('dialog', { name: /panel de notificaciones/i })
    const items = within(panel).getAllByRole('listitem')
    expect(items).toHaveLength(2)

    const unreadButton = within(panel).getByText('Ajuste de alquiler pendiente').closest('button')
    const readButton = within(panel).getByText('Un contrato está por vencer').closest('button')
    expect(unreadButton).toHaveAttribute('data-unread', 'true')
    expect(readButton).toHaveAttribute('data-unread', 'false')
  })

  it('CA-NT-04: marcar una notificación como leída actualiza el badge', async () => {
    setSession(OWNER_SESSION)
    const user = userEvent.setup()

    renderNotificationsApp('/')

    await user.click(await screen.findByRole('button', { name: /notificaciones/i }))
    await user.click(await screen.findByText('Ajuste de alquiler pendiente'))

    await waitFor(() => expect(notificationsApi.markRead).toHaveBeenCalledWith('n-1'))
    await waitFor(() => {
      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
    })
  })

  it('CA-NT-04: "read-all" marca todas como leídas y el badge queda en cero', async () => {
    setSession(OWNER_SESSION)
    const user = userEvent.setup()

    renderNotificationsApp('/')

    await user.click(await screen.findByRole('button', { name: /notificaciones/i }))
    await waitFor(() => {
      expect(screen.getByTestId('notification-badge')).toHaveTextContent('1')
    })

    await user.click(screen.getByRole('button', { name: /marcar todas como leídas/i }))

    await waitFor(() => expect(notificationsApi.markAllRead).toHaveBeenCalledTimes(1))
    await waitFor(() => {
      expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument()
    })
  })

  it('CA-NT-04: sin notificaciones muestra el estado empty', async () => {
    serverNotifications = []
    setSession(OWNER_SESSION)
    const user = userEvent.setup()

    renderNotificationsApp('/')

    await user.click(await screen.findByRole('button', { name: /notificaciones/i }))

    expect(await screen.findByText('No tenés notificaciones')).toBeInTheDocument()
  })

  it('FA: click en adjustment_pending marca leída y navega a la bandeja de ajustes', async () => {
    setSession(OWNER_SESSION)
    const user = userEvent.setup()

    renderNotificationsApp('/')

    await user.click(await screen.findByRole('button', { name: /notificaciones/i }))
    await user.click(await screen.findByText('Ajuste de alquiler pendiente'))

    expect(await screen.findByText('Bandeja de ajustes')).toBeInTheDocument()
  })

  it('FA: click en contract_expiring navega a la ficha del contrato', async () => {
    setSession(OWNER_SESSION)
    const user = userEvent.setup()

    renderNotificationsApp('/')

    await user.click(await screen.findByRole('button', { name: /notificaciones/i }))
    await user.click(await screen.findByText('Un contrato está por vencer'))

    expect(await screen.findByText('Ficha de contrato')).toBeInTheDocument()
  })

  it.each([
    ['work_order_created', 'Nuevo pedido de reparación'],
    ['quote_submitted', 'Nueva cotización recibida'],
    ['quote_approved', 'Tu cotización fue aprobada'],
    ['work_order_closed', 'Se cerró un trabajo de mantenimiento'],
  ] as const)(
    'FA: click en %s navega a la ficha del pedido de mantenimiento',
    async (eventType, title) => {
      serverNotifications = [
        makeNotification({
          id: 'n-wo',
          event_type: eventType,
          payload: { work_order_id: 'wo-99' },
          read_at: null,
        }),
      ]
      setSession(MAINTENANCE_SESSION)
      const user = userEvent.setup()

      renderNotificationsApp('/')

      await user.click(await screen.findByRole('button', { name: /notificaciones/i }))
      await user.click(await screen.findByText(title))

      expect(await screen.findByText('Ficha de pedido')).toBeInTheDocument()
    },
  )

  it('CA-NT-04: la página completa /notifications lista todas y permite "marcar todas como leídas"', async () => {
    setSession(OWNER_SESSION)
    const user = userEvent.setup()

    renderNotificationsApp('/notifications')

    expect(await screen.findByRole('heading', { name: 'Notificaciones' })).toBeInTheDocument()
    expect(await screen.findByText('Ajuste de alquiler pendiente')).toBeInTheDocument()
    expect(screen.getByText('Un contrato está por vencer')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /marcar todas como leídas/i }))

    await waitFor(() => expect(notificationsApi.markAllRead).toHaveBeenCalledTimes(1))
  })

  it('CA-NT-04: sin permiso, /notifications muestra el estado restringido', async () => {
    setSession(
      buildSession({
        userId: 'u-x',
        email: 'x@a.com',
        fullName: 'Sin Permiso',
        organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
        permissions: [],
        isSuperAdmin: false,
      }),
    )

    renderNotificationsApp('/notifications')

    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
    expect(notificationsApi.list).not.toHaveBeenCalled()
  })
})
