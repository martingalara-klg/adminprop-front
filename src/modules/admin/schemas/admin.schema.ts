// src/modules/admin/schemas/admin.schema.ts
//
// Zod schemas — subset de las invariantes del backend (sdd_03 §3-4,
// spec_module_07_administracion.md §"Validaciones"). El backend valida el
// total; estos schemas solo dan feedback inmediato en el form.
import { z } from 'zod'

// RF-01: el rol `owner` jamás se acepta en la invitación de equipo — la
// transferencia de owner es exclusivamente vía Super Admin en MVP.
export const inviteUserSchema = z.object({
  email: z.string().min(1, 'Ingresá el email del usuario.').email('Ingresá un email válido.'),
  role: z.enum(['admin', 'maintenance'], { message: 'Seleccioná un rol.' }),
})
export type InviteUserInput = z.infer<typeof inviteUserSchema>

// RF-02: `ChangeUserRoleRequest.role` rechaza `owner` con 422 (Pydantic
// Literal) — el select del form ya no lo ofrece como opción.
export const changeUserRoleSchema = z.object({
  role: z.enum(['admin', 'maintenance'], { message: 'Seleccioná un rol.' }),
})
export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>

/** Módulo 11 sobre los primeros 10 dígitos del CUIT — dígito verificador AFIP. */
function isValidCuit(value: string): boolean {
  const digits = value.replace(/[^0-9]/g, '')
  if (digits.length !== 11) return false

  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, weight, index) => acc + weight * Number(digits[index]), 0)
  const remainder = 11 - (sum % 11)
  const checkDigit = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder

  return checkDigit === Number(digits[10])
}

// RF-04 + CA-07-05 — spec_module_07 §"Validaciones":
// grace_day 1-28, contract_expiry_notice_days 7-365, nombre <=120,
// contacto <=200, CUIT con dígito verificador válido (11 dígitos).
export const organizationSettingsSchema = z.object({
  grace_day: z.coerce
    .number()
    .int('Debe ser un número entero.')
    .min(1, 'El día de gracia debe estar entre 1 y 28.')
    .max(28, 'El día de gracia debe estar entre 1 y 28.'),
  contract_expiry_notice_days: z.coerce
    .number()
    .int('Debe ser un número entero.')
    .min(7, 'El aviso de vencimiento debe estar entre 7 y 365 días.')
    .max(365, 'El aviso de vencimiento debe estar entre 7 y 365 días.'),
  billing_name: z
    .string()
    .max(120, 'El nombre no puede superar los 120 caracteres.')
    .optional()
    .or(z.literal('')),
  billing_cuit: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || isValidCuit(value), {
      message: 'Ingresá un CUIT válido (11 dígitos con dígito verificador correcto).',
    }),
  billing_contact: z
    .string()
    .max(200, 'El contacto no puede superar los 200 caracteres.')
    .optional()
    .or(z.literal('')),
})
export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>
