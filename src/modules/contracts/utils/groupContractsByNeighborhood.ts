// src/modules/contracts/utils/groupContractsByNeighborhood.ts
//
// Issue #85 (feedback #4 del PO, espejo de back#123 — sdd_03 v1.16 §8,
// RN-12): el listado de contratos se agrupa por barrio usando el campo
// denormalizado `property_neighborhood` del `ContractSummary` (resuelto
// por el backend — el front NO resuelve referencias por su cuenta).
//
// - Grupos ordenados alfabéticamente (es-AR, sin distinguir acentos).
// - Contratos con `property_neighborhood: null` (propiedad sin barrio
//   asignado — columna nullable, datos legacy back#99) van al final
//   bajo el rótulo "Sin barrio".
// - Dentro de cada grupo se preserva el orden que devolvió la API.
import type { ContractSummary } from '@/api/contracts.api'

export const NO_NEIGHBORHOOD_LABEL = 'Sin barrio'

export type ContractsNeighborhoodGroup = {
  neighborhood: string
  contracts: ContractSummary[]
}

export function groupContractsByNeighborhood(
  contracts: ContractSummary[],
): ContractsNeighborhoodGroup[] {
  const byNeighborhood = new Map<string, ContractSummary[]>()
  const withoutNeighborhood: ContractSummary[] = []

  for (const contract of contracts) {
    if (contract.property_neighborhood) {
      const group = byNeighborhood.get(contract.property_neighborhood) ?? []
      byNeighborhood.set(contract.property_neighborhood, [...group, contract])
    } else {
      withoutNeighborhood.push(contract)
    }
  }

  const groups = [...byNeighborhood.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'es', { sensitivity: 'base' }))
    .map(([neighborhood, groupContracts]) => ({ neighborhood, contracts: groupContracts }))

  return withoutNeighborhood.length > 0
    ? [...groups, { neighborhood: NO_NEIGHBORHOOD_LABEL, contracts: withoutNeighborhood }]
    : groups
}
