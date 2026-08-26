// src/modules/maintenance/pages/WorkOrderCreatePage.tsx
//
// RF-01/CA-06-01: alta del pedido (owner/admin) con pagador y fotos.
// El backend acepta fotos sólo tras crear el pedido (necesita el id),
// así que el flujo es: 1) crear el work order, 2) subir cada foto
// seleccionada en secuencia contra ese id, 3) navegar al detalle. Si
// alguna foto falla, se informa pero no se revierte el pedido creado —
// el usuario puede reintentar la foto desde el detalle.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { ForbiddenState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { maintenanceApi, type WorkOrderCreate } from '@/api/maintenance.api'
import type { CreateWorkOrderInput } from '../schemas/maintenance.schema'

import { WorkOrderCreateForm } from '../components/WorkOrderCreateForm'
import { usePropertyOptions } from '../hooks/usePropertyOptions'
import { useCreateWorkOrder } from '../hooks/useCreateWorkOrder'

export function WorkOrderCreatePage() {
  const navigate = useNavigate()
  const canReadWorkOrders = usePermission('work-order:read')
  const canCreateWorkOrders = usePermission('work-order:create')

  const propertiesQuery = usePropertyOptions(canReadWorkOrders && canCreateWorkOrders)
  const createWorkOrder = useCreateWorkOrder()

  const [files, setFiles] = useState<File[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)

  if (!canReadWorkOrders || !canCreateWorkOrders) {
    return (
      <ForbiddenState message="No tenés permiso para crear pedidos de reparación. Consultá con el owner de la organización." />
    )
  }

  async function handleSubmit(values: CreateWorkOrderInput) {
    setErrorMessage(null)
    const payload: WorkOrderCreate = {
      property_id: values.property_id,
      title: values.title,
      description: values.description || undefined,
      payer: values.payer,
    }

    createWorkOrder.mutate(payload, {
      onSuccess: async (response) => {
        const workOrderId = response.data.id
        if (files.length > 0) {
          setIsUploadingPhotos(true)
          for (const file of files) {
            try {
              await maintenanceApi.uploadWorkOrderAttachment(workOrderId, file)
            } catch (uploadError) {
              setErrorMessage(
                `El pedido se creó, pero una foto no se pudo subir: ${resolveErrorMessage(uploadError)}`,
              )
            }
          }
          setIsUploadingPhotos(false)
        }
        navigate(`/maintenance/${workOrderId}`)
      },
      onError: (error) => setErrorMessage(resolveErrorMessage(error)),
    })
  }

  const properties = propertiesQuery.data?.data ?? []
  const isSubmitting = createWorkOrder.isPending || isUploadingPhotos

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold">Nuevo pedido de reparación</h1>
      </header>

      <WorkOrderCreateForm
        properties={properties}
        files={files}
        onFilesChange={setFiles}
        errorMessage={errorMessage}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
