// src/modules/properties/schemas/property.schema.ts
//
// Zod schemas — subset de las invariantes del backend
// (spec_module_01_propiedades.md §"Validaciones"). El backend valida el
// total; estos schemas solo dan feedback inmediato en el form.
//
// §Validaciones:
//   address: 5-300 caracteres, obligatoria.
//   property_type: uno del catálogo sugerido o texto libre corto (<=50).
//   service_type: uno de los 7 valores del enum.
//   account_number: 1-100 caracteres, obligatorio en cada cuenta.
import { z } from 'zod'

export const PROPERTY_TYPE_OPTIONS = ['departamento', 'casa', 'local', 'cochera', 'otro'] as const

// RF-04: `rented` es derivado — nunca se ofrece como opción manual.
export const MANUAL_PROPERTY_STATUS_OPTIONS = ['available', 'unavailable'] as const

export const SERVICE_TYPE_OPTIONS = [
  'rentas',
  'municipalidad',
  'luz',
  'gas',
  'agua',
  'expensas',
  'otro',
] as const

export const SERVICE_TYPE_LABELS: Record<(typeof SERVICE_TYPE_OPTIONS)[number], string> = {
  rentas: 'Rentas',
  municipalidad: 'Municipalidad',
  luz: 'Luz',
  gas: 'Gas',
  agua: 'Agua',
  expensas: 'Expensas',
  otro: 'Otro',
}

const addressField = z
  .string()
  .min(5, 'La dirección debe tener entre 5 y 300 caracteres.')
  .max(300, 'La dirección debe tener entre 5 y 300 caracteres.')

const landlordIdField = z.string().min(1, 'Seleccioná un propietario.')

// issue #99 (back) / #49 (front): barrio obligatorio en alta/edición —
// decisión del PO, propiedades nuevas siempre llevan barrio (aunque la
// columna sea nullable en DB por datos legacy).
const neighborhoodIdField = z.string().min(1, 'Seleccioná un barrio.')

const propertyTypeField = z.string().max(50, 'El tipo no puede superar los 50 caracteres.')

const notesField = z.string().optional().or(z.literal(''))

// RF-01 + CA-01-01: alta con dirección (obligatoria), propietario
// (obligatorio) y tipo. CA-01-08 (issue #99/#49): barrio obligatorio.
export const createPropertySchema = z.object({
  address: addressField,
  landlord_id: landlordIdField,
  neighborhood_id: neighborhoodIdField,
  property_type: propertyTypeField,
  notes: notesField,
})
export type CreatePropertyInput = z.infer<typeof createPropertySchema>

// RF-01: edición de todos los campos salvo `status="rented"` (derivado).
// CA-01-08: barrio obligatorio también en edición.
export const updatePropertySchema = z.object({
  address: addressField,
  landlord_id: landlordIdField,
  neighborhood_id: neighborhoodIdField,
  property_type: propertyTypeField,
  status: z.enum(MANUAL_PROPERTY_STATUS_OPTIONS),
  notes: notesField,
})
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>

// RF-02 + CA-01-02: alta de cuenta de servicio. `secondary_number` cubre
// el caso `luz` (n° de cliente + n° de contrato).
export const createServiceAccountSchema = z.object({
  service_type: z.enum(SERVICE_TYPE_OPTIONS),
  account_number: z
    .string()
    .min(1, 'El número de cuenta es obligatorio.')
    .max(100, 'El número de cuenta no puede superar los 100 caracteres.'),
  secondary_number: z
    .string()
    .max(100, 'El número secundario no puede superar los 100 caracteres.')
    .optional()
    .or(z.literal('')),
  notes: notesField,
})
export type CreateServiceAccountInput = z.infer<typeof createServiceAccountSchema>

// RF-02: `service_type` no editable — solo número(s) y notas.
export const updateServiceAccountSchema = z.object({
  account_number: z
    .string()
    .min(1, 'El número de cuenta es obligatorio.')
    .max(100, 'El número de cuenta no puede superar los 100 caracteres.'),
  secondary_number: z
    .string()
    .max(100, 'El número secundario no puede superar los 100 caracteres.')
    .optional()
    .or(z.literal('')),
  notes: notesField,
})
export type UpdateServiceAccountInput = z.infer<typeof updateServiceAccountSchema>

// RF-05 (Módulo 5, spec_module_05 §RF-05): conceptos recurrentes por
// propiedad — solo los 3 tipos declarados en el catálogo del backend
// (`charges/schemas.py.ChargeType`).
export const RECURRING_CHARGE_TYPE_OPTIONS = ['rentas', 'municipalidad', 'otro'] as const

// `Record<string, string>` (no `(typeof RECURRING_CHARGE_TYPE_OPTIONS)[number]`)
// a propósito: `PropertyRecurringCharges` indexa con `charge.charge_type`,
// que viene de la API como `string` (no del enum acotado del form).
export const CHARGE_TYPE_LABELS: Record<string, string> = {
  rentas: 'Rentas',
  municipalidad: 'Municipalidad',
  otro: 'Otro',
}

export const createRecurringChargeSchema = z.object({
  charge_type: z.enum(RECURRING_CHARGE_TYPE_OPTIONS),
  label: z
    .string()
    .min(1, 'La etiqueta es obligatoria.')
    .max(255, 'La etiqueta no puede superar los 255 caracteres.'),
})
export type CreateRecurringChargeInput = z.infer<typeof createRecurringChargeSchema>
