// src/modules/maintenance/components/PayerBadge.tsx
//
// RF-01: "Paga: Dueño / Administración" — visible en todo el ciclo (RN-01).
import { PAYER_LABELS } from '../schemas/maintenance.schema'

type Props = { payer: 'landlord' | 'agency' }

export function PayerBadge({ payer }: Props) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      {PAYER_LABELS[payer]}
    </span>
  )
}
