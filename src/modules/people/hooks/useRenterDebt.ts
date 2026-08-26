// src/modules/people/hooks/useRenterDebt.ts
//
// RF-04 + CA-02-05: estado de deuda del inquilino (períodos adeudados,
// saldo, días de mora, interés sugerido acumulado). Calculado por el
// backend, nunca persistido — staleTime corto porque el interés sugerido
// crece día a día.
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

export function useRenterDebt(renterId: string | undefined) {
  return useQuery({
    queryKey: ['people', 'renters', 'debt', renterId],
    queryFn: ({ signal }) => peopleApi.getRenterDebt(renterId!, { signal }),
    staleTime: 60_000, // 1 min — valor calculado que varía con el día de hoy
    enabled: !!renterId,
  })
}
