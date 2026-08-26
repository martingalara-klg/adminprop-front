// src/modules/payments/hooks/useDebtList.ts
//
// RF-06 + CA-04-09: estado de deuda global, filtrable por propietario,
// inquilino y antigüedad (`min_days`).
import { useQuery } from '@tanstack/react-query'
import { paymentsApi, type DebtListFilters } from '@/api/payments.api'

export function useDebtList(filters: DebtListFilters = {}, enabled = true) {
  return useQuery({
    queryKey: ['payments', 'debt', 'list', filters],
    queryFn: ({ signal }) => paymentsApi.listDebt(filters, { signal }),
    staleTime: 60_000,
    enabled,
  })
}
