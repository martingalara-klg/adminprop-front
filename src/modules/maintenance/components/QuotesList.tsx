// src/modules/maintenance/components/QuotesList.tsx
//
// RF-02/CA-06-02: "todas quedan visibles con autor y fecha".
// RF-03/CA-06-03: owner/admin aprueban UNA cotización — la aprobada
// queda marcada, las demás discarded (lo refleja `quote.status`, que ya
// viene resuelto del backend tras invalidar el detalle). El botón de
// aprobar sólo se ofrece sobre cotizaciones `submitted` de un pedido
// `open` (aprobar sobre una ya-aprobada es exactamente el escenario
// 409 QUOTE_ALREADY_APPROVED que la page maneja al reintentar).
import { Button } from '@/shared/components'
import { AttachmentGallery } from './AttachmentGallery'
import { formatMoney, formatDate } from '@/shared/utils/format'
import { QUOTE_STATUS_LABELS } from '../schemas/maintenance.schema'
import type { WorkOrderQuoteSummary, AttachmentSummary } from '@/api/maintenance.api'

type Props = {
  quotes: WorkOrderQuoteSummary[]
  attachments: AttachmentSummary[]
  canApprove: boolean
  isApproving: boolean
  approvingQuoteId: string | null
  approveError: string | null
  onApprove: (quoteId: string) => void
}

export function QuotesList({
  quotes,
  attachments,
  canApprove,
  isApproving,
  approvingQuoteId,
  approveError,
  onApprove,
}: Props) {
  if (quotes.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay cotizaciones cargadas.</p>
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="quotes-list">
      {quotes.map((quote) => {
        const quoteAttachments = attachments.filter(
          (attachment) => attachment.entity_type === 'quote' && attachment.entity_id === quote.id,
        )
        const isThisApproving = isApproving && approvingQuoteId === quote.id

        return (
          <li key={quote.id} className="flex flex-col gap-2 rounded-md border p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{formatMoney(quote.amount)}</span>
              <span className="text-xs text-muted-foreground">
                {QUOTE_STATUS_LABELS[quote.status] ?? quote.status} · {formatDate(quote.created_at)}
              </span>
            </div>
            {quote.description ? (
              <p className="text-sm text-muted-foreground">{quote.description}</p>
            ) : null}
            <AttachmentGallery attachments={quoteAttachments} emptyLabel="Sin fotos" />
            {canApprove && quote.status === 'submitted' ? (
              <div>
                <Button type="button" disabled={isApproving} onClick={() => onApprove(quote.id)}>
                  {isThisApproving ? 'Aprobando…' : 'Aprobar cotización'}
                </Button>
              </div>
            ) : null}
          </li>
        )
      })}
      {approveError ? (
        <p className="text-sm text-destructive" role="alert">
          {approveError}
        </p>
      ) : null}
    </ul>
  )
}
