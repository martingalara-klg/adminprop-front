// src/superadmin/modules/organizations/hooks/useInviteOwner.ts
//
// RF-03 + CA-00-02: invita al owner inicial; expira a las 72h.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsApi, type InviteOwnerRequest } from '@/api/organizations.api'

export function useInviteOwner(organizationId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InviteOwnerRequest) =>
      organizationsApi.inviteOwner(organizationId, payload),
    retry: 0,
    onSuccess: () => {
      // sdd_03 §2 no expone GET de invitación — la lista igual se
      // refresca por si el listado alguna vez incorpora el dato.
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'organizations', 'list'] })
    },
  })
}
