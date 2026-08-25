// src/modules/properties/hooks/usePropertyRecurringCharges.ts
//
// RF-03 + CA-01-05: conceptos de cargos recurrentes activos de la propiedad.
import { useQuery } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'

export function usePropertyRecurringCharges(propertyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['properties', 'recurring-charges', propertyId],
    queryFn: ({ signal }) => propertiesApi.listRecurringCharges(propertyId!, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!propertyId,
  })
}
