// src/shared/hooks/useAttachmentImage.ts
//
// `GET /attachments/:id/download` está protegido por la cookie HttpOnly
// (RN-05: hereda permisos de la entidad padre) — un `<img src={url}>`
// directo no manda la cookie de forma confiable entre orígenes distintos
// y además es exactamente el patrón `window.open`/`<a href>` sin fetch
// que docs/skills/api-client.md prohíbe para descargas. Este hook hace
// fetch + blob y expone un `object URL` para usar en `<img src>`, con
// cleanup (`revokeObjectURL`) al desmontar o cambiar de adjunto.
//
// Reutilizable por cualquier módulo que necesite previsualizar un
// adjunto (mantenimiento hoy — cotizaciones/liquidaciones a futuro).
import { useEffect, useState } from 'react'
import { attachmentDownloadUrl } from '@/api/maintenance.api'

type AttachmentImageState = {
  objectUrl: string | null
  isLoading: boolean
  isError: boolean
}

export function useAttachmentImage(attachmentId: string | null | undefined): AttachmentImageState {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    if (!attachmentId) {
      setObjectUrl(null)
      return
    }

    let cancelled = false
    let currentObjectUrl: string | null = null
    setIsLoading(true)
    setIsError(false)

    fetch(attachmentDownloadUrl(attachmentId), { credentials: 'include' })
      .then((response) => {
        if (!response.ok) throw new Error(`Download failed: ${response.status}`)
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        currentObjectUrl = URL.createObjectURL(blob)
        setObjectUrl(currentObjectUrl)
      })
      .catch(() => {
        if (!cancelled) setIsError(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
      if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl)
    }
  }, [attachmentId])

  return { objectUrl, isLoading, isError }
}
