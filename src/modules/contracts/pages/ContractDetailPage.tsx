// src/modules/contracts/pages/ContractDetailPage.tsx
//
// RF-01 + RF-03 — CA-03-01/02/06/08: ficha del contrato — condiciones,
// monto vigente, ciclo de vida (activar/terminar) e historial de
// ajustes. `current_amount` no es editable en la UI (RN-C04: sólo
// cambia vía ajuste; el backend rechaza el PATCH con 422 igual).
//
// Issue #56 (pulido #2 del PO, cierra #38): estado con badge de color,
// montos sin centavos ,00 (formatMoney), ficha completa (propiedad y
// inquilino linkeados, monto inicial, índice de referencia, notas),
// terminar contrato discreto y gateado por `contract:terminate`
// (back#105), libre deuda del CONTRATO (back#104) e historial de
// valores locativos mes a mes (back#106).
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, ForbiddenState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { formatDate, formatMoney } from '@/shared/utils/format'
import { ADJUSTMENT_INDEX_LABELS, type TerminateContractInput } from '../schemas/contract.schema'

import { ContractStateBadge } from '../components/ContractStateBadge'
import { ContractLifecycleActions } from '../components/ContractLifecycleActions'
import { ContractOverlapError } from '../components/ContractOverlapError'
import { ContractAdjustmentsHistory } from '../components/ContractAdjustmentsHistory'
import { ContractDebtCertificateButton } from '../components/ContractDebtCertificateButton'
import { MonthlyAmountsHistory } from '../components/MonthlyAmountsHistory'
import { useContractDetail } from '../hooks/useContractDetail'
import { useContractAdjustmentsHistory } from '../hooks/useContractAdjustmentsHistory'
import { useActivateContract } from '../hooks/useActivateContract'
import { useTerminateContract } from '../hooks/useTerminateContract'
import { useContractPropertyLink } from '../hooks/useContractPropertyLink'
import { useContractRenterLink } from '../hooks/useContractRenterLink'

const CURRENCY_LABELS: Record<string, string> = { ARS: 'ARS', USD: 'USD' }

export function ContractDetailPage() {
  const { contractId } = useParams<{ contractId: string }>()
  const canReadContracts = usePermission('contract:read')
  const canManageContracts = usePermission('contract:manage')
  const canTerminateContract = usePermission('contract:terminate')
  const canReadProperties = usePermission('property:read')
  const canReadRenters = usePermission('renter:read')

  const contractQuery = useContractDetail(contractId, canReadContracts)
  const adjustmentsQuery = useContractAdjustmentsHistory(contractId, canReadContracts)

  // Hooks se llaman siempre, incondicionalmente (reglas de hooks de
  // React) — `enabled` dentro de cada hook decide si dispara el
  // request, no un `if` antes de invocarlo.
  const propertyQuery = useContractPropertyLink(
    contractQuery.data?.data.property_id,
    canReadProperties,
  )
  const renterQuery = useContractRenterLink(contractQuery.data?.data.renter_id, canReadRenters)

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
  const monthlyAmounts = contract.monthly_amounts ?? []

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

  const property = propertyQuery.data?.data
  const renter = renterQuery.data?.data

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">
          Contrato {CURRENCY_LABELS[contract.currency] ?? contract.currency}
        </h1>
        <ContractStateBadge status={contract.status} />
      </header>

      <section className="flex flex-col gap-3">
        <dl className="grid grid-cols-2 gap-3 text-sm" data-testid="contract-detail">
          <div>
            <dt className="text-muted-foreground">Propiedad</dt>
            <dd>
              {canReadProperties && property ? (
                <Link
                  to={`/properties/${contract.property_id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {property.address}
                </Link>
              ) : (
                contract.property_id
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Inquilino</dt>
            <dd>
              {canReadRenters && renter ? (
                <Link
                  to={`/people/renters/${contract.renter_id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {renter.name}
                </Link>
              ) : (
                contract.renter_id
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Monto inicial</dt>
            <dd>
              {formatMoney(contract.initial_amount)}{' '}
              {CURRENCY_LABELS[contract.currency] ?? contract.currency}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Monto vigente</dt>
            <dd>
              {formatMoney(contract.current_amount)}{' '}
              {CURRENCY_LABELS[contract.currency] ?? contract.currency}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Moneda</dt>
            <dd>{CURRENCY_LABELS[contract.currency] ?? contract.currency}</dd>
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
          <div>
            <dt className="text-muted-foreground">Índice de referencia</dt>
            <dd>
              {contract.adjustment_index
                ? ((ADJUSTMENT_INDEX_LABELS as Record<string, string>)[contract.adjustment_index] ??
                  contract.adjustment_index)
                : 'Sin índice (USD o no configurado)'}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-muted-foreground">Notas</dt>
            <dd>{contract.notes ?? 'Sin notas.'}</dd>
          </div>
        </dl>
      </section>

      {canManageContracts || canTerminateContract ? (
        <section className="flex flex-col gap-2">
          <ContractLifecycleActions
            status={contract.status}
            canManage={canManageContracts}
            canTerminate={canTerminateContract}
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

      {canReadContracts ? (
        <section>
          <ContractDebtCertificateButton contractId={contract.id} />
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Historial de ajustes</h2>
        <ContractAdjustmentsHistory adjustments={adjustments} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Historial de valores locativos
        </h2>
        <MonthlyAmountsHistory monthlyAmounts={monthlyAmounts} />
      </section>
    </div>
  )
}
