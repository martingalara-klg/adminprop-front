// src/modules/maintenance/__tests__/maintenance.spec.tsx
//
// SDD: spec_module_06_mantenimiento.md RF-01..RF-06 + sdd_03 §12 (v1.6).
// Issue #13 — CA-06-01..07 (lado UI).
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { AdminPropApiError } from '@/api/errors'
import type { WorkOrderSummary, WorkOrderDetail, WorkOrderQuoteSummary } from '@/api/maintenance.api'
import { renderMaintenanceApp } from './test-router'

vi.mock('@/api/maintenance.api', () => ({
  maintenanceApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    close: vi.fn(),
    cancel: vi.fn(),
    uploadWorkOrderAttachment: vi.fn(),
    addQuote: vi.fn(),
    uploadQuoteAttachment: vi.fn(),
    approveQuote: vi.fn(),
  },
  attachmentDownloadUrl: vi.fn((id: string) => `http://localhost:8000/v1/attachments/${id}/download`),
}))

vi.mock('@/api/properties.api', () => ({
  propertiesApi: {
    list: vi.fn(),
  },
}))

// Evita fetch() real de useAttachmentImage — el hook se testea en su
// propio archivo (no existe hoy, se agrega si otro módulo lo consume);
// acá sólo nos interesa que AttachmentGallery renderice sin red real.
vi.mock('@/shared/hooks/useAttachmentImage', () => ({
  useAttachmentImage: vi.fn(() => ({ objectUrl: null, isLoading: false, isError: false })),
}))

import { maintenanceApi } from '@/api/maintenance.api'
import { propertiesApi } from '@/api/properties.api'

const OWNER_SESSION = buildSession({
  userId: 'u-owner',
  email: 'owner@inmobiliaria-sur.com',
  fullName: 'Owner Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
  permissions: [
    'work-order:read',
    'work-order:create',
    'work-order:quote',
    'work-order:approve',
    'work-order:close',
    'work-order:cancel',
    'attachment:manage',
    'property:read',
  ],
  isSuperAdmin: false,
})

// RN-A01: maintenance sólo work-order:read/quote/close + attachment:manage
// (ver adminprop-back modules/superadmin/provisioning.py.MAINTENANCE_PERMISSIONS)
// — nunca create/approve/cancel.
const MAINTENANCE_SESSION = buildSession({
  userId: 'u-maint',
  email: 'maint@inmobiliaria-sur.com',
  fullName: 'Encargado Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'maintenance' },
  permissions: ['work-order:read', 'work-order:quote', 'work-order:close', 'attachment:manage'],
  isSuperAdmin: false,
})

function setSession(session: ReturnType<typeof buildSession>) {
  useSessionStore.setState({ session, logoutReason: null, isBootstrapping: false })
}

const PROPERTY_OPTIONS = {
  data: [
    {
      id: 'p-1',
      address: 'Av. Colón 1234',
      landlord_id: 'l-1',
      property_type: 'departamento',
      status: 'available',
      created_at: '2026-08-01T00:00:00Z',
    },
  ],
  meta: {},
}

function makeWorkOrderSummary(overrides: Partial<WorkOrderSummary> = {}): WorkOrderSummary {
  return {
    id: 'wo-1',
    property_id: 'p-1',
    property_address: 'Av. Colón 1234',
    title: 'Arreglo de cañería',
    description: 'Pierde agua en la cocina',
    payer: 'landlord',
    status: 'open',
    final_cost: null,
    approved_quote_id: null,
    created_by: 'u-owner',
    closed_at: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    ...overrides,
  }
}

function makeQuote(overrides: Partial<WorkOrderQuoteSummary> = {}): WorkOrderQuoteSummary {
  return {
    id: 'q-1',
    work_order_id: 'wo-1',
    amount: '5000.00',
    description: 'Cambio de caño',
    status: 'submitted',
    submitted_by: 'u-maint',
    created_at: '2026-08-02T00:00:00Z',
    ...overrides,
  }
}

