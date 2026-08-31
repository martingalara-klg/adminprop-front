// src/modules/contracts/__tests__/contracts.spec.tsx
//
// SDD: spec_module_03_contratos.md RF-01..RF-05 + sdd_03 §8 (v1.9).
// Issue #11 — CA-03-01..08 (lado UI).
// Issue #50 (espejo de back#100, RN-08/RN-C06) — CA-03-09..15: alta de
// contrato en curso (monto vigente + desde cuándo rige).
// Issue #57 (espejo de back#107, RN-C06 v2) — tramos (historical_amounts[]).
// Issue #69 (feedback #3 del PO) — CA-69-01..06: propiedades rented no
// elegibles, frecuencia antes de "en curso", detección automática por
// mes de inicio, labels "Valor locativo (mes – mes)".
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
    // Issue #69: propiedad con contrato activo — no elegible en el alta.
    {
      id: 'p-2',
      address: 'Bv. San Juan 500',
      landlord_id: 'l-1',
      neighborhood_id: null,
      property_type: 'departamento',
      status: 'rented',
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

// Issue #69: "en curso" se detecta por mes de inicio anterior al actual,
// así que los tests de alta NORMAL usan el primer día del mes corriente.
const CURRENT_MONTH_START = `${new Date().toISOString().slice(0, 7)}-01`
const NEXT_YEAR_END = `${new Date().getFullYear() + 1}-12-31`

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
    // Issue #69: un inicio en el mes actual es un alta normal (sin
    // sección "en curso") — fechas dinámicas para que el test no envejezca.
    await user.type(screen.getByLabelText('Fecha de inicio'), CURRENT_MONTH_START)
    await user.type(screen.getByLabelText('Fecha de fin'), NEXT_YEAR_END)
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
    await user.type(screen.getByLabelText('Fecha de inicio'), CURRENT_MONTH_START)
    await user.type(screen.getByLabelText('Fecha de fin'), NEXT_YEAR_END)
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
          applied_by_name: null,
          applied_at: null,
          pct_effective: null,
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
          applied_by_name: null,
          applied_at: null,
          pct_effective: null,
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
        applied_by_name: 'Owner Uno',
        applied_at: '2026-07-02T00:00:00Z',
        pct_effective: '10.00',
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
          applied_by_name: null,
          applied_at: null,
          pct_effective: null,
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
          applied_by_name: null,
          applied_at: null,
          pct_effective: null,
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
          applied_by_name: null,
          applied_at: null,
          pct_effective: null,
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
  // Issue #69: ya no hay checkbox — la sección "en curso" aparece sola
  // cuando el mes de inicio es anterior al actual. Sin frecuencia (ARS
  // sin ajuste / USD) el mecanismo current_amount/since del #50 sigue
  // vigente, ahora OPCIONAL pero sólo válido con ambos campos.
  describe('UC — alta de contrato en curso', () => {
    // Helper: completa los campos base con un inicio en un mes ya pasado
    // (ene 2026 — siempre anterior al mes actual) y sin frecuencia.
    async function fillBaseInProgressContract(
      user: ReturnType<typeof userEvent.setup>,
      opts: { currency?: 'ARS' | 'USD'; startDate?: string; endDate?: string } = {},
    ) {
      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      if (opts.currency) {
        await user.selectOptions(screen.getByLabelText('Moneda'), opts.currency)
      }
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), opts.startDate ?? '2026-01-01')
      await user.type(screen.getByLabelText('Fecha de fin'), opts.endDate ?? '2026-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')
    }

    it('CA-03-09/13: un inicio en un mes pasado despliega solo la sección "en curso" con monto vigente + desde cuándo rige', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })

      // Issue #69: no existe más el checkbox.
      expect(screen.queryByLabelText('El contrato ya está en curso')).not.toBeInTheDocument()
      expect(screen.queryByTestId('contract-in-progress-section')).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Monto vigente hoy')).not.toBeInTheDocument()

      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-01-01')

      expect(await screen.findByTestId('contract-in-progress-section')).toBeInTheDocument()
      // Issue #78: mes capitalizado, unificado con formatPeriodLabel.
      expect(screen.getByText('Contrato en curso desde Enero 2026')).toBeInTheDocument()
      expect(screen.getByLabelText('Monto vigente hoy')).toBeInTheDocument()
      expect(screen.getByLabelText('Desde cuándo rige')).toBeInTheDocument()
      // ARS sin frecuencia: la sección pide completar la frecuencia primero.
      expect(
        screen.getByText(/Completá primero la frecuencia de ajuste para calcular los aumentos/),
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

      await fillBaseInProgressContract(user)
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

      await fillBaseInProgressContract(user, { currency: 'USD' })
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

    it('Issue #69: sin frecuencia, el monto vigente es opcional — dejarlo vacío da de alta sin declarar nada', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await fillBaseInProgressContract(user)
      expect(screen.getByLabelText('Monto vigente hoy')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => expect(contractsApi.create).toHaveBeenCalled())
      const payload = vi.mocked(contractsApi.create).mock.calls[0]?.[0]
      expect(payload?.current_amount).toBeUndefined()
      expect(payload?.current_amount_since).toBeUndefined()
      expect(payload?.historical_amounts).toBeUndefined()
    })

    it('CA-03-15: enviar sólo uno de los dos campos muestra el error inline y no dispara el submit', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await fillBaseInProgressContract(user)
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

      await fillBaseInProgressContract(user, { startDate: '2026-06-01' })
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

      await fillBaseInProgressContract(user, { endDate: '2030-12-31' })
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

      await fillBaseInProgressContract(user)
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
            applied_by_name: 'Owner Uno',
            applied_at: '2026-01-01T00:00:00Z',
            pct_effective: '30.00',
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

    // Issue #70 punto 2 (espejo de back#118, decisión #127) ──────────────
    it('CA-70-04: el historial muestra applied_by_name y pct_effective en filas normales', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({ data: DRAFT_CONTRACT_ARS })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({
        data: [
          {
            id: 'adj-manual',
            contract_id: 'c-1',
            due_period: '2026-07-01',
            status: 'applied',
            pct_applied: '12.50',
            previous_amount: '100000.00',
            new_amount: '112500.00',
            notes: null,
            applied_by: '5f0c8f3a-1111-2222-3333-444455556666',
            applied_by_name: 'Owner Uno',
            applied_at: '2026-07-02T00:00:00Z',
            pct_effective: '12.50',
            created_at: '2026-07-01T00:00:00Z',
            updated_at: '2026-07-02T00:00:00Z',
          },
        ],
        meta: {},
      })

      renderContractsApp('/contracts/c-1')

      const table = await screen.findByTestId('contract-adjustments-history')
      // "Aplicado por" = nombre resuelto por el backend, nunca el UUID.
      expect(table).toHaveTextContent('Owner Uno')
      expect(table).not.toHaveTextContent('5f0c8f3a-1111-2222-3333-444455556666')
      // % = pct_effective formateado es-AR.
      expect(table).toHaveTextContent('12,5%')
    })

    it('CA-70-05: la fila de "Carga inicial" muestra el % (pct_effective) además de la etiqueta', async () => {
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
            applied_by: 'a0b1c2d3-9999-8888-7777-666655554444',
            applied_by_name: 'Owner Uno',
            applied_at: '2026-01-01T00:00:00Z',
            pct_effective: '30.00',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        ],
        meta: {},
      })

      renderContractsApp('/contracts/c-1')

      const table = await screen.findByTestId('contract-adjustments-history')
      // La etiqueta se mantiene como marca de origen…
      expect(screen.getByTestId('initial-load-badge-adj-initial')).toHaveTextContent(
        'Carga inicial',
      )
      // …y ahora convive con el % efectivo calculado por el backend.
      expect(table).toHaveTextContent('30%')
      expect(table).toHaveTextContent('Owner Uno')
      expect(table).not.toHaveTextContent('a0b1c2d3-9999-8888-7777-666655554444')
    })
  })

  // Issue #57 (espejo de back#107, RN-C06 v2, sdd_03 §8 v1.13) ───────────
  // Reemplaza el mecanismo del #50 cuando el contrato es ARS con
  // adjustment_frequency_months: pide un valor por tramo transcurrido
  // (historical_amounts[]) en vez de un único current_amount/since.
  // Issue #69: sin checkbox (detección por mes de inicio), el "Monto
  // inicial" es el tramo 1 (no se vuelve a pedir) y los labels son
  // "Valor locativo (mes – mes)".
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

    async function fillArsContract(
      user: ReturnType<typeof userEvent.setup>,
      opts: { startDate: string; frequency: string; endDate?: string },
    ) {
      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), opts.startDate)
      await user.type(screen.getByLabelText('Fecha de fin'), opts.endDate ?? '2027-12-31')
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), opts.frequency)
      await user.selectOptions(screen.getByLabelText('Índice de referencia'), 'icl')
    }

    it('CA-03-09: 0 tramos — inicio el mes pasado sin aumentos: nota informativa y no envía historical_amounts', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list)
        .mockResolvedValueOnce({ data: [], meta: {} })
        .mockResolvedValueOnce({ data: [DRAFT_CONTRACT_ARS], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await fillArsContract(user, { startDate: '2027-01-15', frequency: '6' })

      expect(await screen.findByText('Contrato en curso desde Enero 2027')).toBeInTheDocument()
      expect(
        screen.getByText(/Sin aumentos transcurridos: el monto inicial sigue vigente/),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText(/Valor locativo/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Monto vigente hoy')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => expect(contractsApi.create).toHaveBeenCalled())
      const payload = vi.mocked(contractsApi.create).mock.calls[0]?.[0]
      expect(payload?.historical_amounts).toBeUndefined()
      expect(payload?.current_amount).toBeUndefined()
      expect(payload?.current_amount_since).toBeUndefined()
    })

    it('CA-03-09/12: 2 tramos (1 aumento transcurrido) — pide sólo el segundo tramo y antepone el monto inicial en el payload', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list)
        .mockResolvedValueOnce({ data: [], meta: {} })
        .mockResolvedValueOnce({ data: [DRAFT_CONTRACT_ARS], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await fillArsContract(user, { startDate: '2026-09-01', frequency: '4' })

      expect(
        await screen.findByLabelText('Valor locativo (ene 2027 – abr 2027)'),
      ).toBeInTheDocument()
      // Issue #69: el tramo inicial NO se vuelve a pedir — es el "Monto inicial".
      expect(screen.queryByLabelText(/Valor original/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/aumento/i)).not.toBeInTheDocument()
      expect(screen.getAllByLabelText(/Valor locativo/)).toHaveLength(1)
      expect(
        screen.getByText(
          /El monto inicial es el valor locativo del primer tramo \(sep 2026 – dic 2026\)/,
        ),
      ).toBeInTheDocument()

      await user.type(screen.getByLabelText('Valor locativo (ene 2027 – abr 2027)'), '115000')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(contractsApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            initial_amount: '100000',
            historical_amounts: ['100000', '115000'],
          }),
        )
      })
      const payload = vi.mocked(contractsApi.create).mock.calls[0]?.[0]
      expect(payload?.current_amount).toBeUndefined()
      expect(payload?.current_amount_since).toBeUndefined()
    })

    it('CA-03-09/12: 3 tramos (2 aumentos transcurridos) — labels "Valor locativo (mes – mes)" del ejemplo del issue', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-05-01')
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '4')

      expect(
        await screen.findByLabelText('Valor locativo (sep 2026 – dic 2026)'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Valor locativo (ene 2027 – abr 2027)')).toBeInTheDocument()
      expect(screen.getAllByLabelText(/Valor locativo/)).toHaveLength(2)
      expect(screen.getByText(/primer tramo \(may 2026 – ago 2026\)/)).toBeInTheDocument()
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

      expect(
        await screen.findByText(/Sin aumentos transcurridos: el monto inicial sigue vigente/),
      ).toBeInTheDocument()

      // Bajar la frecuencia a 1 mes hace que aparezca un tramo vencido.
      await user.clear(screen.getByLabelText('Frecuencia de ajuste (meses)'))
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), '1')

      expect(
        await screen.findByLabelText('Valor locativo (feb 2027 – feb 2027)'),
      ).toBeInTheDocument()
    })

    it('valida que TODOS los tramos sean obligatorios y > 0', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await fillArsContract(user, { startDate: '2026-09-01', frequency: '4' })
      await screen.findByLabelText('Valor locativo (ene 2027 – abr 2027)')
      // El tramo pedido queda vacío.
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(
          screen.getByText('Ingresá el monto de "Valor locativo (ene 2027 – abr 2027)".'),
        ).toBeInTheDocument()
      })
      expect(contractsApi.create).not.toHaveBeenCalled()

      await user.type(screen.getByLabelText('Valor locativo (ene 2027 – abr 2027)'), '0')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(
          screen.getByText(
            'El monto de "Valor locativo (ene 2027 – abr 2027)" debe ser mayor a 0.',
          ),
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

      await fillArsContract(user, { startDate: '2026-09-01', frequency: '4' })
      await user.type(
        await screen.findByLabelText('Valor locativo (ene 2027 – abr 2027)'),
        '115000',
      )
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

      expect(await screen.findByLabelText('Monto vigente hoy')).toBeInTheDocument()
      expect(screen.queryByLabelText(/Valor locativo/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Completá primero la frecuencia/)).not.toBeInTheDocument()

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

  // Issue #69 — form de contrato v3 (feedback #3 del PO, 2026-08-29) ─────
  describe('Issue #69 — form de contrato v3', () => {
    beforeEach(() => {
      // Ejemplo literal del PO: hoy 29/08/2026, inicio 01/07/2026 → en curso.
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-08-29T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    async function fillArsContract(
      user: ReturnType<typeof userEvent.setup>,
      opts: { startDate: string; frequency: string; endDate: string },
    ) {
      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      await user.selectOptions(screen.getByLabelText('Inquilino'), 'r-1')
      await user.type(screen.getByLabelText('Monto inicial'), '100000')
      await user.type(screen.getByLabelText('Fecha de inicio'), opts.startDate)
      await user.type(screen.getByLabelText('Fecha de fin'), opts.endDate)
      await user.type(screen.getByLabelText('% de mora diaria'), '0.10')
      await user.type(screen.getByLabelText('Frecuencia de ajuste (meses)'), opts.frequency)
      await user.selectOptions(screen.getByLabelText('Índice de referencia'), 'icl')
    }

    it('CA-69-01: una propiedad con contrato activo (rented) aparece deshabilitada con la leyenda "Con contrato"', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      const available = await screen.findByRole('option', { name: 'Av. Colón 1234' })
      const rented = screen.getByRole('option', { name: 'Bv. San Juan 500 — Con contrato' })

      expect(available).toBeEnabled()
      expect(rented).toBeDisabled()

      // El select no permite elegirla: el valor no cambia.
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-1')
      expect(screen.getByLabelText('Propiedad')).toHaveValue('p-1')
      await user.selectOptions(screen.getByLabelText('Propiedad'), 'p-2').catch(() => undefined)
      expect(screen.getByLabelText('Propiedad')).not.toHaveValue('p-2')
    })

    it('CA-69-02: la frecuencia de ajuste (e índice) va ANTES de la sección de contrato en curso', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-07-01')

      const frequency = screen.getByLabelText('Frecuencia de ajuste (meses)')
      const index = screen.getByLabelText('Índice de referencia')
      const inProgressSection = await screen.findByTestId('contract-in-progress-section')

      const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING
      expect(frequency.compareDocumentPosition(inProgressSection) & FOLLOWING).toBeTruthy()
      expect(index.compareDocumentPosition(inProgressSection) & FOLLOWING).toBeTruthy()
    })

    it('CA-69-03: ARS en curso sin frecuencia cargada — la sección indica completarla primero', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      await screen.findByRole('option', { name: 'Av. Colón 1234' })
      await user.type(screen.getByLabelText('Fecha de inicio'), '2026-07-01')

      expect(await screen.findByText('Contrato en curso desde Julio 2026')).toBeInTheDocument()
      expect(
        screen.getByText(/Completá primero la frecuencia de ajuste para calcular los aumentos/),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText(/Valor locativo/)).not.toBeInTheDocument()
    })

    it('CA-69-04: inicio en un mes pasado sin tramos transcurridos → nota informativa, sin campos extra', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await fillArsContract(user, {
        startDate: '2026-07-01',
        frequency: '6',
        endDate: '2028-06-30',
      })

      expect(await screen.findByText('Contrato en curso desde Julio 2026')).toBeInTheDocument()
      expect(
        screen.getByText(
          /Sin aumentos transcurridos: el monto inicial sigue vigente\. Los meses ya transcurridos se registran automáticamente como cobrados/,
        ),
      ).toBeInTheDocument()
      expect(screen.queryByLabelText(/Valor locativo/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Monto vigente hoy')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => expect(contractsApi.create).toHaveBeenCalled())
      const payload = vi.mocked(contractsApi.create).mock.calls[0]?.[0]
      expect(payload?.historical_amounts).toBeUndefined()
      expect(payload?.current_amount).toBeUndefined()
    })

    it('CA-69-05: con tramos transcurridos pide "Valor locativo (mes – mes)" sin repetir el valor original', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      // Inicio ene 2026, frecuencia 3 → tramos ene–mar, abr–jun, jul–sep (hoy = ago).
      await fillArsContract(user, {
        startDate: '2026-01-01',
        frequency: '3',
        endDate: '2027-12-31',
      })

      expect(
        await screen.findByLabelText('Valor locativo (abr 2026 – jun 2026)'),
      ).toBeInTheDocument()
      expect(screen.getByLabelText('Valor locativo (jul 2026 – sep 2026)')).toBeInTheDocument()
      expect(screen.getAllByLabelText(/Valor locativo/)).toHaveLength(2)
      expect(screen.queryByLabelText(/Valor original/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Primer aumento/)).not.toBeInTheDocument()

      await user.type(screen.getByLabelText('Valor locativo (abr 2026 – jun 2026)'), '110000')
      await user.type(screen.getByLabelText('Valor locativo (jul 2026 – sep 2026)'), '121000')
      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => {
        expect(contractsApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            initial_amount: '100000',
            historical_amounts: ['100000', '110000', '121000'],
          }),
        )
      })
    })

    it('CA-69-06: inicio este mes → alta normal, sin sección de contrato en curso', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.create).mockResolvedValueOnce({ data: DRAFT_CONTRACT_ARS })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await fillArsContract(user, {
        startDate: '2026-08-01',
        frequency: '6',
        endDate: '2028-07-31',
      })

      expect(screen.queryByTestId('contract-in-progress-section')).not.toBeInTheDocument()
      expect(screen.queryByText(/Contrato en curso desde/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText(/Valor locativo/)).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Monto vigente hoy')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Crear contrato' }))

      await waitFor(() => expect(contractsApi.create).toHaveBeenCalled())
      const payload = vi.mocked(contractsApi.create).mock.calls[0]?.[0]
      expect(payload?.historical_amounts).toBeUndefined()
      expect(payload?.current_amount).toBeUndefined()
      expect(payload?.current_amount_since).toBeUndefined()
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

    // Issue #70 punto 1: mensaje legible construido desde `details` (nunca
    // el JSON crudo). Shape real del back (debt_certificate_service.py):
    // { contract_id, property_id, periods_overdue, balance, days_late,
    //   suggested_interest }.
    it('CA-70-01: 422 CONTRACT_HAS_DEBT muestra un mensaje legible con interés sugerido (sin JSON)', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.downloadDebtCertificate).mockRejectedValueOnce(
        new AdminPropApiError('CONTRACT_HAS_DEBT', 422, 'El contrato tiene deuda pendiente.', null, {
          contract_id: 'c-2',
          property_id: 'p-2',
          periods_overdue: 1,
          balance: '1450000.00',
          days_late: 19,
          suggested_interest: '137750.00',
        }),
      )

      renderContractsApp('/contracts/c-2')
      const user = userEvent.setup()

      await user.click(
        await screen.findByRole('button', { name: 'Descargar certificado de libre deuda' }),
      )

      expect(
        await screen.findByText(
          'El contrato tiene deuda pendiente: 1 período adeudado · saldo $1.450.000 · 19 días de mora · interés sugerido $137.750',
        ),
      ).toBeInTheDocument()
      // Nada de bloques de código/JSON en la UI.
      expect(document.querySelector('pre')).toBeNull()
      expect(screen.getByTestId('contract-debt-certificate-details')).not.toHaveTextContent(
        'periods_overdue',
      )
      expect(screen.getByTestId('contract-debt-certificate-details')).not.toHaveTextContent('{')
    })

    it('CA-70-02: el mensaje de deuda pluraliza los períodos y omite el interés si el back no lo manda', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.downloadDebtCertificate).mockRejectedValueOnce(
        new AdminPropApiError('CONTRACT_HAS_DEBT', 422, 'El contrato tiene deuda pendiente.', null, {
          contract_id: 'c-2',
          property_id: 'p-2',
          periods_overdue: 2,
          balance: '200000.50',
          days_late: 1,
        }),
      )

      renderContractsApp('/contracts/c-2')
      const user = userEvent.setup()

      await user.click(
        await screen.findByRole('button', { name: 'Descargar certificado de libre deuda' }),
      )

      // Plural en períodos, singular en días, centavos sólo si son reales.
      expect(
        await screen.findByText(
          'El contrato tiene deuda pendiente: 2 períodos adeudados · saldo $200.000,50 · 1 día de mora',
        ),
      ).toBeInTheDocument()
      expect(screen.getByTestId('contract-debt-certificate-details')).not.toHaveTextContent(
        'interés sugerido',
      )
      expect(document.querySelector('pre')).toBeNull()
    })

    it('CA-70-03: 422 CONTRACT_HAS_DEBT con details vacío cae a un mensaje genérico legible', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })
      vi.mocked(contractsApi.downloadDebtCertificate).mockRejectedValueOnce(
        new AdminPropApiError(
          'CONTRACT_HAS_DEBT',
          422,
          'El contrato tiene deuda pendiente.',
          null,
          {},
        ),
      )

      renderContractsApp('/contracts/c-2')
      const user = userEvent.setup()

      await user.click(
        await screen.findByRole('button', { name: 'Descargar certificado de libre deuda' }),
      )

      expect(await screen.findByText('El contrato tiene deuda pendiente.')).toBeInTheDocument()
      expect(document.querySelector('pre')).toBeNull()
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

  // ── Issue #64 (ronda feedback #3 del PO) — BackLink ─────────────────────

  it('CA-64-07: el BackLink de la ficha del contrato vuelve al listado de Contratos', async () => {
    setSession(OWNER_SESSION)
    mockDetailLinkDefaults()
    vi.mocked(contractsApi.get).mockResolvedValue({ data: DRAFT_CONTRACT_ARS })
    vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })
    vi.mocked(contractsApi.list).mockResolvedValueOnce({ data: [], meta: {} })

    renderContractsApp('/contracts/c-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Volver a Contratos' }))

    expect(await screen.findByRole('button', { name: 'Nuevo contrato' })).toBeInTheDocument()
  })

  // ── Issue #84 (ronda feedback back#4 del PO) — pulido de contratos ──────
  describe('Issue #84 — notas del índice "otro" en la ficha + frecuencia sólo numérica', () => {
    it('CA-84-01: la ficha muestra "Otro — <notas>" cuando el índice es otro y hay notas', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({
        data: {
          ...ACTIVE_CONTRACT,
          adjustment_index: 'otro',
          adjustment_index_notes: 'Índice acordado con el propietario',
        },
      })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts/c-2')

      const detail = await screen.findByTestId('contract-detail')
      expect(detail).toHaveTextContent('Otro — Índice acordado con el propietario')
    })

    it('CA-84-02: la ficha muestra sólo "Otro" cuando el índice es otro sin notas', async () => {
      setSession(OWNER_SESSION)
      mockDetailLinkDefaults()
      vi.mocked(contractsApi.get).mockResolvedValue({
        data: { ...ACTIVE_CONTRACT, adjustment_index: 'otro', adjustment_index_notes: null },
      })
      vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts/c-2')

      const detail = await screen.findByTestId('contract-detail')
      expect(detail).toHaveTextContent('Otro')
      expect(detail).not.toHaveTextContent('Otro —')
    })

    it('CA-84-03: el input de frecuencia de ajuste rechaza letras al tipear y acepta números', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      const frequency = screen.getByLabelText('Frecuencia de ajuste (meses)')
      expect(frequency).toHaveAttribute('inputmode', 'numeric')

      // Las letras intercaladas no entran; los dígitos sí.
      await user.type(frequency, 'a6b3c')
      expect(frequency).toHaveValue('63')

      await user.clear(frequency)
      await user.type(frequency, 'abc')
      expect(frequency).toHaveValue('')
    })

    it('CA-84-04: el input de frecuencia de ajuste filtra los caracteres no numéricos al pegar', async () => {
      setSession(OWNER_SESSION)
      mockOptionDefaults()
      vi.mocked(contractsApi.list).mockResolvedValue({ data: [], meta: {} })

      renderContractsApp('/contracts')
      const user = userEvent.setup()

      await openCreateContractModal(user)
      const frequency = screen.getByLabelText('Frecuencia de ajuste (meses)')

      // Pegado mixto: sólo entran los dígitos.
      await user.click(frequency)
      await user.paste('1a2b')
      expect(frequency).toHaveValue('12')

      // Pegado sin dígitos: no entra nada.
      await user.clear(frequency)
      await user.paste('meses')
      expect(frequency).toHaveValue('')

      // Pegado 100% numérico: entra tal cual.
      await user.clear(frequency)
      await user.paste('6')
      expect(frequency).toHaveValue('6')
    })
  })
})
