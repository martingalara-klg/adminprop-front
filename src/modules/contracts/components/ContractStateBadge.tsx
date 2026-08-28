// src/modules/contracts/components/ContractStateBadge.tsx
//
// Issue #56 punto 1 (cierra #38): badge de estado del CONTRATO —
// active → "Activo" (verde), draft → "Borrador" (gris), terminated →
// "Terminado" (rojo), expired → "Vencido" (ámbar, no listado por el PO
// pero ya existía como valor posible de `status` en el listado). Usado
// en `ContractsTable` (listado) y `ContractDetailPage` (ficha) — mismo
// mapa de labels en los dos lugares, resuelve #38 (la ficha mostraba el
// status crudo del backend).
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Activo',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  draft: {
    label: 'Borrador',
    className: 'bg-slate-100 text-slate-700 ring-slate-300',
  },
  terminated: {
    label: 'Terminado',
    className: 'bg-red-50 text-red-800 ring-red-200',
  },
  expired: {
    label: 'Vencido',
    className: 'bg-amber-50 text-amber-800 ring-amber-200',
  },
}

type Props = {
  status: string
}

export function ContractStateBadge({ status }: Props) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700 ring-slate-300',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  )
}
