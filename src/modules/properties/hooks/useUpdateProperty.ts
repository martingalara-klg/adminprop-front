// src/modules/properties/hooks/useUpdateProperty.ts
//
// RF-01: edición parcial de la propiedad (todos los campos salvo
// `status="rented"`, derivado — RF-04).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi, type PropertyUpdate } from '@/api/properties.api'

export function useUpdateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ propertyId, payload }: { propertyId: string; payload: PropertyUpdate }) =>
      propertiesApi.update(propertyId, payload),
    retry: 0,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['properties', 'detail', variables.propertyId] })
    },
  })
}
