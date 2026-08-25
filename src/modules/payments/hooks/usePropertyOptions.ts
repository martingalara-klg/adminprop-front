// src/modules/payments/hooks/usePropertyOptions.ts
//
// RF-02: filtro del panel por propiedad. Mismo patrón que
// contracts/hooks/usePropertyOptions.ts (#11) — no duplica el cliente,
// sólo el hook de opciones.
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
