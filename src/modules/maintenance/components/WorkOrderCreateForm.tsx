// src/modules/maintenance/components/WorkOrderCreateForm.tsx
//
// RF-01/CA-06-01: propiedad, título, descripción, pagador ("paga
// administración y descuenta" vs "paga el dueño") y fotos opcionales.
// Las fotos se seleccionan acá pero se suben después de crear el
// pedido (el backend requiere el id) — ver WorkOrderCreatePage.
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import type { PropertySummary } from '@/api/properties.api'
import { PhotoPicker } from './PhotoPicker'
import { PAYER_OPTIONS, PAYER_LABELS, createWorkOrderSchema, type CreateWorkOrderInput } from '../schemas/maintenance.schema'

const SELECT_CLASS =
  'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'

type Props = {
  properties: PropertySummary[]
  files: File[]
  onFilesChange: (files: File[]) => void
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreateWorkOrderInput) => void
}

export function WorkOrderCreateForm({
  properties,
  files,
  onFilesChange,
  errorMessage,
  isSubmitting,
  onSubmit,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateWorkOrderInput>({
    resolver: zodResolver(createWorkOrderSchema),
    defaultValues: { property_id: '', title: '', description: '', payer: 'landlord' },
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <h3 className="text-sm font-medium">Nuevo pedido de reparación</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="work-order-property">Propiedad</Label>
        <select
          id="work-order-property"
          className={SELECT_CLASS}
          aria-invalid={!!errors.property_id}
          {...register('property_id')}
        >
          <option value="">Seleccioná una propiedad…</option>
          {properties.map((property) => (
            <option key={property.id} value={property.id}>
              {property.address}
            </option>
          ))}
        </select>
        {errors.property_id ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.property_id.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="work-order-title">Título</Label>
        <Input id="work-order-title" aria-invalid={!!errors.title} {...register('title')} />
        {errors.title ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="work-order-description">Descripción</Label>
        <Input id="work-order-description" {...register('description')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Paga</span>
        <div className="flex flex-col gap-1">
          {PAYER_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <input type="radio" value={option} {...register('payer')} />
              {PAYER_LABELS[option]}
            </label>
          ))}
        </div>
        {errors.payer ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.payer.message}
          </p>
        ) : null}
      </div>

      <PhotoPicker files={files} onChange={onFilesChange} disabled={isSubmitting} />

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear pedido'}
        </Button>
      </div>
    </form>
  )
}
