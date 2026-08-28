// src/shared/components/ContractStatusBadge.tsx
//
// Issue #55 (ronda feedback #2 del PO) — cierra el #29: badge de estado
// de la propiedad por contrato. Criterio único: "Con contrato" (verde)
// cuando `status === 'rented'`; "Sin contrato" (rojo) para cualquier otro
// valor (`available`, `unavailable`, contrato vencido, etc.). Reemplaza
// los `STATUS_LABELS` ad-hoc de PropertiesTable, PropertyDetailPage y
// LandlordPropertiesList — un único criterio, un único lugar.
type ContractStatusBadgeProps = {
  status: string
}

export function ContractStatusBadge({ status }: ContractStatusBadgeProps) {
  const hasContract = status === 'rented'

  return (
    <span
      className={
        hasContract
          ? 'inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200'
          : 'inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-inset ring-red-200'
      }
    >
      {hasContract ? 'Con contrato' : 'Sin contrato'}
    </span>
  )
}
