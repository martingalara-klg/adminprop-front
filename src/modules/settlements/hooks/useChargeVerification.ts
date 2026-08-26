// src/modules/settlements/hooks/useChargeVerification.ts
//
// RF-05 + CA-05-08: checklist mensual de cargos — qué propiedades ya
// tienen su cargo del mes cargado y cuáles faltan.
import { useQuery } from '@tanstack/react-query'
import { chargesApi } from '@/api/charges.api'

export function useChargeVerification(period: string, enabled = true) {
  return useQuery({
    queryKey: ['settlements', 'charge-entries', period],
    queryFn: ({ signal }) => chargesApi.listChargeEntries(period, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!period,
  })
}
