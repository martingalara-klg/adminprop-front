// src/modules/payments/components/RegisterPaymentForm.tsx
//
// RF-03 + RF-04 — CA-04-03/04/05/06: el flujo estrella del módulo.
// Fecha de pago, medio, moneda, importe a capital, TC condicional
// (RN-P06), destino (RN-P07), interés cobrado con los tres valores
// visibles (sugerido/cobrado/perdonado, RN-P04) y notas.
//
// El interés "perdonado" que se muestra acá es sólo una guía visual en
// vivo (resta simple sugerido - cobrado, ambos strings decimales del
// backend) — NO se envía al servidor y NO es el valor persistido: el
// `forgiven_interest` autoritativo vuelve en la fila del historial de
// cobros (ver PaymentHistoryRow, issue #33). Por eso una resta con
// `Number()` acá es aceptable (es sólo indicación en pantalla, mismo
// criterio de "no replicar lógica de negocio" que adjustmentPreview.ts,
// pero sin persistir nada ni necesitar precisión de centavos exacta).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Button, Input, Label } from '@/shared/components'
import { formatMoney } from '@/shared/utils/format'
import {
  buildRegisterPaymentSchema,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_CURRENCY_OPTIONS,
  PAYMENT_DESTINATION_OPTIONS,
  PAYMENT_DESTINATION_LABELS,
  type RegisterPaymentInput,
} from '../schemas/payment.schema'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'

type Props = {
  contractCurrency: string
  suggestedInterest: string | null
  isPreviewLoading: boolean
  errorMessage: string | null
  isSubmitting: boolean
  onDateChange: (date: string) => void
  onSubmit: (values: RegisterPaymentInput) => void
}

export function RegisterPaymentForm({
  contractCurrency,
  suggestedInterest,
  isPreviewLoading,
  errorMessage,
  isSubmitting,
  onDateChange,
  onSubmit,
}: Props) {
  const [pendingSubmitValues, setPendingSubmitValues] = useState<RegisterPaymentInput | null>(
    null,
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterPaymentInput>({
    resolver: zodResolver(buildRegisterPaymentSchema(contractCurrency)),
    defaultValues: {
      payment_date: new Date().toISOString().slice(0, 10),
      method: 'cash',
      payment_currency: contractCurrency as RegisterPaymentInput['payment_currency'],
      amount: '',
      exchange_rate: '',
      destination: 'agency_account',
      charged_interest: '',
      notes: '',
    },
  })

  const paymentCurrency = watch('payment_currency')
  const chargedInterest = watch('charged_interest')
  const requiresExchangeRate = paymentCurrency !== contractCurrency

  const forgivenPreview =
    suggestedInterest && chargedInterest && !Number.isNaN(Number(chargedInterest))
      ? Math.max(0, Number(suggestedInterest) - Number(chargedInterest))
      : null

  const exceedsSuggested =
    suggestedInterest &&
    chargedInterest &&
    !Number.isNaN(Number(chargedInterest)) &&
    Number(chargedInterest) > Number(suggestedInterest)

  function handleFormSubmit(values: RegisterPaymentInput) {
    if (exceedsSuggested && !pendingSubmitValues) {
      setPendingSubmitValues(values)
      return
    }
    setPendingSubmitValues(null)
    onSubmit(values)
  }

  function fillSuggestedInterest() {
    if (suggestedInterest) setValue('charged_interest', suggestedInterest)
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
    >
      <h3 className="text-sm font-medium">Registrar cobro</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment-date">Fecha de pago</Label>
        <Input
          id="payment-date"
          type="date"
          aria-invalid={!!errors.payment_date}
          {...register('payment_date', {
            onChange: (event) => onDateChange(event.target.value),
          })}
        />
        {errors.payment_date ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.payment_date.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment-method">Medio</Label>
        <select id="payment-method" className={SELECT_CLASS} {...register('method')}>
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PAYMENT_METHOD_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment-currency">Moneda del pago</Label>
        <select id="payment-currency" className={SELECT_CLASS} {...register('payment_currency')}>
          {PAYMENT_CURRENCY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment-amount">Importe a capital ({contractCurrency})</Label>
        <Input id="payment-amount" aria-invalid={!!errors.amount} {...register('amount')} />
        {errors.amount ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.amount.message}
          </p>
        ) : null}
      </div>

      {requiresExchangeRate ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payment-exchange-rate">Tipo de cambio</Label>
          <Input
            id="payment-exchange-rate"
            aria-invalid={!!errors.exchange_rate}
            {...register('exchange_rate')}
          />
          {errors.exchange_rate ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.exchange_rate.message}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment-destination">Destino</Label>
        <select id="payment-destination" className={SELECT_CLASS} {...register('destination')}>
          {PAYMENT_DESTINATION_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {PAYMENT_DESTINATION_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
        <p className="text-xs text-muted-foreground">
          Interés sugerido al día de la fecha de pago (RN-P02/P03). Podés imputar el mismo valor,
          0 (perdón total) o un valor intermedio (perdón parcial) — el sistema registra los tres
          valores.
        </p>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Interés sugerido</span>
          <span data-testid="suggested-interest">
            {isPreviewLoading
              ? 'Calculando…'
              : suggestedInterest
                ? `${formatMoney(suggestedInterest)} ${contractCurrency}`
                : '—'}
          </span>
          {suggestedInterest ? (
            <button
              type="button"
              className="w-fit text-xs font-medium text-primary underline-offset-4 hover:underline"
              onClick={fillSuggestedInterest}
            >
              Usar el sugerido
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="payment-charged-interest">Interés cobrado</Label>
          <Input
            id="payment-charged-interest"
            aria-invalid={!!errors.charged_interest}
            {...register('charged_interest')}
          />
          {errors.charged_interest ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.charged_interest.message}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Interés perdonado (estimado)</span>
          <span data-testid="forgiven-interest-preview">
            {forgivenPreview !== null ? `${formatMoney(String(forgivenPreview))} ${contractCurrency}` : '—'}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="payment-notes">Notas</Label>
        <Input id="payment-notes" {...register('notes')} />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {pendingSubmitValues ? (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/40 p-3">
          <p className="text-sm font-medium">
            El interés cobrado ({formatMoney(pendingSubmitValues.charged_interest)}) supera al
            sugerido ({suggestedInterest ? formatMoney(suggestedInterest) : '—'}). ¿Confirmás
            igual?
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                const values = pendingSubmitValues
                setPendingSubmitValues(null)
                onSubmit(values)
              }}
            >
              Confirmar interés cobrado
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => setPendingSubmitValues(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Registrando…' : 'Registrar cobro'}
          </Button>
        </div>
      )}
    </form>
  )
}
