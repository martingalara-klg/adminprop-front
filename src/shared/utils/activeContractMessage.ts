// src/shared/utils/activeContractMessage.ts
//
// Issue #86 (espejo de back#124, decisión #130, sdd_03 v1.17): el
// `422 ENTITY_HAS_ACTIVE_CONTRACT` de `DELETE /properties/:id` y
// `DELETE /renters/:id` trae `details` estructurado:
//   { entity_type: "property" | "renter", entity_id,
//     active_contracts: [{ contract_id, property_id, property_address,
//                          renter_id, renter_name, start_date, end_date }] }
// Mismo criterio que `debtMessage.ts` (#70): mensaje legible es-AR desde
// `details`, nunca JSON en pantalla. Si el backend no manda un campo se
// omite esa parte; sin nada utilizable se cae al mensaje genérico del
// catálogo (`error-codes.es-AR.ts`).
//
// Vive en `src/shared/utils/` (no en un módulo) porque lo consumen dos
// módulos: properties (ficha de propiedad) y people (ficha de inquilino).
import { AdminPropApiError } from '@/api/errors'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'

const GENERIC_ACTIVE_CONTRACT_MESSAGE = 'No se puede eliminar: tiene un contrato activo.'

type ActiveContractItem = {
  propertyAddress: string | null
  renterName: string | null
}

function toLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** "Av. Siempreviva 742 — Juan Pérez" — omite la parte que falte. */
function formatContractLabel(item: ActiveContractItem): string | null {
  const parts = [item.propertyAddress, item.renterName].filter(
    (part): part is string => part !== null,
  )
  if (parts.length === 0) return null
  return parts.join(' — ')
}

/**
 * "No se puede eliminar: tiene un contrato activo (Av. Siempreviva 742 —
 * Juan Pérez)." Con más de un contrato activo (un inquilino puede alquilar
 * varias propiedades): "tiene 2 contratos activos (A — B; C — D)."
 * Sin `details` utilizable → mensaje genérico legible (nunca JSON).
 */
export function buildActiveContractMessage(details: Record<string, unknown> | null): string {
  const rawContracts = details?.active_contracts
  if (!Array.isArray(rawContracts) || rawContracts.length === 0) {
    return GENERIC_ACTIVE_CONTRACT_MESSAGE
  }

  const labels = rawContracts
    .map((raw) => {
      const record = raw as Record<string, unknown> | null
      return formatContractLabel({
        propertyAddress: toLabel(record?.property_address),
        renterName: toLabel(record?.renter_name),
      })
    })
    .filter((label): label is string => label !== null)

  const count = rawContracts.length
  const heading =
    count === 1
      ? 'No se puede eliminar: tiene un contrato activo'
      : `No se puede eliminar: tiene ${count} contratos activos`

  if (labels.length === 0) return `${heading}.`
  return `${heading} (${labels.join('; ')}).`
}

/**
 * Resuelve el mensaje de error de una baja de propiedad/inquilino:
 * `ENTITY_HAS_ACTIVE_CONTRACT` arma el mensaje legible desde `details`;
 * cualquier otro código cae al mapa central es-AR.
 */
export function resolveEntityDeleteErrorMessage(error: unknown): string {
  if (error instanceof AdminPropApiError && error.code === 'ENTITY_HAS_ACTIVE_CONTRACT') {
    return buildActiveContractMessage(error.details)
  }
  return resolveErrorMessage(error)
}
