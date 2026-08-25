// src/modules/admin/hooks/useRevokeInvitation.ts
//
// RF-01: revoca una invitación pendiente.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin.api'

export function useRevokeInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) => adminApi.revokeInvitation(invitationId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] })
    },
  })
}
