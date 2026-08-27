// src/api/neighborhoods.api.ts
//
// Cliente del catálogo de Barrios — sdd_03 §7.1 "Barrios (/neighborhoods)"
// (v1.9, issue #99 back / #49 front):
//   GET    /neighborhoods                    (listado, sin paginación — catálogo acotado)
//   POST   /neighborhoods                    (body: { name })
//   PATCH  /neighborhoods/:id                (rename; body: { name })
//   DELETE /neighborhoods/:id                (soft; 409 ENTITY_HAS_DEPENDENCIES si tiene propiedades)
//
// Permisos (sdd_03 §7.1): lectura con `property:read`; alta/edición/baja
// con `property:manage` — sin permisos nuevos (decisión del PO, issue #99).
import { httpClient } from './http-client'
import type { components } from './generated/types'

export type NeighborhoodDetail = components['schemas']['NeighborhoodDetail']
export type NeighborhoodCreate = components['schemas']['NeighborhoodCreate']
export type NeighborhoodUpdate = components['schemas']['NeighborhoodUpdate']
export type NeighborhoodListResponse = components['schemas']['NeighborhoodListResponse']
export type NeighborhoodResponse = components['schemas']['NeighborhoodResponse']

export const neighborhoodsApi = {
  /** RF-05: catálogo completo de la organización, sin paginación. */
  async list(opts?: { signal?: AbortSignal }): Promise<NeighborhoodListResponse> {
    const response = await httpClient.get<NeighborhoodListResponse>('/neighborhoods', {
      signal: opts?.signal,
    })
    return response.data
  },

  /** RF-05 + CA-01-07: alta; `name` único por organización (case-insensitive) → 409 CONFLICT. */
  async create(payload: NeighborhoodCreate): Promise<NeighborhoodResponse> {
    const response = await httpClient.post<NeighborhoodResponse>('/neighborhoods', payload)
    return response.data
  },

  /** RF-05 + CA-01-07: rename del barrio. */
  async update(neighborhoodId: string, payload: NeighborhoodUpdate): Promise<NeighborhoodResponse> {
    const response = await httpClient.patch<NeighborhoodResponse>(
      `/neighborhoods/${neighborhoodId}`,
      payload,
    )
    return response.data
  },

  /** RF-05 + CA-01-07: baja lógica; 409 ENTITY_HAS_DEPENDENCIES si tiene propiedades asociadas. */
  async remove(neighborhoodId: string): Promise<void> {
    await httpClient.delete(`/neighborhoods/${neighborhoodId}`)
  },
}
