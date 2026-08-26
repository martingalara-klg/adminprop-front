// tests/e2e/support/seed-data.ts
//
// Constantes espejo de tests/e2e/seed/seed.py — issue #16. El seed
// inserta estas credenciales/IDs directo en Postgres (bypass del flujo de
// invitación por email, inviable en CI). Si se cambia un valor acá,
// cambiar el mismo valor literal en seed.py (no hay generación automática
// cross-lenguaje; son dos archivos hermanos que deben mantenerse en sync
// manualmente -- ver comentario de cabecera en seed.py).

export const SEED = {
  organizationSlug: 'e2e-org',
  owner: {
    email: 'owner.e2e@adminprop.local',
    password: 'E2eOwner1234!',
    fullName: 'Owner E2E',
  },
  admin: {
    email: 'admin.e2e@adminprop.local',
    password: 'E2eAdmin1234!',
    fullName: 'Admin E2E',
  },
  invalidPassword: 'ContraseñaIncorrecta1!',
  // Propiedad + inquilino ya sembrados (CA "alta de contrato" puede crear
  // el contrato desde cero contra estos dos, sin pasar por los formularios
  // de alta de propiedad/persona -- fuera del alcance del flujo crítico
  // que este E2E cubre).
  property: {
    address: 'Av. Siempre Viva 742, CABA',
  },
  renter: {
    name: 'Inquilino E2E',
  },
  // Landlord/propiedad/contrato/rent_period ya sembrados para "cobro con
  // mora perdonada" -- período vencido (2 meses atrás), contrato activo
  // con daily_late_fee_pct=1%, amount_due=100000 ARS, grace_day=10 (org
  // settings default de provisioning.py).
  landlordWithOverdueRentPeriod: {
    propertyAddress: 'Corrientes 1234, CABA',
    renterName: 'Inquilino Moroso E2E',
    amountDue: '100000.00',
    dailyLateFeePct: 1.0,
    graceDay: 10,
  },
  // Landlord/propiedad con un concepto recurrente activo ("Expensas") sin
  // cargar todavía -- usado por el wizard de liquidación.
  settlementsLandlord: {
    name: 'Landlord Liquidaciones E2E',
    propertyAddress: 'Belgrano 500, CABA',
    recurringChargeLabel: 'Expensas',
    chargeAmount: '20000',
  },
} as const

