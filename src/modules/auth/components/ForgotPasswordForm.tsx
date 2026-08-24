// src/modules/auth/components/ForgotPasswordForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { forgotPasswordSchema, type ForgotPasswordInput } from '../schemas/auth.schema'

type Props = {
  onSubmit: (values: ForgotPasswordInput) => void
  isSubmitting?: boolean
}

export function ForgotPasswordForm({ onSubmit, isSubmitting = false }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="username"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando…' : 'Enviar instrucciones'}
      </Button>
    </form>
  )
}
