// src/modules/settlements/components/wizard/ConfirmationStep.tsx
//
// Wizard paso 4/4 — confirmation: resumen del propietario/período/TC →
// POST /settlements/generate. NO replica la fórmula del backend (RN-L01
// et al) — sólo confirma los inputs que el usuario ya eligió.
import { Button } from '@/shared/components'

type Props = {
  landlordName: string
  period: string
  exchangeRate: string | null
  isSubmitting: boolean
  errorMessage: string | null
  onBack: () => void
  onConfirm: () => void
}

export function ConfirmationStep({
  landlordName,
  period,
  exchangeRate,
  isSubmitting,
  errorMessage,
  onBack,
  onConfirm,
}: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">Paso 4 de 4 — Confirmación</h2>

      <dl className="grid grid-cols-2 gap-3 text-sm" data-testid="settlement-confirmation-summary">
        <div>
          <dt className="text-muted-foreground">Propietario</dt>
          <dd>{landlordName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Período</dt>
          <dd>{period}</dd>
        </div>
        {exchangeRate ? (
          <div>
            <dt className="text-muted-foreground">Tipo de cambio</dt>
            <dd>{exchangeRate}</dd>
          </div>
        ) : null}
      </dl>

      <p className="text-sm text-muted-foreground">
        El neto a rendir, la comisión y los totales se calculan en el servidor a partir de los
        cobros, cargos y reparaciones del período — este resumen sólo confirma qué se va a
        generar.
      </p>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Volver
        </Button>
        <Button type="button" onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? 'Generando…' : 'Generar liquidación'}
        </Button>
      </div>
    </div>
  )
}
