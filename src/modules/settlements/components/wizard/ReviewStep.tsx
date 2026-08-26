// src/modules/settlements/components/wizard/ReviewStep.tsx
//
// Wizard paso 2/4 — review: checklist previo (períodos impagos,
// propiedades sin cargos, reparaciones agency sin liquidar). Se puede
// continuar igual (generará with_errors, CA-05-03) o volver a
// completar.
import { Link } from 'react-router-dom'
import { Button, Spinner, ErrorState } from '@/shared/components'
import { formatMoney } from '@/shared/utils/format'
import type { RentPeriodSummary } from '@/api/payments.api'
import type { ChargeVerificationItem } from '@/api/charges.api'
import type { PropertyWorkOrderHistoryEntry } from '@/api/properties.api'

type Props = {
  landlordName: string
  period: string
  isLoading: boolean
  isError: boolean
  error: unknown
  unpaidRentPeriods: RentPeriodSummary[]
  missingCharges: ChargeVerificationItem[]
  pendingRepairs: PropertyWorkOrderHistoryEntry[]
  propertyLabels: Record<string, string>
  onBack: () => void
  onContinue: () => void
}

export function ReviewStep({
  landlordName,
  period,
  isLoading,
  isError,
  error,
  unpaidRentPeriods,
  missingCharges,
  pendingRepairs,
  propertyLabels,
  onBack,
  onContinue,
}: Props) {
  const hasWarnings =
    unpaidRentPeriods.length > 0 || missingCharges.length > 0 || pendingRepairs.length > 0

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">Paso 2 de 4 — Revisión previa</h2>
      <p className="text-sm text-muted-foreground">
        {landlordName} — período {period}
      </p>

      {isLoading ? <Spinner label="Revisando el estado del mes..." /> : null}
      {isError ? <ErrorState error={error} /> : null}

      {!isLoading && !isError ? (
        <div className="flex flex-col gap-4" data-testid="settlement-review-checklist">
          {!hasWarnings ? (
            <p className="text-sm text-green-700" role="status">
              Sin advertencias: cobros del período, cargos y reparaciones están al día.
            </p>
          ) : null}

          {unpaidRentPeriods.length > 0 ? (
            <section className="rounded-md border border-amber-300 bg-amber-50 p-3">
              <h3 className="text-sm font-medium">
                Períodos impagos ({unpaidRentPeriods.length})
              </h3>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {unpaidRentPeriods.map((rentPeriod) => (
                  <li key={rentPeriod.id}>
                    {propertyLabels[rentPeriod.property_id] ?? rentPeriod.property_id} —{' '}
                    {formatMoney(rentPeriod.balance)} pendiente
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {missingCharges.length > 0 ? (
            <section className="rounded-md border border-amber-300 bg-amber-50 p-3">
              <h3 className="text-sm font-medium">
                Propiedades sin cargos cargados ({missingCharges.length})
              </h3>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {missingCharges.map((item) => (
                  <li key={item.recurring_charge_id}>
                    {propertyLabels[item.property_id] ?? item.property_id} — {item.label}
                  </li>
                ))}
              </ul>
              <Link
                to="/settlements/charges"
                className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Ir a cargar los cargos del mes
              </Link>
            </section>
          ) : null}

          {pendingRepairs.length > 0 ? (
            <section className="rounded-md border border-amber-300 bg-amber-50 p-3">
              <h3 className="text-sm font-medium">
                Reparaciones cerradas sin liquidar ({pendingRepairs.length})
              </h3>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {pendingRepairs.map((workOrder) => (
                  <li key={workOrder.id}>
                    {workOrder.title} — {formatMoney(workOrder.final_cost ?? '0')}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Podés continuar igual — la liquidación se generará con advertencias
            (<code>with_errors</code>) listadas en el detalle para decidir si emitir.
          </p>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Volver
        </Button>
        <Button type="button" onClick={onContinue} disabled={isLoading}>
          Continuar
        </Button>
      </div>
    </div>
  )
}
