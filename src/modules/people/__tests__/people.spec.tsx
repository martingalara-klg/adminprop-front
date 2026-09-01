// src/modules/people/__tests__/people.spec.tsx
//
// SDD: spec_module_02_personas.md RF-01..RF-04 + sdd_03 §5-6 (v1.6).
// Issue #9 — CA-02-01..07 (lado UI).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { buildSession, useSessionStore } from '@/shared/auth/session-store'
import { AdminPropApiError } from '@/api/errors'
import { renderPeopleApp } from './test-router'

vi.mock('@/api/people.api', () => ({
  peopleApi: {
    listLandlords: vi.fn(),
    getLandlord: vi.fn(),
    createLandlord: vi.fn(),
    updateLandlord: vi.fn(),
    deleteLandlord: vi.fn(),
    listRenters: vi.fn(),
    getRenter: vi.fn(),
    createRenter: vi.fn(),
    updateRenter: vi.fn(),
    deleteRenter: vi.fn(),
    getRenterDebt: vi.fn(),
    getLandlordSettlements: vi.fn(),
  },
}))

import { peopleApi } from '@/api/people.api'

const OWNER_SESSION = buildSession({
  userId: 'u-owner',
  email: 'owner@inmobiliaria-sur.com',
  fullName: 'Owner Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'owner' },
  permissions: [
    'landlord:read',
    'landlord:manage',
    'landlord:set-commission',
    'renter:read',
    'renter:manage',
  ],
  isSuperAdmin: false,
})

const ADMIN_SESSION = buildSession({
  userId: 'u-admin',
  email: 'admin@inmobiliaria-sur.com',
  fullName: 'Admin Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'admin' },
  // sdd_03 §Catálogo de Permisos: admin conserva landlord:manage/renter:manage
  // pero NUNCA landlord:set-commission (issue #51).
  permissions: ['landlord:read', 'landlord:manage', 'renter:read', 'renter:manage'],
  isSuperAdmin: false,
})

const MAINTENANCE_SESSION = buildSession({
  userId: 'u-maint',
  email: 'maint@inmobiliaria-sur.com',
  fullName: 'Mantenimiento Uno',
  organization: { id: 'org-1', name: 'Inmobiliaria Sur', role: 'maintenance' },
  // RN-A01: maintenance no accede a ningún endpoint de este módulo.
  permissions: ['work-order:read'],
  isSuperAdmin: false,
})

// Issue #14 — CA-05-07: variante con settlement:read para probar la
// sección de liquidaciones de la ficha. Separada de OWNER_SESSION para
// no disparar getLandlordSettlements en los tests preexistentes del #9
// que no lo mockean.
const OWNER_SESSION_WITH_SETTLEMENTS = buildSession({
  ...OWNER_SESSION,
  permissions: [...OWNER_SESSION.permissions, 'settlement:read'],
})

function setSession(session: ReturnType<typeof buildSession>) {
  useSessionStore.setState({ session, logoutReason: null, isBootstrapping: false })
}

const LANDLORD_SUMMARY = {
  id: 'l-1',
  name: 'Juan Pérez',
  tax_id: '20304050607',
  phone: '3511234567',
  email: 'juan@example.com',
  commission_pct: '10.00',
  notes: null,
  created_at: '2026-08-01T00:00:00Z',
}

const LANDLORD_DETAIL = {
  id: 'l-1',
  name: 'Juan Pérez',
  tax_id: '20304050607',
  phone: '3511234567',
  email: 'juan@example.com',
  bank_info: 'CBU 0000000000000000000000',
  commission_pct: '10.00',
  notes: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
  properties: [],
}

const RENTER_DETAIL = {
  id: 'r-1',
  name: 'María López',
  tax_id: '30123456',
  phone: '3517654321',
  email: 'maria@example.com',
  notes: null,
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-01T00:00:00Z',
}

