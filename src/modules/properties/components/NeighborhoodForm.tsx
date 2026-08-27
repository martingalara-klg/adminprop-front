// src/modules/properties/components/NeighborhoodForm.tsx
//
// RF-05 + CA-01-07: alta de barrio — mismo patrón de modal que
// PropertyForm (issue #48). El backend valida unicidad case-insensitive
// por organización → 409 CONFLICT (errorMessage lo muestra tal cual).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { createNeighborhoodSchema, type CreateNeighborhoodInput } from '../schemas/neighborhood.schema'

type Props = {
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreateNeighborhoodInput) => void
}

export function NeighborhoodForm({ errorMessage, isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateNeighborhoodInput>({
    resolver: zodResolver(createNeighborhoodSchema),
    defaultValues: { name: '' },
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
      <h3 className="text-sm font-medium">Nuevo barrio</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="neighborhood-name">Nombre</Label>
        <Input id="neighborhood-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear barrio'}
        </Button>
      </div>
    </form>
  )
}
