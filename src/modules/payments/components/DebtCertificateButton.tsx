// src/modules/payments/components/DebtCertificateButton.tsx
//
// RF-08 — CA-04-11/12: descarga (Fetch + Blob) del certificado de libre
// deuda. Con deuda, el backend responde `422 RENTER_HAS_DEBT` con el
// detalle de lo adeudado en `error.details` — se muestra inline en vez
// de un mensaje genérico (docs/skills/error-handling.md).
import { useState } from 'react'
import { Button } from '@/shared/components'
import { AdminPropApiError } from '@/api/errors'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { paymentsApi } from '@/api/payments.api'

type Props = { renterId: string }

export function DebtCertificateButton({ renterId }: Props) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [debtDetails, setDebtDetails] = useState<Record<string, unknown> | null>(null)

  async function handleDownload() {
    setErrorMessage(null)
    setDebtDetails(null)
    setIsDownloading(true)
    try {
      await paymentsApi.downloadDebtCertificate(renterId)
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error))
      if (error instanceof AdminPropApiError && error.code === 'RENTER_HAS_DEBT') {
        setDebtDetails(error.details)
      }
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" disabled={isDownloading} onClick={handleDownload}>
        {isDownloading ? 'Generando…' : 'Descargar certificado de libre deuda'}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {debtDetails ? (
        <pre
          className="whitespace-pre-wrap rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs"
          data-testid="debt-certificate-details"
        >
          {JSON.stringify(debtDetails, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}
