// src/modules/admin/hooks/useInviteUser.ts
//
// RF-01 + CA-07-01: invita con rol `admin` o `maintenance`. `409
// USER_ALREADY_MEMBER` / `409 INVITATION_PENDING_EXISTS` se manejan en el
// componente (ver error-handling.md §"Errores 409 → inline con acción").
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi, type InviteUserRequest } from '@/api/admin.api'

export function useInviteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InviteUserRequest) => adminApi.inviteUser(payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] })
    },
  })
}
