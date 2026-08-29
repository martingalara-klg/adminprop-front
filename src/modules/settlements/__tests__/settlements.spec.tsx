// src/modules/settlements/__tests__/settlements.spec.tsx
//
// SDD: spec_module_05_liquidaciones.md §RF-01..RF-05 + §Wizard +
// sdd_03 §10-11 (v1.6). Issue #14 — CA-05-01..08 (lado UI): cargos del
// mes, wizard de 4 pasos, seguimiento del job asíncrono, exports.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { AdminPropApiError } from '@/api/errors'
import { useSettlementWizard } from '../settlement-wizard/state'
import { renderSettlementsApp } from './test-router'

vi.mock('@/api/charges.api', () => ({
  chargesApi: {
    listChargeEntries: vi.fn(),
    createChargeEntry: vi.fn(),
    updateChargeEntry: vi.fn(),
  },
}))

vi.mock('@/api/settlements.api', () => ({
  settlementsApi: {
    list: vi.fn(),
    generate: vi.fn(),
    get: vi.fn(),
    regenerate: vi.fn(),
    issue: vi.fn(),
    downloadExport: vi.fn(),
  },
}))

vi.mock('@/api/people.api', () => ({
  peopleApi: {
    listLandlords: vi.fn(),
    getLandlord: vi.fn(),
  },
}))

vi.mock('@/api/properties.api', () => ({
  propertiesApi: {
    list: vi.fn(),
    getWorkOrderHistory: vi.fn(),
  },
}))

vi.mock('@/api/payments.api', () => ({
  paymentsApi: {
    listRentPeriods: vi.fn(),
  },
}))

import { chargesApi } from '@/api/charges.api'
import { settlementsApi } from '@/api/settlements.api'
import { peopleApi } from '@/api/people.api'
import { propertiesApi } from '@/api/properties.api'
import { paymentsApi } from '@/api/payments.api'

const OWNER_SESSION = buildSession({
  userId: 'u-owner',
  email: 'owner@inmobiliaria-sur.com',
  fullName: 'Owner Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
  permissions: ['charge:manage', 'settlement:read', 'settlement:generate', 'settlement:issue'],
  isSuperAdmin: false,
})