function makeDetail(overrides: Partial<WorkOrderDetail> = {}): WorkOrderDetail {
  const summary = makeWorkOrderSummary(overrides)
  return {
    ...summary,
    quotes: overrides.quotes ?? [],
    attachments: overrides.attachments ?? [],
  } as WorkOrderDetail
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UC-13 — Alta de pedido y listado del encargado (CA-06-01)', () => {
  it('CA-06-01: el encargado ve el pedido en su listado con la dirección de la propiedad', async () => {
    setSession(MAINTENANCE_SESSION)
    vi.mocked(maintenanceApi.list).mockResolvedValueOnce({
      data: [makeWorkOrderSummary()],
      meta: {},
    })

    renderMaintenanceApp('/maintenance')

    await waitFor(() => {
      expect(screen.getByTestId('work-orders-table')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Av. Colón 1234' })).toBeInTheDocument()
    // RN-A01: el encargado nunca crea pedidos.
    expect(screen.queryByRole('link', { name: /nuevo pedido/i })).not.toBeInTheDocument()
  })

  it('CA-06-01: owner crea un pedido con pagador y fotos, y navega al detalle', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTY_OPTIONS)
    vi.mocked(maintenanceApi.create).mockResolvedValueOnce({
      data: makeWorkOrderSummary({ payer: 'agency' }),
    })
    vi.mocked(maintenanceApi.uploadWorkOrderAttachment).mockResolvedValueOnce({
      data: makeWorkOrderSummary({ payer: 'agency' }),
    })
    vi.mocked(maintenanceApi.get).mockResolvedValue({ data: makeDetail({ payer: 'agency' }) })

    const user = userEvent.setup()
    renderMaintenanceApp('/maintenance/new')

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Av. Colón 1234' })).toBeInTheDocument()
    })

    await user.selectOptions(screen.getByLabelText(/propiedad/i), 'p-1')
    await user.type(screen.getByLabelText(/título/i), 'Arreglo de cañería')
    await user.click(screen.getByLabelText(/paga administración y descuenta/i))

    const file = new File(['foto'], 'foto.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByTestId('photo-picker-input'), file)
    expect(screen.getByText('foto.jpg')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /crear pedido/i }))

    await waitFor(() => {
      expect(maintenanceApi.create).toHaveBeenCalledWith({
        property_id: 'p-1',
        title: 'Arreglo de cañería',
        description: undefined,
        payer: 'agency',
      })
    })
    await waitFor(() => {
      expect(maintenanceApi.uploadWorkOrderAttachment).toHaveBeenCalledWith('wo-1', file)
    })
    // Navega al detalle del pedido recién creado.
    await waitFor(() => {
      expect(screen.getByText('Av. Colón 1234')).toBeInTheDocument()
    })
  })
})

