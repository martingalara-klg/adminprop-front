// src/modules/properties/pages/PropertyDetailPage.tsx
//
// RF-03 — CA-01-02/03/04/05: ficha consolidada de la propiedad — datos +
// cuentas de servicio + contrato vigente + historial de reparaciones +
// conceptos de cargos recurrentes. Edición y baja (soft delete, con
// 409 ENTITY_HAS_DEPENDENCIES si hay contrato activo) también viven acá.
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import {
  Spinner,
  ErrorState,
  ForbiddenState,
  ConfirmDeleteButton,
  SuccessBanner,
  Button,
  BackLink,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ContractStatusBadge,
  EditableSection,
} from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import type { PropertyUpdate, PropertyServiceAccountCreate } from '@/api/properties.api'
import type { CreateRecurringChargeInput } from '../schemas/property.schema'

import { PropertyEditForm } from '../components/PropertyEditForm'
import { PropertyReadView } from '../components/PropertyReadView'
import {
  ServiceAccountsList,
  type ServiceAccountRowError,
} from '../components/ServiceAccountsList'
import { PropertyContractSummary } from '../components/PropertyContractSummary'
import { PropertyWorkOrdersHistory } from '../components/PropertyWorkOrdersHistory'
import { PropertyRecurringCharges } from '../components/PropertyRecurringCharges'
import { RecurringChargeForm } from '../components/RecurringChargeForm'

import { usePropertyDetail } from '../hooks/usePropertyDetail'
import { useUpdateProperty } from '../hooks/useUpdateProperty'
import { useDeleteProperty } from '../hooks/useDeleteProperty'
import { useLandlordOptions } from '../hooks/useLandlordOptions'
import { useNeighborhoodsList } from '../hooks/useNeighborhoodsList'
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
  const neighborhoodsQuery = useNeighborhoodsList(canReadProperties)
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
  const [isEditingProperty, setIsEditingProperty] = useState(false)
  const [serviceAccountError, setServiceAccountError] = useState<string | null>(null)
  const [serviceAccountDeleteError, setServiceAccountDeleteError] =
    useState<ServiceAccountRowError>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [chargeError, setChargeError] = useState<string | null>(null)
  const [isChargeDialogOpen, setIsChargeDialogOpen] = useState(false)
  const [chargeSuccess, setChargeSuccess] = useState<string | null>(null)

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
  const neighborhoods = neighborhoodsQuery.data?.data ?? []
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
        onSuccess: () => {
          setEditSaved(true)
          setIsEditingProperty(false)
        },
        onError: (error) => setEditError(resolveErrorMessage(error)),
      },
    )
  }

  function handleEditCancel() {
    setEditError(null)
    setIsEditingProperty(false)
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
    setServiceAccountDeleteError(null)
    deleteServiceAccount.mutate(serviceAccountId, {
      onError: (error) =>
        setServiceAccountDeleteError({ serviceAccountId, message: resolveErrorMessage(error) }),
    })
  }

  function handleCreateCharge(values: CreateRecurringChargeInput) {
    setChargeError(null)
    createRecurringCharge.mutate(values, {
      onSuccess: () => {
        setIsChargeDialogOpen(false)
        setChargeSuccess('Concepto recurrente agregado correctamente.')
      },
      onError: (error) => setChargeError(resolveErrorMessage(error)),
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <BackLink to="/properties" label="Propiedades" />

      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{property.address}</h1>
          <ContractStatusBadge status={property.status} />
        </div>
        {/* issue #99/#49: propiedades legacy preexistentes al catálogo de
            barrios no tienen `neighborhood` embebido — "Sin barrio". */}
        <p className="text-sm text-muted-foreground">
          {property.neighborhood?.name ?? 'Sin barrio'}
        </p>
      </header>

      <EditableSection
        title="Datos de la propiedad"
        permission="property:manage"
        isEditing={isEditingProperty}
        onEdit={() => setIsEditingProperty(true)}
        testId="property-edit-section"
        view={
          <PropertyReadView property={property} landlords={landlords} neighborhoods={neighborhoods} />
        }
      >
        <div className="flex flex-col gap-2">
          <PropertyEditForm
            property={property}
            landlords={landlords}
            neighborhoods={neighborhoods}
            errorMessage={editError}
            isSubmitting={updateProperty.isPending}
            onSubmit={handleEditSubmit}
            onCancel={handleEditCancel}
          />
        </div>
      </EditableSection>
      {editSaved ? (
        <p className="text-sm text-muted-foreground">Propiedad actualizada.</p>
      ) : null}

      <section className="flex flex-col gap-3">
        <ServiceAccountsList
          accounts={serviceAccounts}
          canManage={canManageProperties}
          isCreating={createServiceAccount.isPending}
          isDeleting={deleteServiceAccount.isPending}
          isUpdating={updateServiceAccount.isPending}
          deleteError={serviceAccountDeleteError}
          onCreate={handleCreateServiceAccount}
          onUpdate={handleUpdateServiceAccount}
          onDelete={handleDeleteServiceAccount}
        />
        {serviceAccountError ? (
          <p className="text-sm text-destructive" role="alert">
            {serviceAccountError}
          </p>
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
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">
            Conceptos de cargos recurrentes
          </h2>
          {canManageProperties ? (
            <Dialog
              open={isChargeDialogOpen}
              onOpenChange={(open) => {
                setIsChargeDialogOpen(open)
                if (open) setChargeError(null)
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" size="sm">
                  Nuevo concepto
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nuevo concepto recurrente</DialogTitle>
                </DialogHeader>
                <RecurringChargeForm
                  errorMessage={chargeError}
                  isSubmitting={createRecurringCharge.isPending}
                  onSubmit={handleCreateCharge}
                />
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          Estos conceptos (renta, expensas, municipal, etc.) se verifican todos los meses en el
          checklist de la liquidación y su importe se descuenta al propietario en la rendición —
          la carga del importe mensual se hace desde el módulo de liquidaciones, no acá.
        </p>
        {chargeSuccess ? <SuccessBanner message={chargeSuccess} /> : null}
        <PropertyRecurringCharges charges={recurringCharges} />
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
