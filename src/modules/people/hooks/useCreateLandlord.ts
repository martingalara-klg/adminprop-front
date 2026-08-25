// src/modules/people/hooks/useCreateLandlord.ts
//
// RF-01 + CA-02-01: crea un propietario con `commission_pct` obligatorio.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { peopleApi, type LandlordCreate } from '@/api/people.api'

export function useCreateLandlord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: LandlordCreate) => peopleApi.createLandlord(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people', 'landlords'] })
    },
  })
}
