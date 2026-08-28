// src/modules/contracts/__tests__/contracts.spec.tsx
//
// SDD: spec_module_03_contratos.md RF-01..RF-05 + sdd_03 §8 (v1.9).
// Issue #11 — CA-03-01..08 (lado UI).
// Issue #50 (espejo de back#100, RN-08/RN-C06) — CA-03-09..15: alta de
// contrato en curso (monto vigente + desde cuándo rige).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { AdminPropApiError } from '@/api/errors'
import { renderContractsApp } from './test-router'

vi.mock('@/api/contracts.api', () => ({
  contractsApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    activate: vi.fn(),
    terminate: vi.fn(),
    listAdjustments: vi.fn(),
    listPendingAdjustments: vi.fn(),
    applyAdjustment: vi.fn(),
    downloadDebtCertificate: vi.fn(),
  },
}))

vi.mock('@/api/properties.api', () => ({
  propertiesApi: {
    list: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock('@/api/people.api', () => ({
  peopleApi: {
    listRenters: vi.fn(),
    getRenter: vi.fn(),
  },
}))

import { contractsApi } from '@/api/contracts.api'
import { propertiesApi } from '@/api/properties.api'
import { peopleApi } from '@/api/people.api'

const OWNER_SESSION = buildSession({
  userId: 'u-owner',
  email: 'owner@inmobiliaria-sur.com',
  fullName: 'Owner Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
  permissions: [
    'contract:read',
    'contract:manage',
    // Issue #56/#105, decisión #124: `contract:terminate` es exclusivo
    // de owner (admin conserva contract:manage para el resto del ciclo
    // de vida, pero no termina contratos).
    'contract:terminate',
    'adjustment:apply',
    'property:read',
    'renter:read',
  ],
  isSuperAdmin: false,
})

// Issue #56 punto 4: admin conserva `contract:manage` (activar/editar)
// pero NO `contract:terminate` — el botón de terminar debe quedar
// oculto para este rol.
const ADMIN_SESSION = buildSession({
  userId: 'u-admin',
  email: 'admin@inmobiliaria-sur.com',
  fullName: 'Admin Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'admin' },
  permissions: ['contract:read', 'contract:manage', 'property:read', 'renter:read'],
  isSuperAdmin: false,
})

const READONLY_SESSION = buildSession({
  userId: 'u-readonly',
  email: 'readonly@inmobiliaria-sur.com',
  fullName: 'Sólo Lectura',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'admin' },
  permissions: ['contract:read'],
  isSuperAdmin: false,
})

const MAINTENANCE_SESSION = buildSession({
  userId: 'u-maint',
  email: 'maint@inmobiliaria-sur.com',
  fullName: 'Mantenimiento Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'maintenance' },
  // RN-A01: maintenance no accede a ningún permiso `contract:*`.
  permissions: ['work-order:read'],
  isSuperAdmin: false,
})

function setSession(session: ReturnType<typeof buildSession>) {
  useSessionStore.setState({ session, logoutReason: null, isBootstrapping: false })
}

const PROPERTIES = {
  data: [
    {
      id: 'p-1',
      address: 'Av. Colón 1234',
      landlord_id: 'l-1',
      neighborhood_id: null,
      property_type: 'departamento',
      status: 'available',
      created_at: '2026-08-01T00:00:00Z',
    },
  ],
  meta: {},
}

const RENTERS = {
  data: [
    {
      id: 'r-1',
      name: 'María López',
      tax_id: null,
      phone: null,
      email: null,
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    },
  ],
  meta: {},
}

const PROPERTY_DETAIL = {
  data: {
    ...PROPERTIES.data[0]!,
    notes: null,
    updated_at: '2026-08-01T00:00:00Z',
    service_accounts: [],
  },
}
const RENTER_DETAIL = { data: RENTERS.data[0]! }

const MONTHLY_AMOUNTS = [
  { period: '2026-03-01', amount: '110000.00' },
  { period: '2026-02-01', amount: '100000.00' },
  { period: '2026-01-01', amount: '100000.00' },
]

const DRAFT_CONTRACT_ARS = {
  id: 'c-1',
  property_id: 'p-1',
  renter_id: 'r-1',
  currency: 'ARS',
  initial_amount: '100000.00',
  current_amount: '100000.00',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  daily_late_fee_pct: '0.10',
  adjustment_frequency_months: 6,
  adjustment_index: 'icl',
  adjustment_index_notes: null,
  status: 'draft',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  monthly_amounts: MONTHLY_AMOUNTS,
}

const ACTIVE_CONTRACT = { ...DRAFT_CONTRACT_ARS, id: 'c-2', status: 'active' }

function mockOptionDefaults() {
  vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTIES)
  vi.mocked(peopleApi.listRenters).mockResolvedValue(RENTERS)
}

function mockDetailLinkDefaults() {
  vi.mocked(propertiesApi.get).mockResolvedValue(PROPERTY_DETAIL)
  vi.mocked(peopleApi.getRenter).mockResolvedValue(RENTER_DETAIL)
}

// Issue #48: el form de alta vive en un modal — helper que lo abre desde
// el botón "Nuevo contrato" del listado.
async function openCreateContractModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Nuevo contrato' }))
}

describe('Módulo 3 — Contratos (#11)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
    localStorage.clear()
  })

  it('CA-03-01: el owner crea un contrato ARS con % de mora, frecuencia e índice; nace en draft', async () => {
    setSession(OWNER_SESSION)
    mockOptionDefaults()
    vi.mocked(contractsApi.list)
      .mockResolvedValueOnce({ data: [], meta: {} })
      .mockResolvedValueOnce({ data: [DRAFT_CONTRACT_ARS], meta: {} })
    vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

    renderContractsApp('/contracts')
    const user = userEvent.setup()

    await openCreateContractModal(user)
    await screen.findByRole('option', { name: 'Av. Colón 1234' })
    await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
    await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
    await user.type(screen.getByLabelText('Monto inicial'), '100000')
    await user.type(screen.getByLabelText('Fecha de inicio'), '2026-01-01')
    await user.type(screen.getByLabelText('Fecha de fin'), '2026-12-31')
    await user.type(screen.getByLabelText('% de mora diaria'), '0.10')
    await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '6')
    await user.selectOptions(screen.getByLabelText('Índice de referencia'), 'icl')
    await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

    expect(contractsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currency: 'ARS',
        daily_late_fee_pct: '0.10',
        adjustment_frequency_months: 6,
        adjustment_index: 'icl',
      }),
    )
    // CA-03-12 (issue #100): alta normal — sin current_amount/
    // current_amount_since, idéntico al comportamiento previo al #100.
    const createPayload = vi.mocked(contractsApi.create).mock.calls[0]?.[0]
    expect(createPayload?.current_amount).toBeUndefined()
    expect(createPayload?.current_amount_since).toBeUndefined()

    await waitFor(() => {
      expect(screen.getByText('Borrador')).toBeInTheDocument()
    })
  })

  it('CA-03-03: el form de alta en USD no muestra frecuencia ni índice de ajuste (RN-03)', async () => {
    setSession(OWNER_SESSION)
    mockOptionDefaults()
    vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

    renderContractsApp('/contracts')
    const user = userEvent.setup()

    await openCreateContractModal(user)
    await waitFor(() => screen.getByLabelText('Moneda'))
    await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')

    expect(screen.queryByLabelText('Frecuencia de ajuste (meses)')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Índice de referencia')).not.toBeInTheDocument()
    expect(
      screen.getByText('Los contratos en USD no tienen frecuencia ni índice de ajuste (RN-03).'),
    ).toBeInTheDocument()
  })

  it('CA-03-02: crear un contrato con vigencia superpuesta devuelve 409 CONTRACT_OVERLAP con link al contrato en conflicto', async () => {
    setSession(OWNER_SESSION)
    mockOptionDefaults()
    vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
    vi.mocked(contractsApi.create).mockRejectedValueOnce(
      new AdminPropApiError(
        'CONTRACT_OVERLAP',
        409,
        'La propiedad ya tiene un contrato vigente en ese rango de fechas.',
        null,
        { conflicting_contract_id: 'c-9' },
      ),
    )

    renderContractsApp('/contracts')
    const user = userEvent.setup()

    await openCreateContractModal(user)
    await screen.findByRole('option', { name: 'Av. Colón 1234' })
    await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
    await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
    await user.type(screen.getByLabelText('Monto inicial'), '100000')
    await user.type(screen.getByLabelText('Fecha de inicio'), '2026-01-01')
    await user.type(screen.getByLabelText('Fecha de fin'), '2026-12-31')
    await user.type(screen.getByLabelText('% de mora diaria'), '0.10')
    await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

    await waitFor(() => {
      expect(
        screen.getByText('La propiedad ya tiene un contrato vigente en ese rango de fechas.'),
      ).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Ver contrato en conflicto' })).toHaveAttribute(
      'href',
      '/contracts/c-9',
    )
  })

  it('CA-03-07: el filtro de vencimientos consulta contratos con expiring_in_days', async () => {
    setSession(OWNER_SESSION)
    mockOptionDefaults()
    vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

    renderContractsApp('/contracts')
    const user = userEvent.setup()

    await waitFor(() => screen.getByLabelText('Vencen dentro de (días)'))
    await user.type(screen.getByLabelText('Vencen dentro de (días)'), '60')

    await waitFor(() => {
      expect(contractsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ expiring_in_days: 60 }),
        expect.anything(),
      )
    })
  })

  it('CA-03-01/02: el owner activa un contrato draft con confirmación explícita', async () => {
    setSession(OWNER_SESSION)
    mockDetailLinkDefaults()
    vi.mocked(contractsApi.get).mockResolvedValue({ data: DRAFT_CONTRACT_ARS })
    vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })
    vi.mocked(contractsApi.activate).mockResolvedValueOnce({
      data: { ...DRAFT_CONTRACT_ARS, status: 'active' },
    })

    renderContractsApp('/contracts/c-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Activar contrato' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar activación' }))

    await waitFor(() => {
      expect(contractsApi.activate).toHaveBeenCalledWith('c-1')
    })
  })

  it('CA-03-08: el owner termina un contrato activo con motivo obligatorio', async () => {
    setSession(OWNER_SESSION)
    mockDetailLinkDefaults()
    vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
    vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })
    vi.mocked(contractsApi.terminate).mockResolvedValueOnce({
      data: { ...ACTIVE_CONTRACT, status: 'terminated' },
    })

    renderContractsApp('/contracts/c-2')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Terminar contrato' }))
    await user.type(screen.getByLabelText('Motivo'), 'Mudanza del inquilino')
    await user.click(screen.getByRole('button', { name: 'Confirmar terminación' }))

    await waitFor(() => {
      expect(contractsApi.terminate).toHaveBeenCalledWith('c-2', {
        reason: 'Mudanza del inquilino',
      })
    })
  })

  it('CA-03-04: la bandeja muestra los ajustes pendientes con link al contrato', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(contractsApi.listPendingAdjustments).mockResolvedValueOnce({
      data: [
        {
          id: 'adj-1',
          contract_id: 'c-1',
          due_period: '2026-07-01',
          status: 'pending',
          pct_applied: null,
          previous_amount: null,
          new_amount: null,
          notes: null,
          applied_by: null,
          applied_at: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
      meta: {},
    })

    renderContractsApp('/contracts/adjustments')

    await waitFor(() => screen.getByTestId('adjustments-table'))
    expect(screen.getByRole('link', { name: 'Ver contrato' })).toHaveAttribute(
      'href',
      '/contracts/c-1',
    )
  })

  it('CA-03-05: aplicar un % positivo actualiza el ajuste sin diálogo de confirmación adicional', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(contractsApi.listPendingAdjustments).mockResolvedValueOnce({
      data: [
        {
          id: 'adj-1',
          contract_id: 'c-1',
          due_period: '2026-07-01',
          status: 'pending',
          pct_applied: null,
          previous_amount: null,
          new_amount: null,
          notes: null,
          applied_by: null,
          applied_at: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
      meta: {},
    })
    vi.mocked(contractsApi.get).mockResolvedValue({ data: DRAFT_CONTRACT_ARS })
    vi.mocked(contractsApi.applyAdjustment).mockResolvedValueOnce({
      data: {
        id: 'adj-1',
        contract_id: 'c-1',
        due_period: '2026-07-01',
        status: 'applied',
        pct_applied: '10',
        previous_amount: '100000.00',
        new_amount: '110000.00',
        notes: null,
        applied_by: 'owner@inmobiliaria-sur.com',
        applied_at: '2026-07-02T00:00:00Z',
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-02T00:00:00Z',
      },
    })

    renderContractsApp('/contracts/adjustments')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Ingresar % de ajuste' }))
    await user.type(screen.getByLabelText('% de ajuste'), '10')

    expect(await screen.findByTestId('adjustment-preview')).toHaveTextContent('110.000')

    await user.click(screen.getByRole('button', { name: 'Aplicar ajuste' }))

    await waitFor(() => {
      expect(contractsApi.applyAdjustment).toHaveBeenCalledWith('adj-1', { pct: '10' })
    })
  })

  it('CA-03-05 (decisión #112): un % negativo exige confirmación explícita antes de enviar', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(contractsApi.listPendingAdjustments).mockResolvedValueOnce({
      data: [
        {
          id: 'adj-1',
          contract_id: 'c-1',
          due_period: '2026-07-01',
          status: 'pending',
          pct_applied: null,
          previous_amount: null,
          new_amount: null,
          notes: null,
          applied_by: null,
          applied_at: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
      meta: {},
    })
    vi.mocked(contractsApi.get).mockResolvedValue({ data: DRAFT_CONTRACT_ARS })

    renderContractsApp('/contracts/adjustments')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Ingresar % de ajuste' }))
    await user.type(screen.getByLabelText('% de ajuste'), '-15')
    await user.click(screen.getByRole('button', { name: 'Aplicar ajuste' }))

    expect(
      screen.getByText(
        'Confirmás aplicar un ajuste negativo de -15%? Esto reduce el monto vigente del contrato.',
      ),
    ).toBeInTheDocument()
    expect(contractsApi.applyAdjustment).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirmar % negativo' }))

    await waitFor(() => {
      expect(contractsApi.applyAdjustment).toHaveBeenCalledWith('adj-1', { pct: '-15' })
    })
  })

  it('ADJUSTMENT_PCT_REQUIRED: aplicar sin ingresar % muestra el mensaje del catálogo', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(contractsApi.listPendingAdjustments).mockResolvedValueOnce({
      data: [
        {
          id: 'adj-1',
          contract_id: 'c-1',
          due_period: '2026-07-01',
          status: 'pending',
          pct_applied: null,
          previous_amount: null,
          new_amount: null,
          notes: null,
          applied_by: null,
          applied_at: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
      meta: {},
    })
    vi.mocked(contractsApi.get).mockResolvedValue({ data: DRAFT_CONTRACT_ARS })
    vi.mocked(contractsApi.applyAdjustment).mockRejectedValueOnce(
      new AdminPropApiError('ADJUSTMENT_PCT_REQUIRED', 400, 'Se requiere el porcentaje de ajuste.'),
    )

    renderContractsApp('/contracts/adjustments')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Ingresar % de ajuste' }))
    await user.type(screen.getByLabelText('% de ajuste'), '0')
    await user.click(screen.getByRole('button', { name: 'Aplicar ajuste' }))

    await waitFor(() => {
      expect(screen.getByText('Se requiere el porcentaje de ajuste.')).toBeInTheDocument()
    })
  })

  it('CA-03-06 (lectura): el monto vigente no tiene ningún control de edición en la ficha', async () => {
    setSession(OWNER_SESSION)
    mockDetailLinkDefaults()
    vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
    vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })

    renderContractsApp('/contracts/c-2')

    await waitFor(() => screen.getByTestId('contract-detail'))
    expect(screen.queryByLabelText('Monto vigente')).not.toBeInTheDocument()
    // Issue #56 punto 2: sin centavos cuando son ,00.
    expect(screen.getByTestId('contract-detail')).toHaveTextContent('100.000')
    expect(screen.getByTestId('contract-detail')).not.toHaveTextContent('100.000,00')
  })

  it('un usuario sin adjustment:apply ve la bandeja pero no puede aplicar ajustes', async () => {
    setSession(READONLY_SESSION)
    vi.mocked(contractsApi.listPendingAdjustments).mockResolvedValueOnce({
      data: [
        {
          id: 'adj-1',
          contract_id: 'c-1',
          due_period: '2026-07-01',
          status: 'pending',
          pct_applied: null,
          previous_amount: null,
          new_amount: null,
          notes: null,
          applied_by: null,
          applied_at: null,
          created_at: '2026-07-01T00:00:00Z',
          updated_at: '2026-07-01T00:00:00Z',
        },
      ],
      meta: {},
    })

    renderContractsApp('/contracts/adjustments')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Ingresar % de ajuste' }))

    expect(
      await screen.findByText((text) => text.startsWith('No tenés permiso para aplicar ajustes')),
    ).toBeInTheDocument()
  })

  it('CA-03-XX: un maintenance no ve el listado de contratos ni dispara el request', async () => {
    setSession(MAINTENANCE_SESSION)

    renderContractsApp('/contracts')

    await waitFor(() => {
      expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    })
    expect(contractsApi.list).not.toHaveBeenCalled()
  })

  // Issue #50 (espejo de back#100, RN-08/RN-C06) ────────────────────────
  describe('UC — alta de contrato en curso', () => {
    it('CA-03-09/13: el toggle "en curso" despliega monto vigente + desde cuándo rige', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })

      expect(screen.queryByLabelText('Monto vigente hoy')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Desde cuándo rige')).not.toBeInTheDocument()

      await user.click(screen.getByLabelText('El contrato ya está en curso'))

      expect(screen.getByLabelText('Monto vigente hoy')).toBeInTheDocument()
      expect(screen.getByLabelText('Desde cuándo rige')).toBeInTheDocument()
      expect(
        screen.getByText(
          'El mes actual nace con este monto vigente; el próximo aumento por índice se cuenta desde esta fecha, no desde el inicio del contrato.',
        ),
      ).toBeInTheDocument()
    })

    it('CA-03-09/13: alta retroactiva envía current_amount + current_amount_since normalizado al día 1', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list)
        .mockResolvedValueOnce({ data: [], meta: {} })
        .mockResolvedValueOnce({ data: [DRAFT_CONTRACT_ARS], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-01-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2026-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))
      await user.type(screen.getByLabelText('Monto vigente hoy'), '130000')
      await user.type(screen.getByLabelText('Desde cuándo rige'), '2026-03')

      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(contractsApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            current_amount: '130000',
            current_amount_since: '2026-03-01',
          }),
        )
      })
    })

    it('CA-03-13: un contrato USD también acepta el alta en curso', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({
        data: { ...DRAFT_CONTRACT_ARS, currency: 'USD' },
      })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '1000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-01-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2026-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))
      await user.type(screen.getByLabelText('Monto vigente hoy'), '1200')
      await user.type(screen.getByLabelText('Desde cuándo rige'), '2026-03')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(contractsApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            currency: 'USD',
            current_amount: '1200',
            current_amount_since: '2026-03-01',
          }),
        )
      })
    })

    it('CA-03-15: enviar sólo uno de los dos campos muestra el error inline y no dispara el submit', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-01-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2026-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))
      await user.type(screen.getByLabelText('Monto vigente hoy'), '130000')
      // "Desde cuándo rige" queda vacío a propósito.
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(
          screen.getByText('Ingresá desde cuándo rige el monto vigente.'),
        ).toBeInTheDocument()
      })
      expect(contractsApi.create).not.toHaveBeenCalled()
    })

    it('CA-03-14: una fecha anterior al inicio del contrato muestra el error inline', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-06-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2026-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))
      await user.type(screen.getByLabelText('Monto vigente hoy'), '130000')
      await user.type(screen.getByLabelText('Desde cuándo rige'), '2026-01')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(
          screen.getByText('Debe ser posterior o igual a la fecha de inicio del contrato.'),
        ).toBeInTheDocument()
      })
      expect(contractsApi.create).not.toHaveBeenCalled()
    })

    it('CA-03-14: una fecha posterior a hoy muestra el error inline', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-01-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2030-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))
      await user.type(screen.getByLabelText('Monto vigente hoy'), '130000')
      const futureMonth = `${new Date().getFullYear() + 5}-01`
      await user.type(screen.getByLabelText('Desde cuándo rige'), futureMonth)
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(screen.getByText('No puede ser posterior a hoy.')).toBeInTheDocument()
      })
      expect(contractsApi.create).not.toHaveBeenCalled()
    })

    it('INVALID_DATE_RANGE del backend se muestra como error inline en el campo', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.create).mockRejectedValueOnce(
        new AdminPropApiError(
          'INVALID_DATE_RANGE',
          400,
          'El rango de fechas ingresado no es válido.',
          'current_amount_since',
        ),
      )

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-01-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2026-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))
      await user.type(screen.getByLabelText('Monto vigente hoy'), '130000')
      await user.type(screen.getByLabelText('Desde cuándo rige'), '2026-03')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(
          screen.getAllByText('El rango de fechas ingresado no es válido.').length,
        ).toBeGreaterThan(0)
      })
    })

    it('CA-03-11: el historial distingue la "Carga inicial" de un ajuste % común', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({ data: DRAFT_CONTRACT_ARS })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({
        data: [
          {
            id: 'adj-initial',
            contract_id: 'c-1',
            due_period: '2026-03-01',
            status: 'applied',
            pct_applied: null,
            previous_amount: '100000.00',
            new_amount: '130000.00',
            notes: 'Carga inicial: alta de contrato en curso',
            applied_by: 'owner@inmobiliaria-sur.com',
            applied_at: '2026-01-01T00:00:00Z',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        meta: {},
      })

      renderContractsApp('/contracts/c-1')

      await waitFor(() => screen.getByTestId('contract-adjustments-history'))
      expect(screen.getByText('Carga inicial')).toBeInTheDocument()
      expect(screen.getByTestId('initial-load-badge-adj-initial')).toBeInTheDocument()
      expect(screen.queryByText('null%')).not.toBeInTheDocument()
    })
  })

  // Issue #57 (espejo de back#107, RN-C06 v2, sdd_03 §8 v1.13) ───────────
  // Reemplaza el mecanismo del #50 cuando el contrato es ARS con
  // adjustment_frequency_months: pide un valor por tramo transcurrido
  // (historical_amounts[]) en vez de un único current_amount/since.
  describe('UC — alta de contrato en curso por tramos (#57)', () => {
    beforeEach(() => {
      // "Hoy" fijo para que los tramos/labels sean deterministas: cae
      // dentro del tercer tramo (ene 2027 – abr 2027) del ejemplo del
      // issue #57 (start=may 2026, frecuencia=4 meses).
      // Sólo `Date` — dejar `setTimeout`/`setInterval` reales evita que
      // se cuelguen userEvent/waitFor/TanStack Query (retries, debounce)
      // que dependen de temporizadores reales durante el test.
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2027-02-10T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('CA-03-09: 0 tramos — contrato recién arrancado no pide ni envía historical_amounts', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list)
        .mockResolvedValueOnce({ data: [], meta: {} })
        .mockResolvedValueOnce({ data: [DRAFT_CONTRACT_ARS], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2027-01-15')
      await user.type(screen.getByLabelText('Fecha de fin'), '2027-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '6')
      await user.selectOptions(screen.getByLabelText('Índice de referencia'), 'icl')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))

      expect(
        await screen.findByText(
          'El contrato recién empezó — no hay tramos anteriores que declarar. Se da de alta como un contrato nuevo normal.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText(/Valor original/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Monto vigente hoy')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => expect(contractsApi.create).toHaveBeenCalled())
      const payload = vi.mocked(contractsApi.create).mock.calls[0]?.[0]
      expect(payload?.historical_amounts).toBeUndefined()
      expect(payload?.current_amount).toBeUndefined()
      expect(payload?.current_amount_since).toBeUndefined()
    })

    it('CA-03-09/12: 2 tramos (1 aumento transcurrido) — labels correctos y payload en orden', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list)
        .mockResolvedValueOnce({ data: [], meta: {} })
        .mockResolvedValueOnce({ data: [DRAFT_CONTRACT_ARS], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-09-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2027-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '4')
      await user.selectOptions(screen.getByLabelText('Índice de referencia'), 'icl')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))

      expect(
        await screen.findByLabelText('Valor original (sep 2026 – dic 2026)'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Primer aumento (ene 2027 – hoy)')).toBeInTheDocument()
      expect(screen.queryByLabelText(/Segundo aumento/)).not.toBeInTheDocument()

      await user.type(screen.getByLabelText('Valor original (sep 2026 – dic 2026)'), '100000')
      await user.type(screen.getByLabelText('Primer aumento (ene 2027 – hoy)'), '115000')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(contractsApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            historical_amounts: ['100000', '115000'],
          }),
        )
      })
      const payload = vi.mocked(contractsApi.create).mock.calls[0]?.[0]
      expect(payload?.current_amount).toBeUndefined()
      expect(payload?.current_amount_since).toBeUndefined()
    })

    it('CA-03-09/12: 3 tramos (2 aumentos transcurridos) — labels del ejemplo del issue', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-05-01')
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '4')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))

      expect(
        await screen.findByLabelText('Valor original (may 2026 – ago 2026)'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Primer aumento (sep 2026 – dic 2026)')).toBeInTheDocument()
      expect(screen.getByLabelText('Segundo aumento (ene 2027 – hoy)')).toBeInTheDocument()
    })

    it('recalcula los tramos en vivo al cambiar start_date o la frecuencia', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.type(screen.getByLabelText('Fecha de inicio'), '2027-01-01')
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '6')
      await user.click(screen.getByLabelText('El contrato ya está en curso'))

      expect(
        await screen.findByText(
          'El contrato recién empezó — no hay tramos anteriores que declarar. Se da de alta como un contrato nuevo normal.',
        ),
      ).toBeInTheDocument()

      // Bajar la frecuencia a 1 mes hace que aparezcan tramos vencidos.
      await user.clear(screen.getByLabelText('Frecuencia de ajuste (meses)'))
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '1')

      expect(
        await screen.findByLabelText('Valor original (ene 2027 – ene 2027)'),
      ).toBeInTheDocument()
    })

    it('valida que TODOS los tramos sean obligatorios y > 0', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-09-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2027-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '4')
      await user.selectOptions(screen.getByLabelText('Índice de referencia'), 'icl')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))
      await screen.findByLabelText('Valor original (sep 2026 – dic 2026)')
      // Sólo se completa el primer tramo; el segundo queda vacío.
      await user.type(screen.getByLabelText('Valor original (sep 2026 – dic 2026)'), '100000')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(
          screen.getByText('Ingresá el monto de "Primer aumento (ene 2027 – hoy)".'),
        ).toBeInTheDocument()
      })
      expect(contractsApi.create).not.toHaveBeenCalled()

      await user.type(screen.getByLabelText('Primer aumento (ene 2027 – hoy)'), '0')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(
          screen.getByText('El monto de "Primer aumento (ene 2027 – hoy)" debe ser mayor a 0.'),
        ).toBeInTheDocument()
      })
      expect(contractsApi.create).not.toHaveBeenCalled()
    })

    it('VALIDATION_ERROR de historical_amounts (cantidad incorrecta) del backend se muestra inline', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.create).mockRejectedValueOnce(
        new AdminPropApiError(
          'VALIDATION_ERROR',
          400,
          'El sistema espera 3 valores para los tramos transcurridos.',
          'historical_amounts',
        ),
      )

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-09-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2027-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '4')
      await user.selectOptions(screen.getByLabelText('Índice de referencia'), 'icl')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))
      await user.type(
        await screen.findByLabelText('Valor original (sep 2026 – dic 2026)'),
        '100000',
      )
      await user.type(screen.getByLabelText('Primer aumento (ene 2027 – hoy)'), '115000')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(
        () => {
          expect(
            screen.getAllByText('El sistema espera 3 valores para los tramos transcurridos.')
              .length,
          ).toBeGreaterThan(0)
        },
        { timeout: 3000 },
      )
    })

    it('USD sigue usando el mecanismo único current_amount/since del #50 (nunca tramos)', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({
        data: { ...DRAFT_CONTRACT_ARS, currency: 'USD' },
      })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Moneda'), 'USD')
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '1000')
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-05-01')
      await user.type(screen.getByLabelText('Fecha de fin'), '2027-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')

      await user.click(screen.getByLabelText('El contrato ya está en curso'))
      expect(screen.getByLabelText('Monto vigente hoy')).toBeInTheDocument()
      expect(screen.queryByLabelText(/Valor original/)).not.toBeInTheDocument()

      await user.type(screen.getByLabelText('Monto vigente hoy'), '1200')
      await user.type(screen.getByLabelText('Desde cuándo rige'), '2027-01')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(contractsApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            currency: 'USD',
            current_amount: '1200',
            current_amount_since: '2027-01-01',
          }),
        )
      })
      const payload = vi.mocked(contractsApi.create).mock.calls[0]?.[0]
      expect(payload?.historical_amounts).toBeUndefined()
    })
  })

  // Issue #56 — pulido #2 del PO (cierra #38) ────────────────────────────
  describe('Issue #56 — pulido del módulo Contratos', () => {
    it('CA-56-01: el listado y la ficha muestran el estado con badge legible (cierra #38)', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [ACTIVE_CONTRACT], meta: {} })
      vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      expect(await screen.findByText('Activo')).toBeInTheDocument()

      renderContractsApp('/contracts/c-2')
      // La ficha ya no muestra el status crudo del backend (#38).
      expect(screen.queryByText('Estado: active')).not.toBeInTheDocument()
      expect(await screen.findAllByText('Activo')).not.toHaveLength(0)
    })

    it('CA-56-02: el listado muestra los montos sin centavos cuando son ,00', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [DRAFT_CONTRACT_ARS], meta: {} })

      renderContractsApp('/contracts')

      expect(await screen.findByText('100.000')).toBeInTheDocument()
      expect(screen.queryByText('100.000,00')).not.toBeInTheDocument()
    })

    it('CA-56-03: la ficha muestra propiedad e inquilino linkeados, monto inicial, índice y notas', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({
        data: { ...ACTIVE_CONTRACT, notes: 'Inquilino solicitó recibo por mail.' },
      })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts/c-2')

      const detail = await screen.findByTestId('contract-detail')
      const propertyLink = await screen.findByRole('link', { name: 'Av. Colón 1234' })
      expect(propertyLink).toHaveAttribute('href', '/properties/p-1')
      const renterLink = screen.getByRole('link', { name: 'María López' })
      expect(renterLink).toHaveAttribute('href', '/people/renters/r-1')
      expect(detail).toHaveTextContent('ICL')
      expect(detail).toHaveTextContent('Inquilino solicitó recibo por mail.')
    })

    it('CA-56-04: sólo un usuario con contract:terminate ve el botón de terminar (owner sí, admin no)', async () => {
      setSession(ADMIN_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts/c-2')
      await screen.findByTestId('contract-detail')
      expect(screen.queryByRole('button', { name: 'Terminar contrato' })).not.toBeInTheDocument()

      setSession(OWNER_SESSION)
      renderContractsApp('/contracts/c-2')
      expect(
        await screen.findByRole('button', { name: 'Terminar contrato' }),
      ).toBeInTheDocument()
    })

    it('CA-56-05: el owner descarga el certificado de libre deuda del contrato', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.downloadDebtCertificate).mockResolvedValueOnce(undefined)

      renderContractsApp('/contracts/c-2')
      const user = userEvent.setup()

      await user.click(
        await screen.findByRole('button', { name: 'Descargar certificado de libre deuda' }),
      )

      await waitFor(() => {
        expect(contractsApi.downloadDebtCertificate).toHaveBeenCalledWith('c-2')
      })
    })

    it('CA-56-05: 422 CONTRACT_HAS_DEBT muestra el detalle de lo adeudado del contrato', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.downloadDebtCertificate).mockRejectedValueOnce(
        new AdminPropApiError('CONTRACT_HAS_DEBT', 422, 'El contrato tiene deuda pendiente.', null, {
          overdue_periods: 2,
          balance: '200000.00',
        }),
      )

      renderContractsApp('/contracts/c-2')
      const user = userEvent.setup()

      await user.click(
        await screen.findByRole('button', { name: 'Descargar certificado de libre deuda' }),
      )

      await waitFor(() => {
        expect(screen.getByText('El contrato tiene deuda pendiente.')).toBeInTheDocument()
      })
      expect(screen.getByTestId('contract-debt-certificate-details')).toHaveTextContent(
        'overdue_periods',
      )
    })

    it('CA-56-06: la ficha muestra el historial de valores locativos mes a mes', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts/c-2')

      const history = await screen.findByTestId('monthly-amounts-history')
      // MONTHLY_AMOUNTS[0] es "110000.00" (2026-03) — con centavos ocultos.
      expect(history).toHaveTextContent('110.000')
      expect(history).not.toHaveTextContent('110.000,00')
    })
  })
})
