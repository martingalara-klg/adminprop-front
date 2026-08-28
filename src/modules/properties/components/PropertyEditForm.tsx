// src/modules/properties/components/PropertyEditForm.tsx
//
// RF-01: edición de todos los campos salvo el estado `rented` (derivado
// — RF-04). El select de estado solo ofrece los 2 valores manuales.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router-dom'
import { Button, Input, Label } from '@/shared/components'
import type { LandlordSummary } from '@/api/people.api'
import type { NeighborhoodDetail } from '@/api/neighborhoods.api'
import type { PropertyDetail } from '@/api/properties.api'
import { propertyTypeLabel } from '@/shared/utils/propertyType'
import {
  updatePropertySchema,
  PROPERTY_TYPE_OPTIONS,
  MANUAL_PROPERTY_STATUS_OPTIONS,
  type UpdatePropertyInput,
} from '../schemas/property.schema'

const STATUS_LABELS: Record<string, string> = {
  available: 'Disponible',
  unavailable: 'No disponible',
}

type Props = {
  property: PropertyDetail
  landlords: LandlordSummary[]
  neighborhoods: NeighborhoodDetail[]
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: UpdatePropertyInput) => void
}

export function PropertyEditForm({
  property,
  landlords,
  neighborhoods,
  errorMessage,
  isSubmitting,
  onSubmit,
}: Props) {
  const isRented = property.status === 'rented'
  // issue #99/#49: propiedades legacy (preexistentes) pueden no tener
  // barrio — `neighborhood_id` es `string | null`. El schema exige un
  // valor no vacío al guardar (CA-01-08 también aplica a edición).
  const hasNeighborhoods = neighborhoods.length > 0

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePropertyInput>({
    resolver: zodResolver(updatePropertySchema),
    defaultValues: {
      address: property.address,
      landlord_id: property.landlord_id,
      neighborhood_id: property.neighborhood_id ?? '',
      property_type: property.property_type,
      // RF-04: `rented` es derivado — el form nunca lo ofrece; si la
      // propiedad está `rented`, el select queda en `available` como
      // placeholder inerte (el submit no cambia el estado real salvo
      // que el usuario elija explícitamente `unavailable`).
      status: isRented ? 'available' : (property.status as 'available' | 'unavailable'),
      notes: property.notes ?? '',
    },
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <h3 className="text-sm font-medium">Editar propiedad</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-property-address">Dirección</Label>
        <Input
          id="edit-property-address"
          aria-invalid={!!errors.address}
          {...register('address')}
        />
        {errors.address ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.address.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-property-landlord">Propietario</Label>
        <select
          id="edit-property-landlord"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          {...register('landlord_id')}
        >
          {landlords.map((landlord) => (
            <option key={landlord.id} value={landlord.id}>
              {landlord.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-property-neighborhood">Barrio</Label>
        {hasNeighborhoods ? (
          <>
            <select
              id="edit-property-neighborhood"
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
            <Link
              to="/properties/neighborhoods"
              className="font-medium underline-offset-4 hover:underline"
            >
              Creá un barrio primero
            </Link>
            .
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-property-type">Tipo</Label>
        <select
          id="edit-property-type"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          {...register('property_type')}
        >
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {propertyTypeLabel(option)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-property-status">Estado</Label>
        {isRented ? (
          <p className="text-sm text-muted-foreground" data-testid="property-status-rented">
            Alquilada (estado automático — hay un contrato vigente).
          </p>
        ) : (
          <select
            id="edit-property-status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            {...register('status')}
          >
            {MANUAL_PROPERTY_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {STATUS_LABELS[option]}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="edit-property-notes">Notas</Label>
        <Input id="edit-property-notes" {...register('notes')} />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {/* issue #55 (punto 3, CA-55-03): el PO reportó que elegir un barrio
          en una propiedad legacy (`neighborhood_id: null`) dejaba
          "Guardar cambios" deshabilitado, con sospecha de que el gate
          dependía de `formState.isDirty`/`isValid` de RHF junto a
          `defaultValues.neighborhood_id: ''`. Investigado: el `disabled`
          de este botón SOLO depende de `isSubmitting`, `isRented` y
          `hasNeighborhoods` (catálogo no vacío) — ninguno cambia al
          seleccionar un barrio, y NUNCA se usó `isDirty`/`isValid` acá.
          No reproduce; ver test de regresión CA-55-03 en
          properties.spec.tsx que fija el comportamiento correcto
          (habilitado tras elegir barrio, envío exitoso). */}
      <div>
        <Button type="submit" disabled={isSubmitting || isRented || !hasNeighborhoods}>
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
