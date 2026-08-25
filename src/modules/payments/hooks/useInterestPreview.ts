// src/modules/payments/hooks/useInterestPreview.ts
//
// RF-04 + CA-04-05: al elegir la fecha de pago en el form de cobro, se
// consulta el interés SUGERIDO a esa fecha (RN-P02/P03) — el operador
// después imputa libremente el interés cobrado.
import { useQuery } from '@tanstack/react-query'
import { paymentsApi } from '@/api/payments.api'

export function useInterestPreview(
  rentPeriodId: string | undefined,
  paymentDate: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: ['payments', 'rent-periods', 'interest-preview', rentPeriodId, paymentDate],
    queryFn: ({ signal }) =>
      paymentsApi.interestPreview(rentPeriodId!, paymentDate!, { signal }),
    staleTime: 0, // recalcula en cada fecha elegida — es la razón de ser del preview
    enabled: enabled && !!rentPeriodId && !!paymentDate,
    retry: false,
  })
}
