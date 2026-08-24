// src/superadmin/modules/organizations/hooks/useResendInvitation.ts
//
// RF-04 + CA-00-02: regenera token/expiración; la anterior queda revoked.
import { useMutation } from '@tanstack/react-query'
import { organizationsApi } from '@/api/organizations.api'

export function useResendInvitation(organizationId: string) {
  return useMutation({
    mutationFn: () => organizationsApi.resendInvitation(organizationId),
    retry: 0,
  })
}
