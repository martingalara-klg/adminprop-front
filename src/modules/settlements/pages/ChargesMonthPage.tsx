// src/modules/settlements/pages/ChargesMonthPage.tsx
//
// RF-05 + CA-05-08: cargos del mes — checklist de verificación mensual
// (secretaria carga el importe de cada concepto activo, mes a mes).
// Gate por `charge:manage` (permiso único, sdd_03 §"Catálogo de
// Permisos" no declara `charge:read` separado — ver charges/router.py).
import { useState } from 'react'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, ForbiddenState, PeriodSelector } from '@/shared/components'
import { currentPeriod } from '@/shared/utils/period'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { ChargeEntryCreate, ChargeEntryUpdate } from '@/api/charges.api'
import type { ChargeEntryInput } from '../schemas/settlement.schema'

import { ChargeVerificationChecklist } from '../components/ChargeVerificationChecklist'
import { useChargeVerification } from '../hooks/useChargeVerification'
import { useCreateChargeEntry } from '../hooks/useCreateChargeEntry'
import { useUpdateChargeEntry } from '../hooks/useUpdateChargeEntry'
import { usePropertyOptions } from '../hooks/usePropertyOptions'

export function ChargesMonthPage() {
  const canManageCharges = usePermission('charge:manage')
  const [period, setPeriod] = useState(currentPeriod())
  const [mutationError, setMutationError] = useState<unknown>(null)

  const checklistQuery = useChargeVerification(period, canManageCharges)
  const propertiesQuery = usePropertyOptions(canManageCharges)
  const createEntry = useCreateChargeEntry(period)
  const updateEntry = useUpdateChargeEntry(period)

  if (!canManageCharges) {
    return (
      <ForbiddenState message="No tenés permiso para cargar los cargos del mes. Consultá con el owner de la organización." />
    )
  }

  function handleCreate(recurringChargeId: string, values: ChargeEntryInput) {
    setMutationError(null)
    const payload: ChargeEntryCreate = {
      period,
      amount: values.amount,
      notes: values.notes || undefined,
    }
    createEntry.mutate(
      { recurringChargeId, payload },
      { onError: (error) => setMutationError(error) },
    )
  }

  function handleUpdate(chargeEntryId: string, values: ChargeEntryInput) {
    setMutationError(null)
    const payload: ChargeEntryUpdate = {
      amount: values.amount,
      notes: values.notes || undefined,
    }
    updateEntry.mutate({ chargeEntryId, payload }, { onError: (error) => setMutationError(error) })
  }

  const properties = propertiesQuery.data?.data ?? []
  const propertyLabels = Object.fromEntries(properties.map((p) => [p.id, p.address]))

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Cargos del mes</h1>
          <p className="text-sm text-muted-foreground">
            Checklist mensual: qué propiedades ya tienen sus cargos cargados y cuáles faltan.
          </p>
        </div>
        {/* Issue #78: PeriodSelector compartido. Los cargos son de meses ya
            transcurridos o el actual — nunca futuros (mismo tope `max` que
            tenía el input nativo). */}
        <PeriodSelector
          id="charges-period"
          value={period}
          onChange={setPeriod}
          max={currentPeriod()}
        />
      </header>

      {checklistQuery.isLoading || propertiesQuery.isLoading ? (
        <Spinner label="Cargando checklist del mes..." />
      ) : null}
      {checklistQuery.isError ? <ErrorState error={checklistQuery.error} /> : null}

      {checklistQuery.data ? (
        <ChargeVerificationChecklist
          items={checklistQuery.data.data}
          propertyLabels={propertyLabels}
          isSubmitting={createEntry.isPending || updateEntry.isPending}
          errorMessage={mutationError ? resolveErrorMessage(mutationError) : null}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
        />
      ) : null}
    </div>
  )
}
