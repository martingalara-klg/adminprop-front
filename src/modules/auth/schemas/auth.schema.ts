// src/modules/auth/schemas/auth.schema.ts
//
// Zod schemas para los forms de auth. Subset de las invariantes del
// backend (feedback inmediato) — el backend valida el total (sdd_04 §2.2).
import { z } from 'zod'

// sdd_04 §2.2 "Passwords: ... Política: ≥ 10 caracteres, ≥ 1 mayúscula, ≥ 1 número."
export const passwordPolicySchema = z
  .string()
  .min(10, 'La contraseña debe tener al menos 10 caracteres.')
  .regex(/[A-Z]/, 'La contraseña debe tener al menos una letra mayúscula.')
  .regex(/[0-9]/, 'La contraseña debe tener al menos un número.')

export const loginSchema = z.object({
  email: z.string().min(1, 'Ingresá tu email.').email('Ingresá un email válido.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Ingresá tu email.').email('Ingresá un email válido.'),
})
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>

export const resetPasswordFormSchema = z
  .object({
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'Repetí la contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })
export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>

export const acceptInvitationFormSchema = z
  .object({
    full_name: z.string().min(2, 'Ingresá tu nombre completo.'),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, 'Repetí la contraseña.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmPassword'],
  })
export type AcceptInvitationFormInput = z.infer<typeof acceptInvitationFormSchema>