const MAINTENANCE_SESSION = buildSession({
  userId: 'u-maint',
  email: 'maint@inmobiliaria-sur.com',
  fullName: 'Encargado Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'maintenance' },
  // RN-A01: maintenance nunca ve liquidaciones ni cargos.
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
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'p-2',
      address: 'San Martín 500',
      landlord_id: 'l-1',
      neighborhood_id: null,
      property_type: 'casa',
      status: 'available',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  meta: {},
}

const LANDLORDS = {
  data: [
    {
      id: 'l-1',
      name: 'Juan Pérez',
      tax_id: null,
      phone: null,
      email: null,
      commission_pct: '10.00',
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  meta: {},
}

const LANDLORD_DETAIL = {
  id: 'l-1',
  name: 'Juan Pérez',
  tax_id: null,
  phone: null,
  email: null,
  bank_info: null,
  commission_pct: '10.00',
  notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  properties: [
    { id: 'p-1', address: 'Av. Colón 1234', property_type: 'departamento', status: 'available' },
    { id: 'p-2', address: 'San Martín 500', property_type: 'casa', status: 'available' },
  ],
}

const CHARGE_VERIFICATION_ITEMS = {
  data: [
    {
      recurring_charge_id: 'rc-1',
      property_id: 'p-1',
      charge_type: 'rentas',
      label: 'Rentas',
      has_entry: true,
      charge_entry_id: 'ce-1',
      amount: '5000.00',
      notes: null,
    },
    {
      recurring_charge_id: 'rc-2',
      property_id: 'p-2',
      charge_type: 'municipalidad',
      label: 'Municipalidad',
      has_entry: false,
      charge_entry_id: null,
      amount: null,
      notes: null,
    },
  ],
}

function settlementDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: 's-1',
    landlord_id: 'l-1',
    period: '2026-07-01',
    status: 'draft',
    job_status: 'completed',
    warnings: [],
    needs_regeneration: false,
    exchange_rate: null,
    total_collected: '200000.00',
    commission_total: '20000.00',
    charges_total: '5000.00',
    repairs_total: '0.00',
    already_settled_total: '0.00',
    net_amount: '175000.00',
    commission_pct_used: '10.00',
    regenerated_count: 0,
    generated_by: 'u-owner',
    issued_at: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    line_items: [
      {
        id: 'li-1',
        line_type: 'rent_collected',
        property_id: 'p-1',
        source_entity_type: 'payment',
        source_entity_id: 'pay-1',
        original_amount: '200000.00',
        original_currency: 'ARS',
        amount_ars: '200000.00',
        description: 'Cobro julio',
        created_at: '2026-08-01T00:00:00Z',
      },
    ],
    property_groups: [
      {
        property_id: 'p-1',
        property_label: 'Av. Colón 1234',
        line_items: [
          {
            id: 'li-1',
            line_type: 'rent_collected',
            property_id: 'p-1',
            source_entity_type: 'payment',
            source_entity_id: 'pay-1',
            original_amount: '200000.00',
            original_currency: 'ARS',
            amount_ars: '200000.00',
            description: 'Cobro julio',
            created_at: '2026-08-01T00:00:00Z',
          },
        ],
        subtotal_ars: '200000.00',
      },
    ],
    attachments: [],
    ...overrides,
  }
}

describe('Módulo 5 — Liquidaciones (#14)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
    // El store del wizard es un singleton persistido — limpiar sólo
    // localStorage no alcanza, el estado ya hidratado en memoria
    // sobrevive entre tests del mismo archivo.
    useSettlementWizard.getState().reset()
    localStorage.removeItem('adminprop:settlement-wizard')
  })

  it('CA-05-08: el checklist mensual muestra propiedades con cargo cargado y cuáles faltan', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(chargesApi.listChargeEntries).mockResolvedValueOnce(CHARGE_VERIFICATION_ITEMS)
    vi.mocked(propertiesApi.list).mockResolvedValueOnce(PROPERTIES)

    renderSettlementsApp('/settlements/charges')

    const table = await screen.findByTestId('charge-verification-checklist')
    expect(within(table).getByText('Cargado')).toBeInTheDocument()
    expect(within(table).getByTestId('charge-missing-badge')).toHaveTextContent('Falta cargar')
  })

  it('CA-05-08: cargar el importe de un concepto faltante llama a POST /recurring-charges/:id/entries', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(chargesApi.listChargeEntries).mockResolvedValue(CHARGE_VERIFICATION_ITEMS)
    vi.mocked(propertiesApi.list).mockResolvedValueOnce(PROPERTIES)
    vi.mocked(chargesApi.createChargeEntry).mockResolvedValueOnce({
      data: {
        id: 'ce-2',
        recurring_charge_id: 'rc-2',
        period: '2026-08-01',
        amount: '3000.00',
        notes: null,
        created_by: 'u-owner',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
    })

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/charges')

    await screen.findByTestId('charge-verification-checklist')
    const amountInput = screen.getByPlaceholderText('Importe')
    await user.type(amountInput, '3000')
    await user.click(screen.getByRole('button', { name: 'Cargar' }))

    await waitFor(() => {
      expect(chargesApi.createChargeEntry).toHaveBeenCalledWith('rc-2', {
        period: expect.any(String),
        amount: '3000',
        notes: undefined,
      })
    })
  })

  it('CA-05-08: cargar dos veces el mismo concepto+mes muestra 409 CHARGE_ENTRY_ALREADY_EXISTS', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(chargesApi.listChargeEntries).mockResolvedValue(CHARGE_VERIFICATION_ITEMS)
    vi.mocked(propertiesApi.list).mockResolvedValueOnce(PROPERTIES)
    vi.mocked(chargesApi.createChargeEntry).mockRejectedValueOnce(
      new AdminPropApiError('CHARGE_ENTRY_ALREADY_EXISTS', 409, 'Ya existe.'),
    )

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/charges')

    await screen.findByTestId('charge-verification-checklist')
    await user.type(screen.getByPlaceholderText('Importe'), '3000')
    await user.click(screen.getByRole('button', { name: 'Cargar' }))

    await waitFor(() => {
      expect(
        screen.getByText('Ya existe un cargo cargado para este período.'),
      ).toBeInTheDocument()
    })
  })

  it('CA-05-08: corregir un cargo ya cargado llama a PATCH /charge-entries/:id', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(chargesApi.listChargeEntries).mockResolvedValue(CHARGE_VERIFICATION_ITEMS)
    vi.mocked(propertiesApi.list).mockResolvedValueOnce(PROPERTIES)
    vi.mocked(chargesApi.updateChargeEntry).mockResolvedValueOnce({
      data: {
        id: 'ce-1',
        recurring_charge_id: 'rc-1',
        period: '2026-08-01',
        amount: '5500.00',
        notes: null,
        created_by: 'u-owner',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
    })

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/charges')

    await screen.findByTestId('charge-verification-checklist')
    await user.click(screen.getByRole('button', { name: 'Corregir' }))
    // La fila faltante (rc-2) ya muestra su propio input "Importe" siempre
    // (has_entry: false) — la edición de rc-1 agrega un segundo input; el
    // de rc-1 es el primero en el orden del DOM (aparece antes en items[]).
    const amountInput = screen.getAllByPlaceholderText('Importe')[0]!
    await user.clear(amountInput)
    await user.type(amountInput, '5500')
    await user.click(screen.getByRole('button', { name: 'Corregir' }))

    await waitFor(() => {
      expect(chargesApi.updateChargeEntry).toHaveBeenCalledWith('ce-1', {
        amount: '5500',
        notes: undefined,
      })
    })
  })

  it('un maintenance no ve los cargos del mes ni dispara el request', async () => {
    setSession(MAINTENANCE_SESSION)
    renderSettlementsApp('/settlements/charges')

    expect(
      await screen.findByText(/No tenés permiso para cargar los cargos del mes/),
    ).toBeInTheDocument()
    expect(chargesApi.listChargeEntries).not.toHaveBeenCalled()
  })

  it('CA-05-03: el wizard completa select_period -> review -> confirmation -> generate 202 -> polling completed', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.listLandlords).mockResolvedValue(LANDLORDS)
    vi.mocked(peopleApi.getLandlord).mockResolvedValue({ data: LANDLORD_DETAIL })
    vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTIES)
    vi.mocked(paymentsApi.listRentPeriods).mockResolvedValue({ data: [], meta: {} })
    vi.mocked(chargesApi.listChargeEntries).mockResolvedValue({
      data: [
        {
          recurring_charge_id: 'rc-1',
          property_id: 'p-1',
          charge_type: 'rentas',
          label: 'Rentas',
          has_entry: true,
          charge_entry_id: 'ce-1',
          amount: '5000.00',
          notes: null,
        },
      ],
    })
    vi.mocked(propertiesApi.getWorkOrderHistory).mockResolvedValue({ data: [] })
    vi.mocked(settlementsApi.generate).mockResolvedValueOnce({
      data: { settlement_id: 's-1', status: 'processing', estimated_completion_seconds: 10 },
    })
    vi.mocked(settlementsApi.get)
      .mockResolvedValueOnce({ data: settlementDetail({ job_status: 'processing' }) })
      .mockResolvedValue({ data: settlementDetail({ job_status: 'completed' }) })

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/new')

    await screen.findByText('Paso 1 de 4 — Propietario y período')
    await screen.findByRole('option', { name: 'Juan Pérez' })
    await user.selectOptions(screen.getByLabelText('Propietario'), 'l-1')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await screen.findByText('Paso 2 de 4 — Revisión previa')
    await waitFor(() => screen.getByTestId('settlement-review-checklist'))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await screen.findByText('Paso 4 de 4 — Confirmación')
    await user.click(screen.getByRole('button', { name: 'Generar liquidación' }))

    await waitFor(() => {
      expect(settlementsApi.generate).toHaveBeenCalledWith(
        expect.objectContaining({ landlord_id: 'l-1' }),
      )
    })

    await screen.findByTestId('settlement-job-processing')
    await waitFor(() => screen.getByTestId('settlement-job-completed'), { timeout: 5000 })
    expect(screen.getByText('Liquidación generada correctamente.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
      'href',
      '/settlements/s-1',
    )
  })

  it('CA-05-03: with_errors muestra las advertencias del job en la pantalla de progreso', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.listLandlords).mockResolvedValue(LANDLORDS)
    vi.mocked(peopleApi.getLandlord).mockResolvedValue({ data: LANDLORD_DETAIL })
    vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTIES)
    vi.mocked(paymentsApi.listRentPeriods).mockResolvedValue({ data: [], meta: {} })
    vi.mocked(chargesApi.listChargeEntries).mockResolvedValue({ data: [] })
    vi.mocked(propertiesApi.getWorkOrderHistory).mockResolvedValue({ data: [] })
    vi.mocked(settlementsApi.generate).mockResolvedValueOnce({
      data: { settlement_id: 's-2', status: 'processing', estimated_completion_seconds: 10 },
    })
    vi.mocked(settlementsApi.get).mockResolvedValue({
      data: settlementDetail({
        id: 's-2',
        job_status: 'with_errors',
        warnings: ['Propiedad San Martín 500 sin cargos del mes cargados.'],
      }),
    })

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/new')

    await screen.findByText('Paso 1 de 4 — Propietario y período')
    await screen.findByRole('option', { name: 'Juan Pérez' })
    await user.selectOptions(screen.getByLabelText('Propietario'), 'l-1')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Paso 2 de 4 — Revisión previa')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Paso 4 de 4 — Confirmación')
    await user.click(screen.getByRole('button', { name: 'Generar liquidación' }))

    await waitFor(() => screen.getByTestId('settlement-job-completed'))
    expect(screen.getByText('Liquidación generada con advertencias.')).toBeInTheDocument()
    expect(
      screen.getByText('Propiedad San Martín 500 sin cargos del mes cargados.'),
    ).toBeInTheDocument()
  })

  it('CA-05-02: sin TC y con USD en el período, el backend responde 400 y el wizard vuelve al paso exchange_rate', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.listLandlords).mockResolvedValue(LANDLORDS)
    vi.mocked(peopleApi.getLandlord).mockResolvedValue({ data: LANDLORD_DETAIL })
    vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTIES)
    vi.mocked(paymentsApi.listRentPeriods).mockResolvedValue({ data: [], meta: {} })
    vi.mocked(chargesApi.listChargeEntries).mockResolvedValue({ data: [] })
    vi.mocked(propertiesApi.getWorkOrderHistory).mockResolvedValue({ data: [] })
    vi.mocked(settlementsApi.generate)
      .mockRejectedValueOnce(
        new AdminPropApiError(
          'SETTLEMENT_EXCHANGE_RATE_REQUIRED',
          400,
          'Se requiere el tipo de cambio.',
        ),
      )
      .mockResolvedValueOnce({
        data: { settlement_id: 's-3', status: 'processing', estimated_completion_seconds: 10 },
      })
    vi.mocked(settlementsApi.get).mockResolvedValue({
      data: settlementDetail({ id: 's-3', job_status: 'completed', exchange_rate: '1000.00' }),
    })

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/new')

    await screen.findByText('Paso 1 de 4 — Propietario y período')
    await screen.findByRole('option', { name: 'Juan Pérez' })
    await user.selectOptions(screen.getByLabelText('Propietario'), 'l-1')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Paso 2 de 4 — Revisión previa')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await screen.findByText('Paso 4 de 4 — Confirmación')
    await user.click(screen.getByRole('button', { name: 'Generar liquidación' }))

    const exchangeRateError = await screen.findByTestId('exchange-rate-required-error')
    // resolveErrorMessage mapea por error.code al catálogo es-AR
    // (error-codes.es-AR.ts), no al `message` crudo del backend.
    expect(exchangeRateError).toHaveTextContent(
      'Se requiere el tipo de cambio para generar la liquidación en USD.',
    )

    await user.type(screen.getByLabelText('Tipo de cambio (ARS/USD)'), '1000')
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    await waitFor(() => {
      expect(settlementsApi.generate).toHaveBeenLastCalledWith(
        expect.objectContaining({ landlord_id: 'l-1', exchange_rate: '1000' }),
      )
    })
  })

  it('CA-05-07 (RF-04): el toggle per_property muestra los subtotales por propiedad', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(settlementsApi.get).mockResolvedValue({ data: settlementDetail() })

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/s-1')

    await screen.findByTestId('settlement-totals')
    await user.click(screen.getByRole('button', { name: 'Por propiedad' }))

    const groups = await screen.findByTestId('settlement-property-groups')
    expect(within(groups).getByText('Av. Colón 1234')).toBeInTheDocument()
    expect(within(groups).getByText(/Subtotal: 200.000/)).toBeInTheDocument()
  })

  it('CA-05-06: needs_regeneration muestra el badge y regenerar llama a POST .../regenerate', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(settlementsApi.get).mockResolvedValue({
      data: settlementDetail({ needs_regeneration: true, status: 'issued' }),
    })
    vi.mocked(settlementsApi.regenerate).mockResolvedValueOnce({
      data: { settlement_id: 's-1', status: 'processing', estimated_completion_seconds: 10 },
    })

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/s-1')

    await screen.findByTestId('needs-regeneration-badge')
    await user.click(screen.getByRole('button', { name: 'Regenerar' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar regeneración' }))

    await waitFor(() => {
      expect(settlementsApi.regenerate).toHaveBeenCalledWith('s-1', { exchange_rate: undefined })
    })
  })

  it('RF-03: emitir una liquidación draft llama a POST .../issue tras confirmar', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(settlementsApi.get).mockResolvedValue({ data: settlementDetail({ status: 'draft' }) })
    vi.mocked(settlementsApi.issue).mockResolvedValueOnce({
      data: settlementDetail({ status: 'issued', issued_at: '2026-08-05T00:00:00Z' }),
    })

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/s-1')

    await screen.findByTestId('settlement-totals')
    await user.click(screen.getByRole('button', { name: 'Emitir liquidación' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar emisión' }))

    await waitFor(() => expect(settlementsApi.issue).toHaveBeenCalledWith('s-1'))
  })

  it('RF-03: descargar Excel y PDF usa fetch+blob vía settlementsApi.downloadExport', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(settlementsApi.get).mockResolvedValue({ data: settlementDetail() })
    vi.mocked(settlementsApi.downloadExport).mockResolvedValue(undefined)

    const user = userEvent.setup()
    renderSettlementsApp('/settlements/s-1')

    await screen.findByTestId('settlement-totals')
    await user.click(screen.getByRole('button', { name: 'Descargar Excel' }))
    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }))

    await waitFor(() => {
      expect(settlementsApi.downloadExport).toHaveBeenCalledWith('s-1', 'xlsx')
      expect(settlementsApi.downloadExport).toHaveBeenCalledWith('s-1', 'pdf')
    })
  })

  it('CA-05-01: el listado filtra por propietario/período/estado y muestra empty state sin resultados', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.listLandlords).mockResolvedValue(LANDLORDS)
    vi.mocked(settlementsApi.list).mockResolvedValueOnce({ data: [] })

    renderSettlementsApp('/settlements')

    await waitFor(() => screen.getByText('Sin liquidaciones'))
    expect(settlementsApi.list).toHaveBeenCalledWith({}, expect.anything())
  })

  it('un maintenance no ve el listado de liquidaciones ni dispara el request', async () => {
    setSession(MAINTENANCE_SESSION)
    renderSettlementsApp('/settlements')

    expect(await screen.findByText(/No tenés permiso para ver liquidaciones/)).toBeInTheDocument()
    expect(settlementsApi.list).not.toHaveBeenCalled()
  })

  // ── Issue #64 (ronda feedback #3 del PO) — BackLink ─────────────────────

  it('CA-64-09: el BackLink de la ficha de la liquidación vuelve al listado de Liquidaciones', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(settlementsApi.get).mockResolvedValue({ data: settlementDetail() })
    vi.mocked(peopleApi.listLandlords).mockResolvedValue(LANDLORDS)
    vi.mocked(settlementsApi.list).mockResolvedValueOnce({ data: [] })

    renderSettlementsApp('/settlements/s-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Volver a Liquidaciones' }))

    expect(await screen.findByRole('heading', { name: 'Liquidaciones' })).toBeInTheDocument()
  })
})
