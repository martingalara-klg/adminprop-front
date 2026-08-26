// src/modules/contracts/hooks/useRenterOptions.ts
//
// RF-02 + CA-03-01: el alta de contrato exige elegir un inquilino
// existente (`renter_id` obligatorio). Reutiliza `peopleApi.listRenters`
// (#9).
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

const RENTER_OPTIONS_LIMIT = 100

export function useRenterOptions(enabled = true) {
  return useQuery({
    queryKey: ['people', 'renters', 'list', { limit: RENTER_OPTIONS_LIMIT }],
    queryFn: ({ signal }) => peopleApi.listRenters({ limit: RENTER_OPTIONS_LIMIT }, { signal }),
    staleTime: 5 * 60_000,
    enabled,
  })
}
