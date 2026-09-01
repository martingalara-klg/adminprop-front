// src/modules/contracts/components/ContractForm.tsx
//
// RF-02 + CA-03-01/02/03: alta de contrato ARS/USD. RN-C: USD no ajusta
// — el form oculta dinámicamente frecuencia/índice/notas cuando la
// moneda elegida es USD (no sólo los deshabilita: no se muestran).
//
// Issue #50 (espejo de back#100, RN-08/RN-C06): alta de contrato en curso
// con `current_amount` (monto vigente hoy) + `current_amount_since` (mes
// desde el que rige) — mecanismo vigente sólo cuando NO hay frecuencia
// de ajuste (USD siempre; ARS sin ajuste periódico).
//
// Issue #57 (espejo de back#107, RN-C06 v2): cuando el contrato es ARS
// y tiene `adjustment_frequency_months`, el alta en curso pide un
// `MoneyInput` POR CADA TRAMO transcurrido (`historical_amounts[]`).
//
// Issue #69 (feedback #3 del PO — ronda 3):
//   1. El select de propiedades NO permite elegir una propiedad con
//      contrato activo (`status === 'rented'`): la opción queda
//      deshabilitada con la leyenda "Con contrato". El back ya rechaza el
//      solapamiento (409 CONTRACT_OVERLAP) — la UI lo previene.
//   2. La frecuencia de ajuste (e índice) va ANTES de la sección de
//      contrato en curso: el cálculo de tramos depende de ella.
//   3. "En curso" se detecta AUTOMÁTICAMENTE (sin checkbox): mes de
//      `start_date` anterior al mes actual. Con frecuencia, se piden los
//      tramos transcurridos a partir del segundo (el "Monto inicial" ES el
//      tramo 1 — no se vuelve a pedir); sin tramos transcurridos, sólo una
//      nota informativa. Sin frecuencia cargada (ARS), la sección indica
//      completarla primero.
//   4. Labels de tramo: "Valor locativo (mes – mes)" (es-AR).
import { useEffect } from 'react'
import type { ClipboardEvent, KeyboardEvent } from 'react'
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
import {
  computeHistoricalAmountTramos,
  formatMonthLong,
  isContractInProgress,
} from '../utils/historicalAmountTramos'

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

/** Issue #69: leyenda de la opción deshabilitada para propiedades con contrato activo. */
export const PROPERTY_RENTED_LEGEND = 'Con contrato'

