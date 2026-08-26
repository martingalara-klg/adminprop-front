// src/modules/admin/components/InviteUserForm.tsx
//
// RF-01 + CA-07-01: invita por email con rol `admin` o `maintenance`. El
// rol `owner` NUNCA aparece como opción (se transfiere solo vía Super
// Admin, sdd_03 §1).
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, Label } from '@/shared/components'
import { inviteUserSchema, type InviteUserInput } from '../schemas/admin.schema'

type Props = {
  errorMessage: string | null
  isSubmitting: boolean
  onSubmit: (values: InviteUserInput) => void
}

export function InviteUserForm({ errorMessage, isSubmitting, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { email: '', role: 'maintenance' },
  })

  return (
    <form
      className="flex flex-col gap-4 rounded-md border p-4"
      onSubmit={handleSubmit((values) => {
        onSubmit(values)
        reset({ email: '', role: values.role })
      })}
      noValidate
    >
      <h3 className="text-sm font-medium">Invitar usuario</h3>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-user-email">Email</Label>
        <Input
          id="invite-user-email"
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
        <Label htmlFor="invite-user-role">Rol</Label>
        <select
          id="invite-user-role"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          {...register('role')}
        >
          <option value="admin">Admin</option>
          <option value="maintenance">Mantenimiento</option>
        </select>
        {errors.role ? (
          <p className="text-sm text-destructive" role="alert">
            {errors.role.message}
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
          {isSubmitting ? 'Invitando…' : 'Invitar'}
        </Button>
      </div>
    </form>
  )
}
