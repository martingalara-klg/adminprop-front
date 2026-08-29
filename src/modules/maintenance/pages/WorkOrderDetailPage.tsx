// src/modules/maintenance/pages/WorkOrderDetailPage.tsx
//
// Ficha del pedido — hilo completo: descripción, fotos, cotizaciones
// (RF-02), aprobación (RF-03), cierre (RF-04), cancelación (RF-05).
// Gate por `work-order:read`. La UI del encargado (permissions:
// work-order:read/quote/close) NO muestra botones de aprobar/cancelar —
// sólo owner/admin (work-order:approve/cancel) los ven.
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import {
  Spinner,
  ErrorState,
  ForbiddenState,
  SuccessBanner,
  Button,
  BackLink,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { formatDate } from '@/shared/utils/format'
import type {
  WorkOrderQuoteCreate,
  WorkOrderCloseRequest,
  WorkOrderCancelRequest,
} from '@/api/maintenance.api'
import type {
  QuoteInput,
  CloseWorkOrderInput,
  CancelWorkOrderInput,
} from '../schemas/maintenance.schema'
import { PAYER_LABELS } from '../schemas/maintenance.schema'

import { WorkOrderStatusBadge } from '../components/WorkOrderStatusBadge'
import { PayerBadge } from '../components/PayerBadge'
import { AttachmentGallery } from '../components/AttachmentGallery'
import { QuoteForm } from '../components/QuoteForm'
import { QuotesList } from '../components/QuotesList'
import { CloseWorkOrderForm } from '../components/CloseWorkOrderForm'
import { CancelWorkOrderAction } from '../components/CancelWorkOrderAction'

import { useWorkOrderDetail } from '../hooks/useWorkOrderDetail'
import { useAddQuote } from '../hooks/useAddQuote'
import { useApproveQuote } from '../hooks/useApproveQuote'
import { useCloseWorkOrder } from '../hooks/useCloseWorkOrder'
import { useCancelWorkOrder } from '../hooks/useCancelWorkOrder'
import { useUploadWorkOrderAttachment } from '../hooks/useUploadWorkOrderAttachment'
import { maintenanceApi } from '@/api/maintenance.api'

export function WorkOrderDetailPage() {
  const { workOrderId } = useParams<{ workOrderId: string }>()
  const canReadWorkOrders = usePermission('work-order:read')
  const canQuote = usePermission('work-order:quote')
  const canApprove = usePermission('work-order:approve')
  const canClose = usePermission('work-order:close')
  const canCancel = usePermission('work-order:cancel')

  const workOrderQuery = useWorkOrderDetail(workOrderId, canReadWorkOrders)
  // NOTA rules-of-hooks: todos los hooks se declaran ANTES de cualquier
  // return condicional (loading/error/forbidden) para que el orden de
  // hooks sea estable entre renders — `useCloseWorkOrder` necesita
  // `property_id` para invalidar el historial de la propiedad (Módulo 1),
  // que sólo existe una vez cargado el detalle; usa '' como placeholder
  // mientras tanto (la mutation nunca se dispara antes de que cargue,
  // el form que la usa está gateado por `workOrderQuery.data`).
  const propertyId = workOrderQuery.data?.data.property_id ?? ''
  const addQuote = useAddQuote(workOrderId ?? '')
  const approveQuote = useApproveQuote(workOrderId ?? '')
  const closeWorkOrder = useCloseWorkOrder(workOrderId ?? '', propertyId)
  const cancelWorkOrder = useCancelWorkOrder(workOrderId ?? '')
  const uploadWorkOrderAttachment = useUploadWorkOrderAttachment(workOrderId ?? '')

  const [quoteFiles, setQuoteFiles] = useState<File[]>([])
  const [quoteError, setQuoteError] = useState<unknown>(null)
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false)
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null)
  const [approvingQuoteId, setApprovingQuoteId] = useState<string | null>(null)
  const [approveError, setApproveError] = useState<unknown>(null)
  const [closeFiles, setCloseFiles] = useState<File[]>([])
  const [closeError, setCloseError] = useState<unknown>(null)
  const [cancelError, setCancelError] = useState<unknown>(null)

  if (!canReadWorkOrders) {
    return (
      <ForbiddenState message="No tenés permiso para ver este pedido. Consultá con el owner de la organización." />
    )
  }

  if (workOrderQuery.isLoading) return <Spinner label="Cargando pedido..." />
  if (workOrderQuery.isError) return <ErrorState error={workOrderQuery.error} />
  if (!workOrderQuery.data) return null

  const workOrder = workOrderQuery.data.data
  const approvedQuote = workOrder.quotes.find((quote) => quote.id === workOrder.approved_quote_id)
  const workOrderAttachments = workOrder.attachments.filter(
    (attachment) => attachment.entity_type === 'work_order',
  )
  const canStillQuote = workOrder.status === 'open'
  const canStillClose = workOrder.status === 'in_progress'
  const canStillCancel = workOrder.status === 'open' || workOrder.status === 'in_progress'

  async function handleAddQuote(values: QuoteInput) {
    setQuoteError(null)
    const payload: WorkOrderQuoteCreate = {
      amount: values.amount,
      description: values.description || undefined,
    }
    addQuote.mutate(payload, {
      onSuccess: async (response) => {
        const quoteId = response.data.id
        for (const file of quoteFiles) {
          try {
            await maintenanceApi.uploadQuoteAttachment(quoteId, file)
          } catch (uploadError) {
            setQuoteError(uploadError)
          }
        }
        setQuoteFiles([])
        await workOrderQuery.refetch()
        setIsQuoteDialogOpen(false)
        setQuoteSuccess('Cotización cargada correctamente.')
      },
      onError: (error) => setQuoteError(error),
    })
  }

  function handleApprove(quoteId: string) {
    setApproveError(null)
    setApprovingQuoteId(quoteId)
    approveQuote.mutate(quoteId, {
      onError: (error) => setApproveError(error),
      onSettled: () => setApprovingQuoteId(null),
    })
  }

  function handleClose(values: CloseWorkOrderInput) {
    setCloseError(null)
    const payload: WorkOrderCloseRequest = {
      final_cost: values.final_cost ? values.final_cost : undefined,
    }
    closeWorkOrder.mutate(payload, {
      onSuccess: async (response) => {
        const closedId = response.data.id
        for (const file of closeFiles) {
          try {
            await maintenanceApi.uploadWorkOrderAttachment(closedId, file)
          } catch (uploadError) {
            setCloseError(uploadError)
          }
        }
        setCloseFiles([])
        workOrderQuery.refetch()
      },
      onError: (error) => setCloseError(error),
    })
  }

  function handleCancel(values: CancelWorkOrderInput) {
    setCancelError(null)
    const payload: WorkOrderCancelRequest = { reason: values.reason }
    cancelWorkOrder.mutate(payload, {
      onError: (error) => setCancelError(error),
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <BackLink to="/maintenance" label="Mantenimiento" />

      <header>
        <h1 className="text-lg font-semibold">{workOrder.property_address}</h1>
        <p className="text-sm text-muted-foreground">{workOrder.title}</p>
        <div className="mt-2 flex gap-2">
          <WorkOrderStatusBadge status={workOrder.status} />
          <PayerBadge payer={workOrder.payer} />
        </div>
      </header>

      {workOrder.description ? (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground">Descripción</h2>
          <p className="text-sm">{workOrder.description}</p>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Fotos del pedido</h2>
        <AttachmentGallery attachments={workOrderAttachments} />
        {canQuote || canClose ? (
          <div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) uploadWorkOrderAttachment.mutate(file)
                event.target.value = ''
              }}
              data-testid="work-order-attachment-input"
            />
          </div>
        ) : null}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Cotizaciones</h2>
          {canQuote && canStillQuote ? (
            <Dialog
              open={isQuoteDialogOpen}
              onOpenChange={(open) => {
                setIsQuoteDialogOpen(open)
                if (open) setQuoteError(null)
              }}
            >
              <DialogTrigger asChild>
                <Button type="button" size="sm">
                  Nueva cotización
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cargar cotización</DialogTitle>
                </DialogHeader>
                <QuoteForm
                  files={quoteFiles}
                  onFilesChange={setQuoteFiles}
                  errorMessage={quoteError ? resolveErrorMessage(quoteError) : null}
                  isSubmitting={addQuote.isPending}
                  onSubmit={handleAddQuote}
                />
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
        {quoteSuccess ? <SuccessBanner message={quoteSuccess} /> : null}
        <QuotesList
          quotes={workOrder.quotes}
          attachments={workOrder.attachments}
          canApprove={canApprove && workOrder.status === 'open'}
          isApproving={approveQuote.isPending}
          approvingQuoteId={approvingQuoteId}
          approveError={approveError ? resolveErrorMessage(approveError) : null}
          onApprove={handleApprove}
        />
      </section>

      {workOrder.status === 'closed' ? (
        <section className="flex flex-col gap-2 rounded-md border p-4">
          <h2 className="text-sm font-medium text-muted-foreground">Cierre</h2>
          <p className="text-sm">Cerrado el {formatDate(workOrder.closed_at)}</p>
          {workOrder.payer === 'agency' ? (
            <p className="text-sm font-medium text-amber-700">
              Costo pendiente de liquidar en la próxima liquidación del propietario.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {PAYER_LABELS.landlord} — sólo queda registrado en el historial de la propiedad.
            </p>
          )}
        </section>
      ) : null}

      {canClose && canStillClose ? (
        <section>
          <CloseWorkOrderForm
            approvedQuoteAmount={approvedQuote?.amount ?? null}
            files={closeFiles}
            onFilesChange={setCloseFiles}
            errorMessage={closeError ? resolveErrorMessage(closeError) : null}
            isSubmitting={closeWorkOrder.isPending}
            onSubmit={handleClose}
          />
        </section>
      ) : null}

      {canCancel && canStillCancel ? (
        <section>
          <CancelWorkOrderAction
            errorMessage={cancelError ? resolveErrorMessage(cancelError) : null}
            isSubmitting={cancelWorkOrder.isPending}
            onConfirm={handleCancel}
          />
        </section>
      ) : null}
    </div>
  )
}
