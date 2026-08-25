// src/superadmin/modules/organizations/hooks/useDisableOrganization.ts
//
// RF-05 + RN-03: sus miembros no pueden autenticarse ni renovar sesión.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsApi, type OrganizationStatusChangeRequest } from '@/api/organizations.api'

export function useDisableOrganization(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: OrganizationStatusChangeRequest) =>
      organizationsApi.disable(organizationId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['superadmin', 'organizations', 'detail', organizationId],
      })
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', 'list'] })
    },
  })
}
