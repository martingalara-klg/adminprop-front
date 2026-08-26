// src/modules/settlements/hooks/useLandlordDetail.ts
//
// Wizard paso review: datos del propietario (comisión, propiedades) para
// armar el checklist previo. Mismo patrón que
// src/modules/people/hooks/useLandlordDetail.ts (cada módulo trae su
// propio hook, ver docs/skills/module-structure.md) — acá sólo se
// necesitan `commission_pct` y `properties[]`, no el resto de la ficha
// (bank_info, etc.).
import { useQuery } from '@tanstack/react-query'
import { peopleApi } from '@/api/people.api'

export function useLandlordDetail(landlordId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['people', 'landlords', 'detail', landlordId],
    queryFn: ({ signal }) => peopleApi.getLandlord(landlordId!, { signal }),
    staleTime: 60_000,
    enabled: enabled && !!landlordId,
  })
}
