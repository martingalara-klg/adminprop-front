// src/modules/people/schemas/people.schema.ts
//
// Zod schemas — subset de las invariantes del backend (spec_module_02_
// personas.md §"Validaciones"). El backend valida el total; estos
// schemas solo dan feedback inmediato en el form.
//
// §Validaciones:
//   name: 2-150 caracteres.
//   tax_id: CUIT de 11 dígitos con dígito verificador válido, o DNI de
//     7-8 dígitos (campo flexible, opcional).
//   email: RFC 5322 (opcional). phone: texto libre <=30 (opcional).
//   commission_pct: decimal 0-100, hasta 2 decimales.
import { z } from 'zod'

/** Módulo 11 sobre los primeros 10 dígitos del CUIT — dígito verificador AFIP. */
function isValidCuit(digits: string): boolean {
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const sum = weights.reduce((acc, weight, index) => acc + weight * Number(digits[index]), 0)
  const remainder = 11 - (sum % 11)
  const checkDigit = remainder === 11 ? 0 : remainder === 10 ? 9 : remainder
  return checkDigit === Number(digits[10])
}

/** CUIT (11 dígitos + verificador) o DNI (7-8 dígitos) — "campo flexible" del SDD. */
function isValidTaxId(value: string): boolean {
  const digits = value.replace(/[^0-9]/g, '')
  if (digits.length === 11) return isValidCuit(digits)
  return digits.length === 7 || digits.length === 8
}

const taxIdField = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((value) => !value || isValidTaxId(value), {
    message: 'Ingresá un CUIT (11 dígitos con dígito verificador válido) o un DNI (7-8 dígitos).',
  })

const nameField = z
  .string()
  .min(2, 'El nombre debe tener entre 2 y 150 caracteres.')
  .max(150, 'El nombre debe tener entre 2 y 150 caracteres.')

const emailField = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine((value) => !value || z.string().email().safeParse(value).success, {
    message: 'Ingresá un email válido.',
  })

const phoneField = z
  .string()
  .max(30, 'El teléfono no puede superar los 30 caracteres.')
  .optional()
  .or(z.literal(''))

const notesField = z.string().optional().or(z.literal(''))

const commissionPctField = z.coerce
  .number({ message: 'Ingresá el % de comisión.' })
  .min(0, 'El % de comisión debe estar entre 0 y 100.')
  .max(100, 'El % de comisión debe estar entre 0 y 100.')
  .refine((value) => Number.isInteger(value * 100), {
    message: 'El % de comisión admite hasta 2 decimales.',
  })

// ── Propietarios (landlords) ────────────────────────────────────────────

// RF-01 + CA-02-01: alta con `commission_pct` obligatorio.
export const createLandlordSchema = z.object({
  name: nameField,
  tax_id: taxIdField,
  phone: phoneField,
  email: emailField,
  bank_info: z.string().optional().or(z.literal('')),
  commission_pct: commissionPctField,
  notes: notesField,
})
export type CreateLandlordInput = z.infer<typeof createLandlordSchema>

// RF-01 — CA-02-02: datos de contacto editables por owner/admin, SIN
// `commission_pct` (ese campo vive en un form separado, ver
// LandlordCommissionField, gateado por `landlord:set-commission`).
export const updateLandlordContactSchema = z.object({
  name: nameField,
  tax_id: taxIdField,
  phone: phoneField,
  email: emailField,
  bank_info: z.string().optional().or(z.literal('')),
  notes: notesField,
})
export type UpdateLandlordContactInput = z.infer<typeof updateLandlordContactSchema>

// CA-02-02/03: solo quien tiene `landlord:set-commission` (owner) ve este
// form habilitado.
export const updateLandlordCommissionSchema = z.object({
  commission_pct: commissionPctField,
})
export type UpdateLandlordCommissionInput = z.infer<typeof updateLandlordCommissionSchema>

// ── Inquilinos (renters) ────────────────────────────────────────────────

export const createRenterSchema = z.object({
  name: nameField,
  tax_id: taxIdField,
  phone: phoneField,
  email: emailField,
  notes: notesField,
})
export type CreateRenterInput = z.infer<typeof createRenterSchema>

export const updateRenterSchema = z.object({
  name: nameField,
  tax_id: taxIdField,
  phone: phoneField,
  email: emailField,
  notes: notesField,
})
export type UpdateRenterInput = z.infer<typeof updateRenterSchema>
