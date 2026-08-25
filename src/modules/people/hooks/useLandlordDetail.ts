// src/modules/people/hooks/useLandlordDetail.ts
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

export function useLandlordDetail(landlordId: string | undefined) {
  return useQuery({
    queryKey: ['people', 'landlords', 'detail', landlordId],
    queryFn: ({ signal }) => peopleApi.getLandlord(landlordId!, { signal }),
    staleTime: 5 * 60_000,
    enabled: !!landlordId,
  })
}
