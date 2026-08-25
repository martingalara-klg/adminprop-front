// src/modules/people/hooks/useUpdateLandlord.ts
//
// RF-01 + CA-02-02/03: si el payload incluye `commission_pct`, el actor
// necesita `landlord:set-commission` (solo owner) — el backend responde
// 403 FORBIDDEN sin él aunque tenga `landlord:manage`. Este hook no
// decide permisos: solo invalida caché tras la mutación.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { peopleApi, type LandlordUpdate } from '@/api/people.api'

export function useUpdateLandlord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ landlordId, payload }: { landlordId: string; payload: LandlordUpdate }) =>
      peopleApi.updateLandlord(landlordId, payload),
    retry: 0,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['people', 'landlords', 'list'] })
      queryClient.invalidateQueries({
        queryKey: ['people', 'landlords', 'detail', variables.landlordId],
      })
    },
  })
}
