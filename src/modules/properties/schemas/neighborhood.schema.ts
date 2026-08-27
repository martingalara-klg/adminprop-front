// src/modules/properties/schemas/neighborhood.schema.ts
//
// Zod schema del ABM de Barrios — sdd_03 §7.1 "Barrios (/neighborhoods)"
// (issue #99 back / #49 front). El backend valida unicidad case-insensitive
// por organización (409 CONFLICT); este schema solo da feedback inmediato
// de longitud/obligatoriedad.
import { z } from 'zod'

const nameField = z
  .string()
  .min(1, 'El nombre del barrio es obligatorio.')
  .max(120, 'El nombre no puede superar los 120 caracteres.')

// RF-05 + CA-01-07: alta de barrio.
export const createNeighborhoodSchema = z.object({
  name: nameField,
})
export type CreateNeighborhoodInput = z.infer<typeof createNeighborhoodSchema>

// RF-05 + CA-01-07: rename del barrio — mismo shape que el alta.
export const updateNeighborhoodSchema = z.object({
  name: nameField,
})
export type UpdateNeighborhoodInput = z.infer<typeof updateNeighborhoodSchema>
