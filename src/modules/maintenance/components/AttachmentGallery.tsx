// src/modules/maintenance/components/AttachmentGallery.tsx
//
// RF-01/RF-02/RF-04: galería de fotos de un pedido/cotización/cierre —
// RN-05, mismo endpoint de descarga para las tres fases.
import { AttachmentThumbnail } from './AttachmentThumbnail'
import type { AttachmentSummary } from '@/api/maintenance.api'

type Props = { attachments: AttachmentSummary[]; emptyLabel?: string }

export function AttachmentGallery({ attachments, emptyLabel = 'Sin fotos' }: Props) {
  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <div className="flex flex-wrap gap-2" data-testid="attachment-gallery">
      {attachments.map((attachment) => (
        <AttachmentThumbnail key={attachment.id} attachment={attachment} />
      ))}
    </div>
  )
}
