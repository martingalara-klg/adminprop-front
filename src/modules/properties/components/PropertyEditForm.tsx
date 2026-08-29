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
import type { PropertyDetail, PropertyUpdate } from '@/api/properties.api'
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
  onSubmit: (values: PropertyUpdate) => void
  // Issue #66: presente cuando el form vive dentro de un EditableSection
  // — agrega el botón "Cancelar" que descarta y vuelve a modo lectura.
  onCancel?: () => void
}

export function PropertyEditForm({
  property,
  landlords,
  neighborhoods,
  errorMessage,
  isSubmitting,
  onSubmit,
  onCancel,
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
      // `PropertyDetail.property_type` sigue siendo `string` (lectura,
      // legacy incluido); `UpdatePropertyInput` ya exige el enum cerrado
      // (decisión #103) — cast seguro porque el select del form sólo
      // ofrece `PROPERTY_TYPE_OPTIONS`.
      property_type: property.property_type as UpdatePropertyInput['property_type'],
      // RF-04: `rented` es derivado — el form nunca lo ofrece; si la
      // propiedad está `rented`, el select queda en `available` como
      // placeholder inerte (el submit no cambia el estado real salvo
      // que el usuario elija explícitamente `unavailable`).
      status: isRented ? 'available' : (property.status as 'available' | 'unavailable'),
      notes: property.notes ?? '',
    },
  })

  // issue #55 (punto 3, seguimiento post-fix): el backend APLICA el
  // `status` que llega en el PATCH (solo valida available/unavailable) —
  // no lo ignora. `status` en el form es un placeholder inerte para
  // propiedades `rented` (ver defaultValues arriba, siempre `available`),
  // así que jamás debe viajar en el payload cuando `isRented`: enviarlo
  // rompería el invariante `rented ⟺ contrato activo` (RF-04) sacando la
  // propiedad de alquilada sin que el contrato haya terminado. El PATCH
  // es parcial — omitir el campo equivale a "no tocar el estado".
  function handleFormSubmit(values: UpdatePropertyInput) {
    if (isRented) {
      const { address, landlord_id, neighborhood_id, property_type, notes } = values
      onSubmit({ address, landlord_id, neighborhood_id, property_type, notes })
      return
    }
    onSubmit(values)
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit(handleFormSubmit)}
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

      {/* issue #55 (punto 3, CA-55-03) — root cause encontrado: RF-01/RF-02
          de spec_module_01_propiedades.md dicen "edición de TODOS los
          campos salvo el estado `rented` (derivado)" — una propiedad
          alquilada se puede seguir editando (dirección, propietario,
          barrio, tipo, notas); SOLO el campo `status` queda de solo
          lectura (ya se muestra como texto arriba, nunca como select).
          El botón incluía `isRented` en el `disabled`, bloqueando
          indebidamente el guardado completo de propiedades `rented` —
          eso es lo que el PO reprodujo al elegir un barrio en una
          propiedad legacy que además estaba alquilada. Ver test de
          regresión CA-55-03 en properties.spec.tsx (falla sin el fix,
          pasa con él). */}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={isSubmitting || !hasNeighborhoods}>
          {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
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
