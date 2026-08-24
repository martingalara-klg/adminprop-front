// src/modules/auth/components/ResetPasswordForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { resetPasswordFormSchema, type ResetPasswordFormInput } from '../schemas/auth.schema'

type Props = {
  email: string
  onSubmit: (values: ResetPasswordFormInput) => void
  isSubmitting?: boolean
}

export function ResetPasswordForm({ email, onSubmit, isSubmitting = false }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="text-sm text-muted-foreground">
        Elegí una nueva contraseña para <span className="font-medium">{email}</span>.
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-password">Nueva contraseña</Label>
        <Input
          id="reset-password"
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
        <Label htmlFor="reset-password-confirm">Repetir contraseña</Label>
        <Input
          id="reset-password-confirm"
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
        {isSubmitting ? 'Guardando…' : 'Restablecer contraseña'}
      </Button>
    </form>
  )
}
