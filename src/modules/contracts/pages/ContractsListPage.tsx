// src/modules/contracts/pages/ContractsListPage.tsx
//
// RF-01 + RF-05 — CA-03-01/02/03/07: listado de contratos con filtro de
// vencimientos (`expiring_in_days`) + alta ARS/USD. Gate por
// `contract:read` (maintenance no lo tiene — RN-A01).
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { AdminPropApiError } from '@/api/errors'
import {
  Spinner,
  ErrorState,
  EmptyState,
  ForbiddenState,
  Input,
  Label,
  SuccessBanner,
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components'
import type { CreateContractInput } from '../schemas/contract.schema'

import { ContractsTable } from '../components/ContractsTable'
import { ContractForm } from '../components/ContractForm'
import { ContractOverlapError } from '../components/ContractOverlapError'
import { useContractsList } from '../hooks/useContractsList'
import { useCreateContract } from '../hooks/useCreateContract'
import { usePropertyOptions } from '../hooks/usePropertyOptions'
import { useRenterOptions } from '../hooks/useRenterOptions'

export function ContractsListPage() {
  const canReadContracts = usePermission('contract:read')
  const canManageContracts = usePermission('contract:manage')

  const [expiringInDays, setExpiringInDays] = useState('')
  const [createError, setCreateError] = useState<unknown>(null)
  // Issue #50 — VALIDATION_ERROR/INVALID_DATE_RANGE con `error.field`
  // (`current_amount`/`current_amount_since`) se propaga como error
  // inline del form, además del banner genérico (`createError`).
  const [createFieldError, setCreateFieldError] = useState<{
    field: string
    message: string
  } | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  const appliedExpiringInDays =
    expiringInDays && !Number.isNaN(Number(expiringInDays)) ? Number(expiringInDays) : undefined

  // idle/loading/error/empty/success — flow-implementation.md. `expired`
  // no aplica a este listado (el estado `expired` del contrato es un
  // valor de negocio, no un estado de flujo de UI con token vencido).
  const contractsQuery = useContractsList(
    { expiring_in_days: appliedExpiringInDays },
    canReadContracts,
  )
  const propertiesQuery = usePropertyOptions(canReadContracts)
  const rentersQuery = useRenterOptions(canReadContracts)
  const createContract = useCreateContract()

  if (!canReadContracts) {
    return (
      <ForbiddenState message="No tenés permiso para ver contratos. Consultá con el owner de la organización." />
    )
  }

  function handleCreate(values: CreateContractInput) {
    setCreateError(null)
    setCreateFieldError(null)

    const adjustmentFrequencyMonths =
      values.currency === 'ARS' && values.adjustment_frequency_months
        ? Number(values.adjustment_frequency_months)
        : undefined

    // Issue #57 (espejo de back#107, RN-C06 v2): con frecuencia de
    // ajuste se envía `historical_amounts[]` (tramos transcurridos);
    // sin frecuencia sigue el mecanismo de #50
    // (`current_amount`/`current_amount_since`) — mutuamente
    // excluyentes, sdd_03 §8.
    const usesTramos = !!adjustmentFrequencyMonths
    const historicalAmounts =
      values.is_in_progress && usesTramos && values.historical_amounts?.length
        ? values.historical_amounts
        : undefined

    createContract.mutate(
      {
        property_id: values.property_id,
        renter_id: values.renter_id,
        currency: values.currency,
        initial_amount: values.initial_amount,
        start_date: values.start_date,
        end_date: values.end_date,
        daily_late_fee_pct: values.daily_late_fee_pct,
        adjustment_frequency_months: adjustmentFrequencyMonths,
        adjustment_index:
          values.currency === 'ARS' && values.adjustment_index
            ? values.adjustment_index
            : undefined,
        adjustment_index_notes:
          values.currency === 'ARS' && values.adjustment_index_notes
            ? values.adjustment_index_notes
            : undefined,
        notes: values.notes || undefined,
        // Issue #50 (espejo de back#100, RN-08/RN-C06): sólo se envían
        // si el toggle "en curso" está activo Y no corresponde el
        // mecanismo de tramos del #57. La fecha se captura como mes
        // ("YYYY-MM") y se normaliza a día 1 acá (el back también
        // normaliza, pero enviarla ya normalizada evita ambigüedad —
        // sdd_03 §8).
        current_amount:
          values.is_in_progress && !usesTramos && values.current_amount
            ? values.current_amount
            : undefined,
        current_amount_since:
          values.is_in_progress && !usesTramos && values.current_amount_since
            ? `${values.current_amount_since}-01`
            : undefined,
        historical_amounts: historicalAmounts,
      },
      {
        onSuccess: () => {
          setIsCreateOpen(false)
          setCreateSuccess('Contrato creado correctamente.')
        },
        // El modal queda abierto en error (CA-03-02: 409 CONTRACT_OVERLAP
        // ofrece un link al contrato en conflicto que el usuario necesita
        // poder ver/clickear sin perder el form).
        onError: (error) => {
          setCreateError(error)
          if (
            error instanceof AdminPropApiError &&
            error.field &&
            (error.code === 'VALIDATION_ERROR' || error.code === 'INVALID_DATE_RANGE')
          ) {
            setCreateFieldError({ field: error.field, message: error.message })
          }
        },
      },
    )
  }

  const properties = propertiesQuery.data?.data ?? []
  const renters = rentersQuery.data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Contratos</h1>
        {canManageContracts ? (
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (open) {
                setCreateError(null)
                setCreateFieldError(null)
              }
            }}
          >
            <DialogTrigger asChild>
              <Button type="button">Nuevo contrato</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo contrato</DialogTitle>
              </DialogHeader>
              <ContractForm
                properties={properties}
                renters={renters}
                errorMessage={null}
                isSubmitting={createContract.isPending}
                onSubmit={handleCreate}
                serverFieldError={createFieldError}
              />
              {createError ? <ContractOverlapError error={createError} /> : null}
            </DialogContent>
          </Dialog>
        ) : null}
      </header>

      {canManageContracts ? (
        <Link
          to="/contracts/adjustments"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Ir a la bandeja de ajustes
        </Link>
      ) : null}

      {createSuccess ? <SuccessBanner message={createSuccess} /> : null}

      <section className="flex flex-col gap-2">
        <Label htmlFor="contracts-expiring-filter">Vencen dentro de (días)</Label>
        <Input
          id="contracts-expiring-filter"
          value={expiringInDays}
          onChange={(event) => setExpiringInDays(event.target.value)}
          placeholder="Ej: 60"
          className="max-w-[160px]"
        />
      </section>

      <section>
        {contractsQuery.isLoading ? <Spinner label="Cargando contratos..." /> : null}
        {contractsQuery.isError ? <ErrorState error={contractsQuery.error} /> : null}
        {contractsQuery.data && contractsQuery.data.data.length === 0 ? (
          <EmptyState title="No hay contratos registrados" />
        ) : null}
        {contractsQuery.data && contractsQuery.data.data.length > 0 ? (
          <ContractsTable contracts={contractsQuery.data.data} />
        ) : null}
      </section>
    </div>
  )
}
