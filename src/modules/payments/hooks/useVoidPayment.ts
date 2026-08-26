// src/modules/payments/hooks/useVoidPayment.ts
//
// RF-05 + CA-04-07: anulación lógica con motivo — recompone el saldo
// del período (RN-D04). Invalida panel/detalle/deuda igual que el
// registro de cobro.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi, type PaymentVoidRequest } from '@/api/payments.api'

export function useVoidPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ paymentId, payload }: { paymentId: string; payload: PaymentVoidRequest }) =>
      paymentsApi.voidPayment(paymentId, payload),
    retry: 0,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', 'rent-periods'] })
      queryClient.invalidateQueries({ queryKey: ['payments', 'debt'] })
    },
  })
}
