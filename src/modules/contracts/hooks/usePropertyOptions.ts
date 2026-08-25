// src/modules/contracts/hooks/usePropertyOptions.ts
//
// RF-02 + CA-03-01: el alta de contrato exige elegir una propiedad
// existente (`property_id` obligatorio). Reutiliza `propertiesApi.list`
// (#10) — mismo criterio que `useLandlordOptions` en el módulo
// Propiedades: no duplicar el cliente, sólo el hook de opciones.
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
