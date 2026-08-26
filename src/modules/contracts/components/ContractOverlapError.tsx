// src/modules/contracts/components/ContractOverlapError.tsx
//
// CA-03-02: `409 CONTRACT_OVERLAP` — el mensaje es-AR del catálogo
// central (error-codes.es-AR.ts) + link directo al contrato en
// conflicto (`error.details.conflicting_contract_id`, sdd_03 §8).
import { Link } from 'react-router-dom'
import { AdminPropApiError } from '@/api/errors'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'

type Props = {
  error: unknown
}

export function ContractOverlapError({ error }: Props) {
  const message = resolveErrorMessage(error)
  const conflictingContractId =
    error instanceof AdminPropApiError && error.code === 'CONTRACT_OVERLAP'
      ? (error.details.conflicting_contract_id as string | undefined)
      : undefined

  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
      {conflictingContractId ? (
        <>
          {' '}
          <Link
            to={`/contracts/${conflictingContractId}`}
            className="underline underline-offset-4"
          >
            Ver contrato en conflicto
          </Link>
        </>
      ) : null}
    </p>
  )
}
