// src/modules/payments/hooks/useLandlordOptions.ts
//
// RF-02/RF-06: filtro por propietario en el panel del mes y en la vista
// global de deuda.
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

const LANDLORD_OPTIONS_LIMIT = 100

export function useLandlordOptions(enabled = true) {
  return useQuery({
    queryKey: ['people', 'landlords', 'list', { limit: LANDLORD_OPTIONS_LIMIT }],
    queryFn: ({ signal }) => peopleApi.listLandlords({ limit: LANDLORD_OPTIONS_LIMIT }, { signal }),
    staleTime: 5 * 60_000,
    enabled,
  })
}
