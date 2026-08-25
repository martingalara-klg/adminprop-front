// src/modules/payments/pages/RentPeriodDetailPage.tsx
//
// RF-03/RF-04/RF-05/RF-07 — CA-04-03/04/05/06/07/10: ficha del período
// con el flujo estrella del módulo — registrar cobro (con preview de
// interés sugerido), ver el resultado con sugerido/cobrado/perdonado, y
// desde ahí descargar el recibo o anular el cobro. Gate por
// `rent-period:read` + `payment:create`/`payment:void`.
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, ForbiddenState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { formatMoney, formatDate } from '@/shared/utils/format'
import type { PaymentSummary } from '@/api/payments.api'
import type { RegisterPaymentInput, VoidPaymentInput } from '../schemas/payment.schema'

import { RegisterPaymentForm } from '../components/RegisterPaymentForm'
import { PaymentResultCard } from '../components/PaymentResultCard'
import { useRentPeriodDetail } from '../hooks/useRentPeriodDetail'
import { useInterestPreview } from '../hooks/useInterestPreview'
import { useRegisterPayment } from '../hooks/useRegisterPayment'
import { useVoidPayment } from '../hooks/useVoidPayment'
import { paymentsApi } from '@/api/payments.api'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
}

export function RentPeriodDetailPage() {
  const { rentPeriodId } = useParams<{ rentPeriodId: string }>()
  const canReadRentPeriods = usePermission('rent-period:read')
  const canRegisterPayment = usePermission('payment:create')
  const canVoidPayment = usePermission('payment:void')

  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [registerError, setRegisterError] = useState<unknown>(null)
  const [lastPayment, setLastPayment] = useState<PaymentSummary | null>(null)
  const [isPaymentVoided, setIsPaymentVoided] = useState(false)
  const [voidError, setVoidError] = useState<unknown>(null)
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState(false)
  const [receiptError, setReceiptError] = useState<string | null>(null)

  const rentPeriodQuery = useRentPeriodDetail(rentPeriodId, canReadRentPeriods)
  const previewQuery = useInterestPreview(
    rentPeriodId,
    paymentDate,
    canReadRentPeriods && canRegisterPayment,
  )
  const registerPayment = useRegisterPayment()
  const voidPayment = useVoidPayment()

  if (!canReadRentPeriods) {
    return (
      <ForbiddenState message="No tenés permiso para ver este período. Consultá con el owner de la organización." />
    )
  }

  if (rentPeriodQuery.isLoading) return <Spinner label="Cargando período..." />
  if (rentPeriodQuery.isError) return <ErrorState error={rentPeriodQuery.error} />
  if (!rentPeriodQuery.data) return null

  const rentPeriod = rentPeriodQuery.data.data

  function handleRegisterPayment(values: RegisterPaymentInput) {
    if (!rentPeriodId) return
    setRegisterError(null)
    registerPayment.mutate(
      {
        rentPeriodId,
        payload: {
          payment_date: values.payment_date,
          method: values.method,
          payment_currency: values.payment_currency,
          amount: values.amount,
          exchange_rate: values.exchange_rate || undefined,
          destination: values.destination,
          charged_interest: values.charged_interest,
          notes: values.notes || undefined,
        },
      },
      {
        onSuccess: (response) => {
          setLastPayment(response.data)
          setIsPaymentVoided(false)
        },
        onError: (error) => setRegisterError(error),
      },
    )
  }

  function handleVoidPayment(values: VoidPaymentInput) {
    if (!lastPayment) return
    setVoidError(null)
    voidPayment.mutate(
      { paymentId: lastPayment.id, payload: values },
      {
        onSuccess: () => setIsPaymentVoided(true),
        onError: (error) => setVoidError(error),
      },
    )
  }

  async function handleDownloadReceipt() {
    if (!lastPayment) return
    setReceiptError(null)
    setIsDownloadingReceipt(true)
    try {
      await paymentsApi.downloadReceipt(lastPayment.id)
    } catch (error) {
      setReceiptError(resolveErrorMessage(error))
    } finally {
      setIsDownloadingReceipt(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-lg font-semibold">Período {rentPeriod.period.slice(0, 7)}</h1>
        <p className="text-sm text-muted-foreground">
          Estado: {STATUS_LABELS[rentPeriod.status] ?? rentPeriod.status}
          {rentPeriod.in_arrears ? ' · En mora' : ''}
        </p>
      </header>

      <section>
        <dl className="grid grid-cols-2 gap-3 text-sm" data-testid="rent-period-detail">
          <div>
            <dt className="text-muted-foreground">Monto del período</dt>
            <dd>
              {formatMoney(rentPeriod.amount_due)} {rentPeriod.currency}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Saldo</dt>
            <dd>
              {formatMoney(rentPeriod.balance)} {rentPeriod.currency}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Días de mora</dt>
            <dd>{rentPeriod.days_late}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Interés sugerido al día de hoy</dt>
            <dd>{formatMoney(rentPeriod.suggested_interest)}</dd>
          </div>
        </dl>
      </section>

      {canRegisterPayment && rentPeriod.status !== 'paid' ? (
        <section>
          <RegisterPaymentForm
            contractCurrency={rentPeriod.currency}
            suggestedInterest={previewQuery.data?.suggested_interest ?? null}
            isPreviewLoading={previewQuery.isLoading}
            errorMessage={registerError ? resolveErrorMessage(registerError) : null}
            isSubmitting={registerPayment.isPending}
            onDateChange={setPaymentDate}
            onSubmit={handleRegisterPayment}
          />
        </section>
      ) : null}

      {rentPeriod.status === 'paid' ? (
        <p className="text-sm text-muted-foreground">
          Este período ya está pagado ({formatDate(rentPeriod.period)}).
        </p>
      ) : null}

      {lastPayment ? (
        <section>
          <PaymentResultCard
            payment={lastPayment}
            isVoided={isPaymentVoided}
            isDownloadingReceipt={isDownloadingReceipt}
            receiptError={receiptError}
            isVoiding={voidPayment.isPending}
            voidError={voidError ? resolveErrorMessage(voidError) : null}
            onDownloadReceipt={handleDownloadReceipt}
            onVoid={canVoidPayment ? handleVoidPayment : () => {}}
          />
        </section>
      ) : null}
    </div>
  )
}
