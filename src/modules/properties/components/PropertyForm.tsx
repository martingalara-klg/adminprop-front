// src/modules/properties/components/PropertyForm.tsx
//
// RF-01 + CA-01-01: alta con dirección (obligatoria), propietario
// (obligatorio, FK a landlords) y tipo.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import type { LandlordSummary } from '@/api/people.api'
import {
  createPropertySchema,
  PROPERTY_TYPE_OPTIONS,
  type CreatePropertyInput,
} from '../schemas/property.schema'

type Props = {
  landlords: LandlordSummary[]
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreatePropertyInput) => void
}

export function PropertyForm({ landlords, errorMessage, isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: { address: '', landlord_id: '', property_type: 'departamento', notes: '' },
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
      <h3 className="text-sm font-medium">Nueva propiedad</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property-address">Dirección</Label>
        <Input id="property-address" aria-invalid={!!errors.address} {...register('address')} />
        {errors.address ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.address.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property-landlord">Propietario</Label>
        <select
          id="property-landlord"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          aria-invalid={!!errors.landlord_id}
          {...register('landlord_id')}
        >
          <option value="">Seleccioná un propietario…</option>
          {landlords.map((landlord) => (
            <option key={landlord.id} value={landlord.id}>
              {landlord.name}
            </option>
          ))}
        </select>
        {errors.landlord_id ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.landlord_id.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property-type">Tipo</Label>
        <select
          id="property-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          {...register('property_type')}
        >
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property-notes">Notas</Label>
        <Input id="property-notes" {...register('notes')} />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear propiedad'}
        </Button>
      </div>
    </form>
  )
}
