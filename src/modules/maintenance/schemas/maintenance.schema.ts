// src/modules/maintenance/schemas/maintenance.schema.ts
//
// Zod schemas — subset de las invariantes del backend
// (spec_module_06_mantenimiento.md §"Validaciones"):
//   title: 3–200 caracteres. amount de cotización > 0. final_cost >= 0.
//   Adjuntos: jpg/png/webp/pdf, ≤ 10 MB por archivo, ≤ 10 por entidad.
// El backend valida el total; estos schemas sólo dan feedback inmediato.
import { z } from 'zod'

export const PAYER_OPTIONS = ['landlord', 'agency'] as const
export const PAYER_LABELS: Record<(typeof PAYER_OPTIONS)[number], string> = {
  landlord: 'Paga el dueño',
  agency: 'Paga administración y descuenta',
}

export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  open: 'Abierto',
  in_progress: 'En curso',
  closed: 'Cerrado',
  cancelled: 'Cancelado',
}

export const QUOTE_STATUS_LABELS: Record<string, string> = {
  submitted: 'Enviada',
  approved: 'Aprobada',
  discarded: 'Descartada',
}

// ── Adjuntos — spec_module_06 §Validaciones ────────────────────────────────
export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const
export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_ATTACHMENTS_PER_ENTITY = 10

export function validateAttachmentFile(file: File): string | null {
  if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number])) {
    return 'Formato no permitido. Usá JPG, PNG, WEBP o PDF.'
  }
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return 'El archivo supera los 10 MB permitidos.'
  }
  return null
}

// ── RF-01/CA-06-01: alta del pedido ────────────────────────────────────────
export const createWorkOrderSchema = z.object({
  property_id: z.string().min(1, 'Seleccioná una propiedad.'),
  title: z
    .string()
    .min(3, 'El título debe tener al menos 3 caracteres.')
    .max(200, 'El título no puede superar los 200 caracteres.'),
  description: z.string().max(2000, 'La descripción es demasiado larga.').optional().or(z.literal('')),
  payer: z.enum(PAYER_OPTIONS, { required_error: 'Indicá quién paga el arreglo.' }),
})
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>

// ── RF-02/CA-06-02: cotización del encargado ───────────────────────────────
export const quoteSchema = z.object({
  amount: z
    .string()
    .min(1, 'El monto es obligatorio.')
    .refine((value) => Number(value) > 0, 'El monto debe ser mayor a 0.'),
  description: z.string().max(2000, 'La descripción es demasiado larga.').optional().or(z.literal('')),
})
export type QuoteInput = z.infer<typeof quoteSchema>

// ── RF-04/CA-06-04: cierre con costo final ajustable ───────────────────────
export const closeWorkOrderSchema = z.object({
  final_cost: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((value) => !value || Number(value) >= 0, 'El costo final no puede ser negativo.'),
})
export type CloseWorkOrderInput = z.infer<typeof closeWorkOrderSchema>

// ── RF-05/CA-06-07: cancelación con motivo ─────────────────────────────────
export const cancelWorkOrderSchema = z.object({
  reason: z
    .string()
    .min(1, 'El motivo es obligatorio.')
    .max(500, 'El motivo no puede superar los 500 caracteres.'),
})
export type CancelWorkOrderInput = z.infer<typeof cancelWorkOrderSchema>
