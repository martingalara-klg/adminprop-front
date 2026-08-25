// src/modules/people/components/RenterContactForm.tsx
//
// RF-03: edición de datos de contacto del inquilino.
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import type { RenterDetail } from '@/api/people.api'
import { updateRenterSchema, type UpdateRenterInput } from '../schemas/people.schema'

type Props = {
  renter: RenterDetail
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: UpdateRenterInput) => void
}

export function RenterContactForm({ renter, errorMessage, isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateRenterInput>({
    resolver: zodResolver(updateRenterSchema),
    defaultValues: {
      name: renter.name,
      tax_id: renter.tax_id ?? '',
      phone: renter.phone ?? '',
      email: renter.email ?? '',
      notes: renter.notes ?? '',
    },
  })

  useEffect(() => {
    reset({
      name: renter.name,
      tax_id: renter.tax_id ?? '',
      phone: renter.phone ?? '',
      email: renter.email ?? '',
      notes: renter.notes ?? '',
    })
  }, [renter, reset])

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <h3 className="text-sm font-medium">Datos de contacto</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renter-edit-name">Nombre</Label>
        <Input id="renter-edit-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renter-edit-tax-id">CUIT/DNI</Label>
        <Input id="renter-edit-tax-id" aria-invalid={!!errors.tax_id} {...register('tax_id')} />
        {errors.tax_id ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.tax_id.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renter-edit-phone">Teléfono</Label>
        <Input id="renter-edit-phone" {...register('phone')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="renter-edit-email">Email</Label>
        <Input
          id="renter-edit-email"
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
        <Label htmlFor="renter-edit-notes">Notas</Label>
        <Input id="renter-edit-notes" {...register('notes')} />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar datos de contacto'}
        </Button>
      </div>
    </form>
  )
}
