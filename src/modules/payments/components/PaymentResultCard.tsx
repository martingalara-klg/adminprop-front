// src/modules/payments/components/PaymentResultCard.tsx
//
// RF-03/RF-04/RF-05/RF-07 — CA-04-05/06/07/10: resultado del cobro
// recién registrado con los tres valores AUTORITATIVOS que devolvió el
// backend (sugerido/cobrado/perdonado — no la estimación en vivo del
// form), más "Descargar recibo" y "Anular cobro". No existe
// `GET /payments/:id` en sdd_03 §9 (v1.6) — sólo se puede accionar sobre
// el cobro recién creado en esta misma sesión de la página (ver
// payments.api.ts).
import { Button } from '@/shared/components'
import { formatMoney, formatDate } from '@/shared/utils/format'
import type { PaymentSummary } from '@/api/payments.api'
import { PAYMENT_DESTINATION_LABELS, PAYMENT_METHOD_LABELS } from '../schemas/payment.schema'
import { VoidPaymentAction } from './VoidPaymentAction'
import type { VoidPaymentInput } from '../schemas/payment.schema'

type Props = {
  payment: PaymentSummary
  isVoided: boolean
  isDownloadingReceipt: boolean
  receiptError: string | null
  isVoiding: boolean
  voidError: string | null
  onDownloadReceipt: () => void
  onVoid: (values: VoidPaymentInput) => void
}

export function PaymentResultCard({
  payment,
  isVoided,
  isDownloadingReceipt,
  receiptError,
  isVoiding,
  voidError,
  onDownloadReceipt,
  onVoid,
}: Props) {
  const method = PAYMENT_METHOD_LABELS[payment.method as 'cash' | 'transfer'] ?? payment.method
  const destination =
    PAYMENT_DESTINATION_LABELS[payment.destination as 'agency_account' | 'landlord_account'] ??
    payment.destination

  return (
    <div className="flex flex-col gap-3 rounded-md border p-4" data-testid="payment-result">
      <h3 className="text-sm font-medium">Cobro registrado</h3>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted-foreground">Fecha</dt>
          <dd>{formatDate(payment.payment_date)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Medio</dt>
          <dd>{method}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Importe</dt>
          <dd>
            {formatMoney(payment.amount)} {payment.payment_currency}
          </dd>
        </div>
        {payment.exchange_rate ? (
          <div>
            <dt className="text-muted-foreground">Tipo de cambio</dt>
            <dd>{payment.exchange_rate}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">Destino</dt>
          <dd>{destination}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Interés sugerido</dt>
          <dd>{formatMoney(payment.suggested_interest)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Interés cobrado</dt>
          <dd>{formatMoney(payment.charged_interest)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Interés perdonado</dt>
          <dd>{formatMoney(payment.forgiven_interest)}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <div>
          <Button
            type="button"
            variant="outline"
            disabled={isDownloadingReceipt || isVoided}
            onClick={onDownloadReceipt}
          >
            {isDownloadingReceipt ? 'Descargando…' : 'Descargar recibo'}
          </Button>
          {receiptError ? (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {receiptError}
            </p>
          ) : null}
        </div>

        <VoidPaymentAction
          isVoided={isVoided}
          isSubmitting={isVoiding}
          errorMessage={voidError}
          onVoid={onVoid}
        />
      </div>
    </div>
  )
}