// Issue #69/#119 (RN-11): al dar de alta un contrato en curso el backend
// genera automáticamente los períodos de los meses transcurridos como
// cobrados (`origin: initial_load`) — se le informa al operador.
const INITIAL_LOAD_NOTE =
  'Los meses ya transcurridos se registran automáticamente como cobrados; el mes actual nace pendiente.'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
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
    watch,
    setError,
    setValue,
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
      current_amount: '',
      current_amount_since: '',
      historical_amounts: [],
    },
  })

  const currency = watch('currency')
  const adjustmentIndex = watch('adjustment_index')
  const startDate = watch('start_date')
  const adjustmentFrequencyMonths = watch('adjustment_frequency_months')
  const isArs = currency === 'ARS'

  // Issue #69: "en curso" automático — mes de inicio anterior al actual.
  const isInProgress = isContractInProgress(startDate)

  // Issue #57 — RN-C06 v2: sólo ARS con frecuencia usa tramos; el resto
  // (USD siempre, ARS sin frecuencia) sigue con current_amount/since (#50).
  const parsedFrequency = Number(adjustmentFrequencyMonths)
  const usesTramos =
    isArs && !!adjustmentFrequencyMonths && Number.isInteger(parsedFrequency) && parsedFrequency > 0
  const allTramos =
    isInProgress && usesTramos ? computeHistoricalAmountTramos(startDate, parsedFrequency) : []
  // Issue #69: el tramo 0 es el "Monto inicial" — sólo se piden los siguientes.
  const initialTramo = allTramos[0]
  const pendingTramos = allTramos.slice(1)

  useEffect(() => {
    if (!serverFieldError) return
    setError(serverFieldError.field as keyof CreateContractInput, {
      type: 'server',
      message: serverFieldError.message,
    })
  }, [serverFieldError, setError])

  const historicalRootError = (errors.historical_amounts as unknown as { message?: string })
    ?.message

  // Issue #84: la frecuencia de ajuste es un entero (meses) — además de
  // la validación Zod, la UX impide tipear/pegar caracteres no numéricos.
  function handleFrequencyKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // No interceptar atajos (Ctrl/Cmd+C/V/A/Z…) ni teclas de control
    // (Backspace, Tab, flechas… — todas con `key.length > 1`).
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (event.key.length === 1 && !/[0-9]/.test(event.key)) {
      event.preventDefault()
    }
  }

  function handleFrequencyPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData('text')
    if (/^[0-9]*$/.test(pasted)) return
    // Pegado con caracteres no numéricos: se filtran y sólo se insertan
    // los dígitos (en la posición del cursor / reemplazando la selección).
    event.preventDefault()
    const digits = pasted.replace(/[^0-9]/g, '')
    if (!digits) return
    const el = event.currentTarget
    const start = el.selectionStart ?? el.value.length
    const end = el.selectionEnd ?? el.value.length
    const nextValue = el.value.slice(0, start) + digits + el.value.slice(end)
    setValue('adjustment_frequency_months', nextValue, {
      shouldDirty: true,
      shouldValidate: false,
    })
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      // Issue #57: NO resetear acá incondicionalmente — `onSubmit` es
      // fire-and-forget (`mutate`, no `mutateAsync`), así que un reset
      // inmediato borraba el form ANTES de que el backend responda,
      // ocultando errores de campo inline. El padre (ContractsListPage)
      // cierra el modal en `onSuccess`, lo que ya desmonta/reinicia este
      // form — no hace falta duplicarlo acá.
      onSubmit={handleSubmit((values) => {
        onSubmit(values)
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
          {properties.map((property) => {
            // Issue #69: una propiedad con contrato activo no es elegible.
            const isRented = property.status === 'rented'
            return (
              <option key={property.id} value={property.id} disabled={isRented}>
                {isRented ? `${property.address} — ${PROPERTY_RENTED_LEGEND}` : property.address}
              </option>
            )
          })}
        </select>
        <FieldError message={errors.property_id?.message} />
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
        <FieldError message={errors.renter_id?.message} />
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
        <FieldError message={errors.initial_amount?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-start-date">Fecha de inicio</Label>
        <Input
          id="contract-start-date"
          type="date"
          aria-invalid={!!errors.start_date}
          {...register('start_date')}
        />
        <FieldError message={errors.start_date?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-end-date">Fecha de fin</Label>
        <Input
          id="contract-end-date"
          type="date"
          aria-invalid={!!errors.end_date}
          {...register('end_date')}
        />
        <FieldError message={errors.end_date?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-late-fee">% de mora diaria</Label>
        <Input
          id="contract-late-fee"
          aria-invalid={!!errors.daily_late_fee_pct}
          {...register('daily_late_fee_pct')}
        />
        <FieldError message={errors.daily_late_fee_pct?.message} />
      </div>

      {/* RN-C — USD no ajusta: sólo ARS ofrece frecuencia/índice de ajuste.
          Issue #69: va ANTES de la sección "en curso" (los tramos dependen
          de la frecuencia). */}
      {isArs ? (
        <div
          className="flex flex-col gap-3 rounded-md border border-dashed p-3"
          data-testid="contract-adjustment-section"
        >
          <p className="text-xs text-muted-foreground">
            Ajuste por índice (informativo — decisión #101: el % siempre se ingresa manualmente).
          </p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-adjustment-frequency">Frecuencia de ajuste (meses)</Label>
            <Input
              id="contract-adjustment-frequency"
              inputMode="numeric"
              aria-invalid={!!errors.adjustment_frequency_months}
              onKeyDown={handleFrequencyKeyDown}
              onPaste={handleFrequencyPaste}
              {...register('adjustment_frequency_months')}
            />
            <FieldError message={errors.adjustment_frequency_months?.message} />
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
            <FieldError message={errors.adjustment_index?.message} />
          </div>

          {adjustmentIndex === 'otro' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contract-adjustment-notes">Notas del índice</Label>
              <Input
                id="contract-adjustment-notes"
                aria-invalid={!!errors.adjustment_index_notes}
                {...register('adjustment_index_notes')}
              />
              <FieldError message={errors.adjustment_index_notes?.message} />
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Los contratos en USD no tienen frecuencia ni índice de ajuste (RN-03).
        </p>
      )}

      {/* Issue #69: sección "Contrato en curso" — sólo aparece cuando el
          mes de inicio es anterior al actual (detección automática, sin
          checkbox). Un alta que arranca este mes no la muestra. */}
      {isInProgress ? (
        <div
          className="flex flex-col gap-3 rounded-md border border-dashed p-3"
          data-testid="contract-in-progress-section"
        >
          <p className="text-sm font-medium">
            Contrato en curso desde {formatMonthLong(startDate)}
          </p>

          {isArs && !usesTramos ? (
            <p className="text-xs text-muted-foreground">
              Completá primero la frecuencia de ajuste para calcular los aumentos transcurridos.
              Si el contrato no tiene ajuste periódico, podés declarar el monto vigente hoy
              (opcional).
            </p>
          ) : null}

          {usesTramos && pendingTramos.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Sin aumentos transcurridos: el monto inicial sigue vigente. {INITIAL_LOAD_NOTE}
            </p>
          ) : null}

          {usesTramos && pendingTramos.length > 0 ? (
            <>
              <p className="text-xs text-muted-foreground">
                El monto inicial es el valor locativo del primer tramo ({initialTramo?.range}).
                Ingresá el valor locativo de cada tramo posterior ya transcurrido; el próximo
                aumento se va a pedir normalmente al cumplirse el siguiente tramo.{' '}
                {INITIAL_LOAD_NOTE}
              </p>
              {pendingTramos.map((tramo) => (
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
                  <FieldError message={errors.historical_amounts?.[tramo.index]?.message} />
                </div>
              ))}
              {/* Error field-level del backend en el campo raíz (`error.field: "historical_amounts"`,
                  ej: cantidad de tramos incorrecta, sdd_03 §8) — no ligado a un tramo puntual. */}
              <FieldError
                message={typeof historicalRootError === 'string' ? historicalRootError : undefined}
              />
            </>
          ) : null}

          {!usesTramos ? (
            <>
              {!isArs ? (
                <p className="text-xs text-muted-foreground">
                  Si el monto cambió desde el inicio, declará el monto vigente hoy y desde
                  cuándo rige (opcional). {INITIAL_LOAD_NOTE}
                </p>
              ) : null}

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
                <FieldError message={errors.current_amount?.message} />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="contract-current-amount-since">Desde cuándo rige</Label>
                <Input
                  id="contract-current-amount-since"
                  type="month"
                  aria-invalid={!!errors.current_amount_since}
                  {...register('current_amount_since')}
                />
                <FieldError message={errors.current_amount_since?.message} />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contract-notes">Notas</Label>
        <Input id="contract-notes" {...register('notes')} />
      </div>

      <FieldError message={errorMessage ?? undefined} />

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear contrato'}
        </Button>
      </div>
    </form>
  )
}
