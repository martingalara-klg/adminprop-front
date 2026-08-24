// src/superadmin/modules/organizations/hooks/useEnableOrganization.ts
//
// RF-05: recupera acceso con sus datos intactos.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsApi, type OrganizationStatusChangeRequest } from '@/api/organizations.api'

export function useEnableOrganization(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: OrganizationStatusChangeRequest) =>
      organizationsApi.enable(organizationId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'organizations', 'detail', organizationId],
      })
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', 'list'] })
    },
  })
}
