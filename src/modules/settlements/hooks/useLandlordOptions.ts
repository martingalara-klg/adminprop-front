// src/modules/settlements/hooks/useLandlordOptions.ts
//
// Wizard paso select_period: selector de propietario. Mismo patrón que
// src/modules/payments/hooks/useLandlordOptions.ts (cada módulo trae su
// propio hook de opciones, ver docs/skills/module-structure.md).
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
