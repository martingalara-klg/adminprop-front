// src/superadmin/modules/organizations/schemas/organization.schema.ts
//
// Zod schemas para los forms de superadmin/organizations. Subset de las
// invariantes del backend (feedback inmediato) — sdd_03 §2 valida el total.
import { z } from 'zod'

// sdd_03 §2 "Validaciones": name 2..120 caracteres (POST y PATCH).
const organizationNameSchema = z
  .string()
  .min(2, 'El nombre debe tener al menos 2 caracteres.')
  .max(120, 'El nombre no puede superar los 120 caracteres.')

export const createOrganizationSchema = z.object({
  name: organizationNameSchema,
  // spec_module_00_superadmin.md §RF-02: default America/Argentina/Cordoba.
  timezone: z.string().min(1, 'Ingresá una zona horaria.'),
})
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>

export const DEFAULT_ORGANIZATION_TIMEZONE = 'America/Argentina/Cordoba'

// sdd_03 §2 (issue #44): ambos opcionales, pero al menos uno debe estar
// presente (`_at_least_one_field` en el backend) — el form siempre envía
// los dos campos editables, así que este refine cubre el caso "no tocó
// nada" (evita un PATCH vacío que el backend rechazaría con 400).
export const updateOrganizationSchema = z
  .object({
    name: organizationNameSchema.optional(),
    timezone: z.string().min(1, 'Ingresá una zona horaria.').optional(),
  })
  .refine((data) => data.name !== undefined || data.timezone !== undefined, {
    message: 'Modificá al menos un campo (nombre o zona horaria).',
  })
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>

export const inviteOwnerSchema = z.object({
  email: z.string().min(1, 'Ingresá el email del owner.').email('Ingresá un email válido.'),
})
export type InviteOwnerInput = z.infer<typeof inviteOwnerSchema>

// spec_module_00_superadmin.md RN-05: las operaciones se auditan siempre
// con actor y motivo — `reason` es obligatorio (OrganizationStatusChangeRequest).
export const organizationStatusChangeSchema = z.object({
  reason: z
    .string()
    .min(3, 'Ingresá un motivo (mínimo 3 caracteres).')
    .max(500, 'El motivo no puede superar los 500 caracteres.'),
})
export type OrganizationStatusChangeInput = z.infer<typeof organizationStatusChangeSchema>
