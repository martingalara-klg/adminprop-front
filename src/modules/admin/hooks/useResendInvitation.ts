// src/modules/admin/hooks/useResendInvitation.ts
//
// RF-01: revoca la invitación anterior y emite una nueva (72h).
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin.api'

export function useResendInvitation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (invitationId: string) => adminApi.resendInvitation(invitationId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] })
    },
  })
}
