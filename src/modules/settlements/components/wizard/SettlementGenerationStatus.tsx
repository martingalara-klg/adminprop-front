// src/modules/settlements/components/wizard/SettlementGenerationStatus.tsx
//
// Pantalla de progreso tras confirmar (RF-01 + CA-05-03): polling de
// GET /settlements/:id vía useSettlementDetail hasta un estado terminal.
//   pending | processing → spinner.
//   completed            → éxito, sin advertencias.
//   with_errors          → generada igual, con advertencias a decidir.
//   failed                → no se generó; el motivo queda en Sentry/job.
import { Link } from 'react-router-dom'
import { Button, Spinner, ErrorState } from '@/shared/components'
import type { SettlementDetail } from '@/api/settlements.api'

type Props = {
  isLoading: boolean
  isError: boolean
  error: unknown
  settlement: SettlementDetail | undefined
  onStartOver: () => void
}

export function SettlementGenerationStatus({
  isLoading,
  isError,
  error,
  settlement,
  onStartOver,
}: Props) {
  if (isLoading && !settlement) return <Spinner label="Iniciando la generación..." />
  if (isError) return <ErrorState error={error} />
  if (!settlement) return null

  if (settlement.job_status === 'pending' || settlement.job_status === 'processing') {
    return (
      <div className="flex flex-col items-center gap-2 p-8 text-center" data-testid="settlement-job-processing">
        <Spinner label="Generando la liquidación..." />
        <p className="text-sm text-muted-foreground">
          Esto puede tardar unos segundos — no cierres esta pantalla.
        </p>
      </div>
    )
  }

  if (settlement.job_status === 'failed') {
    return (
      <div className="flex flex-col gap-3" data-testid="settlement-job-failed" role="alert">
        <p className="text-sm font-medium text-destructive">No se pudo generar la liquidación.</p>
        <p className="text-sm text-muted-foreground">
          El motivo quedó registrado para el equipo técnico. Podés intentar generarla de nuevo.
        </p>
        <div>
          <Button type="button" variant="outline" onClick={onStartOver}>
            Volver a intentar
          </Button>
        </div>
      </div>
    )
  }

  const isWithErrors = settlement.job_status === 'with_errors'

  return (
    <div className="flex flex-col gap-3" data-testid="settlement-job-completed">
      <p
        className={`text-sm font-medium ${isWithErrors ? 'text-amber-700' : 'text-green-700'}`}
        role="status"
      >
        {isWithErrors
          ? 'Liquidación generada con advertencias.'
          : 'Liquidación generada correctamente.'}
      </p>

      {isWithErrors && settlement.warnings.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
          {settlement.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div>
        <Link to={`/settlements/${settlement.id}`}>
          <Button type="button">Ver detalle</Button>
        </Link>
      </div>
    </div>
  )
}
