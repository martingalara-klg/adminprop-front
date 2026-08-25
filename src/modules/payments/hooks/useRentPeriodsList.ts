// src/modules/payments/hooks/useRentPeriodsList.ts
//
// RF-02: panel de cobranzas del mes — filtros de estado, en mora,
// propiedad, propietario, inquilino.
import { useQuery } from '@tanstack/react-query'
import { paymentsApi, type RentPeriodListFilters } from '@/api/payments.api'

export function useRentPeriodsList(filters: RentPeriodListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['payments', 'rent-periods', 'list', filters],
    queryFn: ({ signal }) => paymentsApi.listRentPeriods(filters, { signal }),
    staleTime: 60_000, // sdd_04 §1.4 — valores derivados (mora/interés) varían con el día
    enabled,
  })
}
