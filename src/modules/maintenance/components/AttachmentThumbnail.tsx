// src/modules/maintenance/components/AttachmentThumbnail.tsx
//
// RN-05: adjunto individual — imagen si es jpg/png/webp (blob URL vía
// useAttachmentImage), enlace de descarga si es PDF u otro. NUNCA
// `<img src={downloadUrl}>` directo (la cookie HttpOnly no viaja de
// forma confiable en un <img> cross-context) — ver docs/skills/api-client.md.
import { useAttachmentImage } from '@/shared/hooks/useAttachmentImage'
import type { AttachmentSummary } from '@/api/maintenance.api'

type Props = { attachment: AttachmentSummary }

export function AttachmentThumbnail({ attachment }: Props) {
  const isImage = attachment.mime_type.startsWith('image/')
  const { objectUrl, isLoading, isError } = useAttachmentImage(isImage ? attachment.id : null)

  if (!isImage) {
    return (
      <a
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        href={objectUrl ?? undefined}
        download={attachment.file_name}
        data-testid="attachment-non-image"
      >
        {attachment.file_name}
      </a>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-md border text-xs text-muted-foreground">
        Cargando…
      </div>
    )
  }

  if (isError || !objectUrl) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded-md border text-xs text-destructive">
        Error
      </div>
    )
  }

  return (
    <img
      src={objectUrl}
      alt={attachment.file_name}
      className="h-20 w-20 rounded-md border object-cover"
      data-testid="attachment-image"
    />
  )
}
