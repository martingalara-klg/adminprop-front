// src/modules/people/hooks/useRenterDetail.ts
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

export function useRenterDetail(renterId: string | undefined) {
  return useQuery({
    queryKey: ['people', 'renters', 'detail', renterId],
    queryFn: ({ signal }) => peopleApi.getRenter(renterId!, { signal }),
    staleTime: 5 * 60_000,
    enabled: !!renterId,
  })
}
