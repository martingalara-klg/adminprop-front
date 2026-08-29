// src/modules/people/components/LandlordForm.tsx
//
// RF-01 + CA-02-01: alta de propietario con `commission_pct` obligatorio
// (0-100). `bank_info` viaja en texto plano desde el form — el backend
// lo cifra (pgcrypto) antes de persistir; el cliente nunca lo trata como
// sensible-en-tránsito distinto del resto (viaja por HTTPS igual).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { createLandlordSchema, type CreateLandlordInput } from '../schemas/people.schema'

type Props = {
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: CreateLandlordInput) => void
}

export function LandlordForm({ errorMessage, isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLandlordInput>({
    resolver: zodResolver(createLandlordSchema),
    defaultValues: { name: '', tax_id: '', phone: '', email: '', bank_info: '', notes: '' },
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
      <h3 className="text-sm font-medium">Nuevo propietario</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-name">Nombre</Label>
        <Input id="landlord-name" aria-invalid={!!errors.name} {...register('name')} />
        {errors.name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-tax-id">CUIT/DNI</Label>
        <Input id="landlord-tax-id" aria-invalid={!!errors.tax_id} {...register('tax_id')} />
        {errors.tax_id ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.tax_id.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-phone">Teléfono</Label>
        <Input id="landlord-phone" aria-invalid={!!errors.phone} {...register('phone')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-email">Email</Label>
        <Input
          id="landlord-email"
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
        <Label htmlFor="landlord-bank-info">Datos bancarios (CBU)</Label>
        <Input id="landlord-bank-info" placeholder="CBU / alias" {...register('bank_info')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-commission-pct">% de comisión</Label>
        <Input
          id="landlord-commission-pct"
          type="number"
          step="0.01"
          min={0}
          max={100}
          aria-invalid={!!errors.commission_pct}
          {...register('commission_pct')}
        />
        {errors.commission_pct ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.commission_pct.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="landlord-notes">Notas</Label>
        <Input id="landlord-notes" {...register('notes')} />
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creando…' : 'Crear propietario'}
        </Button>
      </div>
    </form>
  )
}
