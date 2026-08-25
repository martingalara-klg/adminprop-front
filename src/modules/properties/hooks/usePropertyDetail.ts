// src/modules/properties/hooks/usePropertyDetail.ts
//
// RF-03 + CA-01-05: ficha consolidada — datos + cuentas de servicio.
import { useQuery } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'

export function usePropertyDetail(propertyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['properties', 'detail', propertyId],
    queryFn: ({ signal }) => propertiesApi.get(propertyId!, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!propertyId,
  })
}
