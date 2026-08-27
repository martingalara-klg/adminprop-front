// src/modules/maintenance/pages/MaintenanceListPage.tsx
//
// CA-06-01: primera pantalla que el encargado usa a diario — listado
// con la dirección de la propiedad, filtrable por estado/propiedad.
// Gate por `work-order:read` (todos los roles con acceso al módulo lo
// tienen — owner/admin/maintenance). El alta sólo la ofrece a quien
// tiene `work-order:create` (owner/admin — RN-A01, el encargado NO crea
// pedidos).
//
// Issue #48: el alta vivía en una página separada (`/maintenance/new`,
// con navegación al detalle al terminar). Ahora es un modal sobre este
// listado — mismo flujo (crear pedido, subir fotos en secuencia contra
// el id recién creado), pero al terminar cierra el modal, refresca el
// listado (la mutation ya invalida `['work-orders', 'list']`) y muestra
// feedback en vez de navegar.
import { useState } from 'react'
import { usePermission } from '@/shared/auth/usePermission'
import {
  Button,
  Spinner,
  ErrorState,
  EmptyState,
  ForbiddenState,
  SuccessBanner,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import {
  maintenanceApi,
  type WorkOrderListFilters,
  type WorkOrderCreate,
} from '@/api/maintenance.api'
import type { CreateWorkOrderInput } from '../schemas/maintenance.schema'

import { WorkOrdersFilters } from '../components/WorkOrdersFilters'
import { WorkOrdersTable } from '../components/WorkOrdersTable'
import { WorkOrderCreateForm } from '../components/WorkOrderCreateForm'
import { useWorkOrdersList } from '../hooks/useWorkOrdersList'
import { usePropertyOptions } from '../hooks/usePropertyOptions'
import { useCreateWorkOrder } from '../hooks/useCreateWorkOrder'

export function MaintenanceListPage() {
  const canReadWorkOrders = usePermission('work-order:read')
  const canCreateWorkOrders = usePermission('work-order:create')

  const [filters, setFilters] = useState<WorkOrderListFilters>({})

  const workOrdersQuery = useWorkOrdersList(filters, canReadWorkOrders)
  const propertiesQuery = usePropertyOptions(canReadWorkOrders && canCreateWorkOrders)
  const createWorkOrder = useCreateWorkOrder()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createFiles, setCreateFiles] = useState<File[]>([])
  const [createError, setCreateError] = useState<string | null>(null)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [createSuccess, setCreateSuccess] = useState<string | null>(null)

  if (!canReadWorkOrders) {
    return (
      <ForbiddenState message="No tenés permiso para ver mantenimiento. Consultá con el owner de la organización." />
    )
  }

  function handleFilterChange(patch: Partial<WorkOrderListFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  function handleCreate(values: CreateWorkOrderInput) {
    setCreateError(null)
    const payload: WorkOrderCreate = {
      property_id: values.property_id,
      title: values.title,
      description: values.description || undefined,
      payer: values.payer,
    }

    createWorkOrder.mutate(payload, {
      onSuccess: async (response) => {
        const workOrderId = response.data.id
        if (createFiles.length > 0) {
          setIsUploadingPhotos(true)
          for (const file of createFiles) {
            try {
              await maintenanceApi.uploadWorkOrderAttachment(workOrderId, file)
            } catch (uploadError) {
              setCreateError(
                `El pedido se creó, pero una foto no se pudo subir: ${resolveErrorMessage(uploadError)}`,
              )
            }
          }
          setIsUploadingPhotos(false)
        }
        setCreateFiles([])
        setIsCreateOpen(false)
        setCreateSuccess('Pedido de reparación creado correctamente.')
      },
      onError: (error) => setCreateError(resolveErrorMessage(error)),
    })
  }

  const properties = propertiesQuery.data?.data ?? []
  const isCreateSubmitting = createWorkOrder.isPending || isUploadingPhotos

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Mantenimiento — Pedidos de reparación</h1>
        {canCreateWorkOrders ? (
          <Dialog
            open={isCreateOpen}
            onOpenChange={(open) => {
              setIsCreateOpen(open)
              if (open) setCreateError(null)
            }}
          >
            <DialogTrigger asChild>
              <Button type="button">Nuevo pedido</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo pedido de reparación</DialogTitle>
              </DialogHeader>
              <WorkOrderCreateForm
                properties={properties}
                files={createFiles}
                onFilesChange={setCreateFiles}
                errorMessage={createError}
                isSubmitting={isCreateSubmitting}
                onSubmit={handleCreate}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </header>

      {createSuccess ? <SuccessBanner message={createSuccess} /> : null}

      <section>
        <WorkOrdersFilters value={filters} properties={properties} onChange={handleFilterChange} />
      </section>

      <section>
        {workOrdersQuery.isLoading ? <Spinner label="Cargando pedidos..." /> : null}
        {workOrdersQuery.isError ? <ErrorState error={workOrdersQuery.error} /> : null}
        {workOrdersQuery.data && workOrdersQuery.data.data.length === 0 ? (
          <EmptyState
            title="No hay pedidos de reparación"
            description="Todavía no se cargó ningún pedido para los filtros aplicados."
          />
        ) : null}
        {workOrdersQuery.data && workOrdersQuery.data.data.length > 0 ? (
          <WorkOrdersTable workOrders={workOrdersQuery.data.data} />
        ) : null}
      </section>
    </div>
  )
}
