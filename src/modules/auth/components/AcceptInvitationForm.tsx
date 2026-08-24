// src/modules/auth/components/AcceptInvitationForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { acceptInvitationFormSchema, type AcceptInvitationFormInput } from '../schemas/auth.schema'

type Props = {
  email: string
  organizationName: string
  roleName: string
  onSubmit: (values: AcceptInvitationFormInput) => void
  isSubmitting?: boolean
}

export function AcceptInvitationForm({
  email,
  organizationName,
  roleName,
  onSubmit,
  isSubmitting = false,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AcceptInvitationFormInput>({
    resolver: zodResolver(acceptInvitationFormSchema),
    defaultValues: { full_name: '', password: '', confirmPassword: '' },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-sm text-muted-foreground">
        Estás activando la cuenta <span className="font-medium">{email}</span> como{' '}
        <span className="font-medium">{roleName}</span> en{' '}
        <span className="font-medium">{organizationName}</span>.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-full-name">Nombre completo</Label>
        <Input
          id="invite-full-name"
          autoComplete="name"
          aria-invalid={!!errors.full_name}
          {...register('full_name')}
        />
        {errors.full_name ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.full_name.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-password">Contraseña</Label>
        <Input
          id="invite-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.password.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-password-confirm">Repetir contraseña</Label>
        <Input
          id="invite-password-confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.confirmPassword.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Activando…' : 'Activar cuenta'}
      </Button>
    </form>
  )
}
