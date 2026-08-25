// src/modules/properties/hooks/useUpdateServiceAccount.ts
//
// RF-02: `service_type` no editable — solo número(s) y notas.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi, type PropertyServiceAccountUpdate } from '@/api/properties.api'

export function useUpdateServiceAccount(propertyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      serviceAccountId,
      payload,
    }: {
      serviceAccountId: string
      payload: PropertyServiceAccountUpdate
    }) => propertiesApi.updateServiceAccount(serviceAccountId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'service-accounts', propertyId] })
      queryClient.invalidateQueries({ queryKey: ['properties', 'detail', propertyId] })
    },
  })
}
