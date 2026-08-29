// src/superadmin/modules/organizations/__tests__/organization-detail-edit.spec.tsx
//
// Issue #66 (ronda feedback #3 del PO) — modo lectura por defecto en la
// ficha de organización (superadmin): "Editar" habilita nombre/zona
// horaria, Guardar persiste y vuelve a lectura, Cancelar descarta.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderOrganizationsApp } from './test-router'

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

const ACTIVE_ORGANIZATION = {
  id: 'org-1',
  slug: 'inmobiliaria-sur',
  name: 'Inmobiliaria Sur',
  status: 'active',
  timezone: 'America/Argentina/Cordoba',
  created_at: '2026-08-20T12:00:00Z',
  owner_email: 'owner@inmobiliaria-sur.com',
  settings: {},
  updated_at: '2026-08-20T12:00:00Z',
}

describe('UC-66 — ficha de organización (superadmin): modo lectura por defecto', () => {
  afterEach(() => vi.clearAllMocks())

  it('CA-66-01: arranca en modo lectura con los datos como texto', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: ACTIVE_ORGANIZATION })

    renderOrganizationsApp('/superadmin/organizations/org-1')

    expect(await screen.findByTestId('organization-read-view')).toBeInTheDocument()
    expect(screen.getByTestId('organization-read-view')).toHaveTextContent('Inmobiliaria Sur')
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('CA-66-02: "Editar" habilita los campos y "Guardar cambios" persiste y vuelve a modo lectura', async () => {
    vi.mocked(organizationsApi.get)
      .mockResolvedValueOnce({ data: ACTIVE_ORGANIZATION })
      .mockResolvedValueOnce({ data: { ...ACTIVE_ORGANIZATION, name: 'Sur Propiedades' } })
    vi.mocked(organizationsApi.update).mockResolvedValueOnce({
      data: { ...ACTIVE_ORGANIZATION, name: 'Sur Propiedades' },
    })

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const nameInput = screen.getByLabelText('Nombre')
    await user.clear(nameInput)
    await user.type(nameInput, 'Sur Propiedades')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(organizationsApi.update).toHaveBeenCalledWith(
        'org-1',
        expect.objectContaining({ name: 'Sur Propiedades' }),
      )
    })
    await waitFor(() => {
      expect(screen.getByTestId('organization-read-view')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('CA-66-03: "Cancelar" descarta los cambios y vuelve a modo lectura sin guardar', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: ACTIVE_ORGANIZATION })

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Descartado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByTestId('organization-read-view')).toHaveTextContent('Inmobiliaria Sur')
    expect(organizationsApi.update).not.toHaveBeenCalled()
  })
})
