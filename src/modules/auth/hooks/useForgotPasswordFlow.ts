// src/modules/auth/hooks/useForgotPasswordFlow.ts
//
// POST /auth/forgot-password -- sdd_03 §1: "200 SIEMPRE (anti-enumeration)".
// El componente muestra el texto literal de security.es-AR.ts en éxito Y
// en cualquier error de negocio (rate limit se muestra aparte, es
// transversal y no revela nada sobre el email).
import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'

export function useForgotPasswordFlow() {
  return useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
  })
}
