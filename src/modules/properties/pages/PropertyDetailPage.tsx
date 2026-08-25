// src/modules/properties/pages/PropertyDetailPage.tsx
//
// RF-03 — CA-01-02/03/04/05: ficha consolidada de la propiedad — datos +
// cuentas de servicio + contrato vigente + historial de reparaciones +
// conceptos de cargos recurrentes. Edición y baja (soft delete, con
// 409 ENTITY_HAS_DEPENDENCIES si hay contrato activo) también viven acá.
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, ForbiddenState, ConfirmDeleteButton } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { PropertyUpdate, PropertyServiceAccountCreate } from '@/api/properties.api'
import type { CreateRecurringChargeInput } from '../schemas/property.schema'

import { PropertyEditForm } from '../components/PropertyEditForm'
import { ServiceAccountForm } from '../components/ServiceAccountForm'
import { ServiceAccountsList } from '../components/ServiceAccountsList'
import { PropertyContractSummary } from '../components/PropertyContractSummary'
import { PropertyWorkOrdersHistory } from '../components/PropertyWorkOrdersHistory'
import { PropertyRecurringCharges } from '../components/PropertyRecurringCharges'

import { usePropertyDetail } from '../hooks/usePropertyDetail'
import { useUpdateProperty } from '../hooks/useUpdateProperty'
import { useDeleteProperty } from '../hooks/useDeleteProperty'
import { useLandlordOptions } from '../hooks/useLandlordOptions'
import { useServiceAccounts } from '../hooks/useServiceAccounts'
import { useCreateServiceAccount } from '../hooks/useCreateServiceAccount'
import { useUpdateServiceAccount } from '../hooks/useUpdateServiceAccount'
import { useDeleteServiceAccount } from '../hooks/useDeleteServiceAccount'
import { useActiveContract } from '../hooks/useActiveContract'
import { useRenterName } from '../hooks/useRenterName'
import { usePropertyWorkOrders } from '../hooks/usePropertyWorkOrders'
import { usePropertyRecurringCharges } from '../hooks/usePropertyRecurringCharges'
import { useCreateRecurringCharge } from '../hooks/useCreateRecurringCharge'

