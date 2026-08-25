// src/modules/properties/hooks/useDeleteServiceAccount.ts
//
// RF-02: baja lógica de la cuenta de servicio.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'

export function useDeleteServiceAccount(propertyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (serviceAccountId: string) => propertiesApi.deleteServiceAccount(serviceAccountId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'service-accounts', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties', 'detail', propertyId] })
    },
  })
}