describe('UC-13 — Cotizaciones del encargado (CA-06-02)', () => {
  it('CA-06-02: el encargado sube una cotización con monto, notas y fotos', async () => {
    setSession(MAINTENANCE_SESSION)
    vi.mocked(maintenanceApi.get).mockResolvedValue({ data: makeDetail() })
    vi.mocked(maintenanceApi.addQuote).mockResolvedValueOnce({ data: makeQuote() })
    vi.mocked(maintenanceApi.uploadQuoteAttachment).mockResolvedValueOnce({ data: makeQuote() })

    const user = userEvent.setup()
    renderMaintenanceApp('/maintenance/wo-1')

    await waitFor(() => {
      expect(screen.getByLabelText(/monto/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/monto/i), '5000')
    await user.type(screen.getByLabelText(/notas/i), 'Cambio de caño')

    const file = new File(['foto'], 'cotizacion.jpg', { type: 'image/jpeg' })
    await user.upload(screen.getByTestId('photo-picker-input'), file)

    await user.click(screen.getByRole('button', { name: /cargar cotización/i }))

    await waitFor(() => {
      expect(maintenanceApi.addQuote).toHaveBeenCalledWith('wo-1', {
        amount: '5000',
        description: 'Cambio de caño',
      })
    })
    await waitFor(() => {
      expect(maintenanceApi.uploadQuoteAttachment).toHaveBeenCalledWith('q-1', file)
    })
  })

  it('CA-06-02: el encargado no ve el formulario de cotización si el pedido ya no está open', async () => {
    setSession(MAINTENANCE_SESSION)
    vi.mocked(maintenanceApi.get).mockResolvedValue({
      data: makeDetail({ status: 'in_progress', quotes: [makeQuote({ status: 'approved' })] }),
    })

    renderMaintenanceApp('/maintenance/wo-1')

    await waitFor(() => {
      expect(screen.getByText('Av. Colón 1234')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText(/^monto$/i)).not.toBeInTheDocument()
  })
})

describe('UC-13 — Aprobación de cotización (CA-06-03)', () => {
  it('CA-06-03: owner aprueba una cotización — la aprobada queda marcada y el pedido pasa a in_progress', async () => {
    setSession(OWNER_SESSION)
    const quote1 = makeQuote({ id: 'q-1', amount: '5000.00' })
    const quote2 = makeQuote({ id: 'q-2', amount: '6000.00' })

    vi.mocked(maintenanceApi.get)
      .mockResolvedValueOnce({ data: makeDetail({ quotes: [quote1, quote2] }) })
      .mockResolvedValueOnce({
        data: makeDetail({
          status: 'in_progress',
          approved_quote_id: 'q-1',
          quotes: [
            { ...quote1, status: 'approved' },
            { ...quote2, status: 'discarded' },
          ],
        }),
      })
    vi.mocked(maintenanceApi.approveQuote).mockResolvedValueOnce({
      data: makeDetail({ status: 'in_progress', approved_quote_id: 'q-1' }),
    })

    const user = userEvent.setup()
    renderMaintenanceApp('/maintenance/wo-1')

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /aprobar cotización/i })).toHaveLength(2)
    })

    const quoteItems = screen.getByTestId('quotes-list')
    const approveButtons = within(quoteItems).getAllByRole('button', {
      name: /aprobar cotización/i,
    })
    await user.click(approveButtons[0]!)

    await waitFor(() => {
      expect(maintenanceApi.approveQuote).toHaveBeenCalledWith('q-1')
    })
    await waitFor(() => {
      expect(screen.getByText('En curso')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /aprobar cotización/i })).not.toBeInTheDocument()
    })
  })

  it('CA-06-03: reaprobar devuelve 409 QUOTE_ALREADY_APPROVED y se muestra el mensaje', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(maintenanceApi.get).mockResolvedValue({
      data: makeDetail({ quotes: [makeQuote()] }),
    })
    vi.mocked(maintenanceApi.approveQuote).mockRejectedValueOnce(
      new AdminPropApiError(
        'QUOTE_ALREADY_APPROVED',
        409,
        'Ya hay una cotización aprobada para esta orden de trabajo.',
      ),
    )

    const user = userEvent.setup()
    renderMaintenanceApp('/maintenance/wo-1')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /aprobar cotización/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /aprobar cotización/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Ya hay una cotización aprobada para esta orden de trabajo.'),
      ).toBeInTheDocument()
    })
  })
})

