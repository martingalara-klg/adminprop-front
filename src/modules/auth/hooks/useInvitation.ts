// src/modules/auth/hooks/useInvitation.ts
//
// GET /auth/invitation/:token (sdd_03 §1). No reintenta 4xx (expired/not
// found/already accepted no cambian al reintentar).
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'

export function useInvitation(token: string) {
  return useQuery({
    queryKey: ['auth', 'invitation', token],
    queryFn: ({ signal }) => authApi.getInvitation(token, { signal }),
    enabled: token.length > 0,
    retry: false,
  })
}
