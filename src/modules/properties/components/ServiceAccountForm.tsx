// src/modules/properties/components/ServiceAccountForm.tsx
//
// RF-02 + CA-01-02: carga de una cuenta de servicio. El caso `luz` usa
// ambos números (n° de cliente en `account_number` + n° de contrato en
// `secondary_number`), como los registra la distribuidora.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import {
  createServiceAccountSchema,
  SERVICE_TYPE_OPTIONS,
  SERVICE_TYPE_LABELS,
  type CreateServiceAccountInput,
} from '../schemas/property.schema'

type Props = {
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreateServiceAccountInput) => void
}

export function ServiceAccountForm({ errorMessage, isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateServiceAccountInput>({
    resolver: zodResolver(createServiceAccountSchema),
    defaultValues: {
      service_type: 'rentas',
      account_number: '',
      secondary_number: '',
      notes: '',
    },
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
      <h3 className="text-sm font-medium">Nueva cuenta de servicio</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="service-account-type">Tipo de servicio</Label>
        <select
          id="service-account-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          {...register('service_type')}
        >
          {SERVICE_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SERVICE_TYPE_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="service-account-number">N° de cuenta / cliente</Label>
        <Input
          id="service-account-number"
          aria-invalid={!!errors.account_number}
          {...register('account_number')}
        />
        {errors.account_number ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.account_number.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="service-account-secondary">N° de contrato (opcional — ej: luz)</Label>
        <Input id="service-account-secondary" {...register('secondary_number')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="service-account-notes">Notas</Label>
        <Input id="service-account-notes" {...register('notes')} />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Agregar cuenta'}
        </Button>
      </div>
    </form>
  )
}
