// src/modules/contracts/hooks/useContractPropertyLink.ts
//
// Issue #56 punto 3: la ficha del contrato debe linkear a la propiedad
// (dirección + link a `/properties/:id`). Reutiliza `propertiesApi.get`
// (#10) — mismo criterio que `usePropertyOptions`: no duplicar el
// cliente HTTP, sólo el hook de lectura puntual. Gateado por
// `property:read` — si el usuario no tiene el permiso, no dispara el
// request (la ficha muestra el id crudo sin link, ver ContractDetailPage).
import { useQuery } from '@tanstack/react-query'
import { propertiesApi } from '@/api/properties.api'

export function useContractPropertyLink(propertyId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['properties', 'detail', propertyId],
    queryFn: ({ signal }) => propertiesApi.get(propertyId as string, { signal }),
    staleTime: 5 * 60_000,
    enabled: enabled && !!propertyId,
  })
}