export function PropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>()
  const navigate = useNavigate()
  const canReadProperties = usePermission('property:read')
  const canManageProperties = usePermission('property:manage')

  const propertyQuery = usePropertyDetail(propertyId, canReadProperties)
  const landlordsQuery = useLandlordOptions(canReadProperties)
  const serviceAccountsQuery = useServiceAccounts(propertyId, canReadProperties)
  const workOrdersQuery = usePropertyWorkOrders(propertyId, canReadProperties)
  const recurringChargesQuery = usePropertyRecurringCharges(propertyId, canReadProperties)
  const activeContractQuery = useActiveContract(propertyId, canReadProperties)

  const activeContract = activeContractQuery.data?.data[0] ?? null
  const renterQuery = useRenterName(activeContract?.renter_id, canReadProperties)

  const updateProperty = useUpdateProperty()
  const deleteProperty = useDeleteProperty()
  const createServiceAccount = useCreateServiceAccount()
  const updateServiceAccount = useUpdateServiceAccount(propertyId ?? '')
  const deleteServiceAccount = useDeleteServiceAccount(propertyId ?? '')
  const createRecurringCharge = useCreateRecurringCharge(propertyId ?? '')

  const [editError, setEditError] = useState<string | null>(null)
  const [editSaved, setEditSaved] = useState(false)
  const [serviceAccountError, setServiceAccountError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [chargeError, setChargeError] = useState<string | null>(null)

  if (!canReadProperties) {
    return (
      <ForbiddenState message="No tenés permiso para ver esta ficha. Consultá con el owner de la organización." />
    )
  }

  if (propertyQuery.isLoading) return <Spinner label="Cargando propiedad..." />
  if (propertyQuery.isError) {
    return <ErrorState message={resolveErrorMessage(propertyQuery.error)} />
  }
  if (!propertyQuery.data) return null

  const property = propertyQuery.data.data
  const landlords = landlordsQuery.data?.data ?? []
  const serviceAccounts = serviceAccountsQuery.data?.data ?? []
  const workOrders = workOrdersQuery.data?.data ?? []
  const recurringCharges = recurringChargesQuery.data?.data ?? []

  function handleEditSubmit(values: PropertyUpdate) {
    if (!propertyId) return
    setEditError(null)
    setEditSaved(false)
    updateProperty.mutate(
      { propertyId, payload: values },
      {
        onSuccess: () => setEditSaved(true),
        onError: (error) => setEditError(resolveErrorMessage(error)),
      },
    )
  }

  function handleDelete() {
    if (!propertyId) return
    setDeleteError(null)
    deleteProperty.mutate(propertyId, {
      onSuccess: () => navigate('/properties'),
      onError: (error) => setDeleteError(resolveErrorMessage(error)),
    })
  }

  function handleCreateServiceAccount(values: PropertyServiceAccountCreate) {
    if (!propertyId) return
    setServiceAccountError(null)
    createServiceAccount.mutate(
      { propertyId, payload: values },
      { onError: (error) => setServiceAccountError(resolveErrorMessage(error)) },
    )
  }

  function handleUpdateServiceAccount(
    serviceAccountId: string,
    values: { account_number: string; secondary_number: string; notes: string },
  ) {
    setServiceAccountError(null)
    updateServiceAccount.mutate(
      { serviceAccountId, payload: values },
      { onError: (error) => setServiceAccountError(resolveErrorMessage(error)) },
    )
  }

  function handleDeleteServiceAccount(serviceAccountId: string) {
    setServiceAccountError(null)
    deleteServiceAccount.mutate(serviceAccountId, {
      onError: (error) => setServiceAccountError(resolveErrorMessage(error)),
    })
  }

  function handleCreateCharge(values: CreateRecurringChargeInput) {
    setChargeError(null)
    createRecurringCharge.mutate(values, {
      onError: (error) => setChargeError(resolveErrorMessage(error)),
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-lg font-semibold">{property.address}</h1>
      </header>

      {canManageProperties ? (
        <section className="flex flex-col gap-2">
          <PropertyEditForm
            property={property}
            landlords={landlords}
            errorMessage={editError}
            isSubmitting={updateProperty.isPending}
            onSubmit={handleEditSubmit}
          />
          {editSaved ? (
            <p className="text-sm text-muted-foreground">Propiedad actualizada.</p>
          ) : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Cuentas de servicio</h2>
        <ServiceAccountsList
          accounts={serviceAccounts}
          isDeleting={deleteServiceAccount.isPending}
          isUpdating={updateServiceAccount.isPending}
          onUpdate={handleUpdateServiceAccount}
          onDelete={handleDeleteServiceAccount}
        />
        {serviceAccountError ? (
          <p className="text-sm text-destructive" role="alert">
            {serviceAccountError}
          </p>
        ) : null}
        {canManageProperties ? (
          <ServiceAccountForm
            errorMessage={null}
            isSubmitting={createServiceAccount.isPending}
            onSubmit={handleCreateServiceAccount}
          />
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Contrato vigente</h2>
        <PropertyContractSummary
          contract={activeContract}
          renterName={renterQuery.data?.data.name ?? null}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Historial de reparaciones</h2>
        <PropertyWorkOrdersHistory workOrders={workOrders} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Conceptos de cargos recurrentes</h2>
        <PropertyRecurringCharges
          charges={recurringCharges}
          errorMessage={chargeError}
          isSubmitting={createRecurringCharge.isPending}
          onSubmit={handleCreateCharge}
        />
      </section>

      {canManageProperties ? (
        <section>
          <ConfirmDeleteButton
            label="Eliminar propiedad"
            confirmQuestion="¿Eliminar esta propiedad? La baja es lógica: su historial se conserva."
            isSubmitting={deleteProperty.isPending}
            errorMessage={deleteError}
            onConfirm={handleDelete}
          />
        </section>
      ) : null}
    </div>
  )
}
