// src/superadmin/modules/organizations/__tests__/organization-status-change.spec.tsx
//
// SDD: spec_module_00_superadmin.md §RF-05 + sdd_03 §2.
// Issue #7 CA-00-04 (lado UI): "deshabilitar y rehabilitar una
// organización desde la UI, con confirmación antes de deshabilitar (es
// outward-facing: los usuarios de esa org pierden acceso)".
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

const DISABLED_ORGANIZATION = { ...ACTIVE_ORGANIZATION, status: 'disabled' }

describe('RF-05 — Deshabilitación / habilitación de organización', () => {
  afterEach(() => vi.clearAllMocks())

  it('CA-00-04: el botón deshabilitar pide confirmación antes de ejecutar la acción', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: ACTIVE_ORGANIZATION })

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByRole('button', { name: 'Deshabilitar organización' }))
    await user.click(screen.getByRole('button', { name: 'Deshabilitar organización' }))

    expect(screen.getByText('¿Deshabilitar esta organización?')).toBeInTheDocument()
    expect(organizationsApi.disable).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('¿Deshabilitar esta organización?')).not.toBeInTheDocument()
  })

  it('CA-00-04: confirma la deshabilitación con motivo y la organización queda disabled', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: ACTIVE_ORGANIZATION })
    vi.mocked(organizationsApi.disable).mockResolvedValueOnce({ data: DISABLED_ORGANIZATION })
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: DISABLED_ORGANIZATION })

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByRole('button', { name: 'Deshabilitar organización' }))
    await user.click(screen.getByRole('button', { name: 'Deshabilitar organización' }))
    await user.type(screen.getByLabelText('Motivo'), 'Falta de pago')
    await user.click(screen.getByRole('button', { name: 'Confirmar deshabilitación' }))

    await waitFor(() => {
      expect(organizationsApi.disable).toHaveBeenCalledWith('org-1', { reason: 'Falta de pago' })
    })
    await waitFor(() => {
      expect(screen.getByText('Deshabilitada', { selector: 'span' })).toBeInTheDocument()
    })
  })

  it('CA-00-04: una organización disabled ofrece habilitarla de nuevo (recupera datos intactos)', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: DISABLED_ORGANIZATION })
    vi.mocked(organizationsApi.enable).mockResolvedValueOnce({ data: ACTIVE_ORGANIZATION })
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: ACTIVE_ORGANIZATION })

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByRole('button', { name: 'Habilitar organización' }))
    await user.click(screen.getByRole('button', { name: 'Habilitar organización' }))
    await user.type(screen.getByLabelText('Motivo'), 'Pago regularizado')
    await user.click(screen.getByRole('button', { name: 'Confirmar habilitación' }))

    await waitFor(() => {
      expect(organizationsApi.enable).toHaveBeenCalledWith('org-1', {
        reason: 'Pago regularizado',
      })
    })
  })

  it('CA-00-04: un error del backend al deshabilitar se muestra inline sin perder el form', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: ACTIVE_ORGANIZATION })
    vi.mocked(organizationsApi.disable).mockRejectedValueOnce(
      new AdminPropApiError('INTERNAL_ERROR', 500, 'Ocurrió un error inesperado.'),
    )

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByRole('button', { name: 'Deshabilitar organización' }))
    await user.click(screen.getByRole('button', { name: 'Deshabilitar organización' }))
    await user.type(screen.getByLabelText('Motivo'), 'Falta de pago')
    await user.click(screen.getByRole('button', { name: 'Confirmar deshabilitación' }))

    await waitFor(() => {
      // issue #45: copy actualizado -- ya no promete una notificación que
      // hoy no existe (mapa central error-codes.es-AR.ts).
      expect(
        screen.getByText('Ocurrió un error inesperado. Reintentá en unos minutos.'),
      ).toBeInTheDocument()
    })
  })
})

describe('Issue #64 (ronda feedback #3 del PO) — BackLink', () => {
  afterEach(() => vi.clearAllMocks())

  it('CA-64-10: el BackLink de la ficha de la organización vuelve al listado de Organizaciones', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: ACTIVE_ORGANIZATION })
    vi.mocked(organizationsApi.list).mockResolvedValueOnce({ data: [], meta: {} })

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Volver a Organizaciones' }))

    expect(await screen.findByRole('heading', { name: 'Organizaciones' })).toBeInTheDocument()
  })
})
