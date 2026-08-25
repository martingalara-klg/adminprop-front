// src/modules/contracts/pages/ContractDetailPage.tsx
//
// RF-01 + RF-03 — CA-03-01/02/06/08: ficha del contrato — condiciones,
// monto vigente, ciclo de vida (activar/terminar) e historial de
// ajustes. `current_amount` no es editable en la UI (RN-C04: sólo
// cambia vía ajuste; el backend rechaza el PATCH con 422 igual).
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, ForbiddenState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { formatDate, formatMoney } from '@/shared/utils/format'
import type { TerminateContractInput } from '../schemas/contract.schema'

import { ContractLifecycleActions } from '../components/ContractLifecycleActions'
import { ContractOverlapError } from '../components/ContractOverlapError'
import { ContractAdjustmentsHistory } from '../components/ContractAdjustmentsHistory'
import { useContractDetail } from '../hooks/useContractDetail'
import { useContractAdjustmentsHistory } from '../hooks/useContractAdjustmentsHistory'
import { useActivateContract } from '../hooks/useActivateContract'
import { useTerminateContract } from '../hooks/useTerminateContract'

const CURRENCY_LABELS: Record<string, string> = { ARS: 'ARS', USD: 'USD' }

export function ContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>()
  const canReadContracts = usePermission('contract:read')
  const canManageContracts = usePermission('contract:manage')

  const contractQuery = useContractDetail(contractId, canReadContracts)
  const adjustmentsQuery = useContractAdjustmentsHistory(contractId, canReadContracts)

  const activateContract = useActivateContract()
  const terminateContract = useTerminateContract()

  const [activateError, setActivateError] = useState<unknown>(null)
  const [terminateError, setTerminateError] = useState<string | null>(null)

  if (!canReadContracts) {
    return (
      <ForbiddenState message="No tenés permiso para ver este contrato. Consultá con el owner de la organización." />
    )
  }

  if (contractQuery.isLoading) return <Spinner label="Cargando contrato..." />
  if (contractQuery.isError) return <ErrorState error={contractQuery.error} />
  if (!contractQuery.data) return null

  const contract = contractQuery.data.data
  const adjustments = adjustmentsQuery.data?.data ?? []

  function handleActivate() {
    if (!contractId) return
    setActivateError(null)
    activateContract.mutate(contractId, { onError: (error) => setActivateError(error) })
  }

  function handleTerminate(values: TerminateContractInput) {
    if (!contractId) return
    setTerminateError(null)
    terminateContract.mutate(
      { contractId, payload: values },
      { onError: (error) => setTerminateError(resolveErrorMessage(error)) },
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-lg font-semibold">
          Contrato {CURRENCY_LABELS[contract.currency] ?? contract.currency}
        </h1>
        <p className="text-sm text-muted-foreground">Estado: {contract.status}</p>
      </header>

      <section className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-3 text-sm" data-testid="contract-detail">
          <div>
            <dt className="text-muted-foreground">Monto vigente</dt>
            <dd>
              {formatMoney(contract.current_amount)}{' '}
              {CURRENCY_LABELS[contract.currency] ?? contract.currency}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vigencia</dt>
            <dd>
              {formatDate(contract.start_date)} – {formatDate(contract.end_date)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">% mora diaria</dt>
            <dd>{contract.daily_late_fee_pct}%</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Frecuencia de ajuste</dt>
            <dd>
              {contract.adjustment_frequency_months
                ? `${contract.adjustment_frequency_months} meses`
                : 'Sin ajuste (USD o no configurado)'}
            </dd>
          </div>
        </dl>
      </section>

      {canManageContracts ? (
        <section className="flex flex-col gap-2">
          <ContractLifecycleActions
            status={contract.status}
            canManage={canManageContracts}
            isActivating={activateContract.isPending}
            isTerminating={terminateContract.isPending}
            activateError={null}
            terminateError={terminateError}
            onActivate={handleActivate}
            onTerminate={handleTerminate}
          />
          {activateError ? <ContractOverlapError error={activateError} /> : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Historial de ajustes</h2>
        <ContractAdjustmentsHistory adjustments={adjustments} />
      </section>
    </div>
  )
}
