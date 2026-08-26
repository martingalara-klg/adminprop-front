// src/superadmin/modules/organizations/hooks/useCreateOrganization.ts
//
// RF-02 + CA-00-01: crea la organización en pending_owner.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsApi, type OrganizationCreate } from '@/api/organizations.api'

export function useCreateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: OrganizationCreate) => organizationsApi.create(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', 'list'] })
    },
  })
}
