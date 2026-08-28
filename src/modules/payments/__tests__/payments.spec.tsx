// src/modules/payments/__tests__/payments.spec.tsx
//
// SDD: spec_module_04_cobranzas.md RF-02..RF-08 + sdd_03 §9 (v1.7).
// Issue #12 — CA-04-03..12 (lado UI; CA-04-01/02 son del job de
// generación mensual, sin superficie de UI). Issue #33 — CA-33-01..05:
// historial de cobros del período (`payments[]`, incluye anulados) con
// recibo/anulación por fila.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { AdminPropApiError } from '@/api/errors'
import type { PaymentDetail } from '@/api/payments.api'
import { formatDate } from '@/shared/utils/format'
import { renderPaymentsApp } from './test-router'

vi.mock('@/api/payments.api', () => ({
  paymentsApi: {
    listRentPeriods: vi.fn(),
    getRentPeriod: vi.fn(),
    interestPreview: vi.fn(),
    registerPayment: vi.fn(),
    voidPayment: vi.fn(),
    listDebt: vi.fn(),
    downloadReceipt: vi.fn(),
  },
}))

vi.mock('@/api/properties.api', () => ({
  propertiesApi: {
    list: vi.fn(),
  },
}))

vi.mock('@/api/people.api', () => ({
  peopleApi: {
    listLandlords: vi.fn(),
    listRenters: vi.fn(),
  },
}))

import { paymentsApi } from '@/api/payments.api'
import { propertiesApi } from '@/api/properties.api'
import { peopleApi } from '@/api/people.api'

const OWNER_SESSION = buildSession({
  userId: 'u-owner',
  email: 'owner@inmobiliaria-sur.com',
  fullName: 'Owner Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
  permissions: ['rent-period:read', 'payment:create', 'payment:void', 'renter:read'],
  isSuperAdmin: false,
})

