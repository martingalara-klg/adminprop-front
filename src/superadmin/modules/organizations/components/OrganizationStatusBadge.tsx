// src/superadmin/modules/organizations/components/OrganizationStatusBadge.tsx
//
// spec_module_00_superadmin.md §RF-01: "status (con distinción visual:
// pending_owner naranja, active verde, disabled gris)".
import { cn } from '@/shared/utils/cn'

type Props = { status: string }

const STATUS_LABELS: Record<string, string> = {
  pending_owner: 'Pendiente de owner',
  active: 'Activa',
  disabled: 'Deshabilitada',
}

const STATUS_CLASSES: Record<string, string> = {
  pending_owner: 'bg-orange-100 text-orange-800',
  active: 'bg-green-100 text-green-800',
  disabled: 'bg-gray-200 text-gray-700',
}

export function OrganizationStatusBadge({ status }: Props) {
  const label = STATUS_LABELS[status] ?? status
  const className = STATUS_CLASSES[status] ?? 'bg-gray-100 text-gray-600'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {label}
    </span>
  )
}
