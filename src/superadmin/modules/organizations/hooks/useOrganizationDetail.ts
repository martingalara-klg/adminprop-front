// src/superadmin/modules/organizations/hooks/useOrganizationDetail.ts
//
// RF-01 detalle. CA-00-06: solo metadata de la organización.
import { useQuery } from '@tanstack/react-query'
import { organizationsApi } from '@/api/organizations.api'

export function useOrganizationDetail(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['superadmin', 'organizations', 'detail', organizationId],
    queryFn: ({ signal }) => organizationsApi.get(organizationId as string, { signal }),
    enabled: !!organizationId,
    staleTime: 30_000,
    retry: false,
  })
}
