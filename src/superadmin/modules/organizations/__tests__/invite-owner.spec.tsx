// src/superadmin/modules/organizations/__tests__/invite-owner.spec.tsx
//
// SDD: spec_module_00_superadmin.md §RF-03/RF-04 + sdd_03 §2.
// Issue #7 CA-00-02 (lado UI): "invitación de owner con estado de
// expiración/reenvío".
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

const PENDING_ORGANIZATION = {
  id: 'org-1',
  slug: 'inmobiliaria-sur',
  name: 'Inmobiliaria Sur',
  status: 'pending_owner',
  timezone: 'America/Argentina/Cordoba',
  created_at: '2026-08-20T12:00:00Z',
  owner_email: null,
  settings: {},
  updated_at: '2026-08-20T12:00:00Z',
}

describe('RF-03/RF-04 — Invitación de owner', () => {
  afterEach(() => vi.clearAllMocks())

  it('CA-00-02: invita al owner y ve la invitación pendiente con su vencimiento', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: PENDING_ORGANIZATION })
    vi.mocked(organizationsApi.inviteOwner).mockResolvedValueOnce({
      data: {
        id: 'inv-1',
        email: 'owner@inmobiliaria-sur.com',
        status: 'pending',
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      },
    })

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByLabelText('Email del owner'))
    await user.type(screen.getByLabelText('Email del owner'), 'owner@inmobiliaria-sur.com')
    await user.click(screen.getByRole('button', { name: 'Invitar owner' }))

    await waitFor(() => {
      expect(screen.getByText('owner@inmobiliaria-sur.com')).toBeInTheDocument()
    })
    expect(screen.getByText(/Invitación pendiente\./)).toBeInTheDocument()
    expect(organizationsApi.inviteOwner).toHaveBeenCalledWith('org-1', {
      email: 'owner@inmobiliaria-sur.com',
    })
  })

  it('CA-00-02: una invitación vencida se muestra como expirada, con reenvío disponible', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: PENDING_ORGANIZATION })
    vi.mocked(organizationsApi.inviteOwner).mockResolvedValueOnce({
      data: {
        id: 'inv-2',
        email: 'owner@inmobiliaria-sur.com',
        status: 'pending',
        expires_at: '2020-01-01T00:00:00Z', // vencida
      },
    })

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByLabelText('Email del owner'))
    await user.type(screen.getByLabelText('Email del owner'), 'owner@inmobiliaria-sur.com')
    await user.click(screen.getByRole('button', { name: 'Invitar owner' }))

    await waitFor(() => {
      expect(screen.getByText(/Invitación expirada\./)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Reenviar invitación' })).toBeInTheDocument()
  })

  it('CA-00-02: reenvío regenera token/expiración y actualiza el estado mostrado', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: PENDING_ORGANIZATION })
    vi.mocked(organizationsApi.inviteOwner).mockResolvedValueOnce({
      data: {
        id: 'inv-3',
        email: 'owner@inmobiliaria-sur.com',
        status: 'pending',
        expires_at: '2020-01-01T00:00:00Z',
      },
    })
    const newExpiry = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    vi.mocked(organizationsApi.resendInvitation).mockResolvedValueOnce({
      data: {
        id: 'inv-4',
        email: 'owner@inmobiliaria-sur.com',
        status: 'pending',
        expires_at: newExpiry,
      },
    })

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByLabelText('Email del owner'))
    await user.type(screen.getByLabelText('Email del owner'), 'owner@inmobiliaria-sur.com')
    await user.click(screen.getByRole('button', { name: 'Invitar owner' }))
    await waitFor(() => screen.getByText(/Invitación expirada\./))

    await user.click(screen.getByRole('button', { name: 'Reenviar invitación' }))

    await waitFor(() => {
      expect(screen.getByText(/Invitación pendiente\./)).toBeInTheDocument()
    })
    expect(organizationsApi.resendInvitation).toHaveBeenCalledWith('org-1')
  })

  it('CA-00-02: reintentar invitar con una pendiente existente ofrece reenviar (409 INVITATION_PENDING_EXISTS)', async () => {
    vi.mocked(organizationsApi.get).mockResolvedValueOnce({ data: PENDING_ORGANIZATION })
    vi.mocked(organizationsApi.inviteOwner).mockRejectedValueOnce(
      new AdminPropApiError(
        'INVITATION_PENDING_EXISTS',
        409,
        'Ya hay una invitación pendiente para ese email.',
      ),
    )

    renderOrganizationsApp('/superadmin/organizations/org-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByLabelText('Email del owner'))
    await user.type(screen.getByLabelText('Email del owner'), 'owner@inmobiliaria-sur.com')
    await user.click(screen.getByRole('button', { name: 'Invitar owner' }))

    await waitFor(() => {
      expect(
        screen.getByText('Ya hay una invitación pendiente para esta organización.'),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Reenviar invitación' })).toBeInTheDocument()
  })
})
