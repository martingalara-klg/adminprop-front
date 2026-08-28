// src/modules/contracts/components/ContractForm.tsx
//
// RF-02 + CA-03-01/02/03: alta de contrato ARS/USD. RN-C: USD no ajusta
// — el form oculta dinámicamente frecuencia/índice/notas cuando la
// moneda elegida es USD (no sólo los deshabilita: no se muestran).
//
// Issue #50 (espejo de back#100, RN-08/RN-C06): toggle "El contrato ya
// está en curso" — despliega `current_amount` (monto vigente hoy) +
// `current_amount_since` (mes desde el que rige). Aplica a ARS y USD por
// igual (CA-03-13) — vive fuera del bloque condicional de ajuste ARS.
//
// Issue #57 (espejo de back#107, RN-C06 v2): cuando el contrato es ARS
// y tiene `adjustment_frequency_months`, el toggle "en curso" pasa a
// pedir un `MoneyInput` POR CADA TRAMO transcurrido (`historical_amounts[]`)
// en vez del único `current_amount`/`current_amount_since` de #50 — ese
// mecanismo sigue vigente sólo cuando no hay frecuencia (USD, o ARS sin
// ajuste periódico).
import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label, MoneyInput } from '@/shared/components'
import type { PropertySummary } from '@/api/properties.api'
import type { RenterDetail } from '@/api/people.api'
import {
  createContractSchema,
  ADJUSTMENT_INDEX_OPTIONS,
  ADJUSTMENT_INDEX_LABELS,
  type CreateContractInput,
} from '../schemas/contract.schema'
import { computeHistoricalAmountTramos } from '../utils/historicalAmountTramos'

type Props = {
  properties: PropertySummary[]
  renters: RenterDetail[]
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreateContractInput) => void
  /**
   * Issue #50 — error field-level del backend (`VALIDATION_ERROR` /
   * `INVALID_DATE_RANGE` con `error.field`, sdd_03 §8) a mapear como
   * error inline de React Hook Form (error-handling.md §"Field-level").
   */
  serverFieldError?: { field: string; message: string } | null
}

