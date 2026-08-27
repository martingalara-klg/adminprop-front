// src/modules/properties/components/PropertyForm.tsx
//
// RF-01 + CA-01-01: alta con dirección (obligatoria), propietario
// (obligatorio, FK a landlords) y tipo.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Button, Input, Label } from '@/shared/components'
import type { LandlordSummary } from '@/api/people.api'
import type { NeighborhoodDetail } from '@/api/neighborhoods.api'
import {
  createPropertySchema,
  PROPERTY_TYPE_OPTIONS,
  type CreatePropertyInput,
} from '../schemas/property.schema'

type Props = {
  landlords: LandlordSummary[]
  neighborhoods: NeighborhoodDetail[]
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreatePropertyInput) => void
}

export function PropertyForm({
  landlords,
  neighborhoods,
  errorMessage,
  isSubmitting,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePropertyInput>({
    resolver: zodResolver(createPropertySchema),
    defaultValues: {
      address: '',
      landlord_id: '',
      neighborhood_id: '',
      property_type: 'departamento',
      notes: '',
    },
  })

  // issue #99/#49: catálogo vacío — guiar al usuario a crear un barrio
  // primero en vez de mostrar un select sin opciones (decisión de
  // implementación, ver PR): el submit queda bloqueado igual porque Zod
  // exige `neighborhood_id` no vacío.
  const hasNeighborhoods = neighborhoods.length > 0

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
        <Label htmlFor="property-neighborhood">Barrio</Label>
        {hasNeighborhoods ? (
          <>
            <select
              id="property-neighborhood"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              aria-invalid={!!errors.neighborhood_id}
              {...register('neighborhood_id')}
            >
              <option value="">Seleccioná un barrio…</option>
              {neighborhoods.map((neighborhood) => (
                <option key={neighborhood.id} value={neighborhood.id}>
                  {neighborhood.name}
                </option>
              ))}
            </select>
            {errors.neighborhood_id ? (
              <p className="text-sm text-destructive" role="alert">
                {errors.neighborhood_id.message}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground" data-testid="property-no-neighborhoods">
            Todavía no hay barrios cargados.{' '}
            <Link to="/properties/neighborhoods" className="font-medium underline-offset-4 hover:underline">
              Creá un barrio primero
            </Link>
            .
          </p>
        )}
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
        <Button type="submit" disabled={isSubmitting || !hasNeighborhoods}>
          {isSubmitting ? 'Creando…' : 'Crear propiedad'}
        </Button>
      </div>
    </form>
  )
}
