// src/modules/maintenance/components/QuoteForm.tsx
//
// RF-02/CA-06-02: el encargado (o admin) sube una cotización — monto,
// descripción, fotos.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { PhotoPicker } from './PhotoPicker'
import { quoteSchema, type QuoteInput } from '../schemas/maintenance.schema'

type Props = {
  files: File[]
  onFilesChange: (files: File[]) => void
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: QuoteInput) => void
}

export function QuoteForm({ files, onFilesChange, errorMessage, isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<QuoteInput>({
    resolver: zodResolver(quoteSchema),
    defaultValues: { amount: '', description: '' },
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit((values) => {
        onSubmit(values)
        reset()
      })}
      noValidate
    >
      <h3 className="text-sm font-medium">Cargar cotización</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quote-amount">Monto</Label>
        <Input id="quote-amount" aria-invalid={!!errors.amount} {...register('amount')} />
        {errors.amount ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.amount.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="quote-description">Notas</Label>
        <Input id="quote-description" {...register('description')} />
      </div>

      <PhotoPicker
        files={files}
        onChange={onFilesChange}
        disabled={isSubmitting}
        label="Fotos de la cotización (opcional)"
      />

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando…' : 'Cargar cotización'}
        </Button>
      </div>
    </form>
  )
}
