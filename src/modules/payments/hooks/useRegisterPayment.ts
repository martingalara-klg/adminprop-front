// src/modules/payments/hooks/useRegisterPayment.ts
//
// RF-03 + CA-04-03/04/05/06: registro de cobro. Invalida el panel del
// mes, el detalle del período (saldo/estado/`payments[]` cambian —
// issue #33: esto es lo que refresca el historial de cobros) y el
// estado de deuda global (RF-06). Un solo `invalidateQueries` con el
// prefijo `['payments', 'rent-periods']` alcanza al detalle porque
// TanStack Query matchea por prefijo (`exact: false` por default) —
// invalidar el detalle aparte duplicaba el refetch.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi, type PaymentCreate } from '@/api/payments.api'

export function useRegisterPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ rentPeriodId, payload }: { rentPeriodId: string; payload: PaymentCreate }) =>
      paymentsApi.registerPayment(rentPeriodId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'rent-periods'] })
      queryClient.invalidateQueries({ queryKey: ['payments', 'debt'] })
    },
  })
}
