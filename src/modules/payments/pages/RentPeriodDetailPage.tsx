// src/modules/payments/pages/RentPeriodDetailPage.tsx
//
// RF-03/RF-04/RF-05/RF-07 — CA-04-03/04/05/06/07/10: ficha del período
// con el flujo estrella del módulo — registrar cobro (con preview de
// interés sugerido) e historial completo de cobros del período (issue
// #33, sdd_03 §9 v1.7: `payments[]` en `GET /rent-periods/:id`, anulados
// incluidos). Descargar recibo y anular ahora se ofrecen por fila del
// historial para cualquier cobro, no sólo el recién registrado en la
// sesión (limitación del #12, ver PaymentHistoryRow). Gate por
// `rent-period:read` + `payment:create`/`payment:void`.
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { usePermission } from '@/shared/auth/usePermission'
import { Spinner, ErrorState, ForbiddenState } from '@/shared/components'
import { resolveErrorMessage } from '@/api/resolveErrorMessage'
import { formatMoney, formatDate } from '@/shared/utils/format'
import type { RegisterPaymentInput } from '../schemas/payment.schema'

import { RegisterPaymentForm } from '../components/RegisterPaymentForm'
import { PaymentHistoryTable } from '../components/PaymentHistoryTable'
import { useRentPeriodDetail } from '../hooks/useRentPeriodDetail'
import { useInterestPreview } from '../hooks/useInterestPreview'
import { useRegisterPayment } from '../hooks/useRegisterPayment'

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
  const [registerSuccess, setRegisterSuccess] = useState(false)

  const rentPeriodQuery = useRentPeriodDetail(rentPeriodId, canReadRentPeriods)
  const previewQuery = useInterestPreview(
    rentPeriodId,
    paymentDate,
    canReadRentPeriods && canRegisterPayment,
  )
  const registerPayment = useRegisterPayment()

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
    setRegisterSuccess(false)
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
        // La respuesta autoritativa (sugerido/cobrado/perdonado) queda
        // visible en la fila nueva del historial de abajo -- la
        // invalidación de useRegisterPayment ya refresca la query del
        // detalle (CA "registrar un cobro refresca el historial").
        onSuccess: () => setRegisterSuccess(true),
        onError: (error) => setRegisterError(error),
      },
    )
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

      {/* issue #39 -- `registerSuccess` vivía anidado en el bloque de
          arriba, gateado por `status !== 'paid'`. La invalidación de query
          que sigue a un cobro exitoso (useRegisterPayment) deja
          `rentPeriod.status === 'paid'` en el mismo commit que
          `registerSuccess = true`, así que el mensaje nunca llegaba a
          montarse (CA-16-05, tests/e2e/payments.spec.ts). Vive afuera,
          gateado solo por `registerSuccess`. */}
      {registerSuccess ? (
        <p className="text-sm font-medium text-green-700" role="status">
          Cobro registrado — ver el historial de cobros abajo.
        </p>
      ) : null}

      {rentPeriod.status === 'paid' ? (
        <p className="text-sm text-muted-foreground">
          Este período ya está pagado ({formatDate(rentPeriod.period)}).
        </p>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-medium">Historial de cobros</h2>
        <PaymentHistoryTable payments={rentPeriod.payments} canVoidPayment={canVoidPayment} />
      </section>
    </div>
  )
}
