// src/modules/properties/hooks/useCreateRecurringCharge.ts
//
// spec_module_05 §RF-05: alta de concepto recurrente por propiedad.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { propertiesApi, type RecurringChargeCreate } from '@/api/properties.api'

export function useCreateRecurringCharge(propertyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: RecurringChargeCreate) =>
      propertiesApi.createRecurringCharge(propertyId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', 'recurring-charges', propertyId] })
    },
  })
}
