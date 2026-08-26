// src/modules/settlements/components/SettlementExportButtons.tsx
//
// RF-03: descarga de exports Excel/PDF ya generados por el
// documents_worker — Fetch + Blob, nunca window.open (docs/skills/
// api-client.md §"Descarga de archivos"). Mismo patrón que
// PaymentHistoryRow/DebtCertificateButton (estado local de descarga).
import { useState } from 'react'
import { Button } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { settlementsApi } from '@/api/settlements.api'

type Props = { settlementId: string }

export function SettlementExportButtons({ settlementId }: Props) {
  const [downloadingFormat, setDownloadingFormat] = useState<'xlsx' | 'pdf' | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleDownload(format: 'xlsx' | 'pdf') {
    setErrorMessage(null)
    setDownloadingFormat(format)
    try {
      await settlementsApi.downloadExport(settlementId, format)
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error))
    } finally {
      setDownloadingFormat(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={downloadingFormat !== null}
          onClick={() => handleDownload('xlsx')}
        >
          {downloadingFormat === 'xlsx' ? 'Descargando…' : 'Descargar Excel'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={downloadingFormat !== null}
          onClick={() => handleDownload('pdf')}
        >
          {downloadingFormat === 'pdf' ? 'Descargando…' : 'Descargar PDF'}
        </Button>
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
