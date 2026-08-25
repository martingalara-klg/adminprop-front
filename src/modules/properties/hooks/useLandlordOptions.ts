// src/modules/properties/hooks/useLandlordOptions.ts
//
// RF-01 + CA-01-01: el alta/edición de una propiedad exige elegir un
// propietario existente (`landlord_id` obligatorio, FK a `landlords`).
// Reutiliza `peopleApi.listLandlords` (#9) — mismo queryKey que
// `useLandlordsList` para compartir caché entre módulos.
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

const LANDLORD_OPTIONS_LIMIT = 100

export function useLandlordOptions(enabled = true) {
  return useQuery({
    queryKey: ['people', 'landlords', 'list', { limit: LANDLORD_OPTIONS_LIMIT }],
    queryFn: ({ signal }) =>
      peopleApi.listLandlords({ limit: LANDLORD_OPTIONS_LIMIT }, { signal }),
    staleTime: 5 * 60_000,
    enabled,
  })
}
