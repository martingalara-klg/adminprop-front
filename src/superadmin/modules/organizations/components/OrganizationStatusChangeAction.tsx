// src/superadmin/modules/organizations/components/OrganizationStatusChangeAction.tsx
//
// RF-05 + CA-00-04: deshabilitar/rehabilitar una organización. Es
// outward-facing (los usuarios de esa org pierden acceso) — pide
// confirmación explícita antes de deshabilitar. RN-05: ambas operaciones
// requieren `reason` (auditoría con actor y motivo).
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import {
  organizationStatusChangeSchema,
  type OrganizationStatusChangeInput,
} from '../schemas/organization.schema'

type Variant = 'disable' | 'enable'

type Props = {
  variant: Variant
  onConfirm: (values: OrganizationStatusChangeInput) => void
  isSubmitting?: boolean
  errorMessage?: string | null
}

const COPY: Record<
  Variant,
  { trigger: string; confirmTitle: string; confirmWarning: string | null; confirmCta: string }
> = {
  disable: {
    trigger: 'Deshabilitar organización',
    confirmTitle: '¿Deshabilitar esta organización?',
    confirmWarning:
      'Sus usuarios no podrán autenticarse ni renovar sesión de inmediato. Los datos se conservan intactos.',
    confirmCta: 'Confirmar deshabilitación',
  },
  enable: {
    trigger: 'Habilitar organización',
    confirmTitle: '¿Habilitar esta organización?',
    confirmWarning: null,
    confirmCta: 'Confirmar habilitación',
  },
}

export function OrganizationStatusChangeAction({
  variant,
  onConfirm,
  isSubmitting = false,
  errorMessage = null,
}: Props) {
  const [isConfirming, setIsConfirming] = useState(false)
  const copy = COPY[variant]

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrganizationStatusChangeInput>({
    resolver: zodResolver(organizationStatusChangeSchema),
    defaultValues: { reason: '' },
  })

  if (!isConfirming) {
    return (
      <Button
        type="button"
        variant={variant === 'disable' ? 'destructive' : 'default'}
        onClick={() => setIsConfirming(true)}
      >
        {copy.trigger}
      </Button>
    )
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-destructive/40 p-4"
      onSubmit={handleSubmit(onConfirm)}
      noValidate
    >
      <p className="text-sm font-medium">{copy.confirmTitle}</p>
      {copy.confirmWarning ? (
        <p className="text-sm text-muted-foreground">{copy.confirmWarning}</p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${variant}-reason`}>Motivo</Label>
        <Input id={`${variant}-reason`} aria-invalid={!!errors.reason} {...register('reason')} />
        {errors.reason ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.reason.message}
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" variant="destructive" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : copy.confirmCta}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isSubmitting}
          onClick={() => {
            setIsConfirming(false)
            reset()
          }}
        >
          Cancelar
        </Button>
      </div>
    </form>
  )
}
