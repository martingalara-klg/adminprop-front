// src/modules/auth/hooks/useResetPasswordFlow.ts
//
// GET /auth/reset-password/:token -> 200 | 404 | 410 (RESET_TOKEN_EXPIRED)
// POST /auth/reset-password -> 200 (sdd_03 §1).
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'

export function useResetPasswordToken(token: string) {
  return useQuery({
    queryKey: ['auth', 'reset-password-token', token],
    queryFn: ({ signal }) => authApi.getResetPasswordToken(token, { signal }),
    enabled: token.length > 0,
    retry: false,
  })
}

export function useResetPasswordFlow() {
  return useMutation({
    mutationFn: (payload: { token: string; password: string }) => authApi.resetPassword(payload),
  })
}
