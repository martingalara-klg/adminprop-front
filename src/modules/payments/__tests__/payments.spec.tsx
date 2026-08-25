// src/modules/payments/__tests__/payments.spec.tsx
//
// SDD: spec_module_04_cobranzas.md RF-02..RF-08 + sdd_03 §9 (v1.6).
// Issue #12 — CA-04-03..12 (lado UI; CA-04-01/02 son del job de
// generación mensual, sin superficie de UI).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { AdminPropApiError } from '@/api/errors'
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
    downloadDebtCertificate: vi.fn(),
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
import { DebtCertificateButton } from '../components/DebtCertificateButton'

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
    expect(within(table).getAllByText(/500,00/).length).toBeGreaterThan(0)
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
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({ data: RENT_PERIOD_PENDING })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.registerPayment).mockResolvedValueOnce({
      data: {
        id: 'pay-1',
        rent_period_id: 'rp-1',
        payment_date: '2026-07-15',
        method: 'cash',
        payment_currency: 'ARS',
        amount: '100000.00',
        exchange_rate: null,
        destination: 'agency_account',
        suggested_interest: '500.00',
        charged_interest: '200.00',
        forgiven_interest: '300.00',
        days_late: 5,
        notes: null,
        created_by: 'u-owner',
        created_at: '2026-07-15T00:00:00Z',
      },
    })

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByTestId('suggested-interest'))
    await waitFor(() => expect(screen.getByTestId('suggested-interest')).toHaveTextContent('500,00'))

    await user.type(screen.getByLabelText('Importe a capital (ARS)'), '100000')
    await user.type(screen.getByLabelText('Interés cobrado'), '200')
    await user.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    await waitFor(() => {
      expect(paymentsApi.registerPayment).toHaveBeenCalledWith(
        'rp-1',
        expect.objectContaining({ charged_interest: '200', amount: '100000' }),
      )
    })

    const result = await screen.findByTestId('payment-result')
    expect(result).toHaveTextContent('500,00') // sugerido
    expect(result).toHaveTextContent('200,00') // cobrado
    expect(result).toHaveTextContent('300,00') // perdonado
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

  it('CA-04-10: se puede descargar el recibo de un cobro recién registrado', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({ data: RENT_PERIOD_PENDING })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.registerPayment).mockResolvedValueOnce({
      data: {
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
      },
    })
    vi.mocked(paymentsApi.downloadReceipt).mockResolvedValueOnce(undefined)

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByRole('button', { name: 'Registrar cobro' })
    await user.type(screen.getByLabelText('Importe a capital (ARS)'), '100000')
    await user.type(screen.getByLabelText('Interés cobrado'), '500')
    await user.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    await screen.findByTestId('payment-result')
    await user.click(screen.getByRole('button', { name: 'Descargar recibo' }))

    await waitFor(() => {
      expect(paymentsApi.downloadReceipt).toHaveBeenCalledWith('pay-1')
    })
  })

  it('CA-04-10: un recibo sobre un cobro anulado muestra 422 BUSINESS_RULE_VIOLATION', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({ data: RENT_PERIOD_PENDING })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.registerPayment).mockResolvedValueOnce({
      data: {
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
      },
    })
    vi.mocked(paymentsApi.downloadReceipt).mockRejectedValueOnce(
      new AdminPropApiError('BUSINESS_RULE_VIOLATION', 422, 'La operación viola una regla de negocio.'),
    )

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByRole('button', { name: 'Registrar cobro' })
    await user.type(screen.getByLabelText('Importe a capital (ARS)'), '100000')
    await user.type(screen.getByLabelText('Interés cobrado'), '500')
    await user.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    await screen.findByTestId('payment-result')
    await user.click(screen.getByRole('button', { name: 'Descargar recibo' }))

    await waitFor(() => {
      expect(screen.getByText('La operación viola una regla de negocio.')).toBeInTheDocument()
    })
  })

  it('CA-04-07: el owner anula un cobro con motivo obligatorio en dos pasos', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({ data: RENT_PERIOD_PENDING })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    const PAYMENT = {
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
    }
    vi.mocked(paymentsApi.registerPayment).mockResolvedValueOnce({ data: PAYMENT })
    vi.mocked(paymentsApi.voidPayment).mockResolvedValueOnce({
      data: {
        ...PAYMENT,
        voided_at: '2026-07-16T00:00:00Z',
        voided_by: 'u-owner',
      },
    })

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByRole('button', { name: 'Registrar cobro' })
    await user.type(screen.getByLabelText('Importe a capital (ARS)'), '100000')
    await user.type(screen.getByLabelText('Interés cobrado'), '500')
    await user.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    await screen.findByTestId('payment-result')
    await user.click(screen.getByRole('button', { name: 'Anular cobro' }))
    await user.type(screen.getByLabelText('Motivo'), 'Cobro cargado por error')
    await user.click(screen.getByRole('button', { name: 'Confirmar anulación' }))

    await waitFor(() => {
      expect(paymentsApi.voidPayment).toHaveBeenCalledWith('pay-1', {
        reason: 'Cobro cargado por error',
      })
    })
    expect(await screen.findByText('Cobro anulado')).toBeInTheDocument()
  })

  it('CA-04-07: anular un cobro ya anulado muestra 409 PAYMENT_ALREADY_VOIDED', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(paymentsApi.getRentPeriod).mockResolvedValue({ data: RENT_PERIOD_PENDING })
    vi.mocked(paymentsApi.interestPreview).mockResolvedValue({
      rent_period_id: 'rp-1',
      payment_date: '2026-07-15',
      balance: '100000.00',
      days_late: 5,
      suggested_interest: '500.00',
    })
    vi.mocked(paymentsApi.registerPayment).mockResolvedValueOnce({
      data: {
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
      },
    })
    vi.mocked(paymentsApi.voidPayment).mockRejectedValueOnce(
      new AdminPropApiError('PAYMENT_ALREADY_VOIDED', 409, 'El cobro ya fue anulado.'),
    )

    renderPaymentsApp('/payments/rp-1')
    const user = userEvent.setup()

    await screen.findByRole('button', { name: 'Registrar cobro' })
    await user.type(screen.getByLabelText('Importe a capital (ARS)'), '100000')
    await user.type(screen.getByLabelText('Interés cobrado'), '500')
    await user.click(screen.getByRole('button', { name: 'Registrar cobro' }))

    await screen.findByTestId('payment-result')
    await user.click(screen.getByRole('button', { name: 'Anular cobro' }))
    await user.type(screen.getByLabelText('Motivo'), 'Duplicado')
    await user.click(screen.getByRole('button', { name: 'Confirmar anulación' }))

    await waitFor(() => {
      expect(screen.getByText('El cobro ya fue anulado.')).toBeInTheDocument()
    })
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

  it('CA-04-10 (descarga directa): DebtCertificateButton descarga el PDF cuando el inquilino no tiene deuda', async () => {
    vi.mocked(paymentsApi.downloadDebtCertificate).mockResolvedValueOnce(undefined)

    render(<DebtCertificateButton renterId="r-1" />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Descargar certificado de libre deuda' }))

    await waitFor(() => {
      expect(paymentsApi.downloadDebtCertificate).toHaveBeenCalledWith('r-1')
    })
  })

  it('CA-04-12: DebtCertificateButton muestra 422 RENTER_HAS_DEBT con el detalle de lo adeudado', async () => {
    vi.mocked(paymentsApi.downloadDebtCertificate).mockRejectedValueOnce(
      new AdminPropApiError('RENTER_HAS_DEBT', 422, 'El inquilino tiene deuda pendiente.', null, {
        overdue_periods: 2,
        balance: '200000.00',
      }),
    )

    render(<DebtCertificateButton renterId="r-1" />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Descargar certificado de libre deuda' }))

    await waitFor(() => {
      expect(screen.getByText('El inquilino tiene deuda pendiente.')).toBeInTheDocument()
    })
    expect(screen.getByTestId('debt-certificate-details')).toHaveTextContent('overdue_periods')
  })
})
