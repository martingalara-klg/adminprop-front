// src/modules/contracts/components/ContractDebtCertificateButton.tsx
//
// Issue #56 punto 5 (espejo del back#104, decisión #123): descarga
// (Fetch + Blob) del certificado de libre deuda DEL CONTRATO. Reemplaza
// al viejo botón de la ficha del inquilino (`DebtCertificateButton` en
// `modules/payments`, eliminado — su endpoint `POST
// /renters/:id/debt-certificate` ya no existe). Con deuda, el backend
// responde `422 CONTRACT_HAS_DEBT` con el detalle en `error.details` —
// se muestra inline (docs/skills/error-handling.md), nunca un mensaje
// genérico.
import { useState } from 'react'
import { Button } from '@/shared/components'
import { AdminPropApiError } from '@/api/errors'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { contractsApi } from '@/api/contracts.api'

type Props = { contractId: string }

export function ContractDebtCertificateButton({ contractId }: Props) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [debtDetails, setDebtDetails] = useState<Record<string, unknown> | null>(null)

  async function handleDownload() {
    setErrorMessage(null)
    setDebtDetails(null)
    setIsDownloading(true)
    try {
      await contractsApi.downloadDebtCertificate(contractId)
    } catch (error) {
      setErrorMessage(resolveErrorMessage(error))
      if (error instanceof AdminPropApiError && error.code === 'CONTRACT_HAS_DEBT') {
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
          data-testid="contract-debt-certificate-details"
        >
          {JSON.stringify(debtDetails, null, 2)}
        </pre>
      ) : null}
    </div>
  )
}