export function ContractForm({
  properties,
  renters,
  errorMessage,
  isSubmitting,
  onSubmit,
  serverFieldError,
}: Props) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<CreateContractInput>({
    resolver: zodResolver(createContractSchema),
    defaultValues: {
      property_id: '',
      renter_id: '',
      currency: 'ARS',
      initial_amount: '',
      start_date: '',
      end_date: '',
      daily_late_fee_pct: '',
      adjustment_frequency_months: '',
      adjustment_index: '',
      adjustment_index_notes: '',
      notes: '',
      is_in_progress: false,
      current_amount: '',
      current_amount_since: '',
      historical_amounts: [],
    },
  })

  const currency = watch('currency')
  const adjustmentIndex = watch('adjustment_index')
  const isInProgress = watch('is_in_progress')
  const startDate = watch('start_date')
  const adjustmentFrequencyMonths = watch('adjustment_frequency_months')
  const isArs = currency === 'ARS'

  // Issue #57 — RN-C06 v2: sólo ARS con frecuencia usa tramos; el resto
  // (USD siempre, ARS sin frecuencia) sigue con current_amount/since (#50).
  const parsedFrequency = Number(adjustmentFrequencyMonths)
  const usesTramos =
    isArs && !!adjustmentFrequencyMonths && Number.isInteger(parsedFrequency) && parsedFrequency > 0
  const tramos = usesTramos ? computeHistoricalAmountTramos(startDate, parsedFrequency) : []

  useEffect(() => {
    if (!serverFieldError) return
    setError(serverFieldError.field as keyof CreateContractInput, {
      type: 'server',
      message: serverFieldError.message,
    })
  }, [serverFieldError, setError])

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit((values) => {
        onSubmit(values)
        reset()
      })}
      noValidate
    >
      <h3 className="text-sm font-medium">Nuevo contrato</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-property">Propiedad</Label>
        <select
          id="contract-property"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          aria-invalid={!!errors.property_id}
          {...register('property_id')}
        >
          <option value="">Seleccioná una propiedad…</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.address}
            </option>
          ))}
        </select>
        {errors.property_id ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.property_id.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-renter">Inquilino</Label>
        <select
          id="contract-renter"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          aria-invalid={!!errors.renter_id}
          {...register('renter_id')}
        >
          <option value="">Seleccioná un inquilino…</option>
          {renters.map((renter) => (
            <option key={renter.id} value={renter.id}>
              {renter.name}
            </option>
          ))}
        </select>
        {errors.renter_id ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.renter_id.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-currency">Moneda</Label>
        <select
          id="contract-currency"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          {...register('currency')}
        >
          <option value="ARS">ARS</option>
          <option value="USD">USD</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-initial-amount">Monto inicial</Label>
        <Controller
          control={control}
          name="initial_amount"
          render={({ field }) => (
            <MoneyInput
              id="contract-initial-amount"
              aria-invalid={!!errors.initial_amount}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {errors.initial_amount ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.initial_amount.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-start-date">Fecha de inicio</Label>
        <Input
          id="contract-start-date"
          type="date"
          aria-invalid={!!errors.start_date}
          {...register('start_date')}
        />
        {errors.start_date ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.start_date.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-end-date">Fecha de fin</Label>
        <Input
          id="contract-end-date"
          type="date"
          aria-invalid={!!errors.end_date}
          {...register('end_date')}
        />
        {errors.end_date ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.end_date.message}
          </p>
        ) : null}
      </div>

      {/* Issue #50 (espejo de back#100, RN-08/RN-C06): alta de contrato
          en curso — aplica a ARS y USD por igual (CA-03-13), vive fuera
          del bloque condicional de ajuste ARS. */}
      <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
        <div className="flex items-center gap-2">
          <input
            id="contract-is-in-progress"
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            {...register('is_in_progress')}
          />
          <Label htmlFor="contract-is-in-progress">El contrato ya está en curso</Label>
        </div>

        {isInProgress && usesTramos ? (
          tramos.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                El sistema completa el historial con estos valores, uno por cada tramo ya
                transcurrido desde el inicio. El próximo aumento se va a pedir normalmente al
                cumplirse el siguiente tramo.
              </p>
              {tramos.map((tramo) => (
                <div className="flex flex-col gap-1.5" key={tramo.index}>
                  <Label htmlFor={`contract-historical-amount-${tramo.index}`}>
                    {tramo.label}
                  </Label>
                  <Controller
                    control={control}
                    name={`historical_amounts.${tramo.index}`}
                    render={({ field }) => (
                      <MoneyInput
                        id={`contract-historical-amount-${tramo.index}`}
                        aria-invalid={!!errors.historical_amounts?.[tramo.index]}
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                      />
                    )}
                  />
                  {errors.historical_amounts?.[tramo.index] ? (
                    <p className="text-sm text-destructive" role="alert">
                      {errors.historical_amounts[tramo.index]?.message}
                    </p>
                  ) : null}
                </div>
              ))}
              {/* Error field-level del backend en el campo raíz (`error.field: "historical_amounts"`,
                  ej: cantidad de tramos incorrecta, sdd_03 §8) — no ligado a un tramo puntual. */}
              {typeof (errors.historical_amounts as unknown as { message?: string })?.message ===
              'string' ? (
                <p className="text-sm text-destructive" role="alert">
                  {(errors.historical_amounts as unknown as { message?: string }).message}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              El contrato recién empezó — no hay tramos anteriores que declarar. Se da de alta
              como un contrato nuevo normal.
            </p>
          )
        ) : null}

        {isInProgress && !usesTramos ? (
          <>
            <p className="text-xs text-muted-foreground">
              El mes actual nace con este monto vigente; el próximo aumento por índice se
              cuenta desde esta fecha, no desde el inicio del contrato.
            </p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-current-amount">Monto vigente hoy</Label>
              <Controller
                control={control}
                name="current_amount"
                render={({ field }) => (
                  <MoneyInput
                    id="contract-current-amount"
                    aria-invalid={!!errors.current_amount}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              {errors.current_amount ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.current_amount.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-current-amount-since">Desde cuándo rige</Label>
              <Input
                id="contract-current-amount-since"
                type="month"
                aria-invalid={!!errors.current_amount_since}
                {...register('current_amount_since')}
              />
              {errors.current_amount_since ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.current_amount_since.message}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-late-fee">% de mora diaria</Label>
        <Input
          id="contract-late-fee"
          aria-invalid={!!errors.daily_late_fee_pct}
          {...register('daily_late_fee_pct')}
        />
        {errors.daily_late_fee_pct ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.daily_late_fee_pct.message}
          </p>
        ) : null}
      </div>

      {/* RN-C — USD no ajusta: sólo ARS ofrece frecuencia/índice de ajuste. */}
      {isArs ? (
        <div className="flex flex-col gap-3 rounded-md border border-dashed p-3">
          <p className="text-xs text-muted-foreground">
            Ajuste por índice (informativo — decisión #101: el % siempre se ingresa manualmente).
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-adjustment-frequency">Frecuencia de ajuste (meses)</Label>
            <Input
              id="contract-adjustment-frequency"
              aria-invalid={!!errors.adjustment_frequency_months}
              {...register('adjustment_frequency_months')}
            />
            {errors.adjustment_frequency_months ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.adjustment_frequency_months.message}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-adjustment-index">Índice de referencia</Label>
            <select
              id="contract-adjustment-index"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              aria-invalid={!!errors.adjustment_index}
              {...register('adjustment_index')}
            >
              <option value="">Sin índice…</option>
              {ADJUSTMENT_INDEX_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {ADJUSTMENT_INDEX_LABELS[option]}
                </option>
              ))}
            </select>
            {errors.adjustment_index ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.adjustment_index.message}
              </p>
            ) : null}
          </div>

          {adjustmentIndex === 'otro' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-adjustment-notes">Notas del índice</Label>
              <Input
                id="contract-adjustment-notes"
                aria-invalid={!!errors.adjustment_index_notes}
                {...register('adjustment_index_notes')}
              />
              {errors.adjustment_index_notes ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.adjustment_index_notes.message}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Los contratos en USD no tienen frecuencia ni índice de ajuste (RN-03).
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-notes">Notas</Label>
        <Input id="contract-notes" {...register('notes')} />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear contrato'}
        </Button>
      </div>
    </form>
  )
}