describe('UC-13 — Cierre del trabajo (CA-06-04)', () => {
  it('CA-06-04: cerrar con costo final y fotos — payer=agency muestra "pendiente de liquidar"', async () => {
    setSession(OWNER_SESSION)
    const approvedQuote = makeQuote({ status: 'approved' })

    vi.mocked(maintenanceApi.get)
      .mockResolvedValueOnce({
        data: makeDetail({
          status: 'in_progress',
          payer: 'agency',
          approved_quote_id: approvedQuote.id,
          quotes: [approvedQuote],
        }),
      })
      .mockResolvedValueOnce({
        data: makeDetail({
          status: 'closed',
          payer: 'agency',
          approved_quote_id: approvedQuote.id,
          final_cost: '5000.00',
          closed_at: '2026-08-10T00:00:00Z',
          quotes: [approvedQuote],
        }),
      })
    vi.mocked(maintenanceApi.close).mockResolvedValueOnce({
      data: makeWorkOrderSummary({ status: 'closed', payer: 'agency' }),
    })

    const user = userEvent.setup()
    renderMaintenanceApp('/maintenance/wo-1')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /marcar terminado/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /marcar terminado/i }))

    await waitFor(() => {
      expect(maintenanceApi.close).toHaveBeenCalledWith('wo-1', { final_cost: undefined })
    })
    await waitFor(() => {
      expect(
        screen.getByText(/costo pendiente de liquidar en la próxima liquidación/i),
      ).toBeInTheDocument()
    })
  })

  it('CA-06-04: payer=landlord sólo queda registrado en el historial', async () => {
    setSession(OWNER_SESSION)
    const approvedQuote = makeQuote({ status: 'approved' })

    vi.mocked(maintenanceApi.get).mockResolvedValue({
      data: makeDetail({
        status: 'closed',
        payer: 'landlord',
        approved_quote_id: approvedQuote.id,
        final_cost: '5000.00',
        closed_at: '2026-08-10T00:00:00Z',
        quotes: [approvedQuote],
      }),
    })

    renderMaintenanceApp('/maintenance/wo-1')

    await waitFor(() => {
      expect(screen.getByText(/sólo queda registrado en el historial/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(/pendiente de liquidar/i)).not.toBeInTheDocument()
  })
})

describe('UC-13 — Cancelación (CA-06-07)', () => {
  it('CA-06-07: owner cancela un pedido open con motivo tras confirmar', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(maintenanceApi.get).mockResolvedValue({ data: makeDetail() })
    vi.mocked(maintenanceApi.cancel).mockResolvedValueOnce({
      data: makeWorkOrderSummary({ status: 'cancelled' }),
    })

    const user = userEvent.setup()
    renderMaintenanceApp('/maintenance/wo-1')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^cancelar pedido$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^cancelar pedido$/i }))
    await user.type(screen.getByLabelText(/motivo/i), 'El propietario desistió del arreglo')
    await user.click(screen.getByRole('button', { name: /confirmar cancelación/i }))

    await waitFor(() => {
      expect(maintenanceApi.cancel).toHaveBeenCalledWith('wo-1', {
        reason: 'El propietario desistió del arreglo',
      })
    })
  })

  it('CA-06-07: cancelar un pedido ya liquidado devuelve 422 WORK_ORDER_ALREADY_SETTLED', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(maintenanceApi.get).mockResolvedValue({ data: makeDetail() })
    vi.mocked(maintenanceApi.cancel).mockRejectedValueOnce(
      new AdminPropApiError('WORK_ORDER_ALREADY_SETTLED', 422, 'La orden de trabajo ya fue liquidada.'),
    )

    const user = userEvent.setup()
    renderMaintenanceApp('/maintenance/wo-1')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^cancelar pedido$/i })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: /^cancelar pedido$/i }))
    await user.type(screen.getByLabelText(/motivo/i), 'Ya se descontó en la liquidación')
    await user.click(screen.getByRole('button', { name: /confirmar cancelación/i }))

    await waitFor(() => {
      expect(screen.getByText('La orden de trabajo ya fue liquidada.')).toBeInTheDocument()
    })
  })
})

describe('UC-13 — Vista restringida del rol maintenance (CA-06-06)', () => {
  it('CA-06-06: el encargado no ve aprobar ni cancelar en el detalle, sólo cotizar/cerrar', async () => {
    setSession(MAINTENANCE_SESSION)
    vi.mocked(maintenanceApi.get).mockResolvedValue({
      data: makeDetail({ status: 'in_progress', quotes: [makeQuote({ status: 'approved' })] }),
    })

    renderMaintenanceApp('/maintenance/wo-1')

    await waitFor(() => {
      expect(screen.getByText('Av. Colón 1234')).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /aprobar cotización/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^cancelar pedido$/i })).not.toBeInTheDocument()
    // work-order:close sí lo tiene (RN-A01 lo incluye) — el form de cierre existe.
    expect(screen.getByRole('button', { name: /marcar terminado/i })).toBeInTheDocument()
  })
})

describe('UC-13 — Estados del flujo (idle/loading/error/empty)', () => {
  it('loading: muestra spinner mientras carga el listado', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(maintenanceApi.list).mockReturnValue(new Promise(() => {}))
    vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTY_OPTIONS)

    renderMaintenanceApp('/maintenance')

    expect(screen.getByText(/cargando pedidos/i)).toBeInTheDocument()
  })

  it('empty: muestra estado vacío sin pedidos para los filtros aplicados', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(maintenanceApi.list).mockResolvedValueOnce({ data: [], meta: {} })
    vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTY_OPTIONS)

    renderMaintenanceApp('/maintenance')

    await waitFor(() => {
      expect(screen.getByText(/no hay pedidos de reparación/i)).toBeInTheDocument()
    })
  })

  it('error: muestra error genérico si falla el listado', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(maintenanceApi.list).mockRejectedValueOnce(new Error('network down'))
    vi.mocked(propertiesApi.list).mockResolvedValue(PROPERTY_OPTIONS)

    renderMaintenanceApp('/maintenance')

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
