// src/modules/properties/hooks/useRenterName.ts
//
// RF-03 + CA-01-05: la ficha de la propiedad muestra el nombre del
// inquilino del contrato vigente (link a su ficha, #9). Reutiliza
// `peopleApi.getRenter` — mismo queryKey que `useRenterDetail` del
// módulo personas para compartir caché.
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

export function useRenterName(renterId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['people', 'renters', 'detail', renterId],
    queryFn: ({ signal }) => peopleApi.getRenter(renterId!, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!renterId,
  })
}
