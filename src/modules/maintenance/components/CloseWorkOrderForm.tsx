// src/modules/maintenance/components/CloseWorkOrderForm.tsx
//
// RF-04/CA-06-04: el encargado (o admin) marca el trabajo terminado con
// fotos del resultado (opcional) y `final_cost` ajustable (default: el
// monto de la cotización aprobada — si se deja vacío, el backend
// resuelve el default).
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Label, MoneyInput } from '@/shared/components'
import { PhotoPicker } from './PhotoPicker'
import { formatMoney } from '@/shared/utils/format'
import { closeWorkOrderSchema, type CloseWorkOrderInput } from '../schemas/maintenance.schema'

type Props = {
  approvedQuoteAmount: string | null
  files: File[]
  onFilesChange: (files: File[]) => void
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CloseWorkOrderInput) => void
}

export function CloseWorkOrderForm({
  approvedQuoteAmount,
  files,
  onFilesChange,
  errorMessage,
  isSubmitting,
  onSubmit,
}: Props) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CloseWorkOrderInput>({
    resolver: zodResolver(closeWorkOrderSchema),
    defaultValues: { final_cost: '' },
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <h3 className="text-sm font-medium">Marcar terminado</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="close-final-cost">
          Costo final {approvedQuoteAmount ? `(default: ${formatMoney(approvedQuoteAmount)})` : ''}
        </Label>
        <Controller
          control={control}
          name="final_cost"
          render={({ field }) => (
            <MoneyInput
              id="close-final-cost"
              placeholder={approvedQuoteAmount ? formatMoney(approvedQuoteAmount) : undefined}
              aria-invalid={!!errors.final_cost}
              value={field.value ?? ''}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        {errors.final_cost ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.final_cost.message}
          </p>
        ) : null}
      </div>

      <PhotoPicker
        files={files}
        onChange={onFilesChange}
        disabled={isSubmitting}
        label="Fotos del resultado (opcional)"
      />

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Marcar terminado'}
        </Button>
      </div>
    </form>
  )
}
