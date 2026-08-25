// src/superadmin/modules/organizations/__tests__/organizations-list.spec.tsx
//
// SDD: spec_module_00_superadmin.md §RF-01/RF-02 + sdd_03 §2.
// Issue #7 CA-00-01 (lado UI): "crear una organización desde el dashboard
// y verla listada con su estado (pending_owner)".
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderOrganizationsApp } from './test-router'
import { AdminPropApiError } from '@/api/errors'

vi.mock('@/api/organizations.api', () => ({
  organizationsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    inviteOwner: vi.fn(),
    resendInvitation: vi.fn(),
    disable: vi.fn(),
    enable: vi.fn(),
  },
}))

import { organizationsApi } from '@/api/organizations.api'

describe('RF-01/RF-02 — Dashboard de organizaciones', () => {
  afterEach(() => vi.clearAllMocks())

  it('estado loading: muestra el spinner mientras carga el listado', async () => {
    vi.mocked(organizationsApi.list).mockImplementationOnce(() => new Promise(() => {}))

    renderOrganizationsApp('/superadmin/organizations')

    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('estado error: muestra el error genérico ante un fallo del backend', async () => {
    vi.mocked(organizationsApi.list).mockRejectedValueOnce(
      new AdminPropApiError('INTERNAL_ERROR', 500, 'Ocurrió un error inesperado.'),
    )

    renderOrganizationsApp('/superadmin/organizations')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  it('estado empty: sin organizaciones muestra el CTA para crear la primera', async () => {
    vi.mocked(organizationsApi.list).mockResolvedValueOnce({
      data: [],
      meta: { next_cursor: null, limit: 20 },
    })

    renderOrganizationsApp('/superadmin/organizations')

    await waitFor(() => {
      expect(screen.getByText('No hay organizaciones todavía')).toBeInTheDocument()
    })
  })

  it('CA-00-01: crea una organización desde el dashboard y la ve listada en pending_owner', async () => {
    vi.mocked(organizationsApi.list).mockResolvedValueOnce({
      data: [],
      meta: { next_cursor: null, limit: 20 },
    })
    vi.mocked(organizationsApi.create).mockResolvedValueOnce({
      data: {
        id: 'org-1',
        slug: 'inmobiliaria-sur',
        name: 'Inmobiliaria Sur',
        status: 'pending_owner',
        timezone: 'America/Argentina/Cordoba',
        created_at: '2026-08-20T12:00:00Z',
        owner_email: null,
        settings: {},
        updated_at: '2026-08-20T12:00:00Z',
      },
    })
    vi.mocked(organizationsApi.list).mockResolvedValueOnce({
      data: [
        {
          id: 'org-1',
          slug: 'inmobiliaria-sur',
          name: 'Inmobiliaria Sur',
          status: 'pending_owner',
          timezone: 'America/Argentina/Cordoba',
          created_at: '2026-08-20T12:00:00Z',
          owner_email: null,
        },
      ],
      meta: { next_cursor: null, limit: 20 },
    })

    renderOrganizationsApp('/superadmin/organizations')
    const user = userEvent.setup()

    await waitFor(() => screen.getByText('No hay organizaciones todavía'))

    await user.click(screen.getByRole('button', { name: 'Nueva organización' }))
    await user.type(screen.getByLabelText('Nombre'), 'Inmobiliaria Sur')
    await user.click(screen.getByRole('button', { name: 'Crear organización' }))

    await waitFor(() => {
      expect(screen.getByText('Inmobiliaria Sur')).toBeInTheDocument()
    })
    expect(screen.getByText('Pendiente de owner', { selector: 'span' })).toBeInTheDocument()
    expect(organizationsApi.create).toHaveBeenCalledWith({
      name: 'Inmobiliaria Sur',
      timezone: 'America/Argentina/Cordoba',
    })
  })
})
