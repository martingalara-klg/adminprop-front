// src/modules/properties/hooks/useDeleteProperty.ts
//
// RF-01 + CA-01-03: soft delete; `409 ENTITY_HAS_DEPENDENCIES` con
// contrato activo (se maneja en el componente).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'

export function useDeleteProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (propertyId: string) => propertiesApi.remove(propertyId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}