const MAINTENANCE_SESSION = buildSession({
  userId: 'u-maint',
  email: 'maint@inmobiliaria-sur.com',
  fullName: 'Mantenimiento Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'maintenance' },
  // RN-A01: maintenance no accede a ningún permiso de cobranzas.
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
      status: 'occupied',
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
  meta: {},
}
const LANDLORDS = {
  data: [
    {
      id: 'l-1',
      name: 'Juan Dueño',
      tax_id: null,
      phone: null,
      email: null,
      commission_pct: '5.00',
      notes: null,
      created_at: '2026-01-01T00:00:00Z',
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

const RENT_PERIOD_PENDING = {
  id: 'rp-1',
  contract_id: 'c-1',
  property_id: 'p-1',
  landlord_id: 'l-1',
  renter_id: 'r-1',
  period: '2026-07-01',
  amount_due: '100000.00',
  currency: 'ARS',
  status: 'pending' as const,
  paid_total: '0.00',
  balance: '100000.00',
  in_arrears: true,
  days_late: 5,
  suggested_interest: '500.00',
  payments: [] as PaymentDetail[],
}

const PAYMENT_FIXTURE: PaymentDetail = {
  id: 'pay-1',
  rent_period_id: 'rp-1',
  payment_date: '2026-07-15',
  method: 'cash',
  payment_currency: 'ARS',
  amount: '100000.00',
  exchange_rate: null,
  destination: 'agency_account',
  suggested_interest: '500.00',
  charged_interest: '500.00',
  forgiven_interest: '0.00',
  days_late: 5,
  notes: null,
  created_by: 'u-owner',
  created_at: '2026-07-15T00:00:00Z',
  voided_at: null,
  voided_by: null,
}

function mockOptionDefaults() {
  vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTIES)
  vi.mocked(peopleApi.listLandlords).mockResolvedValue(LANDLORDS)
  vi.mocked(peopleApi.listRenters).mockResolvedValue(RENTERS)
}

describe('Módulo 4 — Cobranzas (#12)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
    localStorage.clear()
  })

  it('CA-04-XX: el panel del mes muestra propiedad, inquilino, monto, saldo, mora e interés sugerido', async () => {
    setSession(OWNER_SESSION)
    mockOptionDefaults()
    vi.mocked(paymentsApi.listRentPeriods).mockResolvedValueOnce({
      data: [RENT_PERIOD_PENDING],
      meta: {},
    })

    renderPaymentsApp('/payments')

    const table = await screen.findByRole('table')
    expect(within(table).getByText('Av. Colón 1234')).toBeInTheDocument()
    expect(within(table).getByText('María López')).toBeInTheDocument()
    expect(within(table).getByText('En mora')).toBeInTheDocument()
    expect(within(table).getAllByText(/^500$/).length).toBeGreaterThan(0)
  })

  it('un maintenance no ve el panel de cobranzas ni dispara el request', async () => {
    setSession(MAINTENANCE_SESSION)

    renderPaymentsApp('/payments')

    await waitFor(() => {
      expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    })
    expect(paymentsApi.listRentPeriods).not.toHaveBeenCalled()
  })

  it('CA-04-03: un cobro en moneda distinta a la del contrato sin TC devuelve 400 EXCHANGE_RATE_REQUIRED', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({ data: RENT_PERIOD_PENDING })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.registerPayment).mockRejectedValueOnce(
      new AdminPropApiError(
        'EXCHANGE_RATE_REQUIRED',
        400,
        'Se requiere el tipo de cambio porque la moneda del pago difiere de la del contrato.',
      ),
    )

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByRole('button', { name: 'Registrar cobro' })
    await user.selectOptions(screen.getByLabelText('Moneda del pago'), 'USD')
    await user.type(screen.getByLabelText('Importe a capital (ARS)'), '100')
    // El schema del cliente exige exchange_rate cuando difiere la moneda —
    // se llena igual para forzar que el 400 llegue del backend (fuente
    // autoritativa) y no del feedback local.
    await user.type(screen.getByLabelText('Tipo de cambio'), '1000')
    await user.type(screen.getByLabelText('Interés cobrado'), '0')
    await user.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'Se requiere el tipo de cambio porque la moneda del pago difiere de la del contrato.',
        ),
      ).toBeInTheDocument()
    })
  })

  it('CA-04-05: el form muestra el interés sugerido y permite perdón parcial imputando un valor menor', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod)
      .mockResolvedValueOnce({ data: RENT_PERIOD_PENDING }) // carga inicial: sin cobros
      .mockResolvedValueOnce({
        data: {
          ...RENT_PERIOD_PENDING,
          payments: [{ ...PAYMENT_FIXTURE, charged_interest: '200.00', forgiven_interest: '300.00' }],
        },
      }) // refetch tras invalidar (CA-33-05: registrar refresca el historial)
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.registerPayment).mockResolvedValueOnce({
      data: { ...PAYMENT_FIXTURE, charged_interest: '200.00', forgiven_interest: '300.00' },
    })

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByTestId('suggested-interest'))
    await waitFor(() => expect(screen.getByTestId('suggested-interest')).toHaveTextContent('500'))

    await user.type(screen.getByLabelText('Importe a capital (ARS)'), '100000')
    await user.type(screen.getByLabelText('Interés cobrado'), '200')
    await user.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    await waitFor(() => {
      expect(paymentsApi.registerPayment).toHaveBeenCalledWith(
        'rp-1',
        expect.objectContaining({ charged_interest: '200', amount: '100000' }),
      )
    })

    const row = await screen.findByTestId('payment-history-row')
    expect(row).toHaveTextContent('500') // sugerido
    expect(row).toHaveTextContent('200') // cobrado
    expect(row).toHaveTextContent('300') // perdonado
  })

  it('CA-04-04: el saldo excedido devuelve 422 PAYMENT_EXCEEDS_CONTRACT_BALANCE', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({ data: RENT_PERIOD_PENDING })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.registerPayment).mockRejectedValueOnce(
      new AdminPropApiError(
        'PAYMENT_EXCEEDS_CONTRACT_BALANCE',
        422,
        'El monto del cobro excede el saldo pendiente del contrato.',
      ),
    )

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByRole('button', { name: 'Registrar cobro' })
    await user.type(screen.getByLabelText('Importe a capital (ARS)'), '999999')
    await user.type(screen.getByLabelText('Interés cobrado'), '0')
    await user.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    await waitFor(() => {
      expect(
        screen.getByText('El monto del cobro excede el saldo pendiente del contrato.'),
      ).toBeInTheDocument()
    })
  })

  it('CA-33-01: el historial muestra fecha, medio, moneda, importe, TC, destino, los tres intereses y notas', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({
      data: {
        ...RENT_PERIOD_PENDING,
        payments: [
          {
            ...PAYMENT_FIXTURE,
            id: 'pay-usd',
            method: 'transfer',
            payment_currency: 'USD',
            amount: '100.00',
            exchange_rate: '1000.0000',
            destination: 'landlord_account',
            notes: 'Pago parcial en USD',
          },
        ],
      },
    })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })

    renderPaymentsApp('/payments/rp-1')

    const row = await screen.findByTestId('payment-history-row')
    expect(row).toHaveTextContent(formatDate('2026-07-15'))
    expect(row).toHaveTextContent('Transferencia')
    expect(row).toHaveTextContent('USD')
    expect(row).toHaveTextContent('100')
    expect(row).toHaveTextContent('1000.0000')
    expect(row).toHaveTextContent('Directo al propietario (ya rendido)')
    expect(row).toHaveTextContent('500') // sugerido
    expect(row).toHaveTextContent('Pago parcial en USD')
  })

  it('CA-33-02: un cobro anulado se muestra con marca clara y sin acciones por fila', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({
      data: {
        ...RENT_PERIOD_PENDING,
        payments: [
          { ...PAYMENT_FIXTURE, id: 'pay-active' },
          {
            ...PAYMENT_FIXTURE,
            id: 'pay-voided',
            voided_at: '2026-07-16T00:00:00Z',
            voided_by: 'u-owner',
          },
        ],
      },
    })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })

    renderPaymentsApp('/payments/rp-1')

    const rows = await screen.findAllByTestId('payment-history-row')
    expect(rows).toHaveLength(2)

    const activeRow = rows[0]!
    const voidedRow = rows[1]!
    expect(activeRow).toHaveAttribute('data-voided', 'false')
    expect(within(activeRow).getByRole('button', { name: 'Descargar recibo' })).toBeInTheDocument()
    expect(within(activeRow).getByRole('button', { name: 'Anular cobro' })).toBeInTheDocument()

    expect(voidedRow).toHaveAttribute('data-voided', 'true')
    expect(within(voidedRow).getByText('Anulado')).toBeInTheDocument()
    expect(
      within(voidedRow).queryByRole('button', { name: 'Descargar recibo' }),
    ).not.toBeInTheDocument()
    expect(within(voidedRow).queryByRole('button', { name: 'Anular cobro' })).not.toBeInTheDocument()
  })

  it('CA-33-03: se puede descargar el recibo de un cobro activo desde su fila del historial', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({
      data: { ...RENT_PERIOD_PENDING, payments: [PAYMENT_FIXTURE] },
    })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.downloadReceipt).mockResolvedValueOnce(undefined)

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByTestId('payment-history-row')
    await user.click(screen.getByRole('button', { name: 'Descargar recibo' }))

    await waitFor(() => {
      expect(paymentsApi.downloadReceipt).toHaveBeenCalledWith('pay-1')
    })
  })

  it('CA-33-03: un error al descargar el recibo (422 BUSINESS_RULE_VIOLATION) se muestra inline en la fila', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({
      data: { ...RENT_PERIOD_PENDING, payments: [PAYMENT_FIXTURE] },
    })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.downloadReceipt).mockRejectedValueOnce(
      new AdminPropApiError('BUSINESS_RULE_VIOLATION', 422, 'La operación viola una regla de negocio.'),
    )

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByTestId('payment-history-row')
    await user.click(screen.getByRole('button', { name: 'Descargar recibo' }))

    await waitFor(() => {
      expect(screen.getByText('La operación viola una regla de negocio.')).toBeInTheDocument()
    })
  })

  it('CA-33-04: el owner anula un cobro desde su fila del historial con motivo obligatorio en dos pasos', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod)
      .mockResolvedValueOnce({ data: { ...RENT_PERIOD_PENDING, payments: [PAYMENT_FIXTURE] } })
      .mockResolvedValueOnce({
        data: {
          ...RENT_PERIOD_PENDING,
          payments: [{ ...PAYMENT_FIXTURE, voided_at: '2026-07-16T00:00:00Z', voided_by: 'u-owner' }],
        },
      })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.voidPayment).mockResolvedValueOnce({
      data: { ...PAYMENT_FIXTURE, voided_at: '2026-07-16T00:00:00Z', voided_by: 'u-owner' },
    })

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByTestId('payment-history-row')
    await user.click(screen.getByRole('button', { name: 'Anular cobro' }))
    await user.type(screen.getByLabelText('Motivo'), 'Cobro cargado por error')
    await user.click(screen.getByRole('button', { name: 'Confirmar anulación' }))

    await waitFor(() => {
      expect(paymentsApi.voidPayment).toHaveBeenCalledWith('pay-1', {
        reason: 'Cobro cargado por error',
      })
    })
    expect(await screen.findByText('Anulado')).toBeInTheDocument()
  })

  it('CA-33-04: anular un cobro ya anulado muestra 409 PAYMENT_ALREADY_VOIDED inline en la fila', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({
      data: { ...RENT_PERIOD_PENDING, payments: [PAYMENT_FIXTURE] },
    })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.voidPayment).mockRejectedValueOnce(
      new AdminPropApiError('PAYMENT_ALREADY_VOIDED', 409, 'El cobro ya fue anulado.'),
    )

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByTestId('payment-history-row')
    await user.click(screen.getByRole('button', { name: 'Anular cobro' }))
    await user.type(screen.getByLabelText('Motivo'), 'Duplicado')
    await user.click(screen.getByRole('button', { name: 'Confirmar anulación' }))

    await waitFor(() => {
      expect(screen.getByText('El cobro ya fue anulado.')).toBeInTheDocument()
    })
  })

  it('CA-33-05: registrar un cobro nuevo refresca el historial del período', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod)
      .mockResolvedValueOnce({ data: RENT_PERIOD_PENDING }) // carga inicial: sin cobros
      .mockResolvedValueOnce({ data: { ...RENT_PERIOD_PENDING, payments: [PAYMENT_FIXTURE] } })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.registerPayment).mockResolvedValueOnce({ data: PAYMENT_FIXTURE })

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByRole('button', { name: 'Registrar cobro' })
    expect(screen.queryByTestId('payment-history-row')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Importe a capital (ARS)'), '100000')
    await user.type(screen.getByLabelText('Interés cobrado'), '500')
    await user.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    await waitFor(() => {
      expect(paymentsApi.getRentPeriod).toHaveBeenCalledTimes(2)
    })
    expect(await screen.findByTestId('payment-history-row')).toBeInTheDocument()
  })

  it('CA-04-09: la vista global de deuda muestra períodos adeudados, saldo, mora e interés sugerido, filtrable por antigüedad', async () => {
    setSession(OWNER_SESSION)
    mockOptionDefaults()
    vi.mocked(paymentsApi.listDebt).mockResolvedValue({
      data: [
        {
          contract_id: 'c-1',
          property_id: 'p-1',
          landlord_id: 'l-1',
          renter_id: 'r-1',
          periods_overdue: 2,
          balance: '200000.00',
          days_late: 20,
          suggested_interest: '4000.00',
        },
      ],
      meta: {},
    })

    renderPaymentsApp('/payments/debt')
    const user = userEvent.setup()

    const table = await screen.findByRole('table')
    expect(within(table).getByText('María López')).toBeInTheDocument()
    expect(within(table).getByText('Av. Colón 1234')).toBeInTheDocument()
    expect(within(table).getByText('20')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Antigüedad mínima (días)'), '15')

    await waitFor(() => {
      expect(paymentsApi.listDebt).toHaveBeenCalledWith(
        expect.objectContaining({ min_days: 15 }),
        expect.anything(),
      )
    })
  })

  // CA-04-10/12 (descarga de libre deuda): movido al módulo Contratos —
  // issue #104/#56, decisión #123. El endpoint `POST
  // /renters/:id/debt-certificate` fue eliminado del backend; el libre
  // deuda ahora es por CONTRATO (`ContractDebtCertificateButton`, ver
  // `src/modules/contracts/__tests__/contracts.spec.tsx`).
})
