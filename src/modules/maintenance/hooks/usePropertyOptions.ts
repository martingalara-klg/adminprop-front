// src/modules/maintenance/hooks/usePropertyOptions.ts
//
// RF-01: selector de propiedad al crear el pedido. Mismo patrón que
// payments/hooks/usePropertyOptions.ts — no duplica el cliente, sólo el
// hook de opciones.
import { useQuery } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'

const PROPERTY_OPTIONS_LIMIT = 100

export function usePropertyOptions(enabled = true) {
  return useQuery({
    queryKey: ['properties', 'list', { limit: PROPERTY_OPTIONS_LIMIT }],
    queryFn: ({ signal }) => propertiesApi.list({ limit: PROPERTY_OPTIONS_LIMIT }, { signal }),
    staleTime: 5 * 60_000,
    enabled,
  })
}