describe('Módulo 2 — Personas (#9)', () => {
  afterEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({ session: null, logoutReason: null, isBootstrapping: true })
    localStorage.clear()
  })

  it('CA-02-01: el owner crea un propietario con % de comisión y lo ve en el listado', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.listLandlords)
      .mockResolvedValueOnce({ data: [], meta: {} })
      .mockResolvedValueOnce({ data: [LANDLORD_SUMMARY], meta: {} })
    vi.mocked(peopleApi.createLandlord).mockResolvedValueOnce({ data: LANDLORD_DETAIL })

    renderPeopleApp('/people')
    const user = userEvent.setup()

    // Issue #48: el form de alta vive en un modal — se abre desde el
    // botón "Nuevo propietario" del listado.
    await user.click(await screen.findByRole('button', { name: 'Nuevo propietario' }))
    await waitFor(() => screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Juan Pérez')
    await user.type(screen.getByLabelText('% de comisión'), '10')
    await user.click(screen.getByRole('button', { name: 'Crear propietario' }))

    expect(peopleApi.createLandlord).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Juan Pérez', commission_pct: 10 }),
    )

    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
    })
    expect(screen.getByText('10%')).toBeInTheDocument()
  })

  it('CA-02-02: el admin ve el % de comisión sin control de edición; el owner sí puede editarlo', async () => {
    setSession(ADMIN_SESSION)
    vi.mocked(peopleApi.getLandlord).mockResolvedValue({ data: LANDLORD_DETAIL })

    const { unmount } = renderPeopleApp('/people/landlords/l-1')
    const user = userEvent.setup()

    await waitFor(() => screen.getByTestId('landlord-commission-readonly'))
    expect(screen.getByTestId('landlord-commission-readonly')).toHaveTextContent('10%')
    expect(screen.queryByLabelText('% de comisión')).not.toBeInTheDocument()
    expect(screen.getByText('Solo el owner puede cambiar el % de comisión.')).toBeInTheDocument()
    // Issue #66: la comisión nunca ofrece "Editar" a un admin (sin
    // landlord:set-commission) — ni siquiera el header lo muestra.
    expect(
      screen.queryByTestId('landlord-commission-section-edit-button'),
    ).not.toBeInTheDocument()
    // Datos de contacto SÍ son editables por el admin — Issue #66: modo
    // lectura por defecto, "Editar" habilita los campos.
    await user.click(screen.getByRole('button', { name: 'Editar' }))
    expect(screen.getByLabelText('Nombre')).toBeEnabled()
    unmount()

    setSession(OWNER_SESSION)
    renderPeopleApp('/people/landlords/l-1')

    await waitFor(() => screen.getByTestId('landlord-commission-section-edit-button'))
    await user.click(screen.getByTestId('landlord-commission-section-edit-button'))
    expect(screen.getByLabelText('% de comisión')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Actualizar comisión' })).toBeInTheDocument()
  })

  it('CA-02-02: si el backend igual responde 403 FORBIDDEN al cambiar la comisión, se muestra el mensaje del mapa', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getLandlord).mockResolvedValue({ data: LANDLORD_DETAIL })
    vi.mocked(peopleApi.updateLandlord).mockRejectedValueOnce(
      new AdminPropApiError('FORBIDDEN', 403, 'No tenés permiso para realizar esta acción.'),
    )

    renderPeopleApp('/people/landlords/l-1')
    const user = userEvent.setup()

    await user.click(await screen.findByTestId('landlord-commission-section-edit-button'))
    const commissionInput = screen.getByLabelText('% de comisión')
    await user.clear(commissionInput)
    await user.type(commissionInput, '15')
    await user.click(screen.getByRole('button', { name: 'Actualizar comisión' }))

    await waitFor(() => {
      expect(screen.getByText('No tenés permiso para realizar esta acción.')).toBeInTheDocument()
    })
  })

  it('CA-02-03: al cambiar la comisión, la UI indica que rige desde la próxima liquidación y vuelve a modo lectura', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getLandlord)
      .mockResolvedValueOnce({ data: LANDLORD_DETAIL })
      // useUpdateLandlord invalida ['people','landlords','detail', id] al
      // aplicar el cambio — el refetch pide getLandlord otra vez.
      .mockResolvedValueOnce({ data: { ...LANDLORD_DETAIL, commission_pct: '15.00' } })
    vi.mocked(peopleApi.updateLandlord).mockResolvedValueOnce({
      data: { ...LANDLORD_DETAIL, commission_pct: '15.00' },
    })

    renderPeopleApp('/people/landlords/l-1')
    const user = userEvent.setup()

    await user.click(await screen.findByTestId('landlord-commission-section-edit-button'))
    const commissionInput = screen.getByLabelText('% de comisión')
    await user.clear(commissionInput)
    await user.type(commissionInput, '15')
    await user.click(screen.getByRole('button', { name: 'Actualizar comisión' }))

    expect(
      await screen.findByText(/% de comisión actualizado\. Rige desde la próxima liquidación\./),
    ).toBeInTheDocument()
    // Issue #66: Guardar OK vuelve a modo lectura.
    expect(screen.queryByLabelText('% de comisión')).not.toBeInTheDocument()
    expect(screen.getByTestId('landlord-commission-readonly')).toHaveTextContent('15%')
  })

  it('CA-02-04: el listado de propietarios nunca muestra bank_info; la ficha sí lo expone', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.listLandlords).mockResolvedValueOnce({
      data: [LANDLORD_SUMMARY],
      meta: {},
    })

    const listRender = renderPeopleApp('/people')
    await waitFor(() => screen.getByText('Juan Pérez'))
    expect(screen.queryByText(/CBU 0000000000000000000000/)).not.toBeInTheDocument()
    listRender.unmount()

    vi.mocked(peopleApi.getLandlord).mockResolvedValueOnce({ data: LANDLORD_DETAIL })
    renderPeopleApp('/people/landlords/l-1')
    const user = userEvent.setup()

    // Issue #66: la ficha arranca en modo lectura — hay que abrir edición.
    await user.click(await screen.findByTestId('landlord-contact-section-edit-button'))
    const bankInfoInput = screen.getByLabelText('Datos bancarios (CBU)')
    expect(bankInfoInput).toHaveValue('CBU 0000000000000000000000')
  })

  it('CA-05-07: la ficha del propietario muestra el historial de liquidaciones con link al detalle', async () => {
    setSession(OWNER_SESSION_WITH_SETTLEMENTS)
    vi.mocked(peopleApi.getLandlord).mockResolvedValueOnce({ data: LANDLORD_DETAIL })
    vi.mocked(peopleApi.getLandlordSettlements).mockResolvedValueOnce({
      data: [
        {
          id: 's-1',
          landlord_id: 'l-1',
          period: '2026-07-01',
          status: 'issued',
          net_amount: '150000.00',
          commission_pct_used: '10.00',
          needs_regeneration: true,
          created_at: '2026-08-01T00:00:00Z',
        },
      ],
    })

    renderPeopleApp('/people/landlords/l-1')

    await waitFor(() => screen.getByTestId('landlord-settlements-list'))
    expect(screen.getByText('2026-07')).toBeInTheDocument()
    expect(screen.getByText('Requiere regeneración')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver detalle' })).toHaveAttribute(
      'href',
      '/settlements/s-1',
    )
  })

  it('CA-02-05: la ficha del inquilino muestra períodos adeudados, saldo, días de mora e interés sugerido', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getRenter).mockResolvedValueOnce({ data: RENTER_DETAIL })
    vi.mocked(peopleApi.getRenterDebt).mockResolvedValueOnce({
      data: [
        {
          contract_id: 'c-1',
          property_id: 'p-1',
          landlord_id: 'l-1',
          renter_id: 'r-1',
          periods_overdue: 2,
          balance: '150000.00',
          days_late: 45,
          suggested_interest: '4500.00',
        },
      ],
    })

    renderPeopleApp('/people/renters/r-1')

    await waitFor(() => screen.getByRole('heading', { name: 'María López' }))
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('150.000')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('4.500')).toBeInTheDocument()
  })

  it('CA-02-05 (estado empty): sin deuda, la ficha muestra "Sin deuda"', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getRenter).mockResolvedValueOnce({ data: RENTER_DETAIL })
    vi.mocked(peopleApi.getRenterDebt).mockResolvedValueOnce({ data: [] })

    renderPeopleApp('/people/renters/r-1')

    await waitFor(() => {
      expect(screen.getByText('Sin deuda')).toBeInTheDocument()
    })
  })

  it('CA-02-06: borrar un propietario con propiedades activas muestra el mensaje de ENTITY_HAS_DEPENDENCIES', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getLandlord).mockResolvedValue({ data: LANDLORD_DETAIL })
    vi.mocked(peopleApi.deleteLandlord).mockRejectedValueOnce(
      new AdminPropApiError(
        'ENTITY_HAS_DEPENDENCIES',
        409,
        'No se puede eliminar: hay registros que dependen de este recurso.',
      ),
    )

    renderPeopleApp('/people/landlords/l-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Eliminar propietario' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))

    await waitFor(() => {
      expect(
        screen.getByText('No se puede eliminar: hay registros que dependen de este recurso.'),
      ).toBeInTheDocument()
    })
  })

  it('CA-02-06: sin dependencias, borrar un inquilino confirma la baja lógica', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getRenter).mockResolvedValue({ data: RENTER_DETAIL })
    vi.mocked(peopleApi.getRenterDebt).mockResolvedValue({ data: [] })
    vi.mocked(peopleApi.deleteRenter).mockResolvedValueOnce(undefined)
    vi.mocked(peopleApi.listRenters).mockResolvedValueOnce({ data: [], meta: {} })

    renderPeopleApp('/people/renters/r-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Eliminar inquilino' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))

    await waitFor(() => {
      expect(peopleApi.deleteRenter).toHaveBeenCalledWith('r-1')
    })
  })

  // Issue #86 (back#124, decisión #130, sdd_03 v1.17): el bloqueo por
  // contrato activo del inquilino es `422 ENTITY_HAS_ACTIVE_CONTRACT`
  // con `details.active_contracts[]` — la UI arma un mensaje legible
  // desde `details`, nunca JSON.
  it('CA-02-06 (#86): borrar un inquilino con contrato activo muestra el mensaje legible de ENTITY_HAS_ACTIVE_CONTRACT', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getRenter).mockResolvedValue({ data: RENTER_DETAIL })
    vi.mocked(peopleApi.getRenterDebt).mockResolvedValue({ data: [] })
    vi.mocked(peopleApi.deleteRenter).mockRejectedValueOnce(
      new AdminPropApiError('ENTITY_HAS_ACTIVE_CONTRACT', 422, 'Entity has active contract', null, {
        entity_type: 'renter',
        entity_id: 'r-1',
        active_contracts: [
          {
            contract_id: 'c-1',
            property_id: 'p-1',
            property_address: 'Av. Siempreviva 742',
            renter_id: 'r-1',
            renter_name: 'María López',
            start_date: '2026-01-01',
            end_date: '2026-12-31',
          },
        ],
      }),
    )

    renderPeopleApp('/people/renters/r-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Eliminar inquilino' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar eliminación' }))

    await waitFor(() => {
      expect(
        screen.getByText(
          'No se puede eliminar: tiene un contrato activo (Av. Siempreviva 742 — María López).',
        ),
      ).toBeInTheDocument()
    })
    // Nada de JSON en pantalla (precedente #70).
    expect(screen.queryByText(/active_contracts/)).not.toBeInTheDocument()
  })

  it('CA-02-07: un maintenance no ve propietarios ni dispara el request', async () => {
    setSession(MAINTENANCE_SESSION)

    renderPeopleApp('/people')

    await waitFor(() => {
      expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    })
    expect(peopleApi.listLandlords).not.toHaveBeenCalled()
  })

  it('CA-02-07: un maintenance no ve inquilinos ni dispara el request', async () => {
    setSession(MAINTENANCE_SESSION)

    renderPeopleApp('/people/renters')

    await waitFor(() => {
      expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
    })
    expect(peopleApi.listRenters).not.toHaveBeenCalled()
  })

  // ── Issue #55 (ronda feedback #2 del PO) — cierra el #29 ────────────────

  it('CA-55-02: la ficha del propietario muestra "Con contrato" (verde) para una propiedad rented y "Sin contrato" (rojo) para el resto', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getLandlord).mockResolvedValueOnce({
      data: {
        ...LANDLORD_DETAIL,
        properties: [
          {
            id: 'p-1',
            address: 'Av. Colón 1234',
            property_type: 'departamento',
            status: 'rented',
            active_contract: null,
          },
          {
            id: 'p-2',
            address: 'San Martín 555',
            property_type: 'duplex',
            status: 'available',
            active_contract: null,
          },
        ],
      },
    })

    renderPeopleApp('/people/landlords/l-1')

    await waitFor(() => screen.getByText('Av. Colón 1234'))
    expect(screen.getByText('Con contrato')).toBeInTheDocument()
    expect(screen.getByText('Sin contrato')).toBeInTheDocument()
    // CA-55-01: labels de tipo capitalizados (incluye `duplex`).
    expect(screen.getByText('Departamento')).toBeInTheDocument()
    expect(screen.getByText('Duplex')).toBeInTheDocument()
  })

  // ── Issue #64 (ronda feedback #3 del PO) — tabs + BackLink ──────────────

  it('CA-64-01: las tabs Propietarios/Inquilinos cambian el contenido y la URL de Personas', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.listLandlords).mockResolvedValueOnce({ data: [], meta: {} })
    vi.mocked(peopleApi.listRenters).mockResolvedValueOnce({ data: [], meta: {} })

    renderPeopleApp('/people')
    const user = userEvent.setup()

    expect(await screen.findByRole('button', { name: 'Nuevo propietario' })).toBeInTheDocument()
    expect(peopleApi.listRenters).not.toHaveBeenCalled()

    await user.click(screen.getByRole('link', { name: 'Inquilinos' }))

    expect(await screen.findByRole('button', { name: 'Nuevo inquilino' })).toBeInTheDocument()
    expect(peopleApi.listRenters).toHaveBeenCalled()
  })

  it('CA-64-02: el BackLink de la ficha del propietario vuelve al listado de Propietarios', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getLandlord).mockResolvedValueOnce({ data: LANDLORD_DETAIL })
    vi.mocked(peopleApi.listLandlords).mockResolvedValueOnce({ data: [LANDLORD_SUMMARY], meta: {} })

    renderPeopleApp('/people/landlords/l-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Volver a Propietarios' }))

    expect(await screen.findByRole('button', { name: 'Nuevo propietario' })).toBeInTheDocument()
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
  })

  // ── Issue #66 (ronda feedback #3 del PO) — modo lectura por defecto ────

  it('CA-66-01: la ficha del propietario arranca en modo lectura con "Editar" para habilitar los campos', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getLandlord).mockResolvedValueOnce({ data: LANDLORD_DETAIL })

    renderPeopleApp('/people/landlords/l-1')

    expect(await screen.findByTestId('landlord-contact-view')).toBeInTheDocument()
    expect(screen.getByTestId('landlord-contact-view')).toHaveTextContent('Juan Pérez')
    expect(screen.queryByLabelText('Nombre')).not.toBeInTheDocument()
  })

  it('CA-66-02: "Cancelar" en los datos de contacto del propietario descarta y vuelve a lectura', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getLandlord).mockResolvedValueOnce({ data: LANDLORD_DETAIL })

    renderPeopleApp('/people/landlords/l-1')
    const user = userEvent.setup()

    await user.click(await screen.findByTestId('landlord-contact-section-edit-button'))
    await user.clear(screen.getByLabelText('Nombre'))
    await user.type(screen.getByLabelText('Nombre'), 'Descartado')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByTestId('landlord-contact-view')).toHaveTextContent('Juan Pérez')
    expect(peopleApi.updateLandlord).not.toHaveBeenCalled()
  })

  it('CA-66-03: la ficha del inquilino arranca en modo lectura; "Editar" habilita y "Guardar" vuelve a lectura', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getRenter).mockResolvedValueOnce({ data: RENTER_DETAIL })
    vi.mocked(peopleApi.getRenterDebt).mockResolvedValueOnce({ data: [] })
    vi.mocked(peopleApi.updateRenter).mockResolvedValueOnce({
      data: { ...RENTER_DETAIL, phone: '3510000000' },
    })

    renderPeopleApp('/people/renters/r-1')
    const user = userEvent.setup()

    expect(await screen.findByTestId('renter-contact-view')).toBeInTheDocument()
    expect(screen.queryByLabelText('Teléfono')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Editar' }))
    const phoneInput = screen.getByLabelText('Teléfono')
    await user.clear(phoneInput)
    await user.type(phoneInput, '3510000000')
    await user.click(screen.getByRole('button', { name: 'Guardar datos de contacto' }))

    await waitFor(() => {
      expect(screen.getByTestId('renter-contact-view')).toBeInTheDocument()
    })
    expect(screen.queryByLabelText('Teléfono')).not.toBeInTheDocument()
  })

  it('CA-64-03: el BackLink de la ficha del inquilino vuelve al listado de Inquilinos', async () => {
    setSession(OWNER_SESSION)
    vi.mocked(peopleApi.getRenter).mockResolvedValueOnce({ data: RENTER_DETAIL })
    vi.mocked(peopleApi.getRenterDebt).mockResolvedValueOnce({ data: [] })
    vi.mocked(peopleApi.listRenters).mockResolvedValueOnce({ data: [], meta: {} })

    renderPeopleApp('/people/renters/r-1')
    const user = userEvent.setup()

    await user.click(await screen.findByRole('link', { name: 'Volver a Inquilinos' }))

    expect(await screen.findByRole('button', { name: 'Nuevo inquilino' })).toBeInTheDocument()
  })
})
