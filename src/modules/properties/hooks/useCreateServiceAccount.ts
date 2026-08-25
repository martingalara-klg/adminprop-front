// src/modules/properties/hooks/useCreateServiceAccount.ts
//
// RF-02 + CA-01-02: carga de cuenta de servicio.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi, type PropertyServiceAccountCreate } from '@/api/properties.api'

export function useCreateServiceAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      propertyId,
      payload,
    }: {
      propertyId: string
      payload: PropertyServiceAccountCreate
    }) => propertiesApi.createServiceAccount(propertyId, payload),
    retry: 0,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['properties', 'service-accounts', variables.propertyId],
      })
      queryClient.invalidateQueries({ queryKey: ['properties', 'detail', variables.propertyId] })
    },
  })
}
