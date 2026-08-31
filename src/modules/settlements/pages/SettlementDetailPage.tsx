// src/modules/settlements/pages/SettlementDetailPage.tsx
//
// RF-02/RF-03/RF-04: detalle de liquidación — totales, line items con
// toggle consolidated/per_property (RF-04), estado draft/issued,
// "requiere regeneración" (CA-05-06), emitir/regenerar (mismo polling
// que el wizard) y exports. Gate por `settlement:read`; emitir por
// `settlement:issue`; regenerar por `settlement:generate` (decisión
// #30 — mismo permiso que generar).
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, ForbiddenState, BackLink } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { SettlementScope } from '@/api/settlements.api'
import type { RegenerateSettlementInput } from '../schemas/settlement.schema'

import { SettlementTotals } from '../components/SettlementTotals'
import { SettlementLineItemsTable } from '../components/SettlementLineItemsTable'
import { SettlementPropertyGroups } from '../components/SettlementPropertyGroups'
import { SettlementExportButtons } from '../components/SettlementExportButtons'
import { IssueSettlementAction } from '../components/IssueSettlementAction'
import { RegenerateSettlementAction } from '../components/RegenerateSettlementAction'
import { SettlementGenerationStatus } from '../components/wizard/SettlementGenerationStatus'

import { useSettlementDetail } from '../hooks/useSettlementDetail'
import { useIssueSettlement } from '../hooks/useIssueSettlement'
import { useRegenerateSettlement } from '../hooks/useRegenerateSettlement'

export function SettlementDetailPage() {
  const { settlementId } = useParams<{ settlementId: string }>()
  const canRead = usePermission('settlement:read')
  const canIssue = usePermission('settlement:issue')
  const canGenerate = usePermission('settlement:generate')

  const [scope, setScope] = useState<SettlementScope>('consolidated')
  const [issueError, setIssueError] = useState<unknown>(null)
  const [regenerateError, setRegenerateError] = useState<unknown>(null)

  const settlementQuery = useSettlementDetail(settlementId, { enabled: canRead, scope })
  const issueSettlement = useIssueSettlement(settlementId ?? '')
  const regenerateSettlement = useRegenerateSettlement(settlementId ?? '')

  if (!canRead) {
    return (
      <ForbiddenState message="No tenés permiso para ver liquidaciones. Consultá con el owner de la organización." />
    )
  }

  if (settlementQuery.isLoading) return <Spinner label="Cargando liquidación..." />
  if (settlementQuery.isError) return <ErrorState error={settlementQuery.error} />
  if (!settlementQuery.data) return null

  const settlement = settlementQuery.data.data
  const isProcessing = settlement.job_status === 'pending' || settlement.job_status === 'processing'

  function handleIssue() {
    setIssueError(null)
    issueSettlement.mutate(undefined, { onError: (error) => setIssueError(error) })
  }

  function handleRegenerate(values: RegenerateSettlementInput) {
    setRegenerateError(null)
    regenerateSettlement.mutate(
      { exchange_rate: values.exchange_rate || undefined },
      { onError: (error) => setRegenerateError(error) },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/settlements" label="Liquidaciones" />

      <header>
        <h1 className="text-lg font-semibold">Liquidación — período {settlement.period.slice(0, 7)}</h1>
      </header>

      {isProcessing ? (
        <SettlementGenerationStatus
          isLoading={settlementQuery.isLoading}
          isError={settlementQuery.isError}
          error={settlementQuery.error}
          settlement={settlement}
          onStartOver={() => undefined}
        />
      ) : (
        <>
          <SettlementTotals settlement={settlement} />

          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`rounded-md border px-3 py-1 text-sm ${scope === 'consolidated' ? 'bg-muted font-medium' : ''}`}
                onClick={() => setScope('consolidated')}
              >
                Consolidado
              </button>
              <button
                type="button"
                className={`rounded-md border px-3 py-1 text-sm ${scope === 'per_property' ? 'bg-muted font-medium' : ''}`}
                onClick={() => setScope('per_property')}
              >
                Por propiedad
              </button>
            </div>

            {scope === 'per_property' && settlement.property_groups ? (
              <SettlementPropertyGroups propertyGroups={settlement.property_groups} />
            ) : (
              <SettlementLineItemsTable lineItems={settlement.line_items} />
            )}
          </section>

          <section className="flex flex-wrap gap-4">
            <SettlementExportButtons settlementId={settlement.id} />

            {canIssue && settlement.status === 'draft' ? (
              <IssueSettlementAction
                isSubmitting={issueSettlement.isPending}
                errorMessage={issueError ? resolveErrorMessage(issueError) : null}
                onConfirm={handleIssue}
              />
            ) : null}

            {canGenerate ? (
              <RegenerateSettlementAction
                isSubmitting={regenerateSettlement.isPending}
                errorMessage={regenerateError ? resolveErrorMessage(regenerateError) : null}
                onSubmit={handleRegenerate}
              />
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}
