// src/modules/properties/hooks/useActiveContract.ts
//
// RF-03 + CA-01-05: contrato vigente de la propiedad (si existe) para la
// ficha consolidada. `contract:read` requerido — si el actor no lo
// tiene, el hook no dispara (mismo criterio que el resto de la ficha).
import { useQuery } from '@tanstack/react-query'
import { contractsApi } from '@/api/contracts.api'

export function useActiveContract(propertyId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['properties', 'active-contract', propertyId],
    queryFn: ({ signal }) =>
      contractsApi.list({ property_id: propertyId!, status: 'active', limit: 1 }, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!propertyId,
  })
}
