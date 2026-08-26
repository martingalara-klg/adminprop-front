// src/modules/settlements/hooks/useSettlementsList.ts
//
// RF-01: listado filtrable por período/propietario/estado.
import { useQuery } from '@tanstack/react-query'
import { settlementsApi, type SettlementListFilters } from '@/api/settlements.api'

export function useSettlementsList(filters: SettlementListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['settlements', 'list', filters],
    queryFn: ({ signal }) => settlementsApi.list(filters, { signal }),
    staleTime: 60_000,
    enabled,
  })
}
