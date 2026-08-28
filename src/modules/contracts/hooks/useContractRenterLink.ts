// src/modules/contracts/hooks/useContractRenterLink.ts
//
// Issue #56 punto 3: la ficha del contrato debe linkear al inquilino
// (nombre + link a `/people/renters/:id`). Reutiliza `peopleApi.getRenter`
// (#9) — mismo criterio que `useContractPropertyLink`. Gateado por
// `renter:read`.
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

export function useContractRenterLink(renterId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['people', 'renters', 'detail', renterId],
    queryFn: ({ signal }) => peopleApi.getRenter(renterId as string, { signal }),
    staleTime: 5 * 60_000,
    enabled: enabled && !!renterId,
  })
}
