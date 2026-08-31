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
//
// Issue #70 punto 1 (feedback #3 del PO): el detalle de la deuda ya NO se
// muestra como JSON crudo — `buildContractDebtMessage` arma un mensaje
// legible es-AR desde `error.details` (nada de bloques de código en la UI).
import { useState } from 'react'
import { Button } from '@/shared/components'
import { AdminPropApiError } from '@/api/errors'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { contractsApi } from '@/api/contracts.api'
import { buildContractDebtMessage } from '../utils/debtMessage'

type Props = { contractId: string }

export function ContractDebtCertificateButton({ contractId }: Props) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleDownload() {
    setErrorMessage(null)
    setIsDownloading(true)
    try {
      await contractsApi.downloadDebtCertificate(contractId)
    } catch (error) {
      if (error instanceof AdminPropApiError && error.code === 'CONTRACT_HAS_DEBT') {
        setErrorMessage(buildContractDebtMessage(error.details))
      } else {
        setErrorMessage(resolveErrorMessage(error))
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
        <p
          className="text-sm text-destructive"
          role="alert"
          data-testid="contract-debt-certificate-details"
        >
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}
