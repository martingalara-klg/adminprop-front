// src/modules/properties/hooks/useServiceAccounts.ts
//
// RF-02 + CA-01-02: todas las cuentas de servicio de la propiedad.
import { useQuery } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'

export function useServiceAccounts(propertyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['properties', 'service-accounts', propertyId],
    queryFn: ({ signal }) => propertiesApi.listServiceAccounts(propertyId!, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!propertyId,
  })
}
