// src/modules/properties/hooks/useCreateProperty.ts
//
// RF-01 + CA-01-01: alta de propiedad.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi, type PropertyCreate } from '@/api/properties.api'

export function useCreateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: PropertyCreate) => propertiesApi.create(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}
