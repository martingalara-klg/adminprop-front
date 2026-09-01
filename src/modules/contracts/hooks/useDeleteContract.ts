// src/modules/contracts/hooks/useDeleteContract.ts
//
// Issue #86 (back#124, decisión #130 — RF-07/RN-C08): borrado lógico del
// contrato en cualquier estado (permiso `contract:delete`, solo owner).
// Eliminar un contrato ACTIVO tiene efectos en cascada del lado del
// backend (sdd_03 v1.17 §8): la propiedad vuelve a `available`, sus
// rent_periods desaparecen del panel de cobranzas y del estado de deuda,
// y un ajuste `pending` suyo sale de la bandeja — por eso se invalidan
// también properties, adjustments, payments y el estado de deuda del
// inquilino, no solo contracts.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contractsApi } from '@/api/contracts.api'

export function useDeleteContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (contractId: string) => contractsApi.remove(contractId),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      queryClient.invalidateQueries({ queryKey: ['adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['people', 'renters', 'debt'] })
    },
  })
}
