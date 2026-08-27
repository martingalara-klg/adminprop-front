// src/modules/properties/__tests__/properties.spec.tsx
//
// SDD: spec_module_01_propiedades.md RF-01..RF-04 + sdd_03 §7-8 (v1.6).
// Issue #10 — CA-01-01..06 (lado UI).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { AdminPropApiError } from '@/api/errors'
import type { PropertyWorkOrderHistoryEntry } from '@/api/properties.api'
import { renderPropertiesApp } from './test-router'

vi.mock('@/api/properties.api', () => ({
  propertiesApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listServiceAccounts: vi.fn(),
    createServiceAccount: vi.fn(),
    updateServiceAccount: vi.fn(),
    deleteServiceAccount: vi.fn(),
    getWorkOrderHistory: vi.fn(),
    listRecurringCharges: vi.fn(),
    createRecurringCharge: vi.fn(),
  },
}))

vi.mock('@/api/contracts.api', () => ({
  contractsApi: {
    list: vi.fn(),
  },
}))

vi.mock('@/api/people.api', () => ({
  peopleApi: {
    listLandlords: vi.fn(),
    getRenter: vi.fn(),
  },
}))

import { propertiesApi } from '@/api/properties.api'
import { contractsApi } from '@/api/contracts.api'
import { peopleApi } from '@/api/people.api'

const OWNER_SESSION = buildSession({
  userId: 'u-owner',
  email: 'owner@inmobiliaria-sur.com',
  fullName: 'Owner Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
  permissions: ['property:read', 'property:manage', 'contract:read', 'renter:read'],
  isSuperAdmin: false,
})

const MAINTENANCE_SESSION = buildSession({
  userId: 'u-maint',
  email: 'maint@inmobiliaria-sur.com',
  fullName: 'Mantenimiento Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'maintenance' },
  // RN-A01: maintenance no accede a ningún permiso `property:*`.
  permissions: ['work-order:read'],
  isSuperAdmin: false,
})

function setSession(session: ReturnType<typeof buildSession>) {
  useSessionStore.setState({ session, logoutReason: null, isBootstrapping: false })
}

const LANDLORD_LIST = {
  data: [
    {
      id: 'l-1',
      name: 'Juan Pérez',
      tax_id: null,
      phone: null,
      email: null,
      commission_pct: '10.00',
      notes: null,
      created_at: '2026-08-01T00:00:00Z',
    },
  ],
  meta: {},
}

const PROPERTY_SUMMARY = {
  id: 'p-1',
  address: 'Av. Colón 1234',
  landlord_id: 'l-1',
  property_type: 'departamento',
  status: 'available',
  created_at: '2026-08-01T00:00:00Z',
}

const PROPERTY_DETAIL = {
  id: 'p-1',
  address: 'Av. Colón 1234',
  landlord_id: 'l-1',
  property_type: 'departamento',
  status: 'available',
  notes: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  service_accounts: [],
}

