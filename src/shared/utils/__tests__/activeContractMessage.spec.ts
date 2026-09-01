// src/shared/utils/__tests__/activeContractMessage.spec.ts
//
// Issue #86 (back#124, decisión #130): mensaje legible es-AR construido
// desde `details.active_contracts[]` del `422 ENTITY_HAS_ACTIVE_CONTRACT`
// — nunca JSON en pantalla (precedente #70, debtMessage.ts).
import { describe, expect, it } from 'vitest'

import { AdminPropApiError } from '@/api/errors'
import {
  buildActiveContractMessage,
  resolveEntityDeleteErrorMessage,
} from '../activeContractMessage'

const CONTRACT_ITEM = {
  contract_id: 'c-1',
  property_id: 'p-1',
  property_address: 'Av. Siempreviva 742',
  renter_id: 'r-1',
  renter_name: 'Juan Pérez',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
}

describe('Issue #86 — buildActiveContractMessage', () => {
  it('arma el mensaje legible con dirección — inquilino para un contrato activo', () => {
    const message = buildActiveContractMessage({
      entity_type: 'property',
      entity_id: 'p-1',
      active_contracts: [CONTRACT_ITEM],
    })
    expect(message).toBe(
      'No se puede eliminar: tiene un contrato activo (Av. Siempreviva 742 — Juan Pérez).',
    )
  })

  it('pluraliza y concatena con ; cuando hay más de un contrato activo', () => {
    const message = buildActiveContractMessage({
      entity_type: 'renter',
      entity_id: 'r-1',
      active_contracts: [
        CONTRACT_ITEM,
        { ...CONTRACT_ITEM, contract_id: 'c-2', property_address: 'Bv. San Juan 500' },
      ],
    })
    expect(message).toBe(
      'No se puede eliminar: tiene 2 contratos activos (Av. Siempreviva 742 — Juan Pérez; Bv. San Juan 500 — Juan Pérez).',
    )
  })

  it('omite la parte que el backend no manda (solo dirección)', () => {
    const message = buildActiveContractMessage({
      active_contracts: [{ ...CONTRACT_ITEM, renter_name: null }],
    })
    expect(message).toBe('No se puede eliminar: tiene un contrato activo (Av. Siempreviva 742).')
  })

  it('con details vacío cae al mensaje genérico legible, nunca JSON', () => {
    expect(buildActiveContractMessage({})).toBe(
      'No se puede eliminar: tiene un contrato activo.',
    )
    expect(buildActiveContractMessage(null)).toBe(
      'No se puede eliminar: tiene un contrato activo.',
    )
  })
})

describe('Issue #86 — resolveEntityDeleteErrorMessage', () => {
  it('discrimina ENTITY_HAS_ACTIVE_CONTRACT y arma el mensaje desde details', () => {
    const error = new AdminPropApiError(
      'ENTITY_HAS_ACTIVE_CONTRACT',
      422,
      'Entity has active contract',
      null,
      { entity_type: 'property', entity_id: 'p-1', active_contracts: [CONTRACT_ITEM] },
    )
    expect(resolveEntityDeleteErrorMessage(error)).toBe(
      'No se puede eliminar: tiene un contrato activo (Av. Siempreviva 742 — Juan Pérez).',
    )
  })

  it('cualquier otro código cae al mapa central es-AR', () => {
    const error = new AdminPropApiError(
      'ENTITY_HAS_DEPENDENCIES',
      409,
      'Entity has dependencies',
    )
    expect(resolveEntityDeleteErrorMessage(error)).toBe(
      'No se puede eliminar: hay registros que dependen de este recurso.',
    )
  })
})
