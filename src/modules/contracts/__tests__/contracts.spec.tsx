// src/modules/contracts/__tests__/contracts.spec.tsx
//
// SDD: spec_module_03_contratos.md RF-01..RF-05 + sdd_03 §8 (v1.9).
// Issue #11 — CA-03-01..08 (lado UI).
// Issue #50 (espejo de back#100, RN-08/RN-C06) — CA-03-09..15: alta de
// contrato en curso (monto vigente + desde cuándo rige).
import { afterEach, describe, expect, it, vi } from 'vitest'
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
  },
}))

vi.mock('@/api/properties.api', () => ({
  propertiesApi: {
    list: vi.fn(),
  },
}))

vi.mock('@/api/people.api', () => ({
  peopleApi: {
    listRenters: vi.fn(),
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
    'adjustment:apply',
    'property:read',
    'renter:read',
  ],
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
}

const ACTIVE_CONTRACT = { ...DRAFT_CONTRACT_ARS, id: 'c-2', status: 'active' }

function mockOptionDefaults() {
  vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTIES)
  vi.mocked(peopleApi.listRenters).mockResolvedValue(RENTERS)
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

    expect(await screen.findByTestId('adjustment-preview')).toHaveTextContent('110.000,00')

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
    vi.mocked(contractsApi.get).mockResolvedValue({ data: ACTIVE_CONTRACT })
    vi.mocked(contractsApi.listAdjustments).mockResolvedValue({ data: [], meta: {} })

    renderContractsApp('/contracts/c-2')

    await waitFor(() => screen.getByTestId('contract-detail'))
    expect(screen.queryByLabelText('Monto vigente')).not.toBeInTheDocument()
    expect(screen.getByTestId('contract-detail')).toHaveTextContent('100.000,00')
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
})
