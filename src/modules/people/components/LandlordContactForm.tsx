// src/modules/people/components/LandlordContactForm.tsx
//
// RF-01 + CA-02-02: edición de datos de contacto — owner Y admin pueden
// usar este form (ninguno de estos campos requiere `landlord:set-
// commission`). `commission_pct` NUNCA está en este schema/payload, así
// que un `admin` jamás lo envía por accidente desde acá.
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import type { LandlordDetail } from '@/api/people.api'
import {
  updateLandlordContactSchema,
  type UpdateLandlordContactInput,
} from '../schemas/people.schema'

type Props = {
  landlord: LandlordDetail
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: UpdateLandlordContactInput) => void
  // Issue #66: presente cuando el form vive dentro de un EditableSection.
  onCancel?: () => void
}

export function LandlordContactForm({
  landlord,
  errorMessage,
  isSubmitting,
  onSubmit,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateLandlordContactInput>({
    resolver: zodResolver(updateLandlordContactSchema),
    defaultValues: {
      name: landlord.name,
      tax_id: landlord.tax_id ?? '',
      phone: landlord.phone ?? '',
      email: landlord.email ?? '',
      bank_info: landlord.bank_info ?? '',
      notes: landlord.notes ?? '',
    },
  })

  // El detalle puede llegar después del primer render (query async) —
  // resincroniza el form cuando cambia el propietario cargado.
  useEffect(() => {
    reset({
      name: landlord.name,
      tax_id: landlord.tax_id ?? '',
      phone: landlord.phone ?? '',
      email: landlord.email ?? '',
      bank_info: landlord.bank_info ?? '',
      notes: landlord.notes ?? '',
    })
  }, [landlord, reset])

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <h3 className="text-sm font-medium">Datos de contacto</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-edit-name">Nombre</Label>
        <Input id="landlord-edit-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-edit-tax-id">CUIT/DNI</Label>
        <Input id="landlord-edit-tax-id" aria-invalid={!!errors.tax_id} {...register('tax_id')} />
        {errors.tax_id ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.tax_id.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-edit-phone">Teléfono</Label>
        <Input id="landlord-edit-phone" {...register('phone')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-edit-email">Email</Label>
        <Input
          id="landlord-edit-email"
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
        <Label htmlFor="landlord-edit-bank-info">Datos bancarios (CBU)</Label>
        <Input id="landlord-edit-bank-info" placeholder="CBU / alias" {...register('bank_info')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-edit-notes">Notas</Label>
        <Input id="landlord-edit-notes" {...register('notes')} />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : 'Guardar datos de contacto'}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  )
}
