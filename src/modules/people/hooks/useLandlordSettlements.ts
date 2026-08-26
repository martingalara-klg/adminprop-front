// src/modules/people/hooks/useLandlordSettlements.ts
//
// CA-05-07 (issue #14): historial de liquidaciones desde la ficha del
// propietario — GET /landlords/:id/settlements.
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

export function useLandlordSettlements(landlordId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['people', 'landlords', 'detail', landlordId, 'settlements'],
    queryFn: ({ signal }) => peopleApi.getLandlordSettlements(landlordId!, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!landlordId,
  })
}
