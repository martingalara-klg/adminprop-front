// src/modules/contracts/pages/AdjustmentsInboxPage.tsx
//
// RF-04 pasos 2/3/4 — CA-03-04/05: bandeja de ajustes pendientes
// (`GET /adjustments?status=pending`) + flujo de aplicación del %
// (`POST /adjustments/:id/apply`). Gate por `adjustment:apply` — sin el
// permiso, la bandeja es de sólo lectura (RF-04: "owner/admin ...
// aplican ajustes").
import { useState } from 'react'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, EmptyState, ForbiddenState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { ApplyAdjustmentInput } from '../schemas/contract.schema'

import { AdjustmentsTable } from '../components/AdjustmentsTable'
import { ApplyAdjustmentForm } from '../components/ApplyAdjustmentForm'
import { usePendingAdjustments } from '../hooks/usePendingAdjustments'
import { useApplyAdjustment } from '../hooks/useApplyAdjustment'
import { useContractDetail } from '../hooks/useContractDetail'

export function AdjustmentsInboxPage() {
  const canReadContracts = usePermission('contract:read')
  const canApplyAdjustments = usePermission('adjustment:apply')

  const [selectedAdjustmentId, setSelectedAdjustmentId] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const pendingQuery = usePendingAdjustments(canReadContracts)
  const applyAdjustment = useApplyAdjustment()

  const adjustments = pendingQuery.data?.data ?? []
  const selectedAdjustment = adjustments.find((a) => a.id === selectedAdjustmentId) ?? null

  // El contrato del ajuste seleccionado se consulta para mostrar el
  // `current_amount` como base del preview (RF-04 paso 3) — no hay
  // endpoint de preview dedicado en sdd_03 §8.
  const contractQuery = useContractDetail(
    selectedAdjustment?.contract_id,
    canReadContracts && !!selectedAdjustment,
  )

  if (!canReadContracts) {
    return (
      <ForbiddenState message="No tenés permiso para ver la bandeja de ajustes. Consultá con el owner de la organización." />
    )
  }

  function handleSelect(adjustmentId: string) {
    setApplyError(null)
    setSelectedAdjustmentId(adjustmentId)
  }

  function handleApply(values: ApplyAdjustmentInput) {
    if (!selectedAdjustmentId) return
    setApplyError(null)
    applyAdjustment.mutate(
      { adjustmentId: selectedAdjustmentId, payload: { pct: values.pct } },
      {
        onSuccess: () => setSelectedAdjustmentId(null),
        onError: (error) => setApplyError(resolveErrorMessage(error)),
      },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">Bandeja de ajustes</h1>
        <p className="text-sm text-muted-foreground">
          Ajustes por índice que llegaron a su período de aplicación. El % se ingresa
          manualmente — el índice de referencia es sólo informativo (decisión #101).
        </p>
      </header>

      <section>
        {pendingQuery.isLoading ? <Spinner label="Cargando bandeja de ajustes..." /> : null}
        {pendingQuery.isError ? <ErrorState error={pendingQuery.error} /> : null}
        {pendingQuery.data && adjustments.length === 0 ? (
          <EmptyState
            title="No hay ajustes pendientes"
            description="Ningún contrato llegó a su período de ajuste todavía."
          />
        ) : null}
        {adjustments.length > 0 ? (
          <AdjustmentsTable
            adjustments={adjustments}
            selectedAdjustmentId={selectedAdjustmentId}
            onSelect={handleSelect}
          />
        ) : null}
      </section>

      {selectedAdjustment && canApplyAdjustments ? (
        <section>
          <ApplyAdjustmentForm
            previousAmount={contractQuery.data?.data.current_amount ?? null}
            errorMessage={applyError}
            isSubmitting={applyAdjustment.isPending}
            onSubmit={handleApply}
            onCancel={() => setSelectedAdjustmentId(null)}
          />
        </section>
      ) : null}

      {selectedAdjustment && !canApplyAdjustments ? (
        <p className="text-sm text-muted-foreground" role="status">
          No tenés permiso para aplicar ajustes (permiso <code>adjustment:apply</code>).
        </p>
      ) : null}
    </div>
  )
}
