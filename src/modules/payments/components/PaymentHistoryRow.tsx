// src/modules/payments/components/PaymentHistoryRow.tsx
//
// RF-05/RF-07 — CA-04-07/10 (issue #33): una fila del historial de
// cobros del período. Reutiliza el flujo de anulación del #12
// (VoidPaymentAction: motivo obligatorio + confirmación en dos pasos),
// ahora aplicable a CUALQUIER cobro de la lista — no sólo al recién
// registrado en la sesión (esa limitación desaparece con `payments[]`
// en `GET /rent-periods/:id`, sdd_03 §9 v1.7).
//
// Cobros anulados (`voided_at` poblado): marca visual clara, sin
// acciones (RN-D04 — "el cobro queda visible con marca de anulado").
// El motivo de la anulación no viaja en `payments[]` — vive en
// auditoría (`GET /audit-logs`), fuera de alcance de este issue.
//
// Cobros de carga inicial (`origin === 'initial_load'`, issue #72 —
// espejo de back#119, RN-08/RN-P09, CA-04-13/14/15): badge
// "Automático · alta de contrato en curso" y sin acciones de
// recibo/anular — el backend las rechaza con 422 BUSINESS_RULE_VIOLATION
// (registro histórico de la carga inicial, no una operación corriente).
// Mismo patrón que la fila anulada (ocultar acciones) + leyenda de solo
// lectura explicando por qué (criterio del #69 con propiedades `rented`).
import { useState } from 'react'
import { Button } from '@/shared/components'
import { formatMoney, formatDate } from '@/shared/utils/format'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { paymentsApi, type PaymentDetail } from '@/api/payments.api'
import { PAYMENT_DESTINATION_LABELS, PAYMENT_METHOD_LABELS } from '../schemas/payment.schema'
import type { VoidPaymentInput } from '../schemas/payment.schema'
import { useVoidPayment } from '../hooks/useVoidPayment'
import { VoidPaymentAction } from './VoidPaymentAction'

type Props = {
  payment: PaymentDetail
  canVoidPayment: boolean
}

export function PaymentHistoryRow({ payment, canVoidPayment }: Props) {
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)
  const [voidError, setVoidError] = useState<unknown>(null)

  const voidPayment = useVoidPayment()
  const isVoided = !!payment.voided_at
  const isInitialLoad = payment.origin === 'initial_load'

  const method = PAYMENT_METHOD_LABELS[payment.method as 'cash' | 'transfer'] ?? payment.method
  const destination =
    PAYMENT_DESTINATION_LABELS[payment.destination as 'agency_account' | 'landlord_account'] ??
    payment.destination

  async function handleDownloadReceipt() {
    setReceiptError(null)
    setIsDownloadingReceipt(true)
    try {
      await paymentsApi.downloadReceipt(payment.id)
    } catch (error) {
      setReceiptError(resolveErrorMessage(error))
    } finally {
      setIsDownloadingReceipt(false)
    }
  }

  function handleVoid(values: VoidPaymentInput) {
    setVoidError(null)
    voidPayment.mutate(
      { paymentId: payment.id, payload: values },
      { onError: (error) => setVoidError(error) },
    )
  }

  return (
    <tr
      className={`border-b last:border-0 align-top ${isVoided ? 'text-muted-foreground' : ''}`}
      data-testid="payment-history-row"
      data-voided={isVoided}
      data-origin={payment.origin}
    >
      <td className="py-2 pr-4">
        <span className={isVoided ? 'line-through' : ''}>{formatDate(payment.payment_date)}</span>
      </td>
      <td className="py-2 pr-4">{method}</td>
      <td className="py-2 pr-4">{payment.payment_currency}</td>
      <td className="py-2 pr-4">{formatMoney(payment.amount)}</td>
      <td className="py-2 pr-4">{payment.exchange_rate ? payment.exchange_rate : '—'}</td>
      <td className="py-2 pr-4">{destination}</td>
      <td className="py-2 pr-4">{formatMoney(payment.suggested_interest)}</td>
      <td className="py-2 pr-4">{formatMoney(payment.charged_interest)}</td>
      <td className="py-2 pr-4">{formatMoney(payment.forgiven_interest)}</td>
      <td className="py-2 pr-4">{payment.notes || '—'}</td>
      <td className="py-2 pr-4">
        <div className="flex flex-col gap-1">
          {isVoided ? (
            <span
              className="inline-flex w-fit rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive"
              role="status"
            >
              Anulado
            </span>
          ) : (
            <span className="inline-flex w-fit rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
              Activo
            </span>
          )}
          {isInitialLoad ? (
            <span
              className="inline-flex w-fit items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border"
              data-testid="payment-initial-load-badge"
            >
              Automático · alta de contrato en curso
            </span>
          ) : null}
        </div>
      </td>
      <td className="py-2">
        {isVoided ? null : isInitialLoad ? (
          // CA-04-14/15 (back#119): sin "Descargar recibo" ni "Anular
          // cobro" — el backend responde 422 BUSINESS_RULE_VIOLATION
          // sobre un cobro de carga inicial. La UI lo previene.
          <p className="text-xs text-muted-foreground">
            Cobro automático de la carga inicial — sin recibo ni anulación.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDownloadingReceipt}
                onClick={handleDownloadReceipt}
              >
                {isDownloadingReceipt ? 'Descargando…' : 'Descargar recibo'}
              </Button>
              {receiptError ? (
                <p className="mt-1 text-sm text-destructive" role="alert">
                  {receiptError}
                </p>
              ) : null}
            </div>

            {canVoidPayment ? (
              <VoidPaymentAction
                isVoided={false}
                isSubmitting={voidPayment.isPending}
                errorMessage={voidError ? resolveErrorMessage(voidError) : null}
                onVoid={handleVoid}
              />
            ) : null}
          </div>
        )}
      </td>
    </tr>
  )
}