const SERVICE_ACCOUNTS = [
  {
    id: 'sa-1',
    property_id: 'p-1',
    service_type: 'rentas',
    account_number: '1001',
    secondary_number: null,
    notes: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'sa-2',
    property_id: 'p-1',
    service_type: 'municipalidad',
    account_number: '2002',
    secondary_number: null,
    notes: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'sa-3',
    property_id: 'p-1',
    service_type: 'luz',
    account_number: '3003',
    secondary_number: '4004',
    notes: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'sa-4',
    property_id: 'p-1',
    service_type: 'gas',
    account_number: '5005',
    secondary_number: null,
    notes: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'sa-5',
    property_id: 'p-1',
    service_type: 'agua',
    account_number: '6006',
    secondary_number: null,
    notes: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
  {
    id: 'sa-6',
    property_id: 'p-1',
    service_type: 'expensas',
    account_number: '7007',
    secondary_number: null,
    notes: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
]

const WORK_ORDERS: PropertyWorkOrderHistoryEntry[] = [
  {
    id: 'wo-1',
    title: 'Arreglo de cañería',
    description: null,
    status: 'closed',
    payer: 'landlord',
    final_cost: '15000.00',
    closed_at: '2026-07-01T00:00:00Z',
    created_at: '2026-06-01T00:00:00Z',
    settled_in_settlement_id: null,
  },
]

const RECURRING_CHARGES = [
  {
    id: 'rc-1',
    property_id: 'p-1',
    charge_type: 'rentas',
    label: 'Rentas',
    is_active: true,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
  },
]

const ACTIVE_CONTRACT = {
  id: 'c-1',
  property_id: 'p-1',
  renter_id: 'r-1',
  currency: 'ARS',
  initial_amount: '100000.00',
  current_amount: '110000.00',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  daily_late_fee_pct: '0.10',
  adjustment_frequency_months: null,
  adjustment_index: null,
  adjustment_index_notes: null,
  status: 'active',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const RENTER_DETAIL = {
  id: 'r-1',
  name: 'María López',
  tax_id: null,
  phone: null,
  email: null,
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

function mockFichaDefaults() {
  vi.mocked(propertiesApi.get).mockResolvedValue({ data: PROPERTY_DETAIL })
  vi.mocked(propertiesApi.listServiceAccounts).mockResolvedValue({ data: [] })
  vi.mocked(propertiesApi.getWorkOrderHistory).mockResolvedValue({ data: [] })
  vi.mocked(propertiesApi.listRecurringCharges).mockResolvedValue({ data: [] })
  vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
  vi.mocked(peopleApi.listLandlords).mockResolvedValue(LANDLORD_LIST)
}

describe('Módulo 1 — Propiedades (#10)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
    localStorage.clear()
  })

  it('CA-01-01: el owner crea una propiedad con dirección, propietario y tipo, y la ve en el listado', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.listLandlords).mockResolvedValue(LANDLORD_LIST)
    vi.mocked(propertiesApi.list)
      .mockResolvedValueOnce({ data: [], meta: {} })
      .mockResolvedValueOnce({ data: [PROPERTY_SUMMARY], meta: {} })
    vi.mocked(propertiesApi.create).mockResolvedValueOnce({ data: PROPERTY_SUMMARY })

    renderPropertiesApp('/properties')
    const user = userEvent.setup()

    // Issue #48: el form de alta vive en un modal — se abre desde el
    // botón "Nueva propiedad" del listado.
    await user.click(await screen.findByRole('button', { name: 'Nueva propiedad' }))
    await waitFor(() => screen.getByLabelText('Dirección'))
    await user.type(screen.getByLabelText('Dirección'), 'Av. Colón 1234')
    await user.selectOptions(screen.getByLabelText('Propietario'), 'l-1')
    await user.click(screen.getByRole('button', { name: 'Crear propiedad' }))

    expect(propertiesApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ address: 'Av. Colón 1234', landlord_id: 'l-1' }),
    )

    await waitFor(() => {
      expect(screen.getByText('Av. Colón 1234')).toBeInTheDocument()
    })
  })

  it('CA-01-02: se cargan cuentas de rentas, muni, luz (con n° de cliente y contrato), gas, agua y expensas, y se ven todas juntas en la ficha', async () => {
    setSession(OWNER_SESSION)
    mockFichaDefaults()
    vi.mocked(propertiesApi.listServiceAccounts).mockResolvedValueOnce({ data: SERVICE_ACCOUNTS })

    renderPropertiesApp('/properties/p-1')

    await waitFor(() => screen.getByText('1001'))
    expect(screen.getByText('2002')).toBeInTheDocument()
    expect(screen.getByText('3003')).toBeInTheDocument()
    expect(screen.getByText('4004')).toBeInTheDocument() // n° de contrato de luz
    expect(screen.getByText('5005')).toBeInTheDocument()
    expect(screen.getByText('6006')).toBeInTheDocument()
    expect(screen.getByText('7007')).toBeInTheDocument()
  })

  it('CA-01-03: borrar una propiedad con contrato activo devuelve el mensaje de ENTITY_HAS_DEPENDENCIES', async () => {
    setSession(OWNER_SESSION)
    mockFichaDefaults()
    vi.mocked(propertiesApi.remove).mockRejectedValueOnce(
      new AdminPropApiError(
        'ENTITY_HAS_DEPENDENCIES',
        409,
        'No se puede eliminar: hay registros que dependen de este recurso.',
      ),
    )

    renderPropertiesApp('/properties/p-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Eliminar propiedad' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))

    await waitFor(() => {
      expect(
        screen.getByText('No se puede eliminar: hay registros que dependen de este recurso.'),
      ).toBeInTheDocument()
    })
  })

  it('CA-01-03: sin contrato activo, la baja es lógica y la propiedad conserva su historial (soft delete confirmado)', async () => {
    setSession(OWNER_SESSION)
    mockFichaDefaults()
    vi.mocked(propertiesApi.remove).mockResolvedValueOnce(undefined)
    vi.mocked(propertiesApi.list).mockResolvedValueOnce({ data: [], meta: {} })

    renderPropertiesApp('/properties/p-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Eliminar propiedad' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))

    await waitFor(() => {
      expect(propertiesApi.remove).toHaveBeenCalledWith('p-1')
    })
  })

  it('CA-01-04: una propiedad `rented` muestra el estado automático y no permite editarlo manualmente', async () => {
    setSession(OWNER_SESSION)
    mockFichaDefaults()
    vi.mocked(propertiesApi.get).mockResolvedValueOnce({
      data: { ...PROPERTY_DETAIL, status: 'rented' },
    })

    renderPropertiesApp('/properties/p-1')

    await waitFor(() => screen.getByTestId('property-status-rented'))
    expect(screen.getByTestId('property-status-rented')).toHaveTextContent(/estado automático/i)
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
  })

  it('CA-01-05: la ficha muestra el contrato vigente con el inquilino, el historial de reparaciones y los conceptos recurrentes activos', async () => {
    setSession(OWNER_SESSION)
    mockFichaDefaults()
    vi.mocked(contractsApi.list).mockResolvedValueOnce({ data: [ACTIVE_CONTRACT], meta: {} })
    vi.mocked(peopleApi.getRenter).mockResolvedValueOnce({ data: RENTER_DETAIL })
    vi.mocked(propertiesApi.getWorkOrderHistory).mockResolvedValueOnce({ data: WORK_ORDERS })
    vi.mocked(propertiesApi.listRecurringCharges).mockResolvedValueOnce({ data: RECURRING_CHARGES })

    renderPropertiesApp('/properties/p-1')

    await waitFor(() => screen.getByTestId('property-active-contract'))
    expect(await screen.findByText('María López')).toBeInTheDocument()
    expect(screen.getByTestId('property-work-orders-history')).toHaveTextContent(
      'Arreglo de cañería',
    )
    expect(screen.getByTestId('property-recurring-charges')).toHaveTextContent('Rentas')
  })

  it('CA-01-05 (estado empty): sin contrato vigente, la ficha muestra "Sin contrato vigente"', async () => {
    setSession(OWNER_SESSION)
    mockFichaDefaults()

    renderPropertiesApp('/properties/p-1')

    await waitFor(() => {
      expect(screen.getByText('Sin contrato vigente')).toBeInTheDocument()
    })
  })

  it('CA-01-06: un maintenance no ve el listado de propiedades ni dispara el request', async () => {
    setSession(MAINTENANCE_SESSION)

    renderPropertiesApp('/properties')

    await waitFor(() => {
      expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    })
    expect(propertiesApi.list).not.toHaveBeenCalled()
  })

  it('CA-01-06: un maintenance no ve la ficha de una propiedad por acceso directo por URL', async () => {
    setSession(MAINTENANCE_SESSION)

    renderPropertiesApp('/properties/p-1')

    await waitFor(() => {
      expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    })
    expect(propertiesApi.get).not.toHaveBeenCalled()
  })
})
