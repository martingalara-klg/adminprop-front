// src/modules/contracts/hooks/useContractsList.ts
//
// RF-01 + RF-05: listado con filtros (estado, propiedad, inquilino,
// moneda, `expiring_in_days`).
import { useQuery } from '@tanstack/react-query'
import { contractsApi, type ContractListFilters } from '@/api/contracts.api'

export function useContractsList(filters: ContractListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['contracts', 'list', filters],
    queryFn: ({ signal }) => contractsApi.list(filters, { signal }),
    staleTime: 5 * 60_000, // sdd_04 §1.4 — listados: 5 min
    enabled,
  })
}
