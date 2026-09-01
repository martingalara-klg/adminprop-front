// src/modules/properties/hooks/useDeleteProperty.ts
//
// RF-01 + CA-01-03: soft delete; `422 ENTITY_HAS_ACTIVE_CONTRACT` con
// contrato activo (issue #86/back#124 — reemplaza el 409
// ENTITY_HAS_DEPENDENCIES de este caso; se maneja en el componente).
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
