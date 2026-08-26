// src/modules/settlements/hooks/usePropertyOptions.ts
//
// Checklist de cargos: mapa property_id → dirección para las filas del
// checklist. Mismo patrón que payments/hooks/usePropertyOptions.ts.
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
