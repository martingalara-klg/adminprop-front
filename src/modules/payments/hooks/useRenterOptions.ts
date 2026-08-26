// src/modules/payments/hooks/useRenterOptions.ts
//
// RF-02/RF-06: filtro por inquilino en el panel del mes y en la vista
// global de deuda.
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
