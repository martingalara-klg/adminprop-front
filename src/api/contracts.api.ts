// src/api/contracts.api.ts
//
// Cliente del módulo Contratos — sdd_03 §8 "Contratos" (v1.6). Este PR
// (#10, Propiedades) solo necesita `list` para resolver el "contrato
// vigente" de la ficha consolidada de una propiedad (CA-01-05:
// `GET /contracts?property_id=&status=active`) — el resto de endpoints
// de este dominio (`POST /contracts`, `activate`, `terminate`,
// `/adjustments`, etc.) es alcance de #11 (Contratos UI, todavía sin
// pantallas) y se agrega en ese issue.
import { httpClient } from './http-client'
import type { components } from './generated/types'

export type ContractSummary = components['schemas']['ContractSummary']
export type ContractListResponse = components['schemas']['ContractListResponse']

export type ContractListFilters = {
  cursor?: string
  limit?: number
  status?: 'draft' | 'active' | 'terminated' | 'expired'
  property_id?: string
  renter_id?: string
  currency?: string
  expiring_in_days?: number
}

export const contractsApi = {
  async list(
    filters: ContractListFilters = {},
    opts?: { signal?: AbortSignal },
  ): Promise<ContractListResponse> {
    const response = await httpClient.get<ContractListResponse>('/contracts', {
      params: filters,
      signal: opts?.signal,
    })
    return response.data
  },
}
