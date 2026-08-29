// src/modules/admin/__tests__/admin.spec.tsx
//
// SDD: spec_module_07_administracion.md RF-01..RF-04 + sdd_03 §3-4 (v1.6).
// Issue #8 — CA-07-01..05.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { AdminPropApiError } from '@/api/errors'
import { renderAdminApp } from './test-router'

vi.mock('@/api/admin.api', () => ({
  adminApi: {
    listUsers: vi.fn(),
    changeUserRole: vi.fn(),
    deactivateUser: vi.fn(),
    inviteUser: vi.fn(),
    listInvitations: vi.fn(),
    resendInvitation: vi.fn(),
    revokeInvitation: vi.fn(),
    listRoles: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}))

import { adminApi } from '@/api/admin.api'

const OWNER_SESSION = buildSession({
  userId: 'u-owner',
  email: 'owner@inmobiliaria-sur.com',
  fullName: 'Owner Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
  permissions: ['user:manage', 'role:read', 'organization:configure'],
  isSuperAdmin: false,
})

const ADMIN_SESSION = buildSession({
  userId: 'u-admin',
  email: 'admin@inmobiliaria-sur.com',
  fullName: 'Admin Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'admin' },
  // spec_data_model.md línea 583: admin tiene todo menos user:manage,
  // role:manage, organization:configure, landlord:set-commission —
  // conserva role:read.
  permissions: ['role:read', 'audit:read'],
  isSuperAdmin: false,
})

function setSession(session: ReturnType<typeof buildSession>) {
  useSessionStore.setState({ session, logoutReason: null, isBootstrapping: false })
}

const SOLE_ACTIVE_OWNER = {
  id: 'u-owner',
  email: 'owner@inmobiliaria-sur.com',
  full_name: 'Owner Uno',
  role_name: 'owner',
  status: 'active',
  created_at: '2026-08-01T00:00:00Z',
}

const ADMIN_MEMBER = {
  id: 'u-admin',
  email: 'admin@inmobiliaria-sur.com',
  full_name: 'Admin Uno',
  role_name: 'admin',
  status: 'active',
  created_at: '2026-08-02T00:00:00Z',
}

describe('Módulo 7 — Administración (#8)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
    localStorage.clear()
  })

  it('CA-07-01: el owner invita a un usuario con rol maintenance y ve la invitación pendiente', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(adminApi.listUsers).mockResolvedValue({ data: [SOLE_ACTIVE_OWNER], meta: {} })
    vi.mocked(adminApi.listInvitations)
      .mockResolvedValueOnce({ data: [], meta: {} })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'inv-1',
            email: 'maintenance@inmobiliaria-sur.com',
            role: 'maintenance',
            status: 'pending',
            expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        meta: {},
      })
    vi.mocked(adminApi.inviteUser).mockResolvedValueOnce({
      data: {
        id: 'inv-1',
        email: 'maintenance@inmobiliaria-sur.com',
        role: 'maintenance',
        status: 'pending',
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      },
    })

    renderAdminApp('/admin')
    const user = userEvent.setup()

    // Issue #48: el form de invitación vive en un modal — se abre desde
    // el botón "Invitar usuario" de la sección de invitaciones.
    await user.click(await screen.findByRole('button', { name: 'Invitar usuario' }))
    await waitFor(() => screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'maintenance@inmobiliaria-sur.com')
    await user.selectOptions(screen.getByLabelText('Rol'), 'maintenance')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    expect(adminApi.inviteUser).toHaveBeenCalledWith({
      email: 'maintenance@inmobiliaria-sur.com',
      role: 'maintenance',
    })

    await waitFor(() => {
      expect(screen.getByText('maintenance@inmobiliaria-sur.com')).toBeInTheDocument()
    })
    expect(screen.getByText(/Invitación pendiente\./)).toBeInTheDocument()
  })

  it('CA-07-01: reintentar invitar con una pendiente existente muestra el mensaje del mapa (409 INVITATION_PENDING_EXISTS)', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(adminApi.listUsers).mockResolvedValue({ data: [SOLE_ACTIVE_OWNER], meta: {} })
    vi.mocked(adminApi.listInvitations).mockResolvedValue({ data: [], meta: {} })
    vi.mocked(adminApi.inviteUser).mockRejectedValueOnce(
      new AdminPropApiError(
        'INVITATION_PENDING_EXISTS',
        409,
        'Ya hay una invitación pendiente para ese email.',
      ),
    )

    renderAdminApp('/admin')
    const user = userEvent.setup()

    // Issue #48: el form de invitación vive en un modal — se abre desde
    // el botón "Invitar usuario" de la sección de invitaciones.
    await user.click(await screen.findByRole('button', { name: 'Invitar usuario' }))
    await waitFor(() => screen.getByLabelText('Email'))
    await user.type(screen.getByLabelText('Email'), 'maintenance@inmobiliaria-sur.com')
    await user.click(screen.getByRole('button', { name: 'Invitar' }))

    await waitFor(() => {
      expect(
        screen.getByText('Ya hay una invitación pendiente para ese email.'),
      ).toBeInTheDocument()
    })
  })

  it('CA-07-02: la UI deshabilita y explica por qué no se puede tocar al único owner activo', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(adminApi.listUsers).mockResolvedValue({
      data: [SOLE_ACTIVE_OWNER, ADMIN_MEMBER],
      meta: {},
    })
    vi.mocked(adminApi.listInvitations).mockResolvedValue({ data: [], meta: {} })

    renderAdminApp('/admin')

    await waitFor(() => screen.getByText('Owner Uno'))

    const ownerRow = screen.getByText('Owner Uno').closest('tr')!
    expect(within(ownerRow).getByRole('combobox')).toBeDisabled()
    expect(within(ownerRow).getByRole('button', { name: 'Desactivar' })).toBeDisabled()
    expect(
      within(ownerRow).getByText(
        /Es el único owner activo: designá otro owner antes de cambiarle el rol o desactivarlo\./,
      ),
    ).toBeInTheDocument()

    // El admin (no-owner) sí tiene sus controles habilitados.
    const adminRow = screen.getByText('Admin Uno').closest('tr')!
    expect(within(adminRow).getByRole('combobox')).toBeEnabled()
    expect(within(adminRow).getByRole('button', { name: 'Desactivar' })).toBeEnabled()
  })

  it('CA-07-02: si el backend igual responde 422 LAST_OWNER_REQUIRED, el mensaje del mapa se muestra', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(adminApi.listUsers).mockResolvedValue({
      data: [SOLE_ACTIVE_OWNER, ADMIN_MEMBER],
      meta: {},
    })
    vi.mocked(adminApi.listInvitations).mockResolvedValue({ data: [], meta: {} })
    vi.mocked(adminApi.deactivateUser).mockRejectedValueOnce(
      new AdminPropApiError(
        'LAST_OWNER_REQUIRED',
        422,
        'Debe quedar al menos un owner activo. Designá otro owner antes.',
      ),
    )

    renderAdminApp('/admin')
    const user = userEvent.setup()

    await waitFor(() => screen.getByText('Admin Uno'))
    const adminRow = screen.getByText('Admin Uno').closest('tr')!
    await user.click(within(adminRow).getByRole('button', { name: 'Desactivar' }))

    await waitFor(() => {
      expect(
        screen.getByText('Debe quedar al menos un owner activo. Designá otro owner antes.'),
      ).toBeInTheDocument()
    })
  })

  it('CA-07-03: los roles de sistema se muestran de solo lectura, sin ningún control de edición', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(adminApi.listRoles).mockResolvedValueOnce({
      data: [
        {
          id: 'r-1',
          name: 'owner',
          permissions: ['user:manage', 'organization:configure'],
          is_system_role: true,
        },
        {
          id: 'r-2',
          name: 'admin',
          permissions: ['contract:read', 'role:read'],
          is_system_role: true,
        },
        { id: 'r-3', name: 'maintenance', permissions: ['work-order:read'], is_system_role: true },
      ],
    })

    renderAdminApp('/admin/roles')

    await waitFor(() => screen.getByText('Owner'))
    expect(screen.getAllByText('Rol de sistema — no editable')).toHaveLength(3)
    expect(screen.queryByRole('button', { name: /editar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('CA-07-04: un admin no ve la sección de usuarios (sin user:manage)', async () => {
    setSession(ADMIN_SESSION)

    renderAdminApp('/admin')

    await waitFor(() => {
      expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    })
    expect(adminApi.listUsers).not.toHaveBeenCalled()
    expect(adminApi.listInvitations).not.toHaveBeenCalled()
  })

  it('CA-07-04: un admin no ve la configuración de la organización (sin organization:configure, ni GET)', async () => {
    setSession(ADMIN_SESSION)

    renderAdminApp('/admin/settings')

    await waitFor(() => {
      expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    })
    // sdd_03 §4: GET también exige organization:configure — el admin no lo
    // tiene, así que la página ni dispara el request.
    expect(adminApi.getSettings).not.toHaveBeenCalled()
  })

  it('CA-07-04: un admin sí puede ver los roles (role:read)', async () => {
    setSession(ADMIN_SESSION)
    vi.mocked(adminApi.listRoles).mockResolvedValueOnce({
      data: [{ id: 'r-1', name: 'owner', permissions: ['user:manage'], is_system_role: true }],
    })

    renderAdminApp('/admin/roles')

    await waitFor(() => {
      expect(screen.getByText('Owner')).toBeInTheDocument()
    })
    expect(screen.queryByText('Acceso restringido')).not.toBeInTheDocument()
  })

  it('CA-07-05: el owner cambia grace_day de 10 a 15 y ve la confirmación del cambio', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(adminApi.getSettings)
      .mockResolvedValueOnce({
        data: {
          grace_day: 10,
          contract_expiry_notice_days: 60,
          billing_header: { name: 'Inmobiliaria Sur', cuit: null, contact: null },
        },
      })
      // useUpdateOrganizationSettings invalida ['admin', 'settings'] al
      // aplicar el cambio — el refetch pide getSettings otra vez.
      .mockResolvedValueOnce({
        data: {
          grace_day: 15,
          contract_expiry_notice_days: 60,
          billing_header: { name: 'Inmobiliaria Sur', cuit: null, contact: null },
        },
      })
    vi.mocked(adminApi.updateSettings).mockResolvedValueOnce({
      data: {
        grace_day: 15,
        contract_expiry_notice_days: 60,
        billing_header: { name: 'Inmobiliaria Sur', cuit: null, contact: null },
      },
    })

    renderAdminApp('/admin/settings')
    const user = userEvent.setup()

    // Issue #66: la configuración arranca en modo lectura.
    expect(await screen.findByTestId('organization-settings-view')).toBeInTheDocument()
    expect(screen.queryByLabelText('Día de gracia (mora)')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const graceDayInput = screen.getByLabelText('Día de gracia (mora)')
    await user.clear(graceDayInput)
    await user.type(graceDayInput, '15')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      expect(adminApi.updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({ grace_day: 15, contract_expiry_notice_days: 60 }),
      )
    })
    expect(await screen.findByText(/El nuevo día de gracia rige desde ahora/)).toBeInTheDocument()
    // Guardar OK vuelve a modo lectura.
    expect(screen.queryByLabelText('Día de gracia (mora)')).not.toBeInTheDocument()
  })

  // ── Issue #66 (ronda feedback #3 del PO) — modo lectura por defecto ────

  it('CA-66-01: "Cancelar" en la configuración de la organización descarta y vuelve a modo lectura', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(adminApi.getSettings).mockResolvedValueOnce({
      data: {
        grace_day: 10,
        contract_expiry_notice_days: 60,
        billing_header: { name: 'Inmobiliaria Sur', cuit: null, contact: null },
      },
    })

    renderAdminApp('/admin/settings')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Editar' }))
    const graceDayInput = screen.getByLabelText('Día de gracia (mora)')
    await user.clear(graceDayInput)
    await user.type(graceDayInput, '20')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByTestId('organization-settings-view')).toBeInTheDocument()
    expect(screen.queryByLabelText('Día de gracia (mora)')).not.toBeInTheDocument()
    expect(adminApi.updateSettings).not.toHaveBeenCalled()
  })
})
