// src/modules/payments/hooks/useRentPeriodDetail.ts
//
// RF-02: detalle de un período del panel (ficha para registrar el cobro).
import { useQuery } from '@tanstack/react-query'
import { paymentsApi } from '@/api/payments.api'

export function useRentPeriodDetail(rentPeriodId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['payments', 'rent-periods', 'detail', rentPeriodId],
    queryFn: ({ signal }) => paymentsApi.getRentPeriod(rentPeriodId!, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!rentPeriodId,
  })
}
