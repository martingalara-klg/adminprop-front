// src/modules/people/components/RenterForm.tsx
//
// RF-03: alta de inquilino (nombre obligatorio, DNI/CUIT/teléfono/email/
// notas opcionales).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { createRenterSchema, type CreateRenterInput } from '../schemas/people.schema'

type Props = {
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreateRenterInput) => void
}

export function RenterForm({ errorMessage, isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateRenterInput>({
    resolver: zodResolver(createRenterSchema),
    defaultValues: { name: '', tax_id: '', phone: '', email: '', notes: '' },
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
      <h3 className="text-sm font-medium">Nuevo inquilino</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renter-name">Nombre</Label>
        <Input id="renter-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renter-tax-id">CUIT/DNI</Label>
        <Input id="renter-tax-id" aria-invalid={!!errors.tax_id} {...register('tax_id')} />
        {errors.tax_id ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.tax_id.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renter-phone">Teléfono</Label>
        <Input id="renter-phone" {...register('phone')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renter-email">Email</Label>
        <Input
          id="renter-email"
          type="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renter-notes">Notas</Label>
        <Input id="renter-notes" {...register('notes')} />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear inquilino'}
        </Button>
      </div>
    </form>
  )
}
