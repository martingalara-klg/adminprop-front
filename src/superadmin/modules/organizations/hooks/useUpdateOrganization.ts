// src/superadmin/modules/organizations/hooks/useUpdateOrganization.ts
//
// sdd_03 §2 (issue #44): PATCH name?/timezone?.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsApi, type OrganizationUpdate } from '@/api/organizations.api'

export function useUpdateOrganization(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: OrganizationUpdate) => organizationsApi.update(organizationId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'organizations', 'detail', organizationId],
      })
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', 'list'] })
    },
  })
}
