// src/shared/i18n/messages/error-codes.es-AR.ts
//
// Mapa central error.code → mensaje es-AR.
//
// Catálogo CERRADO — sdd_03_api_contracts.md v1.5 §"Códigos de Error
// Globales". Cubre transversales + auth/usuarios + contratos + cobranzas +
// liquidaciones + mantenimiento. Un código fuera de este catálogo es una
// divergencia del backend respecto del SDD: NO se agrega silenciosamente
// acá — se reporta (ver CLAUDE.md §2 "Regla de oro") y se usa el fallback
// genérico mientras tanto.
//
// Nota de implementación: el stack declarado en `CLAUDE.md` §3 no incluye
// react-intl (i18n se resuelve como "es-AR único en MVP" — sin
// `IntlProvider`); este mapa es un `Record<string, string>` plano en vez
// de `defineMessages` de react-intl. Si un issue futuro introduce
// react-intl formalmente, migrar este archivo entonces.
export const errorCodeMessages: Record<string, string> = {
  // ── Transversales ──────────────────────────────────────────────────────
  VALIDATION_ERROR: 'Algunos campos tienen errores. Revisalos e intentá nuevamente.',
  INVALID_DATE_RANGE: 'El rango de fechas ingresado no es válido.',
  UNAUTHORIZED: 'Tu sesión expiró. Por favor iniciá sesión nuevamente.',
  ACCOUNT_LOCKED: 'Tu cuenta está bloqueada por 30 minutos por intentos fallidos.',
  FORBIDDEN: 'No tenés permiso para realizar esta acción.',
  ROLE_REQUIRED: 'Tu rol no tiene permiso para realizar esta acción.',
  SUPERADMIN_REQUIRED: 'Esta acción requiere permisos de super administrador.',
  MEMBERSHIP_INACTIVE: 'Tu membresía en esta organización está inactiva.',
  NOT_FOUND: 'No encontramos lo que buscás.',
  CONFLICT: 'Hay un conflicto con el estado actual.',
  ENTITY_HAS_DEPENDENCIES: 'No se puede eliminar: hay registros que dependen de este recurso.',
  BUSINESS_RULE_VIOLATION: 'La operación viola una regla de negocio.',
  INVALID_STATUS_TRANSITION: 'No se puede cambiar el estado desde el estado actual.',
  RATE_LIMIT_EXCEEDED: 'Demasiadas solicitudes. Esperá unos segundos e intentá nuevamente.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado. El equipo fue notificado.',
  NETWORK_ERROR: 'Error de red. Verificá tu conexión.',

  // ── Auth y usuarios ─────────────────────────────────────────────────────
  INVITATION_NOT_FOUND: 'Invitación no encontrada.',
  INVITATION_EXPIRED: 'La invitación expiró. Solicitá una nueva al administrador.',
  INVITATION_ALREADY_ACCEPTED: 'La invitación ya fue usada. Iniciá sesión con tus credenciales.',
  INVITATION_PENDING_EXISTS: 'Ya hay una invitación pendiente para ese email.',
  USER_ALREADY_MEMBER: 'El email ya es miembro de la organización.',
  LAST_OWNER_REQUIRED: 'Debe quedar al menos un owner activo. Designá otro owner antes.',
  ROLE_NOT_FOUND: 'El rol seleccionado no existe en esta organización.',
  SYSTEM_ROLE_IMMUTABLE: 'Este rol del sistema no puede modificarse.',
  RESET_TOKEN_EXPIRED: 'El enlace para restablecer tu contraseña expiró. Solicitá uno nuevo.',

  // ── Contratos ────────────────────────────────────────────────────────────
  CONTRACT_OVERLAP: 'La propiedad ya tiene un contrato vigente en ese rango de fechas.',
  CONTRACT_NOT_ACTIVE: 'El contrato no está activo.',
  ADJUSTMENT_PENDING_EXISTS: 'Ya hay un ajuste pendiente para este contrato.',
  ADJUSTMENT_ALREADY_APPLIED: 'El ajuste ya fue aplicado.',
  ADJUSTMENT_PCT_REQUIRED: 'Se requiere el porcentaje de ajuste.',

  // ── Cobranzas ────────────────────────────────────────────────────────────
  RENT_PERIOD_ALREADY_PAID: 'El período ya fue pagado.',
  PAYMENT_EXCEEDS_CONTRACT_BALANCE: 'El monto del cobro excede el saldo pendiente del contrato.',
  EXCHANGE_RATE_REQUIRED: 'Se requiere el tipo de cambio porque la moneda del pago difiere de la del contrato.',
  PAYMENT_ALREADY_VOIDED: 'El cobro ya fue anulado.',
  RENTER_HAS_DEBT: 'El inquilino tiene deuda pendiente.',

  // ── Liquidaciones ────────────────────────────────────────────────────────
  SETTLEMENT_ALREADY_EXISTS: 'Ya existe una liquidación para este propietario y período.',
  SETTLEMENT_EXCHANGE_RATE_REQUIRED: 'Se requiere el tipo de cambio para generar la liquidación en USD.',
  CHARGE_ENTRY_ALREADY_EXISTS: 'Ya existe un cargo cargado para este período.',

  // ── Mantenimiento ────────────────────────────────────────────────────────
  WORK_ORDER_ALREADY_CLOSED: 'La orden de trabajo ya está cerrada.',
  WORK_ORDER_ALREADY_SETTLED: 'La orden de trabajo ya fue liquidada.',
  QUOTE_ALREADY_APPROVED: 'Ya hay una cotización aprobada para esta orden de trabajo.',
}

export const FALLBACK_ERROR_MESSAGE = 'Ocurrió un error. Por favor intentá nuevamente.'

/**
 * Resuelve el mensaje es-AR para un `error.code`. Si el código no
 * pertenece al catálogo cerrado de sdd_03 (divergencia del backend), cae
 * al mensaje genérico y loguea el código desconocido para poder
 * reportarlo (ver CLAUDE.md §2 "Regla de oro" — nunca se adapta el
 * frontend para compensar; se reporta).
 */
export function resolveErrorCodeMessage(code: string | undefined | null): string {
  if (!code) return FALLBACK_ERROR_MESSAGE

  const message = errorCodeMessages[code]
  if (message) return message

  // eslint-disable-next-line no-console
  console.warn(`[adminprop] error.code desconocido fuera del catálogo sdd_03: "${code}"`)
  return FALLBACK_ERROR_MESSAGE
}
