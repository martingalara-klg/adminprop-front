// src/modules/properties/hooks/usePropertyWorkOrders.ts
//
// RF-03 + CA-01-05 (UC-16): historial de reparaciones de la propiedad.
import { useQuery } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'

export function usePropertyWorkOrders(propertyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['properties', 'work-orders', propertyId],
    queryFn: ({ signal }) => propertiesApi.getWorkOrderHistory(propertyId!, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!propertyId,
  })
}
